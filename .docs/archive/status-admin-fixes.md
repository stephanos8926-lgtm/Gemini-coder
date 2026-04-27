# Status: Admin Panel & Server Fixes

[x] DONE — Enhanced `AdminPage` with better error reporting for auth failures.
[x] DONE — Improved `TerminalPanel` with `ResizeObserver` and socket error reporting.
[x] DONE — Added detailed logging to server-side workspace listing and admin auth.
[x] DONE — Allowed admins to see all workspaces in `/api/workspaces`.
[x] DONE — Refactored `App.tsx` by extracting `Header` and `AuthGuard` components.
[x] DONE — Refactored `useSocket` to use `useState` and `useRef` for robust connection management.
[~] IN PROG — Monitoring logs for `ADMIN_SECRET_KEY` and PTY spawning issues.
[ ] NEXT — Verify workspace visibility after auth fixes.

## Findings
- `server.ts` uses `env.ADMIN_SECRET_KEY` for `/api/admin/*` routes.
- `server-config.ts` enforces `ADMIN_SECRET_KEY` presence.
- Terminal uses `python3 -c 'import pty; pty.spawn("/bin/bash")'`.
- Added `ResizeObserver` to `TerminalPanel` to ensure `fit()` is called when the container is ready.
- Added detailed error messages to `AdminPage` to distinguish between "Invalid Key" and "Key Not Configured".
- Admins now have a global view of all workspaces across all users.
