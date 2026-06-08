-- ربط صور غلاف المشاريع بروابط Unsplash (نفس أسلوب المدونة)
-- نفّذ في phpMyAdmin أو TiDB على قاعدة umq_db

INSERT INTO `media_library` (
  `id`, `filename`, `mime_type`, `size`, `storage_key`, `url`,
  `alt_ar`, `alt_en`, `folder`, `created_at`, `updated_at`, `deleted_at`
) VALUES
(
  '22222222-2222-4222-8222-222222222202',
  'umq-platform-cover.jpg',
  'image/jpeg',
  0,
  'seed/projects/umq-platform-cover.jpg',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80',
  'منصة عُمْق',
  'UMQ Platform',
  'projects',
  NOW(3), NOW(3), NULL
),
(
  '33333333-3333-4333-8333-333333333303',
  'glorda-app-cover.jpg',
  'image/jpeg',
  0,
  'seed/projects/glorda-app-cover.jpg',
  'https://images.unsplash.com/photo-1490759847861-5c8736cd3575?w=1200&q=80',
  'تطبيق غلوردا',
  'Glorda App',
  'projects',
  NOW(3), NOW(3), NULL
),
(
  '44444444-4444-4444-8444-444444444404',
  'umq-digital-cover.jpg',
  'image/jpeg',
  0,
  'seed/projects/umq-digital-cover.jpg',
  'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&q=80',
  'حلول رقمية',
  'Digital Solutions',
  'projects',
  NOW(3), NOW(3), NULL
)
ON DUPLICATE KEY UPDATE
  `url` = VALUES(`url`),
  `filename` = VALUES(`filename`),
  `alt_ar` = VALUES(`alt_ar`),
  `alt_en` = VALUES(`alt_en`),
  `updated_at` = NOW(3);

UPDATE `projects`
SET `cover_media_id` = '22222222-2222-4222-8222-222222222202', `updated_at` = NOW(3)
WHERE `slug` = 'umq-platform' AND `deleted_at` IS NULL;

UPDATE `projects`
SET `cover_media_id` = '33333333-3333-4333-8333-333333333303', `updated_at` = NOW(3)
WHERE `slug` IN ('glorda-app', 'Glorda App') AND `deleted_at` IS NULL;

UPDATE `projects`
SET
  `cover_media_id` = '44444444-4444-4444-8444-444444444404',
  `slug` = 'umq-digital',
  `title_ar` = 'حلول عُمْق الرقمية',
  `title_en` = 'UMQ Digital Solutions',
  `summary_ar` = 'تطوير تطبيقات ومنصات رقمية للمؤسسات.',
  `summary_en` = 'Digital apps and platforms for enterprises.',
  `client_name` = 'UMQ',
  `technologies` = '["Next.js", "React Native", "Node.js"]',
  `status` = 'PUBLISHED',
  `featured` = 1,
  `updated_at` = NOW(3)
WHERE `slug` IN ('jshdjs', 'digital-transformation-ksa') AND `deleted_at` IS NULL;
