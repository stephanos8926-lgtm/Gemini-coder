import React, { useState } from 'react';
import { GitBranch, GitCommit, Loader2, X } from 'lucide-react';
import { auth } from '../firebase';

interface GitPanelProps {
  onClose: () => void;
  workspace?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ onClose, workspace }) => {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const runGitCommand = async (command: string) => {
    setIsLoading(true);
    setOutput(`Running: git ${command}...`);
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setOutput('Error: User not authenticated');
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command, message, workspace }),
      });
      const result = await response.json();
      setOutput(result.success ? `Success:\n${result.stdout}` : `Error:\n${result.error}`);
    } catch (error) {
      setOutput(`Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#252526] border border-[#454545] rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#007acc]" />
            Git Operations
          </h2>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="space-y-4">
          <input 
            value={message} 
            onChange={e => setMessage(e.target.value)} 
            placeholder="Commit message (for commit)..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2 text-sm text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            {['init', 'add', 'commit', 'pull'].map(cmd => (
              <button 
                key={cmd} 
                onClick={() => runGitCommand(cmd)} 
                disabled={isLoading}
                className="bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white p-2 rounded text-sm flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
                Git {cmd}
              </button>
            ))}
          </div>
          <pre className="text-xs bg-black text-green-400 p-2 rounded h-40 overflow-auto">{output}</pre>
        </div>
      </div>
    </div>
  );
};
