-- System-wide settings (general + notification toggles) as key → JSON value.
-- Replaces the Settings page's localStorage-only persistence. Additive.

CREATE TABLE IF NOT EXISTS `system_config` (
  `config_key` VARCHAR(64) NOT NULL,
  `value`      TEXT        NOT NULL,
  `updated_at` TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`config_key`)
) ENGINE = InnoDB;
