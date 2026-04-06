import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';

// Handle default export of traverse in ESM/CJS environments
const traverse = typeof traverseModule === 'function' ? traverseModule : (traverseModule as any).default;

export function generateAstSkeleton(code: string, filename: string): string {
  if (!filename.endsWith('.js') && !filename.endsWith('.jsx') && !filename.endsWith('.ts') && !filename.endsWith('.tsx')) {
    return '';
  }

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        ['decorators', { decoratorsBeforeExport: true }],
      ],
    });

    const skeleton: string[] = [];

    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.node.id) {
          const params = path.node.params.map((p: any) => {
            if (p.type === 'Identifier') return p.name;
            if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') return p.left.name;
            if (p.type === 'RestElement' && p.argument.type === 'Identifier') return '...' + p.argument.name;
            return 'param';
          }).join(', ');
          const isExported = path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration';
          skeleton.push(`${isExported ? 'export ' : ''}function ${path.node.id.name}(${params}) { ... }`);
        }
      },
      ClassDeclaration(path: any) {
        if (path.node.id) {
          const isExported = path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration';
          skeleton.push(`${isExported ? 'export ' : ''}class ${path.node.id.name} { ... }`);
        }
      },
      VariableDeclarator(path: any) {
        if (path.node.id.type === 'Identifier' && (path.node.init?.type === 'ArrowFunctionExpression' || path.node.init?.type === 'FunctionExpression')) {
          const params = path.node.init.params.map((p: any) => {
            if (p.type === 'Identifier') return p.name;
            return 'param';
          }).join(', ');
          const isExported = path.parent.type === 'VariableDeclaration' && path.parent.parent.type === 'ExportNamedDeclaration';
          skeleton.push(`${isExported ? 'export ' : ''}const ${path.node.id.name} = (${params}) => { ... }`);
        }
      },
      TSInterfaceDeclaration(path: any) {
        if (path.node.id) {
          const isExported = path.parent.type === 'ExportNamedDeclaration';
          skeleton.push(`${isExported ? 'export ' : ''}interface ${path.node.id.name} { ... }`);
        }
      },
      TSTypeAliasDeclaration(path: any) {
        if (path.node.id) {
          const isExported = path.parent.type === 'ExportNamedDeclaration';
          skeleton.push(`${isExported ? 'export ' : ''}type ${path.node.id.name} = ...`);
        }
      }
    });

    return skeleton.length > 0 ? skeleton.join('\n') : '';
  } catch (error) {
    console.warn(`Failed to parse AST for ${filename}:`, error);
    return '';
  }
}
