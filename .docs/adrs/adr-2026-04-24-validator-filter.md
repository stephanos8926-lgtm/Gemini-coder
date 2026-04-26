# ADR: Switch ValidatorFilter Parsing Logic [2026-04-24]

## Status
Proposed

## Context
The `ValidatorFilter` currently uses `new Function(code)` to validate AI-generated JavaScript/TypeScript code. This approach is insecure as it potentially executes code or is vulnerable to bypasses. It is also non-standard for static analysis.

## Decision
Switch `ValidatorFilter` to use `@babel/parser` to perform static syntax validation. If the parser throws, the code is considered invalid.

## Consequences
- **Positive**: Significantly increases security. No code execution during validation. Aligns with audit hardening goals.
- **Negative**: Slightly slower validation speed compared to the `Function` constructor, however the security benefit far outweighs this trade-off.

## Alternatives Rejected
- `tree-sitter` was considered but might be overkill for simple syntax validation and requires more complex WASM handling in the request pipe. @babel/parser is already present in `package.json`.
