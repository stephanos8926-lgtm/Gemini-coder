# Implementation Plan: Audit Remediation, Security Hardening, and Deployment Stabilization

## Goals
1.  Address security and quality issues identified in the codebase scan.
2.  Stabilize deployment by ensuring proper build artifacts and Firebase initialization.

## Milestones
### Phase 1: Backend Refactor (JSON Parsing & Initialization)
- [ ] Refactor `server.ts` to use `safeJsonParse` for all JSON parsing.
- [ ] Ensure Firebase initialization is lazy and handles errors gracefully.

### Phase 2: Frontend Refactor (Security & Complexity)
- [ ] `ChatPanel`: Secure `dangerouslySetInnerHTML` (sanitize/escape or use component).
- [ ] `AuthGuard` & `ChatPanel`: Refactor for high cyclomatic complexity.
- [ ] Extract magic numbers in `ChatPanel` and `ForgeGuardTelemetryPanel`.

### Phase 3: Infrastructure Refactor (Communication)
- [ ] Implement `src/lib/apiClient.ts` to replace scattered `fetch` calls.
- [ ] Refactor `ChatPanel` and `ForgeGuardTelemetryPanel` to use `apiClient`.

### Phase 4: Deployment Stabilization
- [ ] Analyze `package.json` build/start scripts for inconsistencies.
- [ ] Verify `build` artifacts generation.
- [ ] Ensure `firebase-applet-config.json` is correctly included in the build.
