# Plan: Refactor Conversation Engine

## Goal
Create a robust, resilient, and debuggable conversation and tool execution engine.

## Stack
- TypeScript
- Google Generative AI SDK
- Express.js
- Existing Forge Infrastructure (`ForgeGuard`, `LogTool`, `liveDebugger`, `deepProfiler`)

## File Structure
- `src/lib/ConversationManager.ts`: Refactored from `gemini.ts` to manage full conversation state.
- `src/lib/ToolDispatcher.ts`: New class to handle tool dispatching and error handling.
- `src/lib/SkillExecutor.ts`: Updated to use `ToolDispatcher`.

## Milestones
1. [ ] Create plan and status files.
2. [ ] Refactor `ConversationManager` to manage history and context.
3. [ ] Implement `ToolDispatcher` with error handling and Forge wrappers.
4. [ ] Integrate `SkillExecutor` with `ToolDispatcher`.
5. [ ] Verify with tests and debugging tools.

## Open Questions
- How to handle tool execution errors gracefully to allow model correction?
- How to best integrate `deepProfiler` for tool performance monitoring?
