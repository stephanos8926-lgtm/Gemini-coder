# ADR: LogRedirector Pruning Enhancement [2026-04-24]

## Status
Proposed

## Context
`LogRedirector` currently uses a simple FIFO queue (`MAX_LOGS`). For an audit, we need better traceability and less memory pressure.

## Decision
- Maintain the FIFO limit (`MAX_LOGS`).
- Add a time-based pruning mechanism to clear logs older than, e.g., 1 hour, periodically, OR cap the log based on memory usage approximation.

## Consequences
- **Positive**: More predictable memory usage.
- **Negative**: Increased complexity of the `getLogs` method if pruning happens async.
