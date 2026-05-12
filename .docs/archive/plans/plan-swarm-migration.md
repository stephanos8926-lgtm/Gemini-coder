# Context Engineering and Agent Swarm Migration Plan

## Goal
Transition the current single-agent Copilot architecture into a Long-Horizon Multi-Agent Swarm capable of headless execution, robust session continuity, and role-based context scoping.

## Current State Assessment
- **Working Context (Ephemeral):** Handled effectively via `ProjectContextEngine` and AST injection, but tightly coupled to a global "one-size-fits-all" prompt.
- **Session (Medium-Term):** Highly volatile. Stored in UI state (`useChatStore`) or ephemeral server memory (`gemini.ts` cache). Will not survive tab closures or headless agent background execution.
- **Memory (Long-Term):** Semantic retrieval exists (`EmbeddingEngine`), but is backed by browser-bound `idb-keyval` (IndexedDB). A headless swarm agent cannot access this.

## Phase 1: Storage & State Decoupling (The Prerequisite)
Before agents can run autonomously, state must be lifted out of the client.
1. **Server-Side Vector Database:** Migrate `EmbeddingEngine` off IndexedDB. Back it with standard SQLite (local) or Firestore (Vector Search) for durable backend access.
2. **Durable Session Graph:** Persist all conversations, tool calls, and execution chains to a backend `Sessions` table. Agents must be able to "wake up", query their `sessionId`, and rehydrate their context.

## Phase 2: Role-Based Context Engineering
1. Refactor `ProjectContextEngine` to support parameterized context constraints (e.g., `getWorkingContextForRole('SecurityScanner')`).
2. Remove hardcoded prompt structures in `gemini.ts`. Introduce a `SystemPromptBuilder` that dynamically shifts constraints based on the swarm role executing the task.

## Phase 3: Long-Horizon Orchestration
1. **Hierarchical Task Planning (HTP):** Introduce a "Manager Agent" that breaks user intents into sub-tasks.
2. **Shared Memory Bus (Blackboard Pattern):** Provide a central scratchpad for agents to hand off files, ASTs, and context to one another.
3. **Headless Execution Loop:** Modify `toolExecutor.ts` to execute async task graphs, logging progress back to the durable Session database rather than streaming directly to a waiting WebSocket connection.
