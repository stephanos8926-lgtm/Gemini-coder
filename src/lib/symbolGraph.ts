import fs from 'fs/promises';
import path from 'path';
import { generateAstSkeleton, getAstNodes, AstNodeInfo } from './astManager';

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import';
  line: number;
  file: string;
  dependencies: string[]; // Names of other symbols referenced
  source?: string; // Full source code of the symbol for semantic chunking
  usageCount?: number; // How many times this symbol was included in a prompt
  successWeight?: number; // Cognitive boost based on successful interaction history
}

export class SymbolGraph {
  private static instances: Map<string, SymbolGraph> = new Map();
  private symbols: Map<string, SymbolInfo[]> = new Map(); 
  private graph: Map<string, Set<string>> = new Map();

  public static getInstance(tenant?: { userId: string, workspaceId: string }): SymbolGraph {
    const key = tenant ? `${tenant.userId}:${tenant.workspaceId}` : 'default';
    if (!SymbolGraph.instances.has(key)) {
      SymbolGraph.instances.set(key, new SymbolGraph());
    }
    return SymbolGraph.instances.get(key)!;
  }

  async indexFile(filePath: string, content: string) {
    const nodes = await getAstNodes(content, filePath);
    
    const symbols: SymbolInfo[] = nodes.map((node: AstNodeInfo) => ({
      name: node.name,
      type: node.type as any,
      line: 0, // We should improve getAstNodes to return line numbers
      file: filePath,
      dependencies: [],
      source: node.type === 'class' ? `class ${node.name} { ... }` : `${node.type} ${node.name}(${node.params || ''}) { ... }`
    }));

    this.symbols.set(filePath, symbols);
  }

  public updateFile(filePath: string, content: string) {
    this.indexFile(filePath, content);
  }

  public getDependencies(filePath: string): string[] {
    const symbols = this.symbols.get(filePath) || [];
    return symbols.filter(s => s.type === 'import').map(s => s.name);
  }

  public getGraphSummary() {
    return {
      totalFiles: this.symbols.size,
      totalSymbols: Array.from(this.symbols.values()).reduce((acc, s) => acc + s.length, 0)
    };
  }

  getRelatedSymbols(symbolName: string): SymbolInfo[] {
    const related: SymbolInfo[] = [];
    this.symbols.forEach(fileSymbols => {
      fileSymbols.forEach(s => {
        if (s.name === symbolName || s.dependencies.includes(symbolName)) {
          related.push(s);
        }
      });
    });
    return related;
  }

  getSymbolMap() {
    return Array.from(this.symbols.entries());
  }

  public getFileSymbols(filePath: string): SymbolInfo[] {
    return this.symbols.get(filePath) || [];
  }

  public getIndexStats() {
    let totalSymbols = 0;
    this.symbols.forEach(syms => totalSymbols += syms.length);
    return {
      files: this.symbols.size,
      symbols: totalSymbols
    };
  }

  public getRecentSymbols(limit: number = 20) {
    const all = Array.from(this.symbols.values()).flat();
    return all.slice(-limit).reverse();
  }

  public async generateSkeleton(filePath: string, content: string): Promise<string> {
    try {
      return await generateAstSkeleton(content, filePath);
    } catch (e) {
      console.warn(`AST skeleton generation failed for ${filePath}, using basic version:`, e);
      return this.generateBasicSkeleton(filePath);
    }
  }

  private generateBasicSkeleton(filePath: string): string {
    const symbols = this.symbols.get(filePath);
    if (!symbols || symbols.length === 0) return `// No symbols indexed for ${filePath}`;

    let skeleton = `// Skeleton for ${filePath}\n`;
    symbols.forEach(sym => {
      if (sym.type === 'import') return;
      
      // Improved skeletonization: include the signature and types for functions/classes/interfaces
      const source = sym.source || '';
      
      if (sym.type === 'class' || sym.type === 'interface') {
        // Extract the declaration line, maybe a bit more if possible
        const declaration = source.split('\n')[0].trim();
        skeleton += `${declaration} { /* ... members omitted ... */ }\n`;
      } else if (sym.type === 'function') {
        const signature = source.split('{')[0].trim() || 'function ' + sym.name;
        skeleton += `${signature} { /* ... implementation omitted ... */ };\n`;
      } else {
        skeleton += `// ${sym.type}: ${sym.name}\n`;
      }
    });

    return skeleton;
  }
}

export const symbolGraph = SymbolGraph.getInstance();
