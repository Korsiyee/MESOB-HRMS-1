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
import PlaceholderPage        from '../pages/PlaceholderPage';
import Login                  from '../components/Login';

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
    navigate('/', { replace: true });
  };
  
  return <Login onLoginSuccess={handleLoginSuccess} />;
};

/* When clicking the top-level "Employees" nav item, go to the list overview (not personal profile) */

/* Permission-based Attendance Routing Component */
const AttendanceRouter = () => {
  const canManageAll = usePermission('attendance', 'manage_all');
  const canManageDept = usePermission('attendance', 'manage_department');

  // Users with manage_all see full overview
  if (canManageAll) {
    return <AttendanceOverviewPage />;
  }
  
  // Users with manage_department see their department
  if (canManageDept) {
    return <DeptHeadAttendancePage />;
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
  const canManageLetters = usePermission('letters', 'manage');

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
      {/* Dashboard - Everyone can access (role-based routing inside DashboardPage) */}
      <Route index element={<DashboardPage />} />
      
      {/* Leave Module */}
      <Route path="leave/manage" element={<ManageLeavePage />} />
      <Route path="leave/my-requests" element={<MyLeavePage />} />
      <Route path="leave" element={<MyLeavePage />} />

      {/* ── Employee module ── */}
      <Route path="employees" element={<EmployeesPage />} />
      <Route path="employees/all" element={<EmployeesPage />} />
      <Route path="employees/profile" element={<EmployeeProfilePage />} />
      <Route path="employees/profile/:employeeId" element={<EmployeeProfilePage />} />
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
      <Route path="positions/add" element={<PositionsPage />} />
      <Route path="positions/manage" element={<PositionsPage />} />

      {/* ── Level module ── */}
      <Route path="levels" element={<LevelsPage />} />
      <Route path="levels/add" element={<LevelsPage />} />
      <Route path="levels/manage" element={<LevelsPage />} />

      {/* ── Attendance module ── Role-based routing */}
      <Route path="attendance" element={<AttendanceRouter />} />
      <Route path="attendance/my" element={<MyAttendanceRouter />} />
      <Route path="attendance/manage" element={<AttendancePage />} />
      <Route path="attendance/network-settings" element={<NetworkSettingsPage />} />
      {/* Legacy route kept for backward compat */}
      <Route path="attendance-overview" element={<AttendanceOverviewPage />} />
      
      {/* ── Shifts module ── */}
      <Route path="shifts" element={<ShiftsPage />} />
      <Route path="shifts/add" element={<ShiftsPage />} />
      <Route path="shifts/assignments" element={<ShiftsPage />} />
      
      {/* ── Letters module ── Tab-based routing with permission check */}
      <Route path="letters" element={<LettersRouter />} />
      <Route path="letters/templates" element={<LettersRouter />} />
      <Route path="letters/generate" element={<LettersRouter />} />
      <Route path="letters/requests" element={<LettersRouter />} />
      <Route path="letters/manage" element={<LettersPage />} />
      <Route path="letters/my" element={<MyLettersPage />} />
      
      {/* ── Admin modules ── */}
      <Route path="accounts" element={<AccountsPage />} />
      <Route path="logs" element={<LogsPage />} />
      <Route path="policies" element={<PoliciesPage />} />
      <Route path="holidays" element={<HolidaysPage />} />
      <Route path="network-settings" element={<NetworkSettingsPage />} />
      

      
      {/* ── My Account - Everyone can access ── */}
      <Route path="my-account" element={<MyAccountPage />} />
      <Route path="notifications" element={<NotificationsPage />} />
    </Route>
    <Route path="/login" element={<LoginRoute />} />
    <Route path="*"      element={<Navigate to="/" replace />} />
  </Routes>
);

export default AppRouter;
