# Backup / Restore Runbook
## Backup
1. Log in as Super Admin.
2. Start backup.
3. Generate database dump and metadata.
4. Encrypt package.
5. Download package.
6. Record checksum.

## Restore
1. Upload backup.
2. Validate checksum, format and schema compatibility.
3. Require confirmation.
4. Create current safety backup.
5. Put write operations in maintenance/locked state.
6. Restore transactionally where supported.
7. Run integrity checks.
8. Re-enable writes.
9. Verify login, counts and critical workflows.
10. Record restore in audit history.
