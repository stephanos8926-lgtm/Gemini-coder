import React from 'react';
import { DiffEditor } from '@monaco-editor/react';
import { useScratchpadStore } from '../../store/useScratchpadStore';
import { filesystemService } from '../../lib/filesystemService';
import { Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export const DiffStagingPanel: React.FC = () => {
  const { pendingEdits, acceptEdit, rejectEdit } = useScratchpadStore();
  const [isProcessing, setIsProcessing] = React.useState(false);
  
  const pendingPaths = Object.keys(pendingEdits);
  if (pendingPaths.length === 0) return null;

  const activePath = pendingPaths[0];
  const edit = pendingEdits[activePath];

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await filesystemService.acceptStaging(activePath);
      acceptEdit(activePath);
      toast.success(`Applied changes to ${activePath}`);
    } catch (err) {
      toast.error(`Failed to apply changes: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await filesystemService.rejectStaging(activePath);
      rejectEdit(activePath);
      toast.info(`Rejected changes for ${activePath}`);
    } catch (err) {
      toast.error(`Failed to reject changes: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        id="diff-staging-overlay"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-x-0 bottom-12 z-50 p-4 pointer-events-none"
      >
        <div className="max-w-5xl mx-auto bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-2xl overflow-hidden pointer-events-auto flex flex-col h-[60vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-[#3c3c3c]">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1 rounded bg-[#007acc]/10 text-[#007acc]">
                <AlertCircle size={14} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#cccccc] truncate">
                Review AI Suggestion: <span className="text-[#007acc]">{activePath}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                id="reject-edit-btn"
                disabled={isProcessing}
                onClick={handleReject}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-[#cccccc] hover:text-white hover:bg-white/5 rounded disabled:opacity-50 transition-colors"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Reject
              </button>
              <button 
                id="accept-edit-btn"
                disabled={isProcessing}
                onClick={handleAccept}
                className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium text-white bg-[#007acc] hover:bg-[#1f8ad2] rounded disabled:opacity-50 transition-shadow shadow-sm active:scale-95"
              >
                {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Accept Changes
              </button>
            </div>
          </div>

          {/* Diff Editor */}
          <div className="flex-1 min-h-0 bg-[#1e1e1e]">
            <DiffEditor
              height="100%"
              language={activePath.endsWith('.ts') || activePath.endsWith('.tsx') ? 'typescript' : 'javascript'}
              original={edit.original}
              modified={edit.proposed}
              theme="vs-dark"
              options={{
                renderSideBySide: true,
                readOnly: true,
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 12,
                fontFamily: 'JetBrains Mono',
                automaticLayout: true,
              }}
            />
          </div>

          {/* Footer Info */}
          <div className="px-4 py-1.5 bg-[#252526] text-[10px] text-[#858585] border-t border-[#3c3c3c] flex justify-between items-center">
            <span>Authorizing this change will overwrite the existing file at {activePath}</span>
            <span>{pendingPaths.length} suggestion(s) pending</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
