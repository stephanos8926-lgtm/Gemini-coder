# RapidForge Vault: Implementation Plan (Encrypted Data Store)

## 1. Core Cryptographic primitives
- **Symmetric Encryption**: ChaCha20-Poly1305. High performance in software, secure, and well-supported on all relevant platforms (mobile, cloud, server-side via libsodium).
- **Key Derivation**: Argon2id. Resistant to GPU-based attacks.
- **Key Recovery**: Shamir's Secret Sharing (SSS) to split user-derived keys.

## 2. Package Structure: `@rapidforge/vault`
```text
packages/rapidforge-vault/
├── pyproject.toml        # UV configuration
├── vault_engine.py       # Python core: Encryption/Decryption/Key derivation
├── vault_bridge.ts       # TypeScript bridge for Node.js usage
└── README.md             # Usage documentation
```

## 3. Technology Choice: Python with `uv`
Using Python 3.12 with `uv` and `pynacl` provides a high-security, auditable bridge for sensitive operations (crypto/sandboxing) separate from the main Node.js application process.
- **Why**: Faster execution of complex cryptographic logic than pure JS; clear separation of concerns (security vs. service logic); easy implementation of system-level sandboxing (filesystems permissions, kernel limits).

## 4. Encryption Flow
- **Data (Blobs)**: Encrypted with `ChaCha20-Poly1305` using the user's secondary key.
- **Secondary Key**: Encrypted at rest. Can be recovered using 2-of-3 SSS shares if the user loses their passphrase.
- **Communication**: Inter-service communication via EHP, where sensitive data is encrypted *again* with the ephemeral session key.
