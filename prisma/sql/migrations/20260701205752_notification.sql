-- Persistent in-app notification feed (partner-facing). Written on discrete
-- events (e.g. a counsellor approval decision); read via the partner bell.
-- unread = read_at IS NULL. Additive — no impact on existing tables.

CREATE TABLE IF NOT EXISTS `notification` (
  `id`         INT           NOT NULL AUTO_INCREMENT,
  `user_id`    INT           NOT NULL,
  `type`       VARCHAR(50)   NOT NULL,
  `title`      VARCHAR(255)  NOT NULL,
  `body`       VARCHAR(500)  NULL DEFAULT NULL,
  `link`       VARCHAR(255)  NULL DEFAULT NULL,
  `tone`       VARCHAR(10)   NOT NULL DEFAULT 'blue',
  `read_at`    TIMESTAMP     NULL DEFAULT NULL,
  `created_at` TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_notification_user_created` (`user_id` ASC, `created_at` ASC) VISIBLE,
  INDEX `idx_notification_user_read`    (`user_id` ASC, `read_at` ASC) VISIBLE,
  CONSTRAINT `fk_notification_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;
