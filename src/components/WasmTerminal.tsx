import React, { useEffect, useRef } from 'react';
import { WasmTerminalEngine } from '../lib/wasm-terminal-engine';

/**
 * @component WasmTerminal
 * @description React wrapper for the WasmTerminalEngine, providing client-side terminal execution.
 */
export const WasmTerminal: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<WasmTerminalEngine | null>(null);

  useEffect(() => {
    if (containerRef.current && !engineRef.current) {
      engineRef.current = new WasmTerminalEngine(containerRef.current);
    }

    const handleResize = () => {
      engineRef.current?.resize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="w-full h-full bg-[#0a0a0a] min-h-[200px]">
      <div ref={containerRef} className="w-full h-full p-2" />
    </div>
  );
};
