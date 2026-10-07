# 🚀 START HERE - Mesob HRMS Setup

Welcome to Mesob HRMS! This guide will get you started quickly.

---

## 📋 Quick Checklist

Before you begin, make sure you have:

- [ ] **MySQL 8.0+** installed and running
- [ ] **Node.js 16+** installed
- [ ] **Git** installed (if cloning repository)
- [ ] **Administrator access** to your computer

---

## ⚡ Fastest Way to Get Started

### Step 1: Run Setup Script

**Option A: PowerShell (Recommended)**
```powershell
.\QUICK_START.ps1
```

**Option B: Command Prompt**
```cmd
QUICK_START.cmd
```

### Step 2: Follow the Prompts

The script will:
1. Install dependencies
2. Create configuration file
3. Setup database
4. Initialize data

### Step 3: Start the Application

**Terminal 1 - Backend:**
```cmd
cd backend
npm start
```

**Terminal 2 - Frontend:**
```cmd
cd frontend
npm run dev
```

### Step 4: Access the Application

Open your browser: **http://localhost:5173**

Login with the admin credentials you created during setup.

---

## 📚 Documentation Files

| Document | Purpose |
|----------|---------|
| **SETUP_README.md** | Quick setup options summary |
| **DATABASE_SETUP.md** | Complete step-by-step database setup (60+ steps) |
| **INTRODUCTION.md** | What is Mesob HRMS and why use it |
| **SYSTEM_DOCUMENTATION.md** | Complete technical documentation |
| **README.md** | Project overview and quick start |

---

## 🎯 What to Read Based on Your Role

### If You're IT/System Administrator
1. Read: **DATABASE_SETUP.md** (complete guide)
2. Run: `QUICK_START.ps1` or manually follow DATABASE_SETUP.md
3. Configure: MinIO, network settings, security
4. Read: **SYSTEM_DOCUMENTATION.md** (technical details)

### If You're HR Manager/Admin
1. Read: **INTRODUCTION.md** (understand the system)
2. Have IT setup the system (DATABASE_SETUP.md)
3. After setup: Configure departments, positions, leave policies
4. Train users on the system

### If You're a Developer
1. Read: **SYSTEM_DOCUMENTATION.md** (architecture, API, database)
2. Read: **DATABASE_SETUP.md** (environment setup)
3. Run: Development setup
4. Start coding!

---

## 🔧 Common Setup Tasks

### First Time Setup

1. **Install MySQL**
   - Download: https://dev.mysql.com/downloads/installer/
   - Install with default settings
   - Remember your root password!

2. **Install Node.js**
   - Download: https://nodejs.org/ (LTS version)
   - Install with default settings

3. **Run Setup Script**
   ```cmd
   QUICK_START.cmd
   ```

4. **Setup MinIO** (for file storage)
   ```cmd
   docker run -d -p 9000:9000 -p 9001:9001 --name minio minio/minio server /data --console-address ":9001"
   ```

### Daily Development

```cmd
# Start backend
cd backend
npm run dev

# Start frontend (new terminal)
cd frontend
npm run dev
```

---

## 🆘 Need Help?

### Quick Fixes

**Problem: MySQL not found**
```cmd
# Add MySQL to PATH or use full path
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

**Problem: Port 5000 in use**
```env
# Change in backend\.env
PORT=5001
```

**Problem: Can't connect to database**
1. Check MySQL is running: `net start MySQL80`
2. Verify password in `backend\.env`
3. Test connection: `mysql -u root -p`

### Get More Help

- **Detailed Setup**: See DATABASE_SETUP.md
- **System Features**: See INTRODUCTION.md
- **Technical Docs**: See SYSTEM_DOCUMENTATION.md
- **Troubleshooting**: See DATABASE_SETUP.md → Troubleshooting section

---

## 🎉 After Setup Success

Once you see:
```
✓ Backend running on http://localhost:5000
✓ Frontend running on http://localhost:5173
✓ Database connected
```

You're ready to go!

### Initial Configuration

1. **Login** at http://localhost:5173
2. **Add Departments** (HR, IT, Finance, etc.)
3. **Add Positions** (Manager, Officer, etc.)
4. **Create Leave Policies** (Annual, Sick, etc.)
5. **Add Employees** with photos
6. **Register Faces** for biometric attendance
7. **Create User Accounts** and assign roles
8. **Start Using** the system!

---

## 📞 Support

### Documentation
- Complete technical docs: **SYSTEM_DOCUMENTATION.md**
- Setup guide: **DATABASE_SETUP.md**
- System overview: **INTRODUCTION.md**

### Quick Links
- MySQL Download: https://dev.mysql.com/downloads/
- Node.js Download: https://nodejs.org/
- MinIO Download: https://min.io/download

---

## ✅ Success Checklist

Mark these off as you complete them:

- [ ] MySQL installed and running
- [ ] Node.js installed
- [ ] Project dependencies installed (`npm install`)
- [ ] `.env` file configured
- [ ] Database initialized (`npm run db:init`)
- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can access http://localhost:5173
- [ ] Can login with admin account
- [ ] MinIO running for file storage

---

## 🚀 You're All Set!

The system is now ready to use. Enjoy using Mesob HRMS!

For detailed feature documentation, see:
- **SYSTEM_DOCUMENTATION.md** - How everything works
- **INTRODUCTION.md** - Features and benefits

---

**Quick Start Version**: 1.0  
**Last Updated**: October 6, 2026  
**For**: Mesob HRMS v1.0.0
