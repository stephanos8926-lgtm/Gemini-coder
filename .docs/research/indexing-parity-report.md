# ProjectContextEngine: Indexing Parity & Market Analysis

## 1. Feature Parity Report

| Feature | Aider | Roo Code | Github Copilot | Continue | Claude Code | **RapidForge (Proposed)** |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Parsing Engine** | Tree-sitter | VS Code API | Prop. Internal | Tree-sitter | Prop. Internal | **Tree-sitter + LSP** |
| **Symbol Ranking** | PageRank | Basic | Vector / Jaccard | Vector Search | Contextual | **DAG-Aware PageRank** |
| **Delta Indexing** | Periodic | On-demand | Background | Background | On-demand | **Real-time (Fsevents)** |
| **Context Injection**| Repo Map | Chat-based | RAG / Embeds | RAG / Vector | Selective | **Dynamic @Token Injection**|
| **Multi-repo Support**| Limited | Yes | Yes | Yes | Limited | **Full Workspace Mesh** |

## 2. Market Gap Analysis

### Gap 1: High-Fidelity LSP Integration
Most tools rely solely on static parsing (Tree-sitter). While fast, it misses type-level nuances. RapidForge will integrate directly with active Language Server Protocols (LSP) to provide "Type-Safe Context" (e.g., knowing exactly which `User` interface is being referenced across modules).

### Gap 2: Reactive DAG Synchronization
Existing tools treat the index as a static asset. RapidForge's `ProjectContextEngine` will be aware of the `TaskDAG`. It will proactively index and cache symbols related to the *logical successors* of the current task to minimize context switching latency.

### Gap 3: Governance-First Indexing
None of the current tools natively support RBAC at the indexing layer. RapidForge will filter the symbol graph based on the user's `AuthContext` in the EHP, ensuring developers only see symbols they are authorized to interact with.

## 3. Recommended Implementation (ProjectContextEngine)

1.  **Scanner**: Use `tree-sitter` for rapid symbol extraction.
2.  **Grapher**: Store symbols in a directed graph where edges represent imports/references.
3.  **Watcher**: Bind to native FS events to invalidate/update nodes in milliseconds.
4.  **Retriever**: Use a hybrid approach — Weighted Symbol Map (Aider-style) + Semantic Vector Search (Continue-style).
