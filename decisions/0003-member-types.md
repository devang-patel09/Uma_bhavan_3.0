# ADR 0003 — Permanent and Nominal Member Families
## Context
Client requires M001... for Permanent and N001... for Nominal and forbids mixed types in one family record.
## Decision
Member type is a family-level invariant. Migration preserves the type.
## Alternatives
Per-person member type.
## Consequences
Simpler migration and receipt/report classification.
