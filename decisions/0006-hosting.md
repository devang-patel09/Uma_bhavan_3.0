# ADR 0006 — Render Hosting Target
## Context
Client selected Render for database and wants ₹0/month.
## Decision
Target Render for backend and MySQL, with Render Static Site for frontend, but keep production budget as an explicit deployment gate.
## Consequences
Simple deployment path, but current Render free offerings do not make production MySQL a guaranteed ₹0 option.
