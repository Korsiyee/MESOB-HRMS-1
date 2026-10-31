# Database Setup — Correct Execution Order

## ✅ Files to Run (in this order)

Run these in sequence against your `mesob_hrms` database:

### Step 1 — Create all tables
```
mysql -u mesob -pmesob_password mesob_hrms < schema_clean.sql
```
Creates every table: Modules, Scopes, Roles, Departments, Employees, Users, AttendanceLogs, leaveRequests, LetterTemplates, etc.

> **Note:** The `Roles` table is created here but has no rows yet. Do NOT run `seed_data_with_passwords.sql` before Step 2.

---

### Step 2 — Add RBAC tables + seed roles, permissions, and data scopes
```
mysql -u mesob -pmesob_password mesob_hrms < ADD_RBAC_TABLES.sql
```
Creates: `Resources`, `Permissions`, `DataScopes`, `Role_Permissions`, `Role_Permission_Scopes`  
Seeds: all resources, all permissions, all data scopes, and assigns all permissions to `SUPER_ADMIN`.

> This must run before Step 3 because `seed_data_with_passwords.sql` inserts Users that reference role codes like `SUPER_ADMIN`, `HR_ADMIN`, etc. Those rows are created here.

---

### Step 3 — Insert employee and user seed data
```
mysql -u mesob -pmesob_password mesob_hrms < seed_data_with_passwords.sql
```
Seeds: Departments, Shifts, Positions, Levels, Employees, Users (10 test employees).  
Default password for all users: **mesob2024**

---

### Step 4 (Optional) — Fix password hash format
```
mysql -u mesob -pmesob_password mesob_hrms < fix_passwords.sql
```
Only needed if login fails with "invalid password". Updates bcrypt prefix from `$2b$` to `$2a$` for compatibility.

---

## ⚠️ Files to SKIP (outdated / superseded)

| File | Reason to skip |
|------|----------------|
| `rbac_migration.sql` | Old RBAC approach — uses `RolePermissions` (no underscore) and a different `Permissions` schema without `resource_uuid`. Superseded by `ADD_RBAC_TABLES.sql`. Running this will create conflicting duplicate tables. |
| `permissions_seed.sql` | Broken — references tables `Actions` and `Modules` with columns that no longer exist in the current schema. This was written for an older schema version. |
| `fix_role_permissions_table.sql` | Only needed if you ran `rbac_migration.sql` by mistake. Copies data from `RolePermissions` → `Role_Permissions`. Skip if you followed the order above. |
| `FIX_ROLE_PERMISSIONS_NOW.sql` | Same as above — an emergency patch for if `rbac_migration.sql` was run instead of `ADD_RBAC_TABLES.sql`. Skip if you followed the order above. |

---

## Summary (Fresh Install)

```
1. schema_clean.sql
2. ADD_RBAC_TABLES.sql
3. seed_data_with_passwords.sql
4. fix_passwords.sql        ← optional, only if login fails
```

## Recovery (If rbac_migration.sql was already run)

```
1. schema_clean.sql
2. rbac_migration.sql           ← already done
3. FIX_ROLE_PERMISSIONS_NOW.sql ← fixes the table name mismatch
4. seed_data_with_passwords.sql
5. fix_passwords.sql            ← optional
```
