# Database Schema Verification Report

```
✓ Connected to database: mesob_hrms

================================================================================
DATABASE SCHEMA VERIFICATION
================================================================================

Total tables found: 42

REQUIRED PERMISSION-BASED RBAC TABLES:
--------------------------------------------------------------------------------
  ✗ MISSING       Resources

  ✗ MISSING       Permissions

  ✗ MISSING       Role_Permissions

  ✗ MISSING       DataScopes

  ✗ MISSING       Role_Permission_Scopes

  ✓ EXISTS        Roles
                    Columns: uuid, code, name, description, hierarchy_level, is_system_role, is_active, created_at, updated_at
                    Rows: 5


OBSOLETE TABLES (should be documented but not dropped):
--------------------------------------------------------------------------------
  ⚠ FOUND         Modules
                    Rows: 18
                    Columns: uuid, code, name, description, category, icon, display_order, is_active, created_at, updated_at

  ⚠ FOUND         RoleModules
                    Rows: 62
                    Columns: uuid, role_uuid, module_uuid, created_at

  ✓ NOT FOUND     Occupations

  ✓ NOT FOUND     RoleOccupations


ALL TABLES IN DATABASE:
--------------------------------------------------------------------------------
    1. AttendanceLogs
    2. AttendanceSummary
    3. AuditLogs
    4. DepartmentLeadership
    5. Departments
    6. EmployeeAddresses
    7. EmployeeFaceImages
    8. EmployeeIDDocuments
    9. EmployeeLevelHistory
   10. EmployeeRegistrationDrafts
   11. EmployeeShifts
   12. Employees
   13. Holidays
   14. IssuedLetters
   15. LetterApprovers
   16. LetterLayoutConfig
   17. LetterReferenceSequence
   18. LetterRequests
   19. LetterSigners
   20. LetterTemplateVersions
   21. LetterTemplates
   22. LevelVersions
   23. Levels
   24. MesobIdSequence
   25. Modules
   26. NetworkSettings
   27. Notifications
   28. OrganizationConfig
   29. Positions
   30. RoleModules
   31. Roles
   32. ShiftDefinitions
   33. Users
   34. _backup_roles_before_static_rbac
   35. _backup_user_roles_before_static_rbac
   36. budgetYears
   37. employeeLeaveBalances
   38. leavePolicies
   39. leavePostponements
   40. leaveRequestDocuments
   41. leaveRequests
   42. leaveTypes

================================================================================
VERIFICATION SUMMARY
================================================================================

✗ Missing required tables: Resources, Permissions, Role_Permissions, DataScopes, Role_Permission_Scopes
⚠ Found 2 obsolete table(s): Modules, RoleModules
  These should be documented but NOT dropped (may contain legacy data)

```
