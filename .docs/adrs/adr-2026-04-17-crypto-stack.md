# ADR: Cryptographic Stack Selection

## Context
We require a high-performance cryptography standard for cross-platform (mobile, server, desktop) identity management, data transit, and at-rest message security.

## Decision
Adopt **Ed25519** for signing and **X25519** for key exchange/encryption.

## Consequences
- **Strength**: High security (industry-standard, side-channel resistant).
- **Speed**: Optimized for performance on all specified architectures.
- **Complexity**: Slightly higher compared to raw RSA/AES, requiring careful management of key lifetime/rotation rather than long-lived certificates.

## Alternatives Rejected
- **RSA**: Too slow for mobile, high overhead.
- **AES-only**: Lacks identity signing capabilities required for our CA-chain.
