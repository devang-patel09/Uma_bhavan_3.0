# Uma Bhavan Community Management System

## Stack
React + Vite + TypeScript + Tailwind CSS
Node.js + Express.js + TypeScript
MySQL + Prisma
REST API

## Development order
1. Read `PRD.md`.
2. Read `SYSTEM-DESIGN.md`.
3. Read `ARCHITECTURE.md`.
4. Approve database design.
5. Scaffold frontend/backend.
6. Implement authentication.
7. Implement master data.
8. Implement member/family workflows.
9. Implement migration.
10. Implement receipts and reporting.
11. Implement import/export.
12. Implement backup/restore.
13. Add testing.
14. Harden security.
15. Deploy staging.
16. Verify.
17. Deploy production.

## Commands
The exact package scripts are to be created during scaffold:
- dev
- build
- lint
- typecheck
- test
- test:e2e
- db:migrate
- db:seed

## Secrets
Never commit `.env` files or backup files. Use `.env.example`.

## Definition of done
A feature is not done until:
- lint passes,
- typecheck passes,
- relevant tests pass,
- changed files are listed,
- assumptions are listed,
- skipped/stubbed work is listed.
