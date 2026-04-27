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

### Database & Data Layer
[2026-04-23] BUG-PATTERN: SQLite `SQLITE_CORRUPT` failures on Cloud Run.
- **Resolution**: Implemented robust initialization wrapper in `FileCacheManager`.
  - Double try-catch for `initDb`.
  - Automatic `unlinkSync` of corrupted db file + associated `-wal`/`-shm` files + retry attempt.
  - Final fallback to `:memory:` storage.

### Security
[2026-04-27] SECURITY: Firestore Rules Hardening
- **Resolution**:
  - Global default-deny: `match /{document=**} { allow read, write: if false; }`.
  - Mandatory size checks for ALL string/array fields.
  - No client-side query delegation; all `allow list` must validate `resource.data` against `request.auth.uid`.

---

## REFLECTION CHECKPOINTS
[2026-04-27] Initialized memory system for AI Studio environment setup.
