# Research & Implementation Plan: Advanced Coding Intelligence & Multi-Tier Caching

## 1. Objective
Enhance GIDE's intelligence and performance through:
- **Intelligent Context Management**: Token-aware truncation and prioritization in `streamGemini`.
- **Advanced AST Summarization**: Multi-language (JS/TS/Python) structural summaries for better AI context.
- **Multi-Tier File Caching**: High-performance in-memory LRU + persistent SQLite cache with user-isolation and BLAKE3 invalidation.

## 2. Research Findings

### 2.1. Token Management
- **Strategy**: Use a sliding window for messages but prioritize:
    1. System Instructions (Immutable)
    2. Most recent $N$ messages.
    3. Relevant file context (Symbol Graph).
- **Tooling**: We can use `tiktoken` (or a lightweight JS equivalent like `gpt-tokenizer`) for precise counting, or a heuristic (4 chars/token) for speed.

### 2.2. AST Summarization (Symbol Graph)
- **JavaScript/TypeScript**: Babel is already in use. We will extend it to capture more metadata (exported members, types, decorators).
- **Python**: Use `tree-sitter` or a dedicated Python parser. Since we are in a Node environment, `tree-sitter` is the most robust option for multi-language support.
- **Symbol Graph**: Represent relationships between files (imports/exports) to help AI understand dependencies.

### 2.3. Multi-Tier Caching
- **Tier 1 (L1)**: In-memory `Map` with LRU eviction.
- **Tier 2 (L2)**: SQLite (using `better-sqlite3` or `sql.js`). SQLite is preferred for its ACID compliance and performance.
- **Security**: Cache keys will be prefixed with `userId:workspaceId` to prevent cross-user data leaks.
- **Invalidation**: BLAKE3 hashes are extremely fast. We will use `blake3` npm package.

## 3. Implementation Plan

### Phase 1: Advanced AST & Symbol Graph (`src/utils/astChunker.ts`)
- [ ] Install `tree-sitter` and `tree-sitter-python`.
- [ ] Refactor `generateAstSkeleton` to support multiple languages.
- [ ] Implement `SymbolGraph` class to track cross-file references.

### Phase 2: Multi-Tier Cache (`src/lib/filesystemService.ts`)
- [ ] Install `better-sqlite3`, `lru-cache`, and `blake3`.
- [ ] Implement `FileCacheManager` (Singleton pattern).
- [ ] Integrate cache check in `getFileContent` and invalidation in write operations.

### Phase 3: Intelligent Gemini Streaming (`src/lib/gemini.ts`)
- [ ] Implement `ConversationManager` to handle history truncation.
- [ ] Integrate structural summaries into the system prompt.

### Phase 4: Refactoring & Design Patterns
- [ ] Use **Factory Pattern** for AST Parsers.
- [ ] Use **Singleton Pattern** for Cache and Filesystem Services.
- [ ] Add architectural notes for future improvements.

## 4. Architectural Notes (Refactoring Candidates)
- **FilesystemService**: Convert to a Class with **Dependency Injection** for the cache layer.
- **GeminiClient**: Use **Strategy Pattern** for different truncation algorithms.
- **ASTParsers**: Use **Abstract Factory** to return the correct parser based on file extension.
