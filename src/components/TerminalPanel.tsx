import React, { useEffect, useRef } from 'react';
import 'xterm/css/xterm.css';
import { WasmTerminalEngine } from '../lib/wasm-terminal-engine';
import { filesystemService } from '../lib/filesystemService';

export const TerminalPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WasmTerminalEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new WasmTerminalEngine(containerRef.current);
    engineRef.current = engine;

    const handleUpdated = (data: { path: string; content: string }) => engine.onFileChanged(data.path, data.content);
    const handleCreated = (data: { path: string; isDir: boolean }) => engine.onFileCreated(data.path, data.isDir);
    const handleDeleted = (data: { path: string }) => engine.onFileDeleted(data.path);

    filesystemService.events.on('file-updated', handleUpdated);
    filesystemService.events.on('file-created', handleCreated);
    filesystemService.events.on('file-deleted', handleDeleted);

    return () => {
      filesystemService.events.off('file-updated', handleUpdated);
      filesystemService.events.off('file-created', handleCreated);
      filesystemService.events.off('file-deleted', handleDeleted);
    };
  }, []);

  return <div ref={containerRef} className="h-full w-full bg-[#1e1e1e] p-2" />;
};
