# Long Horizon Agents & Antigravity Research

## Google Antigravity / Long Horizon Capabilities
Reaching true "Long Horizon" autonomy in AI agents (similar to Google's Antigravity architecture) requires fundamentally shifting away from the standard synchronous "prompt/response" loop constraint.

### Key Components of Long Horizon Agents
1. **Asynchronous Task Cycles**: Long horizon agents operate on loops disconnected from the immediate user HTTP request. They are spawned as background processes or workers.
2. **Hierarchical Task Planning**:
   - **Planner / Router**: Breaks down complex user requests ("Build a web app") into a DAG (Directed Acyclic Graph) of sub-tasks.
   - **Worker Swarms**: Specialized sub-agents (e.g., Coder, Security Auditor, Tester) pick up tasks from the queue.
3. **Interruptibility & Checkpointing (Pause/Resume)**: The agent must be able to periodically save its state. If a task takes hours, it must handle interruptions or pause itself if it hits a blocking ambiguity, prompting the user asynchronously.
4. **Persistent Semantic Memory**: Using `ProjectContextEngine` and `EmbeddingEngine` to remember what was tried 3 hours ago, avoiding loops where the agent repeatedly tries a failed strategy.
5. **Tool Execution in Sandbox**: Autonomous capabilities to run `npx`, read outputs, and self-correct via a PTY or isolated runtime without user interaction.

## Swarm Coordination
- **Blackboard Pattern**: Agents post intermediate findings to a shared memory space (the workspace state/database) rather than direct agent-to-agent messaging, reducing token overhead.
- **Convergence / Reduction**: The Planner agent converges the outputs of workers back into a final consolidated diff or report.

## Gemini-CLI Feature Parity
`gemini-cli` excels at developer-centric workflows directly in the terminal environment.
1. **Deep Context Injection**: Automatically ingesting `.git` diffs, local branch state, and PR context to give the model temporal awareness of the project.
2. **Pipeline Chaining**: Piping outputs of one AI command into another (e.g., `git diff | gemini "review this" | grep ...`).
3. **Local Sandboxing**: Running tools without asking for permission (with safety boundaries), using the local machine's computing power to reduce network roundtrips.

## Implementation Path: Task Management System
To integrate this into Forge, we need a **Background Task Management System**:
1. **Server-Side Queue**: A registry for `BackgroundTask` objects (id, name, status, progress, logs) keyed by Tenant.
2. **Execution Engine**: Forking separate Node processes or isolated async event loops to run the agentic sub-tasks.
3. **User Interface**: A dedicated panel (likely in the Left or Right Sidebar) allowing users to see running background agents, read their logs, Pause them (via AbortControllers), Cancel them, or Resume them.
