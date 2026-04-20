# ADR: Singleton-to-DI Refactor (ForgeNexus)

**Context**: ForgeNexus library components (ForgeGuard, PersistenceManager) were previously implemented as hardcoded singletons, creating tight coupling with IDE-specific paths and making unit testing impossible without environment-level mocks.

**Decision**: Refactored the core library to utilize **Dependency Injection (DI)** through constructors, managed by a centralized **NexusFactory**.

**Consequences**:
- **Positive**: Components are now testable in isolation (`vitest`). Circular dependencies are broken. Portability is improved.
- **Negative**: Adds minor boilerplate for object instantiation.
