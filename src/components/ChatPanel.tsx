import React, { useState, useEffect, useRef } from 'react';
import { MessageBubble } from './MessageBubble';
import { Send, Loader2, Sparkles, User, Copy, Check, BrainCircuit, Zap, Terminal, Activity, Code2, CheckCircle2, AlertCircle, ChevronRight, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Message } from '../lib/gemini';
import { toast } from 'sonner';
import { marked, Renderer } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import { apiClient } from '../lib/apiClient';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { type Settings } from '../lib/settingsStore';
import { chatService, type ChatMessage } from '../lib/chatService';
import { Settings as SettingsIcon } from 'lucide-react';

const MAX_CODE_LINES = 10;
const COPY_TIMEOUT_MS = 2000;

// Configure marked with highlight.js using a custom renderer
const renderer = new Renderer();
renderer.code = ({ text, lang }: { text: string; lang?: string }) => {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  const isLarge = text.split('\n').length > 10;
  
  return `
    <div class="code-block-wrapper relative group my-4 rounded-lg overflow-hidden border border-[#3c3c3c] bg-[#0d0d0d]" data-large="${isLarge}">
      <div class="flex items-center justify-between px-3 py-1.5 bg-[#1a1a1a] border-b border-[#3c3c3c]">
        <span class="text-[10px] font-bold text-[#858585] uppercase tracking-widest">${language}</span>
        <button class="copy-btn p-1 hover:bg-[#3c3c3c] rounded transition-colors" data-code="${encodeURIComponent(text)}">
          <svg class="w-3 h-3 text-[#858585]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        </button>
      </div>
      <div class="code-content ${isLarge ? 'max-h-[300px] overflow-y-auto' : ''} p-4 text-[12px] font-mono leading-relaxed">
        <pre><code class="hljs language-${language}">${highlighted}</code></pre>
      </div>
      ${isLarge ? `
        <button class="expand-btn absolute bottom-0 left-0 right-0 py-2 bg-gradient-to-t from-[#0d0d0d] to-transparent text-[10px] font-bold text-[#007acc] hover:text-[#3794ff] transition-all flex items-center justify-center gap-1">
          <span>Show More</span>
        </button>
      ` : ''}
    </div>
  `;
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true
});

import { getAvailableAgents, AgentConfig } from '../utils/agentPool';

interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (msg: string, options?: { agentId?: string }) => void;
  onNewChat: () => void;
  onReviewChange?: (filename: string, content: string) => void;
  isStreaming: boolean;
  settings: Settings;
}


import { QuickActionOverlay } from './chat/QuickActionOverlay';
import { useChatStore } from '../store/useChatStore';
import { useFileStore } from '../store/useFileStore';

export function ChatPanel({ messages, onSendMessage, onNewChat, onReviewChange, isStreaming, settings }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedThinking, setExpandedThinking] = useState<number | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('default-coder');
  const [showQuickActions, setShowQuickActions] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { RW_contextSnippets, removeContextSnippet, addContextSnippet, RW_messages } = useChatStore();
  const { RW_fileStore } = useFileStore();

  const [showContextSelector, setShowContextSelector] = useState(false);

  useEffect(() => {
    getAvailableAgents().then(setAgents);
  }, []);

  useEffect(() => {
    const unsubscribe = chatService.subscribe((msg: ChatMessage) => {
      onSendMessage(msg.content);
    });
    return () => { unsubscribe(); };
  }, [onSendMessage]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (input.trim() && !isStreaming) {
      // Build context metadata if snippets are present
      let finalMessage = input.trim();
      if (RW_contextSnippets.length > 0) {
        const contextStr = RW_contextSnippets.map(s => `[CONTEXT: ${s.path}]\n${s.content}`).join('\n\n');
        finalMessage = `Context Information:\n${contextStr}\n\nUser Question:\n${finalMessage}`;
      }

      onSendMessage(finalMessage, { agentId: selectedAgentId });
      setInput('');
      setShowQuickActions(true);
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
    return (
      <div className="markdown-body">
        <ReactMarkdown 
          rehypePlugins={[rehypeRaw as any, rehypeSanitize as any]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  useEffect(() => {
    const handleCodeActions = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const copyBtn = target.closest('.copy-btn');
      const expandBtn = target.closest('.expand-btn');

      if (copyBtn) {
        const code = decodeURIComponent(copyBtn.getAttribute('data-code') || '');
        navigator.clipboard.writeText(code);
        toast.success('Code copied to clipboard');
      }

      if (expandBtn) {
        const wrapper = expandBtn.closest('.code-block-wrapper');
        const content = wrapper?.querySelector('.code-content');
        if (content) {
          content.classList.toggle('max-h-[300px]');
          expandBtn.querySelector('span')!.textContent = content.classList.contains('max-h-[300px]') ? 'Show More' : 'Show Less';
        }
      }
    };

    document.addEventListener('click', handleCodeActions);
    return () => document.removeEventListener('click', handleCodeActions);
  }, []);

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
    <div className="flex flex-col h-full w-full overflow-hidden bg-surface-base border-r border-border-subtle">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle bg-surface-card flex items-center justify-between shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={onNewChat}
            className="p-1.5 hover:bg-surface-accent rounded-lg transition-colors"
            title="New Chat"
          >
            <Plus className="w-4 h-4 text-text-subtle" />
          </button>
          <div className="p-1.5 bg-accent-intel/10 rounded-lg">
            <Sparkles className="w-4 h-4 text-accent-intel" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-text-primary tracking-tight uppercase leading-none">AI Assistant</span>
            <span className="text-[9px] text-accent-intel font-bold uppercase tracking-widest mt-0.5 leading-none">
              {settings.aiPersona === 'custom' ? 'Custom Persona' : settings.aiPersona}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              // This is a bit of a hack since we don't have direct access to updateSetting here
              // but we can trigger it via a custom event or just rely on the SettingsModal
              // For now, let's just show the status and link to settings
            }}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md border transition-all ${
              settings.aiChainOfThought 
                ? 'bg-accent-intel/10 border-accent-intel/30 text-accent-intel' 
                : 'bg-surface-accent/30 border-border-subtle text-text-subtle'
            }`}
            title={settings.aiChainOfThought ? "Chain of Thought Enabled" : "Chain of Thought Disabled"}
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${settings.aiChainOfThought ? 'animate-pulse' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider hidden sm:inline">CoT</span>
          </button>
          <div className="w-2 h-2 rounded-full bg-accent-ops animate-pulse" />
          <span className="text-[10px] text-text-subtle font-medium uppercase tracking-widest">Ready</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 scroll-smooth">
        <div className="max-w-4xl mx-auto p-4 space-y-6 pb-12">
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
        )}        {messages.map((msg, i) => (
          <MessageBubble
            key={msg.id || `msg-${i}-${msg.role}-${msg.content.substring(0, 20)}`}
            msg={msg}
            i={i}
            isUser={msg.role === 'user'}
            settings={settings}
            isStreaming={isStreaming}
            onReviewChange={onReviewChange}
            expandedThinking={expandedThinking}
            setExpandedThinking={setExpandedThinking}
            formatContent={formatContent}
            renderMarkdown={renderMarkdown}
            onSendMessage={onSendMessage}
          />
        ))}
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
        <div className="max-w-3xl mx-auto mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {agents.length > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-[#252526] border border-[#3c3c3c] rounded-md transition-all">
                <span className="text-[9px] font-bold text-[#858585] uppercase tracking-widest">Agent:</span>
                <select 
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="bg-transparent text-[10px] text-[#cccccc] font-medium focus:outline-none cursor-pointer"
                >
                  {agents.map(a => (
                    <option key={a.id} value={a.id} className="bg-[#252526]">{a.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              try {
                const data = await apiClient<{ logs: any[] }>('/api/logs?source=build');
                if (data.logs && data.logs.length > 0) {
                  const lastError = data.logs.reverse().find((l: any) => l.level === 'error');
                  if (lastError) {
                    onSendMessage(`I'm seeing this build error, can you fix it?\n\n\`\`\`\n${lastError.message}\n\`\`\``);
                  } else {
                    toast.info('No recent build errors found to fix.');
                  }
                } else {
                  toast.info('No build logs available.');
                }
              } catch (e) {
                toast.error('Failed to fetch logs');
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1 bg-[#007acc]/10 hover:bg-[#007acc]/20 text-[#007acc] border border-[#007acc]/30 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <Zap className="w-3 h-3" />
            Fix Build Error
          </button>
        </div>
        <form onSubmit={handleSubmit} className="relative group max-w-3xl mx-auto">
          <QuickActionOverlay 
            isVisible={showQuickActions && messages.length > 0 && !input} 
            onAction={(suggestion) => {
              setInput(suggestion);
              setShowQuickActions(false);
            }} 
          />
          
          {RW_contextSnippets.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2 px-1">
              {RW_contextSnippets.map((s, i) => (
                <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-accent-intel/10 border border-accent-intel/30 rounded-md">
                  <Code2 className="w-3 h-3 text-accent-intel" />
                  <span className="text-[10px] font-medium text-text-primary truncate max-w-[120px]">{s.path.split('/').pop()}</span>
                  <button onClick={() => removeContextSnippet(s.path)} className="text-text-subtle hover:text-accent-destructive transition-colors">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative flex items-end bg-surface-card border border-border-subtle rounded-2xl focus-within:border-accent-primary focus-within:ring-1 focus-within:ring-accent-primary/20 transition-all shadow-lg">
            <textarea
              value={input}
              onChange={(e) => {
                const val = e.target.value;
                setInput(val);
                if (val.endsWith('@')) {
                  setShowContextSelector(true);
                } else if (showContextSelector && !val.includes('@')) {
                  setShowContextSelector(false);
                }
              }}
              onKeyDown={handleKeyDown}
              placeholder="Ask GIDE to build something..."
              className="w-full bg-transparent px-4 py-3 pr-12 text-sm text-text-primary placeholder-text-subtle focus:outline-none resize-none min-h-[44px] max-h-[200px] custom-scrollbar"
              rows={1}
              disabled={isStreaming}
            />

            <AnimatePresence>
              {showContextSelector && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute bottom-full left-0 mb-2 w-64 bg-surface-card border border-border-subtle rounded-xl shadow-2xl p-2 z-[60]"
                >
                  <div className="text-[10px] font-bold text-text-subtle uppercase tracking-widest px-2 py-1 border-b border-border-subtle mb-1">
                    Inject Context
                  </div>
                  <div className="max-h-48 overflow-y-auto custom-scrollbar">
                    {Object.keys(RW_fileStore).slice(0, 10).map((path) => (
                      <button
                        key={path}
                        onClick={() => {
                          addContextSnippet({ path, content: RW_fileStore[path].content });
                          setInput(input.slice(0, -1)); // Remove @
                          setShowContextSelector(false);
                          toast.success(`Context added: ${path}`);
                        }}
                        className="w-full text-left px-2 py-2 hover:bg-surface-accent rounded-lg text-xs text-text-primary truncate transition-colors flex items-center gap-2"
                      >
                        <Code2 className="w-3.5 h-3.5 text-accent-intel" />
                        <span className="truncate">{path}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
          <p className="text-[9px] text-text-subtle font-bold uppercase tracking-widest">
            Enter to send
          </p>
          <div className="flex items-center gap-1 text-[9px] text-text-subtle font-bold uppercase tracking-widest">
            <Zap className="w-2.5 h-2.5 text-accent-security" />
            <span>AI Powered</span>
          </div>
        </div>
      </div>
    </div>
  );
}
