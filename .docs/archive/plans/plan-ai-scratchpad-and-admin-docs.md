# Implementation Plan: AI Scratchpad, Admin Docs & Advanced Git

## Phase 1: AI Scratchpad (Visual Diff Review)
**Goal:** Prevent destructive AI edits by staging suggestions in a visual Monaco Diff Editor for user authorization.

### Research & Optimal Approach
*   **Diff Editor UI:** `monaco.editor.createDiffEditor` is the industry standard (used by VS Code, Cursor). We will use an overlay modal or a split-pane `DiffStagingPanel.tsx` depending on view context.
*   **Best Practice Layout:** A side-by-side split is standard for desktops, accompanied by inline diffs for mobile (`renderSideBySide: false` based on viewport width). 
*   **Virtual Staging Environment:**
    *   Creates a `useScratchpadStore` to hold `pendingEdits: Record<string, { original: string, proposed: string, status: 'pending'|'accepted' }>`
    *   To allow the AI to *seamlessly* use its existing tools (`edit_file`), we instruct the AI (via `AGENTS.md`) to write its proposed edits to an isolated virtual staging layer (`/.staging/`).
    *   When the UI detects a file change via `filesystemService.events` ending up in `/.staging/*`, it auto-triggers the Diff Viewer comparing the original source with the `.staging` artifact.
*   **Milestones:**
    1. Create `src/store/useScratchpadStore.ts` to manage pending approvals.
    2. Build `DiffStagingPanel.tsx` component using `<DiffEditor />` from `@monaco-editor/react`.
    3. Update `AGENTS.md` so AI outputs changes to `/.staging/{filepath}` instead of directly overwriting files (or creates a special "Suggest Code" tool flow if we manage tools, else use the folder convention).
    4. Implement generic logic: "Accept" copies `.staging` -> `/src`, "Reject" deletes `.staging`.

## Phase 2: Admin Documentation Engine
**Goal:** A bespoke UI for generating and viewing dynamic, beautiful architectural documentation leveraging Gemini.

### Research & Optimal Approach
*   **Doc Rendering:** Use `react-markdown` with `remark-gfm` (for tables/tasks) and `mermaid` (for graphs/visualizing system flows).
*   **Styling:** Tailwinds `@tailwindcss/typography` (`prose prose-invert lg:prose-xl`) is the gold standard for creating Stripe-like beautiful HTML markdown output effortlessly.
*   **API Design:** Build an Admin-only path: `GET /api/admin/docs`. This endpoint invokes Gemini, supplying it the active filesystem contents and instructing it to produce comprehensive Markdown.
*   **Milestones:**
    1. Hook up `/src/components/AdminDocs.tsx` locked behind `AuthGuard`.
    2. Implement Markdown + Typography rendering layer.
    3. Construct Prompt Template representing "Architectural Codebase Deep Dive".
    4. Cache outputs to prevent unnecessary LLM invocations.

## Phase 3: Full Git Integration
**Goal:** Elevate `isomorphic-git` beyond local-only tracking to full remote push/pull capabilities.

### Research & Optimal Approach
*   **Security:** GitHub Personal Access Tokens (PAT) must be stored securely locally (or encrypted in DB) and NEVER bundled in source.
*   **Branch Visualization:** Instead of complex Canvas API graphing, a simple linear commit history using existing Tailwind lists (`lucide-react` node icons) is highly performant on mobile/Moto G7.
*   **Milestones:**
    1. Add GitHub Token input inside `SettingsModal.tsx`.
    2. Pass token dynamically through `app.post('/api/git', ...)` headers to the `isomorphic-git` execution backend.
    3. Add "Push to Remote", "Pull from Remote", and "New Branch" actions to `GitPanel.tsx`.

## Phase 4: Advanced Multiple-Tab Code Editor
**Goal:** Refactor the existing single-file editor into an industry-standard multi-tab interface with IDE-level features (Minimap, Breadcrumbs, AI Autocomplete).

### Research & Optimal Approach
*   **State Management Strategy:** Instead of rendering multiple heavyweight Monaco instances side-by-side using `display: none` (which crashes mobile devices), the industry best practice is caching Monaco *Models* (`monaco.editor.createModel`). `@monaco-editor/react` supports passing a `path` prop to dynamically switch the underlying model without unmounting the editor.
*   **UI/UX:** Add a horizontal scrollable tab bar (`<EditorTabs />`). Implement Breadcrumbs (`src > components > App.tsx`) and toggleable right-hand Minimaps.
*   **AI Autocomplete (GitHub Copilot style):** Utilize Monaco's `languages.registerInlineCompletionsProvider`. On an `onChange` idle timeout, we hit a proxy endpoint to Gemini 1.5 Flash (for lowest latency). It responds with an `items: [{ insertText }]` block which Monaco renders as "ghost text". The user presses `Tab` to accept.
*   **Milestones:**
    1. Update `fileStore` to track `openedFiles: string[]` and `activeFile: string`.
    2. Build `<TabBar />` UI hooked into the store.
    3. Modify `<CodeEditor />` to switch the `path` prop reactively to preserve undo/redo history per file.
    4. Implement `InlineCompletionsProvider` calling out to a new Gemini auto-complete endpoint.

## Phase 5: Rich Chat Context Mentions (@ injections)
**Goal:** Allow users to dynamically pull explicit context into the prompt buffer using the `@` symbol, mimicking tools like Cursor or GitHub Copilot Chat.

### Research & Optimal Approach
*   **Input Component Architecture:** Replacing standard `<textarea>` with a heavyweight Rich Text Editor (like Slate.js or Lexical) often introduces extremely complex cursor management bugs on mobile. The safest, most performant approach is an "Overlay Pattern": a standard `<textarea>` sits behind a visually matched `div` that parses and highlights `@mentions` (or tracking cursor coordinates via `get-caret-coordinates` to pop up a `MentionMenu` at the exact typing location).
*   **Mention Types Brainstormed & Supported:**
    *   `@context` or `@project` -> Injects the auto-generated project architecture summary (`AdminDocs`).
    *   `@file:[name]` -> Injects the specific AST/contents of the chosen file.
    *   `@folder:[name]` -> Injects a tree of the folder + summary of contents.
    *   `@terminal` -> Pipes the last 100 lines of terminal output / stderr into the context.
    *   `@git` -> Pipes `git diff` into the context (explaining uncommitted changes).
*   **Milestones:**
    1. Replace `ChatPanel`'s basic input with a `MentionTextarea` component.
    2. Build a floating `MentionMenu` triggered by `@` matching regex `/@\w*/`.
    3. Implement an interceptor in the `sendMessage` payload that replaces raw text (e.g. `@file:App.tsx`) with a compiled `<context>` block wrapper before hitting the LLM.

## Phase 6: AI Long Horizon Task Management
**Goal:** Create a persistent, reorderable background task queue that the AI autonomously executes over long horizons, keeping the user updated.

### Research & Optimal Approach
*   **State & Concurrency:** The safest, most interoperable way for the UI and AI to share a task queue without complex WebSocket race-conditions is a unified File State approach: `/.forge/tasks.json`. The AI treats this json as a source of truth to read/edit using its native filesystem tools, and the React UI reacts to it via the existing `filesystemService.events`.
*   **AI Rules & Workflow:** We utilize `AGENTS.md` (which is natively supported by the Google AI Studio platform—meaning the platform automatically intercepts its content and injects it into our system prompt) to instruct the AI with rules like: "When asked to do long running tasks, read `tasks.json`, do the highest priority. Upon completion, emit a notification to the file and move to the next."
*   **UI/UX:** A slide-in drawer/panel (`<TaskOverlay />`) utilizing a lightweight drag-and-drop mechanism (e.g., `@dnd-kit/core` or simple arrow sorting for mobile performance) allowing the user to seamlessly add, remove, and promote tasks.
*   **Notification Engine:** When the AI modifies the task state to `completed`, the frontend intercepts this and triggers:
    1. A UI Toast notification (`sonner` or existing toast library).
    2. A Web Notification API push (if permitted) so the user is alerted even if the browser tab is minimized.
*   **Milestones:**
    1. Create `/.forge/tasks.json` structure and `AGENTS.md` instructions.
    2. Build the `<TaskOverlay />` slide-in panel in the IDE.
    3. Implement drag-and-drop reordering that synchronizes back to JSON.
    4. Implement the Notification watcher intercepting completed state flags.

## Phase 7: Dynamic Hook-based Behavior Injection
**Goal:** Implementation of a modular, file-system-driven "Hook" system that allows injecting ephemeral, condition-specific instructions into the agent's system prompt.

### Research & Optimal Approach
*   **Architecture:** Create `/.forge/hooks/<action_name>/` directory pairs:
    *   `code.ts` (Node/TypeScript executable integration logic for the hook)
    *   `prompt.md` (The dynamic system instruction injected only when this hook is triggered)
*   **Prompt Orchestration:** Implement a `PromptOrchestrator` middleware layer. 
    1. Intercepts tool calls and specific application actions.
    2. Dynamically reads `prompt.md` for the relevant action.
    3. Assembles a "Turn-Local" system prompt: `[Global AGENTS.md] + [Hook-specific instruction]`.
    4. Executes, then clears the local instruction for the next turn to prevent "prompt drift".
*   **Milestones:**
    1. Define the hook directory structure (`/.forge/hooks/`).
    2. Build the `PromptOrchestrator` to manage the lifecycle of instruction injection/clearance.
    3. Define the first action-specific hooks (e.g., `create-new-project`, `git-commit-helper`).

## Phase 8: AI Contextual Suggestion Overlay
**Goal:** Implement a context-aware "Quick Action" overlay above the chat input, offering 5 AI-generated suggestions based on recent conversation and project state.

### Research & Optimal Approach
*   **UX/UI Pattern:** Inspired by GitHub Copilot Chat's "Quick Actions" and AI Studio's suggest-prompts.
*   **Performance Constraint:** We *must* avoid expensive LLM calls on every keystroke. 
    *   **Trigger:** Trigger only when chat is idle for $>1$ second and input is empty, OR via a "refresh" reload button.
    *   **Context Compression:** Sending the whole project is too slow. We will send a `ContextSummary` payload: (1) Active Filename, (2) Last 5 message UIDs, and (3) a one-line summary of the current branch/task.
*   **Implementation Engine:**
    *   **API:** Dedicated `/api/chat/suggest` endpoint.
    *   **Rendering:** A `ChatSuggestionOverlay.tsx` component that renders a `flex-wrap` list of "Pill" buttons. Upon click, this component executes the `onSelect(text)` injection into the Chatbox's internal state.
*   **Milestones:**
    1. Build `ContextAggregator` to produce compact LLM payloads.
    2. Build `/api/chat/suggest` Gemini endpoint.
    3. Implement `ChatSuggestionOverlay.tsx` UI with debounced trigger logic.

## Priority Order for Execution
1. [ ] Build the AI Scratchpad (Pending Edits + Diff Editor).
2. [ ] Phase 4: Advanced File Tabs & Editor UI.
3. [ ] Phase 5: `@` Context Mentions inside Chat.
4. [ ] Phase 6: AI Long Horizon Task Manager.
5. [ ] Phase 7: Dynamic Hook-based Behavior Injection.
6. [ ] Phase 8: AI Contextual Suggestion Overlay.
7. [ ] Construct the Admin Docs route and UI.
8. [ ] Expand `isomorphic-git` for branch and remote Auth.
