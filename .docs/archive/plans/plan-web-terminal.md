# Implementation Plan: Sandboxed Web Terminal Infrastructure

## Goal
Implement a persistent, real-time, event-driven web terminal using XTerm.js, Socket.io, and containerized sandboxing for workspace isolation.

## Architecture: The "Event-Driven Sidecar"
- **Frontend**: XTerm.js + `useTerminal` hook + Socket.io (client).
- **Backend (Runtime)**: WebSocket gateway (Socket.io) to proxy terminal traffic.
- **Sandboxed Execution**: Ephemeral Bash session (via `child_process` within a memory/CPU hardened node container).
- **Synchronization**: `inotify`-based watcher inside the sandbox triggers Socket.io events for file updates.
- **Persistence**: Binder mount of user workspace to GCS via GCS FUSE mapping.

## Key Constraints & Risks
- **WARNING**: Execution environment (Cloud Run) limitations regarding Docker spawning. We will attempt process-level isolation first (Linux Namespaces/Cgroups) before attempting full Docker-in-Docker.
- **Concurrency**: Requires strict mutex locking on files to prevent simultaneous IDE and Terminal write collisions.

## Milestones
1. [ ] **Transport Layer**: Implement `TerminalSocket` server and client.
2. [ ] **Sandboxed Execution Engine**: Implement the `TerminalSessionController`.
3. [ ] **UI Integration**: Build `TerminalPanel` with XTerm.js.
4. [ ] **Live Sync**: Implement `inotify` watcher and file-event listener.
5. [ ] **Persistence**: Bind GCS FUSE for workspace persistence.

## Security
- **Strict Whitelist**: Although we jail the filesystem, shell commands remain risk-prone. We will implement basic input blocklisting (e.g., `sudo`, `rm -rf /`, network traffic tools).
- **Resource Limits**: Memory/CPU hard limits on the terminal process.
