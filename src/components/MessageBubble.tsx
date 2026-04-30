import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, User, Activity, BrainCircuit, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';

const ToolCallRenderer = ({ functionCalls }: { functionCalls: { name: string; args: any }[] }) => {
  const [expanded, setExpanded] = useState<number | null>(null);
  return (
    <div className="w-full space-y-1.5 mt-2">
      {functionCalls.map((call, idx) => (
        <div key={`call-${idx}-${call.name}`} className="bg-[#252526] border border-[#3c3c3c] rounded-md overflow-hidden transition-all">
          <button
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#2d2d2d] transition-colors focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:outline-none"
            aria-label={`${expanded === idx ? 'Hide' : 'Show'} tool call details for ${call.name}`}
            aria-expanded={expanded === idx}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-[#007acc]" />
              <span className="text-[11px] font-mono font-medium text-[#cccccc]">{call.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#858585] font-bold uppercase tracking-wider">Tool</span>
              <motion.div animate={{ rotate: expanded === idx ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronRight className="w-3 h-3 text-[#858585]" /></motion.div>
            </div>
          </button>
          <AnimatePresence>
            {expanded === idx && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="p-2.5 border-t border-[#3c3c3c] bg-[#1a1a1a]">
                  <pre className="text-[10px] text-[#3794ff] font-mono overflow-x-auto whitespace-pre-wrap break-all">{JSON.stringify(call.args, null, 2)}</pre>
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
  <div className="w-full space-y-2 my-2">
    {taskList && (
      <div className="bg-[#252526] border border-[#007acc]/20 rounded-lg p-3 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-3 h-3 text-[#007acc]" />
          <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest">Active Task List</span>
        </div>
        <div className="space-y-1">
          {taskList.split('\n').map((task: string, idx: number) => {
            const isDone = task.includes('[x]');
            const isInProg = task.includes('[~]');
            const isBlocked = task.includes('[!]');
            return (
              <div key={`task-${idx}`} className="flex items-start gap-2 text-[11px]">
                <span className={`font-mono shrink-0 ${isDone ? 'text-green-500' : isInProg ? 'text-blue-400 animate-pulse' : isBlocked ? 'text-red-500' : 'text-[#858585]'}`}>
                  {task.match(/\[.\]/)?.[0] || '[ ]'}
                </span>
                <span className={`${isDone ? 'text-[#858585] line-through' : 'text-[#cccccc]'}`}>
                  {task.replace(/\[.\]/, '').trim()}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    )}
    <div className="border-l-2 border-[#007acc]/30 pl-3 py-1">
      <button
        onClick={setExpanded}
        className="flex items-center gap-2 mb-1 opacity-60 hover:opacity-100 transition-opacity focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:outline-none rounded px-1"
        aria-label={expanded ? 'Hide Thought' : 'View Thought'}
        aria-expanded={expanded}
      >
        <BrainCircuit className="w-3 h-3 text-[#007acc]" />
        <span className="text-[9px] font-bold text-[#e5e5e5] uppercase tracking-widest">{expanded ? 'Hide Thought' : 'View Thought'}</span>
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}><ChevronRight className="w-2.5 h-2.5 text-[#858585]" /></motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-xs text-[#858585] italic leading-relaxed whitespace-pre-wrap pb-2">{thinking}</p>
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
        className="flex-1 sm:flex-none px-4 py-2 bg-[#007acc] text-white rounded-lg hover:bg-[#005f9e] transition-all text-xs font-bold shadow-lg shadow-[#007acc]/20 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:outline-none"
        aria-label="Yes, proceed"
      >
        Yes, proceed
      </button>
      <button
        disabled={isStreaming}
        onClick={() => onSendMessage('n')}
        className="flex-1 sm:flex-none px-4 py-2 bg-transparent text-[#d4d4d4] border border-[#4d4d4d] rounded-lg hover:bg-[#3c3c3c] transition-all text-xs font-bold disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-[#007acc] focus-visible:outline-none"
        aria-label="No, cancel"
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
        
        {/* User identification */}
        <div className="flex items-center gap-3 px-1">
          <span className="text-[9px] text-[#858585] font-bold uppercase tracking-widest opacity-60">
            {isUser ? (settings.userName || 'You') : 'GIDE AI'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};
