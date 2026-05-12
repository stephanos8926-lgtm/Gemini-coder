# Engineering Insights: ForgeNexus Refactoring

This document tracks improvements, concerns, refactoring opportunities, and enhancement patterns identified during the unification and migration to `ForgeNexus`.

## Status: Tracking Active
| Type | Topic | Description | Impact | Severity |
| :--- | :--- | :--- | :--- | :--- |
| Improvement | ConfigUtility | Currently reads `config.yaml` or `config.json` relative to `process.cwd()`. | Low (Hard to manage in monorepo) | Low |
| Concern | PersistenceManager | Currently depends on a hardcoded path. | Medium (Breakage risk) | High |

---
## Change Log
- **2026-04-18:** Started tracking.
- **2026-04-18:** Migrated `ConfigUtility` to `/packages/nexus/utils/`.
    - **Concern Identified (BUG)**: `loadFromEnv` uses `this.config[key] = process.env[key]` (storing with RW_ prefix), should be `this.config[configKey] = process.env[key]`.
    - **Refactoring Opportunity**: `ConfigUtility` assumes `process.cwd()` for file loading. In a monorepo, path resolving should be explicit relative to the package root.
- **2026-04-18:** Migrated `ForgeGuard.ts` to `/packages/nexus/guard/`.
    - **Refactoring Opportunity (DECOUPLING)**: Introduced `ForgeGuardProtocol`. The library now calls host-provided hooks (e.g., `onDangerousIssue`) instead of importing GIDE-specific security scanners/patchers, successfully decoupling the library from the IDE core.
    - **Backwards Compatibility**: The `ForgeGuard` singleton pattern is preserved via `init()` to support existing module integration, though it now requires explicit `persistence` injection to be fully functional.
- **2026-04-18:** Migrated `ShadowExecutionEngine.ts` to `/packages/nexus/utils/`.
    - **Refactoring Opportunity (DECOUPLING)**: The `ShadowExecutionEngine` constructor now accepts `persistence` as a dependency, and the `getInstance` method was updated to reflect this dependency injection, further decoupling it from GIDE's singleton management.
