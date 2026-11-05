import { db } from "@nuxthub/db";
import { sql, type SQL } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import { appSettings, chunks, documents } from "@nuxthub/db/schema";
import { DEFAULT_SETTINGS, type AppSettings } from "#shared/utils/settings";
import { getEmbeddingConfiguration, getEmbeddingIdentity } from "#server/utils/embedding-identity";

type ProtectedSettings = { settings: AppSettings; secrets: Record<string, string> };

const SETTINGS_WRITE_LOCK_ID = 748125315;

type WriteRow = Record<string, unknown>;

function writeResultRows(result: unknown): WriteRow[] {
  if (Array.isArray(result)) return result as WriteRow[];
  if (result && typeof result === "object" && "rows" in result && Array.isArray(result.rows))
    return result.rows as WriteRow[];
  throw new Error("Unexpected database write result");
}

export async function withSettingsWriteLock(queries: readonly SQL[]): Promise<WriteRow[][]> {
  const isolation = sql`set transaction isolation level read committed`;
  const lock = sql`select pg_advisory_xact_lock(${SETTINGS_WRITE_LOCK_ID}::bigint)`;
  const batchClient = db as typeof db & Partial<NeonHttpDatabase>;
  let results: unknown[];

  // Guard statements need a fresh snapshot after waiting for the lock, not the lock query's snapshot.
  if (typeof batchClient.batch === "function") {
    results = await batchClient.batch([
      batchClient.execute(isolation),
      batchClient.execute(lock),
      ...queries.map((query) => batchClient.execute(query)),
    ]);
    results = results.slice(2);
  } else {
    results = await db.transaction(async (tx) => {
      await tx.execute(isolation);
      await tx.execute(lock);
      const writes = [];
      for (const query of queries) writes.push(await tx.execute(query));
      return writes;
    });
  }
  return results.map(writeResultRows);
}

function settingsRevisionMatches(version: number) {
  return sql`coalesce((select ${appSettings.version} from ${appSettings} where ${appSettings.id} = 1), 0) = ${version}`;
}

function settingsEmbeddingMatches(settings: AppSettings) {
  const expected = getEmbeddingConfiguration(settings);
  const defaults = getEmbeddingConfiguration(DEFAULT_SETTINGS);
  return sql`(
    coalesce((select ${appSettings.value} #>> '{embed,model}' from ${appSettings} where ${appSettings.id} = 1), ${defaults.model}) = ${expected.model}
    and coalesce(nullif(regexp_replace((select ${appSettings.value} #>> '{embed,baseUrl}' from ${appSettings} where ${appSettings.id} = 1), '/$', ''), ''), ${defaults.baseUrl}) = ${expected.baseUrl}
  )`;
}

function corpusCompatibleWith(settings: AppSettings) {
  const expected = getEmbeddingConfiguration(settings);
  const identity = getEmbeddingIdentity(settings);
  return sql`not exists (
    select 1 from ${documents}
    where not (
      coalesce(${documents.metadata}->>'embedIdentity' = ${identity}, false)
      or (
        ${documents.metadata}->>'embedIdentity' is null
        and (${documents.metadata}->>'embedModel' is null or ${documents.metadata}->>'embedModel' = ${expected.model})
      )
    )
  )`;
}

export function buildSettingsSaveQuery(
  protectedValue: ProtectedSettings,
  version: number,
  userId: string,
) {
  const revisionMatches = settingsRevisionMatches(version);
  return sql`
    with saved as (
      insert into ${appSettings} (id, value, secrets, version, updated_at, updated_by)
      select 1, ${JSON.stringify(protectedValue.settings)}::jsonb, ${JSON.stringify(protectedValue.secrets)}::jsonb, ${version + 1}, now(), ${userId}
      where ${revisionMatches}
        and (${settingsEmbeddingMatches(protectedValue.settings)} or ${corpusCompatibleWith(protectedValue.settings)})
      on conflict (id) do update set
        value = excluded.value,
        secrets = excluded.secrets,
        version = excluded.version,
        updated_at = excluded.updated_at,
        updated_by = excluded.updated_by
      where ${appSettings.version} = ${version}
      returning id
    )
    select exists(select 1 from saved) as saved, ${revisionMatches} as "revisionMatches"
  `;
}

export function buildResourceWriteQuery(input: {
  settings: AppSettings;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddings: { embedding: number[]; content: string; chunkIndex: number }[];
}) {
  const embeddings = input.embeddings.map((embedding) => ({
    content: embedding.content,
    embedding: JSON.stringify(embedding.embedding),
    chunkIndex: embedding.chunkIndex,
  }));
  // Consuming deleted before inserting makes replace-by-title deterministic despite unordered CTE siblings.
  return sql`
    with compatible as (
      select ${settingsEmbeddingMatches(input.settings)} as allowed
    ), deleted as (
      delete from ${documents}
      where ${documents.title} = ${input.title} and (select allowed from compatible)
      returning id
    ), inserted as (
      insert into ${documents} (title, content, metadata)
      select ${input.title}, ${input.content}, ${JSON.stringify(input.metadata)}::jsonb
      where (select allowed from compatible) and (select count(*) from deleted) >= 0
      returning id
    ), inserted_chunks as (
      insert into ${chunks} (document_id, content, embedding, chunk_index)
      select inserted.id, source.content, source.embedding::vector(2048), source."chunkIndex"
      from inserted cross join jsonb_to_recordset(${JSON.stringify(embeddings)}::jsonb)
        as source(content text, embedding text, "chunkIndex" integer)
      returning id
    )
    select inserted.id, exists(select 1 from deleted) as replaced,
      (select count(*) from inserted_chunks) as chunks
    from inserted
  `;
}
