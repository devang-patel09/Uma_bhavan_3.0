-- AlterTable
ALTER TABLE `firms` ADD COLUMN `familyHeadName` VARCHAR(191) NOT NULL DEFAULT '',
    ADD COLUMN `firmType` ENUM('PERMANENT', 'NOMINAL') NOT NULL DEFAULT 'PERMANENT',
    ADD COLUMN `subAreaId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `receipts` ADD COLUMN `familyRecordId` VARCHAR(191) NULL,
    ADD COLUMN `periodMonth` INTEGER NULL,
    ADD COLUMN `periodType` ENUM('MONTHLY', 'YEARLY') NOT NULL DEFAULT 'YEARLY',
    ADD COLUMN `periodYear` INTEGER NOT NULL DEFAULT 2026;

-- CreateTable
CREATE TABLE `sub_areas` (
    `id` VARCHAR(191) NOT NULL,
    `areaId` VARCHAR(191) NOT NULL,
    `nameNormalized` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `sub_areas_areaId_idx`(`areaId`),
    UNIQUE INDEX `sub_areas_areaId_nameNormalized_key`(`areaId`, `nameNormalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `receipt_configs` (
    `id` VARCHAR(191) NOT NULL,
    `yuvakMandalUpperAge` INTEGER NOT NULL DEFAULT 45,
    `samajMonthlyAmount` DECIMAL(10, 2) NOT NULL DEFAULT 100.00,
    `samajYearlyAmount` DECIMAL(10, 2) NOT NULL DEFAULT 1200.00,
    `yuvakMonthlyAmount` DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
    `yuvakYearlyAmount` DECIMAL(10, 2) NOT NULL DEFAULT 500.00,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `firms_subAreaId_idx` ON `firms`(`subAreaId`);

-- CreateIndex
CREATE INDEX `firms_firmType_idx` ON `firms`(`firmType`);

-- CreateIndex
CREATE INDEX `individual_members_name_dob_gender_idx` ON `individual_members`(`name`, `dob`, `gender`);

-- CreateIndex
CREATE INDEX `receipts_familyRecordId_idx` ON `receipts`(`familyRecordId`);

-- CreateIndex
CREATE INDEX `receipts_periodType_periodYear_periodMonth_idx` ON `receipts`(`periodType`, `periodYear`, `periodMonth`);

-- AddForeignKey
ALTER TABLE `sub_areas` ADD CONSTRAINT `sub_areas_areaId_fkey` FOREIGN KEY (`areaId`) REFERENCES `areas`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `firms` ADD CONSTRAINT `firms_subAreaId_fkey` FOREIGN KEY (`subAreaId`) REFERENCES `sub_areas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `receipts` ADD CONSTRAINT `receipts_familyRecordId_fkey` FOREIGN KEY (`familyRecordId`) REFERENCES `member_records`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
