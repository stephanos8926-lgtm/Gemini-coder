import React, { useEffect, useState } from 'react';
import { Server, Activity, Wrench, RefreshCw } from 'lucide-react';
import { auth } from '../firebase';

interface McpServer {
  name: string;
  status: 'connected' | 'disconnected';
  command: string;
  tools: any[];
}

export const McpPanel: React.FC = () => {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = async () => {
    setLoading(true);
    setError(null);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/mcp/servers', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch MCP servers');
      const data = await res.json();
      setServers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
  }, []);

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e] text-[#cccccc] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c] shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-[#d4d4d4]">
          <Server className="w-4 h-4" />
          <span>MCP Servers</span>
        </div>
        <button 
          onClick={fetchServers}
          className="p-1 hover:bg-[#2d2d2d] rounded-md transition-colors text-[#858585] hover:text-[#d4d4d4]"
          title="Refresh Servers"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-xs">
            {error}
          </div>
        )}

        {!loading && servers.length === 0 && !error && (
          <div className="text-center text-[#858585] text-sm py-8">
            No MCP servers configured.
          </div>
        )}

        {servers.map((server) => (
          <div key={server.name} className="bg-[#252526] border border-[#3c3c3c] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#3c3c3c] flex items-center justify-between bg-[#2d2d2d]/50">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-[#d4d4d4]">{server.name}</span>
                <span className="text-xs text-[#858585] font-mono bg-[#1e1e1e] px-2 py-0.5 rounded border border-[#3c3c3c]">
                  {server.command}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className={`w-2 h-2 rounded-full ${server.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span className="text-xs text-[#858585] capitalize">{server.status}</span>
                </div>
                {server.status === 'disconnected' && (
                  <button 
                    onClick={async () => {
                      try {
                        const idToken = await auth.currentUser?.getIdToken();
                        await fetch('/api/mcp/connect', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${idToken}`
                          },
                          body: JSON.stringify({ serverName: server.name })
                        });
                        fetchServers();
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    className="text-xs px-2 py-1 bg-[#007acc] hover:bg-[#0062a3] text-white rounded transition-colors"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#858585] uppercase tracking-wider mb-3">
                <Wrench className="w-3 h-3" />
                <span>Available Tools ({server.tools.length})</span>
              </div>
              
              {server.tools.length > 0 ? (
                <div className="space-y-2">
                  {server.tools.map((tool, idx) => (
                    <div key={idx} className="bg-[#1e1e1e] border border-[#3c3c3c] rounded p-2">
                      <div className="text-sm text-[#3794ff] font-mono mb-1">{tool.name}</div>
                      <div className="text-xs text-[#858585] leading-relaxed">{tool.description}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#858585] italic">
                  {server.status === 'connected' ? 'No tools exposed by this server.' : 'Connect to server to view tools.'}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
