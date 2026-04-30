# Troubleshooting RapidForge

## 1. Security Warden Blocked Me
- **Why**: Warden checks RBAC/Permissions against the Auth context in the EHP envelope.
- **Fix**: Check `SecurityWarden.ts` rules for the specific path/tool. Verify your role and permissions are attached to the `req.user` context.

## 2. POL service failure
- **Why**: POL detected a service heartbeat timeout or critical crash.
- **Fix**: Check EHP logs via `NexusPersistence` or directly query the SQLite `telemetry.db`. If POL triggered remediation, look for `System-level failure` logs.

## 3. Vault Decryption Fail
- **Why**: Either passphrase mismatch, corrupted SSS shares, or corruption of the AES-GCM blob.
- **Fix**: Attempt to recover via SSS shares if the user's passphrase is lost. Verify system-wide `MASTER_ENCRYPTION_KEY` is correctly mounted.

## 4. Portability / Sandbox Issues
- **Why**: Cgroup/Namespace permissions denied by kernel.
- **Fix**: Ensure the service user has sufficient privileges for `cgroup` management. Use `SandboxService.debug(true)` to output kernel-level denials.
