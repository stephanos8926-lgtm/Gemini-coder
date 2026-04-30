import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import util from 'util';

const execAsync = util.promisify(exec);

async function indexPythonFile(filePath: string): Promise<string> {
  const script = `
import ast
import json

def get_ast_summary(source):
    tree = ast.parse(source)
    summary = []
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            summary.append(f"def {node.name}({','.join(arg.arg for arg in node.args.args)})")
        elif isinstance(node, ast.ClassDef):
            methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
            summary.append(f"class {node.name}: {','.join(methods)}")
    return json.dumps(summary)

with open('${filePath}', 'r') as f:
    print(get_ast_summary(f.read()))
`;
  const { stdout } = await execAsync(`python3 -c "${script.replace(/"/g, '\\"')}"`);
  return stdout.trim();
}
