# Task Plan - Full-Stack Filesystem Integration

## Phase 1: Backend Setup
- [ ] Update `package.json` dev script to `tsx server.ts`.
- [ ] Create `server.ts` with Express and Vite middleware.
- [ ] Implement filesystem API endpoints:
    - `GET /api/files`: List files recursively.
    - `GET /api/files/content`: Read file content.
    - `POST /api/files/save`: Write file content.
    - `POST /api/files/create`: Create file/folder.
    - `POST /api/files/delete`: Delete file/folder.
    - `POST /api/files/rename`: Rename file/folder.

## Phase 2: Frontend Integration
- [ ] Create a `filesystemService.ts` to handle API calls.
- [ ] Update `App.tsx` to load initial files from the backend.
- [ ] Sync file changes to the backend (auto-save or explicit save).
- [ ] Update `FileTree` actions to call backend APIs.

## Phase 3: Verification
- [x] Restart dev server.
- [x] Verify that GIDE can now see and edit its own source code.
- [x] Test file creation, deletion, and renaming on the real filesystem.

## Phase 4: Deployment Preparation
- [ ] Update `package.json` with a `start` script.
- [ ] Create `Dockerfile` for multi-stage build.
- [ ] Create `.dockerignore` to exclude unnecessary files.
- [ ] Provide a deployment guide for Google Cloud Run.
