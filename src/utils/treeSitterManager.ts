import * as TreeSitter from 'web-tree-sitter';

export class TreeSitterManager {
  private static instance: TreeSitterManager;
  private parser: TreeSitter.Parser | null = null;
  private grammars: Map<string, TreeSitter.Language> = new Map();

  private constructor() {}

  public static getInstance(): TreeSitterManager {
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  public async init() {
    if (this.parser) return;
    await TreeSitter.Parser.init();
    this.parser = new TreeSitter.Parser();
  }

  public async loadGrammar(lang: string, wasmPath: string): Promise<TreeSitter.Language> {
    if (!this.parser) await this.init();
    
    if (!this.grammars.has(lang)) {
      const language = await TreeSitter.Language.load(wasmPath);
      this.grammars.set(lang, language);
    }
    return this.grammars.get(lang)!;
  }

  public getParser(): TreeSitter.Parser {
    if (!this.parser) throw new Error('Parser not initialized');
    return this.parser;
  }
}

export const treeSitterManager = TreeSitterManager.getInstance();
