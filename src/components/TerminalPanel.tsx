import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, X, Loader2 } from 'lucide-react';
import { auth } from '../firebase';

interface TerminalPanelProps {
  onClose: () => void;
  workspace?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose, workspace }) => {
  const [history, setHistory] = useState<{ command: string; output: string; success: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const runCommand = async (command: string) => {
    if (!command.trim()) return;
    setIsLoading(true);
    
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/tools/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, command, workspace }),
      });
      const result = await response.json();
      
      let output = result.stdout || '';
      if (!result.success) {
        output = result.stderr || result.stdout || result.error || 'Unknown error';
      }

      setHistory(prev => [...prev, { 
        command, 
        output, 
        success: result.success 
      }]);
    } catch (error) {
      setHistory(prev => [...prev, { command, output: String(error), success: false }]);
    } finally {
      setIsLoading(false);
      setInput('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-3xl h-[600px] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-[#3c3c3c]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-[#007acc]" />
            Terminal
          </h2>
          <button onClick={onClose} className="text-[#858585] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4 font-mono text-xs space-y-2">
          {history.map((item, i) => (
            <div key={`${item.command}-${i}`}>
              <div className="text-blue-400">$ {item.command}</div>
              <div className={`whitespace-pre-wrap ${item.success ? 'text-gray-300' : 'text-red-400'}`}>
                {item.output}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        
        <div className="p-4 border-t border-[#3c3c3c]">
          <div className="flex gap-2">
            <span className="text-blue-400">$</span>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runCommand(input)}
              className="flex-1 bg-transparent text-white outline-none font-mono text-xs"
              placeholder="Enter command..."
              disabled={isLoading}
            />
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-500" />}
          </div>
        </div>
      </div>
    </div>
  );
};
