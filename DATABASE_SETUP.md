# Mesob HRMS - MySQL Database Setup Guide

This guide will walk you through setting up the MySQL database for Mesob HRMS on Windows.

---

## Prerequisites

Before starting, ensure you have:
- ✅ **MySQL 8.0+** installed
- ✅ **Node.js 16+** installed
- ✅ **Git** installed (if cloning from repository)
- ✅ Administrator/root access to MySQL

---

## Step 1: Install MySQL (if not already installed)

### Option A: Using MySQL Installer (Recommended for Windows)

1. **Download MySQL Installer**
   - Visit: https://dev.mysql.com/downloads/installer/
   - Download: `mysql-installer-community-8.x.x.msi`

2. **Run the Installer**
   - Choose **"Developer Default"** or **"Server only"**
   - Set a strong **root password** (remember this!)
   - Keep default port: **3306**
   - Complete the installation

3. **Verify Installation**
   ```cmd
   mysql --version
   ```
   You should see: `mysql  Ver 8.x.x for Win64`

### Option B: Using Chocolatey

```cmd
choco install mysql
```

---

## Step 2: Start MySQL Service

### Method 1: Using Windows Services

1. Press `Win + R`
2. Type: `services.msc`
3. Find **MySQL80** (or similar)
4. Right-click → **Start**

### Method 2: Using Command Prompt (Admin)

```cmd
net start MySQL80
```

### Verify MySQL is Running

```cmd
mysql -u root -p
```
Enter your root password. If you see `mysql>` prompt, MySQL is running!

---

## Step 3: Create the HRMS Database

### Option A: Using MySQL Command Line

1. **Log into MySQL**
   ```cmd
   mysql -u root -p
   ```
   Enter your root password.

2. **Create the Database**
   ```sql
   CREATE DATABASE hrms_leave_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

3. **Create a Dedicated HRMS User (Recommended)**
   ```sql
   CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
   ```

4. **Grant Permissions**
   ```sql
   GRANT ALL PRIVILEGES ON hrms_leave_service.* TO 'hrms_user'@'localhost';
   FLUSH PRIVILEGES;
   ```

5. **Verify Database Created**
   ```sql
   SHOW DATABASES;
   ```
   You should see `hrms_leave_service` in the list.

6. **Exit MySQL**
   ```sql
   EXIT;
   ```

### Option B: Using MySQL Workbench (GUI)

1. Open **MySQL Workbench**
2. Connect to your MySQL server (root user)
3. Click **"Create a new schema"** icon
4. Enter:
   - Name: `hrms_leave_service`
   - Charset: `utf8mb4`
   - Collation: `utf8mb4_unicode_ci`
5. Click **Apply**

---

## Step 4: Clone/Setup the Project

### If You're Cloning from Repository

```cmd
cd C:\Users\Abigia\Desktop\h
git clone <repository-url> Mesob-HRMS
cd Mesob-HRMS
```

### If You Already Have the Project

```cmd
cd C:\Users\Abigia\Desktop\h\Mesob-HRMS
```

---

## Step 5: Configure Backend Environment

1. **Navigate to Backend Directory**
   ```cmd
   cd backend
   ```

2. **Create `.env` File**
   
   Create a file named `.env` in the `backend` folder with this content:

   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # Database Configuration
   DB_HOST=localhost
   DB_USER=hrms_user
   DB_PASSWORD=YourStrongPassword123!
   DB_NAME=hrms_leave_service
   DB_CONNECTION_LIMIT=10

   # JWT Configuration (Generate secure secrets!)
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
   JWT_REFRESH_SECRET=your_super_secret_refresh_key_change_this_in_production
   JWT_EXPIRES_IN=15m
   JWT_REFRESH_EXPIRES_IN=7d

   # MinIO Configuration
   MINIO_ENDPOINT=localhost
   MINIO_PORT=9000
   MINIO_USE_SSL=false
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin

   # CORS Configuration
   CORS_ORIGIN=http://localhost:5173

   # Upload Limits
   MAX_FILE_SIZE=10485760

   # Session Configuration
   SESSION_TIMEOUT=3600000
   ```

3. **Update Database Credentials**
   - Replace `YourStrongPassword123!` with the password you set for `hrms_user`
   - If using root user, change `DB_USER=root` and use root password

4. **Generate Secure JWT Secrets** (Important for Production!)
   
   Run this in PowerShell to generate random secrets:
   ```powershell
   -join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
   ```
   
   Do this twice and replace the JWT_SECRET and JWT_REFRESH_SECRET values.

---

## Step 6: Install Backend Dependencies

```cmd
npm install
```

This will install all required packages including:
- express
- mysql2
- bcryptjs
- jsonwebtoken
- minio
- puppeteer
- And more...

---

## Step 7: Initialize the Database Schema

The project includes several database setup scripts:

### Option A: Complete Setup with Sample Data (Recommended for Testing)

```cmd
npm run db:setup-wizard
```

This interactive wizard will:
- ✅ Create all database tables
- ✅ Set up RBAC permissions
- ✅ Create initial admin user
- ✅ Initialize Ethiopian holidays
- ✅ Optionally add sample data

**Follow the prompts:**
- Enter admin username (e.g., `admin`)
- Enter admin password (strong password!)
- Confirm database setup

### Option B: Manual Step-by-Step Setup

#### 1. Initialize Database Tables

```cmd
npm run db:init
```

This creates all tables:
- users
- employees
- departments
- positions
- levels
- addresses
- attendance_records
- attendance_summary
- leave_policies
- leave_balances
- leave_requests
- shifts
- shift_assignments
- documents
- face_descriptors
- letter_templates
- generated_letters
- notifications
- public_holidays
- audit_logs
- network_settings
- And RBAC tables (occupations, role_occupations, user_occupations, occupation_delegations)

#### 2. Verify Tables Created

```cmd
npm run db:verify
```

This checks that all required tables exist.

#### 3. Initialize Ethiopian Holidays

```cmd
npm run holidays:init
```

This loads Ethiopian public holidays for current and upcoming years.

---

## Step 8: Verify Database Setup

### Check Tables in MySQL

```cmd
mysql -u hrms_user -p hrms_leave_service
```

Then run:
```sql
SHOW TABLES;
```

You should see 40+ tables including:
- users
- employees
- departments
- attendance_records
- leave_requests
- audit_logs
- etc.

### Check Table Structure (Example)

```sql
DESCRIBE users;
DESCRIBE employees;
```

### Exit MySQL

```sql
EXIT;
```

---

## Step 9: Setup MinIO (Object Storage)

MinIO is required for storing employee photos, documents, and face recognition images.

### Option A: Using Docker (Recommended)

1. **Install Docker Desktop for Windows**
   - Download from: https://www.docker.com/products/docker-desktop

2. **Run MinIO Container**
   ```cmd
   docker run -d ^
     -p 9000:9000 ^
     -p 9001:9001 ^
     --name minio ^
     -e "MINIO_ROOT_USER=minioadmin" ^
     -e "MINIO_ROOT_PASSWORD=minioadmin" ^
     -v C:\minio\data:/data ^
     minio/minio server /data --console-address ":9001"
   ```

3. **Access MinIO Console**
   - Open browser: http://localhost:9001
   - Login: `minioadmin` / `minioadmin`

### Option B: Using Windows Binary

1. **Download MinIO**
   - Visit: https://min.io/download
   - Download Windows binary

2. **Run MinIO**
   ```cmd
   minio.exe server C:\minio\data --console-address ":9001"
   ```

3. **Access Console**
   - Browser: http://localhost:9001
   - Login: `minioadmin` / `minioadmin`

### Create Required Buckets

After MinIO is running, the application will auto-create buckets on first run:
- `hrms-photos` - Employee profile photos
- `hrms-documents` - Employee documents
- `hrms-face-images` - Face recognition images
- `hrms-templates` - Letter templates
- `hrms-letters` - Generated letters

---

## Step 10: Start the Backend Server

```cmd
npm start
```

Or for development with auto-reload:
```cmd
npm run dev
```

You should see:
```
⚡️ Server running on http://localhost:5000
✓ Database connection successful
✓ MinIO connection successful
```

---

## Step 11: Setup and Start Frontend

1. **Open New Command Prompt**

2. **Navigate to Frontend Directory**
   ```cmd
   cd C:\Users\Abigia\Desktop\h\Mesob-HRMS\frontend
   ```

3. **Install Dependencies**
   ```cmd
   npm install
   ```

4. **Download Face Recognition Models**
   ```cmd
   npm run download-models
   ```

   This downloads:
   - ssd_mobilenetv1 model
   - face_landmark_68 model
   - face_recognition model
   
   (Total ~8MB, saved to `public/models/`)

5. **Start Development Server**
   ```cmd
   npm run dev
   ```

6. **Access the Application**
   - Open browser: http://localhost:5173
   - Login with admin credentials you created

---

## Step 12: First Login and Initial Setup

### Login

1. Open: http://localhost:5173
2. Enter admin username and password
3. You're logged in!

### Initial Configuration

1. **Create Departments**
   - Go to: Settings → Departments
   - Add your organization's departments (e.g., HR, IT, Finance)

2. **Create Positions**
   - Go to: Settings → Positions
   - Add job positions (e.g., Manager, Officer, Assistant)

3. **Create Leave Policies**
   - Go to: Settings → Leave Policies
   - Configure leave types (Annual, Sick, etc.)
   - Set base days, increments, eligibility

4. **Add Employees**
   - Go to: Employees → Add Employee
   - Fill in employee details
   - Upload photo
   - Register face for biometric attendance

5. **Create User Accounts**
   - Go to: Users → Add User
   - Link user to employee
   - Assign role (HR_ADMIN, DEPARTMENT_HEAD, EMPLOYEE)

---

## Common Issues and Troubleshooting

### Issue 1: Cannot Connect to MySQL

**Error**: `ER_ACCESS_DENIED_ERROR` or `ECONNREFUSED`

**Solutions**:
- ✅ Verify MySQL is running: `net start MySQL80`
- ✅ Check credentials in `.env` file
- ✅ Verify user has permissions:
  ```sql
  SHOW GRANTS FOR 'hrms_user'@'localhost';
  ```
- ✅ Try using root user temporarily to test connection

### Issue 2: Database Already Exists

**Error**: `ER_DB_CREATE_EXISTS`

**Solutions**:
- ✅ Drop and recreate database:
  ```sql
  DROP DATABASE hrms_leave_service;
  CREATE DATABASE hrms_leave_service CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  ```
- ✅ Or use existing database and run migrations

### Issue 3: Port 5000 Already in Use

**Error**: `EADDRINUSE: address already in use :::5000`

**Solutions**:
- ✅ Change port in `.env`: `PORT=5001`
- ✅ Or kill process using port 5000:
  ```cmd
  netstat -ano | findstr :5000
  taskkill /PID <process_id> /F
  ```

### Issue 4: MinIO Connection Failed

**Error**: `MinIO connection error`

**Solutions**:
- ✅ Verify MinIO is running: http://localhost:9000
- ✅ Check credentials in `.env`
- ✅ Restart MinIO container/service

### Issue 5: Face Recognition Models Not Found

**Error**: `Model loading failed`

**Solutions**:
- ✅ Run: `npm run download-models` in frontend directory
- ✅ Check `frontend/public/models/` folder exists
- ✅ Manually download from: https://github.com/justadudewhohacks/face-api.js-models

---

## Database Maintenance

### Backup Database

```cmd
mysqldump -u hrms_user -p hrms_leave_service > backup_YYYYMMDD.sql
```

### Restore Database

```cmd
mysql -u hrms_user -p hrms_leave_service < backup_YYYYMMDD.sql
```

### View Database Size

```sql
SELECT 
    table_schema AS 'Database',
    ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = 'hrms_leave_service'
GROUP BY table_schema;
```

### Clean Test Data

```cmd
npm run db:clean
```

**Warning**: This drops all tables! Use with caution.

---

## Production Deployment Checklist

Before deploying to production:

- [ ] Change all default passwords
- [ ] Generate strong JWT secrets
- [ ] Enable SSL/TLS for MySQL
- [ ] Configure MinIO with strong credentials
- [ ] Enable HTTPS for web server
- [ ] Set up regular database backups
- [ ] Configure firewall rules
- [ ] Update CORS_ORIGIN to production domain
- [ ] Set NODE_ENV=production
- [ ] Review and harden security settings
- [ ] Set up monitoring and logging
- [ ] Test disaster recovery procedures

---

## Useful Commands Reference

### Database Management

```cmd
# Initialize database
npm run db:init

# Verify database setup
npm run db:verify

# Clean database (drops all tables)
npm run db:clean

# Run setup wizard
npm run db:setup-wizard

# Initialize holidays
npm run holidays:init
```

### Server Management

```cmd
# Start backend
npm start

# Start backend (development mode)
npm run dev

# Start frontend
cd frontend & npm run dev

# Run backend tests
npm test
```

### MySQL Commands

```cmd
# Login to MySQL
mysql -u hrms_user -p

# Connect to specific database
mysql -u hrms_user -p hrms_leave_service

# List databases
SHOW DATABASES;

# List tables
SHOW TABLES;

# Describe table structure
DESCRIBE table_name;
```

---

## Next Steps

1. ✅ **Complete Initial Setup** - Add departments, positions, leave policies
2. ✅ **Add Employees** - Create employee profiles with photos
3. ✅ **Register Faces** - Enable biometric attendance
4. ✅ **Create Users** - Set up user accounts with roles
5. ✅ **Test Workflows** - Try attendance check-in, leave requests
6. ✅ **Configure Settings** - Set up holidays, shifts, network restrictions
7. ✅ **Train Users** - Provide training for HR, managers, employees
8. ✅ **Go Live** - Start using the system!

---

## Support

If you encounter issues:

1. **Check logs**: Backend console output for error messages
2. **Review documentation**: SYSTEM_DOCUMENTATION.md for detailed info
3. **Verify configuration**: Double-check `.env` settings
4. **Test connections**: MySQL, MinIO connectivity
5. **Contact support**: Reach out to development team

---

## Success!

If you've completed all steps and can:
- ✅ Access the login page at http://localhost:5173
- ✅ Login with admin credentials
- ✅ See the dashboard
- ✅ Backend running without errors
- ✅ Database connected successfully

**Congratulations! Your Mesob HRMS is ready to use!** 🎉

---

**Document Version**: 1.0  
**Last Updated**: October 6, 2026  
**Maintained By**: Mesob HRMS Team
