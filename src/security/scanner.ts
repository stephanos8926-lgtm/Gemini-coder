// ForgeGuard Scanner v4.0.0 - Advanced AST, Symbol, Diagnostics & Performance Analysis
import * as ts from 'typescript';

export type Severity = 'low' | 'medium' | 'high' | 'critical' | 'info';
export interface ScanIssue {
  file: string;
  message: string;
  severity: Severity;
  line: number;
  start: number;
  end: number;
  snippet: string;
  type?: 'security' | 'complexity' | 'performance' | 'diagnostic' | 'dead_code' | 'logic' | 'smell' | 'refactor';
}

export function scanFile(filePath: string, isBackend: boolean = true): ScanIssue[] {
  // Create a full TS program to access the TypeChecker and Symbol Graph
  const program = ts.createProgram([filePath], {
    target: ts.ScriptTarget.Latest,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    noUnusedLocals: true,
    noUnusedParameters: true,
    strict: true,
  });
  const checker = program.getTypeChecker();
  const sourceFile = program.getSourceFile(filePath);
  
  if (!sourceFile) return [];

  const issues: ScanIssue[] = [];

  function report(node: ts.Node, message: string, severity: Severity, type: ScanIssue['type'] = 'security') {
    const { line } = sourceFile!.getLineAndCharacterOfPosition(node.getStart());
    issues.push({ 
      file: filePath, 
      message, 
      severity, 
      line: line + 1,
      start: node.getStart(),
      end: node.getEnd(),
      snippet: node.getText(sourceFile),
      type
    });
  }

  // 1. Collect TypeScript Diagnostics (Syntax, Type Errors, Dead Code)
  const diagnostics = ts.getPreEmitDiagnostics(program);
  for (const diag of diagnostics) {
    if (diag.file && diag.file.fileName === filePath && diag.start !== undefined) {
      const { line } = diag.file.getLineAndCharacterOfPosition(diag.start);
      const message = ts.flattenDiagnosticMessageText(diag.messageText, '\n');
      let severity: Severity = 'medium';
      let type: ScanIssue['type'] = 'diagnostic';
      
      if (diag.category === ts.DiagnosticCategory.Error) severity = 'high';
      if (message.includes('declared but its value is never read')) {
        severity = 'low';
        type = 'dead_code';
      }

      issues.push({
        file: filePath,
        message: `TS${diag.code}: ${message}`,
        severity,
        line: line + 1,
        start: diag.start,
        end: diag.start + (diag.length || 0),
        snippet: diag.file.text.substring(diag.start, diag.start + (diag.length || 0)),
        type
      });
    }
  }

  // 2. AST Traversal for Security, Complexity, and Performance
  function visit(node: ts.Node) {
    // --- Security Checks ---
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'eval') {
      report(node, 'eval() RCE risk', 'critical');
    }
    
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
        const leftText = node.left.getText(sourceFile).toLowerCase();
        if (leftText.includes('sql') || leftText.includes('query')) {
            report(node, 'SQL injection via string concat', 'high');
        }
    }
    
    if (ts.isVariableDeclaration(node) && node.initializer && ts.isStringLiteral(node.initializer)) {
        const name = node.name.getText(sourceFile);
        if (name.toLowerCase().includes('secret') || name.toLowerCase().includes('key')) {
            report(node, 'Hardcoded secret', 'critical');
        }
    }
    
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'JSON.parse') {
        report(node, 'Unsafe JSON.parse()', 'medium');
    }
    
    if (ts.isJsxAttribute(node) && node.name.getText(sourceFile) === 'dangerouslySetInnerHTML') {
        report(node, 'React dangerouslySetInnerHTML', 'high');
    }
    
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'exec') {
        const arg = node.arguments[0];
        if (arg) {
            const type = checker.getTypeAtLocation(arg);
            if (!type.isStringLiteral()) {
                report(node, 'Command Injection via dynamic exec', 'critical');
            }
        }
    }

    // --- Performance Bottlenecks ---
    // Detect synchronous fs calls (e.g., readFileSync) inside functions (especially loops)
    if (ts.isCallExpression(node)) {
      const exprText = node.expression.getText(sourceFile);
      if (exprText.includes('Sync') && (exprText.startsWith('fs.') || exprText.includes('readFileSync'))) {
        // Check if we are inside a function or loop (not top-level)
        let parent = node.parent;
        let isTopLevel = true;
        while (parent) {
          if (ts.isFunctionDeclaration(parent) || ts.isArrowFunction(parent) || ts.isMethodDeclaration(parent) || ts.isIterationStatement(parent, false)) {
            isTopLevel = false;
            break;
          }
          parent = parent.parent;
        }
        if (!isTopLevel && isBackend) {
          report(node, 'Synchronous I/O detected inside a function/loop. Use async equivalents to avoid event loop blocking.', 'medium', 'performance');
        }
      }
    }

    // --- Code Complexity ---
    // Calculate Cyclomatic Complexity for functions
    if (ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isMethodDeclaration(node)) {
      let complexity = 1;
      let depth = 0;
      let maxDepth = 0;

      function countComplexity(n: ts.Node) {
        if (ts.isIfStatement(n) || ts.isIterationStatement(n, false) || ts.isCaseClause(n) || ts.isConditionalExpression(n)) {
          complexity++;
        }
        if (ts.isBinaryExpression(n) && (n.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken || n.operatorToken.kind === ts.SyntaxKind.BarBarToken)) {
          complexity++;
        }
        
        // Depth tracking
        if (ts.isBlock(n)) {
          depth++;
          if (depth > maxDepth) maxDepth = depth;
          ts.forEachChild(n, countComplexity);
          depth--;
        } else {
          ts.forEachChild(n, countComplexity);
        }
      }
      ts.forEachChild(node, countComplexity);
      
      if (complexity > 15) {
        report(node, `High Cyclomatic Complexity (${complexity}). Refactor to simplify logic.`, 'low', 'complexity');
      }
      if (maxDepth > 4) {
        report(node, `Deeply nested code detected (depth: ${maxDepth}). Consider extracting sub-functions.`, 'low', 'refactor');
      }
    }

    // --- Logic Errors & Bugs ---
    // Detect potential infinite loops
    if (ts.isWhileStatement(node) || ts.isForStatement(node)) {
      const condition = node.kind === ts.SyntaxKind.WhileStatement 
        ? (node as ts.WhileStatement).expression 
        : (node as ts.ForStatement).condition;
      
      if (condition && condition.kind === ts.SyntaxKind.TrueKeyword) {
        // Check if there's a break/return inside
        let hasExit = false;
        function checkExit(n: ts.Node) {
          if (ts.isBreakStatement(n) || ts.isReturnStatement(n) || ts.isThrowStatement(n)) {
            hasExit = true;
          }
          if (!hasExit) ts.forEachChild(n, checkExit);
        }
        ts.forEachChild(node.statement, checkExit);
        if (!hasExit) {
          report(node, 'Potential infinite loop detected. Loop has constant true condition and no visible break/return.', 'high', 'logic');
        }
      }
    }

    // Detect redundant boolean comparisons
    if (ts.isBinaryExpression(node)) {
      const left = node.left.getText(sourceFile);
      const right = node.right.getText(sourceFile);
      if ((left === 'true' || left === 'false' || right === 'true' || right === 'false') && 
          (node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || node.operatorToken.kind === ts.SyntaxKind.EqualsEqualsToken)) {
        report(node, 'Redundant boolean comparison. Use the expression directly or its negation.', 'info', 'smell');
      }
    }

    // --- Refactoring Opportunities ---
    // Suggest 3rd party SDKs for common tasks
    if (ts.isCallExpression(node)) {
      const text = node.getText(sourceFile);
      if (text.includes('fetch') && !text.includes('axios') && !text.includes('sdk')) {
        report(node, 'Consider using a specialized SDK or Axios for more robust network requests and automatic retries.', 'info', 'refactor');
      }
      if (text.includes('JSON.stringify') && text.includes('fs.writeFile')) {
        report(node, 'Consider using a database SDK (like Firebase or MongoDB) for structured data persistence instead of raw JSON files.', 'info', 'refactor');
      }
    }

    // Detect "Magic Numbers"
    if (ts.isNumericLiteral(node) && !ts.isVariableDeclaration(node.parent) && !ts.isPropertyAssignment(node.parent)) {
      const val = parseFloat(node.text);
      if (val !== 0 && val !== 1 && val !== -1 && val !== 100) {
        report(node, `Magic number detected: ${val}. Consider defining a named constant for clarity.`, 'low', 'smell');
      }
    }
    
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}

// Keep scanSource for backwards compatibility if needed, but it won't have TypeChecker
export function scanSource(source: string, fileName = 'unknown.ts'): ScanIssue[] {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const issues: ScanIssue[] = [];

  function report(node: ts.Node, message: string, severity: Severity) {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart());
    issues.push({ 
      file: fileName, 
      message, 
      severity, 
      line: line + 1,
      start: node.getStart(),
      end: node.getEnd(),
      snippet: node.getText(sourceFile)
    });
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && node.expression.getText(sourceFile) === 'eval') {
      report(node, 'eval() RCE risk', 'critical');
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return issues;
}
