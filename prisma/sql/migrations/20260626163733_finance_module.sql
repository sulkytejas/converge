-- Generated 2026-06-26T11:07:33Z by manual db-diff (finance/commission module).
-- REVIEWED: 3 commission DROP COLUMNs are intended (unused flags), not renames.

-- AlterTable
ALTER TABLE `application` ADD COLUMN `commission_contract_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `commission` DROP COLUMN `invoice_status`,
    DROP COLUMN `paid_to_collegepond`,
    DROP COLUMN `paid_to_partner`,
    ADD COLUMN `claimable_inr` DECIMAL(14, 2) NULL,
    ADD COLUMN `cp_share_pct` DECIMAL(5, 2) NULL,
    ADD COLUMN `partner_share_pct` DECIMAL(5, 2) NULL,
    ADD COLUMN `received_fx_rate` DECIMAL(12, 4) NULL,
    ADD COLUMN `vendor_id` INTEGER NULL;

-- AlterTable
ALTER TABLE `invoice` ADD COLUMN `bank_account_id` INTEGER NULL,
    ADD COLUMN `cgst_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `fy` SMALLINT NULL,
    ADD COLUMN `gstin` VARCHAR(20) NULL,
    ADD COLUMN `igst_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `is_interstate` TINYINT NULL,
    ADD COLUMN `net_payable` DECIMAL(14, 2) NULL,
    ADD COLUMN `pan` VARCHAR(15) NULL,
    ADD COLUMN `rejection_reason` VARCHAR(500) NULL,
    ADD COLUMN `sac_code` VARCHAR(10) NULL,
    ADD COLUMN `sgst_amount` DECIMAL(12, 2) NULL,
    ADD COLUMN `signed_at` TIMESTAMP(0) NULL,
    ADD COLUMN `tds_amount` DECIMAL(12, 2) NULL;

-- CreateTable
CREATE TABLE `commission_bonus_tier` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `min_students` SMALLINT UNSIGNED NOT NULL,
    `max_students` SMALLINT UNSIGNED NULL,
    `amount_per_student` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_bonus_tier_contract_idx`(`contract_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_contract` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `university_id` INTEGER NOT NULL,
    `vendor_id` INTEGER NULL,
    `cp_share_pct` DECIMAL(5, 2) NULL,
    `is_default` TINYINT NOT NULL DEFAULT 0,
    `effective_date` DATE NULL,
    `notes` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_commission_contract_university_idx`(`university_id` ASC),
    INDEX `fk_commission_contract_vendor_idx`(`vendor_id` ASC),
    UNIQUE INDEX `uq_contract_university_vendor`(`university_id` ASC, `vendor_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_rate` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `course_id` INTEGER NULL,
    `level` TINYINT UNSIGNED NULL,
    `commission_type` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `rate` DECIMAL(12, 2) NOT NULL,
    `currency` CHAR(3) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_commission_rate_contract_idx`(`contract_id` ASC),
    INDEX `fk_commission_rate_course_idx`(`course_id` ASC),
    UNIQUE INDEX `uq_rate_contract_course`(`contract_id` ASC, `course_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_tranche` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `commission_id` INTEGER NOT NULL,
    `seq` TINYINT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NULL,
    `amount` DECIMAL(12, 2) NULL,
    `amount_inr` DECIMAL(14, 2) NULL,
    `status` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `received_at` TIMESTAMP(0) NULL,
    `disbursed_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_commission_tranche_commission_idx`(`commission_id` ASC),
    UNIQUE INDEX `uq_commission_tranche_seq`(`commission_id` ASC, `seq` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commission_tranche_template` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contract_id` INTEGER NOT NULL,
    `seq` TINYINT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `amount` DECIMAL(12, 2) NULL,
    `pct` DECIMAL(5, 2) NULL,
    `timing` VARCHAR(150) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_tranche_template_contract_idx`(`contract_id` ASC),
    UNIQUE INDEX `uq_tranche_template_contract_seq`(`contract_id` ASC, `seq` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_bank_account` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `org_id` INTEGER NOT NULL,
    `account_holder` VARCHAR(150) NOT NULL,
    `account_number_enc` VARCHAR(1024) NULL,
    `account_number_last4` CHAR(4) NULL,
    `ifsc` VARCHAR(15) NULL,
    `swift` VARCHAR(15) NULL,
    `bank_name` VARCHAR(150) NULL,
    `branch` VARCHAR(150) NULL,
    `account_type` VARCHAR(30) NULL,
    `gstin_enc` VARCHAR(512) NULL,
    `pan_enc` VARCHAR(512) NULL,
    `provider_fund_account_id` VARCHAR(100) NULL,
    `is_verified` TINYINT NOT NULL DEFAULT 0,
    `verified_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_partner_bank_account_org_idx`(`org_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `partner_payout` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_id` INTEGER NOT NULL,
    `bank_account_id` INTEGER NULL,
    `amount_inr` DECIMAL(14, 2) NOT NULL,
    `status` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `ops_approved_by_cp_user_id` INTEGER NULL,
    `ops_approved_at` TIMESTAMP(0) NULL,
    `verify_bank_confirmed` TINYINT NOT NULL DEFAULT 0,
    `verify_invoice_verified` TINYINT NOT NULL DEFAULT 0,
    `verify_commission_verified` TINYINT NOT NULL DEFAULT 0,
    `verify_duplicate_check` TINYINT NOT NULL DEFAULT 0,
    `verified_by_cp_user_id` INTEGER NULL,
    `verified_at` TIMESTAMP(0) NULL,
    `method` TINYINT UNSIGNED NULL,
    `bank_name` VARCHAR(150) NULL,
    `account_number_last4` CHAR(4) NULL,
    `ifsc` VARCHAR(15) NULL,
    `swift` VARCHAR(15) NULL,
    `reference_number` VARCHAR(100) NULL,
    `payment_date` DATE NULL,
    `notes` VARCHAR(500) NULL,
    `released_by_cp_user_id` INTEGER NULL,
    `released_at` TIMESTAMP(0) NULL,
    `hold_reason` VARCHAR(500) NULL,
    `sent_back_reason` VARCHAR(500) NULL,
    `fy` SMALLINT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_partner_payout_bank_account_idx`(`bank_account_id` ASC),
    INDEX `idx_partner_payout_status`(`status` ASC),
    UNIQUE INDEX `uq_partner_payout_invoice`(`invoice_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(150) NOT NULL,
    `type` TINYINT UNSIGNED NOT NULL,
    `contact_name` VARCHAR(100) NULL,
    `contact_email` VARCHAR(255) NULL,
    `contact_phone` VARCHAR(45) NULL,
    `address` VARCHAR(255) NULL,
    `is_active` TINYINT NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_invoice` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `invoice_number` VARCHAR(40) NOT NULL,
    `vendor_id` INTEGER NOT NULL,
    `university_id` INTEGER NULL,
    `currency` CHAR(3) NOT NULL,
    `invoice_date` DATE NOT NULL,
    `due_date` DATE NULL,
    `status` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `total_expected_amount` DECIMAL(14, 2) NOT NULL,
    `notes` VARCHAR(1000) NULL,
    `fy` SMALLINT NULL,
    `created_by_cp_user_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_vendor_invoice_university_idx`(`university_id` ASC),
    INDEX `fk_vendor_invoice_vendor_idx`(`vendor_id` ASC),
    INDEX `idx_vendor_invoice_status`(`status` ASC),
    UNIQUE INDEX `uq_vendor_invoice_number`(`invoice_number` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_invoice_item` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vendor_invoice_id` INTEGER NOT NULL,
    `commission_id` INTEGER NOT NULL,
    `tuition_amount` DECIMAL(12, 2) NOT NULL,
    `calculated_commission` DECIMAL(12, 2) NOT NULL,
    `expected_amount` DECIMAL(12, 2) NOT NULL,
    `variance` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `variance_reason` TINYINT UNSIGNED NOT NULL DEFAULT 0,
    `variance_note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_vendor_invoice_item_invoice_idx`(`vendor_invoice_id` ASC),
    UNIQUE INDEX `uq_vendor_invoice_item_commission`(`commission_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendor_payment` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `vendor_invoice_id` INTEGER NOT NULL,
    `amount_inr` DECIMAL(14, 2) NOT NULL,
    `exchange_rate` DECIMAL(12, 4) NOT NULL,
    `amount_foreign` DECIMAL(14, 2) NOT NULL,
    `payment_date` DATE NOT NULL,
    `payment_reference` VARCHAR(100) NULL,
    `is_tranche` TINYINT NOT NULL DEFAULT 0,
    `tranche_number` TINYINT UNSIGNED NULL,
    `total_tranches` TINYINT UNSIGNED NULL,
    `is_final` TINYINT NOT NULL DEFAULT 0,
    `notes` VARCHAR(255) NULL,
    `fy` SMALLINT NULL,
    `created_by_cp_user_id` INTEGER NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `fk_vendor_payment_invoice_idx`(`vendor_invoice_id` ASC),
    PRIMARY KEY (`id` ASC)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `fk_application_commission_contract_idx` ON `application`(`commission_contract_id` ASC);

-- CreateIndex
CREATE INDEX `fk_commission_vendor_idx` ON `commission`(`vendor_id` ASC);

-- CreateIndex
CREATE INDEX `fk_invoice_bank_account_idx` ON `invoice`(`bank_account_id` ASC);

-- AddForeignKey
ALTER TABLE `application` ADD CONSTRAINT `fk_application_commission_contract` FOREIGN KEY (`commission_contract_id`) REFERENCES `commission_contract`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission` ADD CONSTRAINT `fk_commission_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_bonus_tier` ADD CONSTRAINT `fk_bonus_tier_contract` FOREIGN KEY (`contract_id`) REFERENCES `commission_contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_contract` ADD CONSTRAINT `fk_commission_contract_university` FOREIGN KEY (`university_id`) REFERENCES `university`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_contract` ADD CONSTRAINT `fk_commission_contract_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_rate` ADD CONSTRAINT `fk_commission_rate_contract` FOREIGN KEY (`contract_id`) REFERENCES `commission_contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_rate` ADD CONSTRAINT `fk_commission_rate_course` FOREIGN KEY (`course_id`) REFERENCES `course`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_tranche` ADD CONSTRAINT `fk_commission_tranche_commission` FOREIGN KEY (`commission_id`) REFERENCES `commission`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commission_tranche_template` ADD CONSTRAINT `fk_tranche_template_contract` FOREIGN KEY (`contract_id`) REFERENCES `commission_contract`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoice` ADD CONSTRAINT `fk_invoice_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `partner_bank_account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_bank_account` ADD CONSTRAINT `fk_partner_bank_account_org` FOREIGN KEY (`org_id`) REFERENCES `organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_payout` ADD CONSTRAINT `fk_partner_payout_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `partner_bank_account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partner_payout` ADD CONSTRAINT `fk_partner_payout_invoice` FOREIGN KEY (`invoice_id`) REFERENCES `invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_invoice` ADD CONSTRAINT `fk_vendor_invoice_university` FOREIGN KEY (`university_id`) REFERENCES `university`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_invoice` ADD CONSTRAINT `fk_vendor_invoice_vendor` FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_invoice_item` ADD CONSTRAINT `fk_vendor_invoice_item_commission` FOREIGN KEY (`commission_id`) REFERENCES `commission`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_invoice_item` ADD CONSTRAINT `fk_vendor_invoice_item_invoice` FOREIGN KEY (`vendor_invoice_id`) REFERENCES `vendor_invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `vendor_payment` ADD CONSTRAINT `fk_vendor_payment_invoice` FOREIGN KEY (`vendor_invoice_id`) REFERENCES `vendor_invoice`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

