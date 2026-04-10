import { generateAstSkeleton } from '../utils/astChunker';

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable';
  line: number;
  isExported: boolean;
  doc?: string;
}

export interface FileSymbols {
  path: string;
  exports: SymbolInfo[];
  imports: { source: string; symbols: string[] }[];
}

class SymbolGraph {
  private static instance: SymbolGraph;
  private graph: Map<string, FileSymbols> = new Map();

  private constructor() {}

  public static getInstance(): SymbolGraph {
    if (!SymbolGraph.instance) {
      SymbolGraph.instance = new SymbolGraph();
    }
    return SymbolGraph.instance;
  }

  public updateFile(path: string, code: string) {
    // This is a simplified version. In a real scenario, we'd parse imports/exports properly.
    // For now, we'll leverage the AST chunker's logic indirectly or expand it.
    const symbols: SymbolInfo[] = [];
    
    // We'll need to expose more from astChunker or duplicate logic for now
    // Let's assume we'll enhance astChunker to return structured data too.
    
    this.graph.set(path, {
      path,
      exports: [], // To be populated
      imports: []  // To be populated
    });
  }

  public getDependencies(path: string): string[] {
    const file = this.graph.get(path);
    return file?.imports.map(i => i.source) || [];
  }

  public getDependents(path: string): string[] {
    const dependents: string[] = [];
    this.graph.forEach((data, filePath) => {
      if (data.imports.some(i => i.source === path)) {
        dependents.push(filePath);
      }
    });
    return dependents;
  }

  public getGraphSummary(): string {
    let summary = "Symbol Graph Summary:\n";
    this.graph.forEach((data, path) => {
      summary += `- ${path}\n`;
      if (data.exports.length > 0) {
        summary += `  Exports: ${data.exports.map(e => e.name).join(', ')}\n`;
      }
      if (data.imports.length > 0) {
        summary += `  Imports from: ${data.imports.map(i => i.source).join(', ')}\n`;
      }
    });
    return summary;
  }
}

export const symbolGraph = SymbolGraph.getInstance();
