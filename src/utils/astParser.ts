import { treeSitterManager } from './treeSitterManager';
import Parser from 'web-tree-sitter';

export interface AstNodeInfo {
  name: string;
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'property' | 'method';
  params?: string;
  returnType?: string;
  isExported?: boolean;
  doc?: string;
  children?: AstNodeInfo[];
}

export async function generateAstSkeleton(code: string, filename: string): Promise<string> {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return '';

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
    if (!config) return '';

    const language = await treeSitterManager.loadGrammar(config.lang, config.wasm);
    const parser = treeSitterManager.getParser();
    parser.setLanguage(language);

    const tree = parser.parse(code);
    const nodes = extractAstNodes(tree.rootNode, code, config.lang);
    
    return formatSkeleton(nodes);
  } catch (error) {
    console.error(`Failed to parse ${filename} with Tree-Sitter:`, error);
    return '';
  }
}

// Using any for SyntaxNode to bypass CORTEX_STEP_TYPE_LINT issues with web-tree-sitter namespace exports
function extractAstNodes(node: any, code: string, lang: string): AstNodeInfo[] {
  const nodes: AstNodeInfo[] = [];

  const visit = (curr: any) => {
    let info: AstNodeInfo | null = null;

    // TypeScript/JavaScript Mapping
    if (lang === 'typescript' || lang === 'javascript') {
      if (curr.type === 'function_declaration' || curr.type === 'method_definition') {
        const nameNode = curr.childForFieldName('name');
        if (nameNode) {
          info = {
            name: code.substring(nameNode.startIndex, nameNode.endIndex),
            type: curr.type === 'method_definition' ? 'method' : 'function',
            isExported: curr.parent?.type === 'export_statement'
          };
        }
      } else if (curr.type === 'class_declaration') {
        const nameNode = curr.childForFieldName('name');
        if (nameNode) {
          info = { name: code.substring(nameNode.startIndex, nameNode.endIndex), type: 'class', children: [] };
        }
      }
    }

    // Python Mapping
    if (lang === 'python') {
      if (curr.type === 'function_definition') {
        const nameNode = curr.childForFieldName('name');
        if (nameNode) {
          info = { name: code.substring(nameNode.startIndex, nameNode.endIndex), type: 'function' };
        }
      } else if (curr.type === 'class_definition') {
        const nameNode = curr.childForFieldName('name');
        if (nameNode) {
          info = { name: code.substring(nameNode.startIndex, nameNode.endIndex), type: 'class', children: [] };
        }
      }
    }

    if (info) {
      nodes.push(info);
      // For classes, extract members
      if (info.type === 'class') {
        for (let i = 0; i < curr.childCount; i++) {
          const child = curr.child(i);
          if (child) {
            const members = extractAstNodes(child, code, lang);
            info.children?.push(...members);
          }
        }
        return; // Skip walking children again via recursion
      }
    }

    for (let i = 0; i < curr.childCount; i++) {
      const child = curr.child(i);
      if (child) visit(child);
    }
  };

  visit(node);
  return nodes;
}

function formatSkeleton(nodes: AstNodeInfo[], indent: string = ''): string {
  let result = '';
  for (const node of nodes) {
    const exportPrefix = node.isExported ? 'export ' : '';
    result += `${indent}${exportPrefix}${node.type} ${node.name}${node.type === 'function' || node.type === 'method' ? '()' : ''}\n`;
    if (node.children && node.children.length > 0) {
      result += formatSkeleton(node.children, indent + '  ');
    }
  }
  return result;
}
