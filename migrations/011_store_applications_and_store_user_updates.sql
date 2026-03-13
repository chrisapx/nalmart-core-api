-- Migration 011: StoreApplication table + StoreUser role/permissions columns
-- Run this against your MySQL database

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create store_applications table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `store_applications` (
  `id`            BIGINT       NOT NULL AUTO_INCREMENT,
  `applicant_id`  BIGINT       NOT NULL,
  `store_name`    VARCHAR(150) NOT NULL,
  `description`   VARCHAR(500) DEFAULT NULL,
  `email`         VARCHAR(150) DEFAULT NULL,
  `phone`         VARCHAR(30)  DEFAULT NULL,
  `business_type` VARCHAR(100) DEFAULT NULL,
  `website_url`   VARCHAR(200) DEFAULT NULL,
  `logo_url`      VARCHAR(200) DEFAULT NULL,
  `metadata`      JSON         DEFAULT NULL,
  `status`        ENUM('pending','approved','rejected','under_review')
                               NOT NULL DEFAULT 'pending',
  `reviewed_by`   BIGINT       DEFAULT NULL,
  `review_notes`  TEXT         DEFAULT NULL,
  `reviewed_at`   DATETIME     DEFAULT NULL,
  `store_id`      BIGINT       DEFAULT NULL   COMMENT 'Set when approved and store is created',
  `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sa_applicant` (`applicant_id`),
  KEY `idx_sa_status`    (`status`),
  KEY `idx_sa_store`     (`store_id`),
  CONSTRAINT `fk_sa_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sa_reviewer`  FOREIGN KEY (`reviewed_by`)  REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Update store_users: expand role enum + add permissions/invited_by columns
-- ─────────────────────────────────────────────────────────────────────────────

-- 2a. Modify role column (add 'staff' and 'viewer', rename default, drop 'vendor')
ALTER TABLE `store_users`
  MODIFY COLUMN `role`
    ENUM('owner','manager','staff','viewer')
    NOT NULL
    DEFAULT 'staff'
    COMMENT 'owner = full control, manager = manage staff + all, staff = products/orders, viewer = read-only';

-- 2b. Add permissions column (JSON array of StorePermissionSlugs, null = use role default)
ALTER TABLE `store_users`
  ADD COLUMN `permissions` JSON DEFAULT NULL
    COMMENT 'Fine-grained permission overrides; null = use role defaults'
  AFTER `role`;

-- 2c. Add invited_by + invitation_note columns
ALTER TABLE `store_users`
  ADD COLUMN `invited_by` BIGINT DEFAULT NULL COMMENT 'User ID of the manager/admin who invited this member'
  AFTER `permissions`,
  ADD COLUMN `invitation_note` VARCHAR(300) DEFAULT NULL
  AFTER `invited_by`;

ALTER TABLE `store_users`
  ADD CONSTRAINT `fk_su_invited_by` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;
