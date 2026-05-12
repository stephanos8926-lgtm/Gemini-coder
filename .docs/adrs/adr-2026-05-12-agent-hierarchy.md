# ADR-2026-05-12: 3-Tier Agent Hierarchy & Integration

## Context
As the RapidForge ecosystem grows, we need a refined hierarchical structure for agents to prevent "god agents" and ensure clear separation of concerns. This ADR defines the structure and lifecycle of the agent tiers.

## Decision
We will standardize agents into three distinct tiers of inheritance and specialization.

### Tier 1: The Primitive (`BaseForgeAgent`)
- **Responsibility**: Core lifecycle, EHP bus connection, environment safety, and system mandate enforcement.
- **System Prompt**: Global constraints (e.g., "Always use TypeScript," "Respect .gitignore," "Log all tool calls to EHP").
- **Integration**: LangChain BaseClass extension.

### Tier 2: Domain Controllers (Specialized Base Classes)
These agents define the *capabilities* and *personas* for a specific ecosystem domain.
- **POL Agent Base**: Infrastructure management, failover, and log pruning.
- **Security Warden Base**: RBAC enforcement, threat detection, and message interception.
- **IDE Assistant Base**: Code generation, refactoring, and user chat.
- **Embedded/MiniAgent Base**: Lightweight, cost-optimized agents for context compression, summarization, and autocomplete.
- **Configuration**: Domain-specific model (e.g., Gemini 1.5 Flash for MiniAgents, Pro for IDE), temperature, and specialized toolsets.

### Tier 3: Task Specialists (Leaf Agents)
These are instances derived from Tier 2, tailored for specific developer use cases.
- **Examples**: `CodeArchitect` (from IDE), `FailoverMonitor` (from POL), `SecurityAuditor` (from Warden).
- **Swarm Capability**: A boolean flag `canJoinSwarm` allows these agents to be automatically discovered by the `SwarmRouter`.

## Technical Implementation

### 1. Unified EHP Pipeline
- **Enforcement**: All AI tool calls MUST be published as `agent.command` on the EHP.
- **Observation**: All agent "thoughts" (internal reasoning) are published to a private `agent.trace` topic for debugging.

### 2. Prompt Synthesis Engine
The engine will recursively compound prompts:
```typescript
const prompt = agent.parent.prompt + "\n" + agent.tier2.prompt + "\n" + agent.tier3.prompt;
```
It supports **Variable Embedding**:
- `{{ PROJECT_CONSTANTS }}`: Service-wide enums and IDs.
- `{{ USER_INFO }}`: RBAC claims and preferences.
- `{{ @FILE_PATH }}`: Runtime injection of file contents into the context.

### 3. Logic Gates in Templates
Limited syntax for conditional prompt generation:
- `{% if capability == 'filesystem' %} ... {% endif %}`

## Consequences
- **Observability**: Every agent action is audited and traceable on the EHP.
- **Maintainability**: Changing a platform constraint in Tier 1 propagates immediately to all agents.
- **Cost Control**: Explicit Tier 2 definitions for MiniAgents prevent using expensive models for trivial tasks.
