import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({ current: {} as object }));
vi.mock("@nuxthub/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, key) {
        const value = Reflect.get(database.current, key);
        return typeof value === "function" ? value.bind(database.current) : value;
      },
    },
  ),
}));

vi.mock("@nuxthub/db/schema", async () => import("../../server/db/schema"));

import { withSettingsWriteLock } from "../../server/utils/settings-write";

const dialect = new PgDialect();
const id = "f1c73598-148c-4f44-9bd5-27f0448e2b54";

afterEach(() => vi.restoreAllMocks());

describe("settings write transactions", () => {
  it("runs sequential statements on the postgres-js transaction client", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id }]);
    const transaction = vi.fn(async (write) => write({ execute }));
    database.current = { transaction };
    expect(await withSettingsWriteLock([sql`select ${id}::uuid as id`])).toEqual([[{ id }]]);
    expect(transaction).toHaveBeenCalledOnce();
    expect(execute.mock.calls.map(([query]) => dialect.sqlToQuery(query).sql)).toEqual([
      "set transaction isolation level read committed",
      "select pg_advisory_xact_lock($1::bigint)",
      "select $1::uuid as id",
    ]);
  });

  it("uses a single Neon HTTP transaction batch and normalizes its results", async () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          results: [
            { fields: [], rows: [], rowCount: 0, command: "SET" },
            {
              fields: [{ name: "pg_advisory_xact_lock", dataTypeID: 2278 }],
              rows: [[null]],
              rowCount: 1,
              command: "SELECT",
            },
            {
              fields: [{ name: "id", dataTypeID: 2950 }],
              rows: [[id]],
              rowCount: 1,
              command: "SELECT",
            },
          ],
        }),
      ),
    );
    database.current = drizzle(neon("postgresql://test:test@example.neon.tech/test"));
    expect(await withSettingsWriteLock([sql`select ${id}::uuid as id`])).toEqual([[{ id }]]);
    expect(fetch).toHaveBeenCalledOnce();
    const body = JSON.parse(fetch.mock.calls[0]![1]!.body as string);
    expect(body.queries.map((query: { query: string }) => query.query)).toEqual([
      "set transaction isolation level read committed",
      "select pg_advisory_xact_lock($1::bigint)",
      "select $1::uuid as id",
    ]);
  });

  it("propagates transaction failures instead of returning partial results", async () => {
    const execute = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error("write failed"));
    database.current = {
      transaction: async (write: (tx: object) => unknown) => write({ execute }),
    };
    await expect(withSettingsWriteLock([sql`select 1`])).rejects.toThrow("write failed");
  });

  it("propagates Neon batch failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "write failed",
          code: "23514",
        }),
        { status: 400 },
      ),
    );
    database.current = drizzle(neon("postgresql://test:test@example.neon.tech/test"));
    await expect(withSettingsWriteLock([sql`select 1`])).rejects.toThrow("write failed");
  });
});
