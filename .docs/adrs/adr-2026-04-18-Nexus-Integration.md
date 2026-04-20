# ADR-2026-04-18-Nexus-Integration: Unifying Infrastructure into ForgeNexus

## Context
The codebase contained separate libraries (`ForgeGuard` and `RapidForge`) for defensive resilience and telemetry/observability. These overlap in dependencies (`PersistenceManager`) and operational scope. To improve maintainability and commercial portability, these must be unified into a standalone library: `ForgeNexus`.

## Decision
1.  **Consolidation**: Unify all defensive and observability logic into a single library package located in `/packages/nexus/`.
2.  **Structural Integrity**: The new structure will follow a monorepo approach: `/packages/nexus/` for the library, and `/src/` for the GIDE application.
3.  **Portability**: This library will be designed as a standalone NPM-ready artifact, independent of GIDE.

## Consequences
- **Positive**: Simplified dependency chain, improved developer workflow (single point of entry for infrastructure intelligence), easier commercial distribution.
- **Negative**: Requires significant refactoring of absolute and relative imports.
- **Risk**: Potential build breakage during the migration. Mitigation: Strict micro-step implementation with full recompilation at each sub-step.
