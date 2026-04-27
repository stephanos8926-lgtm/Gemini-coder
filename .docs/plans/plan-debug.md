# Plan: Debugging Blank Page & Bundling Issues

## Goal
Resolve the `promisify is not a function` error causing a client-side crash and blank page, and fix potential server-side scoping issues.

## Stack
- Frontend: React (Vite)
- Backend: Express (TypeScript)
- Database: SQLite (via worker), Firestore
- Telemetry: Nexus (ForgeGuard + Logistics)

## Milestones
- [ ] Refactor `ForgeWrappers.ts` to prevent leaky `require` calls.
- [ ] Fix Node-specific globals in `PersistenceManager.ts`.
- [ ] Verify client bundle is clean of server dependencies.
- [ ] Audit `server.ts` for "app is not defined" error.

## Open Questions
- Why does `server.ts` report "app is not defined" even though it seems correctly scoped?
- Are there other files using `require` or Node globals besides the ones identified?
