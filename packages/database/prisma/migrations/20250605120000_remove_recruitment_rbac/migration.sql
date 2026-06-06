-- Drop recruitment tables (corporate CMS only — no hiring module)
DROP TABLE IF EXISTS `applications`;
DROP TABLE IF EXISTS `jobs`;
DROP TABLE IF EXISTS `job_categories`;

-- Remove deprecated roles and their assignments
DELETE FROM `role_permissions`
WHERE `role_id` IN (
  SELECT `id` FROM `roles`
  WHERE `slug` IN ('hr', 'viewer', 'manager', 'employee', 'customer', 'project_manager', 'content_manager')
);

DELETE FROM `users`
WHERE `email` IN (
  'hr@umq.sa',
  'viewer@umq.sa',
  'manager@umq.sa',
  'employee@umq.sa',
  'customer@umq.sa'
);

DELETE FROM `roles`
WHERE `slug` IN ('hr', 'viewer', 'manager', 'employee', 'customer', 'project_manager', 'content_manager');

-- Remove obsolete permissions
DELETE FROM `role_permissions`
WHERE `permission_id` IN (
  SELECT `id` FROM `permissions`
  WHERE `slug` IN (
    'jobs:read',
    'jobs:manage',
    'applications:read',
    'applications:manage',
    'portal:access'
  )
);

DELETE FROM `permissions`
WHERE `slug` IN (
  'jobs:read',
  'jobs:manage',
  'applications:read',
  'applications:manage',
  'portal:access'
);
