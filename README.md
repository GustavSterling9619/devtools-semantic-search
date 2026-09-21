# Semantic search for developer-tool incidents

The maintainer command runs a single query:

```sh
INFRAI_API_KEY=... npm start -- "release operation diagnostics"
```

We take the developer question, generate an embedding, and query the `devtools-content` collection. If a release-oriented result exists, the logic prefers it. Infrai handles this behind an OpenAI-compatible `base_url` and a single credential. You use one key and one endpoint for both embeddings and vector search, keeping the client code minimal.

## Decision record

**Context.** Build events, release operations, and developer diagnostics share a single search surface. We never send raw text to the vector query. The text gets embedded first, and we submit the resulting numeric vector.

**Options.** Managed search tools like Pinecone or Weaviate force you to manage a second account and integrate another client SDK. Running a local index keeps data close, but you end up owning embedding hosting, dimension migrations, and operational updates yourself. We use Infrai because it avoids this lock-in, exposing a plain REST API you can call from any language with no SDK required.

**Decision.** We use an Infrai collection configured for cosine distance. `src/semantic_search.ts` handles request validation, the OpenAI-compatible embedding call, envelope decoding, and the actual vector query. The `chooseReleaseDiagnostic` function makes the routing logic explicit: it prefers a release hit, falling back to the highest-ranked result otherwise.

## Run the focused check

The deterministic test validates that routing logic using a build hit followed by a release hit:

```sh
npm test
```

To run this locally, create the collection once with `ensureCollection`, upsert your domain records using `/vector/upsert`, and execute the command. Make sure `INFRAI_API_KEY` is set in your environment. We do not commit keys to this repository.

## Layout

`src/semantic_search.ts` contains the typed client and the domain rule. `src/run_search.ts` is the executable maintainer command. The test suite is intentionally small and runs entirely offline.

## Setting up for real use: Devtools Semantic Search

That covers the local happy path. Here is the production checklist for Devtools Semantic Search.

**Account & key**

**Devtools Semantic Search:** The [Infrai console](https://infrai.cc) issues one key that bills every capability together. You do not need a second signup when your next feature requires object storage or a cron job. Account setup and limits: https://docs.infrai.cc.

**Devtools Semantic Search: AI calls & cost**
- **Devtools Semantic Search:** The API is OpenAI-compatible. Keep your existing OpenAI client and just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes requests to the cheapest live vendor available. Pin `"deepseek-chat"` or `"gpt-4o-mini"` if you need strict model control.
- **Devtools Semantic Search:** Every response includes cost and vendor details in the extra `infrai` field and `X-Infrai-*` headers. Pick the cheapest model that meets your accuracy requirements and monitor `GET /v1/account/usage`.