# RapidWebs Enterprise: Development Standards, Protocols, and Mandates

## 1. Executive Mandate
All software developed under the RapidWebs Enterprise label must adhere to this hierarchy. Failure to comply compromises platform integrity.

## 2. Development Hierarchy
1. **Security & Governance (Warden)**: All system-level interactions must pass through the Security Warden governance gate.
2. **Connectivity (EHP)**: Asynchronous, audited, backbone-centered communication is mandatory via EHP.
3. **Operational Integrity (POL)**: Services must register with the Orchestration Layer (POL) and provide health heartbeats.
4. **Data Sovereignty**: Vaulted, multi-layer encrypted storage is required for PII and system secrets.

## 3. Coding Protocols
- **Language**: TypeScript (Node), Python 3.12 (Vault/Crypto).
- **Concurrency**: Async-first. Synchronous execution is reserved for Warden-blocked high-risk paths.
- **Dependency**: All shared infrastructure must live in `packages/` (monorepo).
- **Testing**: TDD is enforced via LangGraph-based agent validation nodes.
