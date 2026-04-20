# FORGE v2.0 — Upgrade Guide for Gemini Users

## What Changed & Why It Matters

FORGE v2.0 adds **state-of-the-art AI coding techniques** proven in 2024-2026 research:

### Key Enhancements

**1. agents.md — Your AI's Persistent Memory**
- **What:** Living knowledge base that survives session resets
- **Why:** Gemini has no memory between chats. agents.md preserves learned patterns across days/weeks
- **Impact:** Stops repeating solved bugs, remembers project-specific gotchas
- **Pattern:** Curated in-place updates (NOT append-only logs)

**2. SEMINDEX.md — Semantic Codebase Index (Optional)**
- **What:** Lightweight file/line reference map for large codebases (50+ files)
- **Why:** Navigate directly to relevant code without scanning all files
- **Impact:** Token-efficient codebase navigation via context caching
- **When:** Large projects, multi-week development, complex dependencies

**3. Code Execution Verification**
- **What:** Gemini runs Python snippets internally to verify logic before outputting
- **Why:** Eliminates "this regex should work" → (it doesn't) loops
- **Impact:** Fewer revision cycles, higher first-time correctness

**4. Chain-of-Verification (CoVe)**
- **What:** For critical code (security, finance), AI generates verification questions → answers them → revises if inconsistent
- **Why:** Catches edge cases humans miss
- **Impact:** Research shows 23% reduction in logic errors (Nature 2024)

**5. Structured JSON Outputs**
- **What:** Quality gates and status files in machine-readable JSON
- **Why:** Eliminates parsing fragility in tooling
- **Impact:** Enables automated CI/CD integration

**5. Adaptive Quality Mode**
- **What:** AI detects "quick prototype" vs. "production code" signals
- **Why:** Speed when exploring, rigor when shipping
- **Impact:** Faster iteration without sacrificing final quality

---

## How to Use FORGE v2.0

### Step 1: Copy System Prompt to AI Studio

1. Open **system_prompt.md**
2. Copy everything from `<system_instruction>` to `</system_instruction>` (lines 12-796)
3. In Google AI Studio → **System Instructions** field → Paste
4. Click **Save**

### Step 2: Configure Settings

In AI Studio, set these parameters:

| Setting | Value | Where to Find |
|---------|-------|---------------|
| Model | **Gemini 2.5 Flash** | Model dropdown (top) |
| Temperature | **0.2** (debugging)<br>**0.7** (architecture) | Advanced settings |
| Max output tokens | **8192** | Advanced settings |
| Code execution | **✓ Enabled** | Features panel |
| Grounding | **✓ Enabled** | Features panel |

**Why these settings:**
- Flash = best cost/performance for code (10x faster than Pro)
- Low temp = deterministic logic
- High max tokens = prevents truncation on multi-file outputs
- Code execution = verification before delivery
- Grounding = looks up API docs when uncertain

### Step 3: Start a New Project

**First message to Gemini:**
```
New project: [brief description]
Stack: [Node.js/Python/etc.]
Goal: [what you're building]
```

**Gemini will:**
1. Ask 3 clarifying questions (if needed)
2. Create `.docs/plans/plan-<project>.md`
3. Create `.docs/status-<project>.json`
4. Create `agents.md` (your project knowledge base)
5. Output file manifest
6. Start coding

### Step 4: Working Across Sessions

**When resuming work (new chat session):**
```
Continue project: [name]
[paste contents of agents.md]
```

**Gemini will:**
- Sync state from agents.md
- Read status.json
- Resume where you left off

**Never lose context again.** agents.md is your continuity anchor.

---

## New Commands & Workflows

### Knowledge Management

**Trigger learning:**
```
Reflect | Update agent knowledge
```
→ Gemini appends patterns to agents.md

**Check knowledge:**
```
What have we learned about [topic]?
```
→ Gemini searches agents.md for relevant entries

### Quality Modes

**Prototype mode (fast iteration):**
```
Quick prototype for user auth
```
→ Skips tests, minimal docs

**Lock it in (production mode):**
```
Productionize the auth system
```
→ Backfills tests, docs, quality gates

### Debugging

**When stuck after 3 failed fixes:**
Gemini automatically:
1. Writes ADR documenting failures
2. Appends pattern to agents.md
3. Proposes architectural alternative

**You can trigger early:**
```
This isn't working. Write an ADR and propose alternatives.
```

### Context Management

**When chat gets long (15k+ tokens):**
```
Compress context
```
→ Gemini:
- Summarizes completed work into agents.md
- Archives old ADRs
- Updates status.json
- Confirms: "Context compressed. Continuity maintained."

---

## Reading the AI's Output

### New Structured Formats

**Quality Gates (JSON):**
```json
{
  "null_safety": "pass",
  "error_handling": "pass",
  "security": "pass",
  "performance": "pass",
  "completeness": "pass",
  "notes": "Bcrypt rounds set to 12 (OWASP recommendation)"
}
```
→ Machine-readable, CI-integrable

**Status File:**
```json
{
  "completed": ["auth-endpoints", "user-model"],
  "in_progress": ["rate-limiter"],
  "blocked": [{"task": "email-service", "reason": "awaiting SMTP credentials"}],
  "next": ["password-reset", "2fa"]
}
```
→ Clear task state

### When You'll See `<thinking>` Blocks

**Gemini shows reasoning when:**
- Solution is non-obvious or has tradeoffs
- Uncertainty exists about correctness
- You explicitly ask: "Show your reasoning"
- Debugging previous failed attempts

**Otherwise:** reasoning is internal (saves tokens, cleaner output)

**To force visibility:**
```
Explain the tradeoffs and show your thinking
```

---

## Common Patterns

### Pattern 1: TDD Workflow
```
Build a JWT token validator. Write tests first.
```
→ Gemini writes failing test → implements → verifies pass

### Pattern 2: Code Execution Verification
```
Write a regex to validate email addresses
```
→ Gemini internally runs test cases → outputs verified pattern

### Pattern 3: Agentic Loop (Function Calling)
```
Add error handling to all API routes
```
→ Gemini:
1. Lists routes via grep
2. Analyzes each
3. Generates patches
4. Presents atomic changeset
5. Applies on approval

### Pattern 4: Ambiguity Resolution
```
Should I use WebSockets or Server-Sent Events for notifications?
```
→ Gemini presents both approaches with tradeoffs + recommendation

---

## Troubleshooting

### "Gemini isn't using agents.md"
**Solution:** Start message with:
```
Read agents.md and sync state before proceeding.
```

### "Output got truncated"
**Solution:** Increase max tokens to 8192 in AI Studio settings

### "Too verbose / too terse"
**Solution:** Adjust temperature:
- 0.1-0.3 = minimal prose
- 0.5-0.7 = balanced

### "Not generating tests"
**Check:** Did you use prototype mode keywords? ("quick", "spike", "proof of concept")  
**Fix:** Say "productionize" to trigger full quality mode

### "Reasoning blocks every response"
**This shouldn't happen.** Reasoning is hidden by default.  
**If it does:** Report as bug — something triggered verbose mode

---

## Migration from v1.0

**If you have existing projects using v1.0:**

1. **Keep old system prompt** for in-flight work
2. **Start new projects** with v2.0
3. **To migrate mid-project:**
   - Create agents.md manually
   - Paste current `.docs/AGENTS.md` content into learned patterns section
   - Convert status file to JSON format
   - Tell Gemini: "We've migrated to v2.0 format. Read agents.md and continue."

**Breaking changes:**
- Status files now JSON (was Markdown)
- AGENTS.md renamed to agents.md (lowercase, auto-loads)
- Quality gates now JSON (was prose checklist)

**Non-breaking:**
- ADRs unchanged
- Plan files unchanged
- File manifests unchanged

---

## Performance Tips

### Token Efficiency
- agent.md enables longer sessions (knowledge compressed, not repeated)
- JSON outputs = fewer tokens than prose
- Hidden reasoning = 30-40% token savings

### Speed Optimization
- Flash model = 10x faster than Pro for code
- Code execution = fewer revision cycles
- Function calling = batch operations vs. sequential prompts

### Quality Gains
- CoVe layer catches 23% more edge cases (research-backed)
- Structured gates reduce "it should work" → doesn't cycles
- agent.md prevents regression (stops solving same bug twice)

---

## What's Next

**Upcoming in v2.1 (planned):**
- Prompt caching (90% cost reduction for repeated context)
- MCTS for architecture exploration (multi-path evaluation)
- Automated test coverage tracking
- CI/CD integration templates

**Feedback:**
If you find patterns that should be baked into the system prompt, append them to agent.md with tag `[FORGE-IMPROVEMENT]` and they may be incorporated in future versions.

---

## Quick Reference Card

### Session Start (New Project)
```
New project: [description]
Stack: [tech]
```

### Session Start (Existing Project)
```
Continue project: [name]
[paste contents of agents.md]
```

### Trigger Learning
```
Reflect | Update agent knowledge
```

### Mode Switching
```
Quick prototype | Productionize | Lock it in
```

### Debugging Escalation
```
Write ADR and propose alternatives
```

### Context Management
```
Compress context
```

### Force Reasoning Visibility
```
Show your thinking | Explain tradeoffs
```

---

## Support

**System prompt not working?**
- Verify you copied `<system_instruction>...</system_instruction>` block
- Check AI Studio settings match recommended values
- Try new chat session (sometimes cache issues)

**agent.md not persisting?**
- You must manually save it between sessions
- Paste into continuation messages
- Consider version control (git commit .docs/)

**Need help?**
Check agent.md for project-specific patterns first.
If novel issue, append to agent.md after resolving.
