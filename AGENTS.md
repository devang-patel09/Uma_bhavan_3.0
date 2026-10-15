# Project: Uma Bhavan Community Management System

## What this product does
Online single-Samaj community management platform for Uma Bhavan, Anand. It manages firms, family/member records, areas, surnames, Niyari reports, receipts, collections, reports, imports/exports, backups and audit history.

## Stack — do not change without approval
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: Node.js + Express.js + TypeScript
- Database: MySQL
- ORM: Prisma
- API: REST
- Hosting target: Render

## Rules
- Never commit secrets.
- Every API endpoint: validation + authentication + authorization + tests.
- Database changes only through migrations.
- Backend is source of truth.
- Do not allow mixed Permanent/Nominal family records.
- Age is calculated from DOB.
- Test boundary ages 18, 45 and 46.
- Migration is transactional.
- Destructive operations require confirmation.
- Run lint, typecheck and tests before saying done.
- Ask before adding dependencies.
- Prefer small reviewable changes.

## Architecture
Modular monolith. Business logic in services/domain layer, not UI or route handlers.

## Agent verification
Before saying a task is done:
1. Run lint, typecheck and full relevant tests.
2. List every changed file and why.
3. List skipped, stubbed, mocked or hard-coded work.
4. List assumptions needing confirmation.
5. Do not call work complete if required tests are failing.
