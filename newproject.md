# RapidWebs Enterprise: Project Initialization & Standards Guide

This guide outlines the mandatory standards, architectural patterns, and organizational conventions for all projects within the RapidWebs Enterprise ecosystem. These principles are designed to ensure cross-language compatibility, auditability, and industrial-grade reliability.

---

## 🏗️ 1. Project Anatomy & Organization

Regardless of the primary language (TypeScript, Python, Go, etc.), all enterprise projects must adhere to a strict modular structure.

### 📁 Standard Directory Layout
- `/.docs/`: **Mandatory.** Persistent project state, architecture decision records (ADRs), roadmaps, and audit reports.
- `/packages/`: Internal shared libraries (nexus-core, guard-logic).
- `/src/` or `/app/`: Core application logic.
  - `/components/`: Reusable UI elements (if applicable).
  - `/lib/` or `/services/`: Business logic, API clients, and core utilities.
  - `/store/` or `/state/`: Centralized state management (e.g., Zustand, Redux, or context).
- `/tests/`: Comprehensive test suites mirroring the source structure.
- `metadata.json`: Project identity and permissions.
- `agents.md`: The living knowledge base for AI collaborations.

---

## 🏷️ 2. Naming Conventions: The "RW_" Standard

Naming must be explicit and searchable. Avoid generic abbreviations.

### ⚙️ System Variables & Configuration
All global system properties, environment-level configurations, and workspace-wide constants MUST use the `RW_` (RapidWebs) prefix.
- **Good:** `RW_workspaceRoot`, `RW_maxConcurrency`, `RW_enableAudit`
- **Bad:** `root`, `max_threads`, `logging`

### 💻 Code Semantics
- **Files:** `camelCase` for utilities/logic, `PascalCase` for components/classes.
- **Interfaces/Types:** `PascalCase` (e.g., `interface RW_FileSystemOptions`).
- **Enums:** Standard `enum` (no `const enum`).
- **Private Members:** Prefix with underscore (e.g., `_internalCache`).

---

## 🧬 3. Coding Paradigms

### 🛡️ Defensive Programming & Auditability
- **Validation-First:** Every input (API, File, User) must be sanitized before processing (e.g., Zod, Pydantic).
- **Telemetry Integration:** Every major service must emit "signals" to the local telemetry agent (ForgeGuard).
- **Immutable State:** Prefer unidirectional data flow. Avoid direct state mutations.

---

## 🔧 4. Verification Quality Gates

No project is "Ready" until it passes the following gates:
1. **Null Safety:** Strict type checking must be enabled.
2. **Error Boundary Coverage:** UI must fail gracefully; Backend must log structured errors.
3. **Security Surface Audit:** No hardcoded keys; sanitized inputs; least-privilege permissions.
4. **Performance Benchmark:** Critical paths must have documented Big-O complexity.

---

## 📝 5. The "agents.md" Protocol

The `agents.md` file is the project's memory. It must contain:
1. **Meta-Instructions:** Project-specific workflow overrides.
2. **Learned Patterns:** Gotchas and recurring fixes specific to the codebase.
3. **Reflection Checkpoints:** Summaries of architectural evolution.

---

## 🌐 6. Cross-Language Portability

When implementing in languages other than TypeScript/JavaScript:
- **Python:** Use Type Hints and Pydantic. Match current structure using `src/` and `tests/`.
- **C/C++:** Use header-only or strictly layered architectures.
- **Go:** Adhere to standard Go workspace conventions but maintain the `/.docs/` and `RW_` naming standards.

---

*Last Updated: 2026-04-28 | RapidWebs Enterprise Architecture Board*
