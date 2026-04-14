# Status: RapidForge Architecture

[x] DONE — Conceptualize RapidForge ecosystem (ForgeGuard, Agent, Platform).
[x] DONE — Install dependencies (`js-yaml`, `better-sqlite3`, `winston`).
[x] DONE — Implement `ConfigUtility` (Failover: Default -> YAML/JSON -> Env with `RW_` prefix).
[x] DONE — Implement `PersistenceManager` (SQLite-backed sensor registry and signal backlog via Node.js Worker Thread).
[x] DONE — Implement `Omitter` and `Sensor` interfaces (Proxy-based hooking).
[x] DONE — Implement `ForgeGuard` singleton base class (Advanced routing, backpressure).
[x] DONE — Implement concrete `Sensor` classes (TUISensor, HTTPSensor, RemoteDBSensor, LocalFileSensor, SQLiteSensor).
[x] DONE — Integrate `ForgeGuard` with `LogTool` (Winston wrapper).
[x] DONE — Hook `ForgeGuard` into the main application entry points (`server.ts`, etc.).
[x] DONE — Implement AST-driven error prediction (Static Analysis with `@babel/traverse` + Runtime Telemetry).
[x] DONE — Integrate Patch Engine with ForgeGuard signals for autonomous self-healing.
[ ] NEXT — Build a UI Dashboard to visualize SQLite telemetry stats.

## Findings & Decisions
- **Architecture**: Adopted a Proxy-based Wrapper approach for hooking into existing code, prioritizing stability and performance over zero-modification "magic" hooks.
- **Performance**: Chose Static Analysis (at startup/build) + Runtime Telemetry over full runtime AST analysis to prevent catastrophic performance degradation.
- **Configuration**: Enforced `RW_` prefix for environment variables to cleanly separate RapidForge config from general app config.
