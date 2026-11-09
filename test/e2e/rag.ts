import assert from "node:assert/strict";
import postgres from "postgres";
import { readFile, realpath } from "node:fs/promises";
import { join } from "node:path";
import { DEFAULT_SETTINGS } from "../../shared/utils/settings";

const origin = process.env.RAG_TEST_BASE_URL;
const databaseUrl = process.env.RAG_TEST_DATABASE_URL;
const appDirectory = process.env.RAG_TEST_APP_DIR;
assert(
  origin && databaseUrl && appDirectory,
  "Set RAG_TEST_BASE_URL, RAG_TEST_DATABASE_URL and RAG_TEST_APP_DIR for an isolated test app",
);
const target = new URL(databaseUrl);
assert(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
assert(
  ["localhost", "127.0.0.1"].includes(target.hostname) &&
    target.pathname.startsWith("/recall_rag_test"),
);
const appRoot = await realpath(appDirectory);
for (const dependency of ["@nuxthub/core", "@nuxtjs/better-auth", "nuxt"]) {
  assert(
    (await realpath(join(appRoot, "node_modules", dependency))).startsWith(`${appRoot}/`),
    "Use isolated dependencies; linked packages can resolve another workspace's generated clients",
  );
}
const builtClient = await readFile(
  join(appRoot, ".output/server/node_modules/@nuxthub/db/db.mjs"),
  "utf8",
).catch(() => undefined);
const client =
  builtClient ?? (await readFile(join(appRoot, "node_modules/@nuxthub/db/db.mjs"), "utf8"));
assert(
  client.includes(databaseUrl),
  "The generated database client does not target the disposable test database",
);
const database = postgres(databaseUrl);
const cookies = new Map<string, string>();
const secret = "test-private-credential";
let checks = 0;
const check = (name: string) => {
  checks++;
  console.log(`PASS ${name}`);
};

async function request(
  path: string,
  body?: unknown,
  options: { method?: string; anonymous?: boolean; headers?: Record<string, string> } = {},
) {
  const response = await fetch(new URL(path, origin), {
    method: options.method ?? (body === undefined ? "GET" : "POST"),
    headers: {
      origin,
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.anonymous
        ? {}
        : { cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join("; ") }),
      ...options.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!options.anonymous)
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(";");
      const split = pair!.indexOf("=");
      cookies.set(pair!.slice(0, split), pair!.slice(split + 1));
    }
  return response;
}

try {
  assert.equal((await request("/api/admin/settings", undefined, { anonymous: true })).status, 401);
  check("anonymous admin access denied");
  await request("/api/auth/sign-up/email", {
    name: "RAG Admin",
    email: "rag-admin@example.test",
    password: "RecallRagQA!42",
  });
  await database`update "user" set role = 'admin' where email = 'rag-admin@example.test'`;
  assert.equal(
    (
      await request("/api/auth/sign-in/email", {
        email: "rag-admin@example.test",
        password: "RecallRagQA!42",
      })
    ).status,
    200,
  );
  check("admin authentication");
  assert.equal((await request("/api/admin/reset", {})).status, 200);
  let admin = await (await request("/api/admin/settings")).json();
  assert(admin.encryptionReady);
  const settings = structuredClone(DEFAULT_SETTINGS);
  settings.models = ["primary", "backup"].map((id) => ({
    id,
    enabled: true,
    provider: "openai",
    model: "test-chat",
    baseUrl: `http://127.0.0.1:3111/${id}/v1`,
    credentialType: "apiKey",
    apiKey: secret,
    authToken: "",
  }));
  settings.embed = {
    model: "test-embed",
    baseUrl: "http://127.0.0.1:3111/v1",
    credentialType: "apiKey",
    apiKey: secret,
    authToken: "",
  };
  settings.email = { apiKey: secret, from: "Recall <noreply@example.test>" };
  const update = { settings, version: admin.version };
  assert.equal(
    (
      await request("/api/admin/settings", update, {
        method: "PUT",
        headers: { origin: "https://hostile.example" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/api/admin/settings", update, {
        method: "PUT",
        headers: { "content-type": "text/plain" },
      })
    ).status,
    415,
  );
  check("cross-origin and non-JSON settings changes denied");
  const concurrent = await Promise.all([
    request("/api/admin/settings", update, { method: "PUT" }),
    request("/api/admin/settings", update, { method: "PUT" }),
  ]);
  assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 409]);
  admin = await (await request("/api/admin/settings")).json();
  assert(!JSON.stringify(admin).includes(secret));
  assert(admin.secretState["models.primary.apiKey"] && admin.secretState["embed.apiKey"]);
  const [stored] = await database`select value, secrets from app_settings where id = 1`;
  assert(!JSON.stringify(stored).includes(secret));
  const publicSettings = await (
    await request("/api/settings", undefined, { anonymous: true })
  ).json();
  assert(!JSON.stringify(publicSettings).includes(secret));
  assert(!JSON.stringify(publicSettings).includes("baseUrl"));
  check("concurrent revisions and encrypted, masked credentials");

  await fetch("http://127.0.0.1:3111/control", {
    method: "POST",
    body: JSON.stringify({ clear: true }),
  });
  const content =
    "---\ntitle: About Sethy\ntags: [Nuxt, Vue]\n---\n# Biography\n\nSethy builds Nuxt applications at XyloCorp. He works with Vue and TypeScript.";
  const paste = { title: "fallback-name", content };
  const preview = await (await request("/api/admin/ingest", { ...paste, dryRun: true })).json();
  assert(preview.previewChunks.length > 0);
  assert(!preview.previewChunks[0].content.includes("tags:"));
  assert.equal((await (await fetch("http://127.0.0.1:3111/requests")).json()).length, 0);
  check("dry-run chunk preview avoids providers and writes");
  const first = await (await request("/api/admin/ingest", paste)).json();
  assert.equal(first.processed, 1);
  const skipped = await (await request("/api/admin/ingest", paste)).json();
  assert.equal(skipped.skipped, 1);
  const replaced = await (
    await request("/api/admin/ingest", {
      ...paste,
      content: content + "\nHe enjoys building useful tools.",
    })
  ).json();
  assert.equal(replaced.replaced, 1);
  let documents = await (await request("/api/admin/documents")).json();
  assert.equal(documents.length, 1);
  assert.equal(documents[0].title, "About Sethy");
  const detail = await (await request(`/api/admin/documents/${documents[0].id}`)).json();
  assert.equal(detail.chunks[0].index, 0);
  assert.deepEqual(detail.metadata.tags, ["Nuxt", "Vue"]);
  check("ingestion, frontmatter, deduplication and atomic replacement");

  await fetch("http://127.0.0.1:3111/control", {
    method: "POST",
    body: JSON.stringify({ badEmbedding: true }),
  });
  const failed = await (
    await request("/api/admin/ingest", { ...paste, content: content + "\nChanged" })
  ).json();
  assert.equal(failed.processed, 0);
  assert(failed.errors.length > 0);
  const afterFailure = await (await request("/api/admin/documents")).json();
  assert.equal(afterFailure[0].id, documents[0].id);
  await fetch("http://127.0.0.1:3111/control", {
    method: "POST",
    body: JSON.stringify({ badEmbedding: false }),
  });
  check("invalid embeddings preserve the existing document");
  const incompatible = {
    ...admin.settings,
    embed: { ...admin.settings.embed, model: "different-model" },
  };
  assert.equal(
    (
      await request(
        "/api/admin/settings",
        { version: admin.version, settings: incompatible },
        { method: "PUT" },
      )
    ).status,
    409,
  );
  check("embedding compatibility guard");

  const retrievalResponse = await request("/api/admin/retrieve", { query: "XyloCorp" });
  assert.equal(retrievalResponse.status, 200);
  const retrieval = await retrievalResponse.json();
  assert(
    retrieval.hits.some(
      (hit: { passed: boolean; similarity: number; documentTitle: string }) =>
        hit.passed && hit.similarity < 0.3 && hit.documentTitle === "About Sethy",
    ),
  );
  check("hybrid search finds a proper noun with weak vector similarity");

  const id = crypto.randomUUID();
  const message = {
    id: crypto.randomUUID(),
    role: "user",
    parts: [{ type: "text", text: "What does Sethy build?" }],
  };
  assert.equal((await request("/api/chats", { id, message })).status, 200);
  const streamResponse = await request(`/api/chats/${id}`, { messages: [message] });
  assert.equal(streamResponse.status, 200);
  const stream = await streamResponse.text();
  assert(stream.includes("Sethy builds Nuxt applications"), stream);
  assert(stream.includes("About Sethy"));
  assert(
    !stream.includes("private-provider-payload") &&
      !stream.includes(secret) &&
      !stream.includes('"type":"reasoning'),
  );
  let history =
    await database`select id, role, parts from messages where chat_id = ${id} order by created_at`;
  assert.equal(history.length, 2);
  const providerRequests = await (await fetch("http://127.0.0.1:3111/requests")).json();
  assert(providerRequests.some((entry: { path: string }) => entry.path.startsWith("/primary/")));
  assert(providerRequests.some((entry: { path: string }) => entry.path.startsWith("/backup/")));
  check("streaming failover, source titles and message persistence");

  assert.equal(
    (await request(`/api/chats/${id}`, { model: "unauthorized-model", messages: [message] }))
      .status,
    400,
  );
  assert.equal(
    (await request(`/api/chats/${id}`, { messages: [{ ...message, role: "system" }] })).status,
    400,
  );
  const badFile = {
    ...message,
    id: crypto.randomUUID(),
    parts: [
      ...message.parts,
      { type: "file", mediaType: "image/png", url: "http://169.254.169.254/latest/meta-data" },
    ],
  };
  assert.equal((await request(`/api/chats/${id}`, { messages: [badFile] })).status, 400);
  check("unapproved models, forged system messages and external attachments denied");

  const answer = history.find((entry) => entry.role === "assistant")!;
  assert.equal(
    (await request(`/api/chats/${id}/votes`, { messageId: answer.id, isUpvoted: true })).status,
    200,
  );
  assert.equal(
    (
      await request(
        `/api/chats/${id}/messages`,
        { messageId: answer.id, type: "regenerate" },
        { method: "DELETE" },
      )
    ).status,
    200,
  );
  assert(
    (await (await request(`/api/chats/${id}`, { messages: [message] })).text()).includes(
      "Sethy builds Nuxt applications",
    ),
  );
  check("votes and regeneration");
  await request(
    `/api/chats/${id}/messages`,
    { messageId: message.id, type: "edit" },
    { method: "DELETE" },
  );
  const edited = { ...message, parts: [{ type: "text", text: "Tell me about Sethy's Nuxt work" }] };
  assert(
    (await (await request(`/api/chats/${id}`, { messages: [edited] })).text()).includes(
      "Sethy builds Nuxt applications",
    ),
  );
  history = await database`select id, role, parts from messages where chat_id = ${id}`;
  assert.equal(history.length, 2);
  assert.equal(
    history.find((entry) => entry.role === "user")!.parts[0].text,
    edited.parts[0]!.text,
  );
  check("editing preserves persisted conversations");

  const withAttachment = {
    ...message,
    id: crypto.randomUUID(),
    parts: [
      ...message.parts,
      { type: "file", mediaType: "image/png", url: "/api/files/legacy.png" },
    ],
  };
  assert.equal(
    (await request("/api/chats", { id: crypto.randomUUID(), message: withAttachment })).status,
    400,
  );
  assert.equal(
    (await request(`/api/upload/${crypto.randomUUID()}`, {}, { method: "PUT" })).status,
    404,
  );
  check("chat attachments and upload endpoint are unavailable");

  console.log(`${checks} integration checks passed`);
} finally {
  await database.end();
}
