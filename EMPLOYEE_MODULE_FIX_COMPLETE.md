# Employee Module Fix - Complete

## Problem Summary
The employee profile and registration modules were crashing due to missing database tables.

## Root Cause
The database was missing critical tables:
1. `EmployeeAddresses` - Stores employee address information
2. `EmployeeIDDocuments` - Stores ID documents
3. `EmployeeFaceImages` - Stores face recognition images
4. `EmployeeRegistrationDrafts` - Stores registration drafts
5. `Notifications` - Stores user notifications

## Fix Applied

### 1. Created Missing Tables
Created SQL script `fix-all-employee-tables.sql` with all required tables:

```sql
✓ EmployeeAddresses
✓ EmployeeIDDocuments  
✓ EmployeeFaceImages
✓ EmployeeRegistrationDrafts
✓ Notifications
```

### 2. Table Structures Created

**EmployeeAddresses:**
- Stores permanent and current addresses
- Includes email, phone numbers, regional location data
- Linked to Employees table via employee_uuid

**EmployeeIDDocuments:**
- Stores passport, national ID, driver's license, etc.
- Includes document metadata and file storage keys
- Supports document expiration dates

**EmployeeFaceImages:**
- Stores up to 7 face images per employee
- Includes face descriptors for biometric recognition
- Used by attendance system

**EmployeeRegistrationDrafts:**
- Enables multi-step registration wizard
- Stores partial employee data as JSON
- Tracks completion progress

**Notifications:**
- User notification system
- Tracks read/unread status
- Supports action URLs

## How the Modules Work

### Employee Profile Page (`/employees`)
1. Loads list of all employees
2. Filters by status, department, search query
3. Displays employee cards with:
   - Name, Mesob ID
   - Department, Position
   - Email from EmployeeAddresses
   - Status badge
4. Actions: View, Edit, Change Status

### Employee Registration Page (`/employee-registration`)
**6-Step Wizard:**

**Step 1 - Personal Information:**
- Required: first_name, middle_name, last_name, mother_name (full name), gender, date_of_birth
- Profile photo upload (required)
- ID documents upload (optional)
- Validates: Future dates, mother's full name (2+ parts)

**Step 2 - Address Information:**
- Permanent Address (required): region, zone, woreda, house_number, phone_primary, email
- Current Address (optional, copies from permanent)
- Validates: Email format, phone format

**Step 3 - Financial & Position:**
- Bank details, TIN, pension code
- Department, position, level, occupation
- Hire date, prior government service
- Validates: Future hire dates, hire date > birth date

**Step 4 - Extra Information:**
- Education history
- Work experience
- Training & certifications
- All optional, for record keeping

**Step 5 - Face Registration:**
- Captures 7 face images for biometric attendance
- Optional (can skip)
- Uses webcam API

**Step 6 - Review & Submit:**
- Reviews all entered information
- Final submission creates employee record
- Uploads photo and documents to MinIO storage

### Auto-Save Feature
- Draft auto-saves every 1 second after changes
- Draft UUID stored in localStorage
- Survives page refreshes
- Draft loaded on mount if exists

## API Endpoints Used

### Employee Profile:
- `GET /api/employees` - List all employees
- `GET /api/employees/:uuid` - Get single employee
- `PATCH /api/employees/:uuid/status` - Change status
- `GET /api/departments` - Load departments for filter

### Employee Registration:
- `POST /api/employees/draft` - Save draft
- `GET /api/employees/draft/:uuid` - Load draft
- `POST /api/employees` - Create employee
- `POST /api/employees/:uuid/photo` - Upload photo
- `POST /api/employees/:uuid/documents` - Upload documents
- `POST /api/face-recognition/register` - Register face images

## Database Queries

### getEmployeeByUuid (used by profile view):
```sql
SELECT e.*, d.name AS department_name, p.title AS position_title
FROM Employees e
LEFT JOIN Departments d ON d.uuid = e.department_uuid
LEFT JOIN Positions p ON p.uuid = e.position_uuid  
LEFT JOIN EmployeeAddresses a ON a.employee_uuid = e.uuid
WHERE e.uuid = ?
```

### createEmployee (used by registration):
```sql
INSERT INTO Employees (...)
INSERT INTO EmployeeAddresses (...) -- for each address
DELETE FROM EmployeeRegistrationDrafts WHERE uuid = ? -- cleanup draft
```

## Testing Checklist

### Employee Profile Page:
- [ ] Page loads without crashing
- [ ] Employee list displays correctly
- [ ] Search/filter works
- [ ] Can view employee details
- [ ] Can edit employee
- [ ] Can change employee status
- [ ] Email displays from EmployeeAddresses table

### Employee Registration Page:
- [ ] Page loads without crashing
- [ ] Step 1: Can enter personal info and upload photo
- [ ] Step 2: Can enter addresses (validates required fields)
- [ ] Step 3: Can select department/position and enter hire date
- [ ] Step 4: Can add education/experience (optional)
- [ ] Step 5: Face registration works or can skip
- [ ] Step 6: Review shows all data correctly
- [ ] Final submit creates employee successfully
- [ ] Draft auto-save works (refresh page and data persists)
- [ ] Created employee appears in employee list

## Common Issues & Solutions

### Issue: "EmployeeAddresses doesn't exist"
**Solution:** Tables created by `fix-all-employee-tables.sql` ✓

### Issue: Registration fails at submission
**Possible causes:**
1. MinIO not running (photo/document upload fails)
2. Missing foreign key data (invalid department_uuid, position_uuid)
3. Duplicate TIN number
4. Future dates in date fields

### Issue: Profile page shows no employees
**Check:**
1. Are there employees in the database?
   ```sql
   SELECT COUNT(*) FROM Employees;
   ```
2. Check browser console for API errors
3. Check backend logs for query errors

### Issue: Draft not saving
**Check:**
1. EmployeeRegistrationDrafts table exists
2. Browser localStorage enabled
3. Backend API `/api/employees/draft` endpoint working

## Files Modified

### Created:
- `/fix-missing-tables.sql` - Initial fix for 2 tables
- `/fix-all-employee-tables.sql` - Complete fix for all 5 tables
- `/backend/diagnose-employee-module.js` - Diagnostic tool

### Existing (No changes needed):
- Frontend: `EmployeeProfilePage.jsx`, `EmployeeRegistrationPage.jsx`
- Backend: `employeeController.js`, `employeeService.js`
- Routes: `employeeRoutes.js`

## Verification

To verify everything is working:

```bash
# 1. Check tables exist
cd "/home/wty/Downloads/FDRE-Mesob-HRMS-main/Mesob HRMS/backend"
node diagnose-employee-module.js

# 2. Restart backend
# Stop current backend (Ctrl+C)
npm start

# 3. Test in browser
# - Navigate to Employee Profile page
# - Navigate to Employee Registration page
# - Try creating a test employee
```

## Next Steps

1. ✓ Database tables created
2. Test employee profile page
3. Test employee registration (all 6 steps)
4. If issues persist, check:
   - Browser console for frontend errors
   - Network tab for API responses
   - Backend terminal for error logs
5. Verify MinIO is running for file uploads
6. Verify all lookup tables have data (Departments, Positions, Levels, Occupations)

## Success Indicators

✓ No "Table doesn't exist" errors in backend logs
✓ Employee Profile page loads and displays employees
✓ Employee Registration page loads all 6 steps
✓ Can complete full registration wizard
✓ Draft auto-save works (survives refresh)
✓ Created employees appear in profile list
✓ Can view employee details with addresses

---

**Status: TABLES CREATED ✓**
**Next: TEST MODULES IN BROWSER**
