# ADR: Centralize Path Security [2026-04-24]

## Status
Proposed

## Context
`getSafePath` and `WORKSPACE_ROOT` are defined inside `server.ts`, making them inaccessible for other modules (like `toolExecutor.ts`) that need to enforce path security.

## Decision
- Move `WORKSPACE_ROOT` and `getSafePath` to a new module `src/utils/pathUtility.ts`.
- Update `server.ts` and `toolExecutor.ts` to import these from the new module.

## Consequences
- **Positive**: Consistent path security application across the entire codebase.
- **Negative**: Adds a dependency on a shared utility.
