const {
  isValidDateFormat,
  formatDate,
  toUtcDateOnly,
} = require("../services/calendarService");
const LeaveValidationService = require("../services/leaveValidationservice");
const {
  RequestService,
  handleDepartmentDecision,
  RequestServiceError,
} = require("../services/requestService");
const DateCalculationService = require("../services/dateCalculationService");
const BudgetYearService = require("../services/budgetYearService");
const RequestDocumentStorageService = require("../services/requestDocumentStorageService");
const { safeLogEvent } = require("../services/auditLogService");
const {
  notifyLeaveSubmitted,
  notifyDepartmentApproved,
  notifyDepartmentRejected,
  notifyHRApproved,
  notifyHRRejected,
  getUserByEmployeeUuid,
} = require("../services/notificationService");
const { sendSuccess, sendError } = require("../utils/response");

const isHalfStepPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && Number.isInteger(parsed * 2);
};

const DAY_PLAN_PORTION_FULL = "FULL";
const DAY_PLAN_PORTION_HALF = "HALF";
const DAY_PATTERN_FULL = "FULL_DAY";
const DAY_PATTERN_HALF = "HALF_DAY";
const DAY_PATTERN_MIXED = "MIXED";

const parseDailyPlanPayload = (value) => {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const normalizeDailyPlan = (dailyPlan) =>
  dailyPlan
    .map((item) => ({
      date: typeof item?.date === "string" ? item.date.trim() : "",
      portion:
        typeof item?.portion === "string"
          ? item.portion.trim().toUpperCase()
          : "",
    }))
    .filter(
      (item) =>
        isValidDateFormat(item.date) &&
        (item.portion === DAY_PLAN_PORTION_FULL ||
          item.portion === DAY_PLAN_PORTION_HALF),
    );

const deriveDayPattern = (normalizedDailyPlan) => {
  const portions = new Set(normalizedDailyPlan.map((item) => item.portion));

  if (portions.size === 1 && portions.has(DAY_PLAN_PORTION_FULL)) {
    return DAY_PATTERN_FULL;
  }

  if (portions.size === 1 && portions.has(DAY_PLAN_PORTION_HALF)) {
    return DAY_PATTERN_HALF;
  }

  return DAY_PATTERN_MIXED;
};

const sumDailyPlanDays = (normalizedDailyPlan) =>
  normalizedDailyPlan.reduce(
    (sum, item) => sum + (item.portion === DAY_PLAN_PORTION_HALF ? 0.5 : 1),
    0,
  );

const createRequest = async (req, res) => {
  try {
    // Use employee_uuid from authenticated user
    const employee_uuid = req.user.employee_uuid;
    const requester_role = req.user.role;
    
    if (!employee_uuid) {
      return sendError(res, {
        status: 400,
        message: "Employee UUID not found in user session.",
        error: "MISSING_EMPLOYEE_UUID",
      });
    }

    const {
      leaveType,
      startDate,
      numberOfDays,
      reason,
      dailyPlan,
    } = req.body;
    const uploadedDocuments = Array.isArray(req.files) ? req.files : [];
    const parsedNumberOfDays = Number(numberOfDays);
    const parsedDailyPlan = parseDailyPlanPayload(dailyPlan);
    const normalizedDailyPlan = normalizeDailyPlan(parsedDailyPlan);
    const supportingDocumentFromBody =
      typeof req.body.supportingDocument === "string"
        ? req.body.supportingDocument.trim()
        : "";
    const supportingDocument =
      supportingDocumentFromBody || uploadedDocuments[0]?.originalname || "";

    if (
      !leaveType ||
      !startDate ||
      !numberOfDays ||
      !reason
    ) {
      return sendError(res, {
        status: 400,
        message:
          "Missing required fields: leaveType, startDate, numberOfDays, reason",
        error: "VALIDATION_ERROR",
      });
    }

    if (!isHalfStepPositiveNumber(parsedNumberOfDays)) {
      return sendError(res, {
        status: 400,
        message: "numberOfDays must be a positive number in 0.5 increments",
        error: "INVALID_DAYS",
      });
    }

    if (!isValidDateFormat(startDate)) {
      return sendError(res, {
        status: 400,
        message: "Invalid start date format. Use YYYY-MM-DD",
        error: "INVALID_DATE_FORMAT",
      });
    }

    const start = toUtcDateOnly(startDate);
    const today = toUtcDateOnly(new Date());

    if (!start || !today) {
      return sendError(res, {
        status: 400,
        message: "Invalid start date format. Use YYYY-MM-DD",
        error: "INVALID_DATE_FORMAT",
      });
    }

    if (start < today) {
      return sendError(res, {
        status: 400,
        message: "Start date cannot be in the past",
        error: "PAST_DATE",
      });
    }

    const budgetYearValidation =
      await BudgetYearService.validateDateInBudgetYear(startDate);
    if (!budgetYearValidation.valid) {
      return sendError(res, {
        status: 400,
        message: budgetYearValidation.message,
        error: budgetYearValidation.error,
        details: { budgetYear: budgetYearValidation.budgetYear },
      });
    }

    let dateCalculation;
    let endDate;
    let actualWorkingDays;
    let totalCalendarDays;
    let normalizedPlanToStore = normalizedDailyPlan;
    let dayPattern = DAY_PATTERN_FULL;

    try {
      if (normalizedDailyPlan.length > 0) {
        const expectedWorkingDates =
          await DateCalculationService.listWorkingDates(
            startDate,
            normalizedDailyPlan.length,
          );

        const sameDates =
          expectedWorkingDates.length === normalizedDailyPlan.length &&
          expectedWorkingDates.every(
            (date, index) => date === normalizedDailyPlan[index].date,
          );

        if (!sameDates) {
          return sendError(res, {
            status: 400,
            message:
              "dailyPlan contains invalid dates. Use the generated holiday-adjusted working-day list.",
            error: "INVALID_DAILY_PLAN_DATES",
          });
        }

        endDate =
          normalizedDailyPlan[normalizedDailyPlan.length - 1]?.date ||
          startDate;
        actualWorkingDays = sumDailyPlanDays(normalizedDailyPlan);
        dayPattern = deriveDayPattern(normalizedDailyPlan);

        const startUtc = Date.parse(`${startDate}T00:00:00Z`);
        const endUtc = Date.parse(`${endDate}T00:00:00Z`);
        totalCalendarDays =
          Number.isFinite(startUtc) && Number.isFinite(endUtc)
            ? Math.floor((endUtc - startUtc) / (24 * 60 * 60 * 1000)) + 1
            : 1;
      } else {
        dateCalculation = await DateCalculationService.calculateEndDate(
          startDate,
          parsedNumberOfDays,
        );

        endDate = dateCalculation.endDate;
        actualWorkingDays = dateCalculation.actualWorkingDays;
        totalCalendarDays = dateCalculation.totalCalendarDays;

        const autoWorkingDates = await DateCalculationService.listWorkingDates(
          startDate,
          Math.ceil(parsedNumberOfDays),
        );
        normalizedPlanToStore = autoWorkingDates.map((date, index) => ({
          date,
          portion:
            parsedNumberOfDays % 1 !== 0 &&
            index === autoWorkingDates.length - 1
              ? DAY_PLAN_PORTION_HALF
              : DAY_PLAN_PORTION_FULL,
        }));
        dayPattern = deriveDayPattern(normalizedPlanToStore);
      }
    } catch (error) {
      return sendError(res, {
        status: 400,
        message: `Error calculating end date: ${error.message}`,
        error: "DATE_CALCULATION_ERROR",
      });
    }

    const dateValidation = DateCalculationService.validateCalculatedDates(
      startDate,
      endDate,
      actualWorkingDays,
    );
    if (!dateValidation.valid) {
      return sendError(res, {
        status: 400,
        message: dateValidation.message,
        error: "INVALID_DATE_RANGE",
      });
    }

    const overlapCheck = await RequestService.checkOverlappingRequests(
      employee_uuid,
      startDate,
      endDate,
    );
    if (overlapCheck.hasOverlap) {
      return sendError(res, {
        status: 409,
        message: overlapCheck.message,
        error: "OVERLAPPING_REQUESTS",
        details: { overlappingRequests: overlapCheck.overlappingRequests },
      });
    }

    const pendingCount =
      await RequestService.getPendingRequestCount(employee_uuid);
    if (pendingCount >= 1) {
      return sendError(res, {
        status: 409,
        message: "Employee already has a pending leave request",
        error: "MULTIPLE_PENDING_REQUESTS",
      });
    }

    const endDateBudgetValidation =
      await BudgetYearService.validateDateInBudgetYear(endDate);
    if (!endDateBudgetValidation.valid) {
      return sendError(res, {
        status: 400,
        message: `Calculated end date ${endDate} is outside budget year: ${endDateBudgetValidation.message}`,
        error: "END_DATE_OUTSIDE_BUDGET_YEAR",
        details: {
          budgetYear: endDateBudgetValidation.budgetYear,
          calculatedEndDate: endDate,
        },
      });
    }

    const serviceValidation =
      await LeaveValidationService.validateServicePeriod(
        employee_uuid,
        startDate,
        leaveType,
      );
    if (!serviceValidation.valid) {
      return sendError(res, {
        status: 403,
        message: serviceValidation.message,
        error: "INSUFFICIENT_SERVICE",
        details: {
          currentMonths: serviceValidation.currentMonths,
          requiredMonths: serviceValidation.requiredMonths,
        },
      });
    }

    const balanceValidation = await LeaveValidationService.validateBalance(
      employee_uuid,
      actualWorkingDays,
      leaveType,
    );
    if (!balanceValidation.valid) {
      return sendError(res, {
        status: 409,
        message: balanceValidation.message,
        error: "INSUFFICIENT_BALANCE",
        details: {
          requestedDays: balanceValidation.requestedDays,
          availableDays: balanceValidation.availableDays,
          currentBalance: balanceValidation.currentBalance,
        },
      });
    }

    const requestData = {
      employee_uuid,
      startDate,
      endDate,
      total_days: actualWorkingDays,
      dayPattern,
      dailyPlan: normalizedPlanToStore,
      supportingDocument,
      documentCount: uploadedDocuments.length,
    };

    const typeValidation =
      await LeaveValidationService.validateLeaveTypeSpecifics(
        leaveType,
        requestData,
      );
    if (!typeValidation.valid) {
      return sendError(res, {
        status: 400,
        message: typeValidation.message,
        error: "LEAVE_TYPE_VALIDATION_FAILED",
      });
    }

    // Approval workflow routing
    let initialStatus = "PENDING_DEPARTMENT"; // Default: Employee → Dept Head → HR
    let departmentHeadId = null;
    let isDeptHeadRequest = false;
    
    // Check if requester is HR staff or Department Head
    const isHRStaff = ["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(requester_role);
    const isDeptHead = requester_role === "DEPARTMENT_HEAD";
    
    if (isHRStaff || isDeptHead) {
      // Get the employee's department to determine routing
      const pool = require("../config/db").db.promise();
      const [empRows] = await pool.execute(
        "SELECT department_uuid FROM Employees WHERE uuid = ?",
        [employee_uuid]
      );
      
      const employeeDeptUuid = empRows[0]?.department_uuid;
      
      if (isDeptHead) {
        // Department Head's own request → skip dept approval, go directly to HR
        // Department heads decide at department level, so their requests bypass dept approval
        initialStatus = "PENDING_HR";
        isDeptHeadRequest = true;
      } else if (isHRStaff && employeeDeptUuid) {
        // HR staff → Check if they are also the department head of their department
        const [hrHeadRows] = await pool.execute(
          `SELECT u.uuid, u.role, e.department_uuid as hr_dept_uuid
           FROM Users u
           JOIN Employees e ON e.uuid = u.employee_uuid
           WHERE u.role = 'DEPARTMENT_HEAD'
           LIMIT 100`
        );
        
        // Check if the HR Admin is also the head of HR department
        const isHRDeptHead = hrHeadRows.some(h => 
          h.uuid === req.user.uuid && h.hr_dept_uuid === employeeDeptUuid
        );
        
        if (isHRDeptHead || requester_role === "HR_ADMIN" || requester_role === "SUPER_ADMIN") {
          // HR Admin who is also dept head of HR, or any HR_ADMIN/SUPER_ADMIN → skip dept approval, go to HR directly
          initialStatus = "PENDING_HR";
          isDeptHeadRequest = true;
        } else {
          // HR Officer (not dept head of HR) → normal flow through dept head
          initialStatus = "PENDING_DEPARTMENT";
          const [deptHeadRows] = await pool.execute(
            `SELECT u.uuid
             FROM Users u
             JOIN Employees e ON e.uuid = u.employee_uuid
             WHERE e.department_uuid = ? AND u.role = 'DEPARTMENT_HEAD'
             LIMIT 1`,
            [employeeDeptUuid]
          );
          departmentHeadId = deptHeadRows[0]?.uuid || null;
        }
      }
    }

    const newRequest = await RequestService.createLeaveRequest({
      employee_uuid,
      leaveType,
      startDate,
      endDate,
      total_days: actualWorkingDays,
      reason,
      dayPattern,
      dailyPlan: normalizedPlanToStore,
      supportingDocument,
      attachments: uploadedDocuments.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
      })),
      initialStatus,
      departmentHeadId,
      isDeptHeadRequest,
    });

    // Audit logging
    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "CREATE_LEAVE_REQUEST",
      entityType: "LEAVE_REQUEST",
      entityUuid: newRequest.uuid,
      diff: {
        leaveType,
        startDate: newRequest.startDate,
        endDate: newRequest.endDate,
        total_days: actualWorkingDays,
        specialFlow: isDeptHeadRequest ? "DEPT_HEAD_AUTO_APPROVE" : isHRStaff ? "HR_TO_DEPT_HEAD" : "STANDARD",
      },
      ipAddress: req.ip,
    });

    // Notifications — non-blocking, never breaks the main response
    try {
      const pool2 = require("../config/db").db.promise();
      const [empRows] = await pool2.execute(
        `SELECT CONCAT(e.first_name,' ',COALESCE(e.middle_name,''),' ',e.last_name) AS full_name,
                d.name AS department_name, e.department_uuid,
                lr.department_head_id
         FROM Employees e
         LEFT JOIN Departments d ON d.uuid = e.department_uuid
         LEFT JOIN leaveRequests lr ON lr.uuid = ?
         WHERE e.uuid = ?`,
        [newRequest.uuid, employee_uuid]
      );
      const empInfo = empRows[0] || {};
      let deptHeadUserUuid = null;
      if (empInfo.department_head_id) {
        deptHeadUserUuid = empInfo.department_head_id;
      }
      await notifyLeaveSubmitted({
        senderUserUuid:      req.user.uuid,
        senderRole:          requester_role,
        employeeFullName:    (empInfo.full_name || "").trim(),
        departmentName:      empInfo.department_name || "",
        leaveType,
        startDate:           newRequest.startDate,
        endDate:             newRequest.endDate,
        totalDays:           actualWorkingDays,
        requestUuid:         newRequest.uuid,
        departmentHeadUserUuid: deptHeadUserUuid,
      });
    } catch (notifErr) {
      console.error("[Notification] createRequest notify failed (non-fatal):", notifErr.message);
    }

    newRequest.startDate = formatDate(newRequest.startDate);
    newRequest.endDate = formatDate(newRequest.endDate);

    return sendSuccess(res, {
      status: 201,
      message: "Leave request submitted successfully",
      data: {
        uuid: newRequest.uuid,
        employee_uuid: newRequest.employee_uuid,
        leaveType: newRequest.leaveType,
        reason: newRequest.reason,
        dayPattern: newRequest.dayPattern,
        dailyPlan: newRequest.dailyPlan || [],
        status: newRequest.status,
        documents: newRequest.documents || [],
        dates: {
          startDate: newRequest.startDate,
          endDate: newRequest.endDate,
          requestedWorkingDays:
            normalizedPlanToStore.length || parsedNumberOfDays,
          calculatedWorkingDays: actualWorkingDays,
          totalCalendarDays,
        },
      },
    });
  } catch (error) {
    console.error("Error in createRequest:", error);

    if (error.message.includes("not found")) {
      return sendError(res, {
        status: 404,
        message: error.message,
        error: "RESOURCE_NOT_FOUND",
      });
    }

    if (error.message.includes("database") || error.message.includes("SQL")) {
      return sendError(res, {
        status: 500,
        message: "Database error occurred while processing request",
        error: "DATABASE_ERROR",
        details: error.message,
      });
    }

    return sendError(res, {
      status: 500,
      message: "Internal server error while processing leave request",
      error: "INTERNAL_ERROR",
      details: error.message,
    });
  }
};

const getRequestDocuments = async (req, res) => {
  try {
    const { uuid } = req.params;
    const documents = await RequestService.getRequestDocuments(uuid);

    return sendSuccess(res, {
      status: 200,
      message: "Request documents retrieved successfully",
      data: documents,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in getRequestDocuments:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving request documents",
      error: "INTERNAL_ERROR",
    });
  }
};

const streamRequestDocumentContent = async (req, res) => {
  try {
    const { uuid, documentUuid } = req.params;
    const document = await RequestService.getRequestDocumentForRequest({
      requestUuid: uuid,
      documentUuid,
    });

    if (!document) {
      return sendError(res, {
        status: 404,
        message: "Document not found for this request.",
        error: "NOT_FOUND",
      });
    }

    const stream = await RequestDocumentStorageService.getDocumentStream(
      document.objectKey,
    );

    res.setHeader(
      "Content-Type",
      document.mimeType || "application/octet-stream",
    );
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.originalName}"`,
    );

    stream.on("error", (error) => {
      console.error("Error streaming request document:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to stream request document.",
        });
      }
    });

    stream.pipe(res);
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in streamRequestDocumentContent:", error);
    return sendError(res, {
      status: 500,
      message: "Error streaming request document",
      error: "INTERNAL_ERROR",
    });
  }
};

const addRequestDocuments = async (req, res) => {
  try {
    const { uuid } = req.params;
    const uploadedDocuments = Array.isArray(req.files) ? req.files : [];

    const documents = await RequestService.addRequestDocuments({
      requestUuid: uuid,
      documents: uploadedDocuments.map((file) => ({
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        buffer: file.buffer,
      })),
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "ADD_REQUEST_DOCUMENTS",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: { documentCount: uploadedDocuments.length },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 201,
      message: "Request documents uploaded successfully",
      data: documents,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in addRequestDocuments:", error);
    return sendError(res, {
      status: 500,
      message: "Error uploading request documents",
      error: "INTERNAL_ERROR",
    });
  }
};

const replaceRequestDocument = async (req, res) => {
  try {
    const { uuid, documentUuid } = req.params;
    const uploadedDocument = req.file || null;

    const documents = await RequestService.replaceRequestDocument({
      requestUuid: uuid,
      documentUuid,
      document: uploadedDocument
        ? {
            originalName: uploadedDocument.originalname,
            mimeType: uploadedDocument.mimetype,
            sizeBytes: uploadedDocument.size,
            buffer: uploadedDocument.buffer,
          }
        : null,
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "REPLACE_REQUEST_DOCUMENT",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: { documentUuid },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Request document replaced successfully",
      data: documents,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in replaceRequestDocument:", error);
    return sendError(res, {
      status: 500,
      message: "Error replacing request document",
      error: "INTERNAL_ERROR",
    });
  }
};

const deleteRequestDocument = async (req, res) => {
  try {
    const { uuid, documentUuid } = req.params;

    const documents = await RequestService.deleteRequestDocument({
      requestUuid: uuid,
      documentUuid,
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "DELETE_REQUEST_DOCUMENT",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: { documentUuid },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Request document deleted successfully",
      data: documents,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in deleteRequestDocument:", error);
    return sendError(res, {
      status: 500,
      message: "Error deleting request document",
      error: "INTERNAL_ERROR",
    });
  }
};

const updateRequest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { leaveType, startDate, numberOfDays, dailyPlan } = req.body || {};

    const updated = await RequestService.updatePendingRequest(uuid, {
      leaveType,
      startDate,
      numberOfDays,
      dailyPlan,
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "UPDATE_LEAVE_REQUEST",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: { leaveType, startDate, numberOfDays },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Leave request updated successfully",
      data: updated,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in updateRequest:", error);
    return sendError(res, {
      status: 500,
      message: "Error updating leave request",
      error: "INTERNAL_ERROR",
    });
  }
};

const shortenApprovedRequest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { newEndDate } = req.body || {};

    // Ownership enforced in service layer via employee_uuid from auth
    const employee_uuid = req.user.employee_uuid;

    const result = await RequestService.shortenApprovedRequest({
      requestUuid: uuid,
      employee_uuid,
      newEndDate,
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "SHORTEN_LEAVE_REQUEST",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: {
        originalEndDate:      result.originalEndDate,
        newEndDate:           result.newEndDate,
        returnToWorkDate:     result.returnToWorkDate,
        previousApprovedDays: result.previousApprovedDays,
        updatedApprovedDays:  result.updatedApprovedDays,
        refundedDays:         result.refundedDays,
        leaveHasStarted:      result.leaveHasStarted,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Leave request shortened successfully. Unused days have been returned to your balance.",
      data: result,
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in shortenApprovedRequest:", error);
    return sendError(res, {
      status: 500,
      message: "Error shortening approved leave request",
      error: "INTERNAL_ERROR",
    });
  }
};

const getPendingRequests = async (req, res) => {
  try {
    const userRole = req.user?.role;
    
    // Department heads only see PENDING_DEPARTMENT requests for their own department
    // HR roles only see PENDING_HR requests (not PENDING_DEPARTMENT)
    const departmentUuid =
      userRole === "DEPARTMENT_HEAD" ? req.user?.department_uuid : null;

    const pendingRequests = await RequestService.getPendingRequests({ 
      departmentUuid,
      role: userRole
    });

    return sendSuccess(res, {
      status: 200,
      message: "Pending requests retrieved successfully",
      data: pendingRequests,
    });
  } catch (error) {
    console.error("Error in getPendingRequests:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving pending requests",
      error: "INTERNAL_ERROR",
    });
  }
};;

const getAdminRequests = async (req, res) => {
  try {
    const { budgetYear } = req.query || {};

    const requests = await RequestService.getAdminRequests({ budgetYear });

    return sendSuccess(res, {
      status: 200,
      message: "Admin requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error("Error in getAdminRequests:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving admin requests",
      error: "INTERNAL_ERROR",
    });
  }
};

const getEmployeeRequests = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.query;

    // Check if user is authenticated
    if (!req.user) {
      return sendError(res, {
        status: 401,
        message: "Not authenticated.",
        error: "UNAUTHORIZED",
      });
    }

    // Authorization: Users can only view their own requests unless they're HR/Admin
    const isAdminRole = ["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    const isOwnRequest = req.user.employee_uuid && req.user.employee_uuid === uuid;

    if (!isOwnRequest && !isAdminRole) {
      return sendError(res, {
        status: 403,
        message: "You can only view your own leave requests.",
        error: "FORBIDDEN",
      });
    }

    const requests = await RequestService.getEmployeeRequests(uuid, status);

    return sendSuccess(res, {
      status: 200,
      message: "Employee requests retrieved successfully",
      data: requests,
    });
  } catch (error) {
    console.error("Error in getEmployeeRequests:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving employee requests",
      error: "INTERNAL_ERROR",
    });
  }
};

const previewLeaveDates = async (req, res) => {
  try {
    const { startDate, numberOfDays, leaveType } = req.query;

    if (!startDate || !numberOfDays || !leaveType) {
      return sendError(res, {
        status: 400,
        message:
          "Missing required query parameters: startDate, numberOfDays, leaveType",
        error: "VALIDATION_ERROR",
      });
    }

    const days = Number(numberOfDays);
    if (!isHalfStepPositiveNumber(days)) {
      return sendError(res, {
        status: 400,
        message: "numberOfDays must be a positive number in 0.5 increments",
        error: "VALIDATION_ERROR",
      });
    }

    if (!isValidDateFormat(startDate)) {
      return sendError(res, {
        status: 400,
        message: "Invalid start date format. Use YYYY-MM-DD",
        error: "VALIDATION_ERROR",
      });
    }

    const preview = await DateCalculationService.getDateRangePreview(
      startDate,
      days,
    );

    const balanceValidation = await LeaveValidationService.validateBalance(
      req.user.employee_uuid || "preview-user",
      days,
      leaveType,
    );

    return sendSuccess(res, {
      status: 200,
      message: "Leave date preview calculated successfully",
      data: {
        ...preview,
        balanceCheck: balanceValidation.valid
          ? "Sufficient balance"
          : "Insufficient balance",
        canSubmit: balanceValidation.valid && preview.validation.valid,
      },
    });
  } catch (error) {
    console.error("Error in previewLeaveDates:", error);
    return sendError(res, {
      status: 500,
      message: "Error calculating leave preview",
      error: "PREVIEW_ERROR",
      details: error.message,
    });
  }
};

const departmentApproveRejectRequest = async (req, res) => {
  try {
    const body = req.body || {};
    const userRole = req.user?.role;
    const userUuid = req.user?.uuid;
    const userDepartmentUuid = req.user?.department_uuid;
    const requestUuid = req.params.uuid;

    // Fetch the request to check current status and permissions
    const pool = require("../config/db").db.promise();
    const [requests] = await pool.execute(
      `SELECT lr.status, lr.department_head_id, e.department_uuid
       FROM leaveRequests lr
       LEFT JOIN Employees e ON e.uuid = lr.employee_uuid
       WHERE lr.uuid = ?`,
      [requestUuid]
    );

    if (!requests.length) {
      return sendError(res, {
        status: 404,
        message: "Leave request not found.",
        error: "REQUEST_NOT_FOUND",
      });
    }

    const request = requests[0];

    // Access control based on role and request status
    if (userRole === "DEPARTMENT_HEAD") {
      // Department heads can only approve PENDING_DEPARTMENT requests from their own department
      if (request.status !== "PENDING_DEPARTMENT") {
        return sendError(res, {
          status: 403,
          message: "Department heads can only approve requests in PENDING_DEPARTMENT status.",
          error: "FORBIDDEN",
        });
      }
      
      if (request.department_uuid !== userDepartmentUuid) {
        return sendError(res, {
          status: 403,
          message: "You can only approve requests from your own department.",
          error: "FORBIDDEN",
        });
      }
    } else if (["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(userRole)) {
      // HR roles can approve both PENDING_DEPARTMENT and PENDING_HR
      // But typically they should focus on PENDING_HR
      if (!["PENDING_DEPARTMENT", "PENDING_HR"].includes(request.status)) {
        return sendError(res, {
          status: 403,
          message: "This request cannot be approved from its current status.",
          error: "FORBIDDEN",
        });
      }
    } else if (userRole === "EMPLOYEE") {
      // Employees with "Leave - Manage Requests" occupation (verified by occupation middleware)
      // Can approve/reject leave requests
      if (!["PENDING_DEPARTMENT", "PENDING_HR"].includes(request.status)) {
        return sendError(res, {
          status: 403,
          message: "This request cannot be approved from its current status.",
          error: "FORBIDDEN",
        });
      }
    } else {
      return sendError(res, {
        status: 403,
        message: "You do not have permission to approve leave requests.",
        error: "FORBIDDEN",
      });
    }

    const result = await handleDepartmentDecision({
      requestUuid,
      departmentHeadId: body.department_head_id || req.user.employee_uuid || userUuid,
      decision: body.decision,
      rejectionReason: body.rejectionReason,
      approvedDays: body.approvedDays,
    });

    await safeLogEvent({
      actorUuid: userUuid,
      action: result.status === "REJECTED" || result.status === "REJECTED_DEPARTMENT" || result.status === "REJECTED_HR" 
        ? "REJECT_LEAVE_REQUEST" 
        : "APPROVE_LEAVE_REQUEST",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
      diff: {
        decision: result.decision,
        status: result.status,
        deductedDays: result.deductedDays,
        rejectionReason: result.rejectionReason,
      },
      ipAddress: req.ip,
    });

    // Notifications — non-blocking, never breaks the main response
    try {
      const pool2 = require("../config/db").db.promise();
      const [detailRows] = await pool2.execute(
        `SELECT
           CONCAT(e.first_name,' ',COALESCE(e.middle_name,''),' ',e.last_name) AS employee_full_name,
           e.uuid AS employee_uuid_emp,
           lr.leaveType, lr.startDate, lr.endDate, lr.total_days,
           lr.department_head_id, lr.rejectionReason AS rejection_reason_stored,
           CONCAT(dh_e.first_name,' ',COALESCE(dh_e.middle_name,''),' ',dh_e.last_name) AS dept_head_name,
           CONCAT(actor_e.first_name,' ',COALESCE(actor_e.middle_name,''),' ',actor_e.last_name) AS actor_name
         FROM leaveRequests lr
         JOIN Employees e ON e.uuid = lr.employee_uuid
         LEFT JOIN Users dh_u ON dh_u.uuid = lr.department_head_id
         LEFT JOIN Employees dh_e ON dh_e.uuid = dh_u.employee_uuid
         LEFT JOIN Users actor_u ON actor_u.uuid = ?
         LEFT JOIN Employees actor_e ON actor_e.uuid = actor_u.employee_uuid
         WHERE lr.uuid = ?`,
        [userUuid, requestUuid]
      );
      const d = detailRows[0] || {};
      const employeeUserUuid = await getUserByEmployeeUuid(d.employee_uuid_emp);
      const deptHeadUserUuid = d.department_head_id || null;
      const rejectionReason  = result.rejectionReason || d.rejection_reason_stored || null;

      if (result.status === "PENDING_HR") {
        await notifyDepartmentApproved({
          senderUserUuid:   userUuid,
          senderRole:       userRole,
          departmentHeadName: (d.dept_head_name || d.actor_name || "").trim() || "Department Head",
          employeeFullName: (d.employee_full_name || "").trim(),
          leaveType:        d.leaveType,
          startDate:        d.startDate,
          endDate:          d.endDate,
          totalDays:        d.total_days,
          requestUuid,
        });
      } else if (result.status === "REJECTED_DEPARTMENT") {
        await notifyDepartmentRejected({
          senderUserUuid:     userUuid,
          senderRole:         userRole,
          departmentHeadName: (d.dept_head_name || d.actor_name || "").trim() || "Department Head",
          employeeUserUuid,
          leaveType:          d.leaveType,
          rejectionReason,
          requestUuid,
        });
      } else if (result.status === "APPROVED") {
        await notifyHRApproved({
          senderUserUuid:        userUuid,
          senderRole:            userRole,
          hrName:                (d.actor_name || "").trim() || "HR",
          employeeUserUuid,
          departmentHeadUserUuid: deptHeadUserUuid,
          employeeFullName:      (d.employee_full_name || "").trim(),
          leaveType:             d.leaveType,
          startDate:             d.startDate,
          endDate:               d.endDate,
          totalDays:             d.total_days,
          requestUuid,
        });
      } else if (result.status === "REJECTED_HR") {
        await notifyHRRejected({
          senderUserUuid:        userUuid,
          senderRole:            userRole,
          hrName:                (d.actor_name || "").trim() || "HR",
          employeeUserUuid,
          departmentHeadUserUuid: deptHeadUserUuid,
          employeeFullName:      (d.employee_full_name || "").trim(),
          leaveType:             d.leaveType,
          rejectionReason,
          requestUuid,
        });
      }
    } catch (notifErr) {
      console.error("[Notification] departmentApproveRejectRequest notify failed (non-fatal):", notifErr.message);
    }

    const message =
      result.status.includes("REJECTED")
        ? "Leave request rejected successfully."
        : "Leave request approved successfully.";

    return sendSuccess(res, {
      status: 200,
      message,
      data: {
        request: {
          uuid: result.requestUuid,
          status: result.status,
        },
        deductedDays: result.deductedDays,
        balance: result.balance,
        rejectionReason: result.rejectionReason || null,
      },
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in departmentApproveRejectRequest:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error while processing leave request.",
      error: "INTERNAL_ERROR",
    });
  }
};

/**
 * Get single leave request with complete details
 * GET /api/requests/:uuid
 */
const getRequestById = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userRole = req.user?.role;
    const userUuid = req.user?.uuid;
    const userEmployeeUuid = req.user?.employee_uuid;
    const userDepartmentUuid = req.user?.department_uuid;
    
    const pool = require("../config/db").db.promise();

    // Fetch complete request details with employee, approver info
    const [requests] = await pool.execute(
      `SELECT 
        lr.uuid,
        lr.employee_uuid,
        lr.leaveType,
        lr.startDate,
        lr.endDate,
        lr.total_days,
        lr.dayPattern,
        lr.dailyPlanJson,
        lr.reason,
        lr.rejectionReason,
        lr.supportingDocument,
        lr.status,
        lr.department_head_id,
        lr.hr_supervisor_id,
        lr.created_at,
        lr.updated_at,
        e.first_name,
        e.middle_name,
        e.last_name,
        e.mesob_id,
        e.department_uuid,
        d.name as department_name,
        p.title as position_title,
        dh_emp.first_name as dept_head_first_name,
        dh_emp.last_name as dept_head_last_name,
        hr_emp.first_name as hr_first_name,
        hr_emp.last_name as hr_last_name
      FROM leaveRequests lr
      LEFT JOIN Employees e ON e.uuid = lr.employee_uuid
      LEFT JOIN Departments d ON d.uuid = e.department_uuid
      LEFT JOIN Positions p ON p.uuid = e.position_uuid
      LEFT JOIN Employees dh_emp ON dh_emp.uuid = (SELECT employee_uuid FROM Users WHERE uuid = lr.department_head_id)
      LEFT JOIN Employees hr_emp ON hr_emp.uuid = (SELECT employee_uuid FROM Users WHERE uuid = lr.hr_supervisor_id)
      WHERE lr.uuid = ?`,
      [uuid]
    );

    if (!requests.length) {
      return sendError(res, {
        status: 404,
        message: "Leave request not found.",
        error: "REQUEST_NOT_FOUND",
      });
    }

    const request = requests[0];

    // Access control: Check if user has permission to view this request
    const isOwnRequest = request.employee_uuid === userEmployeeUuid;
    const isHRRole = ["HR_OFFICER", "HR_ADMIN", "SUPER_ADMIN"].includes(userRole);
    const isDeptHeadOfSameDept = userRole === "DEPARTMENT_HEAD" && request.department_uuid === userDepartmentUuid;
    const isAssignedApprover = request.department_head_id === userUuid || request.hr_supervisor_id === userUuid;

    if (!isOwnRequest && !isHRRole && !isDeptHeadOfSameDept && !isAssignedApprover) {
      return sendError(res, {
        status: 403,
        message: "You do not have permission to view this request.",
        error: "FORBIDDEN",
      });
    }

    // Additional logic: Department heads should not see HR-pending requests unless they're the assigned dept head
    if (userRole === "DEPARTMENT_HEAD" && request.status === "PENDING_HR" && request.department_head_id !== userUuid) {
      return sendError(res, {
        status: 403,
        message: "You do not have permission to view this request at its current approval stage.",
        error: "FORBIDDEN",
      });
    }

    // Parse daily plan
    let dailyPlan = [];
    if (request.dailyPlanJson) {
      try {
        dailyPlan = JSON.parse(request.dailyPlanJson);
      } catch (error) {
        console.error("Failed to parse dailyPlanJson:", error);
      }
    }

    // Fetch attached documents
    const [documents] = await pool.execute(
      `SELECT uuid, originalName, objectKey, mimeType, sizeBytes, createdAt
       FROM leaveRequestDocuments
       WHERE leaveRequestUuid = ?
       ORDER BY createdAt DESC`,
      [uuid]
    );

    // Build complete response
    const data = {
      uuid: request.uuid,
      employee_uuid: request.employee_uuid,
      employee: {
        first_name: request.first_name,
        middle_name: request.middle_name,
        last_name: request.last_name,
        full_name: [request.first_name, request.middle_name, request.last_name]
          .filter(Boolean)
          .join(" "),
        mesob_id: request.mesob_id,
        department: request.department_name,
        position: request.position_title,
      },
      leaveType: request.leaveType,
      startDate: request.startDate,
      endDate: request.endDate,
      total_days: request.total_days,
      dayPattern: request.dayPattern,
      dailyPlan,
      reason: request.reason,
      rejectionReason: request.rejectionReason,
      supportingDocument: request.supportingDocument,
      status: request.status,
      approvers: {
        department_head: request.department_head_id
          ? {
              id: request.department_head_id,
              name: [request.dept_head_first_name, request.dept_head_last_name]
                .filter(Boolean)
                .join(" "),
            }
          : null,
        hr_supervisor: request.hr_supervisor_id
          ? {
              id: request.hr_supervisor_id,
              name: [request.hr_first_name, request.hr_last_name]
                .filter(Boolean)
                .join(" "),
            }
          : null,
      },
      documents: documents.map((doc) => ({
        uuid: doc.uuid,
        originalName: doc.originalName,
        mimeType: doc.mimeType,
        sizeBytes: doc.sizeBytes,
        createdAt: doc.createdAt,
      })),
      created_at: request.created_at,
      updated_at: request.updated_at,
    };

    return sendSuccess(res, {
      status: 200,
      message: "Request retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("getRequestById error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve request.",
      error: "GET_REQUEST_ERROR",
    });
  }
};

const cancelRequest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const actorUuid = req.user?.uuid;
    const actorEmployeeUuid = req.user?.employee_uuid;

    if (!actorEmployeeUuid) {
      return sendError(res, {
        status: 400,
        message: "Employee UUID not found in user session.",
        error: "MISSING_EMPLOYEE_UUID",
      });
    }

    const result = await RequestService.cancelLeaveRequest({
      requestUuid: uuid,
      cancelledByUuid: actorEmployeeUuid,
    });

    await safeLogEvent({
      actorUuid,
      action: "CANCEL_LEAVE_REQUEST",
      entityType: "LEAVE_REQUEST",
      entityUuid: uuid,
      diff: {
        previousStatus: result.previousStatus,
        status: "CANCELLED",
        cancelledAt: result.cancelledAt,
        refundedDays: result.refundedDays,
      },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Leave request cancelled successfully.",
      data: {
        uuid,
        status: "CANCELLED",
        previousStatus: result.previousStatus,
        cancelledAt: result.cancelledAt,
        refundedDays: result.refundedDays,
      },
    });
  } catch (error) {
    if (error instanceof RequestServiceError) {
      return sendError(res, {
        status: error.statusCode,
        message: error.message,
      });
    }

    console.error("Error in cancelRequest:", error);
    return sendError(res, {
      status: 500,
      message: "Internal server error while cancelling leave request.",
      error: "INTERNAL_ERROR",
    });
  }
};

module.exports = {
  createRequest,
  getRequestDocuments,
  streamRequestDocumentContent,
  addRequestDocuments,
  replaceRequestDocument,
  deleteRequestDocument,
  updateRequest,
  shortenApprovedRequest,
  getPendingRequests,
  getAdminRequests,
  getEmployeeRequests,
  previewLeaveDates,
  departmentApproveRejectRequest,
  getRequestById,
  cancelRequest,
};
