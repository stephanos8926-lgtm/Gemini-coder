# GIDE Audit Remediation & Infrastructure Hardening Plan [2026-04-23]

## Goal
Address findings from the Third-Party Audit (Nexus & GIDE Core) focusing on security, performance, persistence, and AI pipeline robustness.

## Phases

### Phase 1: AI Pipeline & Intercepting Filter Hardening
- [ ] **Sanitization**: Update `PIIFilter` with more comprehensive regex patterns (Address labels, SSN variants).
- [ ] **Validation**: Enhance `ValidatorFilter` to use a non-executing AST parser (e.g., `acorn` or `typescript` compiler API if available) instead of `new Function`.
- [ ] **Budgeting**: Improve `BudgetFilter` accuracy using a real tokenizer (if library available) or refined character ratios.
- [ ] **Security**: Expand `SecurityFilter` blacklist with advanced injection patterns and refusal triggers.
- [ ] **Caching**: Refine `CacheFilter` hashing logic to use a more stable object-to-string serializer.

### Phase 2: Persistence & Cache Layer Optimization
- [ ] **State persistence**: Audit `useFileStore` and `useChatStore` for `localStorage` bloat. Ensure large binary/text blobs are handled via IndexedDB (already mostly done, need verification).
- [ ] **Database Integrity**: Enhance `FileCacheManager` recovery from `SQLITE_CORRUPT`. (Completed in previous turn, need validation).
- [ ] **Log Cleanup**: Update `LogRedirector` to support tiered log pruning and structured export.

### Phase 3: Infrastructure Security & Resource Integrity
- [ ] **Path Traversal**: Explicitly check all `read_file`/`write_file` calls in `toolExecutor.ts` using `getSafePath` logic from `server.ts`.
- [ ] **Command Sanitization**: Implement a command allowlist or strict argument escaping for `runCommand` tools.
- [ ] **Context Leakage**: Verify `ServerWatcher` closes all handles on process exit.
- [ ] **Memory Leaks**: Verify `DeepProfiler` and `server.ts` interval clearing.

### Phase 4: Frontend Usability & swarms
- [ ] **UI Feedback**: Implement visual badges for background tasks in `BackgroundTaskPanel`.
- [ ] **Task Management**: Segregate single-agent vs swarm task managers.

## Success Criteria
- No "SQLITE_CORRUPT" exits on container restart.
- AI generated code with syntax errors is flagged before rendering.
- PII is successfully redacted in 99% of common test cases.
- Path traversal attempts in tool calls return 403/Forbidden.
