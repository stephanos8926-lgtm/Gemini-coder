import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

interface RenderProps {
  stdout: string;
  stderr: string;
  success: boolean;
}

export function ToolResultRenderer({ stdout, stderr, success }: RenderProps) {
  // Simple heuristic for linting/TS errors
  const isLintError = stderr.includes('.tsx(') || stderr.includes('.ts(');
  
  if (isLintError) {
    return (
      <div className="text-red-400 text-xs font-mono bg-red-900/10 p-2 rounded border border-red-900/50 my-1 whitespace-pre-wrap">
        {stderr}
      </div>
    );
  }

  return (
    <>
      {stdout && (
        <pre className="text-[#cccccc] whitespace-pre-wrap pl-5 border-l-2 border-[#3c3c3c] py-1 text-sm font-mono leading-relaxed">
          {stdout}
        </pre>
      )}
      
      {stderr && (
        <pre className="text-red-400 whitespace-pre-wrap pl-5 border-l-2 border-red-900/50 py-1 bg-red-900/10 text-sm font-mono leading-relaxed">
          {stderr}
        </pre>
      )}
    </>
  );
}
