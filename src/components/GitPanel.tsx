import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Loader2, X, RefreshCw, ArrowUp, ArrowDown, Plus, Check } from 'lucide-react';
import { auth } from '../firebase';

interface GitPanelProps {
  onClose: () => void;
  workspace?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ onClose, workspace }) => {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<string>('');
  const [currentBranch, setCurrentBranch] = useState<string>('unknown');
  const [remoteUrl, setRemoteUrl] = useState<string>('');
  const [isConfiguringRemote, setIsConfiguringRemote] = useState(false);

  const fetchStatus = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command: 'status', workspace }),
      });
      const result = await response.json();
      if (result.success) {
        setStatus(result.stdout);
        setCurrentBranch(result.branch || 'main');
      }

      // Fetch remote URL
      const remoteResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command: 'remote-get', workspace }),
      });
      const remoteResult = await remoteResponse.json();
      if (remoteResult.success) {
        setRemoteUrl(remoteResult.stdout);
      }
    } catch (error) {
      console.error('Failed to fetch git status', error);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

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
      
      if (result.success) {
        setOutput(`Success:\n${result.stdout || 'Command completed successfully'}`);
        if (command === 'commit') setMessage('');
        fetchStatus();
      } else {
        setOutput(`Error:\n${result.error}`);
      }
    } catch (error) {
      setOutput(`Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#252526] border border-[#454545] rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
        <div className="flex justify-between items-center p-6 border-b border-[#3c3c3c]">
          <div className="flex flex-col">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#007acc]" />
              Source Control
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[#858585]">Current Branch:</span>
              <span className="text-xs font-mono text-[#007acc] bg-[#007acc]/10 px-2 py-0.5 rounded">{currentBranch}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchStatus} 
              className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-colors"
              title="Refresh Status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 text-[#858585] hover:text-white hover:bg-[#3c3c3c] rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Status Section */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">Changes</h3>
            {status ? (
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md overflow-hidden">
                {status.split('\n').filter(line => line.trim()).map((line, i) => {
                  const type = line.slice(0, 2);
                  const file = line.slice(3);
                  let color = 'text-[#cccccc]';
                  if (type.includes('M')) color = 'text-blue-400';
                  if (type.includes('A') || type.includes('?')) color = 'text-green-400';
                  if (type.includes('D')) color = 'text-red-400';
                  
                  return (
                    <div key={i} className="flex items-center justify-between px-3 py-2 border-b border-[#3c3c3c] last:border-0 hover:bg-[#2d2d2d]">
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-bold w-4 ${color}`}>{type}</span>
                        <span className="text-sm font-mono truncate max-w-[300px]">{file}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-[#858585] italic py-4 text-center bg-[#1e1e1e]/50 rounded-md border border-dashed border-[#3c3c3c]">
                No changes detected
              </div>
            )}
          </div>

          {/* Commit Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">Commit</h3>
            <textarea 
              value={message} 
              onChange={e => setMessage(e.target.value)} 
              placeholder="Message (Enter to commit, Cmd+Enter to commit & push)"
              className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-md p-3 text-sm text-white focus:outline-none focus:border-[#007acc] resize-none h-24"
            />
            <div className="flex gap-2">
              <button 
                onClick={() => runGitCommand('add')} 
                disabled={isLoading}
                className="flex-1 bg-[#3c3c3c] hover:bg-[#4c4c4c] text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" /> Stage All
              </button>
              <button 
                onClick={() => runGitCommand('commit')} 
                disabled={isLoading || !message}
                className="flex-1 bg-[#007acc] hover:bg-[#0062a3] text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <Check className="w-4 h-4" /> Commit
              </button>
            </div>
          </div>

          {/* Remote Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">Sync</h3>
              <button 
                onClick={() => setIsConfiguringRemote(!isConfiguringRemote)}
                className="text-[10px] text-[#007acc] hover:underline"
              >
                {remoteUrl ? 'Change Remote' : 'Configure Remote'}
              </button>
            </div>

            {isConfiguringRemote && (
              <div className="flex gap-2">
                <input 
                  value={remoteUrl}
                  onChange={e => setRemoteUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="flex-1 bg-[#1e1e1e] border border-[#3c3c3c] rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#007acc]"
                />
                <button 
                  onClick={async () => {
                    await runGitCommand('remote-set');
                    setIsConfiguringRemote(false);
                  }}
                  className="bg-[#007acc] text-white px-3 py-1.5 rounded-md text-xs font-medium"
                >
                  Save
                </button>
              </div>
            )}

            {remoteUrl && !isConfiguringRemote && (
              <div className="text-[10px] text-[#858585] font-mono truncate bg-[#1e1e1e] p-2 rounded border border-[#3c3c3c]">
                {remoteUrl}
              </div>
            )}

            <div className="flex gap-2">
              <button 
                onClick={() => runGitCommand('pull')} 
                disabled={isLoading}
                className="flex-1 border border-[#3c3c3c] hover:bg-[#3c3c3c] text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <ArrowDown className="w-4 h-4" /> Pull
              </button>
              <button 
                onClick={() => runGitCommand('push')} 
                disabled={isLoading}
                className="flex-1 border border-[#3c3c3c] hover:bg-[#3c3c3c] text-white py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                <ArrowUp className="w-4 h-4" /> Push
              </button>
            </div>
          </div>

          {/* Output Log */}
          {output && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">Output</h3>
              <pre className="text-[10px] font-mono bg-black/50 text-green-400 p-3 rounded-md overflow-auto max-h-32 border border-[#3c3c3c]">
                {output}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
