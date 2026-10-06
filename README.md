# Mesob HRMS - Human Resource Management System

A comprehensive, production-ready HR management system for Ethiopian organizations, featuring module-based RBAC, attendance tracking, leave management, employee administration, and advanced face recognition capabilities.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Installation & Setup](#installation--setup)
5. [Database Setup](#database-setup)
6. [Configuration](#configuration)
7. [Running the Application](#running-the-application)
8. [User Roles & Permissions](#user-roles--permissions)
9. [Default Test Users](#default-test-users)
10. [Key Features](#key-features)
11. [Project Structure](#project-structure)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [Troubleshooting](#troubleshooting)
15. [API Documentation](#api-documentation)

---

## Overview

Mesob HRMS is a modern, scalable human resource management system designed specifically for Ethiopian organizations. The system provides comprehensive employee lifecycle management with a sophisticated module-based permission system that replaces complex external authorization services.

### What Makes Mesob HRMS Different

- **Simplified Module-Level Permissions**: Access control at the module level rather than granular action-level permissions
- **Database-Driven Authorization**: No external service dependencies - everything is managed in your database
- **Automatic Scope Filtering**: Data access automatically scoped to Organization, Department, or Personal levels
- **Self-Service Personal Space**: Every employee can manage their own attendance, leaves, and letters
- **Production-Ready**: Single-command database initialization for fresh deployments

---

## System Architecture

### Module-Based Permission System

Mesob HRMS uses a simplified, maintainable permission system with three core concepts:

#### 1. Modules (7 Application Modules)

The application is divided into distinct functional modules:

| Module | Description | Typical Routes |
|--------|-------------|----------------|
| **HOME** | Dashboard and analytics | `/` |
| **EMPLOYEES** | Employee management | `/employees` |
| **ORGANIZATION** | Departments, Positions, Levels | `/organization/*` |
| **ATTENDANCE** | Attendance tracking & analytics | `/attendance` |
| **SHIFTS** | Shift management | `/shifts` |
| **LETTERS** | Letter generation and management | `/letters` |
| **LEAVE** | Leave management | `/leave/*` |

**Personal Space** (always accessible to all authenticated users):
- My Attendance
- My Letters
- My Leaves
- My Account

#### 2. Scopes (3 Data Access Levels)

Data access is automatically filtered based on scope:

| Scope | Level | Description | Example |
|-------|-------|-------------|---------|
| **ORGANIZATION** | 100 | Access to all data across the organization | HR Admin sees all employees |
| **DEPARTMENT** | 50 | Access to own department data only | Dept Head sees their department's employees |
| **PERSONAL** | 10 | Access to own data only | Employee sees only their own records |

#### 3. Roles (5 System Roles)

Pre-configured roles with different access levels:

**SUPER_ADMIN (Level 100)**
- All 7 modules with ORGANIZATION scope
- Complete system access including role management

**HR_ADMIN (Level 90)**
- All 7 modules with ORGANIZATION scope
- Full HR management capabilities

**DEPARTMENT_HEAD (Level 70)**
- Modules: HOME, EMPLOYEES, ATTENDANCE, LEAVE, LETTERS
- DEPARTMENT scope (sees only their department's data)

**HR_OFFICER (Level 60)**
- Modules: HOME, EMPLOYEES, ORGANIZATION
- ORGANIZATION scope for assigned modules

**EMPLOYEE (Level 10)**
- Module: HOME only
- PERSONAL scope
- Full access to Personal Space

### Database Schema Overview

**Core RBAC Tables:**
- `Roles` - User roles with hierarchy levels
- `Modules` - Application modules
- `Scopes` - Data access scopes
- `RoleModules` - Module permissions per role
- `Users` - User accounts with role assignments

**Business Tables:**
- `Employees` - Employee records
- `Departments` - Organizational departments
- `Positions` - Job positions
- `Levels` - Employment levels
- `Attendance` - Attendance records
- `Leaves` - Leave requests and approvals
- `Letters` - Generated documents

---

## Prerequisites

Before installing Mesob HRMS, ensure you have:

- **Node.js** 16+ (18+ recommended)
- **MySQL** 8.0+
- **MinIO Server** (for file storage and face recognition models)
- **Modern Browser** with camera support (for face recognition features)
- **Operating System**: Linux, macOS, or Windows
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: Minimum 1GB free space

---

## Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Mesob\ HRMS
```

### 2. Backend Setup

```bash
cd backend
npm install
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run download-models  # Download face recognition models
```

### 4. Environment Configuration

Copy the example environment files and configure them:

```bash
# Backend
cd backend
cp .env.example .env

# Frontend
cd frontend
cp .env.example .env
```

Edit the `.env` files with your credentials (see [Configuration](#configuration) section).

---

## Database Setup

Mesob HRMS provides a **single-command database initialization** for production-ready deployment.

### Quick Setup (Recommended)

```bash
cd backend
npm run db:setup
```

This command will:
1. Create all required tables (Users, Roles, Modules, Scopes, RoleModules, etc.)
2. Seed initial data:
   - 3 Scopes (ORGANIZATION, DEPARTMENT, PERSONAL)
   - 7 Modules (HOME, EMPLOYEES, ORGANIZATION, ATTENDANCE, SHIFTS, LETTERS, LEAVE)
   - 5 System Roles (SUPER_ADMIN, HR_ADMIN, DEPARTMENT_HEAD, HR_OFFICER, EMPLOYEE)
   - Pre-configured module permissions for each role
3. Create test users with different roles

### Alternative: Manual Setup

If you prefer manual control:

```bash
cd backend

# Create database
mysql -u root -p -e "CREATE DATABASE mesob_hrms;"

# Run schema
mysql -u root -p mesob_hrms < ../database/schema.sql

# Seed initial data
mysql -u root -p mesob_hrms < ../database/seed.sql
```

### Verify Setup

```bash
cd backend
node scripts/checkTables.js
```

Expected output:
```
✓ Modules table exists (7 modules)
✓ Scopes table exists (3 scopes)
✓ Roles table exists (5 roles)
✓ RoleModules table exists
✓ Users table has role_uuid column
```

---

## Configuration

### Backend Environment Variables (.env)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_secure_password
DB_NAME=mesob_hrms

# JWT Configuration
JWT_SECRET=your_very_secure_secret_key_change_in_production
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d

# MinIO Configuration (Object Storage)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=your_minio_password
MINIO_USE_SSL=false
MINIO_BUCKET=hrms-documents

# Application Configuration
UPLOAD_MAX_SIZE=10485760
SESSION_TIMEOUT=3600000
```

### Frontend Environment Variables (.env)

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:5000/api

# Application Configuration
VITE_APP_NAME=Mesob HRMS
VITE_SESSION_TIMEOUT=3600000
VITE_IDLE_TIMEOUT=1800000
```

---

## Running the Application

### Development Mode

**Start Backend:**
```bash
cd backend
npm start
```

The backend server will start on `http://localhost:5000`

**Start Frontend:**
```bash
cd frontend
npm run dev
```

The frontend application will start on `http://localhost:5173`

### Production Mode

**Backend:**
```bash
cd backend
npm run start:prod
# Or use PM2 for process management:
pm2 start server.js --name mesob-hrms-backend
```

**Frontend:**
```bash
cd frontend
npm run build
# Deploy the dist/ folder to your web server
```

### Access the Application

- **Frontend**: http://localhost:5173 (development) or your production URL
- **Backend API**: http://localhost:5000
- **MinIO Console**: http://localhost:9001

---

## User Roles & Permissions

### Role Hierarchy

Mesob HRMS uses a hierarchical role system where higher-level roles have more permissions:

```
SUPER_ADMIN (100) ─── Full System Access
    │
HR_ADMIN (90) ─────── Full HR Operations
    │
DEPARTMENT_HEAD (70) ─ Department Management
    │
HR_OFFICER (60) ───── Limited HR Functions
    │
EMPLOYEE (10) ─────── Personal Data Only
```

### Detailed Role Permissions

#### SUPER_ADMIN (Level 100)
**Access**: All modules with ORGANIZATION scope

- Complete system administration
- Role management (create, edit, delete roles)
- Full access to all 7 modules
- Can view and modify all organizational data
- Manage system settings

**Use Case**: System administrators, IT staff

#### HR_ADMIN (Level 90)
**Access**: All modules with ORGANIZATION scope

- Full HR operations across organization
- Employee lifecycle management
- Attendance and leave management
- Letter generation and approval
- Organization structure management
- Cannot manage roles (reserved for SUPER_ADMIN)

**Use Case**: HR managers, HR directors

#### DEPARTMENT_HEAD (Level 70)
**Access**: HOME, EMPLOYEES, ATTENDANCE, LEAVE, LETTERS with DEPARTMENT scope

- Manage employees within their department
- Approve leave requests for department staff
- View and manage department attendance
- Generate letters for department employees
- **Cannot** access: Organization-wide settings, shifts, other departments' data

**Use Case**: Department managers, team leads

#### HR_OFFICER (Level 60)
**Access**: HOME, EMPLOYEES, ORGANIZATION with ORGANIZATION scope

- Employee management across organization
- Organization structure management
- **Cannot** access: Attendance, shifts, letters, leave management

**Use Case**: HR coordinators, recruitment specialists

#### EMPLOYEE (Level 10)
**Access**: HOME with PERSONAL scope + Personal Space

- View personal dashboard
- Full access to Personal Space:
  - My Attendance (punch in/out, view records)
  - My Letters (request and download letters)
  - My Leaves (submit requests, view history)
  - My Account (update profile, change password)
- **Cannot** access: Any administrative modules or other users' data

**Use Case**: All regular employees

### Personal Space (All Roles)

Every authenticated user, regardless of role, has access to Personal Space:

- **My Attendance**: Clock in/out, view attendance history
- **My Letters**: Request employment letters, certificates
- **My Leaves**: Submit leave requests, check leave balance
- **My Account**: Update contact information, change password

---

## Default Test Users

For development and testing, the following test users are created during database setup:

### Super Admin
```
Username: admin
Password: admin123
Role: SUPER_ADMIN
Access: All modules, all data
```

```
Username: superadmin
Password: super123
Role: SUPER_ADMIN
Access: All modules, all data
```

### HR Admin
```
Username: hradmin
Password: hr123
Role: HR_ADMIN
Access: All HR modules, organization-wide data
```

### Department Head
```
Username: depthead
Password: dept123
Role: DEPARTMENT_HEAD
Access: Department-scoped modules
```

### HR Officer
```
Username: hrofficer
Password: officer123
Role: HR_OFFICER
Access: Employee and organization modules
```

### Employee
```
Username: employee
Password: emp123
Role: EMPLOYEE
Access: Home + Personal Space only
```

**⚠️ IMPORTANT**: Change all default passwords before deploying to production!

---

## Key Features

### Core Modules

#### 1. Employee Management
- Complete employee lifecycle management
- Employee profiles with personal and employment details
- Department and position assignments
- Employment history tracking
- Document management (contracts, certificates)

#### 2. Attendance System
- **Manual Check-in/out**: Quick punch in/out buttons
- **Device Integration**: Import from attendance devices
- **Face Recognition**: AI-powered attendance using face-api.js
- Attendance analytics and reports
- Late arrival and early departure tracking
- Overtime calculation

#### 3. Leave Management
- Leave request submission workflow
- Multi-level approval process
- Leave balance tracking
- Leave type configuration (annual, sick, maternity, etc.)
- Leave calendar and analytics
- Automatic leave balance calculations

#### 4. Department & Organization
- Organizational structure management
- Department hierarchy
- Position management
- Employment level configuration
- Organizational chart visualization

#### 5. Letters & Documents
- Employment letter generation
- Experience certificate generation
- Custom letter templates
- PDF generation with company branding
- Letter approval workflow
- Digital signature integration

#### 6. Shift Management
- Flexible shift configurations
- Shift assignment to employees
- Shift rotation scheduling
- Night shift and overtime tracking

#### 7. User Management
- Role-based access control
- User account lifecycle
- Password management
- Session management
- Activity logging

### Advanced Features

#### Face Recognition Attendance
- AI-powered facial recognition using face-api.js
- Real-time face detection and verification
- Model training with employee photos
- High accuracy and speed
- Works in browser (no server-side processing needed)

#### Multi-Tab Session Synchronization
- Automatic login/logout across browser tabs
- Shared session state using localStorage
- Real-time session updates
- Prevents authentication conflicts

#### Activity-Based Timeout
- Smart session management based on user activity
- Configurable idle timeout
- Warning system before timeout
- Automatic session refresh on activity

#### Public Holiday Management
- Ethiopian holiday calendar integration
- Automatic holiday detection
- Custom holiday configuration
- Holiday impact on leave calculations

#### Audit Logging
- Complete system activity tracking
- User action logging
- Data change history
- Compliance and security monitoring

#### Notifications
- Real-time notification system
- Leave request notifications
- Approval reminders
- System announcements

#### Analytics & Reports
- Attendance analytics dashboards
- Leave balance reports
- Employee statistics
- Department performance metrics
- Export to Excel/PDF

---

## Project Structure

```
Mesob HRMS/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers (authController, employeeController, etc.)
│   │   ├── services/         # Business logic (authService, moduleAuthService, etc.)
│   │   ├── routes/           # API routes (auth.js, employees.js, etc.)
│   │   ├── middleware/       # Auth, error handling, file uploads
│   │   │   ├── auth.js           # JWT authentication
│   │   │   ├── moduleAuth.js     # Module-based authorization
│   │   │   └── errorHandler.js   # Error handling
│   │   ├── config/           # Configuration files
│   │   │   ├── db.js             # Database connection
│   │   │   ├── minio.js          # MinIO configuration
│   │   │   └── env.js            # Environment variables
│   │   ├── utils/            # Helper functions
│   │   └── validation/       # Input validation schemas
│   ├── scripts/              # Database and maintenance scripts
│   │   ├── dbInit.js             # Database initialization
│   │   ├── migrate.js            # Migration runner
│   │   └── checkTables.js        # Database verification
│   ├── server.js             # Application entry point
│   ├── package.json          # Dependencies and scripts
│   └── .env                  # Environment configuration
│
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── common/           # Generic components (Button, Card, etc.)
│   │   │   ├── layout/           # Layout components (Sidebar, Header)
│   │   │   └── forms/            # Form components
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.jsx     # Home dashboard
│   │   │   ├── Employees/        # Employee management pages
│   │   │   ├── Attendance/       # Attendance pages
│   │   │   ├── Leave/            # Leave management pages
│   │   │   └── PersonalSpace/    # Personal space pages
│   │   ├── context/          # React context providers
│   │   │   ├── AuthContext.jsx   # Authentication state
│   │   │   └── ThemeContext.jsx  # Theme management
│   │   ├── hooks/            # Custom React hooks
│   │   │   └── useModulePermissions.js
│   │   ├── api/              # API client functions
│   │   │   ├── authApi.js
│   │   │   ├── employeeApi.js
│   │   │   └── attendanceApi.js
│   │   ├── utils/            # Helper utilities
│   │   ├── routes/           # Route configuration
│   │   │   └── ModularAppRouter.jsx
│   │   └── App.jsx           # Root component
│   ├── public/
│   │   └── models/           # Face recognition ML models
│   ├── package.json          # Dependencies and scripts
│   └── .env                  # Environment configuration
│
├── database/
│   ├── schema.sql            # Database schema
│   └── seed.sql              # Initial data seeding
│
├── README.md                 # This file
└── .gitignore                # Git ignore rules
```

---

## Testing

### Backend Testing

**Run All Tests:**
```bash
cd backend
npm test
```

**Run Specific Test Suite:**
```bash
npm test -- auth.test.js
```

**Test Coverage:**
```bash
npm run test:coverage
```

### Frontend Testing

**Run Component Tests:**
```bash
cd frontend
npm run test
```

**Run E2E Tests:**
```bash
npm run test:e2e
```

### Manual Testing Checklist

#### Test Different Roles

1. **Login as SUPER_ADMIN**
   - ✓ Should see all 7 modules in navigation
   - ✓ Can access all pages
   - ✓ Can view all organizational data
   - ✓ Can access Role Management

2. **Login as DEPARTMENT_HEAD**
   - ✓ Should see: HOME, EMPLOYEES, ATTENDANCE, LEAVE, LETTERS
   - ✓ Should NOT see: ORGANIZATION, SHIFTS, Role Management
   - ✓ Data filtered to department only
   - ✓ Cannot view other departments' employees

3. **Login as EMPLOYEE**
   - ✓ Should see only HOME
   - ✓ Personal Space always visible
   - ✓ Can punch in/out
   - ✓ Can submit leave requests
   - ✓ Can only see own data

#### Test Permission Enforcement

```bash
# Get user permissions (requires authentication token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/module-roles/permissions/me

# Check module access
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5000/api/module-roles/permissions/check?moduleCode=EMPLOYEES"

# Try accessing restricted endpoint (should return 403)
curl -H "Authorization: Bearer EMPLOYEE_TOKEN" \
  http://localhost:5000/api/departments
```

#### Test API Endpoints

```bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get employees (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/employees

# Get attendance records
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/attendance
```

### Performance Benchmarks

Expected response times (under normal load):

- Login: < 500ms
- Get Modules: < 100ms
- List Employees (100 records): < 300ms
- CRUD Operations: < 200ms
- Page Load: < 1s
- Face Recognition: < 2s (client-side)

---

## Deployment

### Production Environment Setup

#### 1. Database Migration

```bash
# IMPORTANT: Backup existing database first!
mysqldump -u root -p mesob_hrms > backup_$(date +%Y%m%d).sql

# For fresh installation
cd backend
npm run db:setup

# Verify
node scripts/checkTables.js
```

#### 2. Backend Deployment

**Using PM2 (Recommended):**

```bash
cd backend

# Install dependencies
npm ci --production

# Start with PM2
pm2 start server.js --name mesob-hrms-backend

# Configure PM2 startup
pm2 startup
pm2 save

# View logs
pm2 logs mesob-hrms-backend

# Monitor
pm2 monit
```

**Using systemd:**

Create `/etc/systemd/system/mesob-hrms.service`:

```ini
[Unit]
Description=Mesob HRMS Backend
After=network.target mysql.service

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/mesob-hrms/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable mesob-hrms
sudo systemctl start mesob-hrms
sudo systemctl status mesob-hrms
```

#### 3. Frontend Deployment

**Build for Production:**

```bash
cd frontend
npm run build
```

**Deploy to Web Server:**

**Nginx Configuration:**

```nginx
server {
    listen 80;
    server_name hrms.yourdomain.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name hrms.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/ssl/certs/your_cert.crt;
    ssl_certificate_key /etc/ssl/private/your_key.key;

    # Frontend (React SPA)
    root /var/www/mesob-hrms;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

**Apache Configuration:**

```apache
<VirtualHost *:80>
    ServerName hrms.yourdomain.com
    Redirect permanent / https://hrms.yourdomain.com/
</VirtualHost>

<VirtualHost *:443>
    ServerName hrms.yourdomain.com

    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/your_cert.crt
    SSLCertificateKeyFile /etc/ssl/private/your_key.key

    DocumentRoot /var/www/mesob-hrms

    <Directory /var/www/mesob-hrms>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # React Router - redirect all to index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Proxy API requests to backend
    ProxyPass /api/ http://localhost:5000/api/
    ProxyPassReverse /api/ http://localhost:5000/api/
</VirtualHost>
```

#### 4. MinIO Setup (Object Storage)

```bash
# Install MinIO
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
sudo mv minio /usr/local/bin/

# Create data directory
sudo mkdir -p /data/minio

# Run MinIO
minio server /data/minio --console-address ":9001"

# Or use Docker
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -v /data/minio:/data \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=your_secure_password" \
  minio/minio server /data --console-address ":9001"
```

#### 5. Database Security

```sql
-- Create production database user with limited privileges
CREATE USER 'mesob_hrms_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON mesob_hrms.* TO 'mesob_hrms_user'@'localhost';
FLUSH PRIVILEGES;
```

#### 6. Environment Variables (Production)

**Backend .env:**
```env
NODE_ENV=production
PORT=5000

DB_HOST=localhost
DB_USER=mesob_hrms_user
DB_PASSWORD=your_secure_database_password
DB_NAME=mesob_hrms

JWT_SECRET=your_very_long_and_secure_secret_key_change_this
JWT_REFRESH_SECRET=your_very_long_and_secure_refresh_secret_key_change_this
JWT_EXPIRES_IN=8h
JWT_REFRESH_EXPIRES_IN=7d

MINIO_ENDPOINT=minio.yourdomain.com
MINIO_PORT=9000
MINIO_ACCESS_KEY=your_minio_access_key
MINIO_SECRET_KEY=your_minio_secret_key
MINIO_USE_SSL=true

SESSION_TIMEOUT=28800000
```

**Frontend .env:**
```env
VITE_API_BASE_URL=https://hrms.yourdomain.com/api
VITE_APP_NAME=Mesob HRMS
VITE_SESSION_TIMEOUT=28800000
VITE_IDLE_TIMEOUT=3600000
```

### Security Checklist

Before going to production:

- [ ] Change all default passwords (database, admin users, MinIO)
- [ ] Use strong JWT secrets (minimum 32 characters, random)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure proper CORS origins (remove wildcard *)
- [ ] Set up firewall rules (only expose ports 80, 443)
- [ ] Enable database backups (daily automated backups)
- [ ] Restrict database user privileges
- [ ] Set up monitoring and logging
- [ ] Configure rate limiting on API endpoints
- [ ] Review and restrict file upload types and sizes
- [ ] Enable security headers (CSP, HSTS, etc.)
- [ ] Update all dependencies to latest secure versions
- [ ] Disable directory listing in web server
- [ ] Remove or secure database management tools (phpMyAdmin, etc.)
- [ ] Set up intrusion detection (fail2ban, etc.)

### Post-Deployment Verification

```bash
# 1. Health check
curl https://hrms.yourdomain.com/api/health

# 2. Test login
curl -X POST https://hrms.yourdomain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_new_password"}'

# 3. Check modules endpoint
curl https://hrms.yourdomain.com/api/module-roles/modules

# 4. Verify SSL
curl -vI https://hrms.yourdomain.com

# 5. Check database connection
# Login to backend server and run:
cd /opt/mesob-hrms/backend
node scripts/checkTables.js
```

### Backup Strategy

**Automated Daily Backups:**

Create `/usr/local/bin/backup-mesob-hrms.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/backups/mesob-hrms"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="mesob_hrms"
DB_USER="root"
DB_PASS="your_password"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# MinIO data backup (optional)
tar -czf "$BACKUP_DIR/minio_$DATE.tar.gz" /data/minio

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $DATE"
```

Schedule with cron:
```bash
sudo crontab -e
# Add line:
0 2 * * * /usr/local/bin/backup-mesob-hrms.sh
```

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Cannot connect to database"

**Symptoms**: Backend fails to start, database connection errors

**Solutions**:
```bash
# 1. Verify MySQL is running
sudo systemctl status mysql

# 2. Test database connection
mysql -u your_user -p -h localhost mesob_hrms

# 3. Check .env file configuration
cat backend/.env | grep DB_

# 4. Verify database user privileges
mysql -u root -p -e "SHOW GRANTS FOR 'your_user'@'localhost';"

# 5. Check firewall (if database is remote)
telnet db_host 3306
```

#### Issue: "403 Forbidden on API calls"

**Symptoms**: User can login but gets 403 errors accessing modules

**Solutions**:
```bash
# 1. Verify user has role_uuid assigned
mysql -u root -p mesob_hrms -e "SELECT username, role_uuid FROM Users WHERE username='problematic_user';"

# 2. Check if role has module permissions
mysql -u root -p mesob_hrms -e "
SELECT r.name as role, m.name as module, s.name as scope 
FROM Roles r
JOIN RoleModules rm ON r.uuid = rm.role_uuid
JOIN Modules m ON rm.module_uuid = m.uuid
JOIN Scopes s ON rm.scope_uuid = s.uuid
WHERE r.code = 'USER_ROLE';
"

# 3. Verify middleware is correctly configured
# Check backend route files use requireModule() not authorize()

# 4. Clear browser cache and localStorage
# In browser console: localStorage.clear()
```

#### Issue: "Navigation doesn't show modules"

**Symptoms**: User logs in but sees no navigation items

**Solutions**:
```javascript
// 1. Check browser console for errors
// Open DevTools > Console

// 2. Verify permissions are loaded
// In browser console:
console.log(JSON.parse(localStorage.getItem('user')));
// Should show modulePermissions array

// 3. Check AuthContext is providing permissions
// Verify login() function passes permissions:
// login(userData, permissionsData)

// 4. Force re-login to refresh permissions
// Logout and login again
```

#### Issue: "Slide panels don't open"

**Symptoms**: Clicking add/edit buttons doesn't open side panels

**Solutions**:
```javascript
// 1. Check SlidePanel component props
<SlidePanel
  open={isOpen}              // Must be boolean
  onClose={() => setOpen(false)}  // Must be function
  title="Panel Title"
>
  Content
</SlidePanel>

// 2. Verify useState is properly initialized
const [isOpen, setOpen] = useState(false);

// 3. Check for CSS conflicts
// SlidePanel uses fixed positioning and z-index
```

#### Issue: "Face recognition not working"

**Symptoms**: Camera opens but face detection fails

**Solutions**:
```bash
# 1. Verify models are downloaded
cd frontend
npm run download-models
ls public/models/
# Should show: face_landmark_68_model-weights_manifest.json, etc.

# 2. Check browser console for model loading errors

# 3. Verify HTTPS (face-api requires secure context)
# Use https:// or localhost

# 4. Check camera permissions
# Browser should prompt for camera access

# 5. Test with different browsers
# Chrome and Firefox have best support
```

#### Issue: "MinIO connection error"

**Symptoms**: File uploads fail, document generation fails

**Solutions**:
```bash
# 1. Verify MinIO is running
curl http://localhost:9000/minio/health/live

# 2. Check MinIO credentials in .env
cat backend/.env | grep MINIO

# 3. Test MinIO access
# Open http://localhost:9001 in browser
# Login with MINIO_ACCESS_KEY and MINIO_SECRET_KEY

# 4. Create bucket if missing
# In MinIO console, create bucket named 'hrms-documents'

# 5. Check bucket policy
# Bucket should allow authenticated access
```

#### Issue: "Session timeout too aggressive"

**Symptoms**: Users get logged out frequently

**Solutions**:
```env
# Increase timeout values in backend/.env
JWT_EXPIRES_IN=12h          # Token validity
SESSION_TIMEOUT=43200000    # 12 hours in milliseconds

# Increase timeout in frontend/.env
VITE_SESSION_TIMEOUT=43200000
VITE_IDLE_TIMEOUT=7200000   # 2 hours idle timeout
```

#### Issue: "Database migration failed"

**Symptoms**: npm run db:setup returns errors

**Solutions**:
```bash
# 1. Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'mesob_hrms';"

# 2. Drop and recreate (CAUTION: deletes all data)
mysql -u root -p -e "DROP DATABASE IF EXISTS mesob_hrms; CREATE DATABASE mesob_hrms;"

# 3. Run schema manually
mysql -u root -p mesob_hrms < database/schema.sql

# 4. Check for SQL syntax errors in schema.sql

# 5. Verify MySQL version compatibility
mysql --version
# Requires MySQL 8.0+
```

#### Issue: "Role changes don't take effect"

**Symptoms**: User role updated but permissions don't change

**Solutions**:
```bash
# 1. User needs to logout and login again
# JWT token contains old permissions

# 2. Or invalidate all sessions (nuclear option)
# Restart backend server or change JWT_SECRET

# 3. Verify role update in database
mysql -u root -p mesob_hrms -e "
SELECT u.username, r.name as role 
FROM Users u 
JOIN Roles r ON u.role_uuid = r.uuid 
WHERE u.username = 'username';
"
```

### Performance Issues

#### Issue: "Slow page load times"

**Solutions**:
- Enable gzip compression in web server
- Implement Redis caching for frequently accessed data
- Optimize database queries (add indexes)
- Use CDN for static assets
- Implement pagination for large datasets
- Enable lazy loading for images

#### Issue: "Database queries slow"

**Solutions**:
```sql
-- Add indexes on frequently queried columns
CREATE INDEX idx_users_role_uuid ON Users(role_uuid);
CREATE INDEX idx_employees_department ON Employees(department_uuid);
CREATE INDEX idx_attendance_date ON Attendance(attendance_date);
CREATE INDEX idx_leaves_employee ON Leaves(employee_uuid);

-- Analyze slow queries
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 1;
-- Check /var/log/mysql/slow-query.log
```

### Getting Help

If you encounter issues not covered here:

1. Check browser console for JavaScript errors
2. Check backend logs: `pm2 logs mesob-hrms-backend`
3. Review the [API Documentation](#api-documentation) section
4. Check MySQL error logs: `/var/log/mysql/error.log`
5. Verify all environment variables are set correctly
6. Create an issue in the repository with:
   - Detailed error message
   - Steps to reproduce
   - Environment details (OS, Node version, MySQL version)
   - Relevant log outputs

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "uuid": "user-uuid",
      "username": "admin",
      "employee_id": "EMP001",
      "role_uuid": "role-uuid"
    },
    "modulePermissions": [
      {
        "code": "EMPLOYEES",
        "name": "Employees",
        "scope": {
          "code": "ORGANIZATION",
          "name": "Organization-wide"
        }
      }
    ],
    "token": "jwt.token.here",
    "refreshToken": "refresh.token.here"
  }
}
```

#### POST /api/auth/refresh
Refresh expired JWT token.

**Request:**
```json
{
  "refreshToken": "refresh.token.here"
}
```

#### POST /api/auth/logout
Logout user and invalidate tokens.

### Module Permissions Endpoints

#### GET /api/module-roles/modules
List all application modules.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "uuid": "module-uuid",
      "code": "EMPLOYEES",
      "name": "Employees",
      "description": "Employee management"
    }
  ]
}
```

#### GET /api/module-roles/scopes
List all data access scopes.

#### GET /api/module-roles/roles
List all system roles.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "uuid": "role-uuid",
      "code": "HR_ADMIN",
      "name": "HR Admin",
      "description": "Full HR operations",
      "hierarchy_level": 90,
      "default_scope_uuid": "scope-uuid"
    }
  ]
}
```

#### GET /api/module-roles/permissions/me
Get current user's module permissions.

**Headers:** `Authorization: Bearer <token>`

#### GET /api/module-roles/permissions/check
Check if user has access to specific module.

**Query Parameters:** `moduleCode=EMPLOYEES`

### Employee Endpoints

#### GET /api/employees
List employees (scope-filtered).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `department_uuid`: Filter by department
- `status`: Filter by status (ACTIVE, INACTIVE)
- `search`: Search by name or employee ID

#### POST /api/employees
Create new employee.

**Request:**
```json
{
  "employee_id": "EMP001",
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@company.com",
  "phone": "+251911234567",
  "department_uuid": "dept-uuid",
  "position_uuid": "pos-uuid",
  "hire_date": "2024-01-15"
}
```

#### GET /api/employees/:uuid
Get employee details.

#### PUT /api/employees/:uuid
Update employee information.

#### DELETE /api/employees/:uuid
Delete employee (soft delete).

### Attendance Endpoints

#### GET /api/attendance
List attendance records (scope-filtered).

#### POST /api/attendance/punch-in
Record check-in.

**Request:**
```json
{
  "method": "MANUAL",
  "location": "Office"
}
```

#### POST /api/attendance/punch-out
Record check-out.

#### GET /api/attendance/my-records
Get current user's attendance history.

### Leave Endpoints

#### GET /api/leaves
List leave requests (scope-filtered).

#### POST /api/leaves
Submit leave request.

**Request:**
```json
{
  "leave_type": "ANNUAL",
  "start_date": "2024-07-01",
  "end_date": "2024-07-05",
  "reason": "Family vacation"
}
```

#### PUT /api/leaves/:uuid/approve
Approve leave request.

#### PUT /api/leaves/:uuid/reject
Reject leave request.

#### GET /api/leaves/balance
Get leave balance for user.

### Department Endpoints

#### GET /api/departments
List all departments.

#### POST /api/departments
Create department.

#### PUT /api/departments/:uuid
Update department.

#### DELETE /api/departments/:uuid
Delete department.

### Error Responses

All endpoints may return error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401): Not authenticated
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid request data
- `SERVER_ERROR` (500): Internal server error

---

## Contributing

We welcome contributions to Mesob HRMS! Here's how you can help:

### Development Guidelines

1. **Fork the repository** and create a feature branch
2. **Follow the coding style** used in the project
3. **Write tests** for new features
4. **Update documentation** as needed
5. **Test thoroughly** before submitting

### Code Style

- **Backend**: Follow Airbnb JavaScript Style Guide
- **Frontend**: Use ESLint and Prettier configurations
- **Database**: Use snake_case for columns, PascalCase for tables
- **API**: RESTful conventions, consistent naming

### Pull Request Process

1. Create a feature branch: `git checkout -b feature/your-feature-name`
2. Make your changes and commit: `git commit -m "feat: add new feature"`
3. Push to your fork: `git push origin feature/your-feature-name`
4. Open a Pull Request with:
   - Clear description of changes
   - Reference to related issues
   - Screenshots for UI changes
   - Test results

### Commit Message Format

Follow conventional commits:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting)
- `refactor:` Code refactoring
- `test:` Test additions or changes
- `chore:` Build process or auxiliary tool changes

---

## License

**Proprietary License** - All rights reserved

This software is the property of [Your Organization Name]. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission.

For licensing inquiries, contact: [your-email@domain.com]

---

## Support

### Documentation

- **This README**: Complete setup and usage guide
- **API Documentation**: See [API Documentation](#api-documentation) section
- **Database Schema**: See `database/schema.sql`

### Getting Help

For support, questions, or feature requests:

1. **Check this documentation** - most questions are answered here
2. **Review troubleshooting section** - common issues and solutions
3. **Search existing issues** in the repository
4. **Create a new issue** with detailed information:
   - What you're trying to do
   - What you expected to happen
   - What actually happened
   - Environment details (OS, Node.js version, MySQL version)
   - Relevant error messages and logs

### Contact

- **Email**: support@your-organization.com
- **Issue Tracker**: [GitHub Issues](your-repo-url/issues)
- **Documentation**: [Wiki](your-repo-url/wiki)

---

## Version History

### Version 2.0.0 (Current) - Production Ready
- ✅ Complete module-based RBAC system
- ✅ Removed external authorization dependencies
- ✅ Database-driven permission system
- ✅ Single-command database initialization
- ✅ Comprehensive testing suite
- ✅ Production deployment guide
- ✅ Performance optimizations
- ✅ Security hardening

### Version 1.0.0 - Initial Release
- Basic HRMS functionality
- External authorization service integration
- Employee and attendance management
- Leave management system

---

## Acknowledgments

- **face-api.js** - Face recognition library
- **React** - Frontend framework
- **Express.js** - Backend framework
- **MySQL** - Database system
- **MinIO** - Object storage
- All contributors and testers

---

**Current Version**: 2.0.0  
**Last Updated**: January 2025  
**Status**: Production Ready ✅

---

**Quick Links:**
- [Installation](#installation--setup)
- [Database Setup](#database-setup)
- [User Roles](#user-roles--permissions)
- [Testing](#testing)
- [Deployment](#deployment)
- [API Docs](#api-documentation)
- [Troubleshooting](#troubleshooting)
