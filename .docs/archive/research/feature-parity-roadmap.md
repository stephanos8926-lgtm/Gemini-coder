# RapidForge Research: Feature Parity & Mobile Innovation
Date: 2026-04-28

## 1. Feature Parity Analysis (vs. Cursor/Windsurf)
To reach industry parity, RapidForge requires:
- **Composer/Flow UI**: A side-by-side multi-file diff engine that creates "edit sessions" rather than single-file writes.
- **Embedded Context (RAG)**: Full-codebase indexing using Vector DB (already started via `embeddingEngine.ts`). We need to automate indexing on file save.
- **Symbolic Intelligence**: Real-time graph of classes/functions for precise AI navigation (see `symbolGraph.ts`).

## 2. General New Features
- **Ghost Text (Inline Autocomplete)**: Predictive code completion that appears as grayed-out text, accepted via Tab.
- **Terminal Integration (Intelli-Shell)**: AI-powered command suggestions inside the Wasm Terminal.
- **Forge Guard Debugger**: Automatic log analysis that suggests fixes immediately when an error appears in the console.

## 3. Mobile-First Capabilities
- **Long-Press Refactors**: Mobile users can't easily select large blocks of text. We need a "Magic Wand" icon on long-press that offers Contextual Refactoring.
- **Voice-Assistant Programming**: "RapidForge, extract this hook into its own file" via voice commands.
- **Reviewer Swiping**: Swipe Right to accept a code change, Swipe Left to reject. Optimized for phone screens where full code editing is difficult.
- **Biometric Git Signing**: Using FaceID/TouchID to sign off on commits directly from the mobile app.

## 4. Next Implementation Steps
1. Finalize the `WasmTerminalEngine` to support standard shell utilities.
2. Integrate `Zustand` store deeper into the `ChatPanel` for multi-file propose-and-merge cycles.
3. Optimize Monaco mobile touch handling (hide minimap and gutter on small screens).
