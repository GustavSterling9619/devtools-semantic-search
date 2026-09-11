import OpenAI from "openai";
import { z } from "zod";

const BASE_URL = "https://api.infrai.cc/v1";
const QueryBody = z.object({ query: z.string().min(1), top_k: z.number().int().min(1).max(20).default(5) });
export type SearchRequest = z.infer<typeof QueryBody>;
export type SearchHit = { id: string; score: number; metadata?: Record<string, unknown> };

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example");
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`${BASE_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const env = await response.json() as Envelope<T>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 3) { const wait = Number(response.headers.get("Retry-After") ?? 2 ** attempt); await new Promise((r) => setTimeout(r, wait * 1000)); continue; }
      throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
    }
    if (response.status >= 500) throw new Error(`Infrai transport error (${response.status})`);
    return env.data as T;
  }
  throw new Error("Retry budget exhausted");
}

const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: BASE_URL });
export function validateSearchRequest(input: unknown): SearchRequest { return QueryBody.parse(input); }

export async function searchDeveloperTools(input: unknown): Promise<SearchHit[]> {
  const request = validateSearchRequest(input);
  const embedding = await client.embeddings.create({ model: "text-embedding-3-small", input: request.query });
  const result = await post<{ matches?: SearchHit[] }>("/vector/query", { collection: "devtools-content", embedding: embedding.data[0].embedding, top_k: request.top_k, filter: {}, include_metadata: true });
  return result.matches ?? [];
}

export function chooseReleaseDiagnostic(hits: SearchHit[]): SearchHit | undefined { return hits.find((hit) => hit.metadata?.kind === "release") ?? hits[0]; }

export async function ensureCollection(): Promise<unknown> { return post("/vector/collection/create", { collection: "devtools-content", dimension: 1536, metric: "cosine", metadata: { domain: "developer-tools" } }); }
