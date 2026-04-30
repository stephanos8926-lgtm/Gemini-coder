# Agentic Orchestration Design (POL Agent)

## 1. Goal
Create a reliable, autonomous agent system using LangGraph that manages operational tasks within the RapidForge ecosystem, integrated with the Security Warden and EHP.

## 2. Architecture
The POL Agent operates as a stateful graph agent:
- **State**: Persistent object containing `workspaceId`, `currentTaskDAG`, `executionHistory`, and `remediationLogs`.
- **Graph Nodes**: 
    - `Planner`: Decomposes high-level requests into DAGs (using LangGraph/LangChain tools).
    - `Executor`: Triggers EHP events for real actions.
    - `Validator`: Checks EHP feedback via warden.
    - `Remediator`: Handles error states if Validator fails.
- **Edges**: Conditional logic based on execution success/fail signals.

## 3. Workflow (The "Loop")
1. **Request**: EHP message arrives destined for POL.
2. **Analysis**: Planner updates State and creates task DAG.
3. **Execution**: Executor publishes EHP messages.
4. **Warden Filtering**: Warden intercepts tools/FS ops.
5. **Feedback Loop**: EHP feedback is routed back to POL as a new event.
6. **Remediation**: If failed, Agent initiates corrective steps based on pre-defined policy.

## 4. Constraint Strategy
- **Rate Limiting**: Integrated into EHP middleware, enforced by Warden.
- **DAG Decomposition**: Complex tasks are split into atomic steps with checkpoints in the SQLite persistence layer to allow resuming after failures.
- **Human-in-the-Loop**: Critical/High-risk paths break the async loop and require human confirmation via the Admin panel (integrated via EHP alerting).
