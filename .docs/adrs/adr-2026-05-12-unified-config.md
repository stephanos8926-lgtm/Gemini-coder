# ADR-2026-05-12: Unified Configuration Management

## Context
The system requires a tiered, persistent, and secure configuration system that supports multiple principals (System, User, AI Agent).

## Decision
We will implement a **Layered Context Resolver** for all configuration parameters.

### 1. Hierarchy of Truth
Config values are resolved in descending order:
1.  **Level 0: Process ENV** (`RW_` prefixed) - Highest priority (Runtime overrides).
2.  **Level 1: Local File** (`nexus-config.json`) - Persistence across sessions/containers.
3.  **Level 2: Default Schema** (`packages/nexus/config/defaults.yaml`) - Hardcoded fallbacks.

### 2. Principal Segregation
Configuration is partitioned by scope to prevent collision and ensure security.
- `scope: 'system'` - Infrastructure parameters (DB paths, log levels).
- `scope: 'user'` - Personal preferences (UI theme, keybindings).
- `scope: 'agent'` - Forge Assistant personality and tool-use constraints.

### 3. Persistence & Sync
- **Local Persistence**: `NexusPersistence` adapter will ensure `nexus-config.json` is always accurate.
- **Service Sync**: Every 5 minutes, the system hashes the local config. If it differs from the last known state in `Firestore`, it initiates a reconciliation.
- **RBAC**: Access to `scope: 'system'` is restricted to principals with `role: 'admin'`.

## Consequences
- Single source of truth for all modules.
- Simplified environment setup for new developers.
- Enhanced auditability for configuration changes.
- Safe configuration inheritance for standardized AI Agents.
