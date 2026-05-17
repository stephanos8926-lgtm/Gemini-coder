## 2026-05-17 - [Theme Migration and Accessibility Standard]
**Learning:** Migrating from hardcoded hex values to semantic Tailwind tokens (e.g., `accent-intel`, `surface-base`) significantly improves consistency and maintainability. Removing default browser outlines (`outline-none`) must always be accompanied by a custom `focus-visible` state to maintain keyboard accessibility.
**Action:** Use the `@theme` variables defined in `src/index.css` for all styling and ensure all interactive elements have ARIA labels and focus indicators.
