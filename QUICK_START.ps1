# Mesob HRMS - Quick Setup Script (PowerShell)
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Mesob HRMS - Quick Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "WARNING: Not running as Administrator. Some operations may fail." -ForegroundColor Yellow
    Write-Host ""
}

# Step 1: Install Backend Dependencies
Write-Host "Step 1: Installing Backend Dependencies..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Set-Location backend

if (Test-Path "node_modules") {
    Write-Host "Dependencies already installed" -ForegroundColor Yellow
} else {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: Failed to install backend dependencies" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "Backend dependencies ready!" -ForegroundColor Green
Write-Host ""

# Step 2: Create .env file
Write-Host "Step 2: Setting up .env file..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

if (-not (Test-Path ".env")) {
    Write-Host "Creating .env file..." -ForegroundColor Cyan
    
    $envContent = @"
# Server Configuration
PORT=5000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=hrms_leave_service
DB_CONNECTION_LIMIT=10

# JWT Configuration (CHANGE THESE IN PRODUCTION!)
JWT_SECRET=change_this_secret_key_in_production_$(Get-Random)
JWT_REFRESH_SECRET=change_this_refresh_secret_key_in_production_$(Get-Random)
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
"@
    
    $envContent | Out-File -FilePath ".env" -Encoding UTF8
    Write-Host ".env file created!" -ForegroundColor Green
    Write-Host ""
    Write-Host "IMPORTANT: Please edit .env and set your MySQL root password" -ForegroundColor Yellow
    Write-Host ""
    $openEnv = Read-Host "Open .env file now? (y/n)"
    if ($openEnv -eq "y") {
        notepad .env
    }
} else {
    Write-Host ".env file already exists" -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Check MySQL
Write-Host "Step 3: Checking MySQL..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
if (Test-Path $mysqlPath) {
    Write-Host "MySQL found: $mysqlPath" -ForegroundColor Green
} else {
    Write-Host "WARNING: MySQL not found at default location" -ForegroundColor Yellow
    Write-Host "Please ensure MySQL 8.0+ is installed" -ForegroundColor Yellow
}

# Check if MySQL service is running
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue
if ($mysqlService) {
    if ($mysqlService.Status -eq "Running") {
        Write-Host "MySQL service is running" -ForegroundColor Green
    } else {
        Write-Host "MySQL service is not running" -ForegroundColor Yellow
        $startService = Read-Host "Start MySQL service? (y/n)"
        if ($startService -eq "y") {
            try {
                Start-Service $mysqlService.Name
                Write-Host "MySQL service started" -ForegroundColor Green
            } catch {
                Write-Host "Failed to start MySQL service. Please start it manually." -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "MySQL service not found" -ForegroundColor Yellow
}
Write-Host ""

# Step 4: Database Setup
Write-Host "Step 4: Database Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "This will create the database and all tables" -ForegroundColor Cyan
Write-Host ""

$continue = Read-Host "Continue with database setup? (y/n)"
if ($continue -ne "y") {
    Write-Host "Setup cancelled. Run this script again when ready." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 0
}

Write-Host ""
Write-Host "Running database initialization..." -ForegroundColor Cyan
npm run db:init

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Database initialization failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Possible reasons:" -ForegroundColor Yellow
    Write-Host "1. MySQL is not running" -ForegroundColor Yellow
    Write-Host "2. Incorrect database credentials in .env" -ForegroundColor Yellow
    Write-Host "3. Database user lacks permissions" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please fix the issue and run: npm run db:init" -ForegroundColor Cyan
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Database initialized successfully!" -ForegroundColor Green
Write-Host ""

# Step 5: Verify Database
Write-Host "Step 5: Verify Database Setup..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
npm run db:verify
Write-Host ""

# Step 6: Initialize Holidays
Write-Host "Step 6: Initialize Ethiopian Holidays..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
npm run holidays:init
Write-Host ""

# Step 7: Frontend Setup
Write-Host "Step 7: Frontend Setup" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Set-Location ..\frontend

$setupFrontend = Read-Host "Setup frontend now? (y/n)"
if ($setupFrontend -eq "y") {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Cyan
    npm install
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Frontend dependencies installed!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Downloading face recognition models (8MB)..." -ForegroundColor Cyan
        npm run download-models
        Write-Host "Models downloaded!" -ForegroundColor Green
    }
}

Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Verify backend\.env has correct MySQL password" -ForegroundColor White
Write-Host "2. Install and setup MinIO (see DATABASE_SETUP.md)" -ForegroundColor White
Write-Host "3. Start backend:  cd backend & npm start" -ForegroundColor White
Write-Host "4. Start frontend: cd frontend & npm run dev" -ForegroundColor White
Write-Host "5. Access application: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see DATABASE_SETUP.md" -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
