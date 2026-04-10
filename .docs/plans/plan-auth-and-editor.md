# Plan: Auth and Editor Enhancements

## Goal
1. Implement GitHub Authentication and a dedicated Landing Page.
2. Enhance Code Editor with linting (ESLint, Ruff) and formatting (Prettier).

## Stack
- Auth: Firebase (Google + GitHub)
- Editor: Monaco
- Linting: ESLint, Ruff
- Formatting: Prettier

## Milestones
1. [ ] Create `LandingPage.tsx` and update `App.tsx` routing.
2. [ ] Implement GitHub Auth provider in Firebase.
3. [ ] Implement backend linting/formatting endpoints (`server.ts`).
4. [ ] Integrate linting/formatting into `CodeEditor.tsx`.
5. [ ] Add "Format on Save" and "Format Code" actions.

## Open Questions
- Is `ruff` available in the environment? (Need to check).
