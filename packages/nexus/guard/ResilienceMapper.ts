import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

const traverse = typeof traverseModule === 'function' ? traverseModule : (traverseModule as any).default;

export interface RiskProfile {
  riskLevel: 'low' | 'medium' | 'high';
  complexity: number;
  dependencies: string[];
  hasTryCatch: boolean;
  isAsync: boolean;
}

export type DependencyResolver = (filePath: string) => string[];

export class ResilienceMapper {
  private static instance: ResilienceMapper;
  private riskMap: Map<string, RiskProfile> = new Map();
  private dependencyResolver?: DependencyResolver;

  private constructor() {}

  public static getInstance(): ResilienceMapper {
    if (!ResilienceMapper.instance) {
      ResilienceMapper.instance = new ResilienceMapper();
    }
    return ResilienceMapper.instance;
  }

  public setDependencyResolver(resolver: DependencyResolver) {
    this.dependencyResolver = resolver;
  }

  public analyzeFile(filePath: string, code: string) {
    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx', ['decorators', { decoratorsBeforeExport: true }]],
      });

      const dependencies = this.dependencyResolver 
        ? this.dependencyResolver(filePath)
        : [];

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
