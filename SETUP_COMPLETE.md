# ✅ Mesob HRMS — Setup Complete

Your Mesob HRMS system is now **fully configured and ready to use**.

---

## 🎯 What's Been Set Up

### Database (MySQL)
- **36 tables** created and seeded
- **25 employees**, 8 users, 38 departments, 138 positions
- **RBAC system** with 35 role-occupation mappings
- **12 organizational levels** with salary versions
- **Attendance tracking** with worked hours calculations

### Storage (MinIO)
- Bucket: **`mesob-hrms`**
- **7 organized folders** for different file types
- Employee photos, documents, face recognition, leave documents, letters, etc.

### Authentication
- Default admin credentials ready
- Password: `admin123` (for all 8 seeded users)
- JWT-based auth with refresh tokens

---

## 🚀 Quick Start

### Start the Server

```bash
cd backend
npm run dev
```

The server will start on **http://localhost:5000**

### Login Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | SUPER_ADMIN |
| `hr.tigist` | `admin123` | HR_ADMIN |
| `hr.hanna` | `admin123` | HR_OFFICER |
| `dept.marta` | `admin123` | DEPARTMENT_HEAD |
| `emp.sami` | `admin123` | EMPLOYEE |

(All 8 seeded users have password `admin123`)

---

## 📊 Database Structure

**Total: 36 Tables**

### Core Modules (18 tables)
- Employees, Users, Departments, Positions, Occupations
- Levels, LevelVersions, LevelAllowances, EmployeeLevelHistory
- MesobIdSequence, EmployeeAddresses, EmployeeIDDocuments
- EmployeeRegistrationDrafts, EmployeeFaceImages, EmployeeOccupations

### Leave Management (6 tables)
- leavePolicies, Holidays, employeeLeaveBalances
- leaveRequests, leaveRequestDocuments, leavePostponements

### Attendance (5 tables)
- ShiftDefinitions, EmployeeShifts
- AttendanceLogs (with state tracking)
- AttendanceSummary (with worked hours calculations)
- NetworkSettings

### RBAC/Permissions (4 tables)
- RoleOccupations, OccupationDelegations
- UserPermissionOverrides, UserScopes

### Letters & Audit (6 tables)
- LetterTemplates, IssuedLetters, LetterRequests
- AuditLogs, Notifications, _migrations

---

## 🗂️ MinIO Storage Structure

```
mesob-hrms/
├── employee-photos/          # Profile photos
├── employee-documents/       # ID documents
├── face-images/              # Face recognition (7 per employee)
├── leave-documents/          # Leave request attachments
├── letter-templates/         # HR-uploaded PDF templates
├── letter-requests/          # Generated letter PDFs
└── organization/             # Logo & assets
```

---

## 🔧 Migrations Applied

All required database migrations have been applied:

1. ✅ **Base Schema** — 28 core tables + seed data
2. ✅ **Users Extensions** — permissions_version, last_activity, TEXT refresh_token
3. ✅ **RBAC System** — 4 permission tables + 35 role mappings
4. ✅ **Levels Module** — 4 level tables + 12 seeded levels
5. ✅ **Attendance Enhancements** — worked_hours, overtime, lateness tracking

---

## 📖 Documentation

- **`backend/DATABASE_MIGRATIONS.md`** — Complete migration guide
- **`backend/scripts/verifySetup.js`** — Verify database integrity
- **`database/schema.sql`** — Full database schema
- **`database/seed.sql`** — Seed data SQL

---

## ✅ Verification

Run this to verify everything is working:

```bash
npm run db:verify
```

Expected output:
```
✓ Database and MinIO are fully configured!
  You can now start: npm start
```

---

## 🔄 Common Commands

| Command | Purpose |
|---|---|
| `npm start` | Start production server |
| `npm run dev` | Start with nodemon (auto-restart) |
| `npm run db:verify` | Verify database setup |
| `npm run db:reset` | Reset database (⚠️ destructive!) |
| `npm run db:migrate:all` | Re-run all migrations |

---

## 🐛 Troubleshooting

### Server won't start with "Unknown column" error
**Solution:** Restart the server to clear cached connections
```bash
# Press Ctrl+C, then:
npm run dev
```

### Can't login with admin/admin123
**Solution:** Password hash mismatch — reset it:
```bash
node -e "
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const hash = await bcrypt.hash('admin123', 10);
  const mc = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
  });
  await mc.query('UPDATE Users SET password_hash = ?', [hash]);
  console.log('All passwords reset to: admin123');
  await mc.end();
})();
"
```

### Missing tables error
**Solution:** Run migrations:
```bash
npm run db:migrate:all
```

---

## 🎉 You're All Set!

Your Mesob HRMS is fully configured and ready for use. 

**Next steps:**
1. Start the server: `npm run dev`
2. Log in with `admin` / `admin123`
3. Explore the system
4. Update default passwords in production

For development questions, see `DATABASE_MIGRATIONS.md` or the project README.

**Happy coding! 🚀**
