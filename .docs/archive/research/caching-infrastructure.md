# Caching Infrastructure Audit & Proposal

## Current State
- **Tier 1**: In-memory `lru-cache` with TTL.
- **Tier 2**: Persistent `better-sqlite3` storage.
- **Hashing**: standard Node `crypto` SHA-256.
- **Invalidation**: Manual triggers in `FilesystemService`.

## Identified Gaps
1. **Hashing Overhead**: SHA-256 is cryptographically secure but slow for repeated invalidation checks on large codebases.
2. **Storage Bloat**: Full source code is stored uncompressed in SQLite, leading to database fragmentation and high disk usage over time.
3. **Stale Data Risks**: The cache doesn't proactively watch for external file changes (e.g., from git cli or external editors).
4. **Network Waste**: Client-side logic doesn't fully leverage IndexedDB for mirroring server cache, leading to unnecessary API calls for previously fetched files.

## Proposed Enhancements (The "SwiftCache" Upgrades)

### 1. High-Performance Hashing (BLAKE3 / XXHash)
- **Action**: Replace `crypto.createHash('sha256')` with `blake3` (or `xxhash-wasm` as a fallback).
- **Benefit**: Up to 10x faster hashing for large files, reducing latency during invalidation checks.

### 2. Structural Compression (LZ4)
- **Action**: Use `lz4` to compress file content before inserting into SQLite.
- **Benefit**: ~50-70% reduction in storage footprint with negligible CPU cost. Extremely fast decompression during cache hits.

### 3. Proactive Invalidation (Chokidar integration)
- **Action**: Register a global `chokidar` watcher at the `server.ts` level. On `change` or `unlink` events, broadcast invalidation signals via Socket.io.
- **Benefit**: Real-time cache consistency.

### 4. Client-Side Parity (IDB-Mirroring)
- **Action**: Use `idb-keyval` to store fetched file content in the browser.
- **Logic**: 
  1. Check L1 (Zustand/Memory).
  2. Check L2 (IDB).
  3. Fetch from Server (Server checks its own L1/L2).
  4. Hydrate local caches.

## Recommended 3rd Party SDKs

| SDK | Purpose | Why? |
| :--- | :--- | :--- |
| **`blake3`** | Hashing | Parallelizable, much faster than SHA-2 for code files. |
| **`lz4`** | Compression | Prioritizes speed over ratio, perfect for cache layers. |
| **`chokidar`** | Watching | Reliable cross-platform file system events. |
| **`dexie`** | IndexedDB | High-level wrapper for browser persistence if logic gets complex. |
| **`msgpack-lite`** | Serialization | Smaller binary format than JSON for cache storage. |

## Implementation Roadmap
1. [ ] **Milestone 1**: Implement `blake3` hashing in `FileCacheManager`.
2. [ ] **Milestone 2**: Add `lz4` compression to Tier 2 (SQLite) storage.
3. [ ] **Milestone 3**: Setup global File Watcher in `server.ts`.
4. [ ] **Milestone 4**: Extend `FilesystemService` with browser IDB mirroring.
