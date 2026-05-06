## 2026-05-06 - [Dark Theme Refactor & Accessibility]
**Learning:** Hardcoded colors like #007acc should be replaced with semantic Tailwind variables like `accent-intel` to maintain theme consistency and allow for future skinning. Accessibility (ARIA labels, focus states) should be integrated during color refactoring to minimize touchpoints.
**Action:** Always check `src/index.css` for semantic theme variables before applying colors. Ensure all icon-only buttons receive `aria-label` and `focus-visible` rings.
