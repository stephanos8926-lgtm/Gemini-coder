# Architectural Decisions - File System & Project Management Enhancements

## 2026-04-01 18:30:25
- **Filesystem Mode:** I chose to use a dedicated backend server (`server.ts`) to provide real filesystem access. This allows GIDE to act as a self-hosting IDE.
- **Debounced Auto-Save:** To prevent excessive disk I/O, I implemented a 1-second debounce for saving file changes from the editor.
- **Lazy Loading Content:** To keep the initial load fast, file contents are only fetched when a file is selected in the UI.

## 2026-04-01 18:37:15
- **Multi-Stage Docker Build:** I chose a multi-stage Docker build to keep the final production image small by excluding build-time dependencies and source files not needed for runtime.
- **Production Runner:** I'm using `tsx` in the production image for simplicity, as it handles TypeScript files directly without a separate compilation step for the server.
