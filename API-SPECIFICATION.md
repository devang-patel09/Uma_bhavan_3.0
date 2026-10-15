# API Specification

## Conventions
- REST.
- JSON request/response.
- `/api/v1/...` versioned routes.
- Zod validation at the boundary.
- Central authorization function.
- Consistent error envelope.

## Error envelope
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Please correct the highlighted fields.",
    "requestId": "req_..."
  }
}
```

## Health
`GET /api/health`

Checks application and database connectivity.

## Authentication
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `POST /api/v1/auth/password-reset/request`
- `POST /api/v1/auth/password-reset/verify`
- `POST /api/v1/auth/recovery-code/verify`
- `GET /api/v1/auth/me`

## Firms
- `GET /api/v1/firms`
- `POST /api/v1/firms`
- `GET /api/v1/firms/:id`
- `PATCH /api/v1/firms/:id`
- `DELETE /api/v1/firms/:id`
- `GET /api/v1/firms/:id/print`

## Member records
- `GET /api/v1/members`
- `POST /api/v1/members`
- `GET /api/v1/members/:id`
- `PATCH /api/v1/members/:id`
- `DELETE /api/v1/members/:id`
- `POST /api/v1/members/:id/migrate`
- `GET /api/v1/members/:id/print`

## Individuals
Nested operations should preserve family authorization:
- `POST /api/v1/members/:id/individuals`
- `PATCH /api/v1/members/:id/individuals/:individualId`
- `DELETE /api/v1/members/:id/individuals/:individualId`

## Master data
Areas and surnames follow the same CRUD convention.

## Niyari
`GET /api/v1/reports/niyari`

Filters: surname, area, firm, age, maritalStatus, memberType, gender.

## Receipts
- `POST /api/v1/receipts/validate-eligibility`
- `POST /api/v1/receipts`
- `GET /api/v1/receipts`
- `GET /api/v1/receipts/:id`
- `PATCH /api/v1/receipts/:id`
- `DELETE /api/v1/receipts/:id`
- `GET /api/v1/receipts/:id/print`
- `GET /api/v1/receipts/:id/verify`

## Imports/exports
- `POST /api/v1/imports/:type/validate`
- `POST /api/v1/imports/:type/commit`
- `GET /api/v1/imports/:id/errors`
- `GET /api/v1/exports/:type`

## Backups
- `POST /api/v1/backups`
- `GET /api/v1/backups`
- `POST /api/v1/backups/validate`
- `POST /api/v1/backups/restore`

## Rules
Every endpoint:
1. Validates input.
2. Authenticates user.
3. Authorizes action.
4. Checks resource ownership/scope.
5. Calls domain service.
6. Returns standard response/error format.
7. Emits appropriate audit event.
