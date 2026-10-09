#!/bin/bash

echo "=================================="
echo "HRMS Frontend Fixes Verification"
echo "=================================="
echo ""

cd "$(dirname "$0")"

echo "✓ Checking modified files..."
echo ""

# Check Employee Registration fix
if grep -q "Array.isArray(d?.data)" frontend/src/pages/EmployeeRegistrationPage.jsx; then
    echo "✅ Employee Registration: occupation crash fix applied"
else
    echo "❌ Employee Registration: fix NOT found"
fi

# Check Attendance fix
if grep -q "Array.isArray(res?.data)" frontend/src/pages/AttendancePage.jsx; then
    echo "✅ Attendance Records: crash fix applied"
else
    echo "❌ Attendance Records: fix NOT found"
fi

# Check LogsPage RBAC
if grep -q "PermissionGuard" frontend/src/pages/LogsPage.jsx; then
    echo "✅ Audit Logs: RBAC protection added"
else
    echo "❌ Audit Logs: RBAC NOT found"
fi

# Check database schema
if grep -q "mother_name.*VARCHAR(255)" database/schema.sql; then
    echo "✅ Database Schema: mother_name field expanded to VARCHAR(255)"
else
    echo "⚠️  Database Schema: mother_name still VARCHAR(100)"
fi

echo ""
echo "=================================="
echo "Backup Files"
echo "=================================="
echo ""

if [ -f "frontend/src/pages/EmployeeRegistrationPage.jsx.backup" ]; then
    echo "✅ Employee Registration backup exists"
fi

if [ -f "database/schema.sql.backup" ]; then
    echo "✅ Database schema backup exists"
fi

echo ""
echo "=================================="
echo "Next Steps"
echo "=================================="
echo ""
echo "1. Run: cd frontend && npm run build"
echo "2. Test Employee Registration page"
echo "3. Test Attendance Records tab"
echo "4. Test Audit Logs access control"
echo "5. Run database migration if needed:"
echo "   ALTER TABLE employees MODIFY COLUMN mother_name VARCHAR(255);"
echo ""

