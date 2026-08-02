-- Agency signup now asks "GST Registered?" (Yes/No) in Company Details, which
-- drives whether the GST certificate upload is mandatory. Nullable on purpose:
-- organizations created before this column existed never answered the question,
-- and NULL ("not asked") must stay distinguishable from 0 ("not registered").
ALTER TABLE `organization`
  ADD COLUMN `gst_registered` TINYINT NULL DEFAULT NULL AFTER `gst_number`;
