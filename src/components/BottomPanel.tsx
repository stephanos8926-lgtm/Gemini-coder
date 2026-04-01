import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { RefreshCw, Play, FolderTree, Terminal, Loader2 } from 'lucide-react';
import { FileStore } from '../lib/fileStore';
import { FileTree } from './FileTree';

const ToolsPanel = lazy(() => import('./ToolsPanel').then(m => ({ default: m.ToolsPanel })));

interface BottomPanelProps {
  files: FileStore;
  activeTab: 'preview' | 'tree' | 'tools';
  onTabChange: (tab: 'preview' | 'tree' | 'tools') => void;
  onSelectFile: (path: string) => void;
  onDownloadFile: (path: string) => void;
  onDownloadZip: () => void;
  onDeleteFile?: (path: string) => void;
  hasPreviewableFiles?: boolean;
}

export function BottomPanel({ files, activeTab, onTabChange, onSelectFile, onDownloadFile, onDownloadZip, onDeleteFile, hasPreviewableFiles = true }: BottomPanelProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refreshPreview = () => {
    // Find the most recently generated .html file, or index.html
    let htmlFile = Object.keys(files).find(p => p.endsWith('.html'));
    if (files['index.html']) htmlFile = 'index.html';

    if (htmlFile) {
      const content = files[htmlFile].content;
      // Inject CSS and JS files if they exist
      let injectedContent = content;
      
      // Simple injection for local files referenced in HTML
      // This is a basic implementation. A real bundler would be better.
      const cssFiles = Object.keys(files).filter(p => p.endsWith('.css'));
      cssFiles.forEach(css => {
        if (injectedContent.includes(css) || injectedContent.includes(css.split('/').pop()!)) {
          injectedContent = injectedContent.replace(
            new RegExp(`<link.*?href=["'].*?${css.split('/').pop()}.*?["'].*?>`, 'g'),
            `<style>${files[css].content}</style>`
          );
        }
      });

      const jsFiles = Object.keys(files).filter(p => p.endsWith('.js'));
      jsFiles.forEach(js => {
        if (injectedContent.includes(js) || injectedContent.includes(js.split('/').pop()!)) {
          injectedContent = injectedContent.replace(
            new RegExp(`<script.*?src=["'].*?${js.split('/').pop()}.*?["'].*?></script>`, 'g'),
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
    <div className="flex flex-col h-full bg-[#1e1e1e] border-t border-[#3c3c3c]">
      <div className="flex items-center bg-[#252526] border-b border-[#3c3c3c]">
        {hasPreviewableFiles && (
          <button
            onClick={() => onTabChange('preview')}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              activeTab === 'preview'
                ? 'bg-[#1e1e1e] text-[#d4d4d4] border-t-2 border-[#007acc]'
                : 'bg-[#2d2d2d] text-[#858585] hover:bg-[#333333] border-t-2 border-transparent'
            }`}
          >
            <Play className="w-4 h-4" />
            Preview
          </button>
        )}
        <button
          onClick={() => onTabChange('tree')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            activeTab === 'tree'
              ? 'bg-[#1e1e1e] text-[#d4d4d4] border-t-2 border-[#007acc]'
              : 'bg-[#2d2d2d] text-[#858585] hover:bg-[#333333] border-t-2 border-transparent'
          }`}
        >
          <FolderTree className="w-4 h-4" />
          File Details
        </button>
        <button
          onClick={() => onTabChange('tools')}
          className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
            activeTab === 'tools'
              ? 'bg-[#1e1e1e] text-[#d4d4d4] border-t-2 border-[#007acc]'
              : 'bg-[#2d2d2d] text-[#858585] hover:bg-[#333333] border-t-2 border-transparent'
          }`}
        >
          <Terminal className="w-4 h-4" />
          Tools
        </button>
        <div className="flex-1" />
        {activeTab === 'preview' && hasPreviewableFiles && (
          <button
            onClick={refreshPreview}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#007acc] hover:bg-[#2d2d2d] transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'preview' && hasPreviewableFiles ? (
          previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              className="w-full h-full border-none bg-white"
              sandbox="allow-scripts allow-same-origin"
              title="Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-[#858585] italic">
              No HTML file found to preview. Ask GIDE to create an index.html.
            </div>
          )
        ) : activeTab === 'tools' ? (
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-[#858585]">
              <Loader2 className="w-6 h-6 animate-spin text-[#007acc]" />
            </div>
          }>
            <ToolsPanel />
          </Suspense>
        ) : (
          <FileTree
            files={files}
            selectedFile={null}
            onSelect={onSelectFile}
            onDownload={onDownloadFile}
            onDownloadZip={onDownloadZip}
            onDelete={onDeleteFile}
            showDetails={true}
          />
        )}
      </div>
    </div>
  );
}
