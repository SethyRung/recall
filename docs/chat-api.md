# Persistent chat API

Recall owns anonymous sessions, saved messages, source citations, generation, model routing and
chat limits. Its workspace and external consumers use the same session handlers. Portfolio keeps
its existing chat window and integration settings, with a thin server proxy to Recall.

## Configuration

Generate a service key with `openssl rand -base64 32`. Configure these private variables:

| Application | Variable                        | Value                                                              |
| ----------- | ------------------------------- | ------------------------------------------------------------------ |
| Recall      | `NUXT_CHAT_API_KEY`             | Generated key, at least 32 characters                              |
| Recall      | `NUXT_CHAT_API_TRUSTED_ORIGINS` | Comma-separated Portfolio origins, such as `https://sethyrung.com` |
| Portfolio   | `NUXT_CHAT_API_URL`             | Recall origin, such as `https://recall.example.com`                |
| Portfolio   | `NUXT_CHAT_API_KEY`             | Same service key                                                   |

Use HTTPS between hosted servers. Locally, Recall can run on port 3001 and Portfolio on port 3000.
The base URL must be an HTTP(S) origin with no credentials, path, query or fragment. Restart or
redeploy after changing environment variables. Models, embeddings and source documents must be
configured in Recall Admin. Existing Portfolio sources/credentials are not copied automatically.

## Request access

Recall and Portfolio use the same `/api/chats/**` endpoints. Recall's current origin comes from
`NUXT_PUBLIC_SITE_URL` (or the request URL when unset). Same-origin browser requests use the visitor
cookie without a service key. Browser GETs may identify the current origin through `Referer` or
`Sec-Fetch-Site: same-origin` when `Origin` is absent. Recall's server-rendered pages explicitly
supply the current origin on their internal chat requests.

External origins must match `NUXT_CHAT_API_TRUSTED_ORIGINS` exactly and supply a valid service key.
Unlisted origins are rejected even with a valid key. Current-origin requests and requests without
origin metadata use anonymous visitor-cookie access without inspecting service credentials.
Only authenticated requests from trusted external origins may supply a client IP for rate limiting.
Origin checks distinguish browser request paths; they are not proof of caller identity outside a browser.

Portfolio's proxy supplies its canonical `NUXT_PUBLIC_SITE_URL` origin with the private key.
Add that origin to Recall's allowlist, including its port during local development, such as
`http://localhost:3000`. The key remains on the servers; no browser CORS access is enabled.

## Anonymous identity

External requests require `Authorization: Bearer <service-key>`. Session endpoints also
use the service's `chat.visitor_id` cookie. A first `GET /api/chats` creates an opaque visitor ID
and returns `Set-Cookie`; subsequent requests must carry that cookie. No user account is needed.
The service key alone does not grant access to every visitor's conversations: each session read
or mutation also checks the visitor cookie against its owner.

Existing consumers may continue using `recall.visitor_id` and `X-Recall-Client-IP`. External
bootstrap returns both visitor cookie names with the same ID; new integrations use the neutral
names. Recall's own browser keeps its existing cookie and history.

Portfolio calls Recall from its server. It stores the returned visitor ID in a first-party
`portfolio.chat_visitor` cookie with HttpOnly, SameSite=Lax and a one-year lifetime. It sets
Secure for its HTTPS site URL and forwards only this cookie as `chat.visitor_id` to Recall.
Auth cookies, other upstream cookies and browser authorization headers are excluded. The service
key stays on the servers. Browser requests use Portfolio's own origin, so no CORS or third-party
cookies are needed.

Recall stores conversation contents in PostgreSQL. Portfolio stores only the selected
conversation ID in localStorage (`chat:active-session`); that ID grants no access without the
visitor cookie. Clearing localStorage can recover the most recent conversation from Recall.
Clearing the visitor cookie starts a new anonymous identity. Existing browser-only transcripts
under the old `ask-sethy-chat` key remain untouched and are not automatically uploaded.

## Endpoints

All responses use `Cache-Control: no-store`. JSON operations return Recall's existing envelope:
`{ status: { code, message, requestId, requestTime }, data }`. Check `status.code === "SUCCESS"`
before using `data`; ownership/not-found failures may use an error envelope even with HTTP 200.
Requests with bodies use `Content-Type: application/json`.

| Method     | Recall route              | Purpose                                               |
| ---------- | ------------------------- | ----------------------------------------------------- |
| GET        | `/api/chats`              | Bootstrap visitor identity; list owned conversations  |
| POST       | `/api/chats`              | Create a conversation and save its first user message |
| GET        | `/api/chats/:id`          | Read the saved conversation and messages              |
| POST       | `/api/chats/:id`          | Save a new user message and stream/persist its answer |
| PATCH      | `/api/chats/:id/title`    | Rename an owned conversation                          |
| DELETE     | `/api/chats/:id`          | Delete an owned conversation                          |
| DELETE     | `/api/chats/:id/messages` | Remove an answer or messages following an edit        |
| GET / POST | `/api/chats/:id/votes`    | Read or update feedback                               |

Creating a conversation requires `{ id, message }`, where `id` is a UUID and `message` is a user
UI message containing an ID and text parts:

```json
{
  "id": "00000000-0000-4000-8000-000000000001",
  "message": {
    "id": "00000000-0000-4000-8000-000000000002",
    "role": "user",
    "parts": [{ "type": "text", "text": "What does Sethy build?" }]
  }
}
```

Then POST `{ messages: [message] }` to `/api/chats/:id` to generate the initial answer. For a
follow-up, send only the new user message with a new ID. Recall reads authoritative history from
its database, bounds model context using Admin settings and saves the answer. Client-supplied
assistant history, tool results and reasoning do not replace stored history. Model overrides and
system messages are rejected by the generation endpoint.

Generation responses stream AI SDK UI-message SSE with `x-vercel-ai-ui-message-stream: v1`.
Source/tool parts are persisted with the answer; reasoning remains hidden. Consumers must stream
immediately and abort upstream when the browser disconnects. Generation POSTs must not be
retried automatically.

For regeneration, first DELETE `/api/chats/:id/messages` with
`{ messageId: assistantMessageId, type: "regenerate" }`, then request generation from the remaining
user message. `type: "edit"` removes messages after the target user message; generation updates
that user message by ID. Starting a new conversation preserves previous conversations.

Authenticated consumers may supply `X-Chat-Client-IP` with a valid IPv4/IPv6 address for the
process-local limit of ten generation requests/minute per IP. Portfolio derives it from the
connection. Forwarded IP headers and other browser-supplied identity/IP headers are ignored.

Portfolio exposes these resources under `/api/chat-service/chats/**`. Chat limits are enforced inside
Recall; no external settings endpoint is exposed. Its proxy allows only the documented chat operations, validates JSON
responses, strips internal visitor IDs, preserves actionable 400/404/409/415/429 statuses, and
maps upstream configuration/network failures to a generic 503. It forwards no provider error
payloads. Timeouts are five minutes for generation and ten seconds for other operations.

## Verification

`bun run test` covers persistent sessions against isolated PGlite, cookie restoration, ownership,
regeneration, feedback, history authority and authentication, with mocked generation. Portfolio
checks the proxy, client session lifecycle and actual Nuxt routes without live model calls or
existing database writes.
