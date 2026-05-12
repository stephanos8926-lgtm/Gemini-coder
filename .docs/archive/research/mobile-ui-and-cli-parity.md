# Mobile GUI & Ecosystem Parity Research

## 1. Mobile GUI & UI/UX Parity (Mobile-First AI IDEs)
Our current implementation (`MobileIDE.tsx`) utilizes basic mobile layout, but reaching true parity with leading mobile-first AI IDEs (e.g., Replit mobile, Cursor mobile web, ChatGPT app) requires several key pattern shifts:

### Current vs. Desired State
- **Current**: Standard stacked layout with some conditionally rendered components.
- **Desired UI/UX Enhancements**:
  1. **Bottom Sheet Architecture**: Context panels, file trees, and terminal should slide up as bottom sheets rather than taking full screens. This keeps the chat or editor always partially visible as context.
  2. **Keyboard-Aware Input Bars**: A quick-action bar attached directly to the mobile keyboard top edge for fast formatting, slash commands (`/`), and context tagging (`@`).
  3. **Swipe Gestures**: Swipe left/right on chat messages to branch conversations, or swipe on file names to quickly peek or close.
  4. **Floating Action Buttons (FABs)**: For summoning the AI input from any screen without navigating back to a main chat view.

## 2. OpenWebUI Input Structure & Paradigms
OpenWebUI excels in how it structures the input field and context management.

### Key OpenWebUI Patterns to Adopt
- **Context Tagging (`#`, `@`, `/`)**: Typing `#` opens a popover to attach files, `@` brings in symbols or workspaces, and `/` invokes specific system commands or tools directly.
- **Inline Parameter Tweaks**: Ability to adjust system prompts, temperature, or model directly from the chat input without going to a separate settings page.
- **Multimodal Artifact Bar**: Uploaded files, images, and codebase references appear above the input as pill-shaped artifacts with easy dismissal.
- **Token Budget Visualizer**: A small horizontal bar or indicator inside the input area showing how much of the context window is consumed by the current prompt + attachments.

## 3. CLI Parity (Claude Code, Gemini CLI, Qwen Code CLI)
Achieving parity with terminal-native AI coding assistants requires adapting their non-blocking, highly agentic workflows.

### Core CLI Features
- **Unrestricted Shell Execution (Sandboxed)**: Claude Code uses `bash` tools to navigate heavily. We need PTY integration (already mapped in `server.ts`) exposed securely to the AI in a way that handles standard input/output streams smoothly.
- **Deep Git Integration**: `gemini-cli` and others heavily use branch context, diffs, and staging.
- **Autonomous Tool Chains**: Allowing the AI to run a tool, analyze the output, and run a subsequent tool without waiting for user confirmation (agentic loop).

## 4. Reusable Skills & Sub-Agents System
Advanced workflows rely on delegation. Instead of one monolithic prompt, the system should dispatch tasks.

### Architecture for Parity
- **Skill Definitions (YAML/JSON)**: Allow users to define reusable skills (e.g., `audit-security`, `refactor-react`) in a `.forge/skills` directory.
- **Subagent Delegation**:
  - **The Router**: The primary model analyzes intent.
  - **The Specialist**: If the user asks to "audit CSS", the Router delegates to a "Styling Subagent" loaded with the `design-system-skill`.
  - **The Synthesis**: The main agent merges subagent outputs.
- **Shared Memory vs. Isolated Memory**: Subagents should receive a sliced view of the `ProjectContextEngine` (passing a specific `tenant` and narrowing scope) rather than the whole context, preventing context exhaustion.

## Conclusion and Immediate Next Steps
1. **Frontend**: Refactor the chat input component to support OpenWebUI-style dynamic context pill attachments and slash commands.
2. **Mobile**: Implement a robust Bottom Sheet library (e.g., `vaul` or `react-spring-bottom-sheet`) to replace full-screen mobile overlays.
3. **Backend/Orchestration**: Formalize the `ForgeGuard` and `ProjectContextEngine` to support isolated Subagent tasks, allowing tools to be executed autonomously in a loop.
