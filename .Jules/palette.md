## 2026-05-10 - Refactoring Hardcoded Colors and Improving Accessibility
**Learning:** Hardcoded hex colors (e.g., #007acc, #3c3c3c) create a disjointed UX and make theme maintenance difficult. Semantic design tokens (surface-card, border-subtle, accent-intel) should always be used to ensure consistency with high-end AI environments like AI Studio.
**Action:** Use existing Tailwind theme variables for all UI components. Always add aria-label and focus-visible states to icon-only buttons during any component refactor.
