# agents.md — Project Knowledge Base
> Living memory system for FORGE development sessions  
> Updated: 2026-04-18

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
<!-- Append security patterns here -->

### Database & Data Layer
<!-- Append database gotchas here -->

### API & Routing
<!-- Append API patterns here -->

### Frontend & UI
<!-- Append React/UI patterns here -->

### Build & Deployment
<!-- Append tooling patterns here -->

### Testing & Quality
<!-- Append test patterns here -->

### Performance & Optimization
<!-- Append perf discoveries here -->

---

## REFLECTION CHECKPOINTS

### Checkpoint 1 — [Date]
**Tasks Completed:** [count]  
**Key Achievements:**
- [bullet list of major completions]

**Blockers Identified:**
- [bullet list of unresolved issues]

**Architectural Insights:**
- [patterns or decisions that should inform future work]

**Next Focus:**
- [next 3-5 high-priority tasks]

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
