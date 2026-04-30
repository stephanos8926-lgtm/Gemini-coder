# Event Horizon Pipeline (EHP) & Platform Orchestration Layer (POL)

## Overview
The EHP is the central communication backbone for the RapidWebs ecosystem. It provides a standardized, secure, and auditable way for services, users, and AI agents to communicate across boundaries (local, network, container, cloud).

## 1. Event Horizon Pipeline (EHP) Specification
### Core Components
- **Message Bus (The Mainline)**: Low-latency, high-throughput circuit for inter-process and inter-service communication.
- **Event Queue (The Registry)**: Persistent storage for events that require reliable delivery or auditing.
- **IPC Stack**: Native listeners and senders for local communication, abstracted for network transparency.

### Message Structure (EHP Envelope)
```json
{
  "id": "uuid-v4",
  "timestamp": "iso8601",
  "priority": "0-255",
  "source": { "id": "service-a", "type": "agent|user|system" },
  "destination": "service-b|broadcast",
  "topic": "fs.write",
  "payload": { ... },
  "context": {
    "requestId": "...",
    "workspaceId": "...",
    "sessionId": "..."
  },
  "auth": {
    "token": "...",
    "role": "...",
    "permissions": ["..."]
  }
}
```

## 2. Platform Orchestration Layer (POL)
### Responsibility
- **Service Lifecycle**: Managing the startup, health checks (init.d style), and shutdown of platform components.
- **Autonomous Remediation**: Monitoring telemetry and automatically triggering fixes (e.g., restarting a stuck agent loop).
- **Governance Integration**: Acting as the execution arm for the Security Warden.

## 3. RBAC & Governance
### Permission Hierarchy
- **Level 0 (System)**: Full control over hardware and platform config.
- **Level 1 (Admin/Operator)**: Infrastructure management, cross-user auditing.
- **Level 2 (User)**: Workspace-level operations.
- **Level 3 (AI Agent - Restricted)**: Limited write/read access based on task scope.

### The "Security Warden" Guard
- All AI tool calls are converted into EHP events.
- The Warden filters events:
  - `ALLOW`: Pass to execution.
  - `AUDIT`: Pass to background logger for async review.
  - `REMEDIATE`: Block execution, trigger alert, and start repair task via POL.
  - `BLOCK`: Fail synchronous execution.

## 4. Implementation Roadmap
1. **Backbone**: Implement `Bus.ts` for in-memory pub-sub with auditing.
2. **Orchestrator**: Implement `POL` for service registration and status monitoring.
3. **Warden**: Implementation of the filter pipeline in `SecurityWarden.ts`.
4. **Integration**: Connect `server.ts` file APIs to the EHP/Warden gate.
