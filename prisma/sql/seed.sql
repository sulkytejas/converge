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
-- last_login_at seeded to NOW() so the dev UI doesn't show "Never" everywhere.
INSERT IGNORE INTO `collegepond_user` (
  `first_name`, `last_name`, `email`, `phone`, `role`, `status`, `last_login_at`
) VALUES
  ('Admin',       'User',       'admin@collegepond.com',           '+919876543210', 0, 1, NOW()),
  ('Finance',     'Manager',    'finance.manager@collegepond.com', '+919876543211', 1, 1, NOW()),
  ('Finance',     'Executive',  'finance.exec@collegepond.com',    '+919876543212', 2, 1, NOW()),
  ('Counsellor',  'Lead',       'counsellor.lead@collegepond.com', '+919876543213', 3, 1, NOW()),
  ('Counsellor',  'One',        'counsellor@collegepond.com',      '+919876543214', 4, 1, NOW()),
  ('Operations',  'Lead',       'ops.lead@collegepond.com',        '+919876543215', 5, 1, NOW()),
  ('Operations',  'Executive',  'ops.exec@collegepond.com',        '+919876543216', 6, 1, NOW()),
  ('Content',     'Manager',    'content.manager@collegepond.com', '+919876543217', 7, 1, NOW()),
  ('BDM',         'Partner',    'bdm@collegepond.com',             '+919876543218', 8, 1, NOW());
