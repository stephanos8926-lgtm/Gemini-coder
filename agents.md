# agents.md — Project Knowledge Base
> Living memory system for AI Studio development sessions  
> Updated: 2026-05-12

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

---

## LEARNED PATTERNS

### Project Setup & Infrastructure
[2026-05-12] AGENT-PATTERN: Tiered Agent Hierarchy
- **Standard**: All new agents must extend `StandardForgeAgent` (Tier 2/3) or `BaseForgeAgent` (Tier 1).
- **Benefit**: Ensures unified EHP bus logging and mandatory security gates for all AI tool calls.

[2026-05-12] CONTEXT-PATTERN: Semantic Indexing
- **Resolution**: Use `ProjectContextEngine` for large codebase awareness. 
  - Ensure tree-sitter indices are refreshed after major refactors.
  - Prioritize `successWeight` for frequently used files in AI prompts.

[2026-04-27] BUILD-PATTERN: Empty build artifacts during deployment (Fixed)
- **Resolution**: Standardize on `*` for Express 4 wildcard routes and use `dist/` explicitly in build scripts for Vite projects.

### Security & Governance
[2026-04-30] SECURITY: Implemented Dual-Layer Governance
- **Layer 1 (Linter/Guard)**: Static analysis and basic request protection.
- **Layer 2 (EHP Warden)**: Real-time event interception and RBAC enforcement via the Event Horizon Pipeline.

[2026-04-30] PATTERN: Centralized Path Security
- Migrated all workspace jailing and path safety logic to `src/utils/pathUtility.ts`.

---

## REFLECTION CHECKPOINTS
[2026-04-30] Milestone: Platform Integrity. Deployed EHP/POL/Warden infrastructure.
[2026-05-12] Milestone: Agent Sovereignty. Standardized on a 3-tier Agent Hierarchy. Implemented the Context Engine for semantic codebase awareness. 
[2026-05-12] Milestone: Global Documentation Reset. Archived all April legacy docs, consolidated plans into a single Source of Truth Roadmap, and regenerated SEMINDEX.md.
