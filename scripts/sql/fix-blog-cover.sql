-- ربط صورة غلاف بمقال «التحول الرقمي في السعودية»
-- نفّذ في phpMyAdmin على قاعدة umq_platform

INSERT INTO `media_library` (
  `id`,
  `filename`,
  `mime_type`,
  `size`,
  `storage_key`,
  `url`,
  `alt_ar`,
  `alt_en`,
  `folder`,
  `uploaded_by_id`,
  `created_at`,
  `updated_at`,
  `deleted_at`
) VALUES (
  '11111111-1111-4111-8111-111111111101',
  'digital-transformation-cover.jpg',
  'image/jpeg',
  0,
  'seed/blog/digital-transformation-cover.jpg',
  'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80',
  'التحول الرقمي في السعودية',
  'Digital transformation in Saudi Arabia',
  'blog',
  '865049f1-c9b3-4212-9eec-4d8f579342d6',
  NOW(3),
  NOW(3),
  NULL
)
ON DUPLICATE KEY UPDATE
  `url` = VALUES(`url`),
  `alt_ar` = VALUES(`alt_ar`),
  `alt_en` = VALUES(`alt_en`),
  `updated_at` = NOW(3);

UPDATE `blog_posts`
SET
  `cover_media_id` = '11111111-1111-4111-8111-111111111101',
  `updated_at` = NOW(3)
WHERE
  `slug` = 'digital-transformation-ksa'
  AND `locale` = 'AR'
  AND `deleted_at` IS NULL;
