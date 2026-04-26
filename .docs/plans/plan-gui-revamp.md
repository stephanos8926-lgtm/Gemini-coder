# GUI Revamp & Analysis Plan

## 1. Objectives
- **Aesthetic Refinement:** Audit layout, typography, animations, and color palettes against best-in-class product design principles.
- **Component Consistency:** Identify and unify redundant components, standardizing on the selected design system (currently mixing raw Tailwind and Radix/Vaul primitives).
- **Ergonomics & Layout:** Evaluate the dual-mode responsive layout.
  - *Desktop:* 3-column `react-resizable-panels` flow.
  - *Mobile:* Adaptive `RW_mobileView` utilizing bottom-sheets.

## 2. Target Component Surface

### Core Layout Managers
- `src/App.tsx` (Global orchestration, routing logic)
- `src/components/Header.tsx` (Global navigation, settings access, sign-in states)
- `src/components/AdaptiveBottomSheet.tsx` (Handset focus modal)
- `src/components/MobileSidebar.tsx` (Handset drawer)

### High-Fidelity UI Panels
- `src/components/ChatPanel.tsx` (AI conversation, markdown rendering, tool call loading states)
- `src/components/CodeEditor.tsx` (Monaco boundary, theme mapping, syntax highlighting)
- `src/components/FileTree.tsx` (Directory rendering, indentation logic, selection states)
- `src/components/TerminalPanel.tsx` (Xterm.js CSS overrides)

### Shared Primitives & Styles
- `src/index.css` (CSS variables, `@theme`, scrollbar customizations)
- UI Kit dependencies in package.json (Tailwind plugins, `lucide-react`, `motion`).

## 3. Immediate Action Items
- **Sync Typography:** Verify `index.css` font configurations (e.g., standardizing Inter for UI, JetBrains Mono for Code/Terminals).
- **Polish Interactions:** Identify areas missing motion transitions (using `motion/react` where appropriate) for menu opening, file saving states, and bot streaming responses.
- **Surface Audit:** Check for any remaining inline styles violating the Tailwind methodology.
