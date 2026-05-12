# ADR-2026-05-12: Automated Patching & Scoring System

## Context
The user requires an automated patching system that is rigorous, precise, and safe. The system must decide when to auto-patch (Dev) or propose PRs (Prod) based on a risk assessment. Furthermore, this system must leverage the standardized **BaseForgeAgent** framework and the **ProjectContextEngine** for high-fidelity code awareness.

## Decision
We will implement a **Multi-Agent Review & Shadow Validation** pipeline for all automated patches, integrated with the EHP for governance.

### 1. Shadow Validation
Every patch proposed by a "Worker Agent" must first pass through the `ShadowExecutionEngine`.
- **LSP Check**: Leverage the `ProjectContextEngine` to run TypeScript compiler diagnostics on the modified virtual source.
- **AST Integrity**: Verify symbol references are intact via the symbolic graph provided by the context engine.

### 2. Scoring System (`Reviewer Agent`)
A specialized Sub-Agent (derived from `BaseForgeAgent`) will evaluate the patch and assign a **Confidence Score (CS)** and a **Risk Score (RS)**.
- **Criteria**:
  - **Complexity Delta**: Calculated via Tree-sitter AST analysis.
  - **Type Surface**: Detect changes in public exported interfaces.
  - **Test Impact**: Identify intersecting test paths via the DAG.
- **Logic**:
  - If `RS > 85%`: STOP. Flag for human review in `ForgeGuard Dashboard`.
  - If `RS < 20%` & `CS > 90%`: Auto-apply (Dev) or Auto-PR (Prod).

### 3. Record Keeping (POL - Policy/Provenance)
Every action is recorded in `data/persistence/patch_registry.sqlite`.
- Fields: `original_snippet`, `patched_snippet`, `git_hash_pre`, `git_hash_post`, `reviewer_score`, `agent_id`.
- Support for `REVERT` commands that use Git's reflog to restore state.

## Consequences
- Increased latency for patch application (due to sub-agent review).
- Improved system stability through high-fidelity context aware validation.
- Transparency in AI actions via the EHP Audit trail.
- Unified behavior across all patch-related agents.
