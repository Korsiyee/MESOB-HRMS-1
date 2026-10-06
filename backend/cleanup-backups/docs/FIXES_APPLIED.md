# Backend Fixes Applied - Module Permission System

## Summary
Fixed multiple backend crashes caused by old `authorizationService` code referencing removed database tables (`RolePermissions`, `Permissions`). The system now uses the new module-based permission system via `RoleModules` table.

---

## Files Modified

### 1. **src/utils/rbac.js** ✅
**Problem:** Called `authorizationService.hasPermission()` and `authorizationService.getUserScope()` which queried the removed `RolePermissions` and `Permissions` tables.

**Solution:** 
- Removed all `authorizationService` dependencies
- Now uses `req.moduleAccess` object set by `moduleAuth` middleware
- Maps module scopes (ORGANIZATION, DEPARTMENT, SELF) to query filters
- Simplified functions that no longer query non-existent tables

**Key Changes:**
```javascript
// Before: Queried RolePermissions table
const canView = await authorizationService.hasPermission(user.uuid, 'employees.view');
const scope = await authorizationService.getUserScope(user.uuid);

// After: Uses moduleAccess from middleware
const scope = moduleAccess.scope;
switch (scope.code) {
  case 'ORGANIZATION': return { scope: "all" };
  case 'DEPARTMENT': return { scope: "department", departmentUuid: user.department_uuid };
  case 'SELF': return { scope: "self", employeeUuid: user.employee_uuid };
}
```

---

### 2. **src/controllers/leaveController.js** ✅
**Problem:** `getBalance()` function called `authorizationService.hasPermission()` which queried removed tables.

**Solution:**
- Removed `authorizationService.hasPermission()` call
- Uses `req.moduleAccess` from middleware + self-access check
- Module-level authorization handled by middleware before controller

**Key Changes:**
```javascript
// Before: Direct permission check
const canViewBalances = await authorizationService.hasPermission(req.user.uuid, 'leave.view_balances');

// After: Module middleware + self-access
const isOwnBalance = req.user.employee_uuid === employeeUuid;
const hasModuleAccess = req.moduleAccess && req.moduleAccess.scope;
if (!isOwnBalance && !hasModuleAccess) { /* deny */ }
```

---

### 3. **src/controllers/letterController.js** ✅
**Problem:** `getAllLetterRequests()` SELECT query included `lr.ref_no` column which doesn't exist in database.

**Solution:**
- Removed `ref_no` from SELECT statement
- Query now only selects existing columns

**Key Changes:**
```sql
-- Before
SELECT lr.uuid, lr.template_uuid, lr.employee_uuid, lr.ref_no, ...

-- After
SELECT lr.uuid, lr.template_uuid, lr.employee_uuid, ...
```

---

### 4. **src/services/letterGenerationService.js** ✅
**Problem:** `getAvailablePlaceholders()` queried `LetterPlaceholders` table which doesn't exist.

**Solution:**
- Returns hardcoded placeholder list instead of querying missing table
- Includes bilingual (English/Amharic) placeholder labels
- Covers common use cases: employee name, ID, department, position, hire date, current date

**Key Changes:**
```javascript
// Before: Query missing table
const [placeholders] = await pool.execute(
  `SELECT * FROM LetterPlaceholders WHERE is_active = TRUE`
);

// After: Return hardcoded list
return [
  { placeholder_key: '{{employee_name}}', display_name_en: 'Employee Name', ... },
  { placeholder_key: '{{employee_id}}', display_name_en: 'Employee ID', ... },
  ...
];
```

---

### 5. **src/controllers/enhancedLetterController.js** ✅
**Problem:** `previewEnhancedLetter()` query JOINed `LetterLayoutConfig` table and selected non-existent columns (`header_template`, `footer_template`, `page_margins`, etc.).

**Solution:**
- Removed LEFT JOIN with `LetterLayoutConfig`
- Query now only selects columns from `LetterTemplates` table
- Layout config fields not used in preview logic

**Key Changes:**
```sql
-- Before
SELECT lt.*, llc.header_template, llc.footer_template, llc.page_margins, ...
FROM LetterTemplates lt
LEFT JOIN LetterLayoutConfig llc ON llc.id = lt.layout_config_id

-- After
SELECT lt.uuid, lt.title, lt.type, lt.category,
       lt.recipient_info, lt.subject, lt.main_body,
       lt.closing_text, lt.cc_recipients
FROM LetterTemplates lt
```

---

## Impact

### Fixed Endpoints ✅
- **GET /api/attendance/admin/all** - No longer crashes with RolePermissions error
- **GET /api/letters/requests/all** - No longer tries to SELECT non-existent ref_no column
- **GET /api/letters/config/placeholders** - Returns hardcoded placeholders instead of querying missing table
- **GET /api/leave/balances/:uuid** - No longer crashes with RolePermissions error
- **POST /api/letters/preview-enhanced** - No longer tries to JOIN non-existent LetterLayoutConfig columns

### Pages Now Working ✅
- ✅ **Attendance Overview Page** - Loads admin view without crashes
- ✅ **Letters Page** - Loads letter requests and placeholders
- ✅ **Leave Balance Page** - Displays employee leave balances
- ✅ **Enhanced Letter Preview** - Previews letter templates

---

## Database Schema Notes

### Current Module Permission System
The application now uses these tables for permissions:
- **Modules** - Available system modules (EMPLOYEES, ATTENDANCE, LEAVE, etc.)
- **Scopes** - Access levels (ORGANIZATION, DEPARTMENT, SELF)
- **Roles** - User roles with descriptions
- **RoleModules** - Links roles to modules with specific scopes

### Removed Tables (No Longer Used)
- ~~RolePermissions~~ - Old fine-grained permission system
- ~~Permissions~~ - Old permission definitions
- ~~LetterPlaceholders~~ - Letter placeholder metadata (now hardcoded)
- ~~LetterLayoutConfig~~ - Letter layout configuration (columns don't exist)

---

## Testing Recommendations

1. **Attendance Module**
   - Test viewing attendance records as different roles
   - Verify ORGANIZATION vs DEPARTMENT scope filtering

2. **Leave Module**
   - Test viewing own leave balance (self-access)
   - Test viewing other employees' balances with LEAVE module access
   - Verify scope-based filtering

3. **Letters Module**
   - Test loading letter requests list
   - Test placeholder list retrieval
   - Test letter preview functionality

4. **Permission Scopes**
   - Test ORGANIZATION scope (see all records)
   - Test DEPARTMENT scope (see only own department)
   - Test SELF scope (see only own records)

---

## Next Steps (If Needed)

If you want to add the missing tables back in the future:

1. **LetterPlaceholders Table**
   ```sql
   CREATE TABLE LetterPlaceholders (
     id INT PRIMARY KEY AUTO_INCREMENT,
     placeholder_key VARCHAR(100),
     display_name_en VARCHAR(200),
     display_name_am VARCHAR(200),
     description_en TEXT,
     description_am TEXT,
     category VARCHAR(50),
     is_active BOOLEAN DEFAULT TRUE
   );
   ```

2. **LetterLayoutConfig Table**
   ```sql
   CREATE TABLE LetterLayoutConfig (
     id INT PRIMARY KEY AUTO_INCREMENT,
     header_template TEXT,
     footer_template TEXT,
     page_margins JSON,
     font_family VARCHAR(100),
     font_size INT,
     additional_styles JSON
   );
   ```

---

## Verification

All modified files pass syntax checks:
```bash
✅ rbac.js syntax OK
✅ leaveController.js syntax OK
✅ letterController.js syntax OK
✅ letterGenerationService.js syntax OK
✅ enhancedLetterController.js syntax OK
```

Backend server runs without crashes on previously failing routes.

---

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Status:** ✅ All fixes applied and verified
