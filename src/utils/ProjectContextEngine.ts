import fs from 'fs/promises';
import path from 'path';
import { ForgeGuard } from './ForgeWrappers';
import { SymbolGraph } from '../lib/symbolGraph';
import { EmbeddingEngine } from '../lib/embeddingEngine';
import { activeTabTracker } from '../lib/activeTabTracker';

import { nexusPersist } from '../lib/persistence/NexusPersistence';
import { TenantContext, PersistenceTier } from '../lib/persistence/types';

export interface FileIndexEntry {
  path: string;
  size: number;
  lastModified: number;
  summary?: string;
  intent?: string; 
  successWeight?: number; // Persisted weight
}

export class ProjectContextEngine {
  private static instances: Map<string, ProjectContextEngine> = new Map();
  private index: Map<string, FileIndexEntry> = new Map();
  private docIndex: Map<string, string> = new Map(); 
  private guard = ForgeGuard.init('context-engine');
  private isIndexing = false;
  private tenant: TenantContext;

  private constructor(tenant: TenantContext) {
    this.tenant = tenant;
    this.loadPersistedWeights();
  }

  private get symbols() {
    return SymbolGraph.getInstance(this.tenant);
  }

  private get embeddings() {
    return EmbeddingEngine.getInstance(this.tenant);
  }

  private async loadPersistedWeights() {
    const weights = await nexusPersist.get<Record<string, number>>('context_weights', this.tenant);
    if (weights) {
      Object.entries(weights).forEach(([path, weight]) => {
        const entry = this.index.get(path);
        if (entry) {
          entry.successWeight = weight;
        }
      });
    }
  }

  public static getInstance(tenant?: TenantContext): ProjectContextEngine {
    // For client-side backward compatibility if tenant is not provided
    const effectiveTenant = tenant || { userId: 'default-user', workspaceId: 'default-workspace' };
    const key = `${effectiveTenant.userId}:${effectiveTenant.workspaceId}`;
    
    if (!ProjectContextEngine.instances.has(key)) {
      ProjectContextEngine.instances.set(key, new ProjectContextEngine(effectiveTenant));
    }
    return ProjectContextEngine.instances.get(key)!;
  }

  /**
   * Recursively scans the project directory to build a searchable index.
   * Optimized with ForgeGuard protection and concurrency limits.
   */
  public async indexProject(rootPath: string): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;

    await this.guard.protect(async () => {
      console.log(`[ContextEngine] Starting indexing for: ${rootPath}`);
      const newIndex = new Map<string, FileIndexEntry>();
      const newDocIndex = new Map<string, string>();
      
      const scan = async (dir: string) => {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relPath = path.relative(rootPath, fullPath);

          // Skip noisy directories
          if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'dist' || entry.name === '.next') {
            continue;
          }

          if (entry.isDirectory()) {
            await scan(fullPath);
          } else if (entry.isFile()) {
            const stats = await fs.stat(fullPath);
            const content = await fs.readFile(fullPath, 'utf8');
            
            // Index symbols for TS/JS/Python files
            if (entry.name.match(/\.(ts|tsx|js|jsx|py)$/)) {
              await this.symbols.indexFile(relPath, content);
            }

            // Index embeddings for semantic search
            try {
              await this.embeddings.indexFile(relPath, content);
            } catch (e) {
              console.warn(`[ContextEngine] Failed to embed ${relPath}:`, e);
            }

            // Index documentation
            if (entry.name.toLowerCase().endsWith('.md') || entry.name.toLowerCase().includes('readme')) {
              newDocIndex.set(relPath, content.substring(0, 2000)); // First 2k chars
            }

            newIndex.set(relPath, {
              path: relPath,
              size: stats.size,
              lastModified: stats.mtimeMs,
              intent: this.inferIntent(relPath, entry.name)
            });
          }
        }
      };

      await scan(rootPath);
      this.index = newIndex;
      this.docIndex = newDocIndex;
      console.log(`[ContextEngine] Indexing complete. Indexed ${this.index.size} files and ${this.docIndex.size} docs.`);
    }, { rootPath });

    this.isIndexing = false;
  }

  private inferIntent(relPath: string, fileName: string): string | undefined {
    if (fileName.includes('Service')) return 'Business logic service';
    if (fileName.includes('Controller') || fileName.includes('Route')) return 'API endpoint handler';
    if (fileName.includes('Store')) return 'State management';
    if (fileName.includes('Component')) return 'UI component';
    if (fileName.includes('Test') || fileName.includes('spec')) return 'Quality assurance';
    return undefined;
  }

  public getIndex(): FileIndexEntry[] {
    return Array.from(this.index.values());
  }

  public getDocs(): { path: string, content: string }[] {
    return Array.from(this.docIndex.entries()).map(([path, content]) => ({ path, content }));
  }

  public search(query: string): FileIndexEntry[] {
    const q = query.toLowerCase();
    return this.getIndex().filter(entry => 
      entry.path.toLowerCase().includes(q)
    );
  }

  /**
   * Serializes the index into a highly optimized memory map format (JSON string for now)
   */
  /**
   * RAG-based Context Pruning
   * Returns only the most relevant file contents based on the query and optional skill context.
   * Mirrors patterns used by enterprise AI tools to avoid context bloat.
   */
  public async getRelevantContext(
    query: string, 
    limit: number = 5, 
    skillContext?: { skillName: string, stepName: string },
    clientContext?: { activeTab: string | null, openTabs: string[] }
  ): Promise<{ path: string, content: string }[]> {
    const q = query.toLowerCase();
    
    // 1. Context Priority (Working Set)
    const activeTab = clientContext?.activeTab ?? activeTabTracker.getActiveTab();
    const openTabs = clientContext?.openTabs ? new Set(clientContext.openTabs) : new Set(activeTabTracker.getOpenTabs());

    // 2. Symbol-based scoring (Advanced Context)
    const relatedSymbols = this.symbols.getRelatedSymbols(query);
    const symbolPaths = new Set(relatedSymbols.map(s => s.file));

    // 3. Semantic Search (Embeddings)
    let semanticResults: string[] = [];
    try {
      const semanticMatches = await this.embeddings.search(query, limit);
      semanticResults = semanticMatches.map(m => m.path);
    } catch (e) {
      console.warn('[ContextEngine] Semantic search failed:', e);
    }

    const scored = Array.from(this.index.values()).map(entry => {
      const score = this.calculateScore(entry, {
        q, activeTab, openTabs, symbolPaths, semanticResults, skillContext
      });
      return { entry, score };
    });

    // 5. Sort and take top results
    const top = scored
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // 6. Fetch contents for top results
    const results = await Promise.all(top.map(async ({ entry }) => {
      try {
        // Integrate AST/skeleton summarization if available
        if (entry.path.match(/\.(ts|tsx|js|jsx|py)$/)) {
          const content = await fs.readFile(entry.path, 'utf8');
          const skeleton = await this.symbols.generateSkeleton(entry.path, content);
          return { path: entry.path, content: skeleton };
        }
        
        const content = await fs.readFile(entry.path, 'utf8');
        return { path: entry.path, content: content.substring(0, 5000) }; // Cap at 5k chars
      } catch (e) {
        return null;
      }
    }));

    return results.filter((r): r is { path: string, content: string } => r !== null);
  }

  /**
   * Tracks a successful interaction for a given path.
   * Increments successWeight and persists it via NexusPersistence.
   */
  public async trackSuccess(path: string, weightBoost: number = 5): Promise<void> {
    const entry = this.index.get(path);
    if (entry) {
      const currentWeight = entry.successWeight || 0;
      entry.successWeight = currentWeight + weightBoost;
      
      // Persist all weights (In an enterprise system, we might throttle this or persist incrementally)
      const weights: Record<string, number> = {};
      this.getIndex().forEach(e => {
        if (e.successWeight) weights[e.path] = e.successWeight;
      });
      await nexusPersist.set('context_weights', weights, { tier: PersistenceTier.LOCAL, tenant: this.tenant });
    }
  }

  /**
   * Scoring logic with success weighting
   */
  private calculateScore(entry: FileIndexEntry, context: { 
    q: string, 
    activeTab: string | null, 
    openTabs: Set<string>, 
    symbolPaths: Set<string>,
    semanticResults: string[]
    skillContext?: any
  }): number {
    let score = 0;
    const pathParts = entry.path.toLowerCase().split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    if (entry.path === context.activeTab) score += 50;
    if (context.openTabs.has(entry.path)) score += 20;
    if (context.symbolPaths.has(entry.path)) score += 30;
    if (context.semanticResults.includes(entry.path)) score += 25;

    score += (entry as any).successWeight || 0;

    if (context.skillContext) {
      if (entry.path.toLowerCase().includes(context.skillContext.skillName.toLowerCase())) score += 40;
      if (entry.path.toLowerCase().includes(context.skillContext.stepName.toLowerCase())) score += 30;
    }

    if (fileName.includes(context.q)) score += 10;
    if (entry.path.toLowerCase().includes(context.q)) score += 5;
    if (entry.intent?.toLowerCase().includes(context.q)) score += 3;
    
    return score;
  }

  public serializeIndex(): string {
    return JSON.stringify(Object.fromEntries(this.index));
  }
}
