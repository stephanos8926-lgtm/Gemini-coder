# Project Roadmap as of May 2026
> **Status**: ACTIVE | **Last Updated**: 2026-05-12  
> **Source of Truth** for Platform Evolution and Autonomous Tasking.

## 🏛 Executive View
RapidForge has transitioned from a functional IDE prototype to a robust, agentic development infrastructure. We have established the **Event Horizon Pipeline (EHP)** for messaging, the **Warden** for security, and a **3-Tier Agent Hierarchy** for autonomous operations.

---

## ✅ Accomplishments (Phases 1-3 Completed)
- **EHP 2.0 Backbone**: Distributed pub-sub bus with request-response support and mandatory auditing.
- **Warden Security Layer**: Real-time interceptors for all high-risk tool calls (`shell_exec`, `edit_file`).
- **Context Engine**: Semantic indexing of the codebase using Tree-Sitter and Vector embeddings for RAG-enhanced agent intelligence.
- **Agent Standardization**: Migration to `StandardForgeAgent` as the base class for all Tier 2/3 agents.
- **Governance Gates**: Integrated linting and Vitest-based TDD loops into the agentic workflow.

---

## 🛠 Active Workstream (Phase 4: Optimization & Specialized Agents)

### 1. RapidVault Implementation (P0)
- **Goal**: Secure storage for project secrets, API keys, and identity tokens.
- **Tasks**:
  - [ ] Implement `@rapidforge/vault` Python-Node.js bridge.
  - [ ] Deploy Shamir's Secret Sharing (SSS) key splitting for master key recovery.
  - [ ] Integrate Vault with Warden for seamless secret injection into restricted processes.

### 2. Multi-Tenant Hardening (P1)
- **Goal**: Absolute isolation between user workspaces and AI contexts.
- **Tasks**:
  - [ ] Audit remaining global server-side Maps for composite key leakage.
  - [ ] Implement `TenantContext` propagation across all EHP events.
  - [ ] Harden Firebase Security Rules with advanced ABAC patterns.

### 3. Specialized Agent Deployment (P1)
- **Goal**: Launch targeted agents for specific developer pain points.
- **Tasks**:
  - [ ] **PatchEngineAgent**: Specialized in applying non-breaking, atomic diffs to large files.
  - [ ] **SecurityAuditorAgent**: Real-time scanning of code proposals for injection and data leakage.
  - [ ] **MetricsAnalyzerAgent**: Tier 3 observability agent for platform health and token costs.

---

## 🚀 Envisioned Future (Phase 5: Collaborative Swarms)

### 1. Swarm Orchestration
- Dynamic task decomposition where a `LeadAgent` breaks a user request into sub-tasks and delegates to `Tier 2` specialists.
- Real-time consensus mechanisms for multi-agent code reviews.

### 2. Hybrid Persistence
- Transition to a CRDT-based synchronization model for offline-first resilience.
- Global symbol decay logic to keep Agent Context clean and token-efficient.

---

## 🏎 Developer Transition & Handoff
To pick up development or transition to a new workspace:
1. **Sync State**: Read `agents.md` immediately to load learned patterns and meta-instructions.
2. **Consult Index**: Use `SEMINDEX.md` to navigate the documentation hierarchy.
3. **Run Triage**: Review the `Next Tasks` in this roadmap to identify the current priority.
4. **Adhere to Standards**: All new logic must live in `packages/` and all new agents must extend `StandardForgeAgent`.

---

## 📝 Next Tasks (Immediate Queue)
1. **Consolidate EHP logs**: Implement a centralized log rotation service for the `agent.trace` topic.
2. **Warden UI Reflection**: Add a "Warden Decision Panel" to the IDE to allow users to manually override/approve blocked actions.
3. **Context Engine Refresh**: Optimize the Tree-Sitter parsing logic for faster indexing of 100+ file codebases.
