# RapidForge Usage Guide

## 1. Governance Gate (Security Warden)
Every high-risk action (filesystem writes, shell executions) MUST be funneled through the `Security Warden`.
- Always generate an EHP message with the user's Auth context:
  ```typescript
  await bus.request({ ..., auth: { uid, role, permissions } });
  ```

## 2. Infrastructure Services (EHP/POL)
- **Adding a Service**: Register your service with the Orchestration Layer (`POL`).
- **Communication**: Use `bus.publish()` for events, `bus.request()` for synchronous/governance-gated actions.
- **Heartbeats**: All managed services MUST emit `service.heartbeat` to the EHP bus or be marked as failed by POL.

## 3. Sandboxing
- Use `SandBoxService` for any spawned process.
- Default to `UnixSandbox` in local development to enforce cgroups and process isolation.
- Configure `ContainerSandbox` for Cloud Run/Production to enable hardened AppArmor/SELinux profiles.
