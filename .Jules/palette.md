## 2026-04-30 - Brand Alignment and Accessibility Polish
**Learning:** Hardcoded brand colors (like VS Code blue #007acc) often persist through rebranding efforts, creating a fragmented UI experience. Semantic Tailwind classes linked to CSS variables are essential for maintainable theme parity with high-end environments like AI Studio.
**Action:** Always prefer `accent-intel` or other semantic variables over hex codes. Ensure icon-only buttons have `aria-label` and `focus-visible` rings to meet mandatory accessibility standards.
