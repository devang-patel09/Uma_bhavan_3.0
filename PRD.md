# Uma Bhavan Community Management System — Product Requirements Document

## 1. Purpose
A single-Samaj, online community management system for **Uma Bhavan, Anand, Gujarat (388001)**. The current operating model is one primary operator/Super Admin, while the architecture must support up to five users and future roles.

## 2. Scope
Core modules:
1. Dashboard
2. Firm Master
3. Member Master
4. Area Master
5. Surname Master
6. Niyari Report
7. Receipt Printing
8. Receipt / Payment / Collection History
9. Reports
10. Import / Export
11. Backup / Restore
12. User Management
13. Audit History
14. Global Search

Gohtra Master and Gohtra-related fields are excluded because they are not in the latest specification.

## 3. Confirmed Product Decisions

### Organization and usage
- One particular Samaj uses the system.
- Online web application accessible from anywhere.
- Current user model: Super Admin only.
- Architecture supports future roles/users; target capacity up to five users.
- No public registration.
- Super Admin account is created during setup.
- Username + password login.
- Password recovery: email + mobile OTP when configured, plus recovery code created during initial setup.
- Session inactivity timeout: 72 hours.
- Five failed login attempts trigger a five-minute temporary block.
- 2FA is not required initially.
- Remember-me is enabled.

### Technology
- Frontend: React + Vite + TypeScript + Tailwind CSS.
- Backend: Node.js + Express.js + TypeScript.
- Database: MySQL.
- ORM: Prisma.
- API: REST.
- Architecture: modular monolith.
- Database access: backend only.
- Validation: every API input validated at the boundary.
- Database changes: migrations only.
- Local / Staging / Production environments.
- GitHub repository: public.
- CI runs lint, typecheck, tests and build.
- Production deployment policy: implementation should use a controlled deployment step; exact provider workflow is documented separately.
- Hosting target: Render for backend and database, with Render Static Site as the default frontend target. Current provider constraints and free-tier limitations must be revalidated before production.

### Scale
Initial planning capacity:
- Firms: 500
- Families: 5,000
- Individual members: 25,000
- Areas: 100
- Surnames: 500
- Receipts/year: 20,000

## 4. Firm Master

Fields:
- Firm Code
- Firm Name
- Area
- Pincode
- Firm Address

Firm Code:
- Automatically generated.
- Format: F001, F002, ...
- Codes are not editable.
- Deleted codes may be reused.

Functions:
- Search by Firm Code / Firm Name.
- Add.
- View.
- Edit.
- Delete.
- Print.

Deletion:
- A firm cannot be deleted while associated family/member records exist.
- The system displays a clear blocking message.

## 5. Member Master

A Member record represents one family list and is either **Permanent** or **Nominal**.

### Member code
- Permanent: M001, M002, ...
- Nominal: N001, N002, ...
- Automatically generated.
- Category-specific sequences.
- Codes are not editable.
- Deleted codes may be reused.
- A family cannot contain mixed Permanent and Nominal members.

### Family-level fields
- Member Code
- Family Head Name
- Surname
- Family ID
- Home Address
- 18+ Male Count

Family ID:
- Manually entered.
- Required.
- Unique.
- Not editable.
- No relationship to Member Code.

### Individual fields
- Member Name
- Date of Birth
- Age (calculated only)
- Gender: Male / Female
- Mobile Number: mandatory; duplicate mobile numbers are allowed within families because children may share a parent's number.
- Blood Group: A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown
- Marital Status: Married / Unmarried
- Parental Surname
- Member type is inherited from the family-level Member Type and is not independently selected for each person.

### Family head
The family head can also be an individual member.

### Entry modes
Both are supported:
- Create family first, then add members.
- Create family and members in one workflow.

No fixed maximum number of individual members per family.

### Age
- Age is always calculated from Date of Birth.
- Age is not manually editable.
- Age calculation updates automatically as time passes.

### 18+ male count
- Age boundary: >= 18.
- Male + age >= 18 contributes to the count.
- Count is stored for performance.
- Count is recalculated automatically when required after create/edit/delete/migration and on relevant reads.

### Duplicate individual
Duplicate detection is within the same family only.
Key:
- Member Name
- Date of Birth
- Gender

If a duplicate is detected:
- Ask the operator for confirmation before proceeding.

## 6. Member Migration / Family Splitting

Migration starts from an existing Member Code.

Flow:
1. Open existing Member record.
2. Click Migrate.
3. Select or create the destination Firm.
4. Display all members in the source family.
5. Operator selects specific members to migrate.
6. Destination Member Code is generated automatically.
7. Permanent source family members can migrate only into a Permanent destination.
8. Nominal source family members can migrate only into a Nominal destination.
9. Mixed member types are not allowed in one Member Code.
10. Remaining members stay in the original Member Code.
11. If no members remain, the original Member record is deleted.
12. Migration should be transactional: either all selected changes succeed or none do.

Migration history is retained, but the client has not requested a dedicated migration-history UI/field set. Audit history still records the migration action.

**Open implementation detail:** exact Family ID behavior during migration remains to be confirmed.

## 7. Area Master
- Add Area.
- Enter key submits.
- Case-insensitive duplicate checking.
- Duplicate message: "Area already inserted."
- Delete.
- List columns: Sl. No., Area Name, Action.

## 8. Surname Master
- Add Surname.
- Enter key submits.
- Case-insensitive duplicate checking.
- Duplicate message: "Surname already inserted."
- Delete.
- Print.
- List columns: Sl. No., Surname, Action.

Surname selection/creation is integrated into Member Master.

## 9. Niyari Report

Purpose: identify female members by surname.

Filters:
- Surname
- Area
- Firm
- Age
- Marital Status
- Member Type
- Gender

Rules:
- Married female: use Parental Surname for Niyari classification.
- Unmarried female: use Parental Surname.
- Both married and unmarried females appear.
- Current report columns:
  - Sl. No.
  - Name
  - Surname
  - Member Code
  - Family ID
  - Mobile
  - Firm
  - Marital Status

Functions:
- Filter.
- Search.
- Print.
- PDF.
- Excel.

## 10. Receipt Printing

### Eligibility
- Eligible members are male members aged >= 18.
- Age 18–45 inclusive: Yuvak Mandal and Samaj.
- Age 46+: Samaj only.

### Receipt types
Current types:
- Yuvak Mandal
- Samaj

Architecture supports additional types later.

### Amount
- Each receipt type has a default amount.
- Operator can edit the amount before generation.

### Receipt number
- Automatically generated.
- Format: R000001, R000002, ...
- The current requirement says receipt numbers are reused after deletion if the deleted number becomes available.

### Receipt date/time
- Automatically recorded when generated.

### Duplicate receipt rule
Prevent duplicate when:
- Same member
- Same receipt type
- Same date

### Receipt history
Stores:
- Receipt Number
- Member Code
- Member Name
- Family ID
- Firm
- Receipt Type
- Amount
- Date/Time
- Status
- Generated By

Functions:
- Search/filter.
- View.
- Reprint.
- Edit.
- Delete after confirmation.
- Deleted receipt disappears from Receipt History.
- Audit history retains the delete action.

### Receipt print
A4 output is the currently confirmed paper size.
Required content:
- Samaj logo
- Samaj name
- Address
- Phone number
- Receipt number
- Date
- Member code
- Member name
- Family ID
- Firm name
- Receipt type
- Amount
- Amount in words
- Signature
- Stamp
- QR code

QR code:
- Encodes receipt information directly.
- Online receipt verification is required.

Exact visual receipt dimensions/layout remain a design artifact to be finalized after logo is supplied.

## 11. Dashboard

Cards:
- Total Firms
- Total Families
- Total Members
- Permanent Members
- Nominal Members
- Male Members
- Female Members
- 18+ Male Members
- Total Collection

Sections:
- Recent Receipts
- Recent Members
- Recent Activities

Charts:
- Members by Area
- Members by Gender
- Permanent vs Nominal
- Collection by Month

## 12. Global Search
Search across:
- Member Code
- Member Name
- Family ID
- Family Head
- Surname
- Mobile
- Firm Code
- Firm Name
- Area
- Receipt Number

## 13. Excel Import / Export

Exports:
- Firms
- Members
- Areas
- Surnames
- Niyari
- Receipts
- Payments/Collections
- Reports

Export formats:
- Excel
- CSV where appropriate
- PDF
- Print for reports

Imports:
- Firms
- Members
- Areas
- Surnames
- All applicable master data

Import flow:
1. Upload template.
2. Validate.
3. Preview.
4. Show errors/warnings.
5. Require explicit confirmation.
6. Import transactionally where possible.
7. Produce success/error summary.
8. Provide downloadable error Excel.

Duplicate import records:
- Ask operator.

Templates are provided for each importable master dataset.

## 14. Backup / Restore
- Manual backup.
- Backup downloads to operator's computer.
- Backup format: encrypted application backup package containing database dump and metadata.
- Restore is Super Admin only.
- Before restore, automatically create a safety backup.
- Restore requires explicit confirmation.
- Backup is validated before restore.
- Restore process verifies compatibility/version metadata.
- Full data export is available to Super Admin.

## 15. Reports
Required report families:
- Member Report
- Firm Report
- Area-wise Member Report
- Gender Report
- Age-wise Report
- Permanent/Nominal Report
- 18+ Male Report
- Niyari Report
- Receipt Report
- Collection Report
- Migration Report
- Audit Report

Reports support:
- Excel
- PDF
- Print

## 16. Authentication and Authorization
Current role:
- Super Admin

Future role architecture supported, but only Super Admin is implemented initially.

Super Admin can access all current modules and operations.

Permissions must be enforced on the server.

## 17. Audit History
Log:
- Login
- Logout
- Add
- Edit
- Delete
- Migration
- Receipt generation
- Receipt deletion
- Excel import
- Excel export
- Backup
- Restore
- User creation
- User modification

Audit entry should record:
- Date/time
- User
- Module
- Action
- Record reference where applicable

Do not store old/new field values.
Do not store IP address.
Do not store device information.
Sensitive personal information must not be unnecessarily placed in logs.

Super Admin can delete audit records. Retention period is configurable.

## 18. Security
- HTTPS required in production.
- Standard security headers.
- Backend-only database access.
- ORM/parameterized queries.
- Server-side validation.
- Server-side authorization.
- Bulk/destructive actions require confirmation.
- Personal data is treated as sensitive.
- Secrets only in environment variables.
- Error responses to users are friendly; technical details stay in logs/error tracking.

## 19. Error tracking / monitoring
- Sentry is the preferred error-tracking service.
- Structured logs.
- Request IDs.
- /api/health endpoint.
- Monitor uptime, API health, database connectivity, error rate and response time.
- Email alerts if an email channel is configured; otherwise no alert delivery.

## 20. Testing
Required:
- Unit tests for critical business rules.
- Integration tests for API endpoints.
- Browser E2E tests for critical workflows.
- No fixed percentage target; all critical business logic must be covered.
- Test loading, empty, error and success states.
- Test security and authorization boundaries.

## 21. UI/UX
Brand palette:
- #FFE584
- #FF9E4F
- #E97451
- #5B3228

Style:
- Professional enterprise dashboard.
- Desktop-first.
- Responsive for desktop, tablet and mobile.
- Light/dark mode.
- Top navigation.
- Dashboard is the post-login landing page.
- Samaj logo will be supplied before final print design.

Samaj:
- Uma Bhavan
- Anand, Gujarat
- 388001

## 22. Hosting decision and constraint
Target architecture:
- Frontend: Render Static Site.
- Backend: Render Web Service.
- MySQL: Render-hosted private MySQL service using persistent storage.
- Redis-compatible shared store may be added for rate limiting if required.
- Sentry for error tracking.

**Important cost constraint:** the client target is ₹0/month. Current Render documentation confirms free web/static hosting but its free datastore offering is Postgres rather than a free MySQL service; Render's MySQL deployment is a separately deployed service backed by persistent storage. Therefore a fully production-grade Render + MySQL setup cannot be assumed to fit ₹0/month. This is an explicit deployment decision to revalidate before production. The application architecture remains MySQL-based as requested.

## 23. Environments
- Local
- Staging
- Production

Separate environment variables and databases are required.

## 24. Out of scope for initial release
- Public registration.
- 2FA.
- Mixed Permanent/Nominal families.
- Multi-Samaj tenancy.
- Gohtra Master.
- Automatic scheduled backups.
- Dedicated email workflow until an email provider/account is configured.
- Dedicated migration-history UI beyond audit logging unless later requested.

## 25. Open Decisions
1. Exact Family ID behavior during migration.
2. Exact receipt visual dimensions/layout after logo is supplied.
3. Email provider/account.
4. Final production hosting budget because ₹0 conflicts with production MySQL hosting on the selected provider.
5. Exact configurable audit retention period.
6. Exact QR verification page styling.
