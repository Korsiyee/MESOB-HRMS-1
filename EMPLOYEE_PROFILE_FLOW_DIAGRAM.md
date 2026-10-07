# Employee Profile - User Flow Diagram

## Complete User Journey

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EMPLOYEE LIST PAGE                            │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │  Employee Table                                              │    │
│  │  ┌──────────┬──────────┬─────────┬────────┬─────────────┐ │    │
│  │  │ Name     │ Dept     │ Status  │ Actions │             │ │    │
│  │  ├──────────┼──────────┼─────────┼────────┼─────────────┤ │    │
│  │  │ John Doe │ IT       │ ACTIVE  │ 👁️ ✏️ ❌ │             │ │    │
│  │  │          │          │         │ │  │  └─ Status       │ │    │
│  │  │          │          │         │ │  └──── Edit Props   │ │    │
│  │  │          │          │         │ └─────── View Detail  │ │    │
│  │  └──────────┴──────────┴─────────┴────────┴─────────────┘ │    │
│  └────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────┘
                    │                            │
                    │                            │
           ┌────────▼────────┐          ┌────────▼────────┐
           │  Click 👁️       │          │  Click ✏️       │
           │  View Detail    │          │  Edit Props     │
           └────────┬────────┘          └────────┬────────┘
                    │                            │
                    │                            │
                    ▼                            ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐
│     EMPLOYEE PROFILE          │  │     EMPLOYEE PROFILE          │
│        (View Mode)            │  │       (Edit Mode)             │
│  URL: /employees/:uuid        │  │  URL: /employees/:uuid        │
│                               │  │       ?mode=edit              │
├───────────────────────────────┤  ├───────────────────────────────┤
│  ┌─────────────────────────┐ │  │  ┌─────────────────────────┐ │
│  │ Header                  │ │  │  │ Header                  │ │
│  │ Employee Details        │ │  │  │ Employee Details        │ │
│  │               [Edit]    │ │  │  │  [EDIT MODE]            │ │
│  │               [Back]    │ │  │  │            [Back]       │ │
│  └─────────────────────────┘ │  │  └─────────────────────────┘ │
│                               │  │                               │
│  ┌─────────────────────────┐ │  │  ┌─────────────────────────┐ │
│  │ Hero Card               │ │  │  │ Hero Card               │ │
│  │ [Photo] John Doe        │ │  │  │ [Photo] John Doe        │ │
│  │ Software Engineer       │ │  │  │ Software Engineer       │ │
│  └─────────────────────────┘ │  │  └─────────────────────────┘ │
│                               │  │                               │
│  ┌────┬────────────────────┐ │  │  ┌────┬────────────────────┐ │
│  │Nav │ Content            │ │  │  │Nav │ Content            │ │
│  ├────┤                    │ │  │  ├────┤                    │ │
│  │ ●  │ Personal Info  ✏️  │ │  │  │ ●  │ Personal Info  ✏️  │ │
│  │    │ Contact Info       │ │  │  │    │ Contact Info       │ │
│  │    │ Employment     ✏️  │ │  │  │    │ Employment     ✏️  │ │
│  │    │ Documents          │ │  │  │    │ Documents          │ │
│  └────┴────────────────────┘ │  │  └────┴────────────────────┘ │
└───────────────────────────────┘  └───────────────┬───────────────┘
         │                                         │
         │                                         │ (300ms delay)
         │                                         │
         │                          ┌──────────────▼──────────────┐
         │                          │ AUTO-OPEN                   │
         │                          │ Personal Info Edit Modal    │
         │                          │                             │
         │                          │ ┌─────────────────────────┐ │
         │                          │ │ Edit Personal Info      │ │
         │                          │ │                         │ │
         │                          │ │ Title:     [Dr      ▼] │ │
         │                          │ │ First:     [John     ] │ │
         │                          │ │ Last:      [Doe      ] │ │
         │                          │ │ Gender:    [MALE    ▼] │ │
         │                          │ │                         │ │
         │                          │ │ [Cancel] [Save Changes] │ │
         │                          │ └─────────────────────────┘ │
         │                          └──────────────┬──────────────┘
         │                                         │
         │                                         │ User clicks
         │                                         │ "Save Changes"
         │                                         │
         │                          ┌──────────────▼──────────────┐
         │                          │ Saves changes...            │
         │                          │ Reloads employee data...    │
         │                          │                             │
         │                          │ AUTO-OPEN (300ms delay)     │
         │                          │ Employment Info Edit Modal  │
         │                          │                             │
         │                          │ ┌─────────────────────────┐ │
         │                          │ │ Edit Employment Info    │ │
         │                          │ │                         │ │
         │                          │ │ Dept:      [IT       ▼]│ │
         │                          │ │ Position:  [Dev      ▼]│ │
         │                          │ │ Bank:      [CBE      ] │ │
         │                          │ │ TIN:       [12345... ] │ │
         │                          │ │                         │ │
         │                          │ │ [Cancel] [Save Changes] │ │
         │                          │ └─────────────────────────┘ │
         │                          └──────────────┬──────────────┘
         │                                         │
         │                                         │ User clicks
         │                                         │ "Save Changes"
         │                                         │
         │                          ┌──────────────▼──────────────┐
         │                          │ Saves changes...            │
         │                          │ Reloads employee data...    │
         │                          │                             │
         │                          │ AUTO-EXIT EDIT MODE         │
         │                          │ Remove ?mode=edit from URL  │
         │                          └──────────────┬──────────────┘
         │                                         │
         └─────────────────────────────────────────┘
                                   │
                                   ▼
         ┌───────────────────────────────────────────┐
         │     EMPLOYEE PROFILE (View Mode)          │
         │     URL: /employees/:uuid                 │
         │                                           │
         │     Shows updated employee information    │
         │     "EDIT MODE" badge removed             │
         │     "EDIT PROFILE" button visible again   │
         └───────────────────────────────────────────┘
```

---

## Alternative Flow: Manual Edit Mode

```
┌─────────────────────────────────────┐
│   EMPLOYEE PROFILE (View Mode)      │
│   User clicks "EDIT PROFILE" button │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   URL changes to ?mode=edit         │
│   Badge appears: "EDIT MODE"        │
│   Personal Info modal auto-opens    │
└─────────────┬───────────────────────┘
              │
              ▼
        (Same sequential
         flow as above)
```

---

## State Diagram

```
┌──────────┐
│  START   │
└────┬─────┘
     │
     ▼
┌──────────────────────────────────────┐
│  Loading Employee Profile            │
│  - Fetch employee data               │
│  - Fetch departments, positions      │
│  - Check URL for ?mode=edit          │
└────┬─────────────────────────────────┘
     │
     ▼
   ┌─┴─┐
   │ ? │ mode=edit in URL?
   └─┬─┘
     │
     ├─── NO ──────────────────────────┐
     │                                 │
     │                                 ▼
     │                    ┌─────────────────────┐
     │                    │   VIEW MODE         │
     │                    │   - Show all info   │
     │                    │   - Edit btn visible│
     │                    │   - No badge        │
     │                    └─────┬───────────────┘
     │                          │
     │                          │ User clicks
     │                          │ "EDIT PROFILE"
     │                          │
     │                          ▼
     │              ┌────────────────────────┐
     │              │ Navigate to ?mode=edit │
     │              └───────────┬────────────┘
     │                          │
     └─── YES ──────────────────┘
              │
              ▼
   ┌─────────────────────────┐
   │   EDIT MODE             │
   │   - Show EDIT MODE badge│
   │   - Hide Edit btn       │
   │   - Set editModeTriggered│
   └────┬────────────────────┘
        │
        ▼
   ┌─────────────────────────┐
   │ Open Personal Modal     │
   │ (auto, 300ms delay)     │
   └────┬────────────────────┘
        │
        ▼
      ┌─┴─┐
      │ ? │ User action?
      └─┬─┘
        │
        ├─ CANCEL ────────────────────┐
        │                             │
        │                             ▼
        │                    ┌────────────────┐
        │                    │ Close modal    │
        │                    │ Stay edit mode │
        │                    └────────────────┘
        │
        └─ SAVE ──────────────────────┐
                                      │
                                      ▼
                         ┌─────────────────────┐
                         │ Save Personal Info  │
                         │ Reload data         │
                         │ Open Employment     │
                         │ (auto, 300ms delay) │
                         └────┬────────────────┘
                              │
                              ▼
                            ┌─┴─┐
                            │ ? │ User action?
                            └─┬─┘
                              │
                              ├─ CANCEL ──────┐
                              │               │
                              │               ▼
                              │      ┌────────────────┐
                              │      │ Close modal    │
                              │      │ Stay edit mode │
                              │      └────────────────┘
                              │
                              └─ SAVE ────────┐
                                              │
                                              ▼
                                 ┌─────────────────────┐
                                 │ Save Employment     │
                                 │ Reload data         │
                                 │ EXIT EDIT MODE      │
                                 │ Remove ?mode=edit   │
                                 └────┬────────────────┘
                                      │
                                      ▼
                                 ┌─────────────┐
                                 │  VIEW MODE  │
                                 └─────────────┘
```

---

## Component Interaction Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         EmployeesPage                            │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  ActionButtons Component                                │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │  onView={() => navigate(`/employees/${uuid}`)}  │   │    │
│  │  │  onEdit={() => navigate(`/employees/${uuid}     │   │    │
│  │  │                          ?mode=edit`)}          │   │    │
│  │  └─────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ React Router
                            │ Navigation
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     EmployeeDetailPage                           │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  const [searchParams] = useSearchParams()              │    │
│  │  const isEditMode = searchParams.get('mode')==='edit'  │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  useEffect: Auto-open modals when isEditMode           │    │
│  │  - Check isEditMode && !editModeTriggered              │    │
│  │  - setEditPersonal(true) after 300ms                   │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  EditPersonalModal                                      │    │
│  │  - onSaved={handlePersonalSaved}                       │    │
│  │    - Calls load()                                      │    │
│  │    - If isEditMode: auto-open Employment modal         │    │
│  └────────────────────────────────────────────────────────┘    │
│                            │                                     │
│                            ▼                                     │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  EditEmploymentModal                                    │    │
│  │  - onSaved={handleEmploymentSaved}                     │    │
│  │    - Calls load()                                      │    │
│  │    - If isEditMode: exit edit mode                     │    │
│  │    - navigate(`/employees/${uuid}`, {replace:true})    │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

---

## URL State Management

```
Initial State:
┌──────────────────────────────────┐
│ /employees/:uuid                 │  ← View Mode
└──────────────────────────────────┘
              │
              │ Click "EDIT PROFILE" or
              │ Click "Edit Properties" from list
              │
              ▼
┌──────────────────────────────────┐
│ /employees/:uuid?mode=edit       │  ← Edit Mode
└──────────────────────────────────┘
              │
              │ Complete editing
              │ (save Employment modal)
              │
              ▼
┌──────────────────────────────────┐
│ /employees/:uuid                 │  ← Back to View Mode
└──────────────────────────────────┘
```

---

## Key Decision Points

```
1. User on Employee List
   └─> VIEW or EDIT?
       ├─> VIEW → Navigate to profile (view mode)
       └─> EDIT → Navigate to profile (edit mode)

2. Profile opens in edit mode
   └─> Personal modal opens
       └─> User action?
           ├─> CANCEL → Stay in edit mode
           └─> SAVE → Open Employment modal

3. Employment modal opens
   └─> User action?
       ├─> CANCEL → Stay in edit mode
       └─> SAVE → Exit edit mode, return to view

4. Profile in view mode
   └─> Click "EDIT PROFILE" → Enter edit mode (repeat from step 2)
```

---

**Visual Legend:**
- `┌─┐ └─┘ │ ─` : Boxes and lines
- `▼ ▲ ► ◄` : Flow direction
- `●` : Active state
- `✏️ 👁️` : Action icons
- `? ` : Decision point

