# Deployment Runbook
1. Merge approved change.
2. CI must pass lint, typecheck, unit/integration tests and build.
3. Deploy to staging.
4. Run smoke tests.
5. Verify `/api/health`.
6. Verify database migration status.
7. Run critical E2E flow.
8. Promote to production using the approved provider workflow.
9. Verify login, dashboard, member search, receipt generation and print.
10. Monitor errors after release.
