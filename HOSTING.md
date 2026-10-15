# Hosting Plan

## Target
- Frontend: Render Static Site.
- Backend: Render Web Service.
- Database: Render-hosted MySQL private service.
- Error tracking: Sentry.
- Optional rate-limit store: Redis-compatible shared store.

## Environments
Local / Staging / Production must have separate environment variables and databases.

## Zero-cost constraint
The client requested a ₹0/month infrastructure budget. This is a launch constraint, not a technical capability guarantee.

Current provider verification:
- Render offers free static sites and free web services, but free services have important limitations.
- Render's free datastore offering is Postgres, while MySQL is deployed as a service backed by persistent storage.
- Therefore production MySQL on Render should not be assumed to be free.
- The final production deployment must either approve the required infrastructure cost or select another MySQL-compatible provider that meets the budget and data requirements.

## Environment variables
DATABASE_URL
SESSION_SECRET
JWT/SESSION configuration if used
SENTRY_DSN
EMAIL_PROVIDER configuration (optional)
RATE_LIMIT_STORE_URL (optional)
BACKUP_ENCRYPTION_KEY
APP_BASE_URL

## Production readiness
- HTTPS.
- Security headers.
- Health endpoint.
- Graceful shutdown.
- Database backups.
- Error tracking.
- Deployment rollback.
- Billing/cost alerts where provider supports them.
