import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { ForgeGuard } from '../utils/ForgeWrappers';
import { vol } from 'memfs';
import { Wasmer, init } from '@wasmer/sdk';

const guard = ForgeGuard.init('WasmTerminalEngine');

export class WasmTerminalEngine {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private currentLine: string = '';
  private history: string[] = [];
  private historyIndex: number = -1;
  private prompt: string = 'rapidforge@browser:~$ ';
  private wasmerInitialized: boolean = false;

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

    this.terminal.write('\x1b[1;32mRapidForge WASM Terminal v2.5.0 (Wasmer Enabled)\x1b[0m\r\n');
    this.terminal.write('\x1b[90mInitializing Wasmer SDK...\x1b[0m\r\n');
    
    this.initializeWasmer();
    this.terminal.write(this.prompt);

    this.setupListeners();
    this.initFilesystem();
  }

  private async initializeWasmer() {
    try {
      await init();
      this.wasmerInitialized = true;
      this.terminal.write('\x1b[32mWasmer Runtime Ready.\x1b[0m\r\n');
    } catch (err: any) {
      this.terminal.write(`\x1b[31mWasmer Initialization Failed: ${err.message}\x1b[0m\r\n`);
    }
  }

  private initFilesystem() {
    vol.fromJSON({
      '/home/rapidforge/README.md': '# Welcome to RapidForge\nThis is a real WASM-powered client-side sandbox.',
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
          // Native command emulation via memfs
          if (['ls', 'cat', 'pwd', 'echo', 'help', 'clear'].includes(action)) {
            this.executeNative(action, parts.slice(1));
          } else if (this.wasmerInitialized) {
            // Attempt to run via Wasmer (e.g. wasmer run python)
            // This is a simplified integration - in a real app, you'd fetch the .wasm or use a package
            this.terminal.write(`\x1b[90mRunning WASM package: ${action}...\x1b[0m\r\n`);
            try {
              const pkg = await Wasmer.fromRegistry(action);
              const instance = await pkg.entrypoint?.run({
                args: parts.slice(1),
              });
              const result = await instance?.wait();
              if (result?.stdout) this.terminal.write(result.stdout);
              if (result?.stderr) this.terminal.write(`\x1b[31m${result.stderr}\x1b[0m`);
            } catch (wasmErr: any) {
              this.terminal.write(`\x1b[31mWASM Exec Error: ${wasmErr.message}\x1b[0m\r\n`);
            }
          } else {
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

  private executeNative(action: string, args: string[]) {
    switch (action) {
        case 'ls':
          const files = vol.readdirSync('/');
          this.terminal.write(files.join('  ') + '\r\n');
          break;
        case 'cat':
          if (args[0]) {
            try {
              const content = vol.readFileSync(args[0], 'utf8');
              this.terminal.write(content + '\r\n');
            } catch {
              this.terminal.write(`cat: ${args[0]}: No such file or directory\r\n`);
            }
          } else {
            this.terminal.write('cat: missing file operand\r\n');
          }
          break;
        case 'help':
          this.terminal.write('Native: ls, cat, help, clear, pwd, echo\r\n');
          this.terminal.write('WASM: Attempting to run any other command via Wasmer Registry\r\n');
          break;
        case 'clear':
          this.terminal.clear();
          break;
        case 'pwd':
          this.terminal.write('/home/rapidforge\r\n');
          break;
        case 'echo':
          this.terminal.write(args.join(' ') + '\r\n');
          break;
    }
  }

  async onFileChanged(path: string, content: string) {
    vol.writeFileSync(path, content);
  }

  resize() {
    this.fitAddon.fit();
  }
}
