# Rollback
1. Stop the rollout.
2. Identify last known-good application version.
3. Revert application deployment.
4. Do not blindly roll back database migrations.
5. If schema changes are involved, follow a forward-fix or tested migration rollback plan.
6. Verify `/api/health`.
7. Run critical smoke tests.
8. Record incident and cause.
