# Changelog
All notable changes to the RapidForge project represent a shift toward industrial-standard modularity and performance.

## [0.9.5-nexus] - 2026-04-22

### Added
- **SwiftCache Tier 2 Infrastructure**: Persistent SQLite layer with LZ4 block compression.
- **FNV-1a Hashing**: Ultra-fast non-cryptographic hashing for sub-millisecond filesystem change detection.
- **Nexus Sensor System**: Real-time WebSocket bridge for multi-client filesystem consistency.
- **Centralized Branding Configuration**: Modular metadata in `/src/constants/appConfig.ts`.
- **System-Wide Constants Registry**: Technical parameters extracted to `/src/constants/systemConstants.ts` with `RW_` prefix.

### Changed
- **Modular State Overhaul**: Decentralized massive `App.tsx` state into specialized domains:
    - `useWorkspaceStore` (Project/Workspace identity)
    - `useAuthStore` (Credentials & Keys)
    - `useFileStore` (FS Mirroring & Editor state)
    - `useChatStore` (Conversation & Streaming)
- **Identity Rebrand**: Project evolved from "GIDE" to "RapidForge IDE".
- **Documentation Refactor**: Comprehensive README and CHANGELOG updates for enterprise clarity.

### Security
- **Credential Isolation**: Authentications tokens and API keys now live in a dedicated persistent store with partial state sanitization.
- **Cache Integrity**: FNV-1a hashing ensures robust cache key generation and deterministic invalidation.

---
## [0.9.0-alpha] - 2026-04-15
### Initial Release
- Basic AI chat with stream functionality.
- Monaco Editor integration.
- Filesystem proxy layer via Express.
