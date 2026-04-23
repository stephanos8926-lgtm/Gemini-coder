import fs from 'fs/promises';
import path from 'path';
import { ForgeGuard } from '../../packages/nexus/guard/ForgeGuard';
import { symbolGraph } from '../lib/symbolGraph';
import { embeddingEngine } from '../lib/embeddingEngine';
import { activeTabTracker } from '../lib/activeTabTracker';

export interface FileIndexEntry {
  path: string;
  size: number;
  lastModified: number;
  summary?: string;
  intent?: string; // Extracted from README or comments
}

export class ProjectContextEngine {
  private static instance: ProjectContextEngine;
  private index: Map<string, FileIndexEntry> = new Map();
  private docIndex: Map<string, string> = new Map(); // path -> content
  private guard = ForgeGuard.init('context-engine');
  private isIndexing = false;

  private constructor() {}

  public static getInstance(): ProjectContextEngine {
    if (!ProjectContextEngine.instance) {
      ProjectContextEngine.instance = new ProjectContextEngine();
    }
    return ProjectContextEngine.instance;
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
            
            // Index symbols for TS/JS files
            if (entry.name.match(/\.(ts|tsx|js|jsx)$/)) {
              await symbolGraph.indexFile(relPath, content);
            }

            // Index embeddings for semantic search
            try {
              await embeddingEngine.indexFile(relPath, content);
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
    skillContext?: { skillName: string, stepName: string }
  ): Promise<{ path: string, content: string }[]> {
    const q = query.toLowerCase();
    
    // 1. Active Tab Priority (Working Set)
    const activeTab = activeTabTracker.getActiveTab();
    const openTabs = new Set(activeTabTracker.getOpenTabs());

    // 2. Symbol-based scoring (Advanced Context)
    const relatedSymbols = symbolGraph.getRelatedSymbols(query);
    const symbolPaths = new Set(relatedSymbols.map(s => s.file));

    // 3. Semantic Search (Embeddings)
    let semanticResults: string[] = [];
    try {
      const semanticMatches = await embeddingEngine.search(query, limit);
      semanticResults = semanticMatches.map(m => m.path);
    } catch (e) {
      console.warn('[ContextEngine] Semantic search failed:', e);
    }

    // 4. Scoring logic
    const scored = Array.from(this.index.values()).map(entry => {
      let score = 0;
      const pathParts = entry.path.toLowerCase().split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      // Active Tab is highest priority
      if (entry.path === activeTab) score += 50;
      if (openTabs.has(entry.path)) score += 20;

      // Symbol matches
      if (symbolPaths.has(entry.path)) score += 30;

      // Semantic matches
      if (semanticResults.includes(entry.path)) score += 25;

      // Skill-based context priority
      if (skillContext) {
        // Boost files that seem related to the skill step
        if (entry.path.toLowerCase().includes(skillContext.skillName.toLowerCase())) score += 40;
        if (entry.path.toLowerCase().includes(skillContext.stepName.toLowerCase())) score += 30;
      }

      // Keyword matches
      if (fileName.includes(q)) score += 10;
      if (entry.path.toLowerCase().includes(q)) score += 5;
      if (entry.intent?.toLowerCase().includes(q)) score += 3;
      
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
        // In a real enterprise tool, we'd use vector embeddings here.
        // For now, we use high-quality keyword matching.
        const content = await fs.readFile(entry.path, 'utf8');
        return { path: entry.path, content: content.substring(0, 5000) }; // Cap at 5k chars
      } catch (e) {
        return null;
      }
    }));

    return results.filter((r): r is { path: string, content: string } => r !== null);
  }

  public serializeIndex(): string {
    return JSON.stringify(Object.fromEntries(this.index));
  }
}
