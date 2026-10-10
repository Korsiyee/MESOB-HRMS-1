# Mesob HRMS

Human Resources Management System for the Federal Democratic Republic of Ethiopia

## Quick Setup

### Prerequisites
- Node.js 18+
- MySQL 8.0+
- MinIO Server (for file storage)

### Database Setup

1. Create database:
```bash
mysql -u root -p -e "CREATE DATABASE hrms_db;"
```

2. Initialize schema:
```bash
mysql -u root -p hrms_db < database/schema.sql
```

3. Load sample data:
```bash
mysql -u root -p hrms_db < database/seed.sql
```

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database credentials
npm start
```

Backend runs on `http://localhost:5000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

## Test Credentials

The seed file creates 10 sample employees. Login with:

**Super Admin:**
- Email: `super.admin@fdre.gov.et`
- Password: `mesob2024`

**HR Admin:**
- Email: `hr.admin@fdre.gov.et`
- Password: `mesob2024`

**Other users:** Check `database/seed.sql` for more test accounts

## Static Role-Based Access Control (RBAC)

The system uses 5 fixed roles with pre-defined permissions:

1. **SUPER_ADMIN** - Full system access, manages all modules
2. **HR_ADMIN** - Manages employees, attendance, leave, letters
3. **DEPARTMENT_HEAD** - Views department data, approves leave
4. **HR_OFFICER** - Processes HR requests, generates reports
5. **EMPLOYEE** - Self-service: view profile, request leave, check attendance

Roles are defined in the database and cannot be modified through the UI. Each role has specific module access defined in `backend/src/config/roleModuleMapping.js`.

## Key Features

- Employee Management (registration, profiles, documents)
- Attendance Tracking (face recognition integration ready)
- Leave Management (request, approval workflow)
- Letter Generation (employment verification, experience letters)
- Department & Level Management
- Audit Logging
- Role-Based Access Control

## Project Structure

```
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite UI
├── database/         # SQL schema and seed files
└── docs/             # API documentation
```

## Environment Configuration

### Backend (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hrms_db
JWT_SECRET=your_jwt_secret
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api
```

## License

Proprietary - Hru Software Enginners Fifth Year Students
