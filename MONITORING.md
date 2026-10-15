# Monitoring

## Health
- `/api/health` checks application and database.
- Lightweight liveness endpoint may be added if multiple instances are deployed.

## Metrics
- Uptime.
- API error rate.
- p95 latency.
- Database connectivity.
- Backup success/failure.
- Import failure rate.
- Receipt generation failure rate.

## Alerts
Alert only when human action is required.
- Application unavailable.
- Database unavailable.
- Repeated backup failures.
- Error-rate spike.
- Restore failure.
- High authentication failure rate.

Delivery: email when configured; otherwise alerts remain visible in the monitoring/error-tracking service.
