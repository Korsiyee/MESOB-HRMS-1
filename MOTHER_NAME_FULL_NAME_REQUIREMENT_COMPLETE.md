# Mother's Name Full Name Requirement - Complete ✅

## Summary

Successfully implemented validation to **require at least 2 name parts** in the Mother's Name field across the entire system - both frontend and backend.

---

## What Changed

### ❌ OLD Behavior:
- Mother's Name: "Eleni" → ✅ Accepted
- Mother's Name: "Aster" → ✅ Accepted
- Single-word names were allowed

### ✅ NEW Behavior:
- Mother's Name: "Eleni" → ❌ **REJECTED** with error message
- Mother's Name: "Eleni Gebremariam" → ✅ Accepted
- Mother's Name: "Eleni Gebremariam Tesfaye" → ✅ Accepted
- Must contain at least 2 name parts (words)

---

## Changes Made

### 1. Backend Validation (Core Logic)

#### File: `backend/src/utils/validation.js`

**Added new validation function:**
```javascript
function isValidFullName(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Split by one or more spaces and filter out empty strings
  const parts = trimmed.split(/\s+/).filter(part => part.length > 0);
  // Must have at least 2 name parts
  return parts.length >= 2;
}
```

**Export added:**
```javascript
module.exports = {
  isNonEmptyString,
  isValidFullName,  // ← NEW
  isValidUuid,
  isValidIsoDate,
};
```

**How it works:**
1. Trims leading/trailing whitespace
2. Splits by one or more spaces (`/\s+/`)
3. Filters out empty strings
4. Counts name parts
5. Returns `true` only if 2 or more parts exist

**Test cases:**
```javascript
isValidFullName("Eleni")                       // false (1 part)
isValidFullName("Eleni Gebremariam")           // true  (2 parts)
isValidFullName("Eleni Gebremariam Tesfaye")   // true  (3 parts)
isValidFullName("  Eleni   Gebremariam  ")     // true  (2 parts, extra spaces handled)
isValidFullName("")                            // false (empty)
isValidFullName("   ")                         // false (whitespace only)
```

#### File: `backend/src/validation/schemas.js`

**Import updated:**
```javascript
const {
  isNonEmptyString,
  isValidFullName,  // ← NEW
  isValidIsoDate,
  isValidUuid,
} = require("../utils/validation");
```

**validateEmployeeCreate updated:**
```javascript
// Validate mother_name requires at least 2 name parts
if (payload?.mother_name && !isValidFullName(payload.mother_name)) {
  invalid.push({
    field: "mother_name",
    message: "Mother's name must contain at least first and last name (minimum 2 name parts).",
  });
}
```

**validateEmployeeUpdate updated:**
```javascript
// Validate mother_name requires at least 2 name parts when present
if (payload?.mother_name !== undefined) {
  if (!isValidFullName(payload.mother_name)) {
    invalid.push({
      field: "mother_name",
      message: "Mother's name must contain at least first and last name (minimum 2 name parts).",
    });
  }
}
```

**Backend response when validation fails:**
```json
{
  "success": false,
  "message": "Validation failed",
  "invalid": [
    {
      "field": "mother_name",
      "message": "Mother's name must contain at least first and last name (minimum 2 name parts)."
    }
  ]
}
```

---

### 2. Frontend Validation

#### File: `frontend/src/pages/EmployeeRegistrationPage.jsx`

**Validation added in `goNext()` function (Step 0):**
```javascript
// Validate mother_name contains at least 2 name parts
const motherNameParts = personal.mother_name.trim().split(/\s+/).filter(part => part.length > 0);
if (motherNameParts.length < 2) {
  setError("Please enter the mother's full name (at least first and last name).");
  return;
}
```

**When triggered:**
- User fills Register Employee form (Step 0: Personal Information)
- Clicks "Next" button
- If mother_name has only 1 word → Error displayed, form does NOT advance

**Error message shown:**
```
"Please enter the mother's full name (at least first and last name)."
```

#### File: `frontend/src/pages/EmployeeDetailPage.jsx`

**Validation added in `EditPersonalModal` save function:**
```javascript
const save = async () => {
  // Validate mother_name contains at least 2 name parts
  const motherNameParts = form.mother_name.trim().split(/\s+/).filter(part => part.length > 0);
  if (motherNameParts.length < 2) {
    setError("Please enter the mother's full name (at least first and last name).");
    return;
  }
  
  // ... continue with save
};
```

**When triggered:**
- User opens Employee Detail page in Edit Mode
- Clicks pencil icon on Personal Information section
- Edits Mother's Name
- Clicks "Save Changes"
- If mother_name has only 1 word → Error displayed in modal

#### File: `frontend/src/pages/EmployeesPage.jsx`

**Validation added in `EmployeeFormModal` handleSubmit function:**
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate mother_name contains at least 2 name parts
  const motherNameParts = form.mother_name.trim().split(/\s+/).filter(part => part.length > 0);
  if (motherNameParts.length < 2) {
    setError("Please enter the mother's full name (at least first and last name).");
    return;
  }
  
  // ... continue with submit
};
```

**When triggered:**
- User opens Add Employee or Edit Employee modal from Employees page
- Fills/edits Mother Name field
- Clicks "CREATE EMPLOYEE" or "SAVE CHANGES"
- If mother_name has only 1 word → Error displayed in modal

---

## Validation Rules

### ✅ Valid Examples:

| Input | Name Parts | Result |
|-------|------------|--------|
| "Eleni Gebremariam" | 2 | ✅ Valid |
| "Eleni Gebremariam Tesfaye" | 3 | ✅ Valid |
| "Aster Alemu" | 2 | ✅ Valid |
| "Aster Alemu Bekele" | 3 | ✅ Valid |
| "Mekdes Tadesse Wolde Mariam" | 4 | ✅ Valid |
| "  Eleni   Gebremariam  " | 2 | ✅ Valid (extra spaces trimmed) |

### ❌ Invalid Examples:

| Input | Name Parts | Result | Error Message |
|-------|------------|--------|---------------|
| "Eleni" | 1 | ❌ Invalid | "Please enter the mother's full name (at least first and last name)." |
| "Aster" | 1 | ❌ Invalid | "Please enter the mother's full name (at least first and last name)." |
| "Mekdes" | 1 | ❌ Invalid | "Please enter the mother's full name (at least first and last name)." |
| "" | 0 | ❌ Invalid | "mother_name is required" (caught earlier) |
| "   " | 0 | ❌ Invalid | "mother_name is required" (caught earlier) |

---

## Complete Data Flow

### Scenario 1: Register Employee with Single Name (REJECTED)

```
1. Register Employee Form
   ↓
   User enters: "Eleni"
   ↓
2. Click "Next" button
   ↓
3. Frontend Validation (EmployeeRegistrationPage)
   ↓
   Split: ["Eleni"]
   Count: 1 name part
   Result: ❌ FAIL
   ↓
4. Error Message Displayed:
   "Please enter the mother's full name (at least first and last name)."
   ↓
5. Form does NOT advance
   User CANNOT proceed to next step
```

### Scenario 2: Register Employee with Full Name (ACCEPTED)

```
1. Register Employee Form
   ↓
   User enters: "Eleni Gebremariam Tesfaye"
   ↓
2. Click "Next" button
   ↓
3. Frontend Validation (EmployeeRegistrationPage)
   ↓
   Split: ["Eleni", "Gebremariam", "Tesfaye"]
   Count: 3 name parts
   Result: ✅ PASS
   ↓
4. Continue to Step 1 (Address Information)
   ↓
5. ... complete all steps ...
   ↓
6. Submit to Backend
   ↓
7. Backend Validation (schemas.js)
   ↓
   isValidFullName("Eleni Gebremariam Tesfaye")
   Result: ✅ PASS
   ↓
8. Database Insert
   ↓
   INSERT INTO Employees (..., mother_name)
   VALUES (..., 'Eleni Gebremariam Tesfaye')
   ↓
9. Success Response
```

### Scenario 3: Someone Bypasses Frontend (BACKEND REJECTS)

```
1. Direct API Call (bypassing frontend)
   ↓
   POST /api/employees
   Body: { ..., mother_name: "Eleni" }
   ↓
2. Backend Validation (schemas.js)
   ↓
   validateEmployeeCreate(payload)
   isValidFullName("Eleni")
   Result: ❌ FAIL
   ↓
3. Backend Response:
   {
     "success": false,
     "message": "Validation failed",
     "invalid": [
       {
         "field": "mother_name",
         "message": "Mother's name must contain at least first and last name (minimum 2 name parts)."
       }
     ]
   }
   ↓
4. Employee NOT Created
   ↓
5. 400 Bad Request status
```

### Scenario 4: Edit Employee with Single Name (REJECTED)

```
1. Employee Profile → Employee → [Edit]
   ↓
2. Open Personal Information Edit Modal
   ↓
3. Change Mother's Name to: "Aster"
   ↓
4. Click "Save Changes"
   ↓
5. Frontend Validation (EditPersonalModal)
   ↓
   Split: ["Aster"]
   Count: 1 name part
   Result: ❌ FAIL
   ↓
6. Error Message Displayed in Modal:
   "Please enter the mother's full name (at least first and last name)."
   ↓
7. Modal stays open
   Changes NOT saved
```

---

## Where Validation is Applied

### ✅ Frontend Locations:

1. **Register Employee Page**
   - File: `EmployeeRegistrationPage.jsx`
   - Function: `goNext()` (Step 0 validation)
   - Trigger: Click "Next" button

2. **Employee Detail Page (Edit Modal)**
   - File: `EmployeeDetailPage.jsx`
   - Component: `EditPersonalModal`
   - Function: `save()`
   - Trigger: Click "Save Changes" button

3. **Employees Page (Add/Edit Modal)**
   - File: `EmployeesPage.jsx`
   - Component: `EmployeeFormModal`
   - Function: `handleSubmit()`
   - Trigger: Click "CREATE EMPLOYEE" or "SAVE CHANGES" button

### ✅ Backend Locations:

1. **Employee Create Validation**
   - File: `schemas.js`
   - Function: `validateEmployeeCreate()`
   - Endpoint: `POST /api/employees`

2. **Employee Update Validation**
   - File: `schemas.js`
   - Function: `validateEmployeeUpdate()`
   - Endpoint: `PUT /api/employees/:uuid`

---

## Testing Checklist

### ✅ Test Register Employee

#### Test Case 1: Single Name (Should FAIL)
- [ ] Navigate to: Employees → Register Employee
- [ ] Fill in all fields
- [ ] Mother's Name: "Eleni"
- [ ] Click: Next
- [ ] **Expected:** Error message displayed
- [ ] **Expected:** Form does NOT advance

#### Test Case 2: Two Names (Should PASS)
- [ ] Navigate to: Employees → Register Employee
- [ ] Fill in all fields
- [ ] Mother's Name: "Eleni Gebremariam"
- [ ] Click: Next
- [ ] **Expected:** Form advances to Step 1

#### Test Case 3: Three Names (Should PASS)
- [ ] Navigate to: Employees → Register Employee
- [ ] Fill in all fields
- [ ] Mother's Name: "Eleni Gebremariam Tesfaye"
- [ ] Click: Next
- [ ] **Expected:** Form advances to Step 1

#### Test Case 4: Extra Spaces (Should PASS)
- [ ] Navigate to: Employees → Register Employee
- [ ] Fill in all fields
- [ ] Mother's Name: "  Eleni   Gebremariam  "
- [ ] Click: Next
- [ ] **Expected:** Form advances (spaces trimmed correctly)

### ✅ Test Edit Employee (Employee Detail Page)

#### Test Case 5: Edit to Single Name (Should FAIL)
- [ ] Navigate to: Employee Profile → [Edit]
- [ ] Click: Pencil icon on Personal section
- [ ] Change Mother's Name to: "Aster"
- [ ] Click: Save Changes
- [ ] **Expected:** Error message in modal
- [ ] **Expected:** Changes NOT saved

#### Test Case 6: Edit to Full Name (Should PASS)
- [ ] Navigate to: Employee Profile → [Edit]
- [ ] Click: Pencil icon on Personal section
- [ ] Change Mother's Name to: "Aster Alemu Bekele"
- [ ] Click: Save Changes
- [ ] **Expected:** Changes saved successfully
- [ ] **Expected:** Modal closes

### ✅ Test Edit Employee (Employees Page Modal)

#### Test Case 7: Edit via Employees Page (Should FAIL)
- [ ] Navigate to: Employees → Employee List
- [ ] Click: Edit button for an employee
- [ ] Change Mother's Name to: "Mekdes"
- [ ] Click: Save Changes
- [ ] **Expected:** Error message in modal
- [ ] **Expected:** Changes NOT saved

#### Test Case 8: Add New Employee (Should FAIL)
- [ ] Navigate to: Employees → Employee List
- [ ] Click: Add Employee (if exists)
- [ ] Fill in all required fields
- [ ] Mother's Name: "Tigist"
- [ ] Click: Create Employee
- [ ] **Expected:** Error message in modal
- [ ] **Expected:** Employee NOT created

### ✅ Test Backend Validation

#### Test Case 9: Direct API Call with Single Name (Should FAIL)
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "first_name": "Abel",
    "middle_name": "Kebede",
    "last_name": "Tesfaye",
    "mother_name": "Eleni",
    "gender": "MALE",
    "date_of_birth": "1990-03-20",
    "hire_date": "2024-01-15"
  }'
```
- [ ] **Expected:** 400 Bad Request
- [ ] **Expected:** Error message about mother_name validation

#### Test Case 10: Direct API Call with Full Name (Should PASS)
```bash
curl -X POST http://localhost:5000/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "first_name": "Abel",
    "middle_name": "Kebede",
    "last_name": "Tesfaye",
    "mother_name": "Eleni Gebremariam Tesfaye",
    "gender": "MALE",
    "date_of_birth": "1990-03-20",
    "hire_date": "2024-01-15"
  }'
```
- [ ] **Expected:** 201 Created
- [ ] **Expected:** Employee created successfully

### ✅ Test Database

#### Test Case 11: Verify Storage
```sql
SELECT 
  first_name,
  middle_name,
  last_name,
  mother_name,
  LENGTH(mother_name) as name_length,
  CHAR_LENGTH(mother_name) as char_count
FROM Employees 
WHERE first_name = 'Abel';
```
- [ ] **Expected:** Full mother_name stored correctly
- [ ] **Expected:** No truncation

---

## Error Messages

### Frontend Error Message:
```
"Please enter the mother's full name (at least first and last name)."
```

**Displayed in:**
- Register Employee page (below step indicator)
- Employee Detail Edit Modal (at top of modal)
- Employees Page Add/Edit Modal (at top of modal)

### Backend Error Message:
```json
{
  "field": "mother_name",
  "message": "Mother's name must contain at least first and last name (minimum 2 name parts)."
}
```

**Returned in API response when validation fails**

---

## Important Notes

### ✅ What Still Works:

1. **Existing employees with single-word mother names**
   - NOT automatically invalidated
   - Can still VIEW their profiles
   - But CANNOT save without updating to full name

2. **Full names with 2+ parts**
   - Work everywhere
   - No restrictions

3. **Special characters**
   - Hyphens: "Eleni-Mariam Gebremariam" ✓
   - Apostrophes: "O'Connor Eleni" ✓
   - Accented characters: "Éléni Gëbrëmariam" ✓

4. **Database**
   - VARCHAR(100) unchanged
   - Still stores up to 100 characters
   - No schema migration needed

### ⚠️ Backward Compatibility:

**Existing employees with single-word mother names:**
- Can be VIEWED without issues
- Cannot be EDITED without updating mother_name to full name
- Example: If employee has mother_name="Eleni", trying to save ANY edit will require updating mother_name first

**Migration Path for Existing Data:**
If you have existing employees with single-word mother names, you can:

1. **Option A:** Leave them as-is (view-only restriction)
2. **Option B:** Run data cleanup script to add placeholder last names
3. **Option C:** Manually update each record to full names

---

## Summary

### ✅ Requirements Met:

- ✅ Mother's Name requires at least 2 name parts
- ✅ Single-word names (e.g., "Eleni") are **REJECTED**
- ✅ Full names (e.g., "Eleni Gebremariam") are **ACCEPTED**
- ✅ Clear error message shown to users
- ✅ Validation enforced in frontend (3 locations)
- ✅ Validation enforced in backend (create + update)
- ✅ Cannot bypass validation via API
- ✅ Applied to Register Employee
- ✅ Applied to Edit Employee (all locations)
- ✅ Database can store full names (VARCHAR 100)

### 📊 Files Modified:

1. `backend/src/utils/validation.js` - Added `isValidFullName()` function
2. `backend/src/validation/schemas.js` - Added validation to create/update functions
3. `frontend/src/pages/EmployeeRegistrationPage.jsx` - Added validation in Step 0
4. `frontend/src/pages/EmployeeDetailPage.jsx` - Added validation in EditPersonalModal
5. `frontend/src/pages/EmployeesPage.jsx` - Added validation in EmployeeFormModal

### 🔒 Security:

- ✅ Frontend validation (user experience)
- ✅ Backend validation (security)
- ✅ Cannot bypass via API calls
- ✅ Consistent validation across all entry points

---

**Status:** ✅ Complete  
**Date:** 2026-10-07  
**Validation:** Mother's Name now requires minimum 2 name parts
