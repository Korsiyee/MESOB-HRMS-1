-- ============================================================================
-- FIX: SUPER_ADMIN MODULE ACCESS BUG
-- ============================================================================
-- This script fixes the bug where SUPER_ADMIN (and other roles) can only 
-- access 2 modules (LETTERS and SHIFTS) instead of all 18 modules.
--
-- ROOT CAUSE: The Modules table is missing 16 module records
--
-- SOLUTION: Insert the missing 16 module records with correct codes that
--           match the static configuration in roleModuleMapping.js
--
-- SAFETY: This script uses INSERT IGNORE to be idempotent and safe to run
--         multiple times. Existing LETTERS and SHIFTS records are preserved.
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY CURRENT STATE (BEFORE FIX)
-- ============================================================================

SELECT '=== CURRENT STATE VERIFICATION ===' as status;

SELECT 'Current module count:' as info, COUNT(*) as count FROM Modules WHERE is_active = TRUE;

SELECT 'Current modules in database:' as info;
SELECT code, name, category, display_order FROM Modules WHERE is_active = TRUE ORDER BY display_order;

-- ============================================================================
-- STEP 2: INSERT MISSING MODULES
-- ============================================================================

SELECT '=== INSERTING MISSING MODULES ===' as status;

-- Use INSERT IGNORE to safely add modules without duplicating existing ones
-- This makes the script idempotent (safe to run multiple times)

-- HR MANAGEMENT MODULES (Category: HR_MANAGEMENT)

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'EMPLOYEE_LIST', 'Employee List', 'View and manage list of all employees in the organization', 'HR_MANAGEMENT', 'users', 1, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'EMPLOYEE_PROFILE', 'Employee Profile', 'View and edit detailed employee profiles and information', 'HR_MANAGEMENT', 'user', 2, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'REGISTER_EMPLOYEE', 'Register Employee', 'Register new employees in the system with complete details', 'HR_MANAGEMENT', 'user-plus', 3, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'DEPARTMENTS', 'Departments', 'Manage organizational departments and department structure', 'HR_MANAGEMENT', 'building', 4, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'POSITIONS', 'Positions', 'Manage employee positions, job titles, and role definitions', 'HR_MANAGEMENT', 'briefcase', 5, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'LEVELS', 'Levels', 'Manage employee levels, salary grades, and career progression', 'HR_MANAGEMENT', 'layers', 6, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'ATTENDANCE_RECORDS', 'Attendance Records', 'View and manage attendance records for all employees', 'HR_MANAGEMENT', 'calendar-check', 7, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'NETWORK_SETTINGS', 'Network Settings', 'Configure network settings, IP restrictions, and system access control', 'HR_MANAGEMENT', 'settings', 8, 1);

-- Note: SHIFTS (display_order 9) already exists - will be skipped by INSERT IGNORE
INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'SHIFTS', 'Shifts', 'Manage work shifts, schedules, and shift assignments', 'HR_MANAGEMENT', 'clock', 9, 1);

-- Note: LETTERS (display_order 10) already exists - will be skipped by INSERT IGNORE
INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'LETTERS', 'Letters', 'Manage employee letters, documents, and official correspondence', 'HR_MANAGEMENT', 'file-text', 10, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'LEAVE_REQUESTS', 'Leave Requests', 'Review, approve, and manage employee leave requests', 'HR_MANAGEMENT', 'calendar-x', 11, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'LEAVE_SETTINGS', 'Leave Settings', 'Configure leave policies, types, quotas, and approval workflows', 'HR_MANAGEMENT', 'settings', 12, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'ACCOUNTS', 'Accounts', 'Manage user accounts, credentials, and system access', 'HR_MANAGEMENT', 'key', 13, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'AUDIT_LOGS', 'Audit Logs', 'View system audit logs, activity history, and security events', 'HR_MANAGEMENT', 'file-search', 14, 1);

-- PERSONAL MODULES (Category: PERSONAL)

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'MY_ATTENDANCE', 'My Attendance', 'View personal attendance records and work history', 'PERSONAL', 'calendar-check', 15, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'MY_LETTERS', 'My Letters', 'Request and view personal letters and documents', 'PERSONAL', 'file-text', 16, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'MY_LEAVES', 'My Leaves', 'Submit and track personal leave requests and leave balance', 'PERSONAL', 'calendar-x', 17, 1);

INSERT IGNORE INTO Modules (uuid, code, name, description, category, icon, display_order, is_active) VALUES
(UUID(), 'MY_ACCOUNTS', 'My Accounts', 'Manage personal account settings and preferences', 'PERSONAL', 'user-cog', 18, 1);

-- ============================================================================
-- STEP 3: VERIFY FIX (AFTER INSERTION)
-- ============================================================================

SELECT '=== VERIFICATION AFTER FIX ===' as status;

SELECT 'Total active modules (should be 18):' as info, COUNT(*) as count 
FROM Modules 
WHERE is_active = TRUE;

SELECT 'All modules in database (should show 18):' as info;
SELECT code, name, category, display_order, is_active 
FROM Modules 
ORDER BY display_order;

-- Verify by category
SELECT 'Modules by category:' as info;
SELECT category, COUNT(*) as count 
FROM Modules 
WHERE is_active = TRUE 
GROUP BY category;

-- Verify SUPER_ADMIN has access to all 18 modules
SELECT 'SUPER_ADMIN module access (should be 18):' as info;
SELECT COUNT(*) as super_admin_module_count
FROM Modules m
WHERE m.code IN (
    'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
    'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
    'NETWORK_SETTINGS', 'SHIFTS', 'LETTERS', 'LEAVE_REQUESTS',
    'LEAVE_SETTINGS', 'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE',
    'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS'
)
AND m.is_active = TRUE;

-- Verify EMPLOYEE has access to 4 personal modules
SELECT 'EMPLOYEE module access (should be 4):' as info;
SELECT COUNT(*) as employee_module_count
FROM Modules m
WHERE m.code IN ('MY_ATTENDANCE', 'MY_LETTERS', 'MY_LEAVES', 'MY_ACCOUNTS')
AND m.is_active = TRUE;

-- Verify HR_OFFICER has access to 13 modules
SELECT 'HR_OFFICER module access (should be 13):' as info;
SELECT COUNT(*) as hr_officer_module_count
FROM Modules m
WHERE m.code IN (
    'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'DEPARTMENTS', 'POSITIONS',
    'LEVELS', 'ATTENDANCE_RECORDS', 'SHIFTS', 'LETTERS', 
    'LEAVE_REQUESTS', 'MY_ATTENDANCE', 'MY_LETTERS', 'MY_LEAVES', 
    'MY_ACCOUNTS'
)
AND m.is_active = TRUE;

-- Verify display_order sequence (should be 1-18 with no gaps)
SELECT 'Display order sequence check:' as info;
SELECT display_order, code, name 
FROM Modules 
WHERE is_active = TRUE
ORDER BY display_order;

-- Check for any duplicate codes (should return 0 rows)
SELECT 'Duplicate code check (should be empty):' as info;
SELECT code, COUNT(*) as count 
FROM Modules 
GROUP BY code 
HAVING COUNT(*) > 1;

-- ============================================================================
-- STEP 4: OPTIONAL - SYNC RoleModules TABLE
-- ============================================================================
-- Note: This step is OPTIONAL because the static configuration in 
-- roleModuleMapping.js is authoritative. The RoleModules table is 
-- informational only and not used by moduleAuthService.js for access control.
--
-- However, updating RoleModules ensures database consistency and may be
-- useful for future features or reporting.
-- ============================================================================

SELECT '=== OPTIONAL: ROLEMODULES TABLE SYNC ===' as status;
SELECT 'Skipping RoleModules sync - static configuration is authoritative' as info;
SELECT 'If needed, run static_rbac_migration.sql to rebuild RoleModules mappings' as info;

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

SELECT '=== FIX COMPLETED SUCCESSFULLY ===' as status;
SELECT 'All 18 modules are now present in the database' as info;
SELECT 'SUPER_ADMIN and other roles should now see their complete module lists' as info;
SELECT 'Please test by logging in as SUPER_ADMIN and verifying navigation menu' as info;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (IF NEEDED)
-- ============================================================================
-- If you need to rollback this fix (not recommended):
-- 
-- DELETE FROM Modules WHERE code IN (
--   'EMPLOYEE_LIST', 'EMPLOYEE_PROFILE', 'REGISTER_EMPLOYEE',
--   'DEPARTMENTS', 'POSITIONS', 'LEVELS', 'ATTENDANCE_RECORDS',
--   'NETWORK_SETTINGS', 'LEAVE_REQUESTS', 'LEAVE_SETTINGS',
--   'ACCOUNTS', 'AUDIT_LOGS', 'MY_ATTENDANCE', 'MY_LETTERS',
--   'MY_LEAVES', 'MY_ACCOUNTS'
-- );
--
-- This will keep only LETTERS and SHIFTS (restoring the buggy state)
-- ============================================================================
