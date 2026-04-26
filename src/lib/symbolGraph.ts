import fs from 'fs/promises';
import path from 'path';
import * as ts from 'typescript';

export interface SymbolInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import';
  line: number;
  file: string;
  dependencies: string[]; // Names of other symbols referenced
  source?: string; // Full source code of the symbol for semantic chunking
}

export class SymbolGraph {
  private static instance: SymbolGraph;
  private symbols: Map<string, SymbolInfo[]> = new Map(); // file -> symbols
  private graph: Map<string, Set<string>> = new Map(); // symbol -> dependent symbols

  public static getInstance(): SymbolGraph {
    if (!SymbolGraph.instance) {
      SymbolGraph.instance = new SymbolGraph();
    }
    return SymbolGraph.instance;
  }

  async indexFile(filePath: string, content: string) {
    const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
    const symbols: SymbolInfo[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isClassDeclaration(node) && node.name) {
        symbols.push({ name: node.name.text, type: 'class', line: this.getLine(sourceFile, node), file: filePath, dependencies: [], source: node.getText(sourceFile) });
      } else if (ts.isFunctionDeclaration(node) && node.name) {
        symbols.push({ name: node.name.text, type: 'function', line: this.getLine(sourceFile, node), file: filePath, dependencies: [], source: node.getText(sourceFile) });
      } else if (ts.isInterfaceDeclaration(node) && node.name) {
        symbols.push({ name: node.name.text, type: 'interface', line: this.getLine(sourceFile, node), file: filePath, dependencies: [], source: node.getText(sourceFile) });
      } else if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier.getText(sourceFile).replace(/['"]/g, '');
        symbols.push({ name: moduleSpecifier, type: 'import', line: this.getLine(sourceFile, node), file: filePath, dependencies: [], source: node.getText(sourceFile) });
      } else if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (node.initializer && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))) {
          symbols.push({ name: node.name.text, type: 'function', line: this.getLine(sourceFile, node), file: filePath, dependencies: [], source: node.parent.getText(sourceFile) });
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    this.symbols.set(filePath, symbols);
  }

  private getLine(sourceFile: ts.SourceFile, node: ts.Node): number {
    return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
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
}

export const symbolGraph = SymbolGraph.getInstance();
