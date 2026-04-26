# SEMINDEX.md — Semantic Index for Gemini Context Caching

> **Purpose:** Lightweight file/line reference map for large codebases  
> **Usage:** Cache this file + system prompt, then reference entries by ID in queries  

---

## INDEX ENTRIES

### Entry Points
[INIT-001] src/main.tsx:1-20 | React application entry point, context provider wrapping
[INIT-002] server.ts:1-1931 | Main Express backend, WebSocket server, build orchestrator, LLM proxy

### Central Orchestration (Frontend)
[APP-001] src/App.tsx:60-150 | Main layout component, global state initialization, socket listeners
[APP-002] src/App.tsx:160-205 | Proxy hooks wiring (authHook, projectHook, fileOperationsHook)
[APP-003] src/App.tsx:238-340 | Desktop 3-column routing (react-resizable-panels)
[APP-004] src/App.tsx:342-370 | Mobile responsive viewer routing (RW_mobileView)

### Global State Modules (Zustand)
[STATE-001] src/store/useAppStore.ts:1-25 | UI layout state (sidebars, bottom panels)
[STATE-002] src/store/useAuthStore.ts:1-25 | Session keys, auth state
[STATE-003] src/store/useChatStore.ts:1-39 | Chat messages, streaming state, system modifiers
[STATE-004] src/store/useFileStore.ts:1-40 | Active file tracking, filesystem representation
[STATE-005] src/store/useWorkspaceStore.ts:1-35 | Current project/workspace tracking

### Core IDE Components
[UI-EDITOR] src/components/CodeEditor.tsx | Monaco editor integration and diff displays
[UI-TREE] src/components/FileTree.tsx | Sidebar filesystem explorer
[UI-CHAT] src/components/ChatPanel.tsx | Right sidebar AI conversation panel
[UI-TERM] src/components/TerminalPanel.tsx | XTerm.js integration for local shell execution
[UI-BOT] src/components/BottomPanel.tsx | Desktop bottom panel wrapper (Terminal/Search/Problems)
[UI-HDR] src/components/Header.tsx | Top navigation, auth controls, layout toggles
[UI-MOB] src/components/AdaptiveBottomSheet.tsx | Mobile handset utility sheet (Vaul wrapper)

### Core Hooks
[HOOK-001] src/hooks/useAppChat.ts | Connects UI to `streamGemini` and patch engine
[HOOK-002] src/hooks/useAppFileOperations.ts | File creation, saves, and deletes
[HOOK-003] src/hooks/useSocket.ts | WebSocket listener abstractions
[HOOK-004] src/hooks/useFileSystem.ts | Interaction with `filesystemService`

### Frontend Services & Intelligence
[SV-FILE] src/lib/filesystemService.ts | Interacts with server file manipulation APIs
[SV-GEM] src/lib/gemini.ts | Interfaces with LLM API, local streaming orchestration
[SV-AST] src/utils/astParser.ts | web-tree-sitter integration for AST code parsing
[SV-CTX] src/utils/ProjectContextEngine.ts | Multi-modal context retrieval for AI

### Automation & Security (Server/Isomorphic)
[SEC-001] src/security/patch-engine.ts | AST-aware automated code fixer / auto-linter wrapper
[SEC-002] src/scripts/run-audit.ts | Background security scanner
[SEC-003] src/utils/patchEngine/ | Utilities for patch validation, compiling, classification

### Backend & Middleware
[BE-FILE] src/utils/FileCacheManager.ts | SQLite multi-tiered cache for workspaces
[BE-TEL] src/utils/PersistenceManager.ts | Telemetry/Log SQLite backing store
[BE-TOOL] src/lib/toolExecutor.ts | Executes local system tools on behalf of AI

---

*Last indexed: 2026-04-23 | Target: Next-Gen GUI Audit*
