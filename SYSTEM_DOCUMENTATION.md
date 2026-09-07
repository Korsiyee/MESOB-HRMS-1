# MESOB HRMS - System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Core Modules](#core-modules)
4. [Authentication & Security](#authentication--security)
5. [Database Schema](#database-schema)
6. [API Reference](#api-reference)
7. [Face Recognition System](#face-recognition-system)
8. [Recent Updates](#recent-updates)

---

## System Overview

MESOB HRMS is a comprehensive Human Resource Management System designed for Ethiopian organizations. The system provides complete employee lifecycle management, from onboarding to offboarding, including attendance tracking, leave management, and advanced AI-powered face recognition.

### Key Characteristics
- **Multi-tenant Ready**: Supports multiple departments and organizational structures
- **Role-based Access Control**: Four main roles (Admin, HR, Department Head, Employee)
- **Real-time Updates**: Notification system for instant updates
- **Ethiopian Calendar Support**: Integrated Ethiopian holiday calendar
- **Face Recognition AI**: Advanced attendance tracking using face-api.js
- **Mobile-responsive**: Works on desktop, tablet, and mobile devices

### System Status (June 2026)
- ✅ Core employee management operational
- ✅ Attendance system with multiple check-in methods
- ✅ Leave management with approval workflows
- ✅ Face recognition attendance fully integrated
- ✅ Department and position management
- ✅ Document and letter generation
- ✅ Analytics and reporting dashboard
- ✅ Multi-tab session synchronization
- ✅ Activity-based session timeout with warnings

---

## Architecture

### Technology Stack

**Backend**
- **Runtime**: Node.js 16+
- **Framework**: Express.js
- **Database**: MySQL 8.0+
- **Object Storage**: MinIO
- **Authentication**: JWT (Access + Refresh tokens)
- **PDF Generation**: Puppeteer
- **Password Hashing**: bcrypt

**Frontend**
- **Framework**: React 19
- **Router**: React Router v7
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS + Custom Components
- **Face Recognition**: face-api.js with TensorFlow.js
- **Charts**: Recharts
- **HTTP Client**: Axios
- **State Management**: React Context API

**Infrastructure**
- **File Storage**: MinIO (S3-compatible)
- **Session Storage**: Browser localStorage/sessionStorage
- **API Communication**: RESTful APIs with JSON
- **File Uploads**: Multipart form data with Multer

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Pages      │  │  Components  │  │   Context    │      │
│  │              │  │              │  │  (Auth/Theme)│      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
│                     API Client (Axios)                       │
└─────────────────────────────┬───────────────────────────────┘
                              │ HTTPS/REST
┌─────────────────────────────┴───────────────────────────────┐
│                  Backend API (Express.js)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Routes   │→ │Controllers│→│ Services │→ │   DB     │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       │              │                          │            │
│  ┌────┴────────┐    └──────────┐        ┌──────┴──────┐   │
│  │ Middleware │              │         │            │   │
│  │  - Auth    │              │         │  MySQL DB  │   │
│  │  - Upload  │          MinIO        │  Tables    │   │
│  │  - Error   │          Storage      └────────────┘   │
│  └────────────┘         (Files)                         │
└──────────────────────────────────────────────────────────┘
```

### Request Flow

1. **User Action**: User interacts with React frontend
2. **API Call**: Frontend sends HTTP request via Axios
3. **Authentication**: JWT token validated in middleware
4. **Authorization**: Role/permission checks performed
5. **Business Logic**: Controller invokes service layer
6. **Data Access**: Service queries MySQL database
7. **File Operations**: MinIO handles document storage
8. **Response**: JSON response returned to frontend
9. **UI Update**: React components re-render with new data

---

## Core Modules

### 1. Employee Management

**Features**
- Complete employee profile management
- Personal information (name, DOB, gender, nationality)
- Contact details (email, phone, address)
- Employment details (department, position, hire date)
- Occupation assignments (multiple occupations per employee)
- Document management (ID cards, certificates, education records)
- Profile photo upload and management
- **Face registration for attendance** (7 photos from different angles)

**Employee Detail Page Tabs**
1. **Personal** - Basic personal information
2. **Contact** - Contact and address information
3. **Employment** - Employment details and financial info
4. **Occupations** - Multiple occupation assignments with start/end dates
5. **Documents** - ID documents, education, work experience, certifications
6. **Face Registration** - Register/manage face recognition for attendance

**Status Management**
- ACTIVE: Currently employed
- INACTIVE: Temporarily inactive
- TERMINATED: Employment ended

### 2. Attendance System

**Check-in Methods**
1. **Manual Entry**: Admin/HR can record attendance manually
2. **Device Integration**: Integration with attendance devices
3. **Face Recognition**: AI-powered facial recognition check-in/out
4. **Mobile**: Check-in via mobile devices (future)

**Attendance Features**
- Real-time attendance tracking
- Late arrival detection
- Early departure tracking
- Overtime calculation
- Attendance reports and analytics
- Export to Excel/PDF
- Shift-based attendance rules
- Attendance exemptions for specific employees

**Face Recognition Attendance**
- Uses face-api.js with SSD MobileNet v1 model
- Requires 7 face images for registration
- Real-time face detection and recognition
- Confidence threshold: 0.6 (60% match required)
- Works with webcam or mobile camera
- Lighting quality detection
- Multiple face handling

### 3. Leave Management

**Leave Types**
- Annual Leave
- Sick Leave
- Maternity/Paternity Leave
- Unpaid Leave
- Compensatory Leave
- Study Leave
- Bereavement Leave

**Leave Workflow**
1. Employee submits leave request
2. Department Head reviews and approves/rejects
3. HR performs final approval
4. System updates leave balance
5. Notifications sent at each stage

**Leave Features**
- Leave balance tracking
- Automatic accrual calculations
- Leave calendar view
- Policy-based validations
- Attachment support (medical certificates, etc.)
- Leave history and reports
- Public holiday integration

### 4. Department & Position Management

**Departments**
- Hierarchical structure support
- Department head assignments
- Employee count per department
- Department-based reporting

**Positions**
- Position titles and descriptions
- Level/grade assignments
- Salary range definitions (optional)
- Position history tracking

**Occupations**
- Flexible occupation assignments
- Multiple occupations per employee
- Start and end date tracking
- Historical occupation records

### 5. User Accounts & Roles

**User Roles**
1. **ADMIN** - Full system access, user management
2. **HR** - Employee and leave management, reports
3. **DEPARTMENT_HEAD** - Department employee view, leave approvals
4. **EMPLOYEE** - Personal profile, attendance, leave requests

**Permission Structure**
```
ADMIN
  ├─ All HR permissions
  ├─ User account management
  ├─ System configuration
  └─ Audit logs access

HR
  ├─ Employee CRUD operations
  ├─ Attendance management
  ├─ Leave approval (final)
  ├─ Document generation
  └─ Reports and analytics

DEPARTMENT_HEAD
  ├─ View department employees
  ├─ Leave approval (initial)
  ├─ Department attendance view
  └─ Department reports

EMPLOYEE
  ├─ View own profile
  ├─ Update personal info
  ├─ Submit leave requests
  ├─ View own attendance
  └─ Face registration
```

### 6. Letters & Documents

**Document Types**
- Employment Verification Letters
- Experience Certificates
- Salary Certificates
- Clearance Letters
- Custom letter templates

**Features**
- PDF generation with company letterhead
- Digital signatures (optional)
- Template management
- Document versioning
- MinIO storage with secure URLs
- Automatic cleanup of temporary files

### 7. Notifications

**Notification Triggers**
- Leave request submitted
- Leave approved/rejected
- Attendance anomalies
- Document generation completed
- Account status changes
- System announcements

**Notification Channels**
- In-app notifications (real-time)
- Email notifications (configurable)
- Badge counters for unread items

---

## Authentication & Security

### Authentication Flow

**Login Process**
1. User submits username/password
2. Backend validates credentials against database
3. If valid, generates two JWT tokens:
   - **Access Token**: Short-lived (1 day), used for API requests
   - **Refresh Token**: Long-lived (7 days), used to obtain new access tokens
4. Tokens stored in localStorage
5. User context updated with role and permissions

**Token Refresh**
- Automatic refresh when access token expires
- Refresh token rotation for security
- Silent refresh to avoid user disruption

**Logout Process**
- Clears all tokens from storage
- Clears user context
- Redirects to login page
- Broadcasts logout event to other tabs (session sync)

### Session Management

**Activity-based Timeout**
- Tracks user activity (mouse, keyboard, touch events)
- Warning displayed after 25 minutes of inactivity
- Auto-logout after 30 minutes of inactivity
- Countdown timer in warning modal
- Can extend session by continuing activity

**Multi-tab Synchronization**
- Login in one tab → All tabs login automatically
- Logout in one tab → All tabs logout automatically
- Activity in one tab → Resets timeout in all tabs
- Uses localStorage events for cross-tab communication

### Security Measures

**Password Security**
- bcrypt hashing (10 rounds)
- Minimum password requirements
- Password change functionality
- Account lockout after failed attempts (future)

**API Security**
- JWT token validation on every request
- Role-based access control middleware
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- SQL injection prevention (parameterized queries)
- XSS protection
- CORS configuration

**File Upload Security**
- File type validation
- File size limits
- Virus scanning (recommended in production)
- Secure file storage in MinIO
- Temporary file cleanup

**Data Privacy**
- Sensitive data encryption at rest
- HTTPS for data in transit
- Secure token storage
- Audit logging for compliance

---

## Database Schema

### Core Tables

**users**
- User accounts for system access
- Links to employee records
- Stores hashed passwords
- Role assignments

**employees**
- Employee personal information
- Employment status and dates
- Department and position associations
- Profile photos and face image keys
- Financial information (bank, TIN, pension)

**departments**
- Organizational units
- Department hierarchies
- Head assignments

**positions**
- Job positions/titles
- Position levels and descriptions
- Salary ranges

**occupations**
- Specific job functions
- Can be assigned to multiple employees

**employee_occupations**
- Junction table for employee-occupation relationships
- Tracks start and end dates
- Maintains occupation history

**addresses**
- Employee contact information
- Multiple address types (CURRENT, PERMANENT)
- Email and phone numbers

**attendance_records**
- Daily attendance tracking
- Check-in and check-out timestamps
- Attendance method (manual, device, face)
- Status (present, late, absent, on_leave)

**leave_requests**
- Leave applications
- Leave type and duration
- Approval status and workflow
- Supporting documents

**leave_balances**
- Leave entitlements per employee
- Available, used, and pending balances
- Leave type breakdowns

**documents**
- Employee documents and certificates
- Education records
- Work experience
- Training certifications
- ID documents with metadata

**notifications**
- System notifications
- Read/unread status
- Notification types and priorities

**shifts**
- Work shift definitions
- Shift timings and days
- Employee shift assignments

**public_holidays**
- Ethiopian public holidays
- Holiday dates and descriptions
- Automatic calendar integration

**audit_logs**
- System activity tracking
- User actions and timestamps
- Data change history

---

## API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication Endpoints

**POST /api/auth/login**
```json
Request:
{
  "username": "admin",
  "password": "password123"
}

Response:
{
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ...",
  "user": {
    "uuid": "...",
    "username": "admin",
    "role": "ADMIN",
    "employee": { ... }
  }
}
```

**POST /api/auth/refresh**
```json
Request:
{
  "refreshToken": "eyJhbGciOiJ..."
}

Response:
{
  "accessToken": "eyJhbGciOiJ...",
  "refreshToken": "eyJhbGciOiJ..."
}
```

**POST /api/auth/logout**
- No body required
- Clears server-side sessions (if implemented)

### Employee Endpoints

**GET /api/employees**
- List all employees
- Query params: status, department_uuid, position_uuid
- Returns: Array of employee objects

**GET /api/employees/:uuid**
- Get single employee details
- Query param: `include_signed_urls=true` for photos/documents
- Returns: Employee object with full details

**POST /api/employees**
- Create new employee
- Requires: first_name, middle_name, last_name, gender
- Returns: Created employee object

**PUT /api/employees/:uuid**
- Update employee information
- Body: Fields to update
- Returns: Updated employee object

**DELETE /api/employees/:uuid**
- Soft delete employee (status → TERMINATED)
- Returns: Success message

**POST /api/employees/:uuid/photo**
- Upload employee profile photo
- Content-Type: multipart/form-data
- Returns: Uploaded photo URL

**POST /api/employees/:uuid/documents**
- Upload employee document
- Content-Type: multipart/form-data
- Returns: Document record

### Attendance Endpoints

**GET /api/attendance**
- List attendance records
- Query params: date, employee_uuid, department_uuid
- Returns: Array of attendance records

**POST /api/attendance/check-in**
```json
Request:
{
  "employee_uuid": "...",
  "method": "FACE" | "MANUAL" | "DEVICE",
  "latitude": 9.0320,
  "longitude": 38.7469
}

Response:
{
  "uuid": "...",
  "check_in": "2026-06-23T08:30:00Z",
  "status": "PRESENT"
}
```

**POST /api/attendance/check-out**
```json
Request:
{
  "employee_uuid": "...",
  "method": "FACE" | "MANUAL" | "DEVICE"
}

Response:
{
  "uuid": "...",
  "check_out": "2026-06-23T17:00:00Z",
  "total_hours": 8.5
}
```

### Face Recognition Endpoints

**GET /api/face-recognition/status/:employee_uuid**
- Check if employee has registered face images
- Returns: `{ registered: true/false }`

**POST /api/face-recognition/register**
- Register face images for employee
- Content-Type: multipart/form-data
- Requires: 7 face images + face descriptors
- Returns: Success message

**DELETE /api/face-recognition/delete/:employee_uuid**
- Delete employee's registered face images
- Returns: Success message

**POST /api/face-recognition/recognize**
- Recognize face in image
- Body: { imageData: base64, descriptors: [...] }
- Returns: Matched employee or null

### Leave Endpoints

**GET /api/leave/requests**
- List leave requests
- Query params: status, employee_uuid, start_date, end_date
- Returns: Array of leave requests

**POST /api/leave/requests**
```json
Request:
{
  "leave_type": "ANNUAL",
  "start_date": "2026-07-01",
  "end_date": "2026-07-05",
  "reason": "Family vacation"
}

Response:
{
  "uuid": "...",
  "status": "PENDING",
  "total_days": 5
}
```

**PUT /api/leave/requests/:uuid/approve**
- Approve leave request
- Requires department head or HR role
- Returns: Updated leave request

**PUT /api/leave/requests/:uuid/reject**
- Reject leave request
- Body: { reason: "Rejection reason" }
- Returns: Updated leave request

**GET /api/leave/balance/:employee_uuid**
- Get employee leave balances
- Returns: Leave balance breakdown by type

---

## Face Recognition System

### Overview
The face recognition system uses face-api.js, a JavaScript library built on TensorFlow.js, to enable AI-powered attendance tracking.

### Architecture

**Models Used**
1. **SSD MobileNet v1** - Face detection
2. **FaceLandmark68Net** - 68-point facial landmark detection
3. **FaceRecognitionNet** - 128-dimensional face descriptor generation

**Model Storage**
- Models stored in `frontend/public/models/`
- Lazy loaded on first use
- Cached in browser for performance

### Face Registration Process

**Step 1: Capture Phase**
1. User opens Face Registration tab
2. System requests camera permission
3. Live video feed displayed
4. System guides user through 7 poses:
   - Front (straight ahead)
   - Left profile
   - Right profile
   - Look up
   - Look down
   - Slight tilt left
   - Slight tilt right

**Step 2: Quality Checks**
- Face detection confidence > 0.5
- Single face in frame (rejects multiple faces)
- Adequate lighting (brightness check)
- Face size minimum threshold
- Clear facial features visible

**Step 3: Descriptor Generation**
- Extract 128-dimensional face descriptor from each image
- Descriptors represent unique facial features
- Normalized for comparison consistency

**Step 4: Upload**
- 7 images uploaded to MinIO
- Face descriptors stored in database
- Linked to employee UUID
- Old images replaced if re-registering

### Face Recognition Process (Check-in)

**Step 1: Capture**
1. User opens face recognition attendance
2. Takes photo or uses live camera
3. System detects face in image

**Step 2: Descriptor Extraction**
- Generate face descriptor from captured image
- Same 128-dimensional feature vector

**Step 3: Matching**
1. Retrieve all registered face descriptors from database
2. Calculate Euclidean distance between captured descriptor and each stored descriptor
3. Distance < 0.6 = Match (60% confidence threshold)
4. Return employee with smallest distance (best match)

**Step 4: Validation**
- Verify matched employee is eligible for check-in
- Check for duplicate check-in (already checked in today)
- Validate shift timing (if applicable)

**Step 5: Record**
- Create attendance record with method="FACE"
- Store timestamp and location (if available)
- Send notification to employee

### Performance Considerations

**Speed Optimization**
- Models loaded once and cached
- Descriptor comparison done in-memory
- Parallel processing for multiple registrations
- Web Workers for heavy computation (future)

**Accuracy Improvements**
- Multiple angles during registration (7 poses)
- Quality filtering during capture
- Adjustable confidence threshold
- Re-registration option for improved accuracy
- Anti-spoofing (future: liveness detection)

**Browser Compatibility**
- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 11+)
- Requires HTTPS in production for camera access

---

## Recent Updates

### June 2026 - Face Registration Integration

**Fixed Issues**
- ✅ Restored missing Face Registration tab on Employee Details page
- ✅ Removed unwanted emoji icons, replaced with consistent Lucide icons
- ✅ Improved visual consistency across all tabs

**Changes Made**
1. **Employee Detail Page**
   - Added Face Registration tab with Camera icon
   - Imported `EmployeeFaceRegistration` component
   - Integrated face registration functionality in employee profile
   - Added additional Lucide icons (Globe, Tag, Calendar, Settings, CreditCard, Building2, MapPin, Mail, Hash, Camera)

2. **Icon Standardization**
   - Replaced all emoji icons with Lucide React icons
   - Personal Tab: Globe, Tag, Calendar, Settings, CreditCard icons
   - Contact Tab: Mail, Globe, MapPin icons
   - Employment Tab: Calendar, Building2, CreditCard, Hash icons
   - Documents Tab: BookOpen, Briefcase, FileText icons

3. **Component Integration**
   - Face Registration component shows registration status
   - Allows registration of 7 face photos
   - Supports re-registration for improved accuracy
   - HR can delete face registrations
   - On-screen instructions for each pose

**Tab Structure (Updated)**
1. **Personal** - Personal information with proper icons
2. **Contact** - Contact and address with Mail/MapPin/Globe icons
3. **Employment** - Employment and financial details
4. **Occupations** - Multiple occupation assignments
5. **Documents** - Documents, education, work experience, certifications
6. **Face Registration** - Face recognition setup and management

**Benefits**
- Consistent professional UI design
- Better accessibility (icons have semantic meaning)
- Improved user experience
- Complete face recognition workflow in employee profile
- Self-service face registration for employees
- HR management of face data

---

## Troubleshooting

### Common Issues

**Problem: Face recognition not working**
- Check camera permissions in browser
- Ensure models are downloaded (`npm run download-models`)
- Verify HTTPS connection (required for camera access)
- Check browser console for errors
- Try recapturing with better lighting

**Problem: Login session expires too quickly**
- Activity-based timeout is 30 minutes
- User activity resets the timer
- Check JWT expiration settings in backend `.env`

**Problem: File uploads failing**
- Check MinIO server is running
- Verify MinIO credentials in `.env`
- Check file size limits (default: 10MB)
- Ensure correct Content-Type header

**Problem: Database connection errors**
- Verify MySQL is running
- Check database credentials in `.env`
- Run migrations: `npm run db:migrate`
- Check database exists and user has permissions

**Problem: Multi-tab sync not working**
- Clear browser localStorage
- Check browser's localStorage is enabled
- Ensure tabs are from same origin (domain + protocol)
- Check browser console for storage events

---

## Performance Optimization

### Backend Optimization
- Database indexing on frequently queried fields
- Connection pooling for MySQL
- Caching for repeated queries (future)
- Pagination for large datasets
- Lazy loading of related data

### Frontend Optimization
- Code splitting with React.lazy
- Image optimization and lazy loading
- Debouncing search inputs
- Memoization of expensive computations
- Virtual scrolling for large lists (future)

### Face Recognition Optimization
- Model caching in browser
- Web Workers for computation (future)
- Descriptor comparison optimization
- Limited descriptor database queries

---

## Future Enhancements

### Planned Features
- [ ] Mobile application (iOS/Android)
- [ ] Biometric authentication (fingerprint)
- [ ] Advanced analytics dashboard
- [ ] Payroll integration
- [ ] Performance evaluation module
- [ ] Training management system
- [ ] Employee self-service portal enhancements
- [ ] Geofencing for attendance
- [ ] Integration with accounting systems
- [ ] Multi-language support (Amharic)
- [ ] Advanced reporting and business intelligence
- [ ] Liveness detection for face recognition anti-spoofing
- [ ] Email notifications (currently in-app only)
- [ ] SMS notifications for critical alerts
- [ ] Document approval workflows
- [ ] Contract management
- [ ] Asset management

### Security Enhancements
- [ ] Two-factor authentication (2FA)
- [ ] Single Sign-On (SSO) integration
- [ ] IP whitelisting
- [ ] Enhanced audit logging
- [ ] Data encryption at rest
- [ ] Regular security audits
- [ ] Penetration testing
- [ ] GDPR compliance features

---

## Maintenance

### Regular Tasks
- **Daily**: Monitor system logs and errors
- **Weekly**: Review and clear old notifications
- **Monthly**: Database backup and optimization
- **Quarterly**: Dependency updates and security patches
- **Yearly**: System audit and performance review

### Backup Strategy
- **Database**: Daily automated backups
- **Files**: MinIO bucket replication
- **Configuration**: Version controlled in Git
- **Recovery**: Test restore procedures monthly

### Monitoring
- Application logs (Winston or similar)
- Database performance metrics
- API response times
- Error rates and types
- User activity metrics
- Storage usage (MinIO)

---

## Support and Contact

### Documentation
- README.md - Quick start and setup
- SYSTEM_DOCUMENTATION.md - This file
- API documentation (Postman collection available)
- Inline code comments

### Getting Help
1. Check this documentation first
2. Review error logs and messages
3. Search existing GitHub issues
4. Contact development team
5. Submit detailed bug reports with:
   - Steps to reproduce
   - Expected vs actual behavior
   - Screenshots/error messages
   - Browser and system information

---

## Version History

**v1.0.0 - June 2026**
- Initial production release
- Core HRMS functionality
- Face recognition attendance
- Multi-tab session sync
- Activity-based timeout
- Employee detail page with 6 tabs
- Icon standardization complete

**Future Versions**
- v1.1.0 - Mobile app integration
- v1.2.0 - Advanced analytics
- v2.0.0 - Multi-organization support

---

## License

Proprietary - All Rights Reserved

© 2026 MESOB HRMS Development Team

---

**Document Status**: Current and Active
**Last Updated**: June 23, 2026
**Maintained By**: Development Team
**Next Review**: September 2026
