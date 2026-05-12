# Research Report: Agent Orchestration Parity & Multi-Agent Systems

## 1. Competitive Landscape Analysis

| Feature | AutoGen | CrewAI | LangGraph | Google Antigravity | **RapidForge (Proposed)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Orchestration** | Conversational | Process-based | State-based Graph | Agent-centric | **Stateful EHP Bus** |
| **Hierarchy** | Flat/Dynamic | Sequential/Consensual | Custom DAG | Hierarchical | **3-Tier Inheritance** |
| **Communication** | Direct Messaging | Task Passing | Shared State | Tool Delegation | **EHP Pub/Sub** |
| **Governance** | Manual Checks | Task Guardrails | Edge Constraints | Platform Enforced | **Warden Interception** |
| **Context Mgmt** | Window-based | Task-scoped | Thread-based | Session-scoped | **ProjectContextEngine** |

## 2. Key Industry Trends & Market Gaps

### trend 1: "Conversability" vs. "Execution"
Tools like AutoGen excel at discussion but struggle with reliable execution in complex environments. RapidForge differentiates by using the **EHP (Event Horizon Pipeline)** as the *only* way an agent interacts with the world, ensuring that every thought corresponds to a governed event.

### Trend 2: Hierarchical Delegation
CrewAI's "Manager" agents provide a great model for Tier 2 agents. RapidForge adopts this by defining Tier 2 "Domain Controllers" (e.g., IDE Assistant Base) that manage a pool of specialized Tier 3 sub-agents.

### Trend 3: Token-Efficient Prompting (Compounding)
Most tools use large, static system prompts. RapidForge's **Compounding System Prompt** system (Base -> Tier 2 -> Tier 3) ensures that specialized agents only carry the context they need while inheriting platform-wide constraints, significantly reducing token overhead and "prompt drift."

## 3. RapidForge Differentiators (The "Edge")

1.  **LSP-Aware Indexing**: Unlike generic RAG tools, our `ProjectContextEngine` leverages LSP data, allowing agents to "understand" types and symbols, not just text.
2.  **Shadow Validation**: Our `ShadowExecutionEngine` provides a safety net where agents' code changes are validated in a scratchpad before touching the filesystem.
3.  **RBAC-First Architecture**: While GitHub Copilot and others are beginning to add organization controls, RapidForge treats RBAC as a first-class citizen of the agent's communication bus (EHP).

## 4. Priority Roadmap
1.  **Phase 1**: Port existing `OrchestrationLayer` and `TaskRouter` to use the standardized `BaseForgeAgent`.
2.  **Phase 2**: Implement the `AgentRegistry` with Tier 2 template support.
3.  **Phase 3**: Integrate LangGraph for complex, multi-turn swarm logic (e.g., Code Refactor Workflows).
