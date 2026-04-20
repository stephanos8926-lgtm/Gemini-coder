# Implementation Plan: Codebase Audit & Resilience Enhancement

## Goal
Perform a comprehensive audit, enhance resilience, implement high-performance filesystem indexing, and establish robust user identity/encryption.

## Milestones
1. **[x] Core Resilience**: `App.tsx` decomposition, `ForgeGuard` integration in chat/tools.
2. **[ ] Indexing Architecture**: Server-side directory crawler (Node.js), Blake3 hashing, Journal manifest generation.
3. **[ ] Identity & Cryptography**: User Profile DB schema, Ed25519/X25519 key management, PKI foundation.
4. **[ ] UI/Integration**: Search Omnibox, Rich File Manager UI + Status Bar/Quota tracking.
5. **[ ] Verification & Auditing**: Performance profiling, Security audit (rules + identity).
