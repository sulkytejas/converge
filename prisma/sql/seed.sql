-- =============================================================================
-- Converge — Seed data
-- =============================================================================
-- Applied by scripts/db-reset.sh after schema.sql.
--
-- Phone is stored as "${countryCode}${phone}" so it round-trips through the
-- toE164() helper used by the auth flow.
--
-- Dev login credentials (all use phone OTP):
--   role=0 SUPER_ADMIN          → admin@collegepond.com           / +91 9876543210
--   role=1 FINANCE_MANAGER      → finance.manager@collegepond.com / +91 9876543211
--   role=2 FINANCE_EXECUTIVE    → finance.exec@collegepond.com    / +91 9876543212
--   role=3 COUNSELLOR_LEAD      → counsellor.lead@collegepond.com / +91 9876543213
--   role=4 COUNSELLOR           → counsellor@collegepond.com      / +91 9876543214
--   role=5 OPERATIONS_LEAD      → ops.lead@collegepond.com        / +91 9876543215
--   role=6 OPERATIONS_EXECUTIVE → ops.exec@collegepond.com        / +91 9876543216
--   role=7 CONTENT_MANAGER      → content.manager@collegepond.com / +91 9876543217
--   role=8 BDM                  → bdm@collegepond.com             / +91 9876543218
-- =============================================================================

-- One CollegePond staff user per role, for local development. status=1 → active.
INSERT IGNORE INTO `collegepond_user` (
  `first_name`, `last_name`, `email`, `phone`, `role`, `status`
) VALUES
  ('Admin',       'User',       'admin@collegepond.com',           '+919876543210', 0, 1),
  ('Finance',     'Manager',    'finance.manager@collegepond.com', '+919876543211', 1, 1),
  ('Finance',     'Executive',  'finance.exec@collegepond.com',    '+919876543212', 2, 1),
  ('Counsellor',  'Lead',       'counsellor.lead@collegepond.com', '+919876543213', 3, 1),
  ('Counsellor',  'One',        'counsellor@collegepond.com',      '+919876543214', 4, 1),
  ('Operations',  'Lead',       'ops.lead@collegepond.com',        '+919876543215', 5, 1),
  ('Operations',  'Executive',  'ops.exec@collegepond.com',        '+919876543216', 6, 1),
  ('Content',     'Manager',    'content.manager@collegepond.com', '+919876543217', 7, 1),
  ('BDM',         'Partner',    'bdm@collegepond.com',             '+919876543218', 8, 1);
