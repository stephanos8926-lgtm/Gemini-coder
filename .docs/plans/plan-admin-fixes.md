# Plan: Admin Panel & Server Fixes

## Goal
Resolve issues with admin code rejection, fix the blank terminal, and address workspace visibility/creation bugs.

## Stack
- Frontend: React 19, Vite, Tailwind CSS, Zustand, TanStack Query
- Backend: Express, Node.js, Firebase Admin, Socket.io
- Terminal: XTerm.js, Python PTY spawn

## Milestones
1. [ ] **Admin Authentication Fix:** Verify and fix `ADMIN_SECRET_KEY` usage in `AdminPage.tsx` and `server.ts`.
2. [ ] **Terminal Diagnostics:** Add logging to `server.ts` and `TerminalPanel.tsx` to identify why the terminal is blank.
3. [ ] **Workspace Visibility Fix:** Debug `listWorkspaces` and workspace creation logic to ensure they are correctly persisted and displayed.
4. [ ] **Error Handling & Stability:** Implement global error boundary and better API error reporting.

## Open Questions
- Is `ADMIN_SECRET_KEY` set in the environment?
- Why is `pty.spawn("/bin/bash")` failing or not sending data?
- Are workspace paths correctly resolved for the current user?
