import React, { useEffect, useRef } from 'react';
import { Terminal as TerminalIcon, X } from 'lucide-react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useSocket } from '../hooks/useSocket';

interface TerminalPanelProps {
  onClose: () => void;
  workspace?: string;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({ onClose, workspace }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const socket = useSocket();

  useEffect(() => {
    if (!terminalRef.current || !socket) return;

    // Initialize xterm.js
    const term = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#007acc',
        selectionBackground: '#264f78',
      },
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      fontSize: 13,
      cursorBlink: true,
    });
    
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    
    term.open(terminalRef.current);
    
    // Fit needs a tiny delay to ensure container is rendered
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    setTimeout(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
      }
    }, 100);

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    // Handle terminal input
    term.onData((data) => {
      socket.emit('terminal:data', data);
    });

    // Handle socket output
    const onTerminalData = (data: string) => {
      // Replace \n with \r\n to prevent staircase effect in xterm.js
      const formattedData = data.replace(/(?<!\r)\n/g, '\r\n');
      term.write(formattedData);
    };

    const onTerminalExit = (code: number) => {
      term.write(`\r\n\x1b[33mProcess exited with code ${code}\x1b[0m\r\n`);
    };

    socket.on('terminal:data', onTerminalData);
    socket.on('terminal:exit', onTerminalExit);
    socket.on('connect_error', (err) => {
      term.write(`\r\n\x1b[31mSocket connection error: ${err.message}\x1b[0m\r\n`);
    });

    // Start the terminal session
    socket.emit('terminal:start', { cwd: workspace });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      socket.emit('terminal:resize', term.cols, term.rows);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
      socket.off('terminal:data', onTerminalData);
      socket.off('terminal:exit', onTerminalExit);
      term.dispose();
    };
  }, [socket, workspace]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl w-full max-w-4xl h-[70vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-[#3c3c3c] bg-[#252526]">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <TerminalIcon className="w-4 h-4 text-[#007acc]" />
            Terminal
          </h2>
          <button onClick={onClose} className="text-[#858585] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1 p-2 bg-[#1e1e1e] overflow-hidden">
          <div ref={terminalRef} className="w-full h-full" />
        </div>
      </div>
    </div>
  );
};
