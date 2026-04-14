import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { SymbolGraph } from '../lib/symbolGraph';

const traverse = typeof traverseModule === 'function' ? traverseModule : (traverseModule as any).default;

export interface RiskProfile {
  riskLevel: 'low' | 'medium' | 'high';
  complexity: number;
  dependencies: string[];
  hasTryCatch: boolean;
  isAsync: boolean;
}

export class ResilienceMapper {
  private static instance: ResilienceMapper;
  // Map of functionName -> RiskProfile
  private riskMap: Map<string, RiskProfile> = new Map();

  private constructor() {}

  public static getInstance(): ResilienceMapper {
    if (!ResilienceMapper.instance) {
      ResilienceMapper.instance = new ResilienceMapper();
    }
    return ResilienceMapper.instance;
  }

  /**
   * Scans a file, parses its AST, and builds a risk profile for its functions.
   * Run this at startup or lazily on first module load.
   */
  public analyzeFile(filePath: string, code: string) {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', ['decorators', { decoratorsBeforeExport: true }]],
      });

      const symbolGraph = SymbolGraph.getInstance();
      const dependencies = symbolGraph.getDependencies(filePath);
      const self = this;

      traverse(ast, {
        enter(path: any) {
          if (
            path.isFunctionDeclaration() ||
            path.isFunctionExpression() ||
            path.isArrowFunctionExpression() ||
            path.isClassMethod()
          ) {
            let funcName = 'anonymous';
            if (path.node.id && path.node.id.name) {
              funcName = path.node.id.name;
            } else if (path.parent.type === 'VariableDeclarator' && path.parent.id && path.parent.id.name) {
              funcName = path.parent.id.name;
            } else if (path.node.key && path.node.key.name) {
              funcName = path.node.key.name;
            }

            let complexity = 1;
            let hasTryCatch = false;
            const isAsync = path.node.async === true;

            // Traverse inside the function body to calculate complexity
            path.traverse({
              IfStatement() { complexity++; },
              ForStatement() { complexity++; },
              ForInStatement() { complexity++; },
              ForOfStatement() { complexity++; },
              WhileStatement() { complexity++; },
              DoWhileStatement() { complexity++; },
              SwitchCase(cPath: any) { if (cPath.node.test) complexity++; },
              CatchClause() { complexity++; hasTryCatch = true; },
              LogicalExpression() { complexity++; },
              ConditionalExpression() { complexity++; },
              TryStatement() { hasTryCatch = true; }
            });

            self.riskMap.set(funcName, {
              riskLevel: complexity > 10 ? 'high' : complexity > 5 ? 'medium' : 'low',
              complexity,
              dependencies,
              hasTryCatch,
              isAsync
            });
          }
        }
      });
    } catch (error) {
      console.warn(`[ResilienceMapper] Failed to parse AST for ${filePath}:`, error);
    }
  }

  public getProfile(functionName: string): RiskProfile | undefined {
    return this.riskMap.get(functionName);
  }
}

export const resilienceMapper = ResilienceMapper.getInstance();
