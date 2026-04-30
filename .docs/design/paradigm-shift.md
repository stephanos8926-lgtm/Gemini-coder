# Architectural Migration: RapidForge & Event Horizon

## 1. Executive Summary
This design mandates the migration of core infrastructure components from `src/` into a dedicated `packages/` ecosystem (`@rapidforge/`). This shift addresses technical debt, enables cross-application code sharing, improves compilation performance, and establishes the foundation for a browser-native Agentic Mesh.

## 2. Event Horizon Pipeline (EHP) - The Communication Spine
### Migration Strategy
- **`packages/rapidforge-ehp-core`**: Shared types (`Envelope`, `PrincipalType`), interface definitions.
- **`packages/rapidforge-ehp-hub`**: Multi-modal message bus (adapters for: Unix Socket (Local), TCP/UDP Socket (Network), MCP).

### Persistence & Data Tiering Strategies
The EHP will manage data across a multi-layered storage hierarchy, replicated by a background "EHP Syncer" (cron-like worker):
- **Hot (Fast/Ephemeral)**: In-memory cache for high-frequency pub-sub messages and POL Agent states.
- **Warm (Structured)**: Asynchronous SQLite for event logs, relational state, and auditing.
- **Cold (Durable)**: Persistent JSON on Filesystem + optional Cloud-based (e.g., Firebase) component state.

## 3. Platform Orchestration Layer (POL) - The Operational Brain
### Migration Strategy
- **`packages/rapidforge-pol`**: Service lifecycle and health monitoring.
- **POL Agent**: AI-driven DAG orchestrator for complex, autonomous operational tasks (modeled on LangGraph principles).

### Sandboxing & Isolation
- **Abstraction Layer**: `packages/rapidforge-sandbox` provides a unified interface.
- **Mock Mode**: Uses local process isolation/FS jails.
- **Production Mode**: Interfaces with Docker/Podman for hardware-level isolation (Namespaces, cgroups).

## 4. Security Warden & RBAC - The Governance Gate
### LDAP-Style User System
- **Schema**: Data models will mirror LDAP directory structures (Users, Groups, Roles, Attributes).
- **Dual-Encryption Strategy**:
    - **Layer 1 (System)**: AES-256 for all data-at-rest.
    - **Layer 2 (User)**: Per-user secondary encryption key for sensitive metadata (API keys, workspace secrets).

### Migration Strategy
- **`packages/rapidforge-warden`**: Interceptor middleware for EHP messages.
- **`packages/rapidforge-rbac`**: Pervasive RBAC/Identity governance applied via EHP middleware.

## 6. Agentic Orchestration Strategy
### Framework: LangChain + LangGraph
- **LangChain**: Utilized as the foundational library for tool integration (e.g., shell commands, file operations, web search) and prompt management, providing a unified interface for the AI to interact with the environment.
- **LangGraph**: Implemented as the control plane for the POL Agent. It manages state transitions, DAG-based task decomposition, and cyclical retry loops, preventing infinite generation by enforcing an explicit graph state and termination criteria.

### Strategic Advantages
- **Determinism**: Graph-based flow restricts the model to authorized paths and specific exit states.
- **Persistence**: LangGraph provides built-in mechanisms to persist operational state between task steps, mitigating memory washout if a session restarts.
- **TDD Enforcement (Superpowers Methodology)**: Using LangGraph, we can explicitly define "failing" and "passing" nodes, forcing the agent to adhere to the test-driven development workflow required for production-grade stability.

