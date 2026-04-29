# Build Resolution Implementation Plan

## Objective
Resolve the `exit status 137` (OOM/Killed) build error by decoupling server-side persistence logic from the client-side Vite bundle.

## Diagnosis
1.  **Improper Coupling:** Client-side code is bundling server-side Node.js modules (`fs/promises`, `path`).
2.  **Vite Transpilation Overhead:** Bundling ~3000 modules mixed with heavy backend assets (e.g., `web-tree-sitter`) causes OOM during Vite transformation.
3.  **Invalid Alias Attempt:** Previous build aliases were insufficient and causing mapping failures (`ENOENT`).

## Resolution Steps

### Phase 1: Decoupling Persistence
- [ ] Remove all static/dynamic imports of server-side adapters from `NexusPersistence.ts`.
- [ ] Implement a Dependency Injection (DI) pattern: `NexusPersistence` exposes a `setLocalAdapter` method.
- [ ] Server initializes the `FilePersistenceAdapter` explicitly at runtime (`server.ts`).
- [ ] Client initializes the `IndexedDBAdapter` explicitly at runtime (`App.tsx`).

### Phase 2: Vite Configuration Hardening
- [ ] Clean up `vite.config.ts` aliases.
- [ ] Use `define` to inject process variables, preventing Vite from exploring Node-specific code branches.
- [ ] Configure `optimizeDeps.exclude` to ensure large dependencies like `web-tree-sitter` and potentially problematic packages are not processed recursively by the transformer.

### Phase 3: Build Optimization
- [ ] Ensure `dist` and `node_modules/.vite` are cleaned prior to every build.
- [ ] Verify that external packages listed in `package.json` are correctly labeled as 'external' for the backend build.

### Phase 4: Verification
- [ ] Run build process.
- [ ] If 137 persists, identify the heaviest remaining component to exclude from the bundle.
- [ ] Verify persistence functionality on client and server.

## Status
- [ ] Plan Created
- [ ] Phase 1 (Refactor)
- [ ] Phase 2 (Config)
- [ ] Phase 3 (Build)
- [ ] Phase 4 (Verify)
