# Plan - Fix React Hook Errors

## Goal
Resolve "Invalid hook call" errors preventing the application from rendering correctly.

## Stack
- React 18
- TypeScript
- Vite
- Tailwind CSS

## File Structure
- `src/App.tsx`: Main entry point, likely contains complex hook logic.
- `src/components/`: UI components.

## Milestones
1. [ ] Audit `App.tsx` for hook violations.
2. [ ] Audit `SettingsModal.tsx` and `AdminPage.tsx`.
3. [ ] Audit custom hooks (`useFileSystem`, `useSocket`, etc.).
4. [ ] Fix identified violations.
5. [ ] Verify with `lint_applet` and `compile_applet`.

## Open Questions
- Where specifically is the "Invalid hook call" occurring? (Need to check console logs if possible, or infer from code).
