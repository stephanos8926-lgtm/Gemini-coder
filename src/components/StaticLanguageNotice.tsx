import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Download, Terminal, ExternalLink } from 'lucide-react';

interface StaticLanguageNoticeProps {
  language: string;
}

export function StaticLanguageNotice({ language }: StaticLanguageNoticeProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="m-4 p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center max-w-md mx-auto shadow-2xl shadow-amber-500/5"
    >
      <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-500" />
      </div>
      
      <h3 className="text-sm font-bold text-[#e5e5e5] uppercase tracking-widest mb-2">
        Static Development Mode
      </h3>
      
      <p className="text-xs text-[#858585] leading-relaxed mb-6">
        <span className="text-amber-500 font-bold uppercase">{language}</span> code cannot be executed directly in the browser sandbox. 
        You can build and manage the codebase here, then download the source to compile locally.
      </p>

      <div className="grid grid-cols-2 gap-3 w-full">
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-[#252526] hover:bg-[#2d2d2d] border border-[#3c3c3c] rounded-xl text-[10px] font-bold text-[#cccccc] uppercase tracking-wider transition-all">
          <Download className="w-3.5 h-3.5" />
          Export Source
        </button>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl text-[10px] font-bold text-amber-500 uppercase tracking-wider transition-all">
          <ExternalLink className="w-3.5 h-3.5" />
          Local Setup
        </button>
      </div>

      <div className="mt-6 pt-4 border-t border-amber-500/10 w-full flex items-center justify-center gap-4">
        <div className="flex items-center gap-1.5 opacity-50">
          <Terminal className="w-3 h-3 text-[#cccccc]" />
          <span className="text-[9px] font-mono text-[#858585]">gcc/rustc/go</span>
        </div>
      </div>
    </motion.div>
  );
}
