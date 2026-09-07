const { db } = require("../config/db");
const { safeLogEvent } = require("../services/auditLogService");
const { sendSuccess, sendError } = require("../utils/response");
const { randomUUID } = require("crypto");

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const converted = Number(value);
  return Number.isNaN(converted) ? null : converted;
}

function parseBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value === 0 || value === "0" || value === "false") {
    return false;
  }
  return null;
}

exports.listPolicies = async (req, res) => {
  try {
    const [rows] = await db.promise().execute(
      `
      SELECT uuid, leaveType, baseDays, incrementPerYear, maxDays, eligibilityMonths, useBudgetYear
      FROM leavePolicies
      ORDER BY leaveType ASC
      `,
    );

    return sendSuccess(res, {
      status: 200,
      message: "Policies retrieved successfully.",
      data: rows,
    });
  } catch (error) {
    console.error("Error listing leave policies:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving leave policies",
      error: "POLICY_LIST_ERROR",
    });
  }
};

exports.getPolicy = async (req, res) => {
  try {
    const leaveType = String(req.params.leaveType || "").trim();
    if (!leaveType) {
      return sendError(res, {
        status: 400,
        message: "leaveType path param is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const [rows] = await db.promise().execute(
      `
      SELECT uuid, leaveType, baseDays, incrementPerYear, maxDays, eligibilityMonths, useBudgetYear
      FROM leavePolicies
      WHERE leaveType = ?
      LIMIT 1
      `,
      [leaveType],
    );

    if (!rows.length) {
      return sendError(res, {
        status: 404,
        message: `Policy '${leaveType}' not found.`,
        error: "NOT_FOUND",
      });
    }

    return sendSuccess(res, {
      status: 200,
      message: "Policy retrieved successfully.",
      data: rows[0],
    });
  } catch (error) {
    console.error("Error getting leave policy:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving leave policy",
      error: "POLICY_GET_ERROR",
    });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const {
      leaveType,
      baseDays,
      incrementPerYear,
      maxDays,
      eligibilityMonths,
      useBudgetYear,
    } = req.body;

    // Validation
    if (!leaveType) {
      return sendError(res, {
        status: 400,
        message: "leaveType is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const leaveTypeStr = String(leaveType).trim();
    if (!leaveTypeStr) {
      return sendError(res, {
        status: 400,
        message: "leaveType cannot be empty.",
        error: "VALIDATION_ERROR",
      });
    }

    // Validate numeric fields
    const baseDaysNum = toNumberOrNull(baseDays);
    const incrementPerYearNum = toNumberOrNull(incrementPerYear);
    const maxDaysNum = toNumberOrNull(maxDays);
    const eligibilityMonthsNum = toNumberOrNull(eligibilityMonths);

    if (baseDaysNum === null || baseDaysNum < 0) {
      return sendError(res, {
        status: 400,
        message: "baseDays must be a non-negative number.",
        error: "VALIDATION_ERROR",
      });
    }

    if (incrementPerYearNum === null || incrementPerYearNum < 0) {
      return sendError(res, {
        status: 400,
        message: "incrementPerYear must be a non-negative number.",
        error: "VALIDATION_ERROR",
      });
    }

    if (maxDaysNum === null || maxDaysNum < 0) {
      return sendError(res, {
        status: 400,
        message: "maxDays must be a non-negative number.",
        error: "VALIDATION_ERROR",
      });
    }

    if (eligibilityMonthsNum === null || eligibilityMonthsNum < 0) {
      return sendError(res, {
        status: 400,
        message: "eligibilityMonths must be a non-negative number.",
        error: "VALIDATION_ERROR",
      });
    }

    const useBudgetYearBool = parseBoolean(useBudgetYear);
    if (useBudgetYearBool === null) {
      return sendError(res, {
        status: 400,
        message: "useBudgetYear must be a boolean.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Check if policy already exists
    const [existing] = await pool.execute(
      "SELECT leaveType FROM leavePolicies WHERE leaveType = ?",
      [leaveTypeStr]
    );

    if (existing.length) {
      return sendError(res, {
        status: 409,
        message: `Policy '${leaveTypeStr}' already exists.`,
        error: "POLICY_EXISTS",
      });
    }

    // Create new policy
    const policyUuid = randomUUID();

    await pool.execute(
      `INSERT INTO leavePolicies (uuid, leaveType, baseDays, incrementPerYear, maxDays, eligibilityMonths, useBudgetYear)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        policyUuid,
        leaveTypeStr,
        baseDaysNum,
        incrementPerYearNum,
        maxDaysNum,
        eligibilityMonthsNum,
        useBudgetYearBool ? 1 : 0,
      ]
    );

    // Fetch created policy
    const [rows] = await pool.execute(
      `SELECT uuid, leaveType, baseDays, incrementPerYear, maxDays, eligibilityMonths, useBudgetYear
       FROM leavePolicies
       WHERE uuid = ?`,
      [policyUuid]
    );

    // Audit log
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "CREATE_LEAVE_POLICY",
      entityType: "LEAVE_POLICY",
      entityUuid: policyUuid,
      diff: req.body,
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 201,
      message: `Policy '${leaveTypeStr}' created successfully.`,
      data: rows[0],
    });
  } catch (error) {
    console.error("Error creating leave policy:", error);
    return sendError(res, {
      status: 500,
      message: "Error creating leave policy",
      error: "POLICY_CREATE_ERROR",
    });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const leaveType = String(req.params.leaveType || "").trim();
    if (!leaveType) {
      return sendError(res, {
        status: 400,
        message: "leaveType path param is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const allowedFields = [
      "baseDays",
      "incrementPerYear",
      "maxDays",
      "eligibilityMonths",
      "useBudgetYear",
    ];

    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (!(field in req.body)) {
        continue;
      }

      if (field === "useBudgetYear") {
        const boolValue = parseBoolean(req.body[field]);
        if (boolValue === null) {
          return sendError(res, {
            status: 400,
            message: "useBudgetYear must be a boolean.",
            error: "VALIDATION_ERROR",
          });
        }
        updates.push(`${field} = ?`);
        values.push(boolValue ? 1 : 0);
        continue;
      }

      const numericValue = toNumberOrNull(req.body[field]);
      if (numericValue === null || numericValue < 0) {
        return sendError(res, {
          status: 400,
          message: `${field} must be a non-negative number.`,
          error: "VALIDATION_ERROR",
        });
      }

      updates.push(`${field} = ?`);
      values.push(numericValue);
    }

    if (!updates.length) {
      return sendError(res, {
        status: 400,
        message: "At least one configurable field is required.",
        error: "VALIDATION_ERROR",
      });
    }

    values.push(leaveType);

    const pool = db.promise();
    const [updateResult] = await pool.execute(
      `
      UPDATE leavePolicies
      SET ${updates.join(", ")}
      WHERE leaveType = ?
      `,
      values,
    );

    if (!updateResult.affectedRows) {
      return sendError(res, {
        status: 404,
        message: `Policy '${leaveType}' not found.`,
        error: "NOT_FOUND",
      });
    }

    const [rows] = await pool.execute(
      `
      SELECT uuid, leaveType, baseDays, incrementPerYear, maxDays, eligibilityMonths, useBudgetYear
      FROM leavePolicies
      WHERE leaveType = ?
      LIMIT 1
      `,
      [leaveType],
    );

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "UPDATE_LEAVE_POLICY",
      entityType: "LEAVE_POLICY",
      entityUuid: leaveType,
      diff: req.body,
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `Policy '${leaveType}' updated successfully.`,
      data: rows[0] || null,
    });
  } catch (error) {
    console.error("Error updating leave policy:", error);
    return sendError(res, {
      status: 500,
      message: "Error updating leave policy",
      error: "POLICY_UPDATE_ERROR",
    });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const leaveType = String(req.params.leaveType || "").trim();
    if (!leaveType) {
      return sendError(res, {
        status: 400,
        message: "leaveType path param is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Check if policy exists
    const [existing] = await pool.execute(
      "SELECT uuid, leaveType FROM leavePolicies WHERE leaveType = ?",
      [leaveType]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: `Policy '${leaveType}' not found.`,
        error: "NOT_FOUND",
      });
    }

    const policyUuid = existing[0].uuid;

    // Check if policy is in use
    const [requestsUsingPolicy] = await pool.execute(
      "SELECT COUNT(*) as count FROM leaveRequests WHERE leaveType = ?",
      [leaveType]
    );

    if (requestsUsingPolicy[0].count > 0) {
      return sendError(res, {
        status: 409,
        message: `Cannot delete policy '${leaveType}' because it is being used by ${requestsUsingPolicy[0].count} leave request(s).`,
        error: "POLICY_IN_USE",
      });
    }

    // Check if policy is referenced in balances
    const [balancesUsingPolicy] = await pool.execute(
      "SELECT COUNT(*) as count FROM employeeLeaveBalances WHERE uuid IN (SELECT uuid FROM leavePolicies WHERE leaveType = ?)",
      [leaveType]
    );

    // Delete policy
    await pool.execute("DELETE FROM leavePolicies WHERE leaveType = ?", [leaveType]);

    // Audit log
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "DELETE_LEAVE_POLICY",
      entityType: "LEAVE_POLICY",
      entityUuid: policyUuid,
      diff: { leaveType },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `Policy '${leaveType}' deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting leave policy:", error);
    return sendError(res, {
      status: 500,
      message: "Error deleting leave policy",
      error: "POLICY_DELETE_ERROR",
    });
  }
};
