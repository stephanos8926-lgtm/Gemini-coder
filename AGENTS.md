# ForgeGuard Operational Directive
When proposing changes to the codebase, you MUST NOT apply them directly to target files. Follow the staged-review workflow:

1.  **Virtual Staging**: Create a file in the virtual `/.staging/` directory matching the target file path. For example, if proposing a change to `src/App.tsx`, write to `/.staging/src/App.tsx`.
2.  **Content Proposal**: Write the full proposed content of the file into the staging file.
3.  **Automatic Diffing**: The IDE will detect this file creation, automatically open a visual diff viewer, and prompt the user to accept or reject the changes.
4.  **Completion**: Once the user accepts, the system will apply the staged change to the actual file and clear the staging entry. Do not perform manual edits unless this workflow is bypassed in an emergency.

# Proactive Telemetry & Log Audit
For any detected runtime failure, build error, or unexpected behavior:
1.  **DO NOT** rely on speculative debugging. 
2.  **MUST** proactively read system/user logs (`/logs/system/error.log`, `/logs/system/combined.log`) immediately upon detecting an issue.
3.  **MUST** query RapidForge telemetry (check SQLite logs database if possible) to correlate the error with system state triggers before suggesting a fix.
4.  If manual log reading is insufficient, create a diagnostic script (as used previously) to extract the relevant context.
