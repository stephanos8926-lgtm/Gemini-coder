import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ForgeGuard } from '../utils/ForgeWrappers';
import { vol } from 'memfs';

const guard = ForgeGuard.init('WasmTerminalEngine');

export class WasmTerminalEngine {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private currentLine: string = '';
  private history: string[] = [];
  private historyIndex: number = -1;
  private prompt: string = 'rapidforge@browser:~$ ';

  constructor(container: HTMLElement) {
    this.terminal = new Terminal({
      cursorBlink: true,
      theme: { 
        background: '#0a0a0a',
        foreground: '#d4d4d4',
        cursor: '#f8f8f8',
        selectionBackground: 'rgba(255, 255, 255, 0.1)'
      },
      fontSize: 13,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
      lineHeight: 1.2
    });
    
    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);
    this.terminal.open(container);
    this.fitAddon.fit();

    this.terminal.write('\x1b[1;32mRapidForge WASM Terminal v2.1.0\x1b[0m\r\n');
    this.terminal.write('\x1b[90mInitializing client-side execution environment...\x1b[0m\r\n\r\n');
    this.terminal.write(this.prompt);

    this.setupListeners();
    this.initFilesystem();
  }

  private initFilesystem() {
    // Initialize memfs with some basic dirs
    vol.fromJSON({
      '/home/rapidforge/README.md': '# Welcome to RapidForge\nThis is a client-side sandbox.',
      '/usr/bin/echo': '[Native WASM Binary]',
      '/tmp/.keep': ''
    });
  }

  private setupListeners() {
    this.terminal.onData(data => {
      this.handleInput(data);
    });
  }

  private handleInput(data: string) {
    switch (data) {
      case '\r': // Enter
        this.executeCommand();
        break;
      case '\u0003': // Ctrl+C
        this.terminal.write('^C\r\n' + this.prompt);
        this.currentLine = '';
        break;
      case '\u007f': // Backspace
        if (this.currentLine.length > 0) {
          this.currentLine = this.currentLine.slice(0, -1);
          this.terminal.write('\b \b');
        }
        break;
      default:
        if (data.length >= 1 && data.charCodeAt(0) > 31 && data.charCodeAt(0) < 127) {
          this.currentLine += data;
          this.terminal.write(data);
        }
    }
  }

  private async executeCommand() {
    const cmd = this.currentLine.trim();
    this.terminal.write('\r\n');

    if (cmd) {
      this.history.unshift(cmd);
      const parts = cmd.split(' ');
      const action = parts[0];

      try {
        await guard.protect(async () => {
          switch (action) {
            case 'ls':
              const files = vol.readdirSync('/');
              this.terminal.write(files.join('  ') + '\r\n');
              break;
            case 'cat':
              if (parts[1]) {
                const content = vol.readFileSync(parts[1], 'utf8');
                this.terminal.write(content + '\r\n');
              } else {
                this.terminal.write('cat: missing file operand\r\n');
              }
              break;
            case 'help':
              this.terminal.write('Available commands: ls, cat, help, clear, pwd, echo\r\n');
              break;
            case 'clear':
              this.terminal.clear();
              break;
            case 'pwd':
              this.terminal.write('/home/rapidforge\r\n');
              break;
            case 'echo':
              this.terminal.write(parts.slice(1).join(' ') + '\r\n');
              break;
            default:
              this.terminal.write(`\x1b[31msh: command not found: ${action}\x1b[0m\r\n`);
          }
        }, { path: `exec/${action}` });
      } catch (err: any) {
        this.terminal.write(`\x1b[31mError: ${err.message}\x1b[0m\r\n`);
      }
    }

    this.currentLine = '';
    this.terminal.write(this.prompt);
  }

  async onFileChanged(path: string, content: string) {
    vol.writeFileSync(path, content);
  }

  resize() {
    this.fitAddon.fit();
  }
}
