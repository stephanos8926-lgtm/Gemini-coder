# Implementation Plan: Client-Side WASM Terminal

## Goal
Implement a persistent, interactive terminal using XTerm.js and a WASM-based bash emulator (client-side execution).

## Architecture
- **Terminal UI**: `XTerm.js`.
- **Execution Engine**: WASM-Bash (e.g., `browser-bash` or `jerry-bash`).
- **Filesystem**: `memfs` (Synchronized with React's `FileStore` via a bridge).
- **Persistence**: Periodic syncing between `memfs` and `IndexedDB` (for sessions) and GCS (via existing `FilesystemService` for permanent storage).

## Milestones
1. [ ] **Dependencies**: Install XTerm.js, FitAddon, and WASM-Bash emulator.
2. [ ] **Emulator Bridge**: Implement `WasmTerminalEngine` (synchronize `memfs` <-> `FileStore`).
3. [ ] **UI Integration**: Build `TerminalPanel.tsx` with Xterm instance.
4. [ ] **Verification**: Test basic command execution and filesystem persistence.
