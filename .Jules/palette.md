# Palette's Journal - UX & Accessibility Learnings

## 2025-05-15 - Initial Audit
**Learning:** Found significant inconsistency between the defined semantic theme (Tailwind 4) and hardcoded VS Code blue (#007acc). Semantic variables should always be preferred to ensure theme-ability and brand consistency.
**Action:** Systematically replace hardcoded hex colors with semantic Tailwind classes (e.g., `text-accent-intel`, `bg-accent-intel`).
