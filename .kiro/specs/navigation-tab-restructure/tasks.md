# Navigation Tab Restructure - Implementation Tasks

## Overview
This task list implements the navigation redesign to group related features under parent pages with horizontal tabs, reducing sidebar clutter and improving information architecture.

---

## Phase 1: Build Shared Components

- [ ] 1. Create TabContainer component
  - Create `/frontend/src/components/ui/TabContainer.jsx`
  - Implement horizontal tab bar with active state
  - Add hover effects and transitions
  - Support icons + labels
  - Add badge support (for notifications)
  - Make responsive (dropdown on mobile < 768px)
  - Add accessibility attributes (role="tablist", aria-selected, etc.)
  - Style to match design system (underline indicator, colors from palette)
  - **Acceptance Criteria:**
    - Tabs render correctly with active state highlighted
    - Clicking tab fires onChange callback
    - Keyboard navigation works (Tab, Arrow keys, Enter/Space)
    - Mobile view shows dropdown or horizontal scroll
    - Passes accessibility audit

- [ ] 2. Create PageWithTabs wrapper component
  - Create `/frontend/src/components/layout/PageWithTabs.jsx`
  - Accept title, subtitle, and tabs array
  - Render page header with title
  - Render TabContainer below header
  - Render children (tab content) below tabs
  - Handle active tab state via URL params
  - Update URL when tab changes
  - **Acceptance Criteria:**
    - Page header renders with title/subtitle
    - Tabs appear below header
    - Active tab determined by URL (e.g., `/leave/policies` activates "Policies" tab)
    - Changing tabs updates URL without page reload
    - Back/forward browser buttons work correctly

- [ ] 3. Create TabPanel component
  - Create `/frontend/src/components/ui/TabPanel.jsx`
  - Show/hide content based on active tab
  - Support lazy loading of tab content
  - Add loading state spinner
  - Add role="tabpanel" and aria-labelledby
  - **Acceptance Criteria:**
    - Only active tab content rendered (others hidden)
    - Lazy loading works (component loads when tab first activated)
    - Loading spinner shows while tab content loads
    - Accessibility attributes correct

---

## Phase 2: Migrate Leave Management (Pilot)

- [ ] 4. Create new LeaveManagementPage with tabs
  - Create `/frontend/src/pages/LeaveManagementPage.jsx`
  - Use `<PageWithTabs>` wrapper
  - Define tabs: Requests, Policies, Holidays, My Leave
  - Import existing components:
    - RequestsTab: existing ManageLeavePage content
    - PoliciesTab: existing PoliciesPage content
    - HolidaysTab: existing HolidaysPage content
    - MyLeaveTab: existing MyLeavePage content
  - Set up routing: `/leave` (default to `/leave/requests`)
  - **Acceptance Criteria:**
    - All 4 tabs render correctly
    - Clicking tab changes content without page reload
    - URL updates (e.g., `/leave/policies`)
    - Direct URL navigation works (e.g., bookmark `/leave/holidays`)

- [ ] 5. Refactor existing Leave pages into tab components
  - Extract ManageLeavePage content → `/frontend/src/pages/leave/RequestsTab.jsx`
  - Move PoliciesPage content → `/frontend/src/pages/leave/PoliciesTab.jsx`
  - Move HolidaysPage content → `/frontend/src/pages/leave/HolidaysTab.jsx`
  - Keep MyLeavePage as is (already exists)
  - Ensure each tab component is self-contained
  - **Acceptance Criteria:**
    - Each tab component works independently
    - No broken imports or dependencies
    - Permission checks preserved (Can components still work)

- [ ] 6. Update Leave routes in AppRouter
  - Update `/frontend/src/routes/AppRouter.jsx`
  - Add new route: `/leave` → LeaveManagementPage
  - Add child routes:
    - `/leave/requests` → LeaveManagementPage (tab=requests)
    - `/leave/policies` → LeaveManagementPage (tab=policies)
    - `/leave/holidays` → LeaveManagementPage (tab=holidays)
    - `/leave/my` → LeaveManagementPage (tab=my)
  - Add redirects from old URLs:
    - `/policies` → `/leave/policies`
    - `/holidays` → `/leave/holidays`
  - **Acceptance Criteria:**
    - All new routes work
    - Old URLs redirect correctly
    - No broken links

- [ ] 7. Update sidebar navigation for Leave
  - Update `/frontend/src/components/layout/Sidebar.jsx`
  - Change Leave item to single parent (no children in sidebar)
  - Update `to: "/leave"`
  - Remove "Leave Policies" from SETTINGS group
  - Remove "Day off" from SETTINGS group
  - **Acceptance Criteria:**
    - "Leave" appears as single item in WORKFORCE group
    - Clicking "Leave" navigates to `/leave/requests` (default tab)
    - Active state highlights "Leave" when on any `/leave/*` route
    - Sidebar has fewer items (cleaner)

---

## Phase 3: Migrate Attendance & Shifts

- [ ] 8. Create new AttendanceManagementPage with tabs
  - Create `/frontend/src/pages/AttendanceManagementPage.jsx`
  - Use `<PageWithTabs>` wrapper
  - Define tabs: Overview, Mark Attendance, Shifts, Reports
  - Import existing components:
    - OverviewTab: existing AttendancePage content
    - MarkTab: existing attendance marking functionality
    - ShiftsTab: existing ShiftsPage content
    - ReportsTab: new or extract from Overview
  - Set up routing: `/attendance` (default to `/attendance/overview`)
  - **Acceptance Criteria:**
    - All tabs render correctly
    - Tab switching works smoothly
    - URL updates correctly

- [ ] 9. Refactor Shifts into tab component
  - Extract ShiftsPage content → `/frontend/src/pages/attendance/ShiftsTab.jsx`
  - Preserve all shift management functionality
  - Keep permission checks intact
  - **Acceptance Criteria:**
    - Shifts tab shows all shift management features
    - Create, edit, delete shifts still works
    - No regressions in functionality

- [ ] 10. Update Attendance routes in AppRouter
  - Update `/frontend/src/routes/AppRouter.jsx`
  - Modify route: `/attendance` → AttendanceManagementPage
  - Add child routes:
    - `/attendance/overview` → AttendanceManagementPage (tab=overview)
    - `/attendance/mark` → AttendanceManagementPage (tab=mark)
    - `/attendance/shifts` → AttendanceManagementPage (tab=shifts)
    - `/attendance/reports` → AttendanceManagementPage (tab=reports)
  - Add redirect from `/shifts` → `/attendance/shifts`
  - **Acceptance Criteria:**
    - All routes functional
    - Old `/shifts` URL redirects correctly
    - Role-based routing preserved (admin vs dept head vs employee)

- [ ] 11. Update sidebar navigation for Attendance
  - Update `/frontend/src/components/layout/Sidebar.jsx`
  - Change Attendance to single parent (no children)
  - Update `to: "/attendance"`
  - Remove "Shifts" as separate sidebar item
  - **Acceptance Criteria:**
    - "Attendance" is single item in WORKFORCE group
    - "Shifts" no longer in sidebar
    - Active state works for all `/attendance/*` routes

---

## Phase 4: Migrate Administration Pages (Optional)

- [ ] 12. Consolidate Letters into tabs (Optional)
  - Create `/frontend/src/pages/LettersManagementPage.jsx`
  - Tabs: Issued Letters, My Letters
  - Update routes: `/letters/issued`, `/letters/my`
  - Update sidebar (single "Letters" item)
  - **Acceptance Criteria:**
    - Both tabs functional
    - URL routing works
    - Permission checks preserved

- [ ] 13. Consolidate Roles & Permissions (Optional)
  - Create `/frontend/src/pages/rbac/RBACManagementPage.jsx`
  - Tabs: Roles, Permissions
  - Update routes: `/rbac/roles`, `/rbac/permissions`
  - Update sidebar (single "Roles & Permissions" item)
  - **Acceptance Criteria:**
    - Both tabs functional
    - CRUD operations preserved
    - Permission checks work

---

## Phase 5: Testing & Documentation

- [ ] 14. Write unit tests for new components
  - Test TabContainer component
    - Renders all tabs
    - Active tab highlighted
    - onChange fires correctly
    - Permission checks hide unauthorized tabs
  - Test PageWithTabs component
    - Renders with title and tabs
    - URL updates on tab change
    - Back/forward buttons work
  - Test TabPanel component
    - Shows/hides content correctly
    - Lazy loading works
  - **Acceptance Criteria:**
    - All tests pass
    - Code coverage > 80%

- [ ] 15. Perform integration testing
  - Test Leave Management page
    - All tabs accessible
    - Data loads correctly in each tab
    - Switching tabs preserves unsaved form data (or warns user)
  - Test Attendance Management page
    - All tabs functional
    - Role-based access works (admin vs dept head)
  - Test navigation flows
    - Sidebar → Page → Tabs
    - Direct URL navigation
    - Browser back/forward
    - Bookmarking specific tabs
  - **Acceptance Criteria:**
    - No broken navigation paths
    - All user roles tested
    - No JavaScript errors

- [ ] 16. Perform accessibility audit
  - Run axe DevTools on all new pages
  - Test keyboard navigation (Tab, Arrow keys, Enter/Space)
  - Test screen reader compatibility
  - Ensure focus indicators visible
  - Verify ARIA attributes correct
  - **Acceptance Criteria:**
    - No accessibility violations
    - Keyboard navigation works completely
    - Screen reader announces tabs correctly

- [ ] 17. Update user documentation
  - Update navigation guide in `/docs/user-guide.md`
  - Add screenshots of new tab layouts
  - Explain how to find features in new locations
  - Create migration guide for users (old → new locations)
  - **Acceptance Criteria:**
    - Documentation complete
    - Screenshots current
    - Migration guide clear

- [ ] 18. Create developer documentation
  - Document TabContainer component usage
  - Document PageWithTabs pattern
  - Add examples to component library
  - Update routing documentation
  - **Acceptance Criteria:**
    - Component docs complete with examples
    - Routing patterns documented
    - Code examples tested

---

## Phase 6: Cleanup & Optimization

- [ ] 19. Remove old page files (if fully migrated)
  - Archive old PoliciesPage.jsx (moved to leave tabs)
  - Archive old HolidaysPage.jsx (moved to leave tabs)
  - Archive old ShiftsPage.jsx (moved to attendance tabs)
  - Keep backups for rollback if needed
  - **Acceptance Criteria:**
    - Old files moved to archive folder
    - No imports reference old files
    - Application still runs without errors

- [ ] 20. Performance optimization
  - Implement code splitting for tab components
  - Add lazy loading for heavy tabs
  - Optimize bundle size
  - Test page load times
  - **Acceptance Criteria:**
    - Tab components lazy loaded
    - Initial page load < 2 seconds
    - Tab switching < 500ms

- [ ] 21. Mobile responsiveness testing
  - Test on mobile devices (< 768px)
  - Verify tab dropdown/scroll works
  - Test touch interactions
  - Ensure no horizontal overflow
  - **Acceptance Criteria:**
    - Mobile navigation works smoothly
    - Tabs accessible on small screens
    - No layout issues

---

## Rollback Plan

If issues arise, rollback steps:

1. Revert sidebar navigation changes
2. Restore old routes in AppRouter
3. Restore old page files from backups
4. Redirect new URLs to old URLs
5. Deploy rollback to production

---

## Success Criteria

- [ ] Sidebar has 25% fewer top-level items
- [ ] All leave-related features under "Leave Management"
- [ ] All attendance-related features (including shifts) under "Attendance"
- [ ] Zero broken navigation paths
- [ ] Zero accessibility violations
- [ ] User feedback positive (less confusion, easier to find features)
- [ ] Page load performance maintained or improved

---

## Notes

### Migration Order Rationale

1. **Leave Management first** - Highest impact (scattered features consolidated)
2. **Attendance & Shifts second** - Closely related features
3. **Administration pages third** - Lower priority, optional
4. **Testing & docs** - Ensures quality
5. **Cleanup** - Removes technical debt

### Risk Mitigation

- Phase-by-phase approach allows early feedback
- Old URLs redirected (no broken bookmarks)
- All changes behind feature flag (optional)
- Backups maintained for rollback
- Comprehensive testing before each phase

