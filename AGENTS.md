# Repository Guidelines

A contributor guide for **Recall**, a RAG chatbot prototype built on Nuxt 4.
It answers questions about Sethy.

## Project Structure & Module Organization

```
app/        Vue client (components, layouts, pages, composables, middleware, utils)
server/     Nitro endpoints (api/, db/, utils/) and server-only types/constants
shared/     Types shared between client and server
public/     Static assets served as-is
docker-compose.yml   Local Postgres + pgvector
nuxt.config.ts       Nuxt configuration
```

Key entry points: `app/app.vue`, `app/pages/index.vue`, `app/pages/admin/*`,
`server/api/chat.post.ts`, `server/api/admin/*`.

## Build, Test, and Development Commands

All commands run via `bun` (the project pins `@types/bun`).

| Command         | Purpose                                     |
| --------------- | ------------------------------------------- |
| `bun install`   | Install dependencies                        |
| `bun dev`       | Start dev server at `http://localhost:3000` |
| `bun build`     | Production build (`.output/`)               |
| `bun preview`   | Serve the production build                  |
| `bun typecheck` | `vue-tsc` type checks                       |
| `bun lint`      | `oxlint` static analysis                    |
| `bun lint:fix`  | `oxlint --fix`                              |
| `bun fmt`       | `oxfmt` formatter                           |
| `bun fmt:check` | `oxfmt --check` (CI mode)                   |

Before running the app, copy `.env.example` to `.env`, then
`docker compose up -d` to start Postgres + pgvector.

## Coding Style & Naming Conventions

- **Indentation**: 2 spaces, LF line endings, semicolons, double quotes, trailing
  commas (per `oxfmt.config.ts`; print width 100).
- **TypeScript** end-to-end (`tsconfig.json`); `@typescript-eslint/no-explicit-any`
  is disabled, but prefer typed APIs and Zod schemas (`drizzle-zod`).
- **Files**: route pages in `app/pages/*`, server endpoints in
  `server/api/<name>.<method>.ts` (e.g. `chat.post.ts`), shared types in
  `shared/types/`.
- **Components**: PascalCase (`ChatMessage.vue`); composables prefixed with
  `use`; env vars prefixed with `NUXT_`.

## Commit & Pull Request Guidelines

Commit messages follow Conventional Commits, as seen in history:
`feat:`, `fix:`, `refactor:`, `chore:`. Use the imperative mood and keep the
subject under ~72 characters.

Pull requests should:

- Describe the change and link any related issue.
- Include screenshots or short clips for UI changes (chat, admin pages).
- Confirm `bun typecheck`, `bun lint`, and `bun fmt:check` pass locally.
- Note any new env vars or `docker compose` requirements.

## Security & Configuration Tips

- Never commit `.env`; only update `.env.example` when adding new keys.
- Required secrets: `NUXT_LLM_*` (chat provider), `NUXT_EMBED_*` (embeddings),
  `NUXT_BETTER_AUTH_SECRET`, `DATABASE_URL`.
- After schema changes, regenerate migrations with `drizzle-kit` before opening
  a PR.
