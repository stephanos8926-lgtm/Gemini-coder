# Task Plan - Full-Stack Filesystem Integration

## Phase 1: Backend Setup
- [x] Update `package.json` dev script to `tsx server.ts`.
- [x] Create `server.ts` with Express and Vite middleware.
- [x] Implement filesystem API endpoints.

## Phase 2: Frontend Integration
- [x] Create a `filesystemService.ts` to handle API calls.
- [x] Update `App.tsx` to load initial files from the backend.
- [x] Sync file changes to the backend.
- [x] Update `FileTree` actions to call backend APIs.

## Phase 3: Verification & Feature Enhancements
- [x] Restart dev server.
- [x] Verify that GIDE can now see and edit its own source code.
- [x] Test file creation, deletion, and renaming on the real filesystem.
- [x] Implement workspace isolation.
- [x] Fix header UI layout and file size display.
- [x] Implement sub-workspace management.
- [x] Add Workspace Browser modal.
- [x] Implement comprehensive Configuration Page.
- [x] Update model configuration.
- [x] Implement AI-Powered Code Actions.
- [x] Implement Global Search & Replace.
- [x] Implement Command Palette (Ctrl + K).
- [x] Implement Git-Style Visual Diff.
- [x] Remove non-filesystem fallback mode.
- [ ] Integrate ForgeGuard Debugger (UI profiling, AI chat triggers, error automation).

## Phase 4: Deployment & Documentation
- [x] Update `package.json` with a `start` script.
- [x] Update build script to include server.
- [x] Create `Dockerfile` and `.dockerignore`.
- [x] Update project metadata and README.
- [x] Remove unused folder icon from header.
- [ ] Provide a deployment guide for Google Cloud Run.
