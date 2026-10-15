# Security

## Threat model summary
Assets:
- Member/family records.
- DOB and mobile data.
- Addresses and blood groups.
- Receipt and collection information.
- Authentication credentials.
- Backup files.

Threats:
- Broken authorization.
- SQL injection.
- XSS.
- CSRF/state-changing request abuse.
- Brute-force login.
- Malicious Excel uploads.
- Backup theft.
- Sensitive data leakage in logs.
- Unauthorized restore.
- Receipt verification manipulation.

Controls:
- Server-side authorization.
- Prisma/parameterized database access.
- Input validation.
- HTTPS.
- Secure session/cookie configuration.
- Rate limiting.
- Security headers.
- Redacted structured logging.
- Private database.
- Backup encryption.
- Restore validation.
- Audit history.
- Dependency scanning.

## Backup protection
Backups are sensitive and must be encrypted/password protected. Never commit backup files to Git.

## Logging
Never log passwords, tokens, authorization headers or unnecessary personal data.

## Production review
Run a fresh-session security review before release. Test XSS, authorization, injection, insecure uploads, headers, cookies and error leakage.
