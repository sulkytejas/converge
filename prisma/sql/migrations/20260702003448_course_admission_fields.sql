-- Program admission fields: PTE (some unis need PTE not DET), GRE/GMAT, and an
-- application deadline. Additive, all nullable.

ALTER TABLE `course`
  ADD COLUMN `pte`                  DECIMAL(4,1) NULL DEFAULT NULL AFTER `duolingo`,
  ADD COLUMN `gre`                  SMALLINT     NULL DEFAULT NULL AFTER `pte`,
  ADD COLUMN `gmat`                 SMALLINT     NULL DEFAULT NULL AFTER `gre`,
  ADD COLUMN `application_deadline` DATE         NULL DEFAULT NULL AFTER `app_fee`;
