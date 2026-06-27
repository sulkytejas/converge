-- Add fx_rate: live, editable exchange rates used for INR *estimate* conversion.
-- mid_rate  = mid-market value (INR per 1 unit of currency), refreshed from a feed.
-- Effective rate (computed in the app) = manual_rate ?? mid_rate * (1 - margin_pct/100).
-- INR is the base (always 1) and is intentionally not stored here.
CREATE TABLE IF NOT EXISTS `fx_rate` (
  `currency`    VARCHAR(3)    NOT NULL,
  `mid_rate`    DECIMAL(12,4) NOT NULL,
  `margin_pct`  DECIMAL(6,3)  NOT NULL DEFAULT 0,
  `manual_rate` DECIMAL(12,4) NULL,
  `source`      VARCHAR(50)   NULL,
  `fetched_at`  TIMESTAMP     NULL,
  `updated_at`  TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`currency`)
) ENGINE = InnoDB;

-- Seed from the previous INDICATIVE_FX_RATES house defaults (margin 0 → effective == old constant,
-- so behaviour is unchanged until someone refreshes from the feed or sets a margin).
INSERT INTO `fx_rate` (`currency`, `mid_rate`, `margin_pct`, `source`) VALUES
  ('USD', 83.5000, 0, 'seed'),
  ('GBP', 105.8000, 0, 'seed'),
  ('EUR', 90.6000, 0, 'seed'),
  ('AUD', 54.2000, 0, 'seed'),
  ('CAD', 61.3000, 0, 'seed'),
  ('NZD', 49.8000, 0, 'seed'),
  ('SGD', 62.1000, 0, 'seed')
ON DUPLICATE KEY UPDATE `currency` = `currency`;
