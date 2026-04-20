# SEMINDEX.md — Semantic Index for Gemini Context Caching

> **Purpose:** Lightweight file/line reference map for large codebases  
> **Usage:** Cache this file + system prompt, then reference entries by ID in queries  
> **Reindex Triggers:** After major refactors, new file additions, or every 50 commits

---

## HOW TO USE THIS FILE (Meta-Instructions for Gemini)

### When to Read SEMINDEX.md
- ✓ Session start (if codebase >10 files)
- ✓ User asks "where is X implemented?"
- ✓ Before architectural decisions touching multiple files
- ✓ When debugging cross-file issues

### When to Update SEMINDEX.md
- ✓ After creating new files (add entry)
- ✓ After major refactors (update line ranges)
- ✓ After deleting files (remove entry)
- ✓ User says "reindex" or "update semindex"

### Update Strategy: In-Place Curation
- Update existing entries when files change
- Remove entries for deleted files
- Consolidate duplicate descriptions
- Keep line ranges current (use `git diff` to detect drift)

### Index Format
Each entry follows this structure:
```
[ID] path/to/file.ts:START-END | Brief description
```

Example:
```
[AUTH-001] src/middleware/auth.ts:15-45 | JWT validation middleware with refresh token logic
[AUTH-002] src/routes/users.ts:89-120 | User login endpoint, calls AUTH-001
```

---

## INDEX ENTRIES

### Authentication & Authorization
[AUTH-001] src/middleware/auth.ts:15-45 | JWT validation middleware with refresh token logic
[AUTH-002] src/middleware/auth.ts:47-72 | Role-based access control (RBAC) checker
[AUTH-003] src/routes/users.ts:89-120 | User login endpoint, returns JWT pair
[AUTH-004] src/routes/users.ts:122-145 | Token refresh endpoint, validates refresh token

### Database & Models
[DB-001] src/db/userRepo.ts:20-55 | User CRUD operations, Prisma ORM
[DB-002] src/db/schema.prisma:10-35 | User model definition with relations
[DB-003] src/db/migrations/001_init.sql:1-50 | Initial schema setup

### API Endpoints
[API-001] src/routes/users.ts:15-40 | GET /users — list with pagination
[API-002] src/routes/users.ts:42-68 | POST /users — create with validation
[API-003] src/routes/users.ts:70-87 | PATCH /users/:id — update

### Validation & Schemas
[VAL-001] src/validators/userSchema.ts:5-18 | Zod schema for user creation
[VAL-002] src/validators/userSchema.ts:20-30 | Zod schema for user update

### Utilities
[UTIL-001] src/utils/logger.ts:10-45 | Winston logger with structured JSON output
[UTIL-002] src/utils/errorHandler.ts:8-35 | Global Express error handler

### Configuration
[CFG-001] src/config/env.ts:5-25 | Environment variable validation with Zod
[CFG-002] src/config/database.ts:10-30 | Prisma client singleton

### Tests
[TEST-001] tests/routes/users.test.ts:15-60 | User creation integration tests
[TEST-002] tests/middleware/auth.test.ts:10-85 | Auth middleware unit tests

---

## REINDEX PROTOCOL

When the user says "reindex" or when 50+ files have changed:

1. **Scan project structure**
   ```bash
   find src -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" \) | sort
   ```

2. **For each file:**
   - Identify key functions/classes/exports
   - Note line ranges (use `wc -l` and manual inspection)
   - Write concise description (what, not how)

3. **Update SEMINDEX.md:**
   - Add new files
   - Update changed line ranges
   - Remove deleted files
   - Consolidate duplicates

4. **Verify:**
   - Each ID is unique
   - Line ranges are current
   - Descriptions are actionable

---

## USAGE EXAMPLES

### Example 1: User asks "Where is the auth logic?"
**AI response:**
```
Auth logic spans multiple files:
- [AUTH-001] JWT validation middleware (src/middleware/auth.ts:15-45)
- [AUTH-002] RBAC checker (src/middleware/auth.ts:47-72)
- [AUTH-003] Login endpoint (src/routes/users.ts:89-120)

Would you like me to view any of these?
```

### Example 2: User says "Debug the login flow"
**AI workflow:**
1. Read SEMINDEX.md
2. Identify relevant IDs: AUTH-003 (login endpoint), AUTH-001 (JWT middleware)
3. Use `view` tool to read actual files
4. Debug with full context

### Example 3: User says "Reindex after refactor"
**AI workflow:**
1. Scan file tree
2. Compare with current SEMINDEX.md
3. Detect new files: src/services/emailService.ts
4. Add entry: `[SVC-001] src/services/emailService.ts:10-55 | SendGrid email service wrapper`
5. Confirm: "Reindexed. Added 1 new entry, updated 3 line ranges."

---

## BENEFITS

**Token Efficiency:**
- This index (~2KB) replaces reading 50+ full files (~500KB)
- Cached with system prompt (90% discount on subsequent calls)

**Faster Navigation:**
- Jump directly to relevant code sections
- No blind grep/search needed

**Context Preservation:**
- Survives session resets (if cached)
- Human-readable git history of codebase evolution

---

## LIMITATIONS

**Not a replacement for:**
- Full file content (use `view` tool when needed)
- Git blame (for authorship/history)
- AST analysis (for deep code understanding)

**Best for:**
- Large codebases (50+ files)
- Long-running projects (multi-week development)
- Complex cross-file dependencies

---

## MAINTENANCE

**Auto-update triggers:**
- After `git commit` if >5 files changed
- User explicit "reindex" command
- New file creation (add entry immediately)

**Manual review:**
- Every 100 commits (ensure line ranges accurate)
- After major refactors (consolidate moved code)

---

*Last indexed: 2026-04-18 | Total entries: 15 | Coverage: src/ directory*
