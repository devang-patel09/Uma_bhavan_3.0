# System Design — Uma Bhavan Community Management System

## Problem
Digitize Uma Bhavan's firm, family/member, area, surname, Niyari, receipt and collection workflows in one online system while preserving operator control, printable records, auditability, import/export and backup/restore.

## Users
- Current: Super Admin / primary operator.
- Future capacity: up to five users.
- Future roles are architecturally supported but not implemented in the first release.

## Tenancy
Single-Samaj application. There is no multi-tenant customer model in the current product. All records belong to Uma Bhavan.

## Core workflows
1. Maintain Areas, Firms and Surnames.
2. Create and maintain Permanent or Nominal family/member records.
3. Split families through controlled migration.
4. Find women through Niyari filters and print/export reports.
5. Generate, view, reprint and manage receipts.
6. Import/export data and produce operational reports.
7. Backup/restore and review audit history.

## Non-functional requirements
- Online availability.
- HTTPS.
- Server-side authorization.
- Database access only from backend.
- Strong validation and safe ORM queries.
- Desktop-first responsive UI.
- Light/dark mode.
- Accessible controls and keyboard navigation.
- Clear loading/empty/error/success states.
- Audit trail for important operations.
- Tested backup/restore procedure.
- Production monitoring and error tracking.

## Scale assumptions
500 firms, 5,000 families, 25,000 individual members, 100 areas, 500 surnames and 20,000 receipts/year.

## Data sensitivity
Names, DOB, mobile numbers, addresses and blood groups are treated as sensitive personal information. Logs must avoid unnecessary personal data.

## Availability and recovery
No formal SLA has been supplied. The initial system should prioritize recoverability and operational simplicity. Backup restore must be tested before production acceptance.

## Out of scope
Multi-Samaj tenancy, public registration, 2FA, Gohtra Master, scheduled backups and email workflows until configured.

## Open questions
- Family ID migration semantics.
- Final receipt layout.
- Production cost exception for MySQL hosting.
- Email provider.
- Audit retention.
