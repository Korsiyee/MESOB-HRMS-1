# MySQL Password Reset Guide

The database setup failed because the MySQL root password is incorrect or not set properly.

## Option 1: Reset MySQL Root Password (Recommended)

### Step 1: Stop MySQL Service
```cmd
net stop MySQL80
```

### Step 2: Start MySQL in Safe Mode
1. Open Command Prompt as Administrator
2. Navigate to MySQL bin directory:
```cmd
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
```

3. Start MySQL without password checking:
```cmd
mysqld --console --skip-grant-tables --shared-memory
```

Leave this window open.

### Step 3: Reset Password (New CMD Window)
Open a NEW Command Prompt as Administrator:

```cmd
cd "C:\Program Files\MySQL\MySQL Server 8.0\bin"
mysql -u root
```

In MySQL prompt, run:
```sql
FLUSH PRIVILEGES;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'newpassword123';
FLUSH PRIVILEGES;
EXIT;
```

### Step 4: Stop Safe Mode MySQL
Close the first CMD window (Ctrl+C) to stop the safe mode MySQL.

### Step 5: Start MySQL Normally
```cmd
net start MySQL80
```

### Step 6: Update .env File
Edit `backend\.env` and set:
```env
DB_PASSWORD=newpassword123
```

### Step 7: Run Setup Again
```cmd
cd backend
npm run db:init
```

---

## Option 2: Use MySQL Workbench to Reset

1. Open **MySQL Workbench**
2. Go to **Server** → **Users and Privileges**
3. Select **root** user
4. Click **Change Password**
5. Enter new password: `newpassword123`
6. Click **Apply**

Then update `backend\.env`:
```env
DB_PASSWORD=newpassword123
```

---

## Option 3: Create New MySQL User (Alternative)

If you can't reset root password, create a new user:

### Using MySQL Workbench:
1. Open MySQL Workbench
2. Go to **Server** → **Users and Privileges**
3. Click **Add Account**
4. Username: `hrms_user`
5. Password: `hrms_password123`
6. Under **Schema Privileges**, select `hrms_leave_service` and click **Add**
7. Grant all privileges
8. Click **Apply**

### Using MySQL Command (if you can login with current password):
```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p
```

Then run:
```sql
CREATE USER 'hrms_user'@'localhost' IDENTIFIED BY 'hrms_password123';
GRANT ALL PRIVILEGES ON hrms_leave_service.* TO 'hrms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Update .env File:
```env
DB_USER=hrms_user
DB_PASSWORD=hrms_password123
```

---

## Option 4: Fresh MySQL Installation

If all else fails:

1. Uninstall MySQL completely
2. Delete `C:\ProgramData\MySQL` folder
3. Download fresh MySQL installer: https://dev.mysql.com/downloads/installer/
4. Install and set a NEW root password during installation
5. Remember the password!
6. Update `backend\.env` with the new password

---

## After Password Is Fixed

Run the setup again:

```cmd
cd C:\Users\Abigia\Desktop\h\Mesob-HRMS\backend
npm run db:init
```

You should see:
```
✓ Database connection successful
✓ Creating database...
✓ Creating tables...
✓ Database initialized successfully!
```

---

## Quick Test

Test if your password works:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p -e "SELECT 'SUCCESS!' AS Test;"
```

If you see "SUCCESS!", your password is correct!

---

## Need Help?

If you're still stuck:

1. Check MySQL documentation: https://dev.mysql.com/doc/
2. Ensure MySQL service is running: `net start MySQL80`
3. Try connecting with MySQL Workbench first
4. Contact your system administrator

---

**Once the password issue is resolved, the automated setup will continue smoothly!**
