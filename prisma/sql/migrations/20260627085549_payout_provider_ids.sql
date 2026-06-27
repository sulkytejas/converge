-- RazorpayX (payout provider) linkage: a fund account maps to a contact, and a
-- released payout carries the provider payout id + bank UTR + provider status.
ALTER TABLE `partner_bank_account`
  ADD COLUMN `provider_contact_id` VARCHAR(100) NULL DEFAULT NULL AFTER `provider_fund_account_id`;

ALTER TABLE `partner_payout`
  ADD COLUMN `provider_payout_id` VARCHAR(100) NULL DEFAULT NULL AFTER `reference_number`,
  ADD COLUMN `utr`                VARCHAR(50)  NULL DEFAULT NULL AFTER `provider_payout_id`,
  ADD COLUMN `provider_status`    VARCHAR(30)  NULL DEFAULT NULL AFTER `utr`;
