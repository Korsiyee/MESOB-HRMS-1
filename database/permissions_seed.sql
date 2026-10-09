-- =====================================================
-- HRMS Permission Seeds
-- Purpose: Add granular permissions for Network Settings, Accounts, Audit Logs, and Roles
-- Date: 2026-10-08
-- =====================================================

-- This script adds action-level permissions for newly protected pages
-- Run this after initial database setup

-- =====================================================
-- 1. NETWORK SETTINGS PERMISSIONS
-- =====================================================

-- NetworkSettings.View (Super Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
);

-- NetworkSettings.Create (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1)
);

-- NetworkSettings.Update (Super Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1)
);

-- NetworkSettings.Update (HR Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1)
);

-- NetworkSettings.Delete (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'DELETE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ATTENDANCE' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'DELETE' LIMIT 1)
);

-- =====================================================
-- 2. ACCOUNTS PERMISSIONS
-- =====================================================

-- Accounts.View (Super Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
);

-- Accounts.View (HR Admin - Organization scope, read-only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
);

-- Accounts.Create (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1)
);

-- Accounts.Update (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1)
);

-- =====================================================
-- 3. AUDIT LOGS PERMISSIONS
-- =====================================================

-- AuditLogs.View (Super Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
    AND rp.scope_uuid = (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1)
);

-- AuditLogs.View (HR Admin - Department scope only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
    AND rp.scope_uuid = (SELECT uuid FROM Scopes WHERE code = 'DEPARTMENT' LIMIT 1)
);

-- AuditLogs.Export (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'EXPORT' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'EXPORT' LIMIT 1)
);

-- =====================================================
-- 4. ROLES & PERMISSIONS MANAGEMENT
-- =====================================================

-- Roles.View (Super Admin - Organization scope)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
    AND rp.scope_uuid = (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1)
);

-- Roles.View (HR Admin - read-only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'HR_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'VIEW' LIMIT 1)
    AND rp.scope_uuid = (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1)
);

-- Roles.Create (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'CREATE' LIMIT 1)
);

-- Roles.Update (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'UPDATE' LIMIT 1)
);

-- Roles.Delete (Super Admin only)
INSERT IGNORE INTO RolePermissions (uuid, role_uuid, module_uuid, action_uuid, scope_uuid, created_at)
SELECT 
    UUID(),
    (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1),
    (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1),
    (SELECT uuid FROM Actions WHERE code = 'DELETE' LIMIT 1),
    (SELECT uuid FROM Scopes WHERE code = 'ORGANIZATION' LIMIT 1),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM RolePermissions rp
    WHERE rp.role_uuid = (SELECT uuid FROM Roles WHERE code = 'SUPER_ADMIN' LIMIT 1)
    AND rp.module_uuid = (SELECT uuid FROM Modules WHERE code = 'ADMIN' LIMIT 1)
    AND rp.action_uuid = (SELECT uuid FROM Actions WHERE code = 'DELETE' LIMIT 1)
);

-- =====================================================
-- 5. VERIFICATION QUERY
-- =====================================================

-- Check what permissions were added
SELECT 
    r.code as role,
    m.code as module,
    a.code as action,
    s.code as scope
FROM RolePermissions rp
JOIN Roles r ON rp.role_uuid = r.uuid
JOIN Modules m ON rp.module_uuid = m.uuid
JOIN Actions a ON rp.action_uuid = a.uuid
JOIN Scopes s ON rp.scope_uuid = s.uuid
WHERE r.code IN ('SUPER_ADMIN', 'HR_ADMIN')
AND m.code IN ('ADMIN', 'ATTENDANCE')
ORDER BY r.code, m.code, a.code;

-- =====================================================
-- END OF PERMISSION SEEDS
-- =====================================================
