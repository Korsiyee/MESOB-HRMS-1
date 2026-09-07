# MESOB HRMS - Human Resource Management System

A comprehensive HR management system for Ethiopian organizations, featuring attendance tracking, leave management, employee administration, and advanced face recognition capabilities.

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MySQL 8.0+
- MinIO Server (for file storage)
- Modern browser with camera support (for face recognition)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd HR-Leave/hrms-leave-service
```

2. **Backend Setup**
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database and MinIO credentials
npm run db:migrate
npm start
```

3. **Frontend Setup**
```bash
cd frontend
npm install
npm run download-models  # Download face recognition models
npm run dev
```

4. **Access the Application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- MinIO Console: http://localhost:9001

## 📋 Features Overview

### Core Modules
- **Employee Management** - Complete employee lifecycle management
- **Attendance System** - Manual, device, and face recognition check-in/out
- **Leave Management** - Leave requests, approvals, and balance tracking
- **Department & Position** - Organizational structure management
- **User Accounts** - Role-based access control (Admin, HR, Department Head, Employee)
- **Letters & Documents** - PDF generation for employment letters and certificates
- **Notifications** - Real-time notifications for requests and approvals
- **Analytics & Reports** - Attendance and leave analytics with export capabilities

### Advanced Features
- **Face Recognition Attendance** - AI-powered attendance using face-api.js
- **Multi-tab Session Sync** - Automatic login/logout across browser tabs
- **Activity-based Timeout** - Smart session management with warning system
- **Public Holiday Management** - Automatic Ethiopian holiday calendar integration
- **Shift Management** - Flexible shift configurations
- **Audit Logging** - Complete system activity tracking

## 🛠 Tech Stack

### Backend
- Node.js + Express.js
- MySQL 2 (Database)
- JWT Authentication
- MinIO (Object Storage)
- Puppeteer (PDF Generation)
- bcrypt (Password Hashing)

### Frontend
- React 19
- React Router v7
- Vite (Build Tool)
- Tailwind CSS
- face-api.js (Face Recognition)
- Recharts (Analytics)
- Axios (HTTP Client)

## 🔐 Default Credentials

**Admin Account**
- Username: `admin`
- Password: Set during initial setup

## 📚 Documentation

For detailed system functionality, architecture, and API documentation, see:
- **[SYSTEM_DOCUMENTATION.md](./SYSTEM_DOCUMENTATION.md)** - Complete system behavior and technical details

## 🏗 Project Structure

```
hrms-leave-service/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── routes/           # API routes
│   │   ├── middleware/       # Auth, error handling, uploads
│   │   └── config/           # Database, MinIO, environment
│   ├── scripts/              # Migration and setup scripts
│   └── server.js             # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/            # Page components
│   │   ├── context/          # React context (Auth, Theme)
│   │   ├── api/              # API client functions
│   │   └── utils/            # Helpers and utilities
│   └── public/
│       └── models/           # Face recognition ML models
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=hrms_leave_service
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=admin
MINIO_SECRET_KEY=password123
JWT_SECRET=your_secret_key
JWT_REFRESH_SECRET=your_refresh_key
JWT_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=7d
```

### Database Setup

Run migrations to set up the database:
```bash
cd backend
npm run db:migrate
```

Optional: Seed with sample data
```bash
npm run db:setup
```

### Face Recognition Setup

Download required ML models:
```bash
cd frontend
npm run download-models
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm run test
```

## 📦 Deployment

### Production Build

**Frontend**
```bash
cd frontend
npm run build
# Deploy dist/ folder to your web server
```

**Backend**
```bash
cd backend
npm start
# Use PM2 or similar for process management
```

### Security Checklist
- [ ] Change default JWT secrets
- [ ] Use strong database passwords
- [ ] Enable HTTPS
- [ ] Configure proper CORS origins
- [ ] Set up firewall rules
- [ ] Regular database backups
- [ ] Update dependencies regularly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

Proprietary - All rights reserved

## 👥 Support

For issues, questions, or feature requests:
- Create an issue in the repository
- Contact the development team
- Check SYSTEM_DOCUMENTATION.md for technical details

## 🔄 Version

Current Version: **1.0.0**

Last Updated: June 2026

