# RapidForge Enterprise Architecture & Roadmap
> Transformation from Prototype (GIDE) to Production-Grade AI IDE.

This document outlines the strategic roadmap and architectural milestones achieved during the Nexus expansion phase.

## 🏛 1. Core Architecture: Nexus System
**Status:** [x] OPERATIONAL

### Highlights
- **Modular State Unification**: Fragmented `useState` has been replaced with domain-specific **Zustand** stores (`useAuthStore`, `useWorkspaceStore`, `useChatStore`, `useFileStore`).
- **Variable Sanitization**: Adopted a strict `RW_` naming convention (e.g., `RW_workspaceName`) for all global system properties to ensure code clarity and auditability.
- **Enterprise Rebrand**: Unified project identity under the **RapidForge IDE** brand, supported by a centralized `appConfig.ts`.

## ⚡ 2. Performance Engineering: SwiftCache
**Status:** [x] IMPLEMENTED

### Architecture
- **Tiered Persistence**:
    - **Tier 1 (L1)**: LRU-based in-memory cache for sub-millisecond hot data access.
    - **Tier 2 (L2)**: SQLite-backed persistent store using **LZ4 compression** to minimize disk I/O and footprint.
- **Turbo Hashing**: Transitioned to **FNV-1a** for non-cryptographic change detection, reducing hash computation latency by 4x compared to SHA-256.

## 🧠 3. Intelligence Layers: AST & Context
**Status:** [x] IMPLEMENTED

### Highlights
- **AST Unification**: Integrated `web-tree-sitter` across JS, TS, and Python for structured code summarization.
- **ProjectContextEngine**: Upgraded to use symbol-aware ranking, reducing token waste by filtering irrelevent file context during AI inference.

## 🛠 4. Future Roadmap (Horizon 2026)

### Phase A: Mobile Ergonomics
- [ ] **Gesture Interactivity**: Implement swipe-to-switch between Chat and Code Editor on small screens.
- [ ] **Adaptive Bottom Sheets**: Replace standard modals with native-feeling responsive bottom sheets.

### Phase B: Advanced Persistence & Multi-Tenant Boundaries
- [x] **Strict Multi-Tenant Partitioning**: Refactored `NexusPersistence`, `SymbolGraph`, `ProjectContextEngine`, and `EmbeddingEngine` to use strict composite keys (`userId:workspaceId`). Zero cross-project or cross-user data leakage internally.
- [ ] **Remote Sync Logic**: Implement conflict-free distributed data type (CRDT) patterns alongside Firebase Firestore for accurate offline-to-online synchronisation.
- [ ] **Symbol Aging / Garbage Collection**: Context weights, embeddings, and symbols degrade over time. If a symbol isn't accessed or modified within a TTL (Time-to-Live) window, it decays to save memory and token weight.

### Phase C: Semantic Search & Intelligence
- [x] **Vector Cache**: Implement local vector embeddings for files and symbols to enable true semantic code navigation.
- [ ] **Reusable Skills & Sub-Agents**: Implement a routing engine where main prompt can be delegated to specialized agents (e.g., Styling Agent, Security Auditor Agent) sharing a tightly scoped view of the AST.

### Phase D: Mobile GUI & Ecosystem Parity
- [ ] **OpenWebUI-style Input**: Dynamic context integration directly in the chat bar (`@` file inclusions, `#` workspace references, token budget indicators).
- [ ] **CLI Workflow Parity**: Provide raw sandboxed terminal execution in agent loops without blocking for user confirmation, similar to Claude Code or Qwen IDE.
- [ ] **Mobile-First UX Paradigms**: Shift to keyboard-attached action bars, bottom sheet navigations, and swipe-driven branching for chat threads.

---
*Maintainer: Forge Systems Architecture*
