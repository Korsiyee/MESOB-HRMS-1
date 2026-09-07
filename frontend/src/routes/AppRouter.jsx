import React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthApi } from '../api/authApi';
import DashboardLayout        from '../components/layout/DashboardLayout';
import DashboardPage          from '../pages/DashboardPage';
import ManageLeavePage        from '../pages/leave/ManageLeavePage';
import MyLeavePage            from '../pages/leave/MyLeavePage';
import NotificationsPage      from '../pages/NotificationsPage';
import EmployeesPage          from '../pages/EmployeesPage';
import EmployeeDetailPage     from '../pages/EmployeeDetailPage';
import EmployeeRegistrationPage from '../pages/EmployeeRegistrationPage';
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
import PlaceholderPage        from '../pages/PlaceholderPage';
import Login                  from '../components/Login';
import PermissionsManagementPage from '../pages/rbac/PermissionsManagementPage';
import RoleManagementPage from '../pages/rbac/RoleManagementPage';

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
    if (data?.user) login(data.user);
    navigate('/', { replace: true });
  };
  return <Login onLoginSuccess={handleLoginSuccess} />;
};

/* When clicking the top-level "Employees" nav item, go to the list overview (not personal profile) */

/* Role-based Attendance Routing Component */
const AttendanceRouter = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Employees see their own attendance only
  if (role === 'EMPLOYEE') {
    return <EmployeeAttendancePage />;
  }
  
  // Department Heads see their department's attendance
  if (role === 'DEPARTMENT_HEAD') {
    return <DeptHeadAttendancePage />;
  }
  
  // HR roles see the full overview
  return <AttendanceOverviewPage />;
};

/* My Attendance - Personal attendance for Department Heads and Employees */
const MyAttendanceRouter = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Both Employees and Department Heads see their personal attendance
  if (role === 'EMPLOYEE' || role === 'DEPARTMENT_HEAD') {
    return <EmployeeAttendancePage />;
  }
  
  // HR roles - redirect to main attendance
  return <Navigate to="/attendance" replace />;
};

const AttendanceManageRouter = () => {
  const { user } = useAuth();
  const role = user?.role;

  // Employees and Dept Heads don't have access to management - redirect to overview
  if (role === 'EMPLOYEE' || role === 'DEPARTMENT_HEAD') {
    return <Navigate to="/attendance" replace />;
  }
  
  // HR roles see the full management page
  return <AttendancePage />;
};

/* Role-based Letters Routing Component */
const LettersRouter = () => {
  const { user } = useAuth();
  const role = user?.role;

  // EMPLOYEE → EmployeeLettersPage (3 tabs: Available Templates, My Requests, Issued Letters)
  if (role === 'EMPLOYEE') {
    return <EmployeeLettersPage />;
  }
  
  // DEPARTMENT_HEAD, HR_ADMIN, SUPER_ADMIN → LettersPage (management interface)
  // All non-employee roles see the full management page with:
  // - Letter Templates tab (create/edit/delete)
  // - Generate Letter tab (by Mesob ID)
  // - Pending Requests tab (approve/reject employee requests)
  return <LettersPage />;
};

const AppRouter = () => (
  <Routes>
    <Route path="/" element={<Protected><DashboardLayout /></Protected>}>
      {/* Dashboard - Everyone can access (role-based routing inside DashboardPage) */}
      <Route index element={<DashboardPage />} />
      
      {/* Leave Module */}
      <Route path="leave/manage" element={<ManageLeavePage />} />
      <Route path="leave/my-requests" element={<MyLeavePage />} />
      <Route path="leave" element={<MyLeavePage />} />

      {/* ── Employee module ── */}
      <Route path="employees" element={<EmployeesPage />} />
      <Route path="employees/all" element={<EmployeesPage />} />
      <Route path="employees/register" element={<EmployeeRegistrationPage />} />
      <Route path="employees/registration" element={<EmployeeRegistrationPage />} />
      <Route path="employees/me" element={<EmployeeMeRedirect />} />
      <Route path="employees/:uuid" element={<EmployeeDetailPage />} />

      {/* ── Department module ── */}
      <Route path="departments" element={<DepartmentsPage />} />
      <Route path="departments/manage" element={<DepartmentsPage />} />
      <Route path="departments/add" element={<DepartmentsPage />} />

      {/* ── Position module ── */}
      <Route path="positions" element={<PositionsPage />} />
      <Route path="positions/manage" element={<PositionsPage />} />

      {/* ── Level module ── */}
      <Route path="levels" element={<LevelsPage />} />
      <Route path="levels/manage" element={<LevelsPage />} />

      {/* ── Attendance module ── Role-based routing */}
      <Route path="attendance" element={<AttendanceRouter />} />
      <Route path="attendance/my" element={<MyAttendanceRouter />} />
      <Route path="attendance/manage" element={<AttendancePage />} />
      {/* Legacy route kept for backward compat */}
      <Route path="attendance-overview" element={<AttendanceOverviewPage />} />
      
      {/* ── Shifts module ── */}
      <Route path="shifts" element={<ShiftsPage />} />
      <Route path="shifts/assignments" element={<ShiftsPage />} />
      
      {/* ── Letters module ── Role-based routing */}
      <Route path="letters" element={<LettersRouter />} />
      <Route path="letters/manage" element={<LettersPage />} />
      <Route path="letters/my" element={<MyLettersPage />} />
      
      {/* ── Admin modules ── */}
      <Route path="accounts" element={<AccountsPage />} />
      <Route path="logs" element={<LogsPage />} />
      <Route path="policies" element={<PoliciesPage />} />
      <Route path="holidays" element={<HolidaysPage />} />
      <Route path="network-settings" element={<NetworkSettingsPage />} />
      
      {/* ── RBAC Management ── */}
      <Route path="rbac/permissions" element={<PermissionsManagementPage />} />
      <Route path="rbac/roles" element={<RoleManagementPage />} />
      
      {/* ── My Account - Everyone can access ── */}
      <Route path="my-account" element={<MyAccountPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="*"      element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
