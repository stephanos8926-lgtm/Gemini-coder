import * as Parser from 'web-tree-sitter';

export class TreeSitterManager {
  private static instance: TreeSitterManager;
  private parser: any = null;
  private grammars: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): TreeSitterManager {
    if (!TreeSitterManager.instance) {
      TreeSitterManager.instance = new TreeSitterManager();
    }
    return TreeSitterManager.instance;
  }

  public async init() {
    if (this.parser) return;
    await (Parser as any).init();
    this.parser = new (Parser as any)();
  }

  public async loadGrammar(lang: string, wasmPath: string): Promise<any> {
    if (!this.parser) await this.init();
    
    if (!this.grammars.has(lang)) {
      const language = await (Parser as any).Language.load(wasmPath);
      this.grammars.set(lang, language);
    }
    return this.grammars.get(lang)!;
  }

  public getParser(): any {
    if (!this.parser) throw new Error('Parser not initialized');
    return this.parser;
  }
}

export const treeSitterManager = TreeSitterManager.getInstance();
