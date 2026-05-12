# Status Report: IDE Background Task & Swarm Panel

## 1. Current Progress
- [x] **Core Manager**: `BackgroundTaskManager.ts` implements Task lifecycle (Create, Update, Progress, Logs, Abort).
- [x] **Base UI**: `BackgroundTaskPanel.tsx` provides a floating notification for active tasks with progress bars.
- [x] **Swarm Integration**: `SwarmMonitorPanel.tsx` exists to track multi-agent orchestration.

## 2. Gaps vs. Requirements
- **Pause/Resume**: `BackgroundTaskManager` defines a `paused` state but lacks implementation for actually suspending process execution (needs OS-level signal handling or generator-based cancellation).
- **Log Viewer**: The UI hides the `logs[]` array; it needs a dedicated expandable log stream.
- **Reorganization**: No GUI for re-ordering the task queue.
- **Sub-Agent Review**: No interface for the "mini sub-agent" to review, break down, or batch tasks.

## 3. Implementation Plan
1.  **Refactor Manager**: Update `executeTask` to support a `pause` signal.
2.  **Expand UI**: Transform `BackgroundTaskPanel` into a sidebar or tabbed view in the IDE `BottomPanel`.
3.  **Agent Delegation**: Create an `AgentOrchestrator` tool that allows the user to click "Review Queue" and trigger a specialized `PlannerAgent`.
