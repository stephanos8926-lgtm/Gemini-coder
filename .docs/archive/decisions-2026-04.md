# Architectural Decisions - File System & Project Management Enhancements

## 2026-04-01 18:30:25
- **Filesystem Mode:** I chose to use a dedicated backend server (`server.ts`) to provide real filesystem access. This allows GIDE to act as a self-hosting IDE.
- **Debounced Auto-Save:** To prevent excessive disk I/O, I implemented a 1-second debounce for saving file changes from the editor.
- **Lazy Loading Content:** To keep the initial load fast, file contents are only fetched when a file is selected in the UI.

## 2026-04-02 02:20:00
- **Direct Filesystem Enforcement**: Removed the non-filesystem fallback mode to simplify the codebase and ensure consistent behavior, as the direct filesystem approach is now stable.
- **Build Artifact Inclusion**: Included the backend `server.ts` in the `dist/` directory during build to ensure that the production environment has all necessary files to run the full-stack application.
