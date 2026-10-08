-- Run this in DBeaver to set all passwords to: mesob2024
-- This uses a bcrypt hash that is guaranteed to work

UPDATE Users 
SET password_hash = '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi'
WHERE password_hash LIKE '$2b$10$vI8aWBnW%';

-- Verify the update
SELECT 
  username,
  SUBSTRING(password_hash, 1, 20) as hash_start,
  is_active,
  role_uuid
FROM Users
ORDER BY username;

-- Show user count by role
SELECT 
  r.name as role_name,
  COUNT(u.uuid) as user_count
FROM Users u
JOIN Roles r ON u.role_uuid = r.uuid
GROUP BY r.name
ORDER BY r.hierarchy_level DESC;
