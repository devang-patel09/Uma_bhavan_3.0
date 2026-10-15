-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'OPERATOR') NOT NULL DEFAULT 'SUPER_ADMIN',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `recoveryCodeHash` VARCHAR(191) NULL,
    `failedLoginAttempts` INTEGER NOT NULL DEFAULT 0,
    `lockUntil` DATETIME(3) NULL,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `areas` (
    `id` VARCHAR(191) NOT NULL,
    `nameNormalized` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `areas_nameNormalized_key`(`nameNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `surnames` (
    `id` VARCHAR(191) NOT NULL,
    `nameNormalized` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `surnames_nameNormalized_key`(`nameNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `firms` (
    `id` VARCHAR(191) NOT NULL,
    `firmCode` VARCHAR(191) NOT NULL,
    `firmName` VARCHAR(191) NOT NULL,
    `areaId` VARCHAR(191) NOT NULL,
    `pincode` VARCHAR(191) NOT NULL,
    `address` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `firms_firmCode_key`(`firmCode`),
    INDEX `firms_firmName_idx`(`firmName`),
    INDEX `firms_areaId_idx`(`areaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `member_records` (
    `id` VARCHAR(191) NOT NULL,
    `memberCode` VARCHAR(191) NOT NULL,
    `memberType` ENUM('PERMANENT', 'NOMINAL') NOT NULL,
    `familyId` VARCHAR(191) NOT NULL,
    `familyHeadName` VARCHAR(191) NOT NULL,
    `surnameId` VARCHAR(191) NOT NULL,
    `homeAddress` TEXT NOT NULL,
    `firmId` VARCHAR(191) NOT NULL,
    `male18PlusCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `member_records_memberCode_key`(`memberCode`),
    UNIQUE INDEX `member_records_familyId_key`(`familyId`),
    INDEX `member_records_memberCode_idx`(`memberCode`),
    INDEX `member_records_familyId_idx`(`familyId`),
    INDEX `member_records_firmId_idx`(`firmId`),
    INDEX `member_records_memberType_idx`(`memberType`),
    INDEX `member_records_surnameId_idx`(`surnameId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `individual_members` (
    `id` VARCHAR(191) NOT NULL,
    `familyRecordId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `dob` DATE NOT NULL,
    `gender` ENUM('MALE', 'FEMALE') NOT NULL,
    `mobile` VARCHAR(191) NOT NULL,
    `bloodGroup` ENUM('A_POSITIVE', 'A_NEGATIVE', 'B_POSITIVE', 'B_NEGATIVE', 'AB_POSITIVE', 'AB_NEGATIVE', 'O_POSITIVE', 'O_NEGATIVE', 'UNKNOWN') NOT NULL DEFAULT 'UNKNOWN',
    `maritalStatus` ENUM('MARRIED', 'UNMARRIED') NOT NULL DEFAULT 'UNMARRIED',
    `parentalSurnameId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `individual_members_familyRecordId_idx`(`familyRecordId`),
    INDEX `individual_members_name_idx`(`name`),
    INDEX `individual_members_dob_idx`(`dob`),
    INDEX `individual_members_gender_idx`(`gender`),
    INDEX `individual_members_mobile_idx`(`mobile`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_types` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `defaultAmount` DECIMAL(10, 2) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `eligibilityRule` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `receipt_types_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipts` (
    `id` VARCHAR(191) NOT NULL,
    `receiptNumber` VARCHAR(191) NOT NULL,
    `individualMemberId` VARCHAR(191) NOT NULL,
    `receiptTypeId` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `generatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('ACTIVE', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NOT NULL,
    `verificationHash` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `receipts_receiptNumber_key`(`receiptNumber`),
    INDEX `receipts_receiptNumber_idx`(`receiptNumber`),
    INDEX `receipts_individualMemberId_idx`(`individualMemberId`),
    INDEX `receipts_receiptTypeId_idx`(`receiptTypeId`),
    INDEX `receipts_generatedAt_idx`(`generatedAt`),
    INDEX `receipts_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `migration_logs` (
    `id` VARCHAR(191) NOT NULL,
    `sourceMemberRecordId` VARCHAR(191) NOT NULL,
    `destinationMemberRecordId` VARCHAR(191) NOT NULL,
    `sourceFirmId` VARCHAR(191) NOT NULL,
    `destinationFirmId` VARCHAR(191) NOT NULL,
    `migratedMemberCount` INTEGER NOT NULL,
    `migratedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NOT NULL,
    `metadata` TEXT NULL,

    INDEX `migration_logs_migratedAt_idx`(`migratedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `module` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NULL,
    `entityId` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `metadata` TEXT NULL,

    INDEX `audit_logs_occurredAt_idx`(`occurredAt`),
    INDEX `audit_logs_userId_idx`(`userId`),
    INDEX `audit_logs_module_idx`(`module`),
    INDEX `audit_logs_entityType_entityId_idx`(`entityType`, `entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `backup_records` (
    `id` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `backupType` VARCHAR(191) NOT NULL,
    `checksum` VARCHAR(191) NOT NULL,
    `schemaVersion` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,

    INDEX `backup_records_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `firms` ADD CONSTRAINT `firms_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_records` ADD CONSTRAINT `member_records_surnameId_fkey` FOREIGN KEY (`surnameId`) REFERENCES `surnames`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `member_records` ADD CONSTRAINT `member_records_firmId_fkey` FOREIGN KEY (`firmId`) REFERENCES `firms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `individual_members` ADD CONSTRAINT `individual_members_familyRecordId_fkey` FOREIGN KEY (`familyRecordId`) REFERENCES `member_records`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `individual_members` ADD CONSTRAINT `individual_members_parentalSurnameId_fkey` FOREIGN KEY (`parentalSurnameId`) REFERENCES `surnames`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_individualMemberId_fkey` FOREIGN KEY (`individualMemberId`) REFERENCES `individual_members`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_receiptTypeId_fkey` FOREIGN KEY (`receiptTypeId`) REFERENCES `receipt_types`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `migration_logs` ADD CONSTRAINT `migration_logs_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `backup_records` ADD CONSTRAINT `backup_records_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
