# Palette's Journal - Critical UX & Accessibility Learnings

This journal contains critical UX and accessibility learnings discovered during the development of RapidForge.

## 2026-05-16 - Professional IDE Aesthetic for StatusBar
**Learning:** Solid brand colors on high-frequency UI elements like the StatusBar can be distracting and feel less "integrated" into the IDE.
**Action:** Use `bg-surface-card` and `text-text-primary` with subtle borders to achieve a professional, native-feeling aesthetic that aligns with high-end tools like VS Code or AI Studio.

## 2026-05-16 - Accessible Icon-Only Buttons
**Learning:** Many interactive icons lacked ARIA labels and clear focus indicators, hindering screen reader users and keyboard navigators.
**Action:** Always provide `aria-label` and `focus-visible:ring-2` (using `accent-intel`) for all icon-only buttons to ensure full accessibility.
