-- =============================================================================
-- Converge — Seed data
-- =============================================================================
-- Applied by scripts/db-reset.sh after schema.sql.
--
-- Phone is stored as "${countryCode}${phone}" so it round-trips through the
-- toE164() helper used by the auth flow.
--
-- Dev login credentials:
--   Admin → admin@collegepond.com / +91 9876543210
-- =============================================================================

-- Dummy admin user for local development.
-- type=10 → UserType.ADMIN, status=1 → UserStatus.APPROVED.
INSERT IGNORE INTO `user` (
  `first_name`, `last_name`, `type`, `email`, `phone`,
  `is_owner`, `status`, `is_email_verified`, `is_phone_verified`,
  `tracking_id`, `org_id`
) VALUES (
  'Admin', 'User', 10, 'admin@collegepond.com', '+919876543210',
  0, 1, 1, 1,
  '#CP-2026-ADMIN', NULL
);
