/**
 * Bug Condition Exploration Test - Permission Enforcement Gap
 * 
 * Property 1: Bug Condition - UI Controls Visible Without Permission
 * 
 * CRITICAL: This test MUST FAIL on unfixed code - failure confirms the bug exists
 * DO NOT attempt to fix the test or the code when it fails
 * 
 * GOAL: Surface counterexamples that demonstrate unauthorized users see action buttons
 * When this test passes after implementation, it confirms the expected behavior is satisfied
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import EmployeesPage from '../../pages/EmployeesPage';
import DepartmentsPage from '../../pages/DepartmentsPage';
import PositionsPage from '../../pages/PositionsPage';
import { AuthContext } from '../../context/AuthContext';
import apiClient from '../../api/apiClient';

// Mock API client
vi.mock('../../api/apiClient');

// Helper to create mock authenticated user context
const createAuthContext = (permissions = {}) => ({
  user: {
    uuid: 'test-user-uuid',
    email: 'test@example.com',
    first_name: 'Test',
    last_name: 'User',
  },
  isAuthenticated: true,
  login: vi.fn(),
  logout: vi.fn(),
  loading: false,
});

// Helper to setup permission API responses
const setupPermissionMocks = (permissionMap) => {
  apiClient.get.mockImplementation((url, config) => {
    if (url === '/auth/check-permission') {
      const { action, resource } = config.params || {};
      const key = `${action}:${resource}`;
      const allowed = permissionMap[key] || false;
      return Promise.resolve({ data: { allowed } });
    }
    
    // Mock other API calls based on URL
    if (url.includes('/employees')) {
      return Promise.resolve({ data: [], meta: { total: 0 } });
    }
    if (url.includes('/departments')) {
      return Promise.resolve({ data: [], meta: { total: 0 } });
    }
    if (url.includes('/positions')) {
      return Promise.resolve({ data: [], meta: { total: 0 } });
    }
    
    return Promise.resolve({ data: [] });
  });
};

// Wrapper component with AuthContext
const renderWithAuth = (component, authContext) => {
  return render(
    <BrowserRouter>
      <AuthContext.Provider value={authContext}>
        {component}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('Bug Condition Exploration: Permission Enforcement Gap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Property 1.1: Create buttons visible without create permission', () => {
    it('should show "Add Employee" button to user without create permission on employees (BUG)', async () => {
      // GIVEN: User without 'create' permission on 'employees'
      const authContext = createAuthContext();
      setupPermissionMocks({
        'view:employees': true,
        'create:employees': false, // No create permission
      });

      // WHEN: User navigates to EmployeesPage
      renderWithAuth(<EmployeesPage />, authContext);

      // THEN: "Add Employee" button should NOT be visible (expected behavior)
      // BUT: On unfixed code, it WILL be visible (bug condition)
      await waitFor(() => {
        const addButton = screen.queryByText(/add employee/i);
        
        // This assertion expects the button to be HIDDEN (correct behavior)
        // On unfixed code, this will FAIL because the button is visible
        expect(addButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "Create Department" button to user without create permission on departments (BUG)', async () => {
      // GIVEN: User without 'create' permission on 'departments'
      const authContext = createAuthContext();
      setupPermissionMocks({
        'view:departments': true,
        'create:departments': false,
      });

      // WHEN: User navigates to DepartmentsPage
      renderWithAuth(<DepartmentsPage />, authContext);

      // THEN: Create button should be hidden
      await waitFor(() => {
        const createButton = screen.queryByText(/create department/i);
        expect(createButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('should show "Create Position" button to user without create permission on positions (BUG)', async () => {
      // GIVEN: User without 'create' permission on 'positions'
      const authContext = createAuthContext();
      setupPermissionMocks({
        'view:positions': true,
        'create:positions': false,
      });

      // WHEN: User navigates to PositionsPage
      renderWithAuth(<PositionsPage />, authContext);

      // THEN: Create button should be hidden
      await waitFor(() => {
        const createButton = screen.queryByText(/create position/i);
        expect(createButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Property 1.2: Edit buttons visible without update permission', () => {
    it('should hide edit icons when user lacks update permission on employees (BUG)', async () => {
      // GIVEN: User without 'update' permission on 'employees'
      const authContext = createAuthContext();
      
      // Mock employees data
      apiClient.get.mockImplementation((url, config) => {
        if (url === '/auth/check-permission') {
          const { action, resource } = config.params || {};
          if (action === 'view' && resource === 'employees') return Promise.resolve({ data: { allowed: true } });
          if (action === 'update' && resource === 'employees') return Promise.resolve({ data: { allowed: false } });
          return Promise.resolve({ data: { allowed: false } });
        }
        if (url.includes('/employees')) {
          return Promise.resolve({
            data: [
              {
                uuid: 'emp-1',
                mesob_id: 'M001',
                first_name: 'John',
                middle_name: 'M',
                last_name: 'Doe',
                status: 'ACTIVE',
              }
            ],
            meta: { total: 1 }
          });
        }
        return Promise.resolve({ data: [] });
      });

      // WHEN: User views the employees list
      renderWithAuth(<EmployeesPage />, authContext);

      // THEN: Edit buttons should not be visible
      await waitFor(() => {
        // Look for edit icon/button in the actions column
        const editButtons = screen.queryAllByTitle(/edit employee/i);
        expect(editButtons).toHaveLength(0);
      }, { timeout: 3000 });
    });
  });

  describe('Property 1.3: Delete buttons visible without delete permission', () => {
    it('should hide delete buttons when user lacks delete permission (BUG)', async () => {
      // GIVEN: User without 'delete' permission on 'departments'
      const authContext = createAuthContext();
      
      apiClient.get.mockImplementation((url, config) => {
        if (url === '/auth/check-permission') {
          const { action, resource } = config.params || {};
          if (action === 'view' && resource === 'departments') return Promise.resolve({ data: { allowed: true } });
          if (action === 'delete' && resource === 'departments') return Promise.resolve({ data: { allowed: false } });
          return Promise.resolve({ data: { allowed: false } });
        }
        if (url.includes('/departments')) {
          return Promise.resolve({
            data: [
              { uuid: 'dept-1', name: 'IT Department', code: 'IT' }
            ],
            meta: { total: 1 }
          });
        }
        return Promise.resolve({ data: [] });
      });

      // WHEN: User views departments
      renderWithAuth(<DepartmentsPage />, authContext);

      // THEN: Delete buttons should not be visible
      await waitFor(() => {
        const deleteButtons = screen.queryAllByTitle(/delete/i);
        expect(deleteButtons).toHaveLength(0);
      }, { timeout: 3000 });
    });
  });

  describe('Property 1.4: Export buttons visible without export permission', () => {
    it('should hide export buttons when user lacks export permission on employees (BUG)', async () => {
      // GIVEN: User without 'export' permission on 'employees'
      const authContext = createAuthContext();
      setupPermissionMocks({
        'view:employees': true,
        'export:employees': false,
      });

      // WHEN: User views employees page
      renderWithAuth(<EmployeesPage />, authContext);

      // THEN: Export CSV and PDF buttons should be hidden
      await waitFor(() => {
        const csvButton = screen.queryByText(/csv/i);
        const pdfButton = screen.queryByText(/pdf/i);
        
        expect(csvButton).not.toBeInTheDocument();
        expect(pdfButton).not.toBeInTheDocument();
      }, { timeout: 3000 });
    });
  });

  describe('Property 1.5: Status change buttons visible without update permission', () => {
    it('should hide activate/deactivate buttons when user lacks update permission (BUG)', async () => {
      // GIVEN: User without 'update' permission on 'employees'
      const authContext = createAuthContext();
      
      apiClient.get.mockImplementation((url, config) => {
        if (url === '/auth/check-permission') {
          const { action, resource } = config.params || {};
          if (action === 'view' && resource === 'employees') return Promise.resolve({ data: { allowed: true } });
          if (action === 'update' && resource === 'employees') return Promise.resolve({ data: { allowed: false } });
          return Promise.resolve({ data: { allowed: false } });
        }
        if (url.includes('/employees')) {
          return Promise.resolve({
            data: [
              {
                uuid: 'emp-1',
                mesob_id: 'M001',
                first_name: 'John',
                middle_name: 'M',
                last_name: 'Doe',
                status: 'ACTIVE',
              }
            ],
            meta: { total: 1 }
          });
        }
        return Promise.resolve({ data: [] });
      });

      // WHEN: User views employees
      renderWithAuth(<EmployeesPage />, authContext);

      // THEN: Status change buttons (activate/deactivate) should not be visible
      await waitFor(() => {
        const statusButtons = screen.queryAllByTitle(/activate employee|deactivate employee/i);
        expect(statusButtons).toHaveLength(0);
      }, { timeout: 3000 });
    });
  });
});

/**
 * EXPECTED OUTCOME:
 * 
 * All tests in this suite should FAIL on unfixed code.
 * Each failure is a counterexample proving the bug exists:
 * - "Add Employee" button visible to user without 'create' permission
 * - Edit icons visible to user without 'update' permission  
 * - Delete buttons visible to user without 'delete' permission
 * - Export buttons visible to user without 'export' permission
 * - Status change buttons visible to user without 'update' permission
 * 
 * After implementing the fix (wrapping buttons in <Can> components),
 * all tests should PASS, confirming the bug is resolved.
 */
