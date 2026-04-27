# ForgeNexus Architecture Audit - 2026-04-18

## Audit Overview
The goal of this audit is to identify dependencies and components within `/src/utils/` that must be moved to the `/packages/nexus/` library.

### Audit Findings
| Component | Status | Dependency Analysis |
| :--- | :--- | :--- |
| `ForgeGuard.ts` | **PENDING** | Depends on `ErrorBoundary`, `PatchEngine` (in `src/security/`), `ResilienceMapper`, `Sensor`. Must be moved. |
| `Sensor.ts` | **PENDING** | Core interface for library telemetry sensors. Must be moved. |
| `ResilienceMapper.ts`| **PENDING** | Requires migration to `packages/nexus/guard/`. |
| `persistence-worker.js`| **PENDING** | Critical runtime component. Must be moved to `/packages/nexus/utils/`. |

## Missing Dependencies (Nexus package.json)
The following need to be explicitly added to `/packages/nexus/package.json` for independent operation:
- `winston`
- `better-sqlite3` (Required by `PersistenceManager`)
- `js-yaml` (Required by `ConfigUtility`)

## Refactoring Recommendations
1. **Decoupling**: Remove `src/security/` dependency from `ForgeGuard.ts`. Create a `NexusGuardProtocol` interface that the GIDE application implements, allowing the library to call back into `src/security/` without the library *knowing* about it.
2. **Persistence**: Rename `persistence-worker.js` and update ALL references in `packages/nexus/utils/PersistenceManager.ts`.
3. **Ghost Files**: Files moved to `packages/nexus/` must be deleted from `src/utils/` immediately after migration to avoid import confusion.
