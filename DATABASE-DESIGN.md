# Database Design

## Design principles
- MySQL.
- Prisma ORM.
- UUID internal IDs are recommended for database relationships.
- Human-readable codes are separate business identifiers.
- createdAt/updatedAt on operational entities.
- Transactions for migration, import and restore.
- Index all common search/filter fields.
- Unique constraints where the business rules require them.

## Core entities

### User
- id
- username (unique)
- passwordHash
- role
- active
- rememberToken/session data as appropriate
- createdAt
- updatedAt

### Firm
- id
- firmCode (business code; unique among active records; reuse policy requires careful implementation)
- firmName
- areaId
- pincode
- address
- createdAt
- updatedAt

### Area
- id
- nameNormalized (unique)
- displayName
- createdAt
- updatedAt

### Family / MemberRecord
- id
- memberCode
- memberType: PERMANENT | NOMINAL
- familyId (unique)
- familyHeadName
- surnameId
- homeAddress
- firmId
- male18PlusCount
- createdAt
- updatedAt

Constraint: one MemberRecord contains only one memberType.

### IndividualMember
- id
- familyRecordId
- name
- dob
- gender
- mobile
- bloodGroup
- maritalStatus
- parentalSurnameId
- createdAt
- updatedAt

Duplicate constraint is scoped to a family on normalized name + dob + gender.

### Surname
- id
- nameNormalized (unique)
- displayName
- createdAt
- updatedAt

### ReceiptType
- id
- name
- defaultAmount
- active
- eligibilityRule
- createdAt
- updatedAt

Seed current types:
- Yuvak Mandal
- Samaj

### Receipt
- id
- receiptNumber
- family/member reference
- individualMemberId
- receiptTypeId
- amountMinor
- generatedAt
- status
- createdBy
- verificationPayload/version
- createdAt
- updatedAt

Duplicate receipt protection: member + receiptType + calendar date while status is active.

### Migration
A lightweight internal transaction/audit record is recommended even though a dedicated migration-history UI was not requested.
- id
- sourceMemberRecordId
- destinationMemberRecordId
- sourceFirmId
- destinationFirmId
- migratedAt
- createdBy

### AuditLog
- id
- userId
- module
- action
- entityType
- entityId
- occurredAt
- metadata (redacted, non-sensitive operational context)

No old/new field values, IP or device data.

### BackupRecord
- id
- createdBy
- createdAt
- backupType
- checksum
- schemaVersion
- fileName

## Important relationship note
The current client response was interpreted as one family record being linked to one firm, and one firm being linked to one family. Because a firm is normally capable of serving multiple family records, this is flagged for final confirmation before enforcing a one-to-one database constraint.

## Indexes
- Firm: firmCode, firmName, areaId.
- MemberRecord: memberCode, familyId, firmId, memberType, surnameId.
- IndividualMember: familyRecordId, name, dob, gender, mobile.
- Receipt: receiptNumber, individualMemberId, receiptTypeId, generatedAt.
- AuditLog: occurredAt, userId, module, entityType/entityId.
