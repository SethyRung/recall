# Recall

A RAG chatbot prototype that answers questions about Sethy. A Nuxt 4 app with
a streaming chat UI on the client and a Nitro server that retrieves relevant
chunks from Postgres + pgvector and streams a grounded answer back.

## Stack

- **Nuxt 4** + TypeScript end-to-end
- **@nuxt/ui v4** (Reka UI + Tailwind v4) for the UI
- **AI SDK v6** for chat + embedding model calls
- **@comark/nuxt** for streaming markdown rendering
- **Better Auth** for admin authentication
- **Postgres + pgvector** (local via `docker-compose`) for similarity search
- **Drizzle ORM** + `drizzle-zod` for typed schema and validation
- **MiniMax M2.7** (chat) + **NVIDIA `llama-nemotron-embed-vl-1b-v2`** (embeddings)

## Quickstart

```bash
cp .env.example .env          # fill in LLM/embed keys and NUXT_BETTER_AUTH_SECRET
docker compose up -d          # start Postgres + pgvector
bun install
bun dev                       # http://localhost:3000
```

Then sign in at `http://localhost:3000/admin/login` and use the **Ingest**
action on `/admin` to embed the source content into pgvector. After that, the
chat at `/` will answer from the vector store.

## Scripts

| Command         | What it does             |
| --------------- | ------------------------ |
| `bun dev`       | Start dev server         |
| `bun build`     | Production build         |
| `bun preview`   | Preview production build |
| `bun typecheck` | `vue-tsc` type checks    |
| `bun lint`      | `oxlint` static analysis |
| `bun lint:fix`  | `oxlint --fix`           |
| `bun fmt`       | `oxfmt` formatter        |
| `bun fmt:check` | `oxfmt --check` (CI)     |

## Project layout

```
app/        Vue client (components, layouts, pages, composables, utils)
  pages/
    index.vue         Chat UI
    admin/            Admin login + dashboard
  components/
    chat/             Comark renderer, indicator, source link
    admin/            Stats panel, confirm-reset modal
server/     Nitro endpoints, server utils, DB schema, constants
  api/
    chat.post.ts              Streaming chat
    auth/[...all].ts          Better Auth handler
    admin/                    ingest, stats, reset
shared/     Types shared between client and server
docker-compose.yml   Local Postgres + pgvector
```

## Environment

Copy `.env.example` to `.env` and fill in at minimum:

| Variable                    | Purpose                                |
| --------------------------- | -------------------------------------- |
| `DATABASE_URL`              | Postgres connection string             |
| `NUXT_BETTER_AUTH_SECRET`   | Better Auth signing secret             |
| `NUXT_BETTER_AUTH_URL`      | Public URL the app is served from      |
| `NUXT_LLM_BASE_URL`         | Chat provider base URL                 |
| `NUXT_LLM_API_KEY`          | Chat provider API key                  |
| `NUXT_LLM_MODEL`            | Chat model name                        |
| `NUXT_EMBED_BASE_URL`       | Embeddings provider base URL           |
| `NUXT_EMBED_API_KEY`        | Embeddings provider API key            |
| `NUXT_EMBED_MODEL`          | Embeddings model name                  |
| `NUXT_TOP_K`                | Chunks retrieved per query (default 5) |
| `NUXT_SIMILARITY_THRESHOLD` | Minimum similarity to include a chunk  |
| `NUXT_CHUNK_SIZE`           | Chunk size in tokens                   |
| `NUXT_CHUNK_OVERLAP`        | Overlap between chunks                 |
