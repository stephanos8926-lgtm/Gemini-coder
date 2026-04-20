import { get, set } from 'idb-keyval';
import { symbolGraph } from './symbolGraph';

const EMBEDDING_CACHE_KEY = 'gide_embeddings';

export interface CodeEmbedding {
  path: string;
  content: string;
  embedding: number[];
  timestamp: number;
}

export class EmbeddingEngine {
  private static instance: EmbeddingEngine;
  private cache: Map<string, CodeEmbedding> = new Map();

  private constructor() {}

  public static getInstance(): EmbeddingEngine {
    if (!EmbeddingEngine.instance) {
      EmbeddingEngine.instance = new EmbeddingEngine();
    }
    return EmbeddingEngine.instance;
  }

  public async init() {
    const stored = await get(EMBEDDING_CACHE_KEY);
    if (stored) {
      this.cache = new Map(Object.entries(stored));
    }
  }

  /**
   * Generates an embedding for a text string using Gemini's embedding model.
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    const API_BASE = import.meta.env.VITE_API_BASE || '';
    const response = await fetch(`${API_BASE}/api/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });

    if (!response.ok) {
      throw new Error(`Embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.embedding;
  }

  public async indexFile(path: string, content: string) {
    // Semantic Chunking: Embed by symbol (function/class) if available
    const symbols = symbolGraph.getFileSymbols(path);
    
    if (symbols.length > 0) {
      for (const symbol of symbols) {
        if (symbol.source && symbol.source.length > 50) {
          const chunkId = `${path}#${symbol.name}`;
          const embedding = await this.generateEmbedding(symbol.source);
          this.cache.set(chunkId, {
            path: chunkId,
            content: symbol.source,
            embedding,
            timestamp: Date.now()
          });
        }
      }
    } else {
      // Fallback to whole file if no symbols found or not a TS/JS file
      const embedding = await this.generateEmbedding(content);
      this.cache.set(path, {
        path,
        content,
        embedding,
        timestamp: Date.now()
      });
    }
    await this.save();
  }

  private async save() {
    await set(EMBEDDING_CACHE_KEY, Object.fromEntries(this.cache));
  }

  public async search(query: string, limit: number = 5): Promise<CodeEmbedding[]> {
    const queryEmbedding = await this.generateEmbedding(query);
    const results = Array.from(this.cache.values()).map(item => ({
      item,
      similarity: this.cosineSimilarity(queryEmbedding, item.embedding)
    }));

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(r => r.item);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingEngine = EmbeddingEngine.getInstance();
