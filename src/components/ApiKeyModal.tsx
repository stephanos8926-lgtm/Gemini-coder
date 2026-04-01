import React, { useState } from 'react';
import { Key } from 'lucide-react';
import { motion } from 'motion/react';

interface ApiKeyModalProps {
  onSave: (key: string) => void;
  onClose?: () => void;
  initialKey?: string;
  canClose: boolean;
}

export function ApiKeyModal({ onSave, onClose, initialKey = '', canClose }: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(initialKey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKey.trim()) {
      onSave(apiKey.trim());
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
        className="bg-[#252526] border border-[#3c3c3c] p-6 sm:p-8 sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto max-w-md flex flex-col justify-center sm:block"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#1e1e1e] rounded-lg border border-[#3c3c3c]">
            <Key className="w-5 h-5 sm:w-6 sm:h-6 text-[#007acc]" />
          </div>
          <h2 className="text-lg sm:text-xl font-semibold text-[#e5e5e5]">API Key Setup</h2>
        </div>
        <p className="text-[#858585] mb-6 text-xs sm:text-sm leading-relaxed">
          Please enter your Gemini API key to continue. The key is stored locally in your browser.
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-4 py-3 text-sm text-[#d4d4d4] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] mb-6 transition-all shadow-inner"
            autoFocus
          />
          <div className="flex flex-col sm:flex-row justify-end gap-3">
            {canClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-xs sm:text-sm font-medium text-[#d4d4d4] hover:bg-[#3c3c3c] rounded-lg transition-colors order-2 sm:order-1"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!apiKey.trim()}
              className="px-5 py-2.5 text-xs sm:text-sm font-medium bg-[#007acc] text-white rounded-lg hover:bg-[#005f9e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm order-1 sm:order-2"
            >
              Save Key
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
