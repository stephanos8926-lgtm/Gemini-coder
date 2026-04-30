# agents.md — Project Knowledge Base
> Living memory system for AI Studio development sessions  
> Updated: 2026-04-27

---

## META-INSTRUCTIONS (How to Use This File)

### Purpose
This file serves as your persistent memory across sessions. It contains:
1. **Meta-instructions** (this section) — how to use the .docs/ planning system
2. **Learned patterns** (below) — bugs, gotchas, solutions discovered during development
3. **Reflection checkpoints** (bottom) — periodic progress summaries

### When to Read This File
- ✓ **Session start** (ALWAYS) — sync state before any work
- ✓ **Before architectural decisions** — check for relevant patterns
- ✓ **When debugging** — look for similar past issues

### Update Strategy: IN-PLACE CURATION
- Consolidate duplicates, remove superseded info, keep sections tidy.

---

## LEARNED PATTERNS

### Project Setup & Dependencies
[2026-04-27] BUILD-PATTERN: Empty build artifacts during deployment
- **Resolution**: 
  - Ensure `vite build` entries for multiple HTML files are correct in `vite.config.ts`.
  - Standardize on `*` for Express 4 wildcard routes.

[2026-04-27] DEPLOYMENT-PATTERN: TypeError in core services during boot
- **Resolution**:
  - Robust SSR detection: Use `typeof window === 'undefined'` in addition to `import.meta.env.SSR`.
  - Initialization Safety: Use optional chaining when accessing configuration/services during class construction.

### Mobile UI & CLI Workflow Parity Research [2026-04-28]
- **Mobile Paradigm**: Shift to bottom sheets, keyboard-attached action bars, and gesture-driven UI rather than stacked viewports.
- **Input Structure (OpenWebUI inspired)**: Chat inputs should support inline tagging (`@file`, `#workspace`), token size indicators, and non-blocking multimodal artifact pillars.
- **CLI Intelligence**: To achieve Claude Code/Qwen IDE parity, terminal capabilities must be seamlessly piped into sandboxed PTY environments where agents self-correct and chain tools without constant user confirmation.
- **Symbol Aging & Remote Sync**: Future persistence models must incorporate symbol decay (garbaging collection for stale context weights) and robust CRDT-like syncing for offline resiliency.
- **Long Horizon Agents (Antigravity architecture)**: Agentic swarms require a disconnected, asynchronous lifecycle. We implemented `BackgroundTaskManager` (Node EventEmitter) with a `TaskPanel` GUI to view, monitor progress, pause, and cancel parallel agents running apart from immediate HTTP request cycles.

### Multi-Tenant Partitioning Audit [2026-04-28]
- **NexusPersistence**: [COMPLETED] Refactored to include `TenantContext` (userId + workspaceId). Keys are now prefixed with `u:{uid}:w:{wid}:` to prevent project leakage in state and weights.
- **ProjectContextEngine**: [COMPLETED] Refactored from Singleton to Multi-Instance Registry. Each instance is strictly scoped to a specific user and workspace.
- **Server API**: [IN PROGRESS] Audit of server endpoints to ensure tenant identifiers are passed to all underlying services.
- **Vulnerability Found**: `globalSecurityIssues` and `chatSummaries` in `server.ts` are currently global Maps keyed by file path or message ID, which could lead to cross-project data leakage if filenames overlap.
- **Resolution Plan**: Refactor all global server-side Maps to use composite keys: `${uid}:${workspaceId}:${originalKey}`.

### Database & Data Layer
[2026-04-28] ARCHITECTURE: Implemented NexusPersistence - a unified, tiered persistence layer (Memory -> IndexedDB/File -> Firestore).
[2026-04-28] PATTERN: Self-Improving Context - ProjectContextEngine now uses `successWeight` to prioritize files that previously led to successful AI outputs.
[2026-04-28] PERFORMANCE: Migrated Chat Store to IndexedDB via NexusPersistence to avoid localStorage size limits and performance hits.

[2026-04-23] BUG-PATTERN: SQLite `SQLITE_CORRUPT` failures on Cloud Run.
- **Resolution**: Implemented robust initialization wrapper in `FileCacheManager`.
  - Double try-catch for `initDb`.
  - Automatic `unlinkSync` of corrupted db file + associated `-wal`/`-shm` files + retry attempt.
  - Final fallback to `:memory:` storage.

### Security & Environment Constraints
[2026-04-27] SECURITY: Firestore Rules Hardening
- **Resolution**:
  - Global default-deny: `match /{document=**} { allow read, write: if false; }`.
  - Mandatory size checks for ALL string/array fields.
  - No client-side query delegation; all `allow list` must validate `resource.data` against `request.auth.uid`.

[2026-04-28] ENVIRONMENT: Iframe Sandbox & `fetch` Override Crash
- **Context**: AI Studio iframe may provide `window.fetch` as a getter-only, non-configurable property.
- **Gotcha**: Libraries/polyfills (e.g., `eruda`) attempting to overwrite `window.fetch` will cause `TypeError: Cannot set property fetch...`.
- **Resolution**: 
  - Added a protective `Object.defineProperty` in `main.tsx` to handle `set` attempts gracefully.
  - Disabled `eruda` (Mobile Debug Console) as it fundamentally relies on network interception.

### Documentation & Workflow Policy
- **newproject.md**: Describes ecosystem standards for target applications built *with* the RapidForge platform (naming, directory layout), purposefully excluding internal IDE-specific AI mechanisms.

[2026-04-28] FIREBASE: Admin SDK Authentication in Cloud Run
- **Gotcha**: `applicationDefault()` may fail with `aud` claim mismatch or lack permissions on custom databases.
- **Resolution**: Updated `server.ts` to prioritize `FIREBASE_SERVICE_ACCOUNT_KEY` env var and explicitly pass `projectId` and `databaseId` from `firebase-applet-config.json`.

---

## REFLECTION CHECKPOINTS
[2026-04-27] Initialized memory system for AI Studio environment setup.
[2026-04-27] Completed: GIDE rebranding to RapidForge, core server logging fix, FilesystemGuardProtocol integration, and basic git commit/push via nexus-git-sync package.
[2026-04-28] Debugged and resolved critical startup crash related to `window.fetch` property descriptor constraints in AI Studio's iframe. Hardened Firebase Admin initialization for production parity.
[2026-04-28] Architectural Upgrade: Integrated NexusPersistence unified storage layer. Implemented intelligent context pruner and self-improving RAG pipeline based on interaction success weighting.
