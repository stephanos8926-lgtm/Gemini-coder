import React, { useEffect, useRef } from 'react';
import '@xterm/xterm/css/xterm.css';
import { WasmTerminalEngine } from '../lib/wasm-terminal-engine';
import { filesystemService } from '../lib/filesystemService';

export const TerminalPanel: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WasmTerminalEngine | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new WasmTerminalEngine(containerRef.current);
    engineRef.current = engine;

    const handleUpdated = (data: { path: string; content: string }) => {
      engine.onFileChanged(data.path, data.content);
    };
    filesystemService.events.on('file-updated', handleUpdated);

    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      filesystemService.events.off('file-updated', handleUpdated);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="h-full w-full bg-[#0a0a0a] overflow-hidden flex flex-col">
      <div 
        ref={containerRef} 
        className="flex-1 w-full" 
        style={{ padding: '8px' }}
      />
    </div>
  );
};
