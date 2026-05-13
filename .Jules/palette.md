## 2026-05-13 - [Semantic Theming in Tailwind 4]
**Learning:** Tailwind 4 allows for a powerful semantic theming system using CSS variables in the `@theme` block. This enables easier refactoring from hardcoded hex values to meaningful names like `accent-intel`.
**Action:** Always prefer semantic tokens over hardcoded hex values to maintain UI consistency and support future theme changes.

## 2026-05-13 - [Accessibility in Icon-Only Buttons]
**Learning:** Icon-only buttons are common in IDE-like interfaces but often lack proper ARIA labels, making them inaccessible to screen readers.
**Action:** Ensure every icon-only button has a descriptive `aria-label` and visible focus states (`focus-visible:ring-2`) for keyboard users.
