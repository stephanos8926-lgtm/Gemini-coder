# RapidVault Design Document

## 1. Overview
RapidVault is the security backbone of the RapidForge ecosystem. It provides isolated, encrypted data storage and identity governance.

## 2. Architectural Pillars

### A. The Secure Sandbox (`packages/rapidforge-sandbox`)
We will use the **Strategy Pattern** for sandboxing to enable cross-environment mobility.
- **`SandboxService` (Abstract Class/Interface)**: Defines a unified API (`initialize`, `start`, `execute`, `stop`).
- **Implementations**:
  - `UnixSandbox`: Handles `chmod`, `cgroups`, and `AppArmor` for local development.
  - `ContainerSandbox`: Interfaces with Podman/Docker runtimes for production isolation.

### B. The Vault Engine (`packages/rapidforge-vault`)
- **Storage Tiering:**
  - **MetaData (LDAP-like):** JSON manifests mimicking LDAP schemas (`ou=users`, `ou=workspaces`, `ou=secrets`).
  - **Secrets (BLOBs):** Encrypted files (`AES-256-GCM`).
- **Encryption Logic:**
  - **Level 1 (At-Rest):** AES-256 System-wide key.
  - **Level 2 (User):** Per-user secondary encryption key derived from passphrase, **protected by split-key recovery (Shamir's Secret Sharing Algorithm).**

### C. The Security Warden Integration
All Vault interactions must be routed through the `SecurityWarden` via the EHP bus. Access to user secrets is strictly forbidden for any `PrincipalType.AGENT` unless they possess a unique `vault:secret:read` capability.

## 3. Implementation Roadmap
1. **[Library]**: Implement `@rapidforge/sandbox` with the `ISandboxService` interface.
2. **[Vault]**: Create `@rapidforge/vault` with AES-256 encryption and SSS (Shamir's Secret Sharing) for key recovery.
3. **[LDAP Schema]**: Standardize JSON structures for mapping users, roles, and secrets.
4. **[Integration]**: Connect Vault interaction events to the EHP Bus.
