import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, User, Activity, BrainCircuit, ChevronRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

const ToolCallRenderer = ({ functionCalls }: { functionCalls: { name: string; args: any }[] }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="w-full space-y-1.5 mt-2">
      {functionCalls.map((call, idx) => (
        <div key={`call-${idx}-${call.name}`} className="bg-[#252526] border border-[#3c3c3c] rounded-xl overflow-hidden transition-all shadow-sm">
          <button
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(expanded === idx ? null : idx); } }}
            className="w-full flex items-center justify-between px-3 py-2 hover:bg-[#2d2d2d] transition-colors focus-visible:outline-none focus-visible:bg-[#2d2d2d]"
            aria-expanded={expanded === idx}
            aria-label={`Tool call: ${call.name}`}
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1 bg-[#007acc]/10 rounded-lg">
                <Activity className="w-3.5 h-3.5 text-[#007acc]" />
              </div>
              <span className="text-[11px] font-mono font-bold text-[#e5e5e5]">{call.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-[#858585] font-black uppercase tracking-[0.15em] bg-[#1e1e1e] px-1.5 py-0.5 rounded border border-[#3c3c3c]">Tool</span>
              <motion.div animate={{ rotate: expanded === idx ? 90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><ChevronRight className="w-3.5 h-3.5 text-[#858585]" /></motion.div>
            </div>
          </button>
          <AnimatePresence>
            {expanded === idx && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: "easeInOut" }} className="overflow-hidden">
                <div className="p-3 border-t border-[#3c3c3c] bg-[#0d0d0d]">
                  <pre className="text-[10px] text-[#3794ff] font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{JSON.stringify(call.args, null, 2)}</pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

const ThinkingBlock = ({ thinking, taskList, expanded, setExpanded }: any) => (
  <div className="w-full space-y-3 my-3">
    {taskList && (
      <div className="bg-[#252526] border border-[#007acc]/30 rounded-xl p-4 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-1 h-full bg-[#007acc]" />
        <div className="flex items-center gap-2.5 mb-3">
          <div className="p-1 bg-[#007acc]/10 rounded-md">
            <Activity className="w-3.5 h-3.5 text-[#007acc]" />
          </div>
          <span className="text-[10px] font-black text-[#858585] uppercase tracking-[0.15em]">Execution Roadmap</span>
        </div>
        <div className="space-y-2">
          {taskList.split('\n').map((task: string, idx: number) => {
            const isDone = task.includes('[x]');
            const isInProg = task.includes('[~]');
            const isBlocked = task.includes('[!]');
            return (
              <div key={`task-${idx}`} className="flex items-center gap-3 text-[11px] group/task">
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  isDone ? 'bg-green-500/20 border-green-500/50' :
                  isInProg ? 'bg-blue-500/20 border-blue-500/50 animate-pulse' :
                  isBlocked ? 'bg-red-500/20 border-red-500/50' :
                  'bg-[#1e1e1e] border-[#3c3c3c]'
                }`}>
                  {isDone && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                  {isBlocked && <AlertCircle className="w-3 h-3 text-red-500" />}
                  {isInProg && <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />}
                </div>
                <span className={`transition-all ${isDone ? 'text-[#666666] line-through' : 'text-[#e5e5e5] font-medium'}`}>
                  {task.replace(/\[.\]/, '').trim()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )}
    <div className="pl-4 py-1 relative">
      <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#007acc]/40 to-transparent rounded-full" />
      <button
        onClick={setExpanded}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(); } }}
        className="flex items-center gap-2.5 group/thought transition-all outline-none"
        aria-expanded={expanded}
      >
        <div className="p-1 bg-[#007acc]/5 rounded-md group-hover/thought:bg-[#007acc]/10 transition-colors">
          <BrainCircuit className="w-3.5 h-3.5 text-[#007acc]" />
        </div>
        <span className="text-[10px] font-black text-[#858585] uppercase tracking-[0.15em] group-hover/thought:text-[#007acc] transition-colors">{expanded ? 'Conceal Internal Monologue' : 'Analyze Internal Monologue'}</span>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 20 }}><ChevronRight className="w-3 h-3 text-[#858585] group-hover/thought:text-[#007acc]" /></motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="overflow-hidden">
            <div className="mt-2 p-3 bg-[#1a1a1a]/50 rounded-lg border border-[#3c3c3c]/30">
              <p className="text-[12px] text-[#a0a0a0] leading-relaxed whitespace-pre-wrap italic font-serif">{thinking}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
);

const FunctionResponses = ({ responses }: any) => (
  <div className="mt-3 space-y-2">
    {responses.map((res: any, idx: number) => {
      const isError = typeof res.response === 'object' && res.response !== null && ('error' in res.response || (res.response.stderr));
      return (
        <div key={`resp-${idx}-${res.name}`} className={`bg-[#1e1e1e] border ${isError ? 'border-red-500/20' : 'border-[#3c3c3c]'} rounded-lg overflow-hidden shadow-sm`}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
            {isError ? <AlertCircle className="w-3 h-3 text-red-400" /> : <CheckCircle2 className="w-3 h-3 text-green-400" />}
            <span className={`text-[9px] font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-[#858585]'}`}>
              {res.name} Output
            </span>
          </div>
          <div className={`text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all p-3 bg-black/10 ${isError ? 'text-red-300' : 'text-[#cccccc]'}`}>
            {typeof res.response === 'string' ? res.response : JSON.stringify(res.response, null, 2)}
          </div>
        </div>
      );
    })}
  </div>
);

const ReviewButtons = ({ content, onReviewChange }: any) => (
  <div className="mt-4 flex flex-wrap gap-2">
    {[...content.matchAll(/```([\w./-]+)\n([\s\S]*?)```/g)].map((match: any, idx: number) => {
      const filename = match[1];
      const content = match[2];
      if (filename.includes('.') && !['diff', 'delete', 'rename'].includes(filename)) {
        return (
          <button
            key={`review-${idx}-${filename}`}
            onClick={() => onReviewChange?.(filename, content)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007acc]/10 border border-[#007acc]/30 text-[#007acc] rounded-md hover:bg-[#007acc]/20 transition-all text-[10px] font-bold uppercase tracking-wider"
          >
            <Sparkles className="w-3 h-3" />
            <span>Review {filename}</span>
          </button>
        );
      }
      return null;
    })}
  </div>
);

const ProceedPrompt = ({ onSendMessage, isStreaming }: any) => (
  <div className="mt-5 p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-inner">
    <p className="text-xs text-[#d4d4d4] mb-3 font-bold uppercase tracking-widest opacity-70">How would you like to proceed?</p>
    <div className="flex flex-wrap gap-2">
      <button
        disabled={isStreaming}
        onClick={() => onSendMessage('y')}
        className="flex-1 sm:flex-none px-4 py-2 bg-[#007acc] text-white rounded-lg hover:bg-[#005f9e] transition-all text-xs font-bold shadow-lg shadow-[#007acc]/20 disabled:opacity-50"
      >
        Yes, proceed
      </button>
      <button
        disabled={isStreaming}
        onClick={() => onSendMessage('n')}
        className="flex-1 sm:flex-none px-4 py-2 bg-transparent text-[#d4d4d4] border border-[#4d4d4d] rounded-lg hover:bg-[#3c3c3c] transition-all text-xs font-bold disabled:opacity-50"
      >
        No, cancel
      </button>
    </div>
  </div>
);

export const MessageBubble = ({ 
  msg, i, 
  isUser, 
  settings, 
  isStreaming, 
  onReviewChange,
  expandedThinking,
  setExpandedThinking,
  formatContent,
  renderMarkdown,
  onSendMessage
}: any) => {
  const { thinking, main, taskList } = formatContent(msg.content);
  const isProceedPrompt = msg.role === 'model' && /(?:Proceed\?\s*)?\[y\/n(?:\/edit)?\]/i.test(main);
  const contentToRender = isProceedPrompt 
    ? main.replace(/\n?\s*\*?\*?(?:Proceed\?\s*)?\[y\/n(?:\/edit)?\]\*?\*?/i, '').trim() 
    : main;
  
  return (
    <motion.div
      key={msg.id || `msg-${i}-${msg.role}-${msg.content.substring(0, 20)}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border shadow-sm ${
        isUser 
          ? 'bg-[#007acc] border-[#007acc]/50 text-white' 
          : 'bg-[#252526] border-[#3c3c3c] text-[#007acc]'
      }`}>
        {isUser ? (
          settings.userAvatar ? (
            <img src={settings.userAvatar} alt="User" className="w-full h-full rounded-lg object-cover" />
          ) : (
            <User className="w-4 h-4" />
          )
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
      </div>

      <div className={`flex flex-col max-w-[95%] sm:max-w-[85%] min-w-0 space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Thinking Block */}
        {thinking && (
          <ThinkingBlock thinking={thinking} taskList={taskList} expanded={expandedThinking === i} setExpanded={() => setExpandedThinking(expandedThinking === i ? null : i)} />
        )}

        {/* Main Message Bubble */}
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative group break-words max-w-full overflow-hidden shadow-sm ${
          isUser 
            ? 'bg-[#007acc] text-white border border-[#007acc]/50 rounded-tr-none' 
            : 'bg-[#252526] text-[#cccccc] border border-[#3c3c3c] rounded-tl-none'
        }`}>
          {renderMarkdown(contentToRender)}

          {msg.functionCalls && <ToolCallRenderer functionCalls={msg.functionCalls} />}
          
          {msg.functionResponses && <FunctionResponses responses={msg.functionResponses} />}
          
          {/* Review Changes Buttons */}
          {msg.role === 'model' && !isStreaming && msg.content && (
             <ReviewButtons content={msg.content} onReviewChange={onReviewChange} />
          )}

          {isProceedPrompt && <ProceedPrompt onSendMessage={onSendMessage} i={i} isStreaming={isStreaming} />}
        </div>
        
        {/* User identification and copy */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[9px] text-[#858585] font-bold uppercase tracking-widest opacity-60">
            {isUser ? (settings.userName || 'You') : 'GIDE AI'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
