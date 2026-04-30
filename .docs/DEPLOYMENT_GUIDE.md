# RapidForge Deployment Guide

## 1. Prerequisites
- **OS**: Linux (Ubuntu 22.04+ recommended for kernel sandboxing features).
- **Runtimes**: Node.js v20+, Python v3.12 (with `uv`).
- **Orchestration**: Podman or Docker (for Production `ContainerSandbox`).

## 2. Infrastructure Setup
1. **Initialize EHP**: Ensure SQLite/Redis is available for persistence.
2. **Configure Warden**: Populate `config/warden_whitelist.json` with system-level trusted paths.
3. **Provision Vault**: 
   - Define `MASTER_ENCRYPTION_KEY` via Environment.
   - Configure SSS threshold for your organization's key recovery requirements.

## 3. Deployment Steps
1. **Build**: `npm run build` (compiles TS to dist/, optimizes vault bridge).
2. **Environment**:
   - `RAPIDFORGE_ENV=production`
   - `RAPIDFORGE_MODE=container`
3. **Run**: Start the server service `node dist/server.js`.
4. **Health Check**: POL will automatically detect registered services and initialize health polling.
