-- Pay-as-collected: invoice_item claims a specific commission_tranche, so one
-- commission can be invoiced once PER tranche (not once total). Drop the
-- commission_id unique; add a nullable commission_tranche_id with its own unique
-- + FK. Existing rows keep commission_tranche_id NULL (legacy single-invoice).

-- AlterTable: drop the one-invoice-per-commission unique (keep the plain index)
ALTER TABLE `invoice_item` DROP INDEX `commission_id_UNIQUE`;

-- AlterTable: add the tranche reference
ALTER TABLE `invoice_item` ADD COLUMN `commission_tranche_id` INT NULL AFTER `commission_id`;

-- One invoice line per tranche (multiple NULLs allowed by MySQL)
CREATE UNIQUE INDEX `uq_invoice_item_tranche` ON `invoice_item` (`commission_tranche_id`);
CREATE INDEX `fk_invoice_item_tranche_idx` ON `invoice_item` (`commission_tranche_id`);

-- AddForeignKey
ALTER TABLE `invoice_item`
  ADD CONSTRAINT `fk_invoice_item_tranche`
  FOREIGN KEY (`commission_tranche_id`) REFERENCES `commission_tranche` (`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
