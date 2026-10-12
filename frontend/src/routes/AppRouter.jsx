import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthApi } from '../api/authApi';
import { usePermission } from '../hooks/usePermission';
import DashboardLayout        from '../components/layout/DashboardLayout';
import DashboardPage          from '../pages/DashboardPage';
import ManageLeavePage        from '../pages/leave/ManageLeavePage';
import MyLeavePage            from '../pages/leave/MyLeavePage';
import NotificationsPage      from '../pages/NotificationsPage';
import EmployeesPage          from '../pages/EmployeesPage';
import EmployeeDetailPage     from '../pages/EmployeeDetailPage';
import EmployeeRegistrationPage from '../pages/EmployeeRegistrationPage';
import EmployeeProfilePage    from '../pages/EmployeeProfilePage';
import DepartmentsPage        from '../pages/DepartmentsPage';
import PositionsPage          from '../pages/PositionsPage';
import LevelsPage             from '../pages/LevelsPage';
import AttendancePage         from '../pages/AttendancePage';
import AttendanceOverviewPage from '../pages/AttendanceOverviewPage';
import EmployeeAttendancePage from '../pages/EmployeeAttendancePage';
import DeptHeadAttendancePage from '../pages/DeptHeadAttendancePage';
import ShiftsPage             from '../pages/ShiftsPage';
import LettersPage            from '../pages/LettersPage';
import EmployeeLettersPage    from '../pages/EmployeeLettersPage';
import MyLettersPage          from '../pages/MyLettersPage';
import AccountsPage           from '../pages/AccountsPage';
import LogsPage               from '../pages/LogsPage';
import PoliciesPage           from '../pages/PoliciesPage';
import HolidaysPage           from '../pages/HolidaysPage';
import NetworkSettingsPage    from '../pages/NetworkSettingsPage';
import MyAccountPage          from '../pages/MyAccountPage';
import MyDashboardPage        from '../pages/MyDashboardPage';
import PlaceholderPage        from '../pages/PlaceholderPage';
import Login                  from '../components/Login';
import { useModulePermissions } from '../hooks/useModulePermissions';

/* Redirects /employees/me → /employees/:employee_uuid of the logged-in user.
   Falls back to the All Employees list if no employee_uuid is found. */
const EmployeeMeRedirect = () => {
  const stored = AuthApi.getStoredUser();
  const empUuid = stored?.employee_uuid;
  if (empUuid) return <Navigate to={`/employees/${empUuid}`} replace />;
  return <Navigate to="/employees/all" replace />;
};

const LoadingScreen = () => (
  <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#C5CECC' }}>
    <div style={{ width:40, height:40, border:'3px solid rgba(0,80,60,0.15)', borderTop:'3px solid #0F766E', borderRadius:'50%', animation:'spin 0.8s linear infinite' }}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const Protected = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const LoginRoute = () => {
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  
  const handleLoginSuccess = (data) => {
    if (data?.user) {
      const permissionsObj = {
        role: data.role,
        dashboard: data.dashboard,
        modules: data.modules || []
      };
      login(data.user, permissionsObj, permissionsObj);
    }
    const roleCode = data?.role?.code || data?.user?.role?.code || (typeof data?.role === 'string' ? data?.role : null);
    if (roleCode === 'EMPLOYEE') {
      navigate('/my-dashboard', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  };
  
  return <Login onLoginSuccess={handleLoginSuccess} />;
};

/* Module-based Route Guard */
const RequireModuleRoute = ({ module, modules, children }) => {
  const { hasModule, hasAnyModule, loading } = useModulePermissions();
  const { user } = useAuth();
  if (loading) return <LoadingScreen />;

  const roleCode = user?.role?.code || user?.role?.name || (typeof user?.role === 'string' ? user?.role : null);
  if (roleCode === 'SUPER_ADMIN') {
    return children;
  }

  const allowed = modules ? hasAnyModule(modules) : hasModule(module);
  if (!allowed) {
    return <Navigate to={roleCode === 'EMPLOYEE' ? '/my-dashboard' : '/'} replace />;
  }
  return children;
};

/* Employee Profile Route - allow self-access or users with EMPLOYEE_PROFILE module */
const EmployeeDetailRoute = () => {
  const { user } = useAuth();
  const { hasModule, loading } = useModulePermissions();
  if (loading) return <LoadingScreen />;

  const roleCode = user?.role?.code || user?.role?.name || (typeof user?.role === 'string' ? user?.role : null);
  if (roleCode === 'SUPER_ADMIN' || hasModule('EMPLOYEE_PROFILE')) {
    return <EmployeeDetailPage />;
  }
  return <Navigate to={roleCode === 'EMPLOYEE' ? '/my-dashboard' : '/'} replace />;
};

/* Home route - Employees strictly redirected to /my-dashboard */
const HomeRoute = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role?.name || (typeof user?.role === 'string' ? user?.role : null);
  if (roleCode === 'EMPLOYEE') {
    return <Navigate to="/my-dashboard" replace />;
  }
  return <DashboardPage />;
};

/* Fallback route helper */
const RootFallback = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role?.name || (typeof user?.role === 'string' ? user?.role : null);
  return <Navigate to={roleCode === 'EMPLOYEE' ? '/my-dashboard' : '/'} replace />;
};

/* When clicking the top-level "Employees" nav item, go to the list overview (not personal profile) */

/* Permission-based Attendance Routing Component */
const AttendanceRouter = () => {
  const { user } = useAuth();
  const roleCode = user?.role?.code || user?.role?.name || (typeof user?.role === 'string' ? user?.role : null);

  // Department heads see their department attendance
  if (roleCode === 'DEPT_HEAD' || roleCode === 'DEPARTMENT_HEAD' || roleCode === 'MANAGER') {
    return <DeptHeadAttendancePage />;
  }

  // Super Admin and HR staff see full overview
  if (roleCode === 'SUPER_ADMIN' || roleCode === 'HR_ADMIN' || roleCode === 'HR_OFFICER') {
    return <AttendanceOverviewPage />;
  }

  // Everyone else sees their own attendance
  return <EmployeeAttendancePage />;
};

/* My Attendance - Personal attendance view */
const MyAttendanceRouter = () => {
  return <EmployeeAttendancePage />;
};

/* Permission-based Letters Routing Component */
const LettersRouter = () => {
  const { allowed: canManageLetters, loading } = usePermission('letters', 'manage');

  if (loading) {
    return <LoadingScreen />;
  }

  // Users with letters.manage see management interface
  if (canManageLetters) {
    return <LettersPage />;
  }
  
  // Everyone else sees employee letters view
  return <EmployeeLettersPage />;
};

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Protected><DashboardLayout /></Protected>}>
      {/* Home / Dashboard - Super Admin, HR, Dept Head; Employees redirected to /my-dashboard */}
      <Route index element={<HomeRoute />} />
      
      {/* Leave Module */}
      <Route path="leave/manage" element={<RequireModuleRoute module="LEAVE_REQUESTS"><ManageLeavePage /></RequireModuleRoute>} />
      <Route path="leave/my-requests" element={<MyLeavePage />} />
      <Route path="leave" element={<MyLeavePage />} />

      {/* ── Employee module ── */}
      <Route path="employees" element={<RequireModuleRoute module="EMPLOYEE_LIST"><EmployeesPage /></RequireModuleRoute>} />
      <Route path="employees/all" element={<RequireModuleRoute module="EMPLOYEE_LIST"><EmployeesPage /></RequireModuleRoute>} />
      <Route path="employees/profile" element={<RequireModuleRoute module="EMPLOYEE_PROFILE"><EmployeeProfilePage /></RequireModuleRoute>} />
      <Route path="employees/profile/:employeeId" element={<RequireModuleRoute module="EMPLOYEE_PROFILE"><EmployeeProfilePage /></RequireModuleRoute>} />
      <Route path="employees/register" element={<RequireModuleRoute module="REGISTER_EMPLOYEE"><EmployeeRegistrationPage /></RequireModuleRoute>} />
      <Route path="employees/registration" element={<RequireModuleRoute module="REGISTER_EMPLOYEE"><EmployeeRegistrationPage /></RequireModuleRoute>} />
      <Route path="employees/me" element={<EmployeeMeRedirect />} />
      <Route path="employees/:uuid" element={<EmployeeDetailRoute />} />

      {/* ── Department module ── */}
      <Route path="departments" element={<RequireModuleRoute module="DEPARTMENTS"><DepartmentsPage /></RequireModuleRoute>} />
      <Route path="departments/manage" element={<RequireModuleRoute module="DEPARTMENTS"><DepartmentsPage /></RequireModuleRoute>} />
      <Route path="departments/add" element={<RequireModuleRoute module="DEPARTMENTS"><DepartmentsPage /></RequireModuleRoute>} />

      {/* ── Position module ── */}
      <Route path="positions" element={<RequireModuleRoute module="POSITIONS"><PositionsPage /></RequireModuleRoute>} />
      <Route path="positions/add" element={<RequireModuleRoute module="POSITIONS"><PositionsPage /></RequireModuleRoute>} />
      <Route path="positions/manage" element={<RequireModuleRoute module="POSITIONS"><PositionsPage /></RequireModuleRoute>} />

      {/* ── Level module ── */}
      <Route path="levels" element={<RequireModuleRoute module="LEVELS"><LevelsPage /></RequireModuleRoute>} />
      <Route path="levels/add" element={<RequireModuleRoute module="LEVELS"><LevelsPage /></RequireModuleRoute>} />
      <Route path="levels/manage" element={<RequireModuleRoute module="LEVELS"><LevelsPage /></RequireModuleRoute>} />

      {/* ── Attendance module ── Role-based routing */}
      <Route path="attendance" element={<AttendanceRouter />} />
      <Route path="attendance/my" element={<MyAttendanceRouter />} />
      <Route path="attendance/manage" element={<RequireModuleRoute module="ATTENDANCE_RECORDS"><AttendancePage /></RequireModuleRoute>} />
      <Route path="attendance/network-settings" element={<RequireModuleRoute module="NETWORK_SETTINGS"><NetworkSettingsPage /></RequireModuleRoute>} />
      {/* Legacy route kept for backward compat */}
      <Route path="attendance-overview" element={<RequireModuleRoute module="ATTENDANCE_RECORDS"><AttendanceOverviewPage /></RequireModuleRoute>} />
      
      {/* ── Shifts module ── */}
      <Route path="shifts" element={<RequireModuleRoute module="SHIFTS"><ShiftsPage /></RequireModuleRoute>} />
      <Route path="shifts/add" element={<RequireModuleRoute module="SHIFTS"><ShiftsPage /></RequireModuleRoute>} />
      <Route path="shifts/assignments" element={<RequireModuleRoute module="SHIFTS"><ShiftsPage /></RequireModuleRoute>} />
      
      {/* ── Letters module ── Tab-based routing with permission check */}
      <Route path="letters" element={<LettersRouter />} />
      <Route path="letters/templates" element={<LettersRouter />} />
      <Route path="letters/generate" element={<LettersRouter />} />
      <Route path="letters/requests" element={<LettersRouter />} />
      <Route path="letters/manage" element={<RequireModuleRoute module="LETTERS"><LettersPage /></RequireModuleRoute>} />
      <Route path="letters/my" element={<MyLettersPage />} />
      
      {/* ── Admin modules ── */}
      <Route path="accounts" element={<RequireModuleRoute module="ACCOUNTS"><AccountsPage /></RequireModuleRoute>} />
      <Route path="logs" element={<RequireModuleRoute module="AUDIT_LOGS"><LogsPage /></RequireModuleRoute>} />
      <Route path="policies" element={<RequireModuleRoute module="LEAVE_SETTINGS"><PoliciesPage /></RequireModuleRoute>} />
      <Route path="holidays" element={<RequireModuleRoute module="LEAVE_SETTINGS"><HolidaysPage /></RequireModuleRoute>} />
      <Route path="network-settings" element={<RequireModuleRoute module="NETWORK_SETTINGS"><NetworkSettingsPage /></RequireModuleRoute>} />
      

      
      {/* ── My Account - Everyone can access ── */}
      <Route path="my-dashboard" element={<MyDashboardPage />} />
      <Route path="my-account" element={<MyAccountPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="*"      element={<RootFallback />} />
  </Routes>
);

export default AppRouter;
