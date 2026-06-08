-- CreateTable
CREATE TABLE `project_images` (
    `id` CHAR(36) NOT NULL,
    `project_id` CHAR(36) NOT NULL,
    `media_id` CHAR(36) NOT NULL,
    `sort_order` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `project_images_project_id_sort_order_idx`(`project_id`, `sort_order`),
    UNIQUE INDEX `project_images_project_id_media_id_key`(`project_id`, `media_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `project_images` ADD CONSTRAINT `project_images_media_id_fkey` FOREIGN KEY (`media_id`) REFERENCES `media_library`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
