# RapidForge IDE
> Advanced AI-Driven Development Environment for Production Systems.

RapidForge (formerly GIDE) is a high-performance, modular Integrated Development Environment architected for the next generation of AI-assisted software engineering. It combines professional-grade tooling with a multi-tier caching system ("SwiftCache") and AST-based code intelligence.

## 🛠 Engineering Core

- **High-Performance Caching**: Powered by SwiftCache — a multi-tier system utilizing **L1 (In-memory LRU)** and **L2 (SQLite + LZ4 Compression)**.
- **Advanced State Management**: Modularized state via **Zustand**, decentralized across workspace, auth, chat, and filesystem domains for maximum maintainability.
- **AST Unification**: Deep code understanding using **web-tree-sitter** for context extraction and token optimization.
- **Real-Time Sync**: Sub-millisecond filesystem synchronization via WebSocket triggers and FNV-1a hashing.

## 🌟 Professional Features

- **SwiftCache Architecture**: Optimized for industrial-scale codebases with sub-10ms retrieval latency.
- **Intelligent Refactoring**: Professional-tier AI chat experience with shiki-powered highlighting and visual staging.
- **Modular Brand System**: Centralized Branding Configuration (`appConfig.ts`) for easy organizational white-labeling.
- **Responsive Workspace**: Desktop-first precision with mobile-adaptive ergonomics.

## 🚀 Getting Started

1. **Environmental Setup**:
   ```bash
   npm install
   ```
2. **Launch Development Services**:
   ```bash
   npm run dev
   ```
3. **Configure API Intelligence**:
   Define `GEMINI_API_KEY` in your environment or via the in-app Key Sentinel.

## 📐 Architecture Stack

- **Foundational Layer**: React 18 / Vite 5 / TypeScript 5
- **Modular Intelligence**: Gemini 2.0 Flash / Nexus Sensor API
- **Persistence Layer**: better-sqlite3 / LZ4js / Persistence Middleware
- **Interface Design**: Tailwind CSS / Framer Motion / Lucide Nodes

## 🏛 Maintainer
**Forge Systems Architectures**  
Contact: [architecture@forge-systems.io](mailto:architecture@forge-systems.io)  
Repo: [https://github.com/forge-systems/rapidforge](https://github.com/forge-systems/rapidforge)

---
*License: Proprietary / Enterprise Research Edition*
