const { db } = require("../config/db");
const {
  calculateMonthsOfService,
  isValidDateFormat,
  getCurrentEthiopianBudgetYear,
  toUtcDateOnly,
} = require("./calendarService");

class LeaveValidationService {
  /**
   * Validation 1: Checks employee service period using completed calendar months
   * @param {string} employeeUuid - Employee UUID
   * @param {string} startDate - Leave start date
   * @param {string} leaveType - Type of leave
   * @returns {Object} Validation result
   */
  static async validateServicePeriod(employeeUuid, startDate, leaveType) {
    try {
      // Get leave policy for eligibility months
      const policyQuery = `
        SELECT eligibilityMonths 
        FROM leavePolicies 
        WHERE UPPER(leaveType) = ?
      `;

      const [policyRows] = await db.promise().execute(policyQuery, [String(leaveType || '').toUpperCase()]);

      if (policyRows.length === 0) {
        return {
          valid: false,
          message: `Leave policy not found for type: ${leaveType}`,
        };
      }

      const policy = policyRows[0];
      const minimumRequired = policy.eligibilityMonths || 11; // Default to 11 if not specified

      // Get employee hire date from Employees table
      const query = `
        SELECT hire_date 
        FROM Employees 
        WHERE uuid = ?
      `;

      const [rows] = await db.promise().execute(query, [employeeUuid]);

      if (rows.length === 0) {
        return {
          valid: false,
          message: "Employee not found",
        };
      }

      const employee = rows[0];
      
      // Calculate completed calendar months (not days/30.44)
      const monthsOfService = calculateMonthsOfService(
        employee.hire_date,
        startDate,
      );

      if (monthsOfService < minimumRequired) {
        return {
          valid: false,
          message: `Employee must have at least ${minimumRequired} completed months of service for ${leaveType} leave. Current: ${monthsOfService} months`,
          currentMonths: monthsOfService,
          requiredMonths: minimumRequired,
        };
      }

      return {
        valid: true,
        message: "Service period requirement met",
        currentMonths: monthsOfService,
      };
    } catch (error) {
      console.error("Error validating service period:", error);
      return { valid: false, message: "Error validating service period" };
    }
  }

  /**
   * Validation 3: Verifies that total_days is less than or equal to remainingDays
   * @param {string} employeeUuid - Employee UUID
   * @param {number} requestedDays - Number of days requested
   * @param {string} leaveType - Type of leave
   * @returns {Object} Validation result
   */
  static async validateBalance(employeeUuid, requestedDays, leaveType) {
    try {
      const currentBudgetYear = Number(
        (await getCurrentEthiopianBudgetYear()).year,
      );

      // Get employee's current leave balance from employeeLeaveBalances
      const query = `
        SELECT entitledDays, carriedForwardDays, usedDays, remainingDays, status, budgetYear
        FROM employeeLeaveBalances 
        WHERE employee_uuid = ? AND budgetYear = ? AND status = 'ACTIVE'
      `;

      const [rows] = await db
        .promise()
        .execute(query, [employeeUuid, currentBudgetYear]);

      if (rows.length === 0) {
        // Check if balance exists for other budget years
        const [allRows] = await db.promise().execute(
          `SELECT budgetYear, status FROM employeeLeaveBalances WHERE employee_uuid = ? ORDER BY budgetYear DESC`,
          [employeeUuid]
        );
        
        const availableYears = allRows.map(r => `${r.budgetYear} (${r.status})`).join(', ');
        
        return {
          valid: false,
          message: `No active leave balance found for budget year ${currentBudgetYear}. Employee has balances for: ${availableYears || 'none'}`,
          currentBudgetYear,
          availableBalances: allRows,
        };
      }

      const balance = rows[0];

      if (balance.remainingDays < requestedDays) {
        return {
          valid: false,
          message: `Insufficient leave balance. Requested: ${requestedDays} days, Available: ${balance.remainingDays} days`,
          requestedDays,
          availableDays: balance.remainingDays,
          currentBalance: balance,
        };
      }

      return {
        valid: true,
        message: "Sufficient leave balance",
        availableDays: balance.remainingDays,
        currentBalance: balance,
      };
    } catch (error) {
      console.error("Error validating balance:", error);
      return { valid: false, message: "Error validating leave balance" };
    }
  }

  /**
   * Validate leave type specific requirements
   * @param {string} leaveType - Type of leave
   * @param {Object} requestData - Leave request data
   * @returns {Object} Validation result
   */
  static async validateLeaveTypeSpecifics(leaveType, requestData) {
    try {
      const normalized = String(leaveType || '').trim().toUpperCase();
      switch (normalized) {
        case "ANNUAL":
          return this.validateAnnualLeave(requestData);

        case "PATERNITY":
          return this.validatePaternityLeave(requestData);

        case "SICK":
          return this.validateSickLeave(requestData);

        case "MATERNITY":
          return this.validateMaternityLeave(requestData);

        default: {
          const [rows] = await db.promise().execute(
            "SELECT baseDays, maxDays FROM leavePolicies WHERE UPPER(leaveType) = ?",
            [normalized]
          );
          if (rows.length > 0) {
            return { valid: true, message: `${leaveType} leave requirements met` };
          }
          return { valid: false, message: `Invalid leave type: ${leaveType}` };
        }
      }
    } catch (error) {
      console.error("Error validating leave type specifics:", error);
      return {
        valid: false,
        message: "Error validating leave type requirements",
      };
    }
  }

  /**
   * Validate Annual Leave requirements using database policies
   * @param {Object} requestData - Request data
   * @returns {Object} Validation result
   */
  static async validateAnnualLeave(requestData) {
    try {
      const { total_days } = requestData;

      // Get leave policy from database
      const query = `
        SELECT baseDays, maxDays 
        FROM leavePolicies 
        WHERE leaveType = 'Annual'
      `;

      const [rows] = await db.promise().execute(query);

      if (rows.length === 0) {
        return { valid: false, message: "Annual leave policy not found" };
      }

      const policy = rows[0];
      const minDays = 1; // Minimum 1 day
      const maxDays = policy.maxDays || 30; // Use policy maxDays or default to 30

      if (total_days < minDays || total_days > maxDays) {
        return {
          valid: false,
          message: `Annual leave must be between ${minDays} and ${maxDays} days`,
        };
      }

      return {
        valid: true,
        message: "Annual leave requirements met",
      };
    } catch (error) {
      console.error("Error validating annual leave:", error);
      return {
        valid: false,
        message: "Error validating annual leave requirements",
      };
    }
  }

  /**
   * Validate Paternity Leave requirements using database policies
   * @param {Object} requestData - Request data
   * @returns {Object} Validation result
   */
  static async validatePaternityLeave(requestData) {
    try {
      const { total_days } = requestData;

      // Get leave policy from database
      const query = `
        SELECT baseDays, maxDays 
        FROM leavePolicies 
        WHERE leaveType = 'Paternity'
      `;

      const [rows] = await db.promise().execute(query);

      if (rows.length === 0) {
        // Fallback to hardcoded value if policy not found
        const requiredDays = 10;
        if (total_days !== requiredDays) {
          return {
            valid: false,
            message: `Paternity leave must be exactly ${requiredDays} working days`,
          };
        }
      } else {
        const policy = rows[0];
        const requiredDays = policy.baseDays || policy.maxDays || 10;

        if (total_days !== requiredDays) {
          return {
            valid: false,
            message: `Paternity leave must be exactly ${requiredDays} working days`,
          };
        }
      }

      return {
        valid: true,
        message: "Paternity leave requirements met",
      };
    } catch (error) {
      console.error("Error validating paternity leave:", error);
      return {
        valid: false,
        message: "Error validating paternity leave requirements",
      };
    }
  }

  /**
   * Validate Sick Leave requirements using database policies
   * @param {Object} requestData - Request data
   * @returns {Object} Validation result
   */
  static async validateSickLeave(requestData) {
    try {
      const { personInfoUuid, startDate, total_days, documentCount } =
        requestData;

      // Get leave policy from database
      const policyQuery = `
        SELECT baseDays, maxDays, eligibilityMonths 
        FROM leavePolicies 
        WHERE leaveType = 'Sick'
      `;

      const [policyRows] = await db.promise().execute(policyQuery);

      let maxSickDays = 240; // Default fallback
      let eligibilityMonths = 6; // Default fallback

      if (policyRows.length > 0) {
        const policy = policyRows[0];
        maxSickDays = policy.maxDays || 240;
        eligibilityMonths = policy.eligibilityMonths || 6;
      }

      // Check if employee has completed probation period
      const serviceValidation = await this.validateServicePeriod(
        personInfoUuid,
        startDate,
        "Sick",
      );
      if (
        !serviceValidation.valid &&
        serviceValidation.currentMonths < eligibilityMonths
      ) {
        return {
          valid: false,
          message: `Sick leave is only available after probation period (${eligibilityMonths} months of service)`,
        };
      }

      // Medical document upload is required for sick leave
      if (!Number.isInteger(documentCount) || documentCount < 1) {
        return {
          valid: false,
          message: "Medical document is required for sick leave",
        };
      }

      // Check annual cap
      if (total_days > maxSickDays) {
        return {
          valid: false,
          message: `Sick leave cannot exceed ${maxSickDays} days in a single year`,
        };
      }

      return {
        valid: true,
        message: "Sick leave requirements met",
      };
    } catch (error) {
      console.error("Error validating sick leave:", error);
      return {
        valid: false,
        message: "Error validating sick leave requirements",
      };
    }
  }

  /**
   * Validate Maternity Leave requirements using database policies
   * @param {Object} requestData - Request data
   * @returns {Object} Validation result
   */
  static async validateMaternityLeave(requestData) {
    try {
      const { total_days } = requestData;

      // Get leave policy from database
      const query = `
        SELECT baseDays, maxDays 
        FROM leavePolicies 
        WHERE leaveType = 'Maternity'
      `;

      const [rows] = await db.promise().execute(query);

      let requiredDays = 90; // Default fallback

      if (rows.length > 0) {
        const policy = rows[0];
        requiredDays = policy.baseDays || policy.maxDays || 90;
      }

      if (total_days !== requiredDays) {
        return {
          valid: false,
          message: `Maternity leave must be exactly ${requiredDays} days`,
        };
      }

      return {
        valid: true,
        message: "Maternity leave requirements met",
      };
    } catch (error) {
      console.error("Error validating maternity leave:", error);
      return {
        valid: false,
        message: "Error validating maternity leave requirements",
      };
    }
  }

  /**
   * Validate request dates
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Object} Validation result
   */
  static validateRequestDates(startDate, endDate) {
    try {
      // Validate date formats
      if (!isValidDateFormat(startDate)) {
        return {
          valid: false,
          message: "Invalid start date format. Use YYYY-MM-DD",
        };
      }

      if (!isValidDateFormat(endDate)) {
        return {
          valid: false,
          message: "Invalid end date format. Use YYYY-MM-DD",
        };
      }

      // Convert to date-only values to avoid timezone/time-of-day drift
      const start = toUtcDateOnly(startDate);
      const end = toUtcDateOnly(endDate);

      // Check if dates are valid
      if (!start || !end) {
        return { valid: false, message: "Invalid dates provided" };
      }

      // Check if start date is before end date
      if (start > end) {
        return { valid: false, message: "Start date cannot be after end date" };
      }

      // Check if start date is in the future
      const today = toUtcDateOnly(new Date());

      if (start < today) {
        return { valid: false, message: "Start date cannot be in the past" };
      }

      return {
        valid: true,
        message: "Request dates are valid",
      };
    } catch (error) {
      console.error("Error validating request dates:", error);
      return { valid: false, message: "Error validating request dates" };
    }
  }
}

module.exports = LeaveValidationService;
