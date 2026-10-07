# Software Requirements Specification (SRS)
## Mesob HRMS - Human Resource Management System

**Version:** 1.0.0  
**Date:** September 21, 2026  
**Status:** Active

---

## 1. Introduction

### 1.1 Purpose
This Software Requirements Specification (SRS) document provides a complete description of the functional and non-functional requirements for the Mesob Human Resource Management System (HRMS). It is intended for developers, testers, project managers, and stakeholders involved in the development and deployment of the system.

### 1.2 Scope
Mesob HRMS is a comprehensive web-based human resource management system designed for Ethiopian organizations. The system manages employee lifecycle, attendance tracking, leave management, organizational structure, and document generation with advanced face recognition capabilities.

**Key Features:**
- Employee lifecycle management
- Multi-modal attendance tracking (manual, device-based, face recognition)
- Leave request and approval workflow
- Department and position hierarchy management
- Role-based access control (RBAC)
- Letter and certificate generation
- Real-time notifications
- Analytics and reporting
- Audit logging

### 1.3 Definitions, Acronyms, and Abbreviations
- **HRMS**: Human Resource Management System
- **RBAC**: Role-Based Access Control
- **JWT**: JSON Web Token
- **API**: Application Programming Interface
- **REST**: Representational State Transfer
- **MinIO**: S3-compatible object storage system
- **ML**: Machine Learning
- **PDF**: Portable Document Format

### 1.4 Document Conventions
- Requirements are numbered hierarchically (e.g., FR-1, FR-1.1)
- **SHALL** indicates mandatory requirements
- **SHOULD** indicates recommended requirements
- **MAY** indicates optional requirements

### 1.5 Intended Audience
- Software developers
- QA engineers
- Project managers
- System administrators
- Business stakeholders
- End users (HR staff, managers, employees)

---

## 2. Overall Description

### 2.1 Product Perspective
Mesob HRMS is a standalone web application consisting of:
- **Backend API**: Node.js/Express REST API
- **Frontend**: React-based single-page application
- **Database**: MySQL 8.0+ for persistent storage
- **Object Storage**: MinIO for file management
- **ML Models**: face-api.js for facial recognition

### 2.2 Product Functions
1. **Authentication & Authorization**
   - Secure login with JWT tokens
   - Role-based access control
   - Multi-tab session synchronization
   - Activity-based session timeout

2. **Employee Management**
   - Complete employee profile management
   - Photo and document upload
   - Employment status tracking
   - Face recognition enrollment

3. **Attendance System**
   - Multiple check-in methods (manual, device, face recognition)
   - Real-time attendance tracking
   - Late arrival and early departure detection
   - Attendance reports and analytics

4. **Leave Management**
   - Leave request submission
   - Multi-level approval workflow
   - Leave balance tracking
   - Leave type configuration

5. **Organizational Structure**
   - Department management
   - Position/job title management
   - Hierarchy and reporting relationships
   - Department head assignments

6. **Document Management**
   - Employment letter generation
   - Certificate generation
   - Template management
   - PDF export capabilities

7. **Notifications**
   - Real-time in-app notifications
   - Leave request alerts
   - Approval notifications
   - System announcements

8. **Analytics & Reporting**
   - Attendance analytics
   - Leave statistics
   - Department-wise reports
   - Exportable reports (PDF, Excel)

### 2.3 User Classes and Characteristics

| User Role | Description | Technical Expertise |
|-----------|-------------|---------------------|
| **Admin** | Full system access, configuration, and user management | High |
| **HR Manager** | Employee management, leave approvals, reports | Medium |
| **Department Head** | Department-specific employee oversight, attendance review | Medium |
| **Employee** | Personal profile, attendance check-in, leave requests | Low |

### 2.4 Operating Environment
- **Client Side**: Modern web browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Server Side**: Node.js 16+ runtime
- **Database**: MySQL 8.0+
- **Storage**: MinIO server for object storage
- **OS**: Windows, Linux, or macOS for server deployment

### 2.5 Design and Implementation Constraints
- Must use JWT for authentication
- Face recognition requires browser camera API support
- File uploads limited to MinIO storage capacity
- Database must support ACID transactions
- PDF generation requires Puppeteer/headless browser

### 2.6 Assumptions and Dependencies
- Stable internet connection for cloud deployment
- Users have modern browsers with camera support for face recognition
- MinIO server is properly configured and accessible
- MySQL database is properly secured and backed up
- SSL/TLS certificates are configured for production

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

#### FR-1: User Login
**Priority**: Critical  
**Description**: Users SHALL be able to log in using username/email and password.

**Requirements**:
- FR-1.1: System SHALL validate credentials against database
- FR-1.2: System SHALL issue JWT access and refresh tokens upon successful authentication
- FR-1.3: System SHALL encrypt passwords using bcrypt
- FR-1.4: System SHALL reject invalid credentials with appropriate error messages
- FR-1.5: System SHALL implement rate limiting to prevent brute force attacks

#### FR-2: Session Management
**Priority**: Critical  
**Description**: System SHALL manage user sessions securely across multiple tabs.

**Requirements**:
- FR-2.1: System SHALL synchronize login/logout across all browser tabs
- FR-2.2: System SHALL implement activity-based session timeout
- FR-2.3: System SHALL display warning before session expiration
- FR-2.4: System SHALL allow session refresh using refresh tokens
- FR-2.5: System SHALL log out users after prolonged inactivity

#### FR-3: Role-Based Access Control
**Priority**: Critical  
**Description**: System SHALL enforce permissions based on user roles.

**Requirements**:
- FR-3.1: System SHALL support roles: Admin, HR, Department Head, Employee
- FR-3.2: System SHALL restrict UI elements based on user permissions
- FR-3.3: System SHALL validate permissions on all API endpoints
- FR-3.4: System SHALL log unauthorized access attempts
- FR-3.5: Admins SHALL be able to assign and modify user roles

### 3.2 Employee Management

#### FR-4: Employee Profile Management
**Priority**: High  
**Description**: HR and Admin SHALL be able to manage employee profiles.

**Requirements**:
- FR-4.1: System SHALL store personal information (name, email, phone, address)
- FR-4.2: System SHALL store employment details (position, department, hire date)
- FR-4.3: System SHALL allow photo upload with face recognition enrollment
- FR-4.4: System SHALL support document attachments (contracts, certificates)
- FR-4.5: System SHALL track employment status (active, inactive, terminated)
- FR-4.6: System SHALL generate unique employee IDs

#### FR-5: Employee Search and Filtering
**Priority**: Medium  
**Description**: Users SHALL be able to search and filter employees.

**Requirements**:
- FR-5.1: System SHALL support search by name, ID, department, position
- FR-5.2: System SHALL support filtering by status, department
- FR-5.3: System SHALL display results in paginated format
- FR-5.4: Department Heads SHALL only view employees in their department

### 3.3 Attendance Management

#### FR-6: Attendance Check-In/Out
**Priority**: High  
**Description**: Employees SHALL be able to record attendance.

**Requirements**:
- FR-6.1: System SHALL support manual check-in/out
- FR-6.2: System SHALL support device-based check-in (future integration)
- FR-6.3: System SHALL support face recognition-based check-in
- FR-6.4: System SHALL record timestamp and location for each check-in
- FR-6.5: System SHALL prevent duplicate check-ins on the same day
- FR-6.6: System SHALL calculate total working hours automatically

#### FR-7: Face Recognition Attendance
**Priority**: Medium  
**Description**: System SHALL support AI-powered face recognition for attendance.

**Requirements**:
- FR-7.1: System SHALL use face-api.js for face detection and recognition
- FR-7.2: System SHALL enroll employee faces during profile setup
- FR-7.3: System SHALL match faces against enrolled database
- FR-7.4: System SHALL have configurable similarity threshold
- FR-7.5: System SHALL handle lighting variations and angles
- FR-7.6: System SHALL provide fallback to manual check-in if face recognition fails

#### FR-8: Attendance Monitoring
**Priority**: High  
**Description**: Managers SHALL be able to monitor employee attendance.

**Requirements**:
- FR-8.1: System SHALL display daily attendance summary
- FR-8.2: System SHALL flag late arrivals and early departures
- FR-8.3: System SHALL track absent employees
- FR-8.4: System SHALL generate attendance reports by date range
- FR-8.5: Department Heads SHALL view their department's attendance

### 3.4 Leave Management

#### FR-9: Leave Request Submission
**Priority**: High  
**Description**: Employees SHALL be able to request leave.

**Requirements**:
- FR-9.1: System SHALL support multiple leave types (annual, sick, emergency, unpaid)
- FR-9.2: System SHALL validate leave balance before submission
- FR-9.3: System SHALL allow date range selection
- FR-9.4: System SHALL require reason for leave
- FR-9.5: System SHALL allow document attachment for sick leave
- FR-9.6: System SHALL prevent overlapping leave requests

#### FR-10: Leave Approval Workflow
**Priority**: High  
**Description**: System SHALL implement multi-level leave approval.

**Requirements**:
- FR-10.1: Leave requests SHALL be routed to Department Head first
- FR-10.2: Department Head approved requests SHALL be routed to HR
- FR-10.3: System SHALL support approve, reject, and request changes actions
- FR-10.4: System SHALL notify requester of status changes
- FR-10.5: System SHALL allow comments at each approval level
- FR-10.6: HR SHALL have final approval authority

#### FR-11: Leave Balance Management
**Priority**: High  
**Description**: System SHALL track employee leave balances.

**Requirements**:
- FR-11.1: System SHALL initialize annual leave balance per policy
- FR-11.2: System SHALL deduct approved leave from balance
- FR-11.3: System SHALL display remaining balance to employees
- FR-11.4: System SHALL support balance carry-forward at year-end
- FR-11.5: System SHALL track used and available leave by type

### 3.5 Organizational Structure

#### FR-12: Department Management
**Priority**: High  
**Description**: Admin SHALL be able to manage departments.

**Requirements**:
- FR-12.1: System SHALL allow creation, update, and deletion of departments
- FR-12.2: System SHALL store department name and description
- FR-12.3: System SHALL assign department heads
- FR-12.4: System SHALL track employee count per department
- FR-12.5: System SHALL prevent deletion of departments with employees

#### FR-13: Position Management
**Priority**: Medium  
**Description**: Admin SHALL be able to manage job positions.

**Requirements**:
- FR-13.1: System SHALL allow creation and management of positions
- FR-13.2: System SHALL define position hierarchy levels
- FR-13.3: System SHALL associate positions with departments
- FR-13.4: System SHALL track employees per position

### 3.6 Document Management

#### FR-14: Letter Generation
**Priority**: Medium  
**Description**: HR SHALL be able to generate employment letters.

**Requirements**:
- FR-14.1: System SHALL generate employment verification letters
- FR-14.2: System SHALL generate experience certificates
- FR-14.3: System SHALL support customizable templates
- FR-14.4: System SHALL auto-populate employee data in templates
- FR-14.5: System SHALL export letters as PDF
- FR-14.6: System SHALL store generated documents in MinIO

#### FR-15: Template Management
**Priority**: Low  
**Description**: Admin SHALL be able to manage document templates.

**Requirements**:
- FR-15.1: System SHALL support HTML-based templates
- FR-15.2: System SHALL support template variables for dynamic data
- FR-15.3: System SHALL allow template upload and preview
- FR-15.4: System SHALL validate template syntax

### 3.7 Notifications

#### FR-16: Real-Time Notifications
**Priority**: Medium  
**Description**: System SHALL provide in-app notifications.

**Requirements**:
- FR-16.1: System SHALL notify employees of leave request status changes
- FR-16.2: System SHALL notify managers of pending approvals
- FR-16.3: System SHALL display notification count in UI
- FR-16.4: System SHALL mark notifications as read/unread
- FR-16.5: System SHALL provide notification history

### 3.8 Analytics & Reporting

#### FR-17: Attendance Analytics
**Priority**: Medium  
**Description**: System SHALL provide attendance analytics.

**Requirements**:
- FR-17.1: System SHALL display attendance trends over time
- FR-17.2: System SHALL show late arrival and early departure statistics
- FR-17.3: System SHALL provide department-wise attendance comparison
- FR-17.4: System SHALL calculate attendance percentage
- FR-17.5: System SHALL export reports as PDF or Excel

#### FR-18: Leave Analytics
**Priority**: Medium  
**Description**: System SHALL provide leave statistics.

**Requirements**:
- FR-18.1: System SHALL display leave utilization by type
- FR-18.2: System SHALL show leave trends by department
- FR-18.3: System SHALL calculate average leave per employee
- FR-18.4: System SHALL identify employees with low/high leave usage

### 3.9 System Administration

#### FR-19: User Account Management
**Priority**: Critical  
**Description**: Admin SHALL manage user accounts.

**Requirements**:
- FR-19.1: System SHALL allow creation of user accounts linked to employees
- FR-19.2: System SHALL support password reset by admin
- FR-19.3: System SHALL enforce strong password policies
- FR-19.4: System SHALL allow account activation/deactivation
- FR-19.5: System SHALL log all user management actions

#### FR-20: Holiday Management
**Priority**: Medium  
**Description**: Admin SHALL manage public holidays.

**Requirements**:
- FR-20.1: System SHALL maintain a holiday calendar
- FR-20.2: System SHALL support Ethiopian holidays by default
- FR-20.3: System SHALL exclude holidays from working day calculations
- FR-20.4: System SHALL allow custom holiday additions

#### FR-21: Shift Management
**Priority**: Low  
**Description**: Admin SHALL configure work shifts.

**Requirements**:
- FR-21.1: System SHALL define shift timings
- FR-21.2: System SHALL assign shifts to employees
- FR-21.3: System SHALL calculate late/early based on shift times
- FR-21.4: System SHALL support multiple shift patterns

#### FR-22: Audit Logging
**Priority**: High  
**Description**: System SHALL log all significant actions.

**Requirements**:
- FR-22.1: System SHALL log user login/logout events
- FR-22.2: System SHALL log data modifications with before/after values
- FR-22.3: System SHALL record user, timestamp, and action type
- FR-22.4: System SHALL make logs tamper-proof
- FR-22.5: Admin SHALL be able to view and search audit logs

---

## 4. Non-Functional Requirements

### 4.1 Performance Requirements

#### NFR-1: Response Time
- Web pages SHALL load within 2 seconds on standard broadband connection
- API requests SHALL respond within 500ms for 95% of requests
- Database queries SHALL execute within 200ms on average
- Face recognition SHALL complete within 3 seconds

#### NFR-2: Throughput
- System SHALL support 500 concurrent users
- System SHALL handle 100 requests per second
- Face recognition SHALL process 10 faces per second

#### NFR-3: Scalability
- System SHALL be horizontally scalable using load balancers
- Database SHALL support up to 100,000 employee records
- File storage SHALL support up to 10TB of documents

### 4.2 Security Requirements

#### NFR-4: Authentication Security
- Passwords SHALL be hashed using bcrypt with salt factor 10+
- JWT tokens SHALL expire after configurable duration (default: 1 day)
- Refresh tokens SHALL expire after configurable duration (default: 7 days)
- System SHALL implement rate limiting: 5 failed login attempts per 15 minutes

#### NFR-5: Data Security
- All API communication SHALL use HTTPS/TLS in production
- Sensitive data SHALL be encrypted at rest in database
- File uploads SHALL be scanned for malware
- Database credentials SHALL not be hardcoded

#### NFR-6: Authorization Security
- All API endpoints SHALL validate JWT tokens
- All API endpoints SHALL enforce role-based permissions
- System SHALL prevent SQL injection through parameterized queries
- System SHALL prevent XSS attacks through input sanitization

#### NFR-7: Privacy
- System SHALL comply with data protection regulations
- Personal data SHALL only be accessible to authorized users
- System SHALL provide data anonymization for reports
- Face recognition data SHALL be stored securely and encrypted

### 4.3 Reliability Requirements

#### NFR-8: Availability
- System SHALL maintain 99.5% uptime during business hours
- System SHALL implement automatic failover for critical services
- Scheduled maintenance SHALL be performed outside business hours

#### NFR-9: Fault Tolerance
- System SHALL handle database connection failures gracefully
- System SHALL retry failed MinIO uploads up to 3 times
- System SHALL log all errors for debugging

#### NFR-10: Backup and Recovery
- Database SHALL be backed up daily
- Backup retention SHALL be 30 days minimum
- System SHALL be recoverable within 4 hours of failure
- File storage SHALL implement versioning

### 4.4 Usability Requirements

#### NFR-11: User Interface
- UI SHALL be responsive and work on desktop, tablet, and mobile
- UI SHALL follow Material Design or similar modern design principles
- UI SHALL provide clear error messages and validation feedback
- UI SHALL support keyboard navigation

#### NFR-12: Accessibility
- System SHOULD comply with WCAG 2.1 Level AA standards
- UI SHOULD support screen readers
- UI SHOULD provide sufficient color contrast
- UI SHOULD support text scaling

#### NFR-13: Localization
- System SHALL display dates in Ethiopian calendar format (optional)
- System SHOULD support English and Amharic languages
- Currency SHALL be displayed in Ethiopian Birr (ETB)

### 4.5 Maintainability Requirements

#### NFR-14: Code Quality
- Code SHALL follow ESLint and Prettier standards
- Code SHALL include JSDoc comments for functions
- Code coverage SHALL be minimum 70% for critical modules
- Code SHALL be modular and follow SOLID principles

#### NFR-15: Documentation
- API SHALL be documented using Swagger/OpenAPI
- System SHALL include deployment documentation
- System SHALL include user manuals
- Code SHALL include README files for setup

#### NFR-16: Monitoring
- System SHALL log errors to centralized logging service
- System SHALL provide health check endpoints
- System SHALL monitor API response times
- System SHALL alert on critical failures

### 4.6 Portability Requirements

#### NFR-17: Platform Independence
- Backend SHALL run on Windows, Linux, and macOS
- Frontend SHALL work on all modern browsers
- Database migrations SHALL be cross-platform compatible
- Docker containers SHALL be provided for easy deployment

---

## 5. System Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   React Frontend (SPA)                                │   │
│  │   - Components, Pages, Context                        │   │
│  │   - Face Recognition (face-api.js)                    │   │
│  │   - State Management                                  │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │   Node.js/Express Backend                             │   │
│  │   - Controllers (Request Handlers)                    │   │
│  │   - Services (Business Logic)                         │   │
│  │   - Middleware (Auth, Validation, Error Handling)     │   │
│  │   - Routes (API Endpoints)                            │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│  ┌─────────────────────┐      ┌──────────────────────────┐  │
│  │   MySQL Database    │      │   MinIO Object Storage   │  │
│  │   - Employee Data   │      │   - Photos               │  │
│  │   - Attendance      │      │   - Documents            │  │
│  │   - Leaves          │      │   - Generated PDFs       │  │
│  │   - Audit Logs      │      │   - Templates            │  │
│  └─────────────────────┘      └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

**Frontend:**
- React 19
- React Router v7
- Vite (Build Tool)
- Tailwind CSS
- Axios
- face-api.js
- Recharts

**Backend:**
- Node.js 16+
- Express.js
- MySQL2 (Database Driver)
- JWT (Authentication)
- bcrypt (Password Hashing)
- Multer (File Upload)
- Puppeteer (PDF Generation)

**Infrastructure:**
- MySQL 8.0+ (Database)
- MinIO (S3-compatible Storage)
- PM2 (Process Management)
- Nginx (Reverse Proxy)

### 5.3 Database Schema (Key Entities)

**Users**
- id, username, email, password_hash, role, employee_id, created_at

**Employees**
- id, first_name, last_name, email, phone, hire_date, position_id, department_id, status, photo_url

**Departments**
- id, name, description, head_id, created_at

**Positions**
- id, title, level, department_id, description

**Attendance**
- id, employee_id, date, check_in, check_out, method, status, notes

**Leaves**
- id, employee_id, leave_type, start_date, end_date, days, reason, status, attachments

**LeaveApprovals**
- id, leave_id, approver_id, level, status, comments, approved_at

**Notifications**
- id, user_id, type, message, is_read, created_at

**AuditLogs**
- id, user_id, action, resource_type, resource_id, changes, ip_address, timestamp

---

## 6. External Interface Requirements

### 6.1 User Interfaces

#### UI-1: Login Page
- Username/email input field
- Password input field with show/hide toggle
- "Remember me" checkbox
- Login button
- Forgot password link (future)

#### UI-2: Dashboard
- Summary cards (total employees, attendance today, pending leaves, etc.)
- Recent activities widget
- Quick action buttons
- Attendance chart
- Leave statistics

#### UI-3: Employee Management Page
- Employee list with search and filters
- Add/Edit employee modal/form
- Photo upload with preview
- Face enrollment interface
- Employee detail view

#### UI-4: Attendance Page
- Calendar view of attendance
- Check-in/check-out buttons
- Face recognition camera interface
- Attendance history table
- Export options

#### UI-5: Leave Management Page
- Leave request form
- Leave balance display
- Pending approvals list (for managers)
- Leave history with status
- Approval/rejection interface

### 6.2 API Interfaces

**Authentication Endpoints:**
```
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET  /api/auth/me
```

**Employee Endpoints:**
```
GET    /api/employees
GET    /api/employees/:id
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
POST   /api/employees/:id/photo
POST   /api/employees/:id/face-enrollment
```

**Attendance Endpoints:**
```
GET    /api/attendance
POST   /api/attendance/checkin
POST   /api/attendance/checkout
POST   /api/attendance/face-checkin
GET    /api/attendance/employee/:id
GET    /api/attendance/reports
```

**Leave Endpoints:**
```
GET    /api/leaves
POST   /api/leaves
GET    /api/leaves/:id
PUT    /api/leaves/:id
POST   /api/leaves/:id/approve
POST   /api/leaves/:id/reject
GET    /api/leaves/balance/:employeeId
```

**Department Endpoints:**
```
GET    /api/departments
POST   /api/departments
PUT    /api/departments/:id
DELETE /api/departments/:id
```

**Notification Endpoints:**
```
GET    /api/notifications
PUT    /api/notifications/:id/read
DELETE /api/notifications/:id
```

### 6.3 Hardware Interfaces

#### HW-1: Camera Interface
- System SHALL access device camera through browser WebRTC API
- Camera SHALL have minimum resolution of 640x480 for face recognition
- System SHALL request camera permissions from user

#### HW-2: Biometric Devices (Future)
- System MAY integrate with fingerprint scanners
- System MAY integrate with RFID card readers
- Integration SHALL use standard SDK/API provided by manufacturer

### 6.4 Software Interfaces

#### SI-1: Database Interface
- MySQL 8.0+ via mysql2 Node.js driver
- Connection pooling for performance
- Prepared statements for security

#### SI-2: Object Storage Interface
- MinIO S3-compatible API
- Bucket structure: hrms-photos, hrms-documents, hrms-templates
- Presigned URLs for secure file access

#### SI-3: Face Recognition Library
- face-api.js v0.22+
- Models: ssd_mobilenetv1, face_landmark_68, face_recognition

---

## 7. Data Requirements

### 7.1 Data Models

**Employee Data:**
- Personal information (name, contact details)
- Employment details (position, department, hire date, salary)
- Status tracking (active, inactive, terminated)
- Face recognition embeddings
- Document attachments

**Attendance Data:**
- Daily check-in/check-out records
- Timestamps with timezone
- Method of recording (manual, device, face)
- Geolocation (optional)
- Status (present, late, absent, half-day)

**Leave Data:**
- Leave requests with date ranges
- Leave types and balances
- Approval workflow states
- Supporting documents
- Historical records

**Organizational Data:**
- Department structure
- Position hierarchy
- Reporting relationships
- Role assignments

### 7.2 Data Retention

- **Employee records**: Retain indefinitely, archive after termination
- **Attendance data**: Retain for 7 years minimum
- **Leave records**: Retain for 5 years minimum
- **Audit logs**: Retain for 3 years minimum
- **Generated documents**: Retain for 3 years
- **Face recognition data**: Delete upon employee termination (or as per policy)

### 7.3 Data Backup

- **Frequency**: Daily automated backups at 2:00 AM
- **Type**: Full database backup + incremental MinIO snapshots
- **Storage**: Off-site backup storage
- **Testing**: Monthly restore testing
- **Retention**: 30 days rolling backup, 12 months yearly backups

---

## 8. Appendix

### 8.1 Glossary

- **Check-in/Check-out**: Process of recording employee arrival and departure
- **Face Enrollment**: Process of capturing and storing employee face data for recognition
- **Leave Balance**: Available leave days for an employee
- **Department Head**: Manager responsible for a department
- **Audit Trail**: Complete history of system changes and user actions

### 8.2 References

- MySQL Documentation: https://dev.mysql.com/doc/
- MinIO Documentation: https://min.io/docs/
- face-api.js: https://github.com/justadudewhohacks/face-api.js
- React Documentation: https://react.dev/
- Express.js Guide: https://expressjs.com/
- JWT Standard: RFC 7519

### 8.3 Revision History

| Version | Date | Author | Description |
|---------|------|--------|-------------|
| 1.0.0 | September 21, 2026 | Development Team | Initial SRS document |

---

**Document Status**: Approved  
**Last Review Date**: September 21, 2026  
**Next Review Date**: December 21, 2026
