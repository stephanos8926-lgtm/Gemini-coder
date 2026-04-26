# agents.md — Project Knowledge Base
> Living memory system for FORGE development sessions  
> Updated: 2026-04-18

---

## META-INSTRUCTIONS (How to Use This File)

### Core Operational Principles
- **Cost Optimization Principle**: Cost minimization is a non-negotiable project requirement. 
  - Always prefer the least cost-inducing architecture/implementation.
  - Minimize Cloud/API egress, storage, and compute overhead by default (e.g., batching I/O, local-first processing, optimizing data structures).
  - Before proposing expensive infrastructure changes, explicitly document the expected cost and propose lower-cost alternatives.

### Purpose
This file serves as your persistent memory across sessions. It contains:
1. **Meta-instructions** (this section) — how to use the .docs/ planning system
2. **Learned patterns** (below) — bugs, gotchas, solutions discovered during development
3. **Reflection checkpoints** (bottom) — periodic progress summaries

### When to Read This File
- ✓ **Session start** (ALWAYS) — sync state before any work
- ✓ **Before architectural decisions** — check for relevant patterns
- ✓ **When debugging** — look for similar past issues
- ✓ **User asks "what have we learned?"** — summarize entries

### When to Update This File
- ✓ **After writing an ADR** (architectural decision record)
- ✓ **After 3+ bug fixes in same area** (pattern detected)
- ✓ **User says "reflect" or "update agent knowledge"**
- ✓ **Every 10 completed tasks** (checkpoint reflection)
- ✓ **Before context compression** (preserve critical knowledge)

### Update Strategy: IN-PLACE CURATION (NOT append-only)
**Do:**
- Update existing entries when learning more about a topic
- Consolidate duplicate patterns into single authoritative entry
- Mark superseded info with ~~strikethrough~~ and add [UPDATED DATE]
- Prune stale workarounds after underlying bugs are fixed
- Keep sections organized by topic, not chronologically

**Don't:**
- Keep duplicate entries for the same issue
- Retain obsolete workarounds indefinitely
- Let file grow unbounded (curate, don't accumulate)

### Entry Format
```
[YYYY-MM-DD] Brief description + current resolution
[UPDATED YYYY-MM-DD] ~~Old approach~~ → New approach/fix
```

**Categories:**
- `BUG-PATTERN` — recurring bug with known fix
- `GOTCHA` — library/API quirk or footgun
- `PERFORMANCE` — optimization learned through profiling
- `SECURITY` — vulnerability pattern and mitigation
- `ARCHITECTURE` — design decision with rationale
- `WORKFLOW` — process improvement or tooling insight

### .docs/ Planning System Workflow

**At Session Start:**
1. Read `agent.md` (this file)
2. Read `.docs/status-<project>.json` for current tasks
3. Read `.docs/plans/plan-<project>.md` for overall roadmap
4. Confirm current task or ask for direction

**During Development:**
1. Update `.docs/status-<project>.json` after every completed task
2. Create ADR in `.docs/adrs/` when making major design choices
3. Append to `agent.md` when discovering patterns (see triggers above)

**Every 10 Tasks:**
1. Generate reflection checkpoint (append to this file)
2. Update status.json with completed/blocked tasks
3. Note any emerging blockers or architectural concerns

**Before Context Compression:**
1. Archive old ADRs to `.docs/adrs/archive/`
2. Compress completed task details into agent.md summary
3. Keep status.json current-state only (prune completed tasks)

---

## LEARNED PATTERNS (Curated Knowledge Base)

**Important:** This section is curated, not chronological. Update entries in-place, consolidate duplicates, and prune obsolete information.

### Project Setup & Dependencies
<!-- Example entries below — replace with actual discoveries -->
[2026-04-18] GOTCHA: Node.js ESM requires "type": "module" in package.json AND .js extensions in imports
[2026-04-18] GOTCHA: Zod v4 changed API — .parse() is synchronous, use .parseAsync() for async transforms
[UPDATED 2026-04-20] ~~Initial workaround with preprocessor~~ → Use native .transform() in v4.2+

### Authentication & Security
[2026-04-23] ARCHITECTURE: Implemented the **ForgeGuard AI Interceptor Pipeline**.
- **Pattern**: Intercepting Filter Pattern applied to raw LLM requests and responses.
- **Components**:
  - `PIIFilter`: Automatic redaction of emails, credit cards, and phone numbers.
  - `SecurityFilter`: Heuristic audit for prompt injection (e.g., "ignore previous instructions") and system prompt leak detection.
  - `BudgetFilter`: Token usage audit and cost estimation (length-based metrics).
  - `ValidatorFilter`: Post-processing validation layer that intercepts code blocks and runs them through a syntax validator (e.g., `new Function()` syntax check) to catch broken generation before user interaction.
- **Workflow**: All AI calls now route through `ForgeAI.ts` gateway rather than legacy `streamGemini` direct imports.
- **Benefit**: Centralized control over security, privacy, and technical quality of AI outputs without bloating standard chat logic.

### Database & Data Layer
[2026-04-23] BUG-PATTERN: SQLite `SQLITE_CORRUPT` failures on Cloud Run revisions.
- **Root Cause**: Corrupt persistence files in the `/logs` directory (likely due to unexpected container termination or underlying filesystem quirks) cause immediate process crash during top-level singleton initialization in `server.ts`.
- **Resolution**: Promoted `FileCacheManager` from the ForgeGuard package (Nexus) to the core application tier (`/src/utils/FileCacheManager.ts`).
  - 1. Automated directory creation logic (`logs/` dir).
  - 2. Double try-catch for `initDb` covering both opening and schema execution.
  - 3. Automatic `unlinkSync` of corrupted db file AND associated `-wal`/`-shm` files + retry attempt.
  - 4. Final fallback to `:memory:` storage to prevent process termination. Global cache singleton now guaranteed to be functional.
  - 5. Unified API: Standardized on `getFile` and `updateFile` with mandatory path parameters for better observability.

### API & Routing
<!-- Append API patterns here -->

### Architecture
[2026-04-22] ARCHITECTURE: Migrated to professional 3-column IDE layout (Explorer | Editor/Utility | AI Assistant) for desktop; Handset-optimized switcher for mobile.
[2026-04-22] CONVENTION: Standardized `RW_` (RapidForge Workspace) prefix for global constants, metadata, and state to ensure codebase maintainability and easy identification of shared vs local state.
[2026-04-22] GOTCHA: `react-resizable-panels@^4.8.0` in this environment uses non-standard exports (`Group`, `Separator`) and lacks standard types. Resolved via `any` casts in `App.tsx` to maintain layout integrity. [SUCCESSFUL BUILD: 2026-04-22]
[2026-04-23] SWARM-BLOCKER: Client-side storage (IndexedDB for embeddings, Zustand `useChatStore` for sessions) blocks headless agent execution. Memory must be migrated server-side before long-horizon autonomous tasks can run. See `.docs/adrs/adr-2026-04-23-swarm-context-engineering.md`.

### Frontend & UI
[2026-04-22] UI-PATTERN: Integrated `AdaptiveBottomSheet` for handset utility panels (Terminal, Explorer) to maximize screen real estate on constrained devices.
[2026-04-22] UI-PATTERN: Unified AI Assistance interface with a persistent right sidebar on desktop, accessible via a collapsible toggle in the Header.

### Build & Deployment
<!-- Append tooling patterns here -->

### Testing & Quality
<!-- Append test patterns here -->

### Performance & Optimization
[2026-04-23] PERFORMANCE: Multi-tier AI Caching via `CacheFilter`.
- **L1 (Memory)**: Instant session hit for exact prompt hashes.
- **L3 (IndexedDB)**: Cross-session persistent cache for expensive AI responses using `idb-keyval` and `fnv-plus` non-cryptographic hashing for speed.
- **Upstream (Context)**: Infrastructure readiness for Gemini `cachedContents` API to handle large file context reuse across long conversations. 
- **Tool Caching**: `CacheFilter` is architected to cache tool call results for deterministic operations (e.g., reading static config files), significantly reducing unnecessary AI reasoning cycles.

---

## REFLECTION CHECKPOINTS

### Checkpoint 1 — [2026-04-22]
**Tasks Completed:** 10+ major UI/Logic refactors
**Key Achievements:**
- Refactored App.tsx to a standard 3-column professional IDE layout using `react-resizable-panels`.
- Implemented mobile ergonomics with a tabbed view switcher and bottom sheets for utility panels.
- Centralized all application metadata and tuning constants into `src/constants/app.ts`.
- Standardized project branding as **RapidForge IDE** across components, metadata, and landing pages.
- Verified and audited the multi-tier filesystem caching system (Memory/SQLite/IndexedDB).
- Integrated AI-driven Git commit summarization into the Source Control panel.

**Blockers Identified:**
- `web-tree-sitter` types are currently bypassed with `any` in `astParser.ts` due to namespace export issues in the AI Studio environment.

**Architectural Insights:**
- A persistent sidebar structure significantly improves "flow" on desktop compared to a purely tabbed/bottom-panel approach.
- Handset ergonomics required decoupling status (active file) from view (what's visible: chat vs editor), leading to the `RW_mobileView` state.

**Next Focus:**
- Semantic Intelligence: Implement Tree-Sitter based code navigation and better AST skeletons.
- Persistence: Ensure panel sizes and visibility states are preserved in `localStorage`.
- Stability: Final comprehensive linting and unit test coverage for core filesystem hooks.

---

<!-- Add new checkpoints above this line -->

---

## CONTEXT COMPRESSION LOG

When context limits are approached, summaries of archived work are recorded here:

<!-- Example format:
[2026-04-20] Compressed tasks 1-30: Auth system complete (JWT + refresh tokens), user CRUD endpoints deployed, integration tests passing. ADRs archived: JWT vs session cookies decision, bcrypt rounds selection.
-->

---

## USAGE NOTES

**DO:**
- ✓ Update existing entries when learning more (in-place edits)
- ✓ Consolidate duplicates into single authoritative entry
- ✓ Mark superseded info with ~~strikethrough~~ + [UPDATED DATE]
- ✓ Prune stale workarounds after root bugs are fixed
- ✓ Be specific: include error messages, library versions, exact fixes
- ✓ Cross-reference ADRs when applicable
- ✓ Keep entries concise but actionable

**DON'T:**
- ✗ Keep multiple entries for the same pattern (consolidate them)
- ✗ Retain obsolete workarounds indefinitely (prune when fixed upstream)
- ✗ Add vague entries like "fixed bug" (what bug? how?)
- ✗ Duplicate information already in ADRs (just reference the ADR)
- ✗ Let this become a dumping ground (curate ruthlessly)

**Quality Test:**
If you read an entry in 3 months, will you understand:
1. What the problem was?
2. Why it happened?
3. How to avoid/fix it?
4. Whether it's still relevant?

If no to any → rewrite or remove the entry.
