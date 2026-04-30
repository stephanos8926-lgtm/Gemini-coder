# RapidForge Skill System Adoption Guide

This guide details the integration and usage of the RapidForge reusable Skill system. Skills are encapsulated, task-specific bundles of instructions, scripts, and context used to extend autonomous agent capabilities.

## 1. Directory Structure
Skills reside in the `.forge/skills/` directory (or `/skills/` for core ecosystem-wide skills).

```text
.forge/skills/<skill-name>/
├── SKILL.md          # MANDATORY: Metadata (YAML) and instructions
├── scripts/          # Helper scripts (Python/shell)
├── resources/        # Assets, templates, schemas
└── examples/         # Usage patterns
```

## 2. Skill Anatomy (`SKILL.md`)
Every skill MUST start with YAML frontmatter for discoverability and system constraints:

```yaml
---
name: <Name>
description: <Brief description>
requirements:
  - <Requirement 1>
  - <Requirement 2>
---
# Implementation Instructions
... detailed instructions ...
```

## 3. Adoption Lifecycle for AI Agents
When tasked with a feature that matches a skill, agents MUST:
1. **Discover**: Check `/.skills` and `/.forge/skills` to see if a skill exists.
2. **Read**: View the `SKILL.md` BEFORE taking ANY action (Blocking constraint).
3. **Execute**: Follow the instructions provided in `SKILL.md`.
4. **Govern**: If the skill involves high-risk actions (filesystem, shell, infra), ensure all operations are funneled through the `Security Warden`.

## 4. Developing New Skills
1. **Creation**: Create the directory structure in `.forge/skills/`.
2. **Definition**: Define `SKILL.md` including instructions and any necessary `scripts/`.
3. **Integration**: If the skill requires infra resources (Vault secrets, POL orchestration), note the integration requirements in the skill's instructions.
4. **Validation**: Test the skill in the local sandbox before moving it to the system-wide `/skills/` folder.

## 5. Ecosystem Governance
Skills are subject to the same governance as services:
- **RBAC**: A skill's usage may be restricted to certain agent roles.
- **Auditing**: All autonomous tool/script executions triggered by a skill are recorded via the EHP bus.
