# RAG and managed settings

Configure models, embeddings, retrieval, chunking, chat limits and password-reset email at
`/admin/settings`. Settings are read from PostgreSQL for each operation; changes apply across
server instances on their next request. Full chat history remains saved independently of the
context limits sent to a model.

## Encryption

Set a stable `NUXT_APP_SECRET` in each deployment environment. Generate it once with
`openssl rand -base64 32`, keep it outside the database and back it up with your deployment
secrets. Use different values for development, staging and production.

Nuxt 4.6's [`deriveSecret`](https://nuxt.com/docs/4.x/guide/going-further/server-imports#deriving-secrets)
derives a dedicated 32-byte key for `recall:settings:v1`. No custom encryption-key environment
variable is needed. Nuxt's automatically generated development secret is refused for database
encryption because deleting `.nuxt` would lose access to the saved credentials.

`app_settings.value` contains configuration with blank credential fields. `app_settings.secrets`
contains AES-256-GCM ciphertext, with fresh nonces and authenticated field paths. Model IDs keep
credentials attached to the correct model during reordering. Moving ciphertext between fields
or applications fails authentication. Admin responses return saved/not-saved flags; public
settings return only chat limits. Decrypted settings are never
written to Nitro storage or a shared cache.

Blank credential inputs preserve saved values. Enter a value to rotate it; use the removal
checkbox to delete it. Switching API key/Bearer token saves only the selected credential. An
enabled chat model requires its selected credential. Disabled models are excluded from routing.

Changing or losing `NUXT_APP_SECRET` makes existing encrypted credentials unreadable. Encryption
key rotation needs a controlled decrypt/re-encrypt migration with the old key. Updating a provider
credential through Admin requires no re-ingestion.

## Upgrade an existing Recall installation

1. Back up PostgreSQL, uploaded Markdown and existing provider configuration.
2. Set `NUXT_APP_SECRET` for the intended environment. Production servers do not load `.env`;
   supply environment values through your deployment platform.
3. Run `bun run db:migrate` against the intended database and build for that same database target
   and driver (`postgres-js` locally, `neon-http` for Neon HTTP deployments). NuxtHub also applies
   migrations during its normal production build. `POSTGRES_URL` and `POSTGRESQL_URL` can override
   `DATABASE_URL`; verify the selected target without printing credentials.
4. Open `/admin/settings`. Copy the former LLM, embedding and Resend configuration into Admin.
   Legacy `NUXT_LLM_*`, `NUXT_EMBED_*`, retrieval/chunking environment values and
   `NUXT_RESEND_*` are no longer used. Resend needs a sender on your verified domain.
5. Verify documents and retrieval before removing legacy environment values.

Migration `0002` preserves documents, chunks, auth records and chats. Missing/duplicate document
titles receive an ID suffix, and existing chunks get reading-order indexes. Earlier Recall did
not reliably record embedding provenance. Those documents must be re-ingested before retrieval
can trust them. Use Sources to inspect/download originals, then re-upload under the same title
to replace a source. Frontmatter titles take precedence over filenames; remove a legacy copy
explicitly when its title differs. The migration never resets the corpus automatically.

NuxtHub may embed its selected database URL in the generated database client. Treat build
artifacts as private, and rebuild for a different database target instead of changing runtime
`DATABASE_URL` alone. Do not run build/migration commands with production credentials while
testing against a disposable database.

## Retrieval and ingestion

- Markdown headings and text boundaries guide chunking. Overlap, size, minimum merge length and
  maximum count are configurable. Short documents are preserved. Preview uses the same chunker
  without contacting a provider or writing data.
- YAML frontmatter supplies title/tags and is excluded from embeddings. JavaScript frontmatter
  is never evaluated.
- SHA-256 content, embedding identity and chunking identity skip unchanged uploads. Same-title
  replacement writes the document and its ordered chunks atomically. Provider failure leaves
  the original intact.
- Embeddings must contain 2048 finite dimensions. Model/normalized endpoint identity is checked
  before ingestion commits. Incompatible embedding configuration changes are rejected while a
  corpus exists. Export sources before deliberately resetting/changing the embedding space.
- Hybrid search combines half-vector cosine candidates and PostgreSQL `simple` full-text search
  using reciprocal rank fusion. `simple` preserves proper nouns without English stemming; it
  does not provide language-specific word segmentation. Optional local lexical reranking runs
  across candidates before selecting top K. Similarity remains the original vector score.
- Keyword matches can pass below the vector threshold. The retrieval playground shows the
  match reason and rejected candidates. Chat receives only accepted hits, with document titles
  used for source badges. These badges identify retrieved documents; they are not sentence-level
  citation verification.

Settings changes and corpus writes share a transaction-scoped PostgreSQL advisory lock. Revision
checks prevent lost updates; embedding checks prevent stale ingestion from committing after an
embedding change. PostgreSQL callback transactions and Neon HTTP atomic batches use the same
guarded SQL.

## Chat providers and request handling

Models must support streaming and tool calling. `anthropic` uses the Messages API; `openai`
uses Chat Completions, including compatible endpoints such as OpenRouter. Credentials use either
the API-key header appropriate to the adapter or Bearer authentication.

Routing follows Admin priority automatically; visitors cannot select or override the model.
The remaining enabled models provide fallback. Transient network failures, quota/rate errors, account refusals,
timeouts and provider 5xx errors trigger cooldown/fallback before answer text starts. Buffered
failed-attempt events are discarded. Once answer text starts, errors end that answer instead
of mixing providers. SDK retries are disabled. Cancellation aborts the active attempt.

Cooldowns and the 10-requests/minute IP limit are process-local. Use deployment-level limits for
shared enforcement across replicas. Set `NUXT_TRUST_PROXY_HEADERS=true` only behind a trusted
proxy that overwrites `X-Forwarded-For`; it is false by default. Provider request timeout is per
attempt, so total latency can include several attempts.

The server reads conversation history from its database. Client-supplied history cannot inject
system instructions or tool results. Context is bounded; reasoning/tool parts from older turns
are excluded. Chat accepts text only. Existing attachment previews remain readable, but files
are excluded from model context and new chat uploads are disabled.
Editing, regeneration and votes remain available. Chat titles use the first message without an
extra paid model request.

Admin APIs enforce the admin session on the server. Mutation requests reject cross-site origins;
settings writes require JSON. Provider errors shown to browsers are generic. Markdown previews
and model output use the Comark security plugin.

## Verification

`bun run test` runs unit tests without a Nuxt server or database. `bun run lint`,
`bun run typecheck` and `bun run fmt:check` perform static checks.

`test/fixtures/providers.ts` supplies local embedding and streaming/failover fixtures:
`bun test/fixtures/providers.ts`. With an isolated app on port 3109 connected to a disposable
Postgres database named `recall_rag_test*`, run:

```sh
RAG_TEST_BASE_URL=http://localhost:3109 \
RAG_TEST_DATABASE_URL=postgresql://recall_test@127.0.0.1:55439/recall_rag_test \
RAG_TEST_APP_DIR=/absolute/path/to/disposable-app \
bun run test:integration
```

The integration runner creates a test admin, resets that disposable corpus and configures mock
credentials. It refuses non-loopback app/database hosts and other database names. Do not use it
against a real deployment. Browser QA should cover settings save/validation, source preview and
replacement, retrieval, streaming, follow-ups, editing, regeneration and mobile navigation.

Use a separate copy with its own dependencies, not a shared `node_modules` symlink. The runner
checks dependency locations and generated database targets before making mutations. Build the
copy with its test database URL and run it with `bun run preview --port 3109`. The standard
`node-server` preset runs under Node; deploy with `node .output/server/index.mjs`.
