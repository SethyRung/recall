# Recall

A RAG chatbot prototype that answers questions about Sethy.

## Stack

- **Nuxt 4** + TypeScript
- **@nuxt/ui v4** (Reka UI + Tailwind v4)
- **@nuxthub/core** — managed Postgres
- **AI SDK v6** + `@comark/nuxt` for streaming markdown
- **pgvector** for similarity search over portfolio chunks
- **MiniMax M3** (chat) + **OpenAI text-embedding-3-small** (embeddings)

## Quickstart

```bash
cp .env.example .env          # fill in NUXT_LLM_* and NUXT_EMBED_API_KEY
docker compose up -d          # start Postgres + pgvector
bun install
bun run dev                   # http://localhost:3000
```

Then open `http://localhost:3000/admin` and click **Ingest all** to load the markdown files from `data/` into the vector store.

## Scripts

| Command                     | What it does             |
| --------------------------- | ------------------------ |
| `bun dev`                   | Start dev server         |
| `bun build`                 | Production build         |
| `bun preview`               | Preview production build |
| `bun typecheck`             | TypeScript checks        |
| `bun lint` / `bun lint:fix` | oxlint                   |
| `bun fmt` / `bun fmt:check` | oxfmt                    |

## Project layout

```
app/       Vue client (components, layouts, pages, composables)
server/    Nitro endpoints (chat, ingest, embed, stats, reset)
shared/    Types shared between client and server
data/      Markdown sources — what the bot knows about
docker-compose.yml   Local Postgres + pgvector
```
