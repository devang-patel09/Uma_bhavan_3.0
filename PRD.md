# UMA BHAVAN Community Management System — PRD

**Status:** Updated with the latest clarifications.  
**Dashboard:** Dashboard requirements are intentionally unchanged and are pending the user's next update.

## 1. Purpose and Scope

A centralized system to manage firms, families, individual members, areas/sub-areas, surnames, Niyari reports, migration, and bulk receipt generation/printing.

Modules in scope:
1. Firm Master
2. Member Master
3. Area and Sub-Area Master
4. Niyari Report
5. Receipt Management and Printing
6. Surname Master
7. Member Migration / Family Splitting

Gohtra Master and Gohtra-related fields are not included in the latest requirements.

## 2. Firm Master

### Firm list
- Search by Firm Code or Firm Name.
- Show firms in a list.
- Provide Add, Details, Edit, Delete, and Print actions.

### Firm form
| Field | Requirement |
|---|---|
| Firm Code | Required, unique primary key, immutable after creation |
| Firm Name | Required |
| Firm Type | Required: Permanent or Nominal |
| Family Head Name | Required/selected family head linked to the related family record |
| Main Area | Selected from Area Master |
| Sub-Area | Selected from sub-areas belonging to the selected Main Area |
| Pincode | Firm pincode |
| Firm Address | Firm address |

### Firm behavior
- Firm Details shows saved details in a readable table.
- Edit opens a pre-filled form; Firm Code cannot change.
- Delete removes the firm subject to relationship constraints.
- Print produces a clean print-ready version of the selected firm's latest details.
- Family Head Name must be linked consistently between Firm Master and Member Master.

### Permanent/Nominal inheritance
- Firm Type is the source of truth for member classification.
- Members linked to a Permanent firm are automatically Permanent.
- Members linked to a Nominal firm are automatically Nominal.
- Users cannot independently assign a conflicting member classification.
- Changing the linked firm or migrating a member updates the member classification from the destination firm's type.
- If Firm Type changes, linked member classifications must remain consistent.

## 3. Member Master

### Family-level fields
| Field | Requirement |
|---|---|
| Member Code | Required, unique primary key, immutable |
| Family Head Name | Linked to the family head maintained for the associated firm/family |
| Surname | Family surname |
| Family ID | Required, unique, immutable |
| Home Address | Family address |
| Firm | Linked firm |
| Member Classification | Inherited from the firm's Permanent/Nominal type |
| Count (18+ Male) | Derived from male individual members aged 18 and above |

### Individual member fields
| Field | Requirement |
|---|---|
| Member Name | Individual name |
| Date of Birth | Used to calculate age |
| Age | Automatically calculated |
| Gender | Individual's gender |
| Mobile Number | Individual's mobile number |
| Blood Group | Dropdown; must display and persist correctly in Add, Edit, Details, and retrieval |
| Marital Status | Married / Unmarried |
| Parental Surname | Parental surname, especially important for married females |

### Rules
- Age is calculated from Date of Birth.
- Age 18 and above counts toward 18+ Male Count if the member is male.
- Recalculate the count after edits, deletions, and migration to avoid stale totals.
- Prevent duplicates when Member Name + Date of Birth + Gender exactly match an existing individual.
- Member Details supports Edit, Delete, Print, and (where applicable) Migrate.
- Print generates a clean print-ready version of the selected family/member record.

## 4. Area and Sub-Area Master

- Support a hierarchy: one Main Area can contain multiple Sub-Areas.
- Example: Main Area Anand may contain sub-areas such as Jitodia and Karamsad Road.
- Users can create and manage main areas and create sub-areas under a selected main area.
- Each sub-area must reference its parent main area.
- Duplicate checks are case-insensitive within the relevant level (for example, Anand/anand/ANAND are the same main area).
- When adding/editing a firm, select Main Area first, then select a Sub-Area belonging to that Main Area.
- A firm is linked to both its Main Area and Sub-Area.

## 5. Member Migration / Family Splitting

### Destination options
When the user selects **Migrate**, offer:
1. **Migrate to Existing Firm**
2. **Create New Firm**

### Existing firm
- Show available firms and allow destination selection.
- Allow selection of individual members from the source Member ID/family.
- Move selected members to the destination family/member record.
- Remove migrated members from the source record so they are not active in both families.
- Update Permanent/Nominal classification from the destination firm's type.
- Recalculate source and destination 18+ Male Counts.

### Create new firm
- Open the complete Firm Master form with Firm Code, Firm Name, Firm Type, Family Head Name, Main Area, Sub-Area, Pincode, and Firm Address.
- The new family head must be selected from the members selected for migration.
- Create the new firm and corresponding new Member ID/family arrangement.
- Move selected members to the new record and remove them from the source.
- Inherit member classification from the new firm's type.
- Recalculate source and destination 18+ Male Counts.

### Migration integrity
- Before confirmation, show the source family, selected members, and destination.
- Migration must be atomic/consistent: failures must not leave records partly moved.
- Keep family, firm, classification, and count relationships consistent.
- Respect Member Code and Family ID uniqueness. The exact generation policy for new IDs must follow the project's agreed identifier rules.

## 6. Surname Master

- Maintain surname records.
- Add, list, and delete surnames, subject to relationship constraints.
- Duplicate detection is case-insensitive: Diwani/diwani/DIWANI are the same surname.
- Surname handling must be integrated with Member Master; the precise inline create/select UI should follow the agreed design.
- Provide **Print** to print the current surname list in a clean layout.

## 7. Niyari Report

- Provide a surname selector and show relevant female members.
- For married females, always use **Parental Surname**, regardless of the current/married surname.
- Example: current surname Sankhala + Parental Surname Diwani means the member appears under Diwani.
- Columns: Sl. No., Name, Surname.
- Provide **Print** for the currently selected/filtered results.

## 8. Receipt Management and Printing

### Workflow
1. Select receipt type: Samaj or Yuvak Mandal.
2. Select collection period: Monthly or Yearly.
3. Select the applicable month/year or year.
4. System finds eligible male members automatically.
5. System applies configured amount and period eligibility rules.
6. Show a batch preview before generation/printing.
7. Confirm the batch and generate/save receipts.
8. Open a print-ready batch.

Users must not have to select each member individually for bulk receipt generation.

### Samaj eligibility
- Include all eligible male members aged **18 and above** who belong to the applicable Samaj population.
- Selecting Samaj generates receipts for all eligible members in one batch.

### Yuvak Mandal eligibility
- Include male members aged **18 and above**, up to and including the administrator-configured upper age limit.
- The upper limit is not hard-coded.
- Admin can set an exact upper age, such as 45, 47, or 50.
- Changes to the upper limit apply to future eligibility and batch generation.
- Selecting Yuvak Mandal generates receipts for all eligible members in one batch.

### Configured receipt amounts
Admin configures amounts for each combination:
- Receipt Type: Samaj / Yuvak Mandal
- Period: Monthly / Yearly

The batch uses the configured amount for the selected type and period. The user should not have to enter an amount per member during normal batch generation.

### Period duplicate prevention
**Monthly**
- At most one receipt per member, receipt type, and calendar month.
- The day within the month does not matter.
- Example: if a receipt is generated on 10 October 2026, another receipt for the same member/type/October 2026 is blocked.
- A new receipt can be generated when the calendar month changes, subject to other rules.

**Yearly**
- At most one receipt per member, receipt type, and calendar year.
- A second receipt for the same member/type is blocked for the remainder of that calendar year.
- Under this interpretation, a receipt issued on 10 October 2026 blocks another receipt for that member/type until 1 January 2027. The example of 10 September 2027 is therefore allowed.
- This uses a **calendar-year rule**, not a rolling 12-month waiting period.

### Batch preview and history
- Preview shows the members/receipts to be generated before printing.
- Where practical, show excluded members and the reason, such as already receipted for the selected period or age ineligibility.
- Persist each receipt with at least: family/member record, individual member, receipt type, period type, applicable month/year or year, amount, and generation date/time.
- Historical receipts must not silently change when age limits or configured amounts are updated.

### A4 printing
- Print batch receipts on A4 paper, with multiple receipts per page where legible.
- Each receipt must be clearly separated for handling/cutting.
- Do not split an individual receipt across pages.
- Hide application navigation and unrelated controls from print output.
- Show batch preview before opening the standard system/browser print dialog.

## 9. Print Requirements

| Module/Page | Print output |
|---|---|
| Firm Details | Selected firm's details |
| Member Details | Selected family/member details |
| Surname Master | Current surname list |
| Niyari Report | Current filtered report |
| Receipt Management | Previewed batch of generated receipts |

All print output must be readable, reflect current/saved data, and omit unnecessary application controls.

## 10. Key Business Rules

1. Firm Code is required, unique, and immutable.
2. Member Code is required, unique, and immutable.
3. Family ID is required, unique, and immutable.
4. Firm Type is Permanent or Nominal.
5. Members inherit classification from their linked firm's type.
6. Firm Master and Member Master maintain a consistent family-head relationship.
7. A Main Area can contain multiple Sub-Areas.
8. A firm is linked to a Main Area and Sub-Area.
9. Age is calculated from Date of Birth.
10. Male members aged 18 and above count toward 18+ Male Count.
11. Duplicate individual members are prevented when Name + DOB + Gender exactly match.
12. Married females always appear under Parental Surname in Niyari Report.
13. Migration supports an existing firm or creation of a new firm.
14. Migrated members are moved out of the source family record.
15. Migration updates classification and recalculates counts.
16. Samaj includes male members aged 18 and above.
17. Yuvak Mandal includes male members aged 18 and above through the configured upper limit.
18. Amounts are configured by receipt type and monthly/yearly period.
19. Monthly receipts are limited to one per member/type/calendar month.
20. Yearly receipts are limited to one per member/type/calendar year.
21. Batch generation must show a preview before printing.
22. Receipts print on A4 with multiple receipts per page where legible.
23. Dashboard requirements remain unchanged pending separate instructions.

## 11. Acceptance Criteria

### Firm/member classification
- Firm form requires Permanent/Nominal.
- Member classification is inherited from the linked firm.
- Changing the linked firm or migrating a member updates classification.
- Family Head Name remains linked consistently between firm and member records.

### Area hierarchy
- Main Areas and Sub-Areas can be maintained.
- Each Sub-Area belongs to a Main Area.
- Firm form filters Sub-Areas based on selected Main Area.

### Migration
- Migration offers Existing Firm and Create New Firm.
- Existing Firm flow lets the user select a destination.
- New Firm flow uses the full Firm Master form.
- New family head is selected from migrated members.
- Migrated members are removed from the source record and assigned to the destination.
- Counts and inherited classifications are correct after migration.

### Member and Niyari behavior
- Blood Group displays and persists across Add, Edit, Details, and retrieval.
- Married females are always listed under Parental Surname.
- Niyari Print prints the current result set.

### Receipts
- User can select Samaj/Yuvak Mandal and Monthly/Yearly.
- Eligible members are selected automatically for bulk generation.
- Samaj uses the age 18+ rule.
- Yuvak Mandal uses age 18+ through the configured upper age limit.
- Amount is selected from admin configuration for type and period.
- Duplicate receipts for the same member/type/period are blocked.
- Batch preview appears before printing.
- A4 print layout fits multiple receipts per page without splitting a receipt.
- Receipt history supports period validation.

### Scope control
- Do not change dashboard features until separate instructions arrive.

## 12. Items Requiring Confirmation

1. Whether codes/IDs are entered manually or generated automatically, unless defined elsewhere in the project.
2. Exact delete behavior when firms, areas, sub-areas, or surnames are already referenced by other records.
3. Whether printed receipts require logo, signature, receipt number, or additional branding fields.
4. How to define an “active” member/firm if active-status fields exist in the application.
5. Dashboard changes will be provided separately.

## 13. Dashboard Scope

Do not redesign, remove, or add dashboard metrics, cards, charts, or navigation based on this update. Wait for the user's next dashboard-specific requirements.

## 14. Implementation Agent Summary

Implement these requirements without removing existing in-scope functionality. Maintain consistent relationships among Firm Master, Member Master, family heads, main areas/sub-areas, and inherited Permanent/Nominal classification. Implement migration as a safe move from the source family to the destination. Implement bulk Samaj and Yuvak Mandal receipts with admin-configured amounts, configurable Yuvak Mandal upper age, monthly/yearly duplicate-period restrictions, a batch preview, and A4 multi-receipt printing. Fix Blood Group display/persistence and ensure married females are reported using Parental Surname. Leave dashboard behavior unchanged until new instructions are provided.
