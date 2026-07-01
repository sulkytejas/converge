-- Partner management: persist a reason when a partner is rejected/deactivated,
-- and store the agency's PAN on the organization (needed for GST tax invoices,
-- alongside the existing gst_number).
ALTER TABLE `user`
  ADD COLUMN `status_reason` VARCHAR(500) NULL DEFAULT NULL AFTER `notes`;

ALTER TABLE `organization`
  ADD COLUMN `pan` VARCHAR(15) NULL DEFAULT NULL AFTER `gst_number`;
