# Quick Setup Guide

Choose one of the setup methods below:

## Option 1: Automated Setup (Recommended)

### Using PowerShell (Recommended)
```powershell
.\QUICK_START.ps1
```

### Using Command Prompt
```cmd
QUICK_START.cmd
```

These scripts will:
- ✅ Install backend dependencies
- ✅ Create .env configuration file
- ✅ Initialize MySQL database
- ✅ Create all tables
- ✅ Initialize Ethiopian holidays
- ✅ Setup frontend (optional)

## Option 2: Manual Setup

See **DATABASE_SETUP.md** for detailed step-by-step instructions.

## What You Need First

1. **MySQL 8.0+** - Should be installed and running
2. **Node.js 16+** - For running the application
3. **MinIO** - For file storage (setup after database)

## After Setup

### Start Backend
```cmd
cd backend
npm start
```

### Start Frontend
```cmd
cd frontend
npm run dev
```

### Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Default Login

After running the setup wizard, you'll create an admin account.

Use those credentials to login.

## Need Help?

- **DATABASE_SETUP.md** - Complete database setup guide
- **SYSTEM_DOCUMENTATION.md** - Full system documentation
- **INTRODUCTION.md** - System overview and features

## Troubleshooting

### MySQL Not Found
Add MySQL to your PATH or use full path:
```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

### Port Already in Use
Change port in backend\.env:
```env
PORT=5001
```

### Database Connection Failed
1. Verify MySQL is running
2. Check credentials in backend\.env
3. Ensure database user has permissions

## Next Steps After Setup

1. ✅ Login with admin credentials
2. ✅ Create departments and positions
3. ✅ Configure leave policies
4. ✅ Add employees
5. ✅ Register faces for biometric attendance
6. ✅ Start using the system!

---

**Need detailed instructions?** → See **DATABASE_SETUP.md**
