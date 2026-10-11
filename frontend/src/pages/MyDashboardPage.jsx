import React from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeDashboardPage from './EmployeeDashboardPage';
import { User } from 'lucide-react';

/**
 * MyDashboardPage - Personal space for all users to view their employee information
 * 
 * This component provides a dedicated route for HR roles, department heads, and super admins
 * to view their own employee dashboard, separate from their administrative dashboards.
 * 
 * Features:
 * - Accessible to all authenticated users
 * - Shows personal employee data (attendance, leave balance, etc.)
 * - Uses the same EmployeeDashboardPage component for consistency
 * - Separate from the main Dashboard (which shows org/dept analytics for admins)
 */
const MyDashboardPage = () => {
  const { user } = useAuth();

  // If no employee_uuid, show a message
  if (!user?.employee_uuid) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        textAlign: 'center',
        padding: '40px 20px',
        fontFamily: 'Poppins, sans-serif',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          boxShadow: '0 8px 24px rgba(20, 184, 166, 0.3)',
        }}>
          <User size={40} color="white" />
        </div>
        <h2 style={{
          margin: '0 0 12px',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: '#0F766E',
        }}>
          Employee Profile Not Found
        </h2>
        <p style={{
          margin: 0,
          fontSize: '0.95rem',
          color: '#64748B',
          maxWidth: 500,
          lineHeight: 1.6,
        }}>
          Your account is not linked to an employee profile. Please contact your HR administrator
          to associate your account with an employee record.
        </p>
      </div>
    );
  }

  // Render the employee dashboard with the user's employee_uuid
  return <EmployeeDashboardPage />;
};

export default MyDashboardPage;
