# Employee Profile Enhancement - Testing Guide

## Quick Test Steps

### Prerequisites
1. Backend server running on `http://localhost:5000`
2. Frontend server running on `http://localhost:5173`
3. Logged in as admin (admin / admin123)

---

## Test 1: View in Detail (View Mode)

**Steps:**
1. Navigate to Employee Management page
2. Find any active employee in the list
3. Click the 👁️ **View** icon (eye icon)

**Expected Result:**
- ✅ Employee Profile page opens
- ✅ URL: `http://localhost:5173/employees/{uuid}` (no query parameter)
- ✅ Header shows "Employee Details" (no "EDIT MODE" badge)
- ✅ Green **"EDIT PROFILE"** button visible in header
- ✅ Employee info displayed in sections (Personal, Contact, Employment, etc.)
- ✅ All data loads correctly

---

## Test 2: Edit Properties (Edit Mode - Auto Flow)

**Steps:**
1. Navigate to Employee Management page
2. Find any active employee in the list
3. Click the ✏️ **Edit** icon (pencil icon)

**Expected Result:**
- ✅ Employee Profile page opens
- ✅ URL: `http://localhost:5173/employees/{uuid}?mode=edit`
- ✅ Header shows yellow **"EDIT MODE"** badge
- ✅ **Personal Info edit modal automatically opens** (within 300ms)
- ✅ Modal displays employee's current personal information

**Continue:**
4. Make a change (e.g., change title from "Mr" to "Dr")
5. Click **"Save Changes"**

**Expected Result:**
- ✅ Modal closes
- ✅ Data saves successfully
- ✅ **Employment Info edit modal automatically opens** (within 300ms)
- ✅ Modal displays employee's current employment information

**Continue:**
6. Make a change (e.g., change bank name)
7. Click **"Save Changes"**

**Expected Result:**
- ✅ Modal closes
- ✅ Data saves successfully
- ✅ **Automatically exits edit mode**
- ✅ URL changes to: `http://localhost:5173/employees/{uuid}` (removes `?mode=edit`)
- ✅ "EDIT MODE" badge disappears
- ✅ Returns to view mode showing updated data

---

## Test 3: Manual Edit Mode (Edit Profile Button)

**Steps:**
1. Open any employee profile in **view mode**
2. Click the green **"EDIT PROFILE"** button in header

**Expected Result:**
- ✅ URL changes to include `?mode=edit`
- ✅ Yellow "EDIT MODE" badge appears
- ✅ Personal Info modal auto-opens
- ✅ Same sequential flow as Test 2

---

## Test 4: Cancel During Edit Mode

**Steps:**
1. Navigate to Employee Profile with `?mode=edit`
2. When Personal Info modal opens, click **"Cancel"** or **"Close"**

**Expected Result:**
- ✅ Modal closes
- ✅ Still in edit mode (badge still visible)
- ✅ No data changes saved
- ✅ Can click section edit buttons or use "Back to List"

---

## Test 5: Individual Section Editing (Still Works)

**Steps:**
1. Open Employee Profile in **view mode**
2. Find any section card (Personal, Employment, etc.)
3. Click the small ✏️ (pencil) icon in the section header

**Expected Result:**
- ✅ Edit modal for that specific section opens
- ✅ Does NOT trigger edit mode flow
- ✅ After saving, just closes modal (no auto-open next modal)
- ✅ Existing functionality preserved

---

## Test 6: Navigation and Back Button

**Steps:**
1. From Employee Profile (any mode), click **"BACK TO LIST"**

**Expected Result:**
- ✅ Returns to Employee Management page
- ✅ Employee list still visible
- ✅ All filters/search preserved

---

## Test 7: Direct URL Access

**Test 7a: View Mode URL**
1. Manually enter: `http://localhost:5173/employees/{valid-uuid}`

**Expected Result:**
- ✅ Opens in view mode
- ✅ No edit mode badge
- ✅ "EDIT PROFILE" button visible

**Test 7b: Edit Mode URL**
1. Manually enter: `http://localhost:5173/employees/{valid-uuid}?mode=edit`

**Expected Result:**
- ✅ Opens in edit mode
- ✅ "EDIT MODE" badge visible
- ✅ Personal Info modal auto-opens

---

## Test 8: Permissions (If applicable)

**Steps:**
1. Log in as a user **without** employee edit permissions
2. Navigate to Employee Management
3. Open any employee profile

**Expected Result:**
- ✅ Can view employee details
- ✅ **"EDIT PROFILE" button NOT visible** (or disabled)
- ✅ Edit pencil icons on sections NOT visible
- ✅ Cannot access edit mode
- ✅ Direct URL to `?mode=edit` blocked by backend

---

## Common Issues and Fixes

### Issue: Modal doesn't auto-open in edit mode
**Check:**
- Console for errors
- Employee data loaded (not still loading)
- URL actually has `?mode=edit`

### Issue: After saving, doesn't move to next modal
**Check:**
- Save was successful (check network tab)
- No validation errors
- handlePersonalSaved callback firing

### Issue: "EDIT PROFILE" button always visible
**Expected:** Button should hide when `?mode=edit` in URL
**Check:**
- React Router `useSearchParams` working
- Browser supports URLSearchParams

### Issue: Changes not saving
**Check:**
- Backend server running
- Admin has edit permissions
- Network tab shows PATCH request succeeded
- No validation errors in response

---

## Visual Indicators Checklist

### View Mode
- [ ] No "EDIT MODE" badge in header
- [ ] Green "EDIT PROFILE" button visible
- [ ] White "BACK TO LIST" button visible
- [ ] Section edit pencils visible (if permissions allow)

### Edit Mode
- [ ] Yellow "EDIT MODE" badge in header
- [ ] No "EDIT PROFILE" button (hidden)
- [ ] White "BACK TO LIST" button visible
- [ ] Personal Info modal opens automatically

---

## Success Criteria

✅ All 8 tests pass
✅ No console errors
✅ Data saves correctly
✅ Sequential modal flow works
✅ Edit mode enters and exits properly
✅ View mode displays correctly
✅ Navigation works smoothly
✅ Existing functionality unchanged

---

## Test Data Suggestions

**Employee to use:** Any active employee in the system
- Recommended: Use a test employee, not real production data
- Should have: Valid department, position, level
- Should have: Complete personal information

**Fields to edit for testing:**
- **Personal:** Title (Mr → Dr), Nationality
- **Employment:** Bank Name, TIN Number
- **Low risk:** Fields that don't affect system functionality

---

## Rollback Plan (If Issues Found)

If issues are discovered:

1. **Revert EmployeesPage.jsx:**
```javascript
// Change back to:
onEdit={() => setEditEmployee(emp)}
```

2. **Revert EmployeeDetailPage.jsx:**
- Remove `useSearchParams` import
- Remove edit mode logic
- Remove auto-open effects
- Remove "EDIT PROFILE" button
- Restore original modal callbacks

All changes are isolated to 2 files, making rollback simple and safe.

---

**Last Updated:** January 2025
**Tested By:** [Your Name]
**Status:** Ready for Testing
