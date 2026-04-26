export type ExecutionMode = 'preview' | 'execute' | 'static';

export function detectLanguage(filename: string): string {
  if (!filename) return 'text';
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'react',
    'ts': 'typescript',
    'tsx': 'react',
    'py': 'python',
    'sh': 'bash',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'java': 'java',
    'php': 'php',
    'html': 'html',
    'css': 'css',
    'md': 'markdown',
    'json': 'json'
  };
  return langMap[ext] || 'text';
}

export function getExecutionMode(language: string): ExecutionMode {
  const modes: Record<string, ExecutionMode> = {
    'html': 'preview',
    'css': 'preview',
    'javascript': 'execute', // Node
    'react': 'preview',
    'python': 'execute',
    'bash': 'execute',
    'go': 'static',
    'rust': 'static',
    'c': 'static',
    'cpp': 'static',
    'java': 'static',
    'php': 'static'
  };
  return modes[language] || 'static';
}

export const staticLanguagePrompts: Record<string, string> = {
  'go': `You are developing a Go application. This environment cannot compile or run Go code.
Focus on writing clean, idiomatic Go and provide compilation instructions.`,
  'rust': `You are developing a Rust application. This environment cannot compile or run Rust code.
Focus on safe, idiomatic Rust and proper Cargo.toml configuration.`,
  'cpp': `You are developing a C++ application. This environment cannot compile or run C++ code.
Focus on modern C++ (C++17/20) and proper build instructions.`
};
