-- Internal staff (cp_user) can be grouped by department (Admissions, Finance,
-- Operations, …) for the Users admin page.
ALTER TABLE `cp_user`
  ADD COLUMN `department` VARCHAR(100) NULL DEFAULT NULL AFTER `role`;
