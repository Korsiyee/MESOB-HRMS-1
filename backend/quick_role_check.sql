-- Quick SQL queries to check department role issue

-- 1. Check all roles in the system
SELECT 'ALL ROLES:' as info;
SELECT code, name, is_active FROM Roles ORDER BY code;

-- 2. Check users with their assigned roles
SELECT '\nUSERS AND THEIR ROLES:' as info;
SELECT 
    u.username,
    r.code as role_code,
    r.name as role_name,
    e.first_name,
    e.last_name,
    d.name as department_name
FROM Users u
INNER JOIN Roles r ON u.role_uuid = r.uuid
LEFT JOIN Employees e ON u.employee_uuid = e.uuid
LEFT JOIN Departments d ON u.department_uuid = d.uuid
WHERE u.is_active = 1
ORDER BY r.code, u.username;

-- 3. Count users by role
SELECT '\nUSER COUNT BY ROLE:' as info;
SELECT 
    r.code as role_code,
    r.name as role_name,
    COUNT(u.uuid) as user_count
FROM Roles r
LEFT JOIN Users u ON r.uuid = u.role_uuid AND u.is_active = 1
GROUP BY r.uuid, r.code, r.name
ORDER BY r.code;
