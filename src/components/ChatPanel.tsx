import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Message } from '../lib/gemini';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isStreaming: boolean;
}

export function ChatPanel({ messages, onSendMessage, isStreaming }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
    if (window.hljs) {
      setTimeout(() => {
        document.querySelectorAll('.prose pre code').forEach((block) => {
          window.hljs.highlightElement(block);
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

  const renderMarkdown = (content: string) => {
    const rawHtml = marked(content, { async: false, breaks: true, gfm: true }) as string;
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return { __html: cleanHtml };
  };

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-r border-[#3c3c3c]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-[#858585] mt-10">
            <h3 className="text-xl font-semibold mb-2 text-[#d4d4d4]">Welcome to GIDE</h3>
            <p className="text-sm">Type a prompt below to start building your project.</p>
            <p className="text-xs mt-4">Try: <code className="bg-[#3c3c3c] px-1 rounded">/help</code></p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isProceedPrompt = msg.role === 'model' && /(?:Proceed\?\s*)?\[y\/n(?:\/edit)?\]/i.test(msg.content);
          const contentToRender = isProceedPrompt 
            ? msg.content.replace(/\n?\s*\*?\*?(?:Proceed\?\s*)?\[y\/n(?:\/edit)?\]\*?\*?/i, '').trim() 
            : msg.content;

          return (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            key={i}
            className={`p-4 rounded-xl shadow-sm ${
              msg.role === 'user'
                ? 'bg-[#2d2d2d] ml-8 border border-[#3c3c3c]'
                : 'bg-[#1a1a2e] border border-[#2a2a4a] border-l-4 border-l-[#007acc] mr-8'
            }`}
          >
            <div className="text-xs text-[#858585] mb-2 uppercase tracking-wider font-semibold">
              {msg.role === 'user' ? 'You' : 'GIDE'}
            </div>
            <div 
              className="text-sm text-[#d4d4d4] prose prose-invert prose-sm max-w-none prose-pre:bg-[#0d0d0d] prose-pre:border prose-pre:border-[#2d2d2d] prose-a:text-[#3794ff] prose-a:no-underline hover:prose-a:underline prose-p:leading-relaxed"
              dangerouslySetInnerHTML={renderMarkdown(contentToRender)}
            />
            {isProceedPrompt && (
              <div className="mt-5 p-4 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-sm">
                <p className="text-sm text-[#d4d4d4] mb-3 font-medium">How would you like to proceed?</p>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    disabled={i !== messages.length - 1 || isStreaming}
                    onClick={() => onSendMessage('y')}
                    className="flex-1 sm:flex-none px-4 py-2 bg-[#007acc] text-white rounded-md hover:bg-[#005f9e] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    Yes, proceed
                  </button>
                  <button
                    disabled={i !== messages.length - 1 || isStreaming}
                    onClick={() => onSendMessage('n')}
                    className="flex-1 sm:flex-none px-4 py-2 bg-transparent text-[#d4d4d4] border border-[#4d4d4d] rounded-md hover:bg-[#3c3c3c] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    No, cancel
                  </button>
                  <button
                    disabled={i !== messages.length - 1 || isStreaming}
                    onClick={() => {
                      const textarea = document.querySelector('textarea');
                      if (textarea) textarea.focus();
                    }}
                    className="flex-1 sm:flex-none px-4 py-2 bg-transparent text-[#d4d4d4] border border-[#4d4d4d] rounded-md hover:bg-[#3c3c3c] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Edit plan
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )})}
        {isStreaming && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-xl bg-[#1a1a2e] border border-[#2a2a4a] border-l-4 border-l-[#007acc] mr-8 flex items-center gap-3 shadow-sm"
          >
            <Loader2 className="w-4 h-4 text-[#007acc] animate-spin" />
            <span className="text-sm text-[#858585]">GIDE is typing...</span>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-[#252526] border-t border-[#3c3c3c] shadow-[0_-4px_10px_rgba(0,0,0,0.1)] z-10">
        <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask GIDE to build something..."
            className="w-full bg-[#3c3c3c] border border-[#4d4d4d] rounded-xl pl-4 pr-12 py-3 text-sm text-[#d4d4d4] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] resize-none transition-all shadow-inner"
            rows={3}
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="absolute right-3 bottom-3 p-2 text-[#007acc] hover:bg-[#2d2d2d] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
