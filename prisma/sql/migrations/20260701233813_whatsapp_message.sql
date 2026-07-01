-- WhatsApp messages (Periskope) — student ↔ counsellor thread. from_me = 1 sent
-- by CP / 0 received. Webhook dedups on provider_message_id. Additive.

CREATE TABLE IF NOT EXISTS `whatsapp_message` (
  `id`                  INT           NOT NULL AUTO_INCREMENT,
  `student_id`          INT           NULL DEFAULT NULL,
  `chat_id`             VARCHAR(64)   NOT NULL,
  `provider_message_id` VARCHAR(100)  NULL DEFAULT NULL,
  `from_me`             TINYINT       NOT NULL DEFAULT 0,
  `body`                TEXT          NULL DEFAULT NULL,
  `message_type`        VARCHAR(30)   NULL DEFAULT NULL,
  `sent_by_cp_user_id`  INT           NULL DEFAULT NULL,
  `status`              VARCHAR(30)   NULL DEFAULT NULL,
  `provider_ts`         TIMESTAMP     NULL DEFAULT NULL,
  `created_at`          TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `uq_whatsapp_message_provider` (`provider_message_id` ASC) VISIBLE,
  INDEX `idx_whatsapp_message_student` (`student_id` ASC, `created_at` ASC) VISIBLE,
  INDEX `idx_whatsapp_message_chat` (`chat_id` ASC) VISIBLE,
  CONSTRAINT `fk_whatsapp_message_student`
    FOREIGN KEY (`student_id`) REFERENCES `student` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;
