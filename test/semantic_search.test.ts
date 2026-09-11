import assert from "node:assert/strict";
import { chooseReleaseDiagnostic, validateSearchRequest } from "../src/semantic_search.ts";

const request = validateSearchRequest({ query: "release operation diagnostics", top_k: 3 });
assert.equal(request.top_k, 3);
const release = { id: "r1", score: 0.7, metadata: { kind: "release" } };
assert.equal(chooseReleaseDiagnostic([{ id: "b1", score: 0.9, metadata: { kind: "build" } }, release]), release);
console.log("semantic search decision test passed");
