import { createError, defineEventHandler, type EventHandler, type H3Event } from "h3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiResponseCode } from "../../shared/types/response";
import { createResponse } from "../../server/utils/response";

vi.mock("@nuxthub/db", async () => {
  const { neon } = await import("@neondatabase/serverless");
  const { drizzle } = await import("drizzle-orm/neon-http");
  const schema = await import("../../server/db/schema");
  return {
    db: drizzle(neon("postgresql://test:test@example.neon.tech/test"), { schema }),
    schema,
  };
});

const visitorId = "00000000-0000-4000-8000-000000000001";
const getVisitorId = vi.fn(() => visitorId);
const fetch = vi.fn<typeof globalThis.fetch>();
let handler: EventHandler;

function databaseResponse(rows: unknown[][] = []) {
  return new Response(
    JSON.stringify({
      fields: [
        { name: "id", dataTypeID: 25 },
        { name: "title", dataTypeID: 25 },
        { name: "created_at", dataTypeID: 1114 },
      ],
      rows,
      rowCount: rows.length,
      command: "SELECT",
    }),
  );
}

function databaseError(code: string) {
  return new Response(JSON.stringify({ message: "Database query failed", code }), { status: 400 });
}

beforeEach(async () => {
  vi.useFakeTimers();
  getVisitorId.mockClear();
  fetch.mockReset();
  vi.stubGlobal("fetch", fetch);
  vi.stubGlobal("defineEventHandler", defineEventHandler);
  vi.stubGlobal("getVisitorId", getVisitorId);
  vi.stubGlobal("createError", createError);
  vi.stubGlobal("createResponse", createResponse);
  vi.stubGlobal("ApiResponseCode", ApiResponseCode);
  handler = (await import("../../server/api/chats.get")).default;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("chat history reads", () => {
  it("returns an empty history immediately when the database is reachable", async () => {
    fetch.mockResolvedValueOnce(databaseResponse());

    expect(await handler({} as H3Event)).toMatchObject({
      status: { code: ApiResponseCode.Success },
      data: [],
    });
    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("recovers from a Neon transport failure using the same visitor filter", async () => {
    fetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(databaseResponse([["chat-1", "Question", "2026-11-07 03:00:00"]]));

    const result = handler({} as H3Event);
    await vi.advanceTimersByTimeAsync(249);
    expect(fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);

    expect(await result).toMatchObject({
      status: { code: ApiResponseCode.Success },
      data: [{ id: "chat-1", title: "Question", createdAt: new Date("2026-11-07T03:00:00Z") }],
    });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(getVisitorId).toHaveBeenCalledOnce();
    const requests = fetch.mock.calls.map(([, options]) => JSON.parse(options!.body as string));
    expect(requests[0]).toEqual(requests[1]);
    expect(requests[0].params).toEqual([visitorId]);
  });

  it("returns 503 with the network cause after a persistent connection failure", async () => {
    const cause = new Error("Connection reset", { cause: { code: "ECONNRESET" } });
    fetch.mockRejectedValue(cause);

    const result = expect(handler({} as H3Event)).rejects.toMatchObject({
      statusCode: 503,
      statusMessage: "Chat history temporarily unavailable",
      cause,
    });
    await vi.advanceTimersByTimeAsync(250);
    await result;

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each(["42P01", "28P01", "42501"])("does not retry database error %s", async (code) => {
    fetch.mockResolvedValueOnce(databaseError(code));

    await expect(handler({} as H3Event)).rejects.toMatchObject({ cause: { code } });

    expect(fetch).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("preserves a database error encountered after reconnecting", async () => {
    fetch
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(databaseError("42P01"));

    const result = expect(handler({} as H3Event)).rejects.toMatchObject({
      cause: { code: "42P01" },
    });
    await vi.advanceTimersByTimeAsync(250);
    await result;

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
