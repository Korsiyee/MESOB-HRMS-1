const {
  getCurrentEthiopianBudgetYear,
  getBudgetYearForDate,
  toUtcDateOnly,
  formatDate,
} = require("./calendarService");
const { db } = require("../config/db");

class BudgetYearService {
  static async getCurrentBudgetYear() {
    try {
      const budgetYear = Number((await getCurrentEthiopianBudgetYear()).year);

      return {
        ethiopian_year: budgetYear,
        is_active: true,
        max_leave_days_per_year: 30,
      };
    } catch (error) {
      console.error("Error getting current budget year:", error);
      throw error;
    }
  }

  /**
   * Get the budget year for a given date
   * @param {string} date - YYYY-MM-DD format
   * @returns {Promise<number|null>} Budget year number
   */
  static async getBudgetYearForDate(date) {
    const normalizedDate = toUtcDateOnly(date);
    if (!normalizedDate) {
      return null;
    }

    // Format the date as YYYY-MM-DD string before passing to getBudgetYearForDate
    const dateString = formatDate(normalizedDate);
    if (!dateString) {
      return null;
    }

    const budgetYearInfo = await getBudgetYearForDate(dateString);
    return budgetYearInfo.year;
  }

  static async validateDateInBudgetYear(date) {
    try {
      const budgetYear = Number((await getCurrentEthiopianBudgetYear()).year);

      if (!budgetYear) {
        return {
          valid: false,
          message: "No active budget year configured",
          error: "NO_BUDGET_YEAR",
        };
      }

      const checkDate = toUtcDateOnly(date);
      const today = toUtcDateOnly(new Date());

      if (!checkDate) {
        return {
          valid: false,
          message: `Invalid leave date: ${date}`,
          error: "INVALID_DATE",
        };
      }

      if (checkDate < today) {
        return {
          valid: false,
          message: `Leave date ${date} is in the past`,
          error: "DATE_IN_PAST",
        };
      }

      // Use getBudgetYearForDate as single source of truth
      const requestBudgetYear = await this.getBudgetYearForDate(checkDate);
      if (!requestBudgetYear) {
        return {
          valid: false,
          message: `Could not determine budget year for date ${date}`,
          error: "BUDGET_YEAR_RESOLUTION_FAILED",
        };
      }

      if (requestBudgetYear !== budgetYear) {
        return {
          valid: false,
          message: `Leave date ${date} is outside budget year ${budgetYear}`,
          error: "OUTSIDE_BUDGET_YEAR",
          requestBudgetYear,
          budgetYear,
        };
      }

      return {
        valid: true,
        message: `Date ${date} is valid for budget year ${budgetYear}`,
        budgetYear,
      };
    } catch (error) {
      console.error("Error validating budget year date:", error);
      return {
        valid: false,
        message: "Error validating budget year",
        error: "VALIDATION_ERROR",
      };
    }
  }

  static async checkBudgetYearBalance(employeeUuid, requestedDays) {
    try {
      const budgetYear = Number((await getCurrentEthiopianBudgetYear()).year);

      if (!budgetYear) {
        return {
          valid: false,
          message: "No active budget year configured",
          error: "NO_BUDGET_YEAR",
        };
      }

      const balanceQuery = `
        SELECT entitledDays, carriedForwardDays, usedDays, remainingDays
        FROM employeeLeaveBalances 
        WHERE employee_uuid = ?
        AND budgetYear = ?
        AND status = 'ACTIVE'
      `;

      const [balanceRows] = await db
        .promise()
        .execute(balanceQuery, [employeeUuid, budgetYear]);

      if (balanceRows.length === 0) {
        return {
          valid: false,
          message: `No leave balance found for employee ${employeeUuid} in budget year ${budgetYear}`,
          error: "NO_BALANCE_FOUND",
        };
      }

      const balance = balanceRows[0];

      if (balance.remainingDays < requestedDays) {
        return {
          valid: false,
          message: `Insufficient leave days. Requested: ${requestedDays}, Available: ${balance.remainingDays}`,
          error: "INSUFFICIENT_BALANCE",
          requestedDays,
          availableDays: balance.remainingDays,
        };
      }

      return {
        valid: true,
        message: `Sufficient balance`,
        requestedDays,
        remainingDays: balance.remainingDays - requestedDays,
        currentBalance: balance,
      };
    } catch (error) {
      console.error("Error checking leave balance:", error);
      return {
        valid: false,
        message: "Error checking leave balance",
        error: "BALANCE_CHECK_ERROR",
      };
    }
  }
}

module.exports = BudgetYearService;
