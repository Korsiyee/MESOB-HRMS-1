/**
 * Bug Condition Exploration Test for Attendance Overview Infinite Loop
 * 
 * **CRITICAL**: This test is EXPECTED TO FAIL on unfixed code.
 * Failure confirms the infinite loop bug exists.
 * 
 * Bug Condition: useEffect depends on [load] function which is recreated on every render
 * due to useCallback dependency on [range], creating an infinite fetch loop.
 * 
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AttendanceOverviewPage from './AttendanceOverviewPage';
import { AttendanceApi } from '../api/attendanceApi';

describe('Bug Condition Exploration: Attendance Overview Infinite Loop', () => {
  let renderCount = 0;
  let apiCallCount = 0;
  let apiCallBatches = [];
  let currentBatchTimestamp = null;
  let originalConsoleError;

  beforeEach(() => {
    renderCount = 0;
    apiCallCount = 0;
    apiCallBatches = [];
    currentBatchTimestamp = null;

    // Suppress React warnings/errors during this test since we expect the bug to cause issues
    originalConsoleError = console.error;
    console.error = vi.fn();

    // Mock all AttendanceApi methods to track call count and timing
    const createApiMock = (name) => vi.fn(async () => {
      const now = Date.now();
      
      // If this call is more than 100ms after the last batch, start a new batch
      if (currentBatchTimestamp === null || now - currentBatchTimestamp > 100) {
        currentBatchTimestamp = now;
        apiCallBatches.push({
          timestamp: now,
          calls: []
        });
      }
      
      // Add call to current batch
      if (apiCallBatches.length > 0) {
        apiCallBatches[apiCallBatches.length - 1].calls.push({
          method: name,
          timestamp: now
        });
      }
      
      apiCallCount++;
      
      // Return minimal mock data matching API response structure
      if (name === 'getOverviewSummary') {
        return { data: { PRESENT: { count: 100 }, ABSENT: { count: 10 }, LATE: { count: 5 }, HALF_DAY: { count: 2 }, LEAVE: { count: 3 }, total: 120 } };
      } else if (name === 'getTrend') {
        return { data: [{ date: '2024-01-01', present: 50, late: 5, absent: 10 }] };
      } else if (name === 'getDepartmentStats') {
        return { data: [{ department: 'Engineering', present_pct: 95 }] };
      } else if (name === 'getTopEmployees') {
        return { data: [{ employee_uuid: 'e1', full_name: 'John Doe', department: 'Engineering', present_days: 20 }] };
      } else if (name === 'getRecentCorrections') {
        return { data: [{ uuid: 'c1', full_name: 'Jane Doe', date: '2024-01-01', status: 'PRESENT', corrected_by_name: 'Admin' }] };
      } else if (name === 'getAllAttendance') {
        return { data: [{ worked_hours: 8, overtime_hours: 1, missing_hours: 0, late_minutes: 0 }] };
      }
      return { data: [] };
    });

    vi.spyOn(AttendanceApi, 'getOverviewSummary').mockImplementation(createApiMock('getOverviewSummary'));
    vi.spyOn(AttendanceApi, 'getTrend').mockImplementation(createApiMock('getTrend'));
    vi.spyOn(AttendanceApi, 'getDepartmentStats').mockImplementation(createApiMock('getDepartmentStats'));
    vi.spyOn(AttendanceApi, 'getTopEmployees').mockImplementation(createApiMock('getTopEmployees'));
    vi.spyOn(AttendanceApi, 'getRecentCorrections').mockImplementation(createApiMock('getRecentCorrections'));
    vi.spyOn(AttendanceApi, 'getAllAttendance').mockImplementation(createApiMock('getAllAttendance'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    console.error = originalConsoleError;
  });

  /**
   * Property 1: Bug Condition - Infinite Loop Fetch Verification
   * 
   * **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
   * **DO NOT attempt to fix the test or the code when it fails**
   * 
   * Bug Condition from design: isBugCondition(X) where useEffect depends on [load]
   * and load is recreated on every render due to useCallback dependency on [range]
   * 
   * Expected behavior on UNFIXED code:
   * - API calls repeat infinitely (60+ batches in 2 seconds)
   * - Multiple batches of requests occur without user interaction
   * - Component enters infinite render loop
   * 
   * Expected behavior on FIXED code:
   * - Exactly 1 batch of API calls on initial mount
   * - No additional batches without user interaction
   * - Component stabilizes after initial render
   */
  it('should detect infinite loop bug on initial mount (EXPECTED TO FAIL ON UNFIXED CODE)', async () => {
    // Render the component
    const { container } = render(
      <BrowserRouter>
        <AttendanceOverviewPage />
      </BrowserRouter>
    );

    // Wait for initial API calls and potential infinite loop to manifest
    // On unfixed code: we expect many batches of API calls within 2 seconds
    // On fixed code: we expect exactly 1 batch of 6 parallel API calls
    await waitFor(() => {
      expect(apiCallCount).toBeGreaterThanOrEqual(6); // At least initial batch
    }, { timeout: 3000 });

    // Give additional time for infinite loop to manifest if present
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Count the number of distinct batches
    // A batch is a group of API calls that occur within 100ms of each other
    const batchCount = apiCallBatches.length;

    console.log('\n=== Bug Condition Exploration Results ===');
    console.log(`Total API calls: ${apiCallCount}`);
    console.log(`Total API call batches: ${batchCount}`);
    console.log(`Batches breakdown:`);
    apiCallBatches.forEach((batch, i) => {
      console.log(`  Batch ${i + 1}: ${batch.calls.length} calls at ${new Date(batch.timestamp).toISOString()}`);
    });

    // ASSERTION: On FIXED code, we expect exactly 1 batch (initial mount)
    // On UNFIXED code (buggy), we expect multiple batches (infinite loop)
    
    // This assertion WILL FAIL on unfixed code because batchCount will be >> 1
    // This is EXPECTED and CORRECT - the failure confirms the bug exists
    expect(batchCount).toBe(1);

    // Additional assertion: Total calls should be exactly 6 (one batch of parallel requests)
    // On unfixed code, this will be 60+ calls due to infinite loop
    expect(apiCallCount).toBe(6);

    // COUNTEREXAMPLE DOCUMENTATION:
    // When this test FAILS on unfixed code, the failure message will show:
    // - Expected batchCount: 1
    // - Actual batchCount: 20+ (or more, depending on timing)
    // - Expected apiCallCount: 6
    // - Actual apiCallCount: 120+ (or more)
    // 
    // This proves the infinite loop exists and confirms the bug condition.
  }, 10000); // 10 second timeout to allow observation of infinite loop

  /**
   * Property 1: Bug Condition - Infinite Loop Detection via Render Count
   * 
   * Alternative approach: Monitor component re-renders instead of API calls
   * 
   * Expected on UNFIXED code: Component re-renders continuously
   * Expected on FIXED code: Component renders initial + data load renders (~2-4 times total)
   */
  it('should detect infinite render loop through excessive re-renders (EXPECTED TO FAIL ON UNFIXED CODE)', async () => {
    let localRenderCount = 0;

    // Wrap component to track renders
    const WrappedComponent = () => {
      localRenderCount++;
      return <AttendanceOverviewPage />;
    };

    render(
      <BrowserRouter>
        <WrappedComponent />
      </BrowserRouter>
    );

    // Wait for initial render and data load
    await waitFor(() => {
      expect(apiCallCount).toBeGreaterThanOrEqual(6);
    }, { timeout: 3000 });

    // Wait additional time to observe render pattern
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== Render Count Analysis ===');
    console.log(`Total renders in 5 seconds: ${localRenderCount}`);

    // ASSERTION: On FIXED code, renders should be minimal (< 10)
    // Initial render + loading state change + data load completes = ~3-5 renders
    // On UNFIXED code, renders will be continuous (100+)
    
    // This WILL FAIL on unfixed code with high render count
    expect(localRenderCount).toBeLessThan(10);

    // COUNTEREXAMPLE: When this fails, it shows:
    // - Expected: < 10 renders
    // - Actual: 200+ renders (infinite loop)
  }, 10000);

  /**
   * Property 1: Bug Condition - Continuous API Calls Over Time
   * 
   * Verifies that API calls stop after initial load on fixed code
   * On unfixed code, API calls continue indefinitely
   */
  it('should not make additional API calls after initial load (EXPECTED TO FAIL ON UNFIXED CODE)', async () => {
    render(
      <BrowserRouter>
        <AttendanceOverviewPage />
      </BrowserRouter>
    );

    // Wait for initial batch
    await waitFor(() => {
      expect(apiCallCount).toBeGreaterThanOrEqual(6);
    }, { timeout: 3000 });

    // Record call count after initial load
    const callCountAfterInitial = apiCallCount;
    console.log(`\nAPI calls after initial load: ${callCountAfterInitial}`);

    // Wait 3 more seconds
    await new Promise(resolve => setTimeout(resolve, 3000));

    const callCountAfterWait = apiCallCount;
    console.log(`API calls after waiting 3 seconds: ${callCountAfterWait}`);

    // ASSERTION: On FIXED code, no new calls should be made
    // On UNFIXED code, many more calls will be made
    expect(callCountAfterWait).toBe(callCountAfterInitial);

    // COUNTEREXAMPLE: When this fails:
    // - callCountAfterInitial: 6
    // - callCountAfterWait: 180+ (continuous calls)
    // - Difference proves infinite loop
  }, 10000);

  /**
   * Property 1: Bug Condition - Verification of Single Batch Pattern
   * 
   * On fixed code: One batch of 6 parallel API calls
   * On unfixed code: Multiple batches repeating infinitely
   */
  it('should make exactly 6 parallel API calls in a single batch on mount (EXPECTED TO FAIL ON UNFIXED CODE)', async () => {
    render(
      <BrowserRouter>
        <AttendanceOverviewPage />
      </BrowserRouter>
    );

    // Wait for calls to complete
    await waitFor(() => {
      expect(apiCallCount).toBeGreaterThanOrEqual(6);
    }, { timeout: 3000 });

    // Wait to observe pattern
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('\n=== API Call Pattern Analysis ===');
    console.log(`Expected pattern: 1 batch of 6 calls`);
    console.log(`Actual pattern: ${apiCallBatches.length} batches, ${apiCallCount} total calls`);

    // Verify each API method called exactly once (on fixed code)
    expect(AttendanceApi.getOverviewSummary).toHaveBeenCalledTimes(1);
    expect(AttendanceApi.getTrend).toHaveBeenCalledTimes(1);
    expect(AttendanceApi.getDepartmentStats).toHaveBeenCalledTimes(1);
    expect(AttendanceApi.getTopEmployees).toHaveBeenCalledTimes(1);
    expect(AttendanceApi.getRecentCorrections).toHaveBeenCalledTimes(1);
    expect(AttendanceApi.getAllAttendance).toHaveBeenCalledTimes(1);

    // COUNTEREXAMPLE: When this fails on unfixed code:
    // - Each method called 20+ times instead of 1
    // - Proves infinite loop bug exists
  }, 10000);
});
