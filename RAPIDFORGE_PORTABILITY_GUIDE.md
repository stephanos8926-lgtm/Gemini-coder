# RapidForge Portability & Setup Guide

This guide outlines the steps required to port the RapidForge infrastructure (EHP, POL, Warden, RapidVault) from the AI Studio container to a dedicated private server or cloud environment.

## 1. Environment Requirements
- **Node.js**: v20 or higher (TypeScript 5.x)
- **Python**: v3.12 (required for `@rapidforge/vault` crypto operations)
- **Package Managers**: 
  - `npm` or `pnpm` for Node.js
  - `uv` for Python (highly recommended for performance and isolation)
- **Runtimes (Production Mode)**: Podman or Docker (for `SandboxService` containerization)
- **Storage**:
  - Filesystem access for JSON manifests.
  - SQLite for session/event persistence.

## 2. Package Architecture (`/packages`)
We transitioned core logic into a monorepo-ready structure inside the `packages/` directory. When porting:
1. Initialize the `@rapidforge` scope in your private registry or local workspace.
2. Ensure the following package divisions are maintained for separation of concerns:
   - `@rapidforge/ehp-core`: Types and base bus implementation.
   - `@rapidforge/pol`: Orchestration and health monitoring logic.
   - `@rapidforge/warden`: RBAC rules and interceptor middleware.
   - `@rapidforge/vault`: Port the `vault_engine.py` and its bridge.

## 3. Integration Points
The AI Studio integration currently hooks into the Express server (`server.ts`). To port this to a new application:

### A. EHP Initialization
Add the following to your server entry point:
```typescript
import { bus } from './src/lib/ehp/Bus';
import { orchestrator } from './src/services/OrchestrationLayer';
import { warden } from './src/services/SecurityWarden';

// Start the EHP and services
const ehpBus = bus;
const ehpOrchestrator = orchestrator;
const ehpWarden = warden;
```

### B. Governance Gate
Apply the Warden middleware to high-risk endpoints:
```typescript
const allowed = await bus.request({
  id: uuidv4(),
  type: EHPMessageType.COMMAND,
  topic: 'fs.read',
  payload: { filePath },
  auth: { uid, role, permissions }
});

if (!allowed) throw new Error('Blocked by Security Warden');
```

## 4. RapidVault Setup
1. **Python Virtualenv**: Use `uv venv` within the `packages/rapidforge-vault` directory.
2. **Library Installation**: Install `pynacl`, `argon2-cffi`, and `shamir-secret-sharing`.
3. **Secret Key Provisioning**: Ensure a system-wide `MASTER_ENCRYPTION_KEY` is provided in your `.env` (not version controlled).
4. **Shamir's Split**: Configure the `threshold` and `shares` count for your organization's key recovery policy.

## 5. Security & Isolation (Production)
- **Cgroups**: On Linux, ensure the user running the service has permission to manage cgroups for the `SandboxService`.
- **Unix Sockets**: For local IPC, update the `ehp-hub` configuration to use `/tmp/ehp.sock` instead of a network port to reduce vertical attack surface.
- **Warden Rules**: Customize `SecurityWarden.ts` to include your organization-specific IP restrictions and sensitive file patterns.

## 6. Maintenance & Logs
- **LogTool**: The implementation uses a centralized `LogTool`. Ensure your environment redirects these logs to an ELK stack or cloud logger (e.g., Cloud Logging) for traceability.
- **EHP Audit**: Periodic pruning of the EHP SQLite message log is required to prevent storage bloat.
