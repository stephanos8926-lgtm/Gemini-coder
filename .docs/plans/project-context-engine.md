# Implementation Plan: ProjectContextEngine & Agent Standardization

## Phase 1: Core Indexing & Agent Primitive (Week 1)
- [ ] **Symbol Extraction**: Implement `SymbolScanner` using `tree-sitter` for TS/JS/Python.
- [ ] **BaseForgeAgent**: Create the Tier 1 class extending LangChain's `BaseChatModel` or `BaseAgent`.
- [ ] **EHP Bridge**: Ensure all agent tool calls are emitted as `EHPEnvelope` messages.

## Phase 2: Agent Registry & Tier 2 Models (Week 1)
- [ ] **Registry**: Implement the master manifest service to track installed agents.
- [ ] **Tier 2 Templates**: Define templates for `POL`, `Warden`, `IDE`, and `MiniAgent`.
- [ ] **Prompt Compiler**: Support `{{ var }}` embedding and `{% if %}` logic gates.

## Phase 3: Real-time Context & IDE Integration (Week 2)
- [ ] **Reactive Watcher**: Bind `chokidar` events to the `ProjectContextEngine` for instant indexing.
- [ ] **Task Panel**: Expand the `BackgroundTaskPanel` to support Log Streaming and Agent Review.
- [ ] **Swarm Integration**: Port `SwarmRouter` to use LangGraph for orchestrating Tier 3 agents.

## Phase 4: Verification & Porting (Week 2)
- [ ] **Benchmarking**: Latency tests for the Context Engine.
- [ ] **Vitest Audit**: Implement unit tests for `BaseForgeAgent` inheritance and prompt compounding.
- [ ] **Porting**: Migrate all legacy AI calls to the `ForgeAgent` pipeline.
