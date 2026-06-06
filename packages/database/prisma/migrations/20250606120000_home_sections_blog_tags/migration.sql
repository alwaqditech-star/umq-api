-- Home section registry + blog tags
ALTER TABLE `blog_posts` ADD COLUMN `tags` JSON NOT NULL DEFAULT ('[]');

CREATE TABLE `home_sections` (
    `id` CHAR(36) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label_ar` VARCHAR(191) NOT NULL,
    `label_en` VARCHAR(191) NOT NULL,
    `is_enabled` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `home_sections_key_key`(`key`),
    INDEX `home_sections_is_enabled_sort_order_idx`(`is_enabled`, `sort_order`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
