import React, { useState, useEffect } from 'react';
import { Loader2, ToggleLeft, ToggleRight, X, Settings } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'sonner';

interface McpModalProps {
  onClose: () => void;
}

export const McpModal: React.FC<McpModalProps> = ({ onClose }) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="bg-[#252526] border border-[#454545] sm:rounded-xl shadow-2xl w-full h-full sm:h-auto max-w-lg overflow-hidden flex flex-col max-h-full sm:max-h-[80vh]"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border-subtle bg-surface-accent">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-accent-intel" />
            <h2 className="text-base sm:text-lg font-semibold text-text-primary">MCP Tool Management</h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-base rounded-md text-text-subtle hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent-intel" />
            </div>
          ) : (
            <div className="space-y-4">
              {tools.map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-4 bg-surface-accent rounded-lg border border-border-subtle">
                  <div>
                    <h2 className="font-semibold text-text-primary">{tool.name}</h2>
                    <p className="text-sm text-text-subtle">{tool.description || 'No description'}</p>
                  </div>
                  <button onClick={() => toggleTool(tool.name, tool.enabled)}>
                    {tool.enabled ? (
                      <ToggleRight className="w-8 h-8 text-accent-ops" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-text-subtle" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-surface-accent border-t border-border-subtle flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 text-xs sm:text-sm font-medium text-text-primary hover:text-text-primary hover:bg-surface-base rounded-md transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
