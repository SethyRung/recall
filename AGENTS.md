# AGENTS.md

Repo: **Recall** — RAG chatbot for Sethy's portfolio.
Authoritative spec: [`PLAN.md`](./PLAN.md). Read it before making structural changes.

## Stack (pinned in `package.json`)

- **Nuxt 4** (`nuxt@^4.4.8`) — `app/` for client, `server/` for Nitro, `shared/` for shared types.
- **@nuxt/ui v4** (`@nuxt/ui@4.8.2`) — Reka UI + Tailwind v4. Auto-registers `@nuxt/icon`, `@nuxt/fonts`, `@nuxtjs/color-mode`. **Do not add these to `modules`.**
- **@nuxthub/core** (`@nuxthub/core@^0.10.7`) — provides `hubDatabase()`.
- **AI SDK v6** (`ai@^6.0.207`, `@ai-sdk/vue@^3.0.207`) — use the `Chat` class, **not** the deprecated `useChat`.
- **@comark/nuxt** — `<Comark />` for streaming markdown in chat responses.
- **Drizzle ORM** + **pgvector** (`vector_cosine_ops`, `ivfflat`).

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` (runs `nuxt prepare` via `postinstall`) |
| Dev server | `pnpm dev` (requires Docker DB up first) |
| Typecheck | `pnpm typecheck` (`nuxt typecheck`) |
| Lint | `pnpm lint` (oxlint) |
| Lint fix | `pnpm lint:fix` |
| Format | `pnpm fmt` (oxfmt) |
| Format check | `pnpm fmt:check` |
| Build | `pnpm build` |
| Preview | `pnpm preview` |

There is **no test command** — manual verification per PLAN.md's checklist. Do not add tests.

## Required setup order

1. `cp .env.example .env` and fill keys (`MINIMAX_*`, `OPENAI_API_KEY`).
2. `docker compose up -d` (image is `pgvector/pgvector:pg18` — NOT `postgres:18-alpine`; the latter lacks pgvector).
3. `pnpm install`.
4. `pnpm dev` → `http://localhost:3000`.

## Repo layout

```
app/       # Vue client: components/, composables/, layouts/, pages/, assets/
server/    # Nitro: api/, utils/, plugins/
shared/    # Types shared between client + server
data/      # Markdown source files for ingestion
public/    # Static assets
docker-compose.yml  # Local Postgres + pgvector
nuxt.config.ts
opencode.json       # MCP servers (nuxt + nuxt-ui)
```

## Repo conventions

- **Never instantiate the Drizzle client manually.** Use `hubDatabase()` (auto-imported by `@nuxthub/core`). Wrap it in `server/utils/db.ts` with `useDB()`.
- **Never read env via `process.env`** in app code. Use `useRuntimeConfig()` in server and `useRuntimeConfig().public` in client. Keys are declared in `runtimeConfig` in `nuxt.config.ts`.
- **Auto-imports are real** — do not add explicit imports for `~/components`, `~/composables`, `~/utils`, or `hubDatabase()`. Imports like `useToast`, `defineShortcuts`, `useColorMode` come from `@nuxt/ui` auto-registration.
- **Use Nuxt UI v4 components** (`UButton`, `UDashboardPanel`, `UChatMessages`, `UChatPrompt`, etc.) instead of raw Tailwind. Slot APIs are documented in `.nuxt/ui/<component>.ts` after `nuxt prepare`.
- **AI SDK v6 patterns:**
  - Client: `new Chat({ api: '/api/chat' })` from `@ai-sdk/vue`.
  - Server: `streamText({ model, system, messages: await convertToModelMessages(messages) }).toUIMessageStreamResponse()`.
  - Chat text extraction iterates `message.parts` and filters `type === 'text'`.
- **Chunk schema** (`server/utils/schema.ts`): `documents.source` is unique; `chunks.embedding` is `vector(1536)` with an `ivfflat` cosine index.
- **No TODOs in committed code.** Use `// NOTE:` for inline rationale.

## OpenCode MCP + skills (configured in `opencode.json` / `.agents/skills/`)

- `nuxt` MCP — Nuxt 4 docs lookup (modules, deploy, getting started).
- `nuxt-ui` MCP — component metadata, search, examples. **Use this before guessing component APIs.** Key tools: `search_components`, `get_component`, `get_component_metadata`, `search_icons`, `get_example`.
- `agent-browser` skill — for any browser automation (QA, scraping, e2e).
- `nuxt-ui` skill — load the `layouts/chat.md` reference when building chat UI; load `guidelines/design-system.md` before picking colors or variants.

## Verification checklist (run before claiming "done")

Per PLAN.md §"Verification Checklist": boot, embedding smoke test (`/api/embed`), ingest (`/api/ingest-all`), retrieval similarity, end-to-end chat stream, dark mode + mobile (375px), no console errors, then `pnpm typecheck && pnpm lint && pnpm fmt:check`.

## Out of scope for v1

Auth, persistent cross-session history, multi-user, voice, OCR, hybrid BM25+vector search, re-ranking, tests, CI. Do not implement these.