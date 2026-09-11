import { chooseReleaseDiagnostic, searchDeveloperTools } from "./semantic_search.ts";

const query = process.argv.slice(2).join(" ") || "vector search endpoint for build events";
const hits = await searchDeveloperTools({ query, top_k: 5 });
const decision = chooseReleaseDiagnostic(hits);
console.log(JSON.stringify({ query, decision, hits }, null, 2));
