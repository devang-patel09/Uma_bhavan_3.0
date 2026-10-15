# Testing Strategy

## Unit tests
Critical business rules:
- Age calculation.
- 18+ male count.
- Receipt eligibility at 18, 45 and 46.
- Permanent/Nominal family invariants.
- Member code generation.
- Firm code generation.
- Receipt number generation.
- Duplicate member detection.
- Area/surname case-insensitive duplicates.
- Niyari surname selection.
- Receipt duplicate prevention.
- Migration rules.
- Excel validation.

## Integration tests
Every API endpoint:
- unauthenticated -> 401.
- unauthorized -> 403.
- invalid input -> 400.
- missing resource -> 404.
- business conflict -> documented 409 where appropriate.
- database constraint failures map to safe errors.

## E2E tests
Critical browser workflows:
1. Login.
2. Create area.
3. Create firm.
4. Create Permanent family.
5. Add individual members.
6. Create Nominal family.
7. Edit/delete member.
8. Family migration.
9. Niyari filtering.
10. Receipt generation.
11. Receipt reprint.
12. Receipt deletion.
13. Excel import preview/confirmation.
14. Backup and restore flow.
15. Dashboard/report generation.

## Security tests
- SQL injection payloads.
- XSS payloads.
- unauthorized endpoint calls.
- direct ID manipulation.
- repeated login attempts.
- restore authorization.
- bulk-operation confirmation.
- backup validation.

## Quality rule
No fixed percentage coverage target. All critical business logic must have meaningful automated tests.

## Verification
Do not change a failing test merely to make it pass. Fix the implementation and rerun the full suite.
