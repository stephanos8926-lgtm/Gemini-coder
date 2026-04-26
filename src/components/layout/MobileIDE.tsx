import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Sparkles, BrainCircuit, Activity, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { Message } from '../../lib/gemini';
import type { FileStore } from '../../lib/fileStore';
import type { Settings } from '../../lib/settingsStore';

// Collapsible Tool Output specified by user guide
function CollapsibleToolOutput({ tool }: { tool: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const getStatusDisplay = () => {
    // If we have an explicit error or response contains an error
    const isError = tool.error || (typeof tool.response === 'object' && tool.response !== null && ('error' in tool.response || ('stderr' in tool.response && tool.response.stderr)));
    const isSuccess = !isError && tool.response !== undefined;
    
    if (isError) return { icon: '✗', color: 'text-red-500', text: 'Error' };
    if (isSuccess) return { icon: '✓', color: 'text-green-500', text: 'Success' };
    return { icon: '⋯', color: 'text-yellow-500', text: 'Running...' };
  };
  
  const status = getStatusDisplay();
  
  return (
    <div className="my-3 border border-[#3c3c3c] bg-[#1e1e1e] rounded-lg overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-[#252526] flex items-center justify-between hover:bg-[#2d2d2d] transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <motion.div animate={{ rotate: isOpen ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4 text-[#858585] flex-shrink-0" />
          </motion.div>
          <Activity className="w-3.5 h-3.5 text-[#007acc] flex-shrink-0" />
          <span className="font-mono text-xs text-[#cccccc] truncate">{tool.name || 'Tool Call'}</span>
          <span className={`text-[10px] uppercase font-bold tracking-widest ${status.color} flex-shrink-0 ml-2`}>
            {status.icon} {" "}{status.text}
          </span>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-[#1a1a1a]"
          >
            <div className="p-3 border-t border-[#3c3c3c] space-y-3">
              {tool.args && (
                <div>
                  <div className="text-[10px] text-[#858585] font-bold uppercase tracking-widest mb-1.5">Input Arguments</div>
                  <pre className="text-[11px] text-[#3794ff] font-mono break-all whitespace-pre-wrap bg-[#0d0d0d] p-2 rounded border border-[#2d2d2d]">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                </div>
              )}
              {tool.response && (
                <div>
                  <div className="text-[10px] text-[#858585] font-bold uppercase tracking-widest mb-1.5">Output Response</div>
                  <pre className={`text-[11px] font-mono break-all whitespace-pre-wrap bg-[#0d0d0d] p-2 rounded border border-[#2d2d2d] ${status.text === 'Error' ? 'text-red-400' : 'text-[#cccccc]'}`}>
                    {typeof tool.response === 'string' ? tool.response : JSON.stringify(tool.response, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Markdown helper
const renderMarkdown = (content: string) => {
  const rawHtml = marked.parse(content) as string;
  const cleanHtml = DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['data-code', 'data-large'],
    ADD_TAGS: ['svg', 'path', 'rect']
  });
  return { __html: cleanHtml };
};

export interface MobileIDEProps {
  messages: Message[];
  onSendMessage: (msg: string) => void;
  isStreaming: boolean;
  files: FileStore;
  workspaceName: string;
  settings: Settings;
  showSidebar: boolean;
  setShowSidebar: (v: boolean) => void;
  showPreview: boolean;
  setShowPreview: (v: boolean) => void;
  showSettings: boolean;
  setShowSettings: (v: boolean) => void;
  mobileView: 'chat' | 'editor' | 'preview';
  setMobileView: (view: 'chat' | 'editor' | 'preview') => void;
  fileTreeComponent?: React.ReactNode;
  previewComponent?: React.ReactNode;
  settingsComponent?: React.ReactNode;
  editorComponent?: React.ReactNode;
}

export function MobileIDE({
  messages,
  onSendMessage,
  isStreaming,
  files,
  workspaceName,
  settings,
  showSidebar,
  setShowSidebar,
  showPreview,
  setShowPreview,
  showSettings,
  setShowSettings,
  mobileView,
  setMobileView,
  fileTreeComponent,
  previewComponent,
  settingsComponent,
  editorComponent
}: MobileIDEProps) {
  
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isStreaming) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#1e1e1e] relative">
      
      {/* HEADER IS DELEGATED TO APP.TSX or we use our own? Guide says MobileIDE has its own. 
          But wait, App.tsx already has a global header.
          Let's provide the flex-1 chat area and fixed input area inside this designated container. 
          We'll assume the top global header remains for now, and we just orchestrate the chat. */}

      {/* CHAT AREA - SCROLLABLE MIDDLE */}
      <div className="flex-1 overflow-y-auto pb-36 custom-scrollbar">
        <div className="max-w-3xl mx-auto p-3 space-y-4">
          {messages.map((msg, i) => {
             const isUser = msg.role === 'user';
             
             // Extract thinking and format
             const thinkingMatch = msg.content?.match(/<thinking>([\s\S]*?)<\/thinking>/);
             const mainContent = msg.content ? msg.content.replace(/<thinking>[\s\S]*?<\/thinking>/, '').trim() : '';
             const thinking = thinkingMatch ? thinkingMatch[1] : null;

             return (
               <div key={msg.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-6`}>
                 <div className="flex items-center gap-2 mb-1.5 px-1">
                   <span className="text-[10px] text-[#858585] font-bold uppercase tracking-widest">
                     {isUser ? (settings.userName || 'You') : 'GIDE AI'}
                   </span>
                 </div>
                 
                 <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed relative group break-words max-w-[95%] sm:max-w-[85%] overflow-hidden shadow-sm ${
                    isUser 
                      ? 'bg-[#007acc] text-white border border-[#007acc]/50 rounded-tr-none' 
                      : 'bg-[#252526] text-[#cccccc] border border-[#3c3c3c] rounded-tl-none'
                  }`}>
                    {mainContent && (
                      <div 
                        className="markdown-body prose prose-invert prose-sm max-w-none overflow-x-auto break-words prose-a:text-[#3794ff]"
                        dangerouslySetInnerHTML={renderMarkdown(mainContent)}
                      />
                    )}

                    {/* Collapsible Tool Outputs mapped from functionCalls and functionResponses */}
                    {msg.functionCalls && msg.functionCalls.map((call, idx) => {
                      // Attempt to link response with call if exists sequentially
                      const responseBlock = msg.functionResponses?.[idx];
                      const toolComb = {
                        name: call.name,
                        args: call.args,
                        response: responseBlock?.response,
                        error: false // Set later if format allows
                      };
                      return <CollapsibleToolOutput key={`tool-${idx}`} tool={toolComb} />;
                    })}
                 </div>
               </div>
             );
          })}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* INPUT AREA - FIXED BOTTOM */}
      <div className="absolute top-auto bottom-0 left-0 right-0 bg-[#252526] border-t border-[#3c3c3c] shadow-2xl z-40">
        <div className="p-3 space-y-2 max-w-3xl mx-auto">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe what to build..."
            rows={1}
            className="w-full resize-none rounded-xl border border-[#3c3c3c] bg-[#1e1e1e] text-[#cccccc] px-4 py-3 text-sm min-h-[44px] max-h-[120px] focus:outline-none focus:border-[#007acc] focus:ring-1 focus:ring-[#007acc] custom-scrollbar"
          />
          
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex gap-2">
              <span className="text-[10px] text-[#858585] uppercase tracking-widest font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#007acc]" />
                {settings.aiPersona === 'custom' ? 'Custom' : settings.aiPersona}
              </span>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="px-5 py-2 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-lg font-bold text-[11px] uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2 shadow-lg shadow-[#007acc]/20 transition-colors"
            >
              {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* FILE SIDEBAR OVERLAY */}
      {showSidebar && (
        <>
          <div 
            onClick={() => setShowSidebar(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />
          <aside className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-[#1e1e1e] border-r border-[#3c3c3c] text-white z-50 shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-left">
            <div className="p-4 border-b border-[#3c3c3c] flex items-center justify-between bg-[#252526]">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#cccccc]">Files</h2>
              <button 
                onClick={() => setShowSidebar(false)}
                className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {fileTreeComponent}
            </div>
          </aside>
        </>
      )}

      {/* PREVIEW OVERLAY */}
      {showPreview && (
        <>
          <div 
            onClick={() => setShowPreview(false)} 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          />
          <div 
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-[#1e1e1e] rounded-t-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 border-b border-[#3c3c3c] px-4 flex items-center justify-between bg-[#252526] shrink-0">
              <h3 className="text-[11px] font-bold uppercase tracking-widest text-[#cccccc]">Preview</h3>
              <button 
                onClick={() => setShowPreview(false)}
                className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative bg-white">
              {previewComponent}
            </div>
          </div>
        </>
      )}

      {/* EDITOR OVERLAY */}
      {mobileView === 'editor' && (
        <div className="absolute inset-0 bg-[#1e1e1e] z-40 flex flex-col animate-in fade-in slide-in-from-bottom-8">
          <div className="h-12 border-b border-[#3c3c3c] px-2 flex items-center justify-between bg-[#252526] shrink-0">
            <button 
              onClick={() => setMobileView('chat')}
              className="flex items-center gap-1 px-3 py-1.5 hover:bg-[#3c3c3c] rounded-lg transition-colors text-xs font-bold text-[#cccccc] uppercase tracking-widest"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              <span>Back to Chat</span>
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {editorComponent}
          </div>
        </div>
      )}
      
    </div>
  );
}
