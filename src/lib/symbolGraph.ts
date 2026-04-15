import * as ts from 'typescript';
import path from 'path';

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

export class SymbolGraph {
  private static instance: SymbolGraph;
  private graph: Map<string, FileSymbols> = new Map();

  private constructor() {}

  public static getInstance(): SymbolGraph {
    if (!SymbolGraph.instance) {
      SymbolGraph.instance = new SymbolGraph();
    }
    return SymbolGraph.instance;
  }

  public updateFile(filePath: string, code: string) {
    const sourceFile = ts.createSourceFile(filePath, code, ts.ScriptTarget.Latest, true);
    const exports: SymbolInfo[] = [];
    const imports: { source: string; symbols: string[] }[] = [];

    const visit = (node: ts.Node) => {
      // Handle Imports
      if (ts.isImportDeclaration(node)) {
        const source = (node.moduleSpecifier as ts.StringLiteral).text;
        const symbols: string[] = [];
        if (node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings)) {
          node.importClause.namedBindings.elements.forEach(el => symbols.push(el.name.text));
        }
        imports.push({ source, symbols });
      }

      // Handle Exports (Functions, Classes, etc.)
      if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) {
        const name = node.name?.text;
        if (name) {
          const isExported = !!(ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export);
          const type = ts.isFunctionDeclaration(node) ? 'function' : 
                       ts.isClassDeclaration(node) ? 'class' :
                       ts.isInterfaceDeclaration(node) ? 'interface' : 'type';
          
          const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
          
          exports.push({
            name,
            type,
            line: line + 1,
            isExported
          });
        }
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);
    this.graph.set(filePath, { path: filePath, exports, imports });
  }

  public getDependencies(filePath: string): string[] {
    const file = this.graph.get(filePath);
    return file?.imports.map(i => i.source) || [];
  }

  public getDependents(filePath: string): string[] {
    const dependents: string[] = [];
    this.graph.forEach((data, pathKey) => {
      if (data.imports.some(i => i.source.includes(path.basename(filePath, path.extname(filePath))))) {
        dependents.push(pathKey);
      }
    });
    return dependents;
  }

  public getGraphSummary(): string {
    let summary = "Symbol Graph Summary:\n";
    this.graph.forEach((data, filePath) => {
      summary += `- ${filePath}\n`;
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
