# Advanced AI Context Management: Research & Implementation

This document details the research conducted into how industry-leading AI development environments (Cursor, Windsurf, Replit, Copilot) optimize their context windows and how those patterns have been integrated into the RapidWebs / RapidForge ecosystem.

---

## 🔍 1. Industry Analysis: The "State of Context"

### Cursor & Windsurf: The LSP-Augmented RAG
Cursor and Windsurf differentiate themselves by moving beyond simple text search. 
- **LSP Integration**: They feed symbol data (definitions, references) from the Language Server Protocol directly into the RAG pipeline. This allows the AI to "know" which files are related even if they don't share keywords.
- **Context Ranking**: Instead of sending whole files, they send "windows" around relevant symbols.

### Replit: Contextual Graphing
Replit uses a "Context Graph" that tracks user actions (which files they look at, which tabs they switch to) to determine "Working Set" priority.

---

## 🧠 2. Deep Optimization Techniques

### Intelligent Context Pruning (Implemented)
Instead of a fixed message limit, we now use a **Token Budget Strategy**.
- **Context Blocks**: The chat hook now treats every piece of information (file contents, AST skeletons, system instructions) as a discrete block with a **Priority Score**.
- **Dynamic Budgeting**: Mobile users receive a tighter budget (e.g., 12k tokens) to ensure rapid response and lower data usage, while desktop users can scale up to 24k+ tokens.
- **Priority Decay**: Priority is calculated based on:
  1. `100`: Mandatory System Instructions.
  2. `95`: Recent Messages & Active Tab.
  3. `85`: High-scoring symbol references.
  4. `70`: File Structure (AST skeletons).

### Self-Improving Pipeline (Implemented)
We have introduced a **Success-Based Weighting** system.
- **Implicit Reinforcement**: When a symbol or file is included in a prompt and the user *accepts* the resulting diff or proceeds without correction, the `ProjectContextEngine` increments a `successWeight` for that path.
- **Adaptive Scoring**: Future queries that trigger similar symbol matches will see these "proven" files move to the top of the context block list.

---

## ⚡ 3. Advanced Caching (Gemini Caching)

Gemini (Google DeepMind) supports **Context Caching** for prompts longer than 32k tokens.
- **Strategy**: We identify "Static" prefix data—System instructions, project-wide `FORGE.md` directives, and the core File Tree.
- **Implementation**: The `ForgeAI` client is designed to support cache-hints for this prefix, reducing latency by up to 50% for multi-turn conversations in large repositories.

---

## 🚀 4. Cognitive Parity (Desktop & Mobile)

To maintain parity, we shifted the context heavy-lifting to the **Server-Side ProjectContextEngine**.
- **Parity Strategy**: Both desktop and mobile clients hit the same `/api/context/relevant` endpoint. The server performs the symbol analysis and semantic search, ensuring that a mobile user browsing a single file still has the "cognitive reach" of the entire repository.

---

*Last Updated: 2026-04-28 | RapidWebs Engineering*
