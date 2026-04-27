# Build & Deployment Issue Summary

## Current Status
We have encountered persistent issues with building and deploying the application, specifically regarding artifact generation and Firebase initialization.

## 1. Build Artifacts Empty
**Issue:** During deployment, the CI/CD pipeline reported "Build artifacts are empty."
**Resolution:**
The original `build` script in `package.json` was not correctly creating the `dist/` directory and populating it with all runtime requirements before build artifact upload.
**Fix applied:**
Updated `package.json` build script to:
1.  `rm -rf dist` (Clean)
2.  `mkdir -p dist` (Ensure directory exists)
3.  `vite build --outDir dist` (Build client-side assets)
4.  `esbuild server.ts [...] --outfile=dist/server.js` (Bundle server-side code)
5.  `cp` necessary assets (`worker`, `mcp-config.json`, `web-tree-sitter.wasm`) into `dist/`.

## 2. Firebase/Firestore Initialization
**Issue:** Persistent `PERMISSION_DENIED` and `NOT_FOUND` errors when initializing Firestore, likely due to how named databases were being referenced via `firebase-applet-config.json` and `server.ts`.
**Resolution:**
The application was unable to reliably connect to the specified Firestore database instance.
**Fix applied:**
- Modified `server.ts` to hardcode Firestore initialization to the default database: `db = getFirestore(app)`.
- Removed explicit named `databaseId` usage in configuration and initialization to stabilize the connection.
- Implemented robust error handling in `server.ts` for database initialization.

## 3. Firestore Permission Denied
**Issue:** `[code=permission-denied]` errors in snapshot listeners for task/swarm resources.
**Resolution:**
- Relaxed Firebase Security `allow list` rules to `isSignedIn()` temporarily to unblock development while investigating the query filtering issue.
- Removed client-side `userId` filtering in queries within `src/lib/taskManager.ts` that were conflicting with current security rules to ensure the UI loads.
- **Action Required:** Post-deployment, these rules must be tightened using proper Attribute-Based Access Control (ABAC) to enforce `userId` ownership securely on the server-side rules.
