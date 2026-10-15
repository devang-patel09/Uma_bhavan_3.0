# Caching Strategy

The first release should keep caching conservative because the dataset is modest and correctness is more important than aggressive caching.

- Static frontend assets: CDN/browser caching.
- Authenticated API responses: private/no-store unless explicitly safe.
- Dashboard aggregates: optional short server cache after measurement.
- Niyari/report results: do not cache initially.
- Tenant data is single-Samaj today; future multi-tenant keys must include organization_id.
- Cache invalidation must happen on writes.
- Do not cache sensitive records at a shared CDN layer.
