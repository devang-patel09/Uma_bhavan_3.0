# ADR 0005 — Encrypted Application Backup
## Context
The client needs manual backup/download and Super Admin-only restore.
## Decision
Use an encrypted backup package containing a database dump and metadata. Create a safety backup before restore.
## Alternatives
Raw SQL only; cloud-only backup.
## Consequences
Portable and safer for operator-managed recovery, but encryption-key handling becomes critical.
