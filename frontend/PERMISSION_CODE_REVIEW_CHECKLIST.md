# Permission-Based UI Code Review Checklist

Use this checklist when reviewing code that involves user permissions or action buttons.

---

## 🔍 Pre-Review Questions

- [ ] Does this PR add/modify any action buttons (Create, Edit, Delete, Export, Approve, etc.)?
- [ ] Does this PR add/modify any forms that change data?
- [ ] Does this PR add/modify any admin-only features?

**If YES to any:** Complete the full checklist below.  
**If NO:** Standard review process applies.

---

## ✅ Permission Implementation Checklist

### 1. Import Statement
- [ ] `Can` component imported: `import { Can } from '../components/Can';`
- [ ] Import placed with other component imports (not in utilities section)

### 2. Action Buttons Wrapped

Check that ALL action buttons are wrapped in `<Can>` components:

- [ ] **Create/Add buttons** wrapped with `action="create"`
- [ ] **Edit/Update buttons** wrapped with `action="update"`
- [ ] **Delete buttons** wrapped with `action="delete"`
- [ ] **Export buttons** wrapped with `action="export"`
- [ ] **Approve/Reject buttons** wrapped with appropriate action
- [ ] **Status change buttons** wrapped with `action="update"`

### 3. Correct Resource Names

Verify resource names match the standard mapping:

- [ ] `resource="employees"` for employee actions
- [ ] `resource="departments"` for department actions
- [ ] `resource="positions"` for position actions
- [ ] `resource="shifts"` for shift actions
- [ ] `resource="accounts"` for account actions
- [ ] `resource="leave"` for leave actions
- [ ] `resource="policies"` for policy actions
- [ ] `resource="attendance"` for attendance actions

**No typos, pluralization matches standard**

### 4. View Buttons NOT Wrapped

- [ ] View/Read-only buttons are NOT wrapped (view permission controls page access)
- [ ] Info/Details buttons are NOT wrapped
- [ ] Navigation buttons are NOT wrapped

### 5. Loading State Handling

- [ ] `showLoading` prop NOT used (default behavior prevents flickering)
- [ ] OR if `showLoading={true}`, there's a good reason (documented in PR description)

### 6. No Layout Shifts

- [ ] Button container doesn't collapse when permission check loads
- [ ] Grid/flex layouts remain stable with missing buttons
- [ ] No "jumping" UI during permission checks

### 7. Fallback Content (Optional)

- [ ] If `fallback` prop used, it provides helpful messaging
- [ ] Fallback doesn't reveal functionality user can't access
- [ ] Fallback is not misleading (e.g., "Coming Soon" when it's permission-blocked)

---

## 🔒 Security Checklist

### Backend Authorization

- [ ] **CRITICAL:** Backend API endpoints enforce authorization (not just frontend)
- [ ] API calls use standard authentication headers
- [ ] 403 errors are handled gracefully in UI
- [ ] No sensitive data exposed in error messages

### No Security Through Obscurity

- [ ] Frontend permission checks used for UX ONLY
- [ ] Code doesn't assume hiding UI = security
- [ ] No business logic depends solely on frontend permission state

---

## 🧪 Testing Checklist

### Manual Testing Required

Test with **multiple user roles:**

- [ ] **View-Only User** (only `view` permission)
  - [ ] No action buttons visible
  - [ ] No JavaScript errors in console
  - [ ] Can still view/read data

- [ ] **Editor User** (create, update, but no delete)
  - [ ] Create and Edit buttons visible
  - [ ] Delete buttons hidden
  - [ ] All visible buttons functional

- [ ] **Admin User** (all permissions)
  - [ ] All buttons visible
  - [ ] No regressions in functionality

### Backend Testing

- [ ] Attempt API calls as unauthorized user (should get 403)
- [ ] Backend logs show authorization checks executing
- [ ] Permit.io dashboard shows correct permission queries

### Edge Cases

- [ ] Permission check API failure doesn't break page
- [ ] Network timeout doesn't show unauthorized buttons
- [ ] Multiple rapid permission checks don't cause issues

---

## 📝 Code Quality Checklist

### Code Structure

- [ ] Permission checks co-located with UI elements (not centralized)
- [ ] No duplicate permission checks for same action/resource
- [ ] Complex permission logic extracted to custom hooks (if needed)

### Readability

- [ ] Code comments explain WHY permissions are structured this way
- [ ] No magic strings (action/resource names are clear)
- [ ] Consistent formatting with existing codebase

### Performance

- [ ] Permission checks don't cause unnecessary re-renders
- [ ] Hook results cached/memoized if used multiple times
- [ ] No permission checks inside tight loops

---

## 📚 Documentation Checklist

### PR Description

- [ ] Lists which permissions are required for new features
- [ ] Explains any non-standard permission patterns
- [ ] Includes before/after screenshots (if UI changed)

### Code Comments

- [ ] Complex permission logic documented
- [ ] Non-obvious action/resource pairs explained
- [ ] Fallback behavior documented (if used)

### Update Guides (if applicable)

- [ ] New permission patterns added to PERMISSION_PATTERN_GUIDE.md
- [ ] New resources added to action/resource mapping table
- [ ] Common mistakes section updated (if new pitfall discovered)

---

## ⚠️ Red Flags

**STOP and discuss with team if you see:**

- ❌ Permissions checked only on form submission (not on render)
- ❌ Frontend permission state used to gate API calls
- ❌ Permission strings generated dynamically (e.g., `action={isCreate ? 'create' : 'update'}`)
- ❌ Permission checks disabled in development (`if (process.env.NODE_ENV === 'development') return true`)
- ❌ Hard-coded role checks (e.g., `if (user.role === 'admin')`) instead of permission checks
- ❌ Comments like "TODO: add permission check" or "// skip permission for now"

---

## ✍️ Reviewer Sign-Off

### Permissions Implementation
- [ ] All action buttons properly wrapped in `<Can>` components
- [ ] Action/resource pairs follow standard naming
- [ ] No view buttons incorrectly wrapped

### Security
- [ ] Backend authorization confirmed in place
- [ ] Frontend checks used for UX only

### Testing
- [ ] Tested with multiple user roles
- [ ] No regressions for authorized users
- [ ] Edge cases handled gracefully

### Code Quality
- [ ] Clean, readable code
- [ ] No duplicate permission checks
- [ ] Documentation adequate

---

## 🎯 Final Checklist

Before approving the PR:

- [ ] All items above checked
- [ ] CI/CD pipeline passing
- [ ] No merge conflicts
- [ ] PR description complete
- [ ] Screenshots/demo provided (if applicable)
- [ ] Team discussion resolved (if red flags raised)

---

## 📞 Need Help?

**Questions about permissions?** Check:
1. [Permission Pattern Guide](./PERMISSION_PATTERN_GUIDE.md)
2. [Can.jsx Source](../src/components/Can.jsx)
3. [usePermission Hook](../src/hooks/usePermission.js)

**Still stuck?** Ask in #dev-help Slack channel or tag @dev-leads

---

**Version:** 1.0  
**Last Updated:** 2024-01-20  
**Maintained By:** Development Team
