import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, Copy, Check, BrainCircuit, Zap, Terminal, Activity, Code2, CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../lib/gemini';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { Settings } from '../lib/settingsStore';

// Configure marked with highlight.js using a custom renderer
const renderer = new Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true
});

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  onReviewChange?: (filename: string, content: string) => void;
  isStreaming: boolean;
  settings: Settings;
}

const ToolCallRenderer = ({ functionCalls }: { functionCalls: { name: string; args: any }[] }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="w-full space-y-1.5 mt-2">
      {functionCalls.map((call, idx) => (
        <div 
          key={`call-${idx}-${call.name}`} 
          className="bg-[#252526] border border-[#3c3c3c] rounded-md overflow-hidden transition-all"
        >
          <button 
            onClick={() => setExpanded(expanded === idx ? null : idx)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 hover:bg-[#2d2d2d] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-[#007acc]" />
              <span className="text-[11px] font-mono font-medium text-[#cccccc]">{call.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-[#858585] font-bold uppercase tracking-wider">Tool</span>
              <motion.div
                animate={{ rotate: expanded === idx ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronRight className="w-3 h-3 text-[#858585]" />
              </motion.div>
            </div>
          </button>
          
          <AnimatePresence>
            {expanded === idx && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-2.5 border-t border-[#3c3c3c] bg-[#1a1a1a]">
                  <pre className="text-[10px] text-[#3794ff] font-mono overflow-x-auto whitespace-pre-wrap break-all">
                    {JSON.stringify(call.args, null, 2)}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
};

export function ChatPanel({ messages, onSendMessage, onReviewChange, isStreaming, settings }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderMarkdown = (content: string) => {
    const rawHtml = marked.parse(content) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return { __html: cleanHtml };
  };

  const formatContent = (content: string) => {
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    
    // Extract task list from thinking if present
    let taskList: string | null = null;
    if (thinkingMatch) {
      const lines = thinkingMatch[1].split('\n');
      const taskLines = lines.filter(l => /\[[x~ !]\]/.test(l));
      if (taskLines.length > 0) {
        taskList = taskLines.join('\n');
      }
    }

    return {
      thinking: thinkingMatch ? thinkingMatch[1] : null,
      main: mainContent,
      taskList
    };
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1e1e1e] border-r border-[#3c3c3c]">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#3c3c3c] bg-[#252526] flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#007acc]/10 rounded-lg">
            <Sparkles className="w-4 h-4 text-[#007acc]" />
          </div>
          <span className="font-bold text-sm text-[#e5e5e5] tracking-tight uppercase">AI Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-[#858585] font-medium uppercase tracking-widest">Ready</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 bg-[#252526] rounded-2xl flex items-center justify-center border border-[#3c3c3c] shadow-xl">
              <Sparkles className="w-8 h-8 text-[#007acc]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-white font-bold text-lg">Welcome to GIDE AI</h3>
              <p className="text-xs text-[#858585] max-w-[240px] leading-relaxed">
                I can help you write code, refactor projects, or explain complex logic. How can I assist you today?
              </p>
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const { thinking, main, taskList } = formatContent(msg.content);
          const isUser = msg.role === 'user';
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

              <div className={`flex flex-col max-w-[95%] sm:max-w-[85%] min-w-0 space-y-2 ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Thinking Block */}
                {thinking && (
                  <div className="w-full space-y-2 my-2">
                    {taskList && (
                      <div className="bg-[#252526] border border-[#007acc]/20 rounded-lg p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-3 h-3 text-[#007acc]" />
                          <span className="text-[10px] font-bold text-[#858585] uppercase tracking-widest">Active Task List</span>
                        </div>
                        <div className="space-y-1">
                          {taskList.split('\n').map((task, idx) => {
                            const isDone = task.includes('[x]');
                            const isInProg = task.includes('[~]');
                            const isBlocked = task.includes('[!]');
                            return (
                              <div key={`task-${idx}`} className="flex items-start gap-2 text-[11px]">
                                <span className={`font-mono shrink-0 ${
                                  isDone ? 'text-green-500' : 
                                  isInProg ? 'text-blue-400 animate-pulse' : 
                                  isBlocked ? 'text-red-500' : 'text-[#858585]'
                                }`}>
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
                        onClick={() => setExpandedThinking(expandedThinking === i ? null : i)}
                        className="flex items-center gap-2 mb-1 opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <BrainCircuit className="w-3 h-3 text-[#007acc]" />
                        <span className="text-[9px] font-bold text-[#e5e5e5] uppercase tracking-widest">
                          {expandedThinking === i ? 'Hide Thought' : 'View Thought'}
                        </span>
                        <motion.div
                          animate={{ rotate: expandedThinking === i ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-2.5 h-2.5 text-[#858585]" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {expandedThinking === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <p className="text-xs text-[#858585] italic leading-relaxed whitespace-pre-wrap pb-2">{thinking}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {/* Main Message Bubble */}
                <div className={`px-4 py-2 rounded-xl text-sm leading-relaxed relative group break-words max-w-full overflow-hidden ${
                  isUser 
                    ? 'bg-[#2d2d2d] text-white border border-[#3c3c3c]' 
                    : 'bg-[#252526] text-[#cccccc] border border-[#3c3c3c]'
                }`}>
                  <div 
                    className="markdown-body prose prose-invert prose-sm max-w-none overflow-x-auto break-words prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-[#2d2d2d] prose-a:text-[#3794ff] prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(contentToRender)}
                  />

                  {msg.functionCalls && <ToolCallRenderer functionCalls={msg.functionCalls} />}
                  
                  {msg.functionResponses && (
                    <div className="mt-3 space-y-2">
                      {msg.functionResponses.map((res, idx) => {
                        const isError = typeof res.response === 'object' && res.response !== null && ('error' in res.response || 'stderr' in res.response && res.response.stderr);
                        return (
                          <div key={`resp-${idx}-${res.name}`} className={`bg-[#1e1e1e] border ${isError ? 'border-red-500/20' : 'border-[#3c3c3c]'} rounded-lg overflow-hidden shadow-sm`}>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#252526] border-b border-[#3c3c3c]">
                              {isError ? (
                                <AlertCircle className="w-3 h-3 text-red-400" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3 text-green-400" />
                              )}
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
                  )}
                  
                  {/* Review Changes Buttons */}
                  {msg.role === 'model' && !isStreaming && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[...main.matchAll(/```([\w./-]+)\n([\s\S]*?)```/g)].map((match, idx) => {
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
                  )}

                  {isProceedPrompt && (
                    <div className="mt-5 p-4 bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-inner">
                      <p className="text-xs text-[#d4d4d4] mb-3 font-bold uppercase tracking-widest opacity-70">How would you like to proceed?</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          disabled={i !== messages.length - 1 || isStreaming}
                          onClick={() => onSendMessage('y')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-[#007acc] text-white rounded-lg hover:bg-[#005f9e] transition-all text-xs font-bold shadow-lg shadow-[#007acc]/20 disabled:opacity-50"
                        >
                          Yes, proceed
                        </button>
                        <button
                          disabled={i !== messages.length - 1 || isStreaming}
                          onClick={() => onSendMessage('n')}
                          className="flex-1 sm:flex-none px-4 py-2 bg-transparent text-[#d4d4d4] border border-[#4d4d4d] rounded-lg hover:bg-[#3c3c3c] transition-all text-xs font-bold disabled:opacity-50"
                        >
                          No, cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-3 px-1">
                  <span className="text-[9px] text-[#858585] font-bold uppercase tracking-widest opacity-60">
                    {isUser ? (settings.userName || 'You') : 'GIDE AI'}
                  </span>
                  {!isStreaming && (
                    <button 
                      onClick={() => handleCopy(msg.content, `msg-${i}`)}
                      className="text-[#858585] hover:text-white transition-colors"
                      title="Copy message"
                    >
                      {copiedId === `msg-${i}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {isStreaming && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#252526] border border-[#3c3c3c] flex items-center justify-center text-[#007acc] shrink-0 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="bg-[#252526] border border-[#3c3c3c] px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-[#007acc] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 bg-[#007acc] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1.5 h-1.5 bg-[#007acc] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div></div>

      {/* Input Area */}
      <div className="p-4 bg-transparent shrink-0">
        <form onSubmit={handleSubmit} className="relative group max-w-3xl mx-auto">
          <div className="relative flex items-end bg-[#252526] border border-[#3c3c3c] rounded-2xl focus-within:border-[#007acc] focus-within:ring-1 focus-within:ring-[#007acc]/20 transition-all shadow-lg">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask GIDE to build something..."
              className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-white placeholder-[#858585] focus:outline-none resize-none min-h-[44px] max-h-[200px] custom-scrollbar"
              rows={1}
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className={`absolute right-2 bottom-2 p-2 rounded-xl transition-all ${
                input.trim() && !isStreaming 
                  ? 'bg-[#007acc] text-white hover:bg-[#0062a3]' 
                  : 'text-[#858585] cursor-not-allowed'
              }`}
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </form>
        <div className="mt-2 flex items-center justify-center gap-4 max-w-3xl mx-auto opacity-40">
          <p className="text-[9px] text-[#858585] font-bold uppercase tracking-widest">
            Enter to send
          </p>
          <div className="flex items-center gap-1 text-[9px] text-[#858585] font-bold uppercase tracking-widest">
            <Zap className="w-2.5 h-2.5 text-yellow-500" />
            <span>AI Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
