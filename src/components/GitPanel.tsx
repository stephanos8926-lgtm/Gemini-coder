import React, { useState, useEffect } from 'react';
import { GitBranch, GitCommit, Loader2, X, RefreshCw, ArrowUp, ArrowDown, Plus, Check, Shield, Sparkles } from 'lucide-react';
import { auth } from '../firebase';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { callGemini } from '../lib/gemini';

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
  const [auditIssues, setAuditIssues] = useState<any[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const fetchStatus = async () => {
    try {
      setAuditIssues([]); // Clear issues on refresh
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

      // Fetch history
      const historyResponse = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command: 'log', workspace }),
      });
      const historyResult = await historyResponse.json();
      if (historyResult.success) {
        setHistory(historyResult.stdout.split('\n').filter(Boolean));
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
    const cmdDisplay = command === 'init' ? 'git init' : `git ${command}`;
    setOutput(`Running: ${cmdDisplay}...`);
    
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
        if (command === 'commit') {
          setMessage('');
          setAuditIssues([]);
        }
        if (command === 'init') {
          fetchStatus();
        }
        fetchStatus();
      } else {
        setOutput(`Error:\n${result.error}`);
        if (result.issues) {
          setAuditIssues(result.issues);
        }
      }
    } catch (error) {
      setOutput(`Error: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const { RW_apiKey } = useAuthStore();
  const { RW_activeModel } = useChatStore();

  const handleAiSummarize = async () => {
    if (!RW_apiKey) {
      setOutput('Error: Gemini API Key required for summarization. Add it in Settings.');
      return;
    }

    setIsLoading(true);
    setOutput('Analyzing staged changes with AI...');
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) return;

      const response = await fetch('/api/git', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command: 'diff', workspace }),
      });
      const result = await response.json();
      
      if (!result.success || !result.stdout) {
        setOutput('No staged changes found to summarize. Stage your files first.');
        return;
      }

      const summary = await callGemini(
        [{ role: 'user', content: `Summarize the following git diff into a professional, concise commit message (one line, max 72 chars):\n\n${result.stdout}` }],
        RW_activeModel,
        RW_apiKey,
        "You are an expert software engineer specialized in writing perfect git commit messages."
      );

      setMessage(summary.replace(/^"|"$/g, '').trim());
      setOutput(`AI Summary Generated:\n${summary}`);
    } catch (error) {
      setOutput(`Summarization Failed: ${String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isUninitialized = currentBranch === 'unknown' || !status && output.includes('not a git repository');

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
              <span className="text-xs text-[#858585]">Status:</span>
              <span className={`text-xs font-mono ${isUninitialized ? 'text-amber-400 bg-amber-400/10' : 'text-[#007acc] bg-[#007acc]/10'} px-2 py-0.5 rounded`}>
                {isUninitialized ? 'Uninitialized' : `Branch: ${currentBranch}`}
              </span>
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
          {/* Uninitialized State Banner */}
          {isUninitialized && (
             <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex flex-col items-center gap-3 text-center">
                <div className="p-3 bg-amber-500/20 rounded-full">
                  <GitBranch className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Initialize Repository</h4>
                  <p className="text-xs text-[#858585] mt-1">This workspace is not yet a Git repository. Initialize it to start tracking changes.</p>
                </div>
                <button 
                  onClick={() => runGitCommand('init')}
                  disabled={isLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black py-2 rounded-md text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Initializing...' : 'Git Init'}
                </button>
             </div>
          )}

          {/* Status Section */}
          {!isUninitialized && (
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
          )}

          {/* Commit Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">Commit</h3>
              <button 
                onClick={handleAiSummarize}
                disabled={isLoading}
                className="text-[10px] text-[#007acc] hover:text-white flex items-center gap-1 transition-colors disabled:opacity-50"
                title="AI Summarize Changes"
              >
                <Sparkles className="w-3 h-3" />
                AI Summarize
              </button>
            </div>
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

          {/* Audit Issues Section */}
          {auditIssues.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-3 h-3" /> AI Audit Blockers
              </h3>
              <div className="bg-red-500/10 border border-red-500/30 rounded-md overflow-hidden">
                {auditIssues.map((issue, i) => (
                  <div key={i} className="p-3 border-b border-red-500/20 last:border-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-red-400">{issue.type?.toUpperCase() || 'ISSUE'}</span>
                      <span className="text-[10px] text-[#858585] font-mono">{issue.file}:{issue.line}</span>
                    </div>
                    <p className="text-xs text-[#cccccc]">{issue.message}</p>
                    <pre className="text-[10px] bg-black/30 p-1.5 rounded text-[#858585] overflow-x-auto">
                      {issue.snippet}
                    </pre>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-[#858585] italic">Fix these issues to proceed with the commit.</p>
            </div>
          )}

          {/* Output Log */}
          {history.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-[#858585] uppercase tracking-wider">History</h3>
              <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-md overflow-hidden flex flex-col font-mono">
                {history.map((log, i) => {
                  const [hash, ...msgParts] = log.split(' ');
                  const msg = msgParts.join(' ');
                  return (
                    <div key={hash} className="flex items-center gap-3 px-3 py-2 border-b border-[#3c3c3c] last:border-0 hover:bg-[#2d2d2d] group">
                      <div className="flex flex-col items-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#007acc]" />
                        {i < history.length - 1 && <div className="w-0.5 h-full bg-[#3c3c3c] my-0.5" />}
                      </div>
                      <span className="text-[10px] text-[#007acc] font-bold w-12">{hash}</span>
                      <span className="text-[11px] text-[#cccccc] truncate">{msg}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

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
