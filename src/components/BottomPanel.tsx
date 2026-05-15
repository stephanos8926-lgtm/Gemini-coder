import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { RefreshCw, Play, FolderTree, Terminal, Loader2, Bug, Code2 } from 'lucide-react';
import type { FileStore } from '../lib/fileStore';
import { FileTree } from './FileTree';
import { DebugDashboard } from './DebugDashboard';
import { ForgeDashboard } from './ForgeDashboard';
import { detectLanguage, getExecutionMode } from '../utils/languageUtils';
import { ExecutionTerminal } from './ExecutionTerminal';
import { StaticLanguageNotice } from './StaticLanguageNotice';

const ToolsPanel = lazy(() => import('./ToolsPanel').then(m => ({ default: m.ToolsPanel })));

import { WasmTerminal } from './WasmTerminal';

interface BottomPanelProps {
  files: FileStore;
  activeTab: 'preview' | 'tree' | 'tools' | 'debug' | 'forge' | 'terminal';
  onTabChange: (tab: 'preview' | 'tree' | 'tools' | 'debug' | 'forge' | 'terminal') => void;
  onSelectFile: (path: string) => void;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onImportZip: () => void;
  onDeleteFile?: (path: string) => void;
  hasPreviewableFiles?: boolean;
  activeFile?: string;
}

export function BottomPanel({ files, activeTab, onTabChange, onSelectFile, onDownloadFile, onDownloadZip, onImportZip, onDeleteFile, hasPreviewableFiles = true, activeFile }: BottomPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const lang = activeFile ? detectLanguage(activeFile) : 'html';
  const mode = getExecutionMode(lang);

  const getTabClass = (tab: string) => {
    const isActive = activeTab === tab;
    const accentColor = tab === 'forge' ? 'border-accent-intel text-accent-intel' : 'border-accent-intel text-text-primary';

    return `flex items-center gap-2 px-4 py-2 text-sm transition-colors focus-visible:ring-inset focus-visible:ring-1 focus-visible:ring-accent-intel outline-none ${
      isActive
        ? `bg-surface-base border-t-2 ${accentColor}`
        : 'bg-surface-accent/50 text-text-subtle hover:bg-surface-accent border-t-2 border-transparent'
    }`;
  };

  const refreshPreview = () => {
    // Find the most recently generated .html file, or index.html
    let htmlFile = Object.keys(files).find(p => p.endsWith('.html'));
    if (files['index.html']) htmlFile = 'index.html';

    if (htmlFile) {
      const content = files[htmlFile].content;
      // Inject CSS and JS files if they exist
      let injectedContent = content;
      
      // Simple injection for local files referenced in HTML
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const cssFiles = Object.keys(files).filter(p => p.endsWith('.css'));
      cssFiles.forEach(css => {
        const filename = css.split('/').pop() || '';
        if (injectedContent.includes(css) || injectedContent.includes(filename)) {
          injectedContent = injectedContent.replace(
            new RegExp(`<link.*?href=["'].*?${escapeRegExp(filename)}.*?["'].*?>`, 'g'),
            `<style>${files[css].content}</style>`
          );
        }
      });

      const jsFiles = Object.keys(files).filter(p => p.endsWith('.js'));
      jsFiles.forEach(js => {
        const filename = js.split('/').pop() || '';
        if (injectedContent.includes(js) || injectedContent.includes(filename)) {
          injectedContent = injectedContent.replace(
            new RegExp(`<script.*?src=["'].*?${escapeRegExp(filename)}.*?["'].*?></script>`, 'g'),
            `<script>${files[js].content}</script>`
          );
        }
      });

      const blob = new Blob([injectedContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  useEffect(() => {
    if (activeTab === 'preview') {
      refreshPreview();
    }
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [activeTab, files]);

  return (
    <div className="flex flex-col h-full bg-surface-base border-t border-border-subtle">
      <div className="flex items-center bg-surface-card border-b border-border-subtle">
        {hasPreviewableFiles && (
          <button
            onClick={() => onTabChange('preview')}
            className={getTabClass('preview')}
          >
            {mode === 'preview' ? <Play className="w-4 h-4" /> : mode === 'execute' ? <Terminal className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
            {mode === 'preview' ? 'Preview' : mode === 'execute' ? 'Run' : 'Build'}
          </button>
        )}
        <button
          onClick={() => onTabChange('tree')}
          className={getTabClass('tree')}
        >
          <FolderTree className="w-4 h-4" />
          File Details
        </button>
        <button
          onClick={() => onTabChange('tools')}
          className={getTabClass('tools')}
        >
          <Terminal className="w-4 h-4" />
          Tools
        </button>
        <button
          onClick={() => onTabChange('debug')}
          className={getTabClass('debug')}
        >
          <Bug className="w-4 h-4" />
          Debugger
        </button>
        <button
          onClick={() => onTabChange('terminal')}
          className={getTabClass('terminal')}
        >
          <Terminal className="w-4 h-4" />
          Terminal
        </button>
        <button
          onClick={() => onTabChange('forge')}
          className={getTabClass('forge')}
        >
          <RefreshCw className="w-4 h-4" />
          Forge Intelligence
        </button>
        <div className="flex-1" />
        {activeTab === 'preview' && hasPreviewableFiles && (
          <button
            onClick={refreshPreview}
            className="flex items-center gap-2 px-4 py-2 text-sm text-accent-intel hover:bg-surface-accent transition-colors focus-visible:ring-1 focus-visible:ring-accent-intel outline-none"
            aria-label="Refresh preview"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'preview' && hasPreviewableFiles ? (
          mode === 'preview' ? (
            previewUrl ? (
              <iframe
                ref={iframeRef}
                src={previewUrl}
                className="w-full h-full border-none bg-white"
                sandbox="allow-scripts allow-same-origin"
                title="Preview"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[#858585] italic text-xs">
                No local preview available for this configuration.
              </div>
            )
          ) : mode === 'execute' ? (
            <ExecutionTerminal 
              code={activeFile ? files[activeFile]?.content || '' : ''} 
              language={lang} 
            />
          ) : (
            <StaticLanguageNotice language={lang} />
          )
        ) : activeTab === 'tools' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-text-subtle">
              <Loader2 className="w-6 h-6 animate-spin text-accent-intel" />
            </div>
          }>
            <ToolsPanel />
          </Suspense>
        ) : activeTab === 'terminal' ? (
          <WasmTerminal />
        ) : activeTab === 'debug' ? (
          <DebugDashboard />
        ) : activeTab === 'forge' ? (
          <ForgeDashboard />
        ) : (
          <FileTree
            files={files}
            selectedFile={null}
            onSelect={onSelectFile}
            onDownload={onDownloadFile}
            onDownloadZip={onDownloadZip}
            onImportZip={onImportZip}
            onDelete={onDeleteFile}
            showDetails={true}
          />
        )}
      </div>
    </div>
  );
}
