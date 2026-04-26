import { parse } from '@babel/parser';
import traverseModule from '@babel/traverse';
import { treeSitterManager } from '../utils/treeSitterManager';

const traverse = typeof traverseModule === 'function' ? traverseModule : (traverseModule as any).default;

export interface AstNodeInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'property' | 'method';
  params?: string;
  returnType?: string;
  isExported?: boolean;
  doc?: string;
  children?: AstNodeInfo[];
}

/**
 * Unified AST Manager for generating code skeletons.
 * Prioritizes Tree-Sitter (WASM) for robustness, with Babel fallback.
 */

export async function generateAstSkeleton(code: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return '';

  // 1. Try Tree-Sitter
  try {
    await treeSitterManager.init();
    
    // Map file extensions to Tree-Sitter language/wasm requirements
    const langMap: Record<string, { lang: string; wasm: string }> = {
      ts: { lang: 'typescript', wasm: '/web-tree-sitter-typescript.wasm' },
      tsx: { lang: 'typescript', wasm: '/web-tree-sitter-typescript.wasm' },
      js: { lang: 'javascript', wasm: '/web-tree-sitter-javascript.wasm' },
      jsx: { lang: 'javascript', wasm: '/web-tree-sitter-javascript.wasm' },
      py: { lang: 'python', wasm: '/web-tree-sitter-python.wasm' },
    };

    const config = langMap[ext];
    if (config) {
      const language = await treeSitterManager.loadGrammar(config.lang, config.wasm);
      const parser = treeSitterManager.getParser();
      parser.setLanguage(language);

      const tree = parser.parse(code);
      // For now, continue using the babel-based formatting logic as it is mature.
      // The tree-sitter node extraction can be added here once fully aligned.
    }
  } catch (error) {
    console.warn(`Tree-Sitter parsing failed for ${filename}, falling back to Babel:`, error);
  }

  // 2. Babel/Regex Fallback (the heavy lifter from existing astChunker)
  return fallbackGenerateSkeleton(code, filename);
}

// -- PURE PORT OF STABLE LOGIC FROM astChunker.ts --

function fallbackGenerateSkeleton(code: string, filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  
  if (ext === 'py') {
    return generatePythonSkeleton(code);
  }

  const nodes = parseWithBabel(code, filename);
  return formatSkeleton(nodes);
}

function parseWithBabel(code: string, filename: string): AstNodeInfo[] {
  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: [
        'typescript',
        'jsx',
        ['decorators', { decoratorsBeforeExport: true }],
      ],
    });

    const nodes: AstNodeInfo[] = [];

    traverse(ast, {
      FunctionDeclaration(path: any) {
        if (path.node.id) {
          nodes.push({
            name: path.node.id.name,
            type: 'function',
            params: formatJsParams(path.node.params),
            returnType: path.node.returnType ? code.slice(path.node.returnType.start, path.node.returnType.end).replace(/^:\s*/, '') : undefined,
            isExported: path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration',
            doc: getJSDoc(path.node)
          });
        }
      },
      ClassDeclaration(path: any) {
        if (path.node.id) {
          const children: AstNodeInfo[] = [];
          path.traverse({
            ClassMethod(mPath: any) {
              if (mPath.parentPath.parentPath === path) { // Only direct methods
                children.push({
                  name: mPath.node.key.name,
                  type: 'method',
                  params: formatJsParams(mPath.node.params),
                  returnType: mPath.node.returnType ? code.slice(mPath.node.returnType.start, mPath.node.returnType.end).replace(/^:\s*/, '') : undefined,
                  doc: getJSDoc(mPath.node)
                });
              }
            },
            ClassProperty(pPath: any) {
              if (pPath.parentPath.parentPath === path) {
                children.push({
                  name: pPath.node.key.name,
                  type: 'property',
                  returnType: pPath.node.typeAnnotation ? code.slice(pPath.node.typeAnnotation.start, pPath.node.typeAnnotation.end).replace(/^:\s*/, '') : undefined,
                  doc: getJSDoc(pPath.node)
                });
              }
            }
          });
          nodes.push({
            name: path.node.id.name,
            type: 'class',
            isExported: path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration',
            doc: getJSDoc(path.node),
            children
          });
        }
      },
      TSInterfaceDeclaration(path: any) {
        if (path.node.id) {
          nodes.push({
            name: path.node.id.name,
            type: 'interface',
            isExported: path.parent.type === 'ExportNamedDeclaration',
            doc: getJSDoc(path.node)
          });
        }
      },
      TSTypeAliasDeclaration(path: any) {
        if (path.node.id) {
          nodes.push({
            name: path.node.id.name,
            type: 'type',
            isExported: path.parent.type === 'ExportNamedDeclaration',
            doc: getJSDoc(path.node)
          });
        }
      }
    });

    return nodes;
  } catch (error) {
    console.warn(`Failed to parse JS/TS AST for ${filename}:`, error);
    return [];
  }
}

function formatSkeleton(nodes: AstNodeInfo[], indent: string = ''): string {
  return nodes.map(node => {
    let line = indent;
    if (node.isExported) line += 'export ';
    
    switch (node.type) {
      case 'function':
        line += `function ${node.name}(${node.params || ''})${node.returnType ? ': ' + node.returnType : ''} { ... }`;
        break;
      case 'class':
        line += `class ${node.name} {\n${formatSkeleton(node.children || [], indent + '  ')}\n${indent}}`;
        break;
      case 'method':
        line += `${node.name}(${node.params || ''})${node.returnType ? ': ' + node.returnType : ''} { ... }`;
        break;
      case 'property':
        line += `${node.name}${node.returnType ? ': ' + node.returnType : ''};`;
        break;
      case 'interface':
        line += `interface ${node.name} { ... }`;
        break;
      case 'type':
        line += `type ${node.name} = ...`;
        break;
      case 'variable':
        line += `const ${node.name} = ...`;
        break;
    }
    
    if (node.doc) {
      return `${indent}/** ${node.doc} */\n${line}`;
    }
    return line;
  }).join('\n');
}

function getJSDoc(node: any): string | undefined {
  if (node.leadingComments) {
    const jsDoc = node.leadingComments.find((c: any) => c.type === 'CommentBlock' && c.value.startsWith('*'));
    if (jsDoc) {
      return jsDoc.value.replace(/^\*+|\*+$/g, '').split('\n').map((l: string) => l.trim().replace(/^\*/, '').trim()).filter(Boolean).join(' ');
    }
  }
  return undefined;
}

function formatJsParams(params: any[]): string {
  return params.map((p: any) => {
    if (p.type === 'Identifier') return p.name;
    if (p.type === 'AssignmentPattern' && p.left.type === 'Identifier') return p.left.name;
    if (p.type === 'RestElement' && p.argument.type === 'Identifier') return '...' + p.argument.name;
    return 'param';
  }).join(', ');
}

function generatePythonSkeleton(code: string): string {
  const skeleton: string[] = [];
  const lines = code.split('\n');
  
  let currentDoc: string[] = [];
  let inDocstring = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('"""') || trimmed.startsWith("'''")) {
      if (trimmed.length > 3 && (trimmed.endsWith('"""') || trimmed.endsWith("'''"))) {
        currentDoc = [trimmed.slice(3, -3).trim()];
      } else {
        inDocstring = !inDocstring;
        if (inDocstring) currentDoc = [];
        continue;
      }
    } else if (inDocstring) {
      currentDoc.push(trimmed);
      continue;
    }

    const classMatch = line.match(/^class\s+(\w+)(\(.*\))?:/);
    if (classMatch) {
      if (currentDoc.length) skeleton.push(`""" ${currentDoc.join(' ')} """`);
      skeleton.push(`class ${classMatch[1]}${classMatch[2] || ''}:`);
      currentDoc = [];
      continue;
    }
    
    const funcMatch = line.match(/^(\s*)def\s+(\w+)\((.*)\)(\s*->\s*[\w\[\], ]+)?\s*:/);
    if (funcMatch) {
      const indent = funcMatch[1];
      const name = funcMatch[2];
      const params = funcMatch[3];
      const ret = funcMatch[4] || '';
      
      if (currentDoc.length) skeleton.push(`${indent}""" ${currentDoc.join(' ')} """`);
      skeleton.push(`${indent}def ${name}(${params})${ret}: ...`);
      currentDoc = [];
    }
  }
  
  return skeleton.join('\n');
}
