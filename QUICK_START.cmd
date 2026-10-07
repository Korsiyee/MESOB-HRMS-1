@echo off
echo ========================================
echo Mesob HRMS - Quick Setup Script
echo ========================================
echo.

REM Set MySQL path
set MYSQL_PATH="C:\Program Files\MySQL\MySQL Server 8.0\bin"
set PATH=%PATH%;%MYSQL_PATH%

echo Step 1: Installing Backend Dependencies...
echo ========================================
cd backend
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install backend dependencies
    pause
    exit /b 1
)
echo Backend dependencies installed successfully!
echo.

echo Step 2: Setting up .env file...
echo ========================================
if not exist .env (
    echo Creating .env file from template...
    (
        echo # Server Configuration
        echo PORT=5000
        echo NODE_ENV=development
        echo.
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_USER=root
        echo DB_PASSWORD=
        echo DB_NAME=hrms_leave_service
        echo DB_CONNECTION_LIMIT=10
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=change_this_secret_key_in_production_12345
        echo JWT_REFRESH_SECRET=change_this_refresh_secret_key_in_production_67890
        echo JWT_EXPIRES_IN=15m
        echo JWT_REFRESH_EXPIRES_IN=7d
        echo.
        echo # MinIO Configuration
        echo MINIO_ENDPOINT=localhost
        echo MINIO_PORT=9000
        echo MINIO_USE_SSL=false
        echo MINIO_ACCESS_KEY=minioadmin
        echo MINIO_SECRET_KEY=minioadmin
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=http://localhost:5173
    ) > .env
    echo .env file created!
    echo.
    echo IMPORTANT: Edit backend\.env and set your MySQL root password!
    echo Press any key to open .env file in notepad...
    pause
    notepad .env
) else (
    echo .env file already exists
)
echo.

echo Step 3: Database Setup
echo ========================================
echo Please ensure MySQL is running before continuing.
echo.
set /p continue="Continue with database setup? (y/n): "
if /i not "%continue%"=="y" (
    echo Setup cancelled. Run this script again when ready.
    pause
    exit /b 0
)

echo.
echo Running database initialization...
call npm run db:init
if errorlevel 1 (
    echo.
    echo ERROR: Database initialization failed!
    echo.
    echo Possible reasons:
    echo 1. MySQL is not running
    echo 2. Incorrect database credentials in .env
    echo 3. Database user lacks permissions
    echo.
    echo Please fix the issue and run: npm run db:init
    pause
    exit /b 1
)
echo Database initialized successfully!
echo.

echo Step 4: Verify Database Setup...
echo ========================================
call npm run db:verify
echo.

echo Step 5: Initialize Ethiopian Holidays...
echo ========================================
call npm run holidays:init
echo.

echo ========================================
echo Backend Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Edit backend\.env if needed (database password, etc.)
echo 2. Install and setup MinIO (see DATABASE_SETUP.md)
echo 3. Start backend: npm start
echo 4. Setup frontend: cd ..\frontend ^& npm install
echo 5. Download models: npm run download-models
echo 6. Start frontend: npm run dev
echo.
echo For detailed instructions, see DATABASE_SETUP.md
echo.
pause
