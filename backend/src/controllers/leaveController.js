const {
  fetchBalance,
  rebuildCurrentYearBalance,
  rebuildCurrentYearBalancesForAllActiveEmployees,
} = require("../services/balanceService");
const { safeLogEvent } = require("../services/auditLogService");
const { sendSuccess, sendError } = require("../utils/response");
const { isValidUuid } = require("../utils/validation");
const db = require("../config/db");

exports.getBalance = async (req, res) => {
  try {
    const employeeUuid = String(req.params.uuid || "").trim();

    if (!employeeUuid || !isValidUuid(employeeUuid)) {
      return sendError(res, {
        status: 400,
        message: "Valid employee UUID is required.",
        error: "VALIDATION_ERROR",
      });
    }

    // Authorization: Users can only view their own balance unless they're HR/Admin
    if (
      req.user.employee_uuid !== employeeUuid &&
      !["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN", "DEPARTMENT_HEAD"].includes(req.user.role)
    ) {
      return sendError(res, {
        status: 403,
        message: "You can only view your own leave balance.",
        error: "FORBIDDEN",
      });
    }

    const balanceData = await fetchBalance(employeeUuid);

    if (!balanceData) {
      return sendError(res, {
        status: 404,
        message: "Current budget year leave balance not found.",
        error: "NOT_FOUND",
      });
    }

    return sendSuccess(res, {
      status: 200,
      message: "Leave balance retrieved successfully.",
      data: balanceData,
    });
  } catch (error) {
    console.error("Error in getBalance:", error);
    return sendError(res, {
      status: error.status || 500,
      message: error.message || "Failed to fetch leave balance.",
      error: "INTERNAL_ERROR",
    });
  }
};

exports.rebuildBalance = async (req, res) => {
  try {
    const employeeUuid = String(req.params.uuid || "").trim();

    if (!employeeUuid || !isValidUuid(employeeUuid)) {
      return sendError(res, {
        status: 400,
        message: "Valid employee UUID is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const balanceData = await rebuildCurrentYearBalance(employeeUuid);

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "REBUILD_BALANCE",
      entityType: "LEAVE_BALANCE",
      entityUuid: employeeUuid,
      diff: { employeeUuid, result: balanceData },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Leave balance rebuilt successfully.",
      data: balanceData,
    });
  } catch (error) {
    console.error("Error in rebuildBalance:", error);
    return sendError(res, {
      status: error.status || 500,
      message: error.message || "Failed to rebuild leave balance.",
      error: "INTERNAL_ERROR",
    });
  }
};

exports.rebuildBalanceByBody = async (req, res) => {
  try {
    const employeeUuid = String(
      req.body?.employee_uuid || req.body?.uuid || "",
    ).trim();

    if (!employeeUuid || !isValidUuid(employeeUuid)) {
      return sendError(res, {
        status: 400,
        message: "Valid employee_uuid (or uuid) is required in request body.",
        error: "VALIDATION_ERROR",
      });
    }

    const balanceData = await rebuildCurrentYearBalance(employeeUuid);

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "REBUILD_BALANCE",
      entityType: "LEAVE_BALANCE",
      entityUuid: employeeUuid,
      diff: { employeeUuid, result: balanceData },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Leave balance rebuilt successfully.",
      data: balanceData,
    });
  } catch (error) {
    console.error("Error in rebuildBalanceByBody:", error);
    return sendError(res, {
      status: error.status || 500,
      message: error.message || "Failed to rebuild leave balance.",
      error: "INTERNAL_ERROR",
    });
  }
};

exports.rebuildAllBalances = async (req, res) => {
  try {
    const result = await rebuildCurrentYearBalancesForAllActiveEmployees();

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "REBUILD_ALL_BALANCES",
      entityType: "LEAVE_BALANCE",
      entityUuid: null,
      diff: { result },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "All employee balances rebuilt successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in rebuildAllBalances:", error);
    return sendError(res, {
      status: error.status || 500,
      message: error.message || "Failed to rebuild balances for employees.",
      error: "INTERNAL_ERROR",
    });
  }
};

exports.getAggregatedBalances = async (req, res) => {
  try {
    // Get current budget year
    const [budgetYear] = await db.promise().execute(
      `SELECT year FROM budgetYears WHERE status = 'ACTIVE' ORDER BY year DESC LIMIT 1`
    );

    const currentYear = budgetYear?.[0]?.year || new Date().getFullYear();

    // Aggregate all active employee balances for current year
    const [results] = await db.promise().execute(
      `SELECT 
        COALESCE(SUM(entitledDays), 0) AS totalEntitled,
        COALESCE(SUM(usedDays), 0) AS totalUsed,
        COALESCE(SUM(remainingDays), 0) AS totalRemaining,
        COALESCE(SUM(carriedForwardDays), 0) AS totalCarriedForward,
        COUNT(*) AS employeeCount
      FROM employeeLeaveBalances
      WHERE budgetYear = ? AND status = 'ACTIVE'`,
      [currentYear]
    );

    const data = results[0] || {
      totalEntitled: 0,
      totalUsed: 0,
      totalRemaining: 0,
      totalCarriedForward: 0,
      employeeCount: 0,
    };

    return sendSuccess(res, {
      status: 200,
      message: "Aggregated leave balances retrieved successfully.",
      data: {
        entitled: parseFloat(data.totalEntitled) || 0,
        used: parseFloat(data.totalUsed) || 0,
        remaining: parseFloat(data.totalRemaining) || 0,
        carriedForward: parseFloat(data.totalCarriedForward) || 0,
        employeeCount: parseInt(data.employeeCount) || 0,
        budgetYear: currentYear,
      },
    });
  } catch (error) {
    console.error("Error in getAggregatedBalances:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to fetch aggregated leave balances.",
      error: "INTERNAL_ERROR",
    });
  }
};
