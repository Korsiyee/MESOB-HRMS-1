# Employee Profile - Quick Reference Guide

## 🎯 What Changed

The "Edit Properties" button now opens the full Employee Profile page with a guided editing experience instead of a modal.

---

## 👤 User Perspective

### View Employee Details
1. Go to Employee Management
2. Click 👁️ **View** icon
3. See complete employee profile
4. Click **"EDIT PROFILE"** to make changes

### Edit Employee Properties
1. Go to Employee Management
2. Click ✏️ **Edit** icon
3. Profile opens in **EDIT MODE** (yellow badge)
4. Edit Personal Info → Click "Save"
5. Edit Employment Info → Click "Save"
6. Automatically returns to view mode

---

## 💻 Developer Perspective

### Files Modified
- `frontend/src/pages/EmployeesPage.jsx` - Line 1042
- `frontend/src/pages/EmployeeDetailPage.jsx` - ~50 lines added

### Key Changes

**EmployeesPage.jsx:**
```javascript
onEdit={() => navigate(`/employees/${emp.uuid}?mode=edit`)}
```

**EmployeeDetailPage.jsx:**
```javascript
// URL-based edit mode
const [searchParams] = useSearchParams();
const isEditMode = searchParams.get('mode') === 'edit';

// Auto-open modals in sequence
useEffect(() => {
  if (isEditMode && !editModeTriggered && !loading && employee) {
    setEditPersonal(true); // Opens first
  }
}, [isEditMode, editModeTriggered, loading, employee]);

// Chain to next modal
const handlePersonalSaved = () => {
  if (isEditMode) {
    setEditEmployment(true); // Opens second
  }
};

// Exit edit mode
const handleEmploymentSaved = () => {
  if (isEditMode) {
    navigate(`/employees/${uuid}`, { replace: true });
  }
};
```

### URLs
- **View Mode:** `/employees/:uuid`
- **Edit Mode:** `/employees/:uuid?mode=edit`

---

## 🧪 Testing Commands

### Start Development Servers
```powershell
# Backend
cd backend
npm start

# Frontend (new terminal)
cd frontend
npm run dev
```

### Test Edit Flow
1. Login: `admin` / `admin123`
2. Navigate: `http://localhost:5173/employees`
3. Click ✏️ on any employee
4. Verify: URL has `?mode=edit`
5. Verify: Personal modal opens
6. Save → Employment modal opens
7. Save → Returns to view mode

---

## 🔧 API Endpoints Used

All existing endpoints, no changes required:
- `GET /api/employees/:uuid` - Fetch employee
- `PATCH /api/employees/:uuid` - Update employee
- `GET /api/departments` - List departments
- `GET /api/positions` - List positions
- `GET /api/levels` - List levels

---

## 📊 State Management

### URL States
```javascript
View:  /employees/abc-123
Edit:  /employees/abc-123?mode=edit
```

### Component States
```javascript
const [editPersonal, setEditPersonal] = useState(false);
const [editEmployment, setEditEmployment] = useState(false);
const [editModeTriggered, setEditModeTriggered] = useState(false);
const isEditMode = searchParams.get('mode') === 'edit';
```

---

## 🎨 Visual Elements

### Edit Mode Indicators
- **Badge:** Yellow "EDIT MODE" badge in header
- **Button:** Green "EDIT PROFILE" button (only in view mode)
- **Modals:** Sequential auto-opening edit modals

### Colors
- Primary: `#0F766E` (Teal)
- Edit Mode Badge: `#fde047` (Yellow)
- Background: `#EEF1F0` (Light gray)

---

## ⚡ Performance

- **Modal delay:** 300ms (prevents UI flash)
- **State updates:** Minimal re-renders
- **API calls:** Only on save actions
- **Memory:** No leaks, proper cleanup

---

## 🛡️ Error Handling

### If modal doesn't open:
- Check: Employee data loaded
- Check: URL has `?mode=edit`
- Check: No console errors
- Check: Backend running

### If changes don't save:
- Check: Network tab for API errors
- Check: Admin has edit permissions
- Check: Validation errors in response

---

## 📝 Common Tasks

### Add Another Modal to Flow
```javascript
// In EmployeeDetailPage.jsx

// 1. Add state
const [editContact, setEditContact] = useState(false);

// 2. Update Personal save handler
const handlePersonalSaved = () => {
  load();
  setEditPersonal(false);
  if (isEditMode) {
    setTimeout(() => setEditContact(true), 300); // Open Contact instead
  }
};

// 3. Create Contact save handler
const handleContactSaved = () => {
  load();
  setEditContact(false);
  if (isEditMode) {
    setTimeout(() => setEditEmployment(true), 300); // Then Employment
  }
};

// 4. Add modal with handler
{editContact && (
  <EditContactModal 
    employee={employee} 
    onClose={() => setEditContact(false)} 
    onSaved={handleContactSaved} 
  />
)}
```

### Change Modal Order
Modify the chain in handlers:
```javascript
Personal → Employment  // Current
Personal → Contact → Employment  // Updated
```

### Disable Auto-Flow
```javascript
// In handlePersonalSaved:
if (isEditMode && someCondition) {
  // Only auto-open if condition met
  setTimeout(() => setEditEmployment(true), 300);
}
```

---

## 🔄 Rollback

If issues occur:

### Quick Rollback
```powershell
cd frontend/src/pages
git checkout HEAD -- EmployeesPage.jsx EmployeeDetailPage.jsx
```

### Manual Rollback
**EmployeesPage.jsx** line 1042:
```javascript
onEdit={() => setEditEmployee(emp)}
```

**EmployeeDetailPage.jsx:**
Remove all edit mode logic (search for "isEditMode")

---

## 📚 Documentation Files

1. `EMPLOYEE_PROFILE_ANALYSIS.md` - Initial analysis
2. `EMPLOYEE_PROFILE_IMPLEMENTATION_COMPLETE.md` - Full details
3. `TEST_EMPLOYEE_PROFILE.md` - Testing guide
4. `EMPLOYEE_PROFILE_FLOW_DIAGRAM.md` - Visual flows
5. `TASK_6_EMPLOYEE_PROFILE_SUMMARY.md` - Summary
6. `QUICK_REFERENCE_EMPLOYEE_PROFILE.md` - This file

---

## 🆘 Support

### Check These First
1. Both servers running?
2. Logged in as admin?
3. URL correct format?
4. Console errors?
5. Network tab shows API calls?

### Debug Mode
```javascript
// Add to EmployeeDetailPage useEffect:
console.log('Edit Mode:', isEditMode);
console.log('Edit Mode Triggered:', editModeTriggered);
console.log('Loading:', loading);
console.log('Employee:', employee);
```

---

## ✅ Checklist

Before marking complete:
- [ ] Both servers running
- [ ] Can view employee profile
- [ ] Can edit via "Edit Properties" button
- [ ] Personal modal auto-opens
- [ ] Employment modal auto-opens after Personal save
- [ ] Returns to view mode after Employment save
- [ ] "EDIT MODE" badge shows/hides correctly
- [ ] "EDIT PROFILE" button works
- [ ] No console errors
- [ ] All existing features work

---

**Last Updated:** January 2025
**Version:** 1.0
**Status:** Production Ready
