# ADR: 2026-04-02-refactor-roadmap

## Status
Proposed

## Context
The current application is a monolithic React SPA with a custom Express backend. `App.tsx` exceeds 1400 lines, leading to context degradation, difficult testing, and high risk of regression. State management is coupled directly to the main component, and API interactions lack robust schema validation.

## Recommendations

### 1. Architectural Decomposition
- **Component Modularization:** Extract UI components from `App.tsx` into a structured `/src/components/` directory.
- **State Management:** Migrate global state (workspace, auth, file system) to `Zustand` for predictable, decoupled state management.

### 2. Reliability & Robustness
- **Schema Validation:** Integrate `zod` for all API request/response validation on both frontend and backend to eliminate runtime type errors.
- **Centralized Error Handling:** Implement a global error boundary in React and a unified error middleware in Express.

### 3. Developer Experience
- **Service Layer Refinement:** Standardize API interactions using `ky` (a tiny, robust `fetch` wrapper) instead of raw `fetch`.
- **Testing:** Introduce `Vitest` for unit testing and `Playwright` for E2E testing to establish a "Known-Good" baseline.

## Proposed Roadmap
1. **Increment 1:** Refactor API service layer to use `zod` for request/response validation.
2. **Increment 2:** Decompose `App.tsx` into modular components.
3. **Increment 3:** Implement `Zustand` for state management.
4. **Increment 4:** Establish E2E testing baseline.
