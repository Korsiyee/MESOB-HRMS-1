const {
  upsertEmployeeAndRebuildBalance,
} = require("../services/employeeSyncService");
const { safeLogEvent } = require("../services/auditLogService");
const { sendSuccess, sendError } = require("../utils/response");

const syncLeaveData = async (req, res) => {
  try {
    const result = await upsertEmployeeAndRebuildBalance(req.body || {});

    await safeLogEvent({
      actorUuid: "SYSTEM",
      action: "SYNC_EMPLOYEE_LEAVE_DATA",
      entityType: "EMPLOYEE",
      entityUuid: req.body?.uuid || null,
      diff: result,
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Employee leave data synchronized successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Error in syncLeaveData:", error);
    return sendError(res, {
      status: error.status || 500,
      message: error.message || "Failed to synchronize employee profile.",
      error: "SYNC_ERROR",
    });
  }
};

module.exports = { syncLeaveData };
