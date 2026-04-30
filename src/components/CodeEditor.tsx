import React, { useState, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { FolderTree, Sparkles, MessageSquare, Wand2, Bug } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as monaco from 'monaco-editor';
import { activeTabTracker } from '../lib/activeTabTracker';
import { callGemini } from '../lib/gemini';
import { settingsStore } from '../lib/settingsStore';

interface CodeEditorProps {
  content: string;
  filename: string;
  onOpenFiles?: () => void;
  onChange?: (value: string | undefined) => void;
  onAiAction?: (type: 'explain' | 'refactor' | 'fix', code: string) => void;
  targetLine?: number;
  onLineRevealed?: () => void;
  settings: {
    fontSize: number;
    tabSize: number;
    lineNumbers: boolean;
    wordWrap: 'on' | 'off';
    minimap: boolean;
    fontFamily: string;
    editorTheme: 'vs-dark' | 'light' | 'hc-black';
    showErrorHighlighting: boolean;
  };
}

export function CodeEditor({ content, filename, onOpenFiles, onChange, onAiAction, targetLine, onLineRevealed, settings }: CodeEditorProps) {
  const [selection, setSelection] = useState<{ text: string; startLine: number; endLine: number } | null>(null);
  const [toolbarPos, setToolbarPos] = useState<{ x: number; y: number } | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const selectionDisposable = useRef<monaco.IDisposable | null>(null);

  useEffect(() => {
    activeTabTracker.setActiveTab(filename);
  }, [filename]);

  useEffect(() => {
    if (editorRef.current && targetLine) {
      editorRef.current.revealLineInCenter(targetLine);
      editorRef.current.setPosition({ lineNumber: targetLine, column: 1 });
      editorRef.current.focus();
      onLineRevealed?.();
    }
  }, [targetLine, onLineRevealed]);

  const handleEditorDidMount: OnMount = (editor, monacoInstance) => {
    editorRef.current = editor;

    // Register Inline Ghost Text Provider for AI Code Completion
    monacoInstance.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model: any, position: any, context: any, token: any) => {
        // Only trigger if at the end of a line or after typing a character
        if (context.triggerKind === monaco.languages.InlineCompletionTriggerKind.Explicit) return { items: [] };

        const prefix = model.getValueInRange({
          startLineNumber: Math.max(1, position.lineNumber - 30),
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        const suffix = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: Math.min(model.getLineCount(), position.lineNumber + 30),
          endColumn: model.getLineMaxColumn(position.lineNumber + 30) || 1,
        });

        if (!prefix.trim()) return { items: [] };

        try {
          const appSettings = settingsStore.get();
          const prompt = `You are an AI code completion engine. Continue the code exactly where the <cursor> is. Do not wrap in markdown blocks, just return the raw text to be inserted. Provide at most 2-3 lines of completion or a single logical block.\n\nCode before cursor:\n${prefix}\n\nCode after cursor:\n${suffix}`;
          
          const completion = await callGemini(
            [{ role: 'user', content: prompt }],
            appSettings.defaultModel,
            '', // server side API key
            'You are an inline code autocomplete ghost text provider.',
            0.1
          );

          if (completion && completion.trim().length > 0) {
            return {
              items: [{
                insertText: completion,
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
              }]
            };
          }
        } catch (e) {
          console.error("AI Completion error", e);
        }
        return { items: [] };
      },
      freeInlineCompletions: () => {}
    });

    // Configure diagnostics based on settings
    monacoInstance.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: !settings.showErrorHighlighting,
      noSyntaxValidation: !settings.showErrorHighlighting,
    });

    // FIXED: Dispose previous listener to prevent memory leaks
    if (selectionDisposable.current) { selectionDisposable.current.dispose(); }
    selectionDisposable.current = editor.onDidChangeCursorSelection((e: monaco.editor.ICursorSelectionChangedEvent) => {
      const selection = editor.getSelection();
      const model = editor.getModel();
      if (!selection || !model) return;

      const text = model.getValueInRange(selection);
      if (text && text.trim().length > 0) {
        const coords = editor.getScrolledVisiblePosition(selection.getStartPosition());
        const domNode = editor.getDomNode();
        if (coords && domNode) {
          const rect = domNode.getBoundingClientRect();
          setToolbarPos({
            x: rect.left + coords.left,
            y: rect.top + coords.top - 40 // Show above selection
          });
          setSelection({
            text,
            startLine: selection.startLineNumber,
            endLine: selection.endLineNumber
          });
        }
      } else {
        setSelection(null);
        setToolbarPos(null);
      }
    });
  };

  // Hide toolbar on scroll or click elsewhere
  useEffect(() => {
    const handleScroll = () => {
      setSelection(null);
      setToolbarPos(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, []);

  useEffect(() => { return () => { if (selectionDisposable.current) selectionDisposable.current.dispose(); }; }, []);

  if (!filename) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-subtle text-sm italic h-full">
        Select a file to view its contents
      </div>
    );
  }

  const getLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      html: 'html',
      css: 'css',
      json: 'json',
      md: 'markdown',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      go: 'go',
      rs: 'rust',
      php: 'php',
      rb: 'ruby',
      sql: 'sql',
      sh: 'shell',
      yaml: 'yaml',
      yml: 'yaml',
      xml: 'xml',
    };
    return languageMap[ext] || 'plaintext';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-base overflow-hidden">
      <div className="flex items-center px-4 py-2 bg-surface-card border-b border-border-subtle text-sm text-text-primary">
        {onOpenFiles && (
          <button 
            onClick={onOpenFiles}
            className="sm:hidden mr-3 p-1.5 hover:bg-border-subtle rounded-md transition-colors text-text-subtle hover:text-text-primary flex items-center gap-1.5"
          >
            <FolderTree className="w-4 h-4" />
            <span>Files</span>
          </button>
        )}
        <span className="font-mono">{filename}</span>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <Editor
          height="100%"
          language={getLanguage(filename)}
          theme={settings.editorTheme}
          value={content}
          onChange={onChange}
          onMount={handleEditorDidMount}
          options={{
            fontSize: settings.fontSize,
            fontFamily: settings.fontFamily,
            minimap: { 
              enabled: settings.minimap,
              side: 'right',
              showSlider: 'mouseover'
            },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            folding: true,
            foldingHighlight: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            lineNumbers: settings.lineNumbers ? 'on' : 'off',
            renderWhitespace: 'none',
            wordWrap: settings.wordWrap,
            tabSize: settings.tabSize,
            contextmenu: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true
            },
            parameterHints: { enabled: true },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            renderLineHighlight: 'all',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            scrollbar: {
              vertical: 'visible',
              horizontal: 'visible',
              useShadows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
          }}
        />

        <AnimatePresence>
          {toolbarPos && selection && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{ 
                position: 'fixed',
                left: toolbarPos.x,
                top: toolbarPos.y,
                zIndex: 1000
              }}
              className="flex items-center gap-0.5 bg-surface-card border border-border-subtle rounded-lg shadow-2xl p-1 overflow-hidden"
            >
              <button
                onClick={() => {
                  onAiAction?.('explain', selection.text);
                  setSelection(null);
                  setToolbarPos(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors text-xs font-medium"
                title="Explain this code"
              >
                <MessageSquare className="w-3.5 h-3.5 text-accent-intel" />
                <span>Explain</span>
              </button>
              <div className="w-[1px] h-4 bg-[#3c3c3c] mx-0.5" />
              <button
                onClick={() => {
                  onAiAction?.('refactor', selection.text);
                  setSelection(null);
                  setToolbarPos(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors text-xs font-medium"
                title="Refactor this code"
              >
                <Wand2 className="w-3.5 h-3.5 text-accent-intel" />
                <span>Refactor</span>
              </button>
              <div className="w-[1px] h-4 bg-[#3c3c3c] mx-0.5" />
              <button
                onClick={() => {
                  onAiAction?.('fix', selection.text);
                  setSelection(null);
                  setToolbarPos(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 hover:bg-[#3c3c3c] rounded text-[#cccccc] hover:text-white transition-colors text-xs font-medium"
                title="Fix bugs"
              >
                <Bug className="w-3.5 h-3.5 text-text-subtle" />
                <span>Fix</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
