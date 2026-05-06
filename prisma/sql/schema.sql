-- =============================================================================
-- Converge — MySQL schema
-- =============================================================================
-- Source of truth for the database structure. Generated via MySQL Workbench
-- Forward Engineering.
--
-- This file is intended to be run against an already-selected database (the
-- wrapper script in scripts/db-reset.sh handles DROP / CREATE / USE based on
-- the DATABASE_URL in .env).
-- =============================================================================

SET @OLD_UNIQUE_CHECKS      = @@UNIQUE_CHECKS,      UNIQUE_CHECKS = 0;
SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS = 0;
SET @OLD_SQL_MODE           = @@SQL_MODE,
    SQL_MODE = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';


-- -----------------------------------------------------
-- organization
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `organization` (
  `id`                    INT NOT NULL AUTO_INCREMENT,
  `name`                  VARCHAR(100) NOT NULL,
  `type`                  TINYINT(3) UNSIGNED NOT NULL,
  `website`               VARCHAR(255) NULL DEFAULT NULL,
  `address`               VARCHAR(255) NULL DEFAULT NULL,
  `city`                  VARCHAR(100) NULL DEFAULT NULL,
  `state`                 VARCHAR(100) NULL DEFAULT NULL,
  `country`               VARCHAR(2)   NULL DEFAULT NULL,
  `num_counsellors`       TINYINT(5) UNSIGNED NULL DEFAULT NULL,
  `is_verified`           TINYINT NOT NULL DEFAULT 0,
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `annual_student_volume` TINYINT(5) UNSIGNED NULL DEFAULT NULL,
  `url_identifier`        VARCHAR(100) NOT NULL,
  `logo_url`              VARCHAR(255) NULL DEFAULT NULL,
  `gst_number`            VARCHAR(20)  NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `url_identifier_UNIQUE` (`url_identifier` ASC) VISIBLE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- collegepond_user  (internal staff accounts; carries role)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `collegepond_user` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `first_name`    VARCHAR(50)  NOT NULL,
  `last_name`     VARCHAR(50)  NOT NULL,
  `email`         VARCHAR(125) NOT NULL,
  `phone`         VARCHAR(45)  NOT NULL,
  `role`          TINYINT(8) UNSIGNED NOT NULL,
  `status`        TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
  `last_login_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC) VISIBLE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- user  (FK -> organization, collegepond_user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `user` (
  `id`                              INT NOT NULL AUTO_INCREMENT,
  `first_name`                      VARCHAR(50)  NOT NULL,
  `last_name`                       VARCHAR(50)  NOT NULL,
  `type`                            TINYINT(5) UNSIGNED NOT NULL,
  `email`                           VARCHAR(255) NOT NULL,
  `phone`                           VARCHAR(45)  NOT NULL,
  `is_owner`                        TINYINT NOT NULL DEFAULT 0,
  `status`                          TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `avatar_url`                      VARCHAR(500) NULL DEFAULT NULL,
  `is_email_verified`               TINYINT NOT NULL DEFAULT 0,
  `is_phone_verified`               TINYINT NOT NULL DEFAULT 0,
  `tracking_id`                     VARCHAR(50)  NULL DEFAULT NULL,
  `org_id`                          INT NULL DEFAULT NULL,
  `date_of_birth`                   DATE NULL DEFAULT NULL,
  `gender`                          TINYINT(3) UNSIGNED NULL DEFAULT NULL,
  `nationality`                     VARCHAR(2)   NULL DEFAULT NULL,
  `address`                         VARCHAR(255) NULL DEFAULT NULL,
  `city`                            VARCHAR(100) NULL DEFAULT NULL,
  `state`                           VARCHAR(100) NULL DEFAULT NULL,
  `country`                         VARCHAR(2)   NULL DEFAULT NULL,
  `approved_by_collegepond_user_id` INT NULL DEFAULT NULL,
  `lead_counsellor_id`              INT NULL DEFAULT NULL,
  `counsellor_id`                   INT NULL DEFAULT NULL,
  `bdm_id`                          INT NULL DEFAULT NULL,
  `notes`                           VARCHAR(255) NULL DEFAULT NULL,
  `tier`                            TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `mou_signed_at`                   TIMESTAMP NULL DEFAULT NULL,
  `last_login_at`                   TIMESTAMP NULL DEFAULT NULL,
  `created_at`                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`                      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `email_UNIQUE`       (`email` ASC) VISIBLE,
  UNIQUE INDEX `tracking_id_UNIQUE` (`tracking_id` ASC) VISIBLE,
  INDEX `fk_user_organization_idx`           (`org_id` ASC) VISIBLE,
  INDEX `fk_user_collegepond_user1_idx`      (`approved_by_collegepond_user_id` ASC) VISIBLE,
  INDEX `fk_user_collegepond_user1_idx1`     (`lead_counsellor_id` ASC) VISIBLE,
  INDEX `fk_user_collegepond_user2_idx`      (`counsellor_id` ASC) VISIBLE,
  INDEX `fk_user_collegepond_user_bdm_idx`   (`bdm_id` ASC) VISIBLE,
  CONSTRAINT `fk_user_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_approved_by_collegepond_user`
    FOREIGN KEY (`approved_by_collegepond_user_id`) REFERENCES `collegepond_user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_lead_counsellor`
    FOREIGN KEY (`lead_counsellor_id`) REFERENCES `collegepond_user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_counsellor`
    FOREIGN KEY (`counsellor_id`) REFERENCES `collegepond_user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_user_bdm`
    FOREIGN KEY (`bdm_id`) REFERENCES `collegepond_user` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- document  (FK -> organization, user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `document` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `file_name`       VARCHAR(255) NOT NULL,
  `file_url`        VARCHAR(500) NOT NULL,
  `mime_type`       VARCHAR(100) NULL DEFAULT NULL,
  `is_most_recent`  TINYINT NOT NULL DEFAULT 1,
  `doc_type`        VARCHAR(50)  NOT NULL,
  `status`          TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `org_id`          INT NULL DEFAULT NULL,
  `user_id`         INT NULL DEFAULT NULL,
  `is_org_document` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_document_organization1_idx` (`org_id` ASC) VISIBLE,
  INDEX `fk_document_user1_idx`         (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_document_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_document_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- session  (FK -> user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `session` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `token_hash` VARCHAR(255) NOT NULL,
  `ip_address` VARCHAR(45)  NULL DEFAULT NULL,
  `user_agent` VARCHAR(500) NULL DEFAULT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id`    INT NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `token_hash_UNIQUE`  (`token_hash` ASC) VISIBLE,
  INDEX        `fk_session_user1_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_session_user1`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- student  (FK -> organization, user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `student` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `first_name`    VARCHAR(50)  NOT NULL,
  `last_name`     VARCHAR(50)  NOT NULL,
  `email`         VARCHAR(255) NULL DEFAULT NULL,
  `phone`         VARCHAR(20)  NULL DEFAULT NULL,
  `country`       VARCHAR(2)   NULL DEFAULT NULL,
  `intake`        VARCHAR(20)  NULL DEFAULT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `gender`        TINYINT(3) UNSIGNED NULL DEFAULT NULL,
  `org_id`        INT NOT NULL,
  `counsellor_id` INT NULL,
  `date_of_birth` DATE NULL DEFAULT NULL,
  `nationality`   VARCHAR(2)  NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_student_organization1_idx` (`org_id` ASC) VISIBLE,
  INDEX `fk_student_user1_idx`         (`counsellor_id` ASC) VISIBLE,
  CONSTRAINT `fk_student_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_student_user`
    FOREIGN KEY (`counsellor_id`) REFERENCES `user` (`id`)
    ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- university
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `university` (
  `id`         INT NOT NULL AUTO_INCREMENT,
  `name`       VARCHAR(150) NOT NULL,
  `city`       VARCHAR(100) NULL DEFAULT NULL,
  `country`    VARCHAR(2)   NOT NULL,
  `website`    VARCHAR(255) NULL DEFAULT NULL,
  `logo_url`   VARCHAR(255) NULL DEFAULT NULL,
  `is_open`    TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- course  (FK -> university)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `course` (
  `id`              INT NOT NULL AUTO_INCREMENT,
  `name`            VARCHAR(150) NOT NULL,
  `degree_level`    TINYINT(5) UNSIGNED NULL DEFAULT NULL,
  `duration_months` SMALLINT NULL DEFAULT NULL,
  `tuition_fee`     DECIMAL(12,2) NULL DEFAULT NULL,
  `currency`        CHAR(3) NULL DEFAULT NULL,
  `is_open`         TINYINT NOT NULL DEFAULT 1,
  `created_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `university_id`   INT NOT NULL,
  `code`            VARCHAR(50) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_course_university1_idx` (`university_id` ASC) VISIBLE,
  UNIQUE INDEX `code_UNIQUE`        (`code` ASC) VISIBLE,
  CONSTRAINT `fk_course_university`
    FOREIGN KEY (`university_id`) REFERENCES `university` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- application  (FK -> student, course, organization)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `application` (
  `id`                 INT NOT NULL AUTO_INCREMENT,
  `status`             TINYINT(7) NOT NULL DEFAULT 0,
  `submitted_at`       TIMESTAMP NULL DEFAULT NULL,
  `decided_at`         TIMESTAMP NULL DEFAULT NULL,
  `created_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `notes`              VARCHAR(1000) NULL DEFAULT NULL,
  `student_id`         INT NOT NULL,
  `course_id`          INT NOT NULL,
  `org_id`             INT NOT NULL,
  `offer_letter_url`   VARCHAR(255) NULL DEFAULT NULL,
  `program_start_date` DATE NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_application_student1_idx`      (`student_id` ASC) VISIBLE,
  INDEX `fk_application_course1_idx`       (`course_id` ASC) VISIBLE,
  INDEX `fk_application_organization1_idx` (`org_id` ASC) VISIBLE,
  CONSTRAINT `fk_application_student`
    FOREIGN KEY (`student_id`) REFERENCES `student` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_application_course`
    FOREIGN KEY (`course_id`) REFERENCES `course` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_application_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- commission  (FK -> application, organization)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `commission` (
  `id`                       INT NOT NULL AUTO_INCREMENT,
  `tuition_fee`              DECIMAL(12,2) NOT NULL,
  `currency`                 CHAR(3) NOT NULL,
  `commision_rate`           DECIMAL(5,2)  NOT NULL,
  `commision_amount`         DECIMAL(12,2) NOT NULL,
  `invoice_status`           TINYINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `paid_to_collegepond`      TINYINT NOT NULL DEFAULT 0,
  `paid_to_partner`          TINYINT NOT NULL DEFAULT 0,
  `partner_paid_at`          TIMESTAMP NULL DEFAULT NULL,
  `created_at`               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`               TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `application_id`           INT NOT NULL,
  `org_id`                   INT NOT NULL,
  `collegepond_received_at`  TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_commission_application1_idx`  (`application_id` ASC) VISIBLE,
  UNIQUE INDEX `application_id_UNIQUE`    (`application_id` ASC) VISIBLE,
  INDEX `fk_commission_organization1_idx` (`org_id` ASC) VISIBLE,
  CONSTRAINT `fk_commission_application`
    FOREIGN KEY (`application_id`) REFERENCES `application` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_commission_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- invoice  (FK -> organization)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice` (
  `id`                    INT NOT NULL AUTO_INCREMENT,
  `invoice_number`        VARCHAR(30) NOT NULL,
  `invoice_date`          DATE NOT NULL,
  `total_amount`          DECIMAL(14,2) NOT NULL,
  `currency`              CHAR(3) NOT NULL,
  `status`                TINYINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `bank_details`          VARCHAR(1000) NULL DEFAULT NULL,
  `notes`                 VARCHAR(1000) NULL DEFAULT NULL,
  `signatory_name`        VARCHAR(100)  NULL DEFAULT NULL,
  `signatory_designation` VARCHAR(100)  NULL DEFAULT NULL,
  `created_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `org_id`                INT NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_invoice_organization1_idx` (`org_id` ASC) VISIBLE,
  UNIQUE INDEX `invoice_number_UNIQUE` (`invoice_number` ASC) VISIBLE,
  CONSTRAINT `fk_invoice_organization`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- event
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `event` (
  `id`             INT NOT NULL AUTO_INCREMENT,
  `title`          VARCHAR(255) NOT NULL,
  `event_type`     TINYINT(5) UNSIGNED NOT NULL,
  `description`    VARCHAR(1000) NULL DEFAULT NULL,
  `event_date`     DATE NOT NULL,
  `start_time`     TIME NULL DEFAULT NULL,
  `end_time`       TIME NULL DEFAULT NULL,
  `timezone`       VARCHAR(50) NULL DEFAULT NULL,
  `location`       VARCHAR(255) NULL DEFAULT NULL,
  `is_virtual`     TINYINT NOT NULL DEFAULT 0,
  `meeting_url`    VARCHAR(500) NULL,
  `max_attendees`  INT NULL DEFAULT NULL,
  `is_active`      TINYINT NOT NULL DEFAULT 1,
  `created_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- invoice_item  (FK -> invoice, commission)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `invoice_item` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `invoice_id`    INT NOT NULL,
  `commission_id` INT NOT NULL,
  `amount`        DECIMAL(12,2) NOT NULL,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_invoice_item_invoice1_idx`    (`invoice_id` ASC) VISIBLE,
  INDEX `fk_invoice_item_commission1_idx` (`commission_id` ASC) VISIBLE,
  UNIQUE INDEX `commission_id_UNIQUE`     (`commission_id` ASC) VISIBLE,
  CONSTRAINT `fk_invoice_item_invoice`
    FOREIGN KEY (`invoice_id`) REFERENCES `invoice` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_invoice_item_commission`
    FOREIGN KEY (`commission_id`) REFERENCES `commission` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- event_registration  (FK -> event, user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_registration` (
  `id`            INT NOT NULL AUTO_INCREMENT,
  `event_id`      INT NOT NULL,
  `user_id`       INT NOT NULL,
  `num_attendees` TINYINT(5) UNSIGNED NOT NULL DEFAULT 0,
  `status`        TINYINT(3) UNSIGNED NOT NULL DEFAULT 0,
  `created_at`    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_event_registration_event1_idx` (`event_id` ASC) VISIBLE,
  INDEX `fk_event_registration_user1_idx`  (`user_id`  ASC) VISIBLE,
  CONSTRAINT `fk_event_registration_event`
    FOREIGN KEY (`event_id`) REFERENCES `event` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_event_registration_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- event_reminder  (FK -> event_registration)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `event_reminder` (
  `id`                    INT NOT NULL AUTO_INCREMENT,
  `event_registration_id` INT NOT NULL,
  `reminder_type`         TINYINT(5) UNSIGNED NOT NULL,
  `via_email`             TINYINT NOT NULL DEFAULT 1,
  `via_whatsapp`          TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_event_reminder_event_registration1_idx` (`event_registration_id` ASC) VISIBLE,
  CONSTRAINT `fk_event_reminder_event_registration`
    FOREIGN KEY (`event_registration_id`) REFERENCES `event_registration` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- notification_preference  (FK -> user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_preference` (
  `id`                INT NOT NULL AUTO_INCREMENT,
  `user_id`           INT NOT NULL,
  `notification_type` TINYINT(5) UNSIGNED NOT NULL,
  `via_email`         TINYINT NOT NULL DEFAULT 1,
  `via_sms`           TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_notification_preference_user1_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_notification_preference_user`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;


-- -----------------------------------------------------
-- audit_log  (FK -> organization, user)
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_log` (
  `id`          INT NOT NULL AUTO_INCREMENT,
  `org_id`      INT NULL DEFAULT NULL,
  `user_id`     INT NULL DEFAULT NULL,
  `action`      VARCHAR(100) NOT NULL,
  `entity_type` VARCHAR(50) NULL DEFAULT NULL,
  `entity_id`   INT NULL DEFAULT NULL,
  `metadata`    JSON NULL DEFAULT NULL,
  `created_at`  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `fk_audit_log_organization1_idx` (`org_id` ASC) VISIBLE,
  INDEX `fk_audit_log_user1_idx`         (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_audit_log_organization1`
    FOREIGN KEY (`org_id`) REFERENCES `organization` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_audit_log_user1`
    FOREIGN KEY (`user_id`) REFERENCES `user` (`id`)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB;


SET SQL_MODE            = @OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS  = @OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS       = @OLD_UNIQUE_CHECKS;
