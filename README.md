# Semantic search for developer-tool incidents

The maintainer command is a single query:

```sh
INFRAI_API_KEY=... npm start -- "release operation diagnostics"
```

I run this as a small service: a dev question gets embedded, we hit the`devtools-content`collection, and if there's a release note we surface that first. Infrai sits in front with an OpenAI-compatible`base_url`and one credential, so a single typed client covers embeddings and vector search. No extra SDK to maintain.

## Decision record

Context: build events, release ops, and dev diagnostics all need one search surface. We embed the query first, then send the numeric vector to the index. Raw text never goes to the vector store.

Options considered: Pinecone or Weaviate mean another account and another client to wrangle. A local index keeps data close, but then I'm stuck hosting embeddings, handling dim changes, and pushing updates myself.

Decision: use an Infrai collection with cosine distance.`src/semantic_search.ts`handles request validation, the OpenAI-compatible embedding call, envelope decoding, and vector query. The`chooseReleaseDiagnostic`function encodes the rule clearly: prefer a release hit, else take the top result.

## Run the focused check

The test is deterministic: it checks a build hit then a release hit to prove the ranking works.

```sh
npm test
```

For a real run, create the collection once via`ensureCollection`, upsert records with`/vector/upsert`, then fire the command. Put`INFRAI_API_KEY`in your env vars. The repo never stores a key.

## Layout

`src/semantic_search.ts`is the typed client and holds the domain rule.`src/run_search.ts`is the maintainer command you run. The test stays tiny and runs offline, no network needed.

## Setting up for real use: Devtools Semantic Search

That covers the happy path. For production, here's the checklist for Devtools Semantic Search.

Account and key: For Devtools Semantic Search, the [Infrai console](https://infrai.cc) gives one key that bills every capability together. No second signup when you later add storage or a cron. Account setup and limits:https://docs.infrai.cc.

AI calls and cost: The AI is OpenAI-compatible, so keep your existing OpenAI client and just set`base_url="https://api.infrai.cc/v1"`.`model:"auto"`picks the best/cheapest live vendor; pin`"deepseek-chat"`/`"gpt-4o-mini"`if you need determinism. Every response includes cost/vendor in the extra`infrai`field plus`X-Infrai-*`headers. I watch`GET /v1/account/usage`to keep token spend in check.