# Architecture Decision Record
## Context Engineering for Multi-Agent Swarms

**Date:** 2026-04-23
**Status:** Accepted for upcoming spike
**Context:** Our current single-agent Copilot struggles with long-horizon tasks because it relies on client-side state hooks (Zustand) and IndexedDB for memory. As we move to automated swarms (agents that coordinate and run in the background for hours), these components fail because headless servers don't have browser APIs.

**Decisions:**
1. **Memory Hierarchy Alignment:** We will officially partition agent context roughly following the MemGPT / LangGraph paradigms:
   - *Working Context:* Exclusively for the immediate LLM prompt window constraints (ASTs, active file). Managed by `ProjectContextEngine`.
   - *Episodic Memory (Session):* Immutable log of all events, tool calls, and user queries. Must be moved from `useChatStore` to a server-side relational database.
   - *Semantic Memory (Long-term):* Embeddings of codebases and docs. Must be migrated from IndexedDB to a server-side vector store (e.g., Firestore Vector Search or server SQLite).

2. **Decoupled Prompting:** We will deprecate the monolithic system prompt and instead use Role-Based Prompt factories. 

**Consequences:**
- (Negative) We lose the "zero-setup" benefit of using the browser for storage.
- (Negative) Requires a significant refactor of `gemini.ts` to manage async hand-offs instead of immediate HTTP streams.
- (Positive) Agents will survive browser refreshing.
- (Positive) Agents can execute background CI/CD fixes autonomously via the newly integrated `PatchEngine`.
