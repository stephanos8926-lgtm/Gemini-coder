## 2026-05-15 - Semantic Color Refactor & A11y Base
**Learning:** Hardcoded hex codes like #007acc are common in early-stage IDE prototypes but hinder theme consistency. Tailwind 4 CSS variables (e.g., accent-intel) provide a much cleaner integration path.
**Action:** Always prefer semantic theme variables over hex codes. When refactoring colors, ensure icon-only buttons receive ARIA labels and focus-visible rings simultaneously.

**Learning:** VS Code/IDE-style status bars feel more integrated when they use a card-surface background with a subtle border rather than a solid primary brand color.
**Action:** Use `bg-surface-card text-text-primary border-t border-border-subtle` for StatusBar components to match modern IDE aesthetics.
