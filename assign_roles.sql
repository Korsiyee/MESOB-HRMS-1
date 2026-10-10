-- Assign roles to all users for testing

-- 1. SUPER_ADMIN - admin user
UPDATE Users SET role_uuid = 'r0000001-0000-0000-0000-000000000001' WHERE username = 'admin';

-- 2. SUPER_ADMIN - Abebe Tadesse (find by employee name)
UPDATE Users 
SET role_uuid = 'r0000001-0000-0000-0000-000000000001'
WHERE employee_uuid IN (
  SELECT uuid FROM Employees WHERE first_name = 'Abebe' AND last_name = 'Tadesse'
);

-- 3. HR_ADMIN - Assign first 2 non-admin users
UPDATE Users SET role_uuid = 'r0000002-0000-0000-0000-000000000002'
WHERE username != 'admin' 
AND role_uuid = 'r0000005-0000-0000-0000-000000000005'
ORDER BY username LIMIT 2;

-- 4. HR_OFFICER - Assign next 2 users  
UPDATE Users SET role_uuid = 'r0000003-0000-0000-0000-000000000003'
WHERE username != 'admin' 
AND role_uuid = 'r0000005-0000-0000-0000-000000000005'
ORDER BY username LIMIT 2;

-- 5. MANAGER - Assign next 3 users
UPDATE Users SET role_uuid = 'r0000004-0000-0000-0000-000000000004'
WHERE username != 'admin' 
AND role_uuid = 'r0000005-0000-0000-0000-000000000005'
ORDER BY username LIMIT 3;

-- 6. Rest remain as EMPLOYEE

-- Show final distribution
SELECT 
  r.name as role,
  COUNT(*) as user_count
FROM Users u
LEFT JOIN Roles r ON u.role_uuid = r.uuid
GROUP BY r.name
ORDER BY r.name;

-- Show some sample users per role
SELECT 
  u.username,
  r.name as role,
  CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, '')) as employee_name
FROM Users u
LEFT JOIN Roles r ON u.role_uuid = r.uuid
LEFT JOIN Employees e ON u.employee_uuid = e.uuid
ORDER BY r.name, u.username
LIMIT 15;
