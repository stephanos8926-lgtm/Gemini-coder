import Parser from 'web-tree-sitter';
import * as fs from 'fs/promises';
import path from 'path';
import chokidar from 'chokidar';
import { LogTool } from '../telemetry/LogTool';

const logger = new LogTool('ProjectContextEngine');

export interface CodeSymbol {
  id: string;
  name: string;
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'method';
  file: string;
  line: number;
  column: number;
  context?: string; // Surrounding code snippet
}

/**
 * ProjectContextEngine
 * High-performance indexing and semantic symbol extraction.
 */
export class ProjectContextEngine {
  private parser: Parser | null = null;
  private tsLanguage: Parser.Language | null = null;
  private symbols: Map<string, CodeSymbol[]> = new Map(); // File Path -> Symbols
  private watchers: chokidar.FSWatcher | null = null;

  constructor() {}

  public async initialize() {
    await Parser.init();
    this.parser = new Parser();
    
    // In node environment, we need to load the .wasm files for languages
    // These should be copied to a known location during build
    try {
      const tsWasm = path.join(process.cwd(), 'dist', 'tree-sitter-typescript.wasm');
      this.tsLanguage = await Parser.Language.load(tsWasm);
      this.parser.setLanguage(this.tsLanguage);
      logger.info('ProjectContextEngine initialized with TypeScript support');
    } catch (error) {
      logger.error('Failed to load tree-sitter wasm', error as Error);
    }
  }

  public async indexWorkspace(rootPath: string) {
    logger.info(`Full indexing started for workspace: ${rootPath}`);
    const files = await this.listTSFiles(rootPath);
    
    for (const file of files) {
      await this.indexFile(file);
    }
    
    this.setupWatcher(rootPath);
    logger.info(`Indexing complete. Total files: ${files.length}`);
  }

  private async indexFile(filePath: string) {
    if (!this.parser) return;
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const tree = this.parser.parse(content);
      const symbols = this.extractSymbols(tree.rootNode, filePath);
      this.symbols.set(filePath, symbols);
    } catch (error) {
      logger.error(`Failed to index file: ${filePath}`, error as Error);
    }
  }

  private extractSymbols(node: Parser.SyntaxNode, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    
    // Simplified traversal - looking for specific node types
    const query = `
      (function_declaration name: (identifier) @name) @function
      (class_declaration name: (identifier) @name) @class
      (interface_declaration name: (identifier) @name) @interface
      (method_definition name: (property_identifier) @name) @method
      (variable_declarator name: (identifier) @name) @variable
    `;
    
    if (this.tsLanguage) {
        const parserQuery = this.tsLanguage.query(query);
        const captures = parserQuery.captures(node);
        
        for (const capture of captures) {
          const { name, node: capturedNode } = capture;
          symbols.push({
            id: `${filePath}:${capturedNode.startPosition.row}:${capturedNode.startPosition.column}`,
            name: capturedNode.text,
            type: name as any,
            file: filePath,
            line: capturedNode.startPosition.row,
            column: capturedNode.startPosition.column,
            context: capturedNode.parent?.text.slice(0, 200) // snippet
          });
        }
    }

    return symbols;
  }

  private async listTSFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
        results.push(...(await this.listTSFiles(fullPath)));
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        results.push(fullPath);
      }
    }
    
    return results;
  }

  private setupWatcher(rootPath: string) {
    this.watchers = chokidar.watch(rootPath, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true
    });

    this.watchers
      .on('add', path => this.indexFile(path))
      .on('change', path => this.indexFile(path))
      .on('unlink', path => this.symbols.delete(path));
  }

  public querySymbols(query: string): CodeSymbol[] {
    const results: CodeSymbol[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const fileSymbols of this.symbols.values()) {
      for (const symbol of fileSymbols) {
        if (symbol.name.toLowerCase().includes(lowerQuery)) {
          results.push(symbol);
        }
      }
    }
    
    return results.slice(0, 50); // limit for now
  }
}

export const contextEngine = new ProjectContextEngine();
