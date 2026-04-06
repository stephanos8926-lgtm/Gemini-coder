import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, User, Copy, Check, BrainCircuit, Zap, Terminal, Activity, Code2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../lib/gemini';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Settings } from '../lib/settingsStore';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  onReviewChange?: (filename: string, content: string) => void;
  isStreaming: boolean;
  settings: Settings;
}

const ToolCallRenderer = ({ functionCalls }: { functionCalls: { name: string; args: any }[] }) => {
  return (
    <div className="w-full bg-[#252526]/80 border border-[#007acc]/30 rounded-xl p-3 space-y-3 mt-3 shadow-lg backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#007acc] uppercase tracking-widest">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>Executing Tools</span>
        </div>
        <div className="flex gap-1">
          <div className="w-1 h-1 rounded-full bg-[#007acc] animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1 h-1 rounded-full bg-[#007acc] animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1 h-1 rounded-full bg-[#007acc] animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <div className="space-y-2">
        {functionCalls.map((call, idx) => (
          <div key={`call-${idx}-${call.name}`} className="group relative">
            <div className="absolute -left-1 top-0 bottom-0 w-0.5 bg-[#007acc]/50 rounded-full" />
            <div className="pl-3 py-1">
              <div className="flex items-center gap-2 mb-1">
                <Code2 className="w-3 h-3 text-[#858585]" />
                <span className="text-xs font-mono font-bold text-[#3794ff]">{call.name}</span>
              </div>
              <div className="text-[11px] text-[#858585] font-mono bg-[#1e1e1e] p-2 rounded-lg border border-[#3c3c3c] overflow-x-auto whitespace-pre-wrap break-all">
                {JSON.stringify(call.args, null, 2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export function ChatPanel({ messages, onSendMessage, onReviewChange, isStreaming, settings }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    const hljs = window.hljs;
    if (hljs) {
      setTimeout(() => {
        document.querySelectorAll('.prose pre code').forEach((block) => {
          hljs.highlightElement(block);
        });
      }, 100);
    }
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
    const rawHtml = marked(content, { async: false, breaks: true, gfm: true }) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return { __html: cleanHtml };
  };

  const formatContent = (content: string) => {
    const thinkingMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/);
    const mainContent = content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim();
    return {
      thinking: thinkingMatch ? thinkingMatch[1] : null,
      main: mainContent
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar min-h-0">
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
          const { thinking, main } = formatContent(msg.content);
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
                  <div className="w-full bg-[#252526]/50 border border-[#3c3c3c] rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-[#858585] uppercase tracking-widest">
                      <BrainCircuit className="w-3 h-3" />
                      <span>Reasoning</span>
                    </div>
                    <p className="text-xs text-[#858585] italic leading-relaxed">{thinking}</p>
                  </div>
                )}

                {/* Main Message Bubble */}
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm relative group break-words max-w-full overflow-hidden ${
                  isUser 
                    ? 'bg-[#007acc] text-white rounded-tr-none' 
                    : 'bg-[#252526] text-[#cccccc] border border-[#3c3c3c] rounded-tl-none'
                }`}>
                  <div 
                    className="markdown-body prose prose-invert prose-sm max-w-none overflow-x-auto break-words prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-[#2d2d2d] prose-a:text-[#3794ff] prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed"
                    dangerouslySetInnerHTML={renderMarkdown(contentToRender)}
                  />

                  {msg.functionCalls && <ToolCallRenderer functionCalls={msg.functionCalls} />}
                  
                  {msg.functionResponses && (
                    <div className="mt-4 space-y-3">
                      {msg.functionResponses.map((res, idx) => {
                        const isError = typeof res.response === 'object' && res.response !== null && ('error' in res.response || 'stderr' in res.response && res.response.stderr);
                        return (
                          <div key={`resp-${idx}-${res.name}`} className={`bg-[#1e1e1e]/50 border ${isError ? 'border-red-500/30' : 'border-green-500/30'} rounded-xl p-3 shadow-inner`}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {isError ? (
                                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                                ) : (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                )}
                                <span className={`text-[10px] font-bold uppercase tracking-widest ${isError ? 'text-red-400' : 'text-green-400'}`}>
                                  {res.name} Result
                                </span>
                              </div>
                            </div>
                            <div className={`text-[11px] font-mono overflow-x-auto whitespace-pre-wrap break-all p-2 rounded-lg bg-black/20 ${isError ? 'text-red-300' : 'text-[#cccccc]'}`}>
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
      </div>

      {/* Input Area */}
      <div className="p-4 bg-[#252526] border-t border-[#3c3c3c] shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-10 shrink-0">
        <form onSubmit={handleSubmit} className="relative group max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask GIDE to build something..."
            className="w-full bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl px-4 py-3 pr-12 text-sm text-white placeholder-[#858585] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc]/20 transition-all resize-none min-h-[44px] max-h-[200px] custom-scrollbar shadow-inner"
            rows={2}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg transition-all ${
              input.trim() && !isStreaming 
                ? 'bg-[#007acc] text-white shadow-lg shadow-[#007acc]/20 hover:bg-[#0062a3]' 
                : 'text-[#858585] cursor-not-allowed'
            }`}
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
        <div className="mt-2 flex items-center justify-between px-1 max-w-4xl mx-auto">
          <p className="text-[9px] text-[#858585] font-bold uppercase tracking-widest opacity-60">
            Press Enter to send, Shift+Enter for new line
          </p>
          <div className="flex items-center gap-1 text-[9px] text-[#858585] font-bold uppercase tracking-widest opacity-60">
            <Zap className="w-2.5 h-2.5 text-yellow-500" />
            <span>AI Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
