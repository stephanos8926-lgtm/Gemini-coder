import React, { useState, useEffect } from 'react';
import { Loader2, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';

export const AdminPage = () => {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTools();
  }, []);

  const fetchTools = async () => {
    try {
      const response = await fetch('/api/admin/mcp/tools');
      const data = await response.json();
      setTools(data);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch MCP tools', e);
      setLoading(false);
    }
  };

  const toggleTool = async (name: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/mcp/tools/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled }),
      });
      if (response.ok) {
        toast.success(`Tool ${name} ${!enabled ? 'enabled' : 'disabled'}`);
        fetchTools();
      } else {
        toast.error('Failed to toggle tool');
      }
    } catch (e) {
      console.error('Failed to toggle tool', e);
      toast.error('Failed to toggle tool');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#007acc]" />
      </div>
    );
  }

  return (
    <div className="p-6 bg-[#1e1e1e] text-white h-full overflow-y-auto">
      <h1 className="text-2xl font-bold mb-6">MCP Tool Management</h1>
      <div className="space-y-4">
        {tools.map((tool) => (
          <div key={tool.name} className="flex items-center justify-between p-4 bg-[#252526] rounded-lg">
            <div>
              <h2 className="font-semibold">{tool.name}</h2>
              <p className="text-sm text-gray-400">{tool.description || 'No description'}</p>
            </div>
            <button onClick={() => toggleTool(tool.name, tool.enabled)}>
              {tool.enabled ? (
                <ToggleRight className="w-8 h-8 text-green-500" />
              ) : (
                <ToggleLeft className="w-8 h-8 text-gray-500" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
