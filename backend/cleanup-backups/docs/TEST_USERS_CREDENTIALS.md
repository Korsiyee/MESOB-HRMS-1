# Test Users and Credentials

## All Test Users Created

Use these credentials to test different role permissions:

### Super Admin Access
```
Username: admin
Password: admin123
Role: SUPER_ADMIN
Access: All modules (Home, Employees, Organization, Attendance, Shifts, Letters, Leave)
```

```
Username: superadmin
Password: super123
Role: SUPER_ADMIN
Access: All modules
```

### HR Admin Access
```
Username: hradmin
Password: hr123
Role: HR_ADMIN
Access: Most modules except some organization structure management
```

### Department Head Access
```
Username: depthead
Password: dept123
Role: DEPARTMENT_HEAD  
Access: Department-scoped data (employees, attendance, leave in their department)
```

### HR Officer Access
```
Username: hrofficer
Password: officer123
Role: HR_OFFICER
Access: Similar to HR Admin with some limitations
```

### Employee Access
```
Username: employee
Password: emp123
Role: EMPLOYEE
Access: Home + Personal Space only (My Attendance, My Letters, My Leaves, My Account)
```

## Testing the Module Permissions

1. **Login as different users** to see how navigation changes
2. **Employee role** should only see:
   - Home
   - Personal Space (My Attendance, My Letters, My Leaves, My Account)

3. **Department Head** should see:
   - Home
   - Attendance (department-scoped)
   - Leave (department-scoped)
   - Personal Space

4. **HR Admin/Super Admin** should see:
   - All modules in navigation
   - All features accessible

## Quick Login Commands

```bash
# In browser console or API testing:
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}

# Or use the frontend login page with any of the credentials above
```

## Notes

- All users are active by default
- Passwords are hashed with bcrypt
- Personal Space is always visible for ALL authenticated users
- Module visibility is controlled by role permissions in the database
- If you need to reset a password, use the account management page or SQL:
  ```sql
  UPDATE Users SET password = '$2b$10$...' WHERE username = 'username';
  ```

