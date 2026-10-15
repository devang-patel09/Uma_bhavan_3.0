# ADR 0004 — Transactional Family Migration
## Context
Family splitting selects members from an existing family and moves them to a new member list.
## Decision
Migration is a single transaction. Destination firm can be selected or created. Member type cannot change.
## Alternatives
Manual copy/delete.
## Consequences
Atomicity prevents partial migrations.
## Open
Exact Family ID behavior remains to be confirmed.
