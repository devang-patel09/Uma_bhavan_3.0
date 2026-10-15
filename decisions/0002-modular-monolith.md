# ADR 0002 — Modular Monolith
## Context
Single-Samaj, small team, current one-operator workflow and modest scale.
## Decision
Use a modular monolith.
## Alternatives
Microservices.
## Consequences
Lower operational complexity and simpler debugging. Modules remain separated internally for future extraction if needed.
