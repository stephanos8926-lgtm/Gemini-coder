# RapidWebs Enterprise: Development Standards, Protocols, and Mandates

## 1. Executive Mandate
All software developed under the RapidWebs Enterprise label must adhere to this hierarchy. Failure to comply compromises platform integrity.

## 2. Development Hierarchy
1. **Security & Governance (Warden)**: All system-level interactions must pass through the Security Warden governance gate.
2. **Connectivity (EHP)**: Asynchronous, audited, backbone-centered communication is mandatory via EHP.
3. **Agentic Autonomy**: Task execution should be delegated to Tiered Agents (StandardForgeAgent) to ensure consistency and observability.
4. **Data Sovereignty**: Vaulted, multi-layer encrypted storage is required for PII and system secrets.

## 3. Agent Tiers & Roles
- **Tier 1 (Core)**: Fundamental platform agents (e.g., CodeGenerator).
- **Tier 2 (Specialized)**: Logic-bound experts (e.g., SecurityAudit, FileOps).
- **Tier 3 (Internal)**: Observability and housekeeping (e.g., TaskReviewer, MetricsAnalyzer).

## 4. Coding Protocols
- **Language**: TypeScript (Node), Python 3.12 (Vault/Crypto).
- **Agent Framework**: All new agents MUST extend `StandardForgeAgent` and provide a manifest defining their tier and role.
- **Context Awareness**: Agents MUST utilize the `ProjectContextEngine` for all codebase-related queries.
- **Dependency**: All shared infrastructure must live in `packages/` (monorepo).
- **Testing**: TDD is enforced via Vitest. All core logic MUST have corresponding `__tests__`.
