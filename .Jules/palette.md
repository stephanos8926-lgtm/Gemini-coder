## 2026-05-09 - [Tailwind 4 Semantic Tokens & A11y]
**Learning:** Tailwind 4 theme variables defined in `src/index.css` automatically generate utility classes. Hardcoded hex colors (e.g., from VS Code themes) should be refactored to these tokens for brand consistency. Accessibility is enhanced by pairing `outline-none` with custom `focus-visible:ring-2` styles and adding `aria-label` to icon-only buttons.
**Action:** Use `accent-intel`, `surface-card`, etc., and always ensure keyboard navigation focus states when modifying interactive components.
