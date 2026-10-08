/**
 * Notification Service
 * Handles creating, reading, and marking notifications.
 * All public functions are non-throwing — errors are logged but never bubble up
 * so a notification failure never breaks the primary action.
 */
const { randomUUID } = require("crypto");
const { executeQuery } = require("../utils/dbQuery");
const { db } = require("../config/db");

/* ────────────────────────────────────────────────────────────
   Internal helpers
──────────────────────────────────────────────────────────── */

/**
 * Look up all user UUIDs that have a given role.
 * Returns [] if none found.
 */
async function getUsersByRole(role) {
  const [rows] = await db.promise().execute(
    "SELECT uuid FROM Users WHERE role = ? AND is_active = 1",
    [role]
  );
  return rows.map((r) => r.uuid);
}

/**
 * Look up the user UUID for a given employee_uuid.
 */
async function getUserByEmployeeUuid(employeeUuid) {
  const [rows] = await db.promise().execute(
    "SELECT uuid FROM Users WHERE employee_uuid = ? AND is_active = 1 LIMIT 1",
    [employeeUuid]
  );
  return rows[0]?.uuid || null;
}

/**
 * Insert a single notification row.
 */
async function insertNotification({
  recipientUuid,
  senderUuid,
  senderRole,
  type,
  title,
  message,
  redirectUrl,
  entityType,
  entityUuid,
}) {
  const uuid = randomUUID();
  await executeQuery(
    `INSERT INTO Notifications
       (uuid, user_uuid, sender_uuid, sender_role, notification_type,
        title, message, redirect_url, entity_type, entity_uuid, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NOW())`,
    [
      uuid,
      recipientUuid,
      senderUuid || null,
      senderRole || null,
      type,
      title,
      message,
      redirectUrl || null,
      entityType || null,
      entityUuid || null,
    ]
  );
  return uuid;
}

/**
 * Fan out one notification to multiple recipients.
 */
async function fanOut(recipientUuids, payload) {
  for (const recipientUuid of recipientUuids) {
    if (!recipientUuid) continue;
    await insertNotification({ ...payload, recipientUuid });
  }
}

/* ────────────────────────────────────────────────────────────
   LEAVE NOTIFICATIONS
──────────────────────────────────────────────────────────── */

/**
 * Employee submits a leave request.
 * Notify: Department Head(s) of the employee's department.
 * If submitter is DEPARTMENT_HEAD → notify HR_ADMIN + SUPER_ADMIN.
 * If submitter is HR_ADMIN / HR_OFFICER → notify SUPER_ADMIN.
 */
async function notifyLeaveSubmitted({
  senderUserUuid,
  senderRole,
  employeeFullName,
  departmentName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  requestUuid,
  departmentHeadUserUuid, // specific dept head assigned, if known
}) {
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
  const daysLabel = totalDays != null ? `${Number(totalDays).toFixed(1)} day(s)` : "—";
  const dateRange = `${fmtDate(startDate)} to ${fmtDate(endDate)}`;

  if (senderRole === "DEPARTMENT_HEAD") {
    // Dept head's own request → HR_ADMIN + SUPER_ADMIN
    const hrAdmins = await getUsersByRole("HR_ADMIN");
    const superAdmins = await getUsersByRole("SUPER_ADMIN");
    const recipients = [...new Set([...hrAdmins, ...superAdmins])];
    await fanOut(recipients, {
      senderUuid: senderUserUuid,
      senderRole,
      type: "LEAVE_REQUEST_SUBMITTED",
      title: "New Leave Request from Department Head",
      message: `${employeeFullName} (Department Head${departmentName ? ` — ${departmentName}` : ""}) submitted a ${leaveType} leave request for ${daysLabel} (${dateRange}).`,
      redirectUrl: "/leave/manage",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
    return;
  }

  if (senderRole === "HR_ADMIN" || senderRole === "HR_OFFICER") {
    // HR's own request → SUPER_ADMIN
    const superAdmins = await getUsersByRole("SUPER_ADMIN");
    await fanOut(superAdmins, {
      senderUuid: senderUserUuid,
      senderRole,
      type: "LEAVE_REQUEST_SUBMITTED",
      title: "New Leave Request from HR",
      message: `${employeeFullName} (HR${departmentName ? ` — ${departmentName}` : ""}) submitted a ${leaveType} leave request for ${daysLabel} (${dateRange}).`,
      redirectUrl: "/leave/manage",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
    return;
  }

  // Regular employee → notify their assigned department head
  const recipients = [];
  if (departmentHeadUserUuid) {
    recipients.push(departmentHeadUserUuid);
  } else {
    // Fall back: notify all dept heads (shouldn't normally happen)
    const allDeptHeads = await getUsersByRole("DEPARTMENT_HEAD");
    recipients.push(...allDeptHeads);
  }

  await fanOut(recipients, {
    senderUuid: senderUserUuid,
    senderRole: senderRole || "EMPLOYEE",
    type: "LEAVE_REQUEST_SUBMITTED",
    title: "New Leave Request Pending Approval",
    message: `${employeeFullName}${departmentName ? ` (${departmentName})` : ""} submitted a ${leaveType} leave request for ${daysLabel} (${dateRange}).`,
    redirectUrl: "/leave/manage",
    entityType: "LEAVE_REQUEST",
    entityUuid: requestUuid,
  });
}

/**
 * Department Head approves → notify HR_ADMIN + SUPER_ADMIN.
 */
async function notifyDepartmentApproved({
  senderUserUuid,
  senderRole,
  departmentHeadName,
  employeeFullName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  requestUuid,
}) {
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
  const daysLabel = totalDays != null ? `${Number(totalDays).toFixed(1)} day(s)` : "—";
  const dateRange = `${fmtDate(startDate)} to ${fmtDate(endDate)}`;

  const hrAdmins = await getUsersByRole("HR_ADMIN");
  const superAdmins = await getUsersByRole("SUPER_ADMIN");
  const recipients = [...new Set([...hrAdmins, ...superAdmins])];

  await fanOut(recipients, {
    senderUuid: senderUserUuid,
    senderRole: senderRole || "DEPARTMENT_HEAD",
    type: "LEAVE_DEPT_APPROVED",
    title: "Leave Request Approved by Department Head",
    message: `${departmentHeadName || "Department Head"} approved ${employeeFullName}'s ${leaveType} leave request (${daysLabel}, ${dateRange}). Awaiting your final review.`,
    redirectUrl: "/leave/manage",
    entityType: "LEAVE_REQUEST",
    entityUuid: requestUuid,
  });
}

/**
 * Department Head rejects → notify the employee.
 */
async function notifyDepartmentRejected({
  senderUserUuid,
  senderRole,
  departmentHeadName,
  employeeUserUuid,
  leaveType,
  rejectionReason,
  requestUuid,
}) {
  if (!employeeUserUuid) return;
  await insertNotification({
    recipientUuid: employeeUserUuid,
    senderUuid: senderUserUuid,
    senderRole: senderRole || "DEPARTMENT_HEAD",
    type: "LEAVE_DEPT_REJECTED",
    title: "Leave Request Rejected by Department Head",
    message: `Your ${leaveType || "leave"} request was rejected by ${departmentHeadName || "your Department Head"}${rejectionReason ? `. Reason: ${rejectionReason}` : "."}`,
    redirectUrl: "/leave/my-requests",
    entityType: "LEAVE_REQUEST",
    entityUuid: requestUuid,
  });
}

/**
 * HR Admin approves → notify the employee (and dept head for visibility).
 */
async function notifyHRApproved({
  senderUserUuid,
  senderRole,
  hrName,
  employeeUserUuid,
  departmentHeadUserUuid,
  employeeFullName,
  leaveType,
  startDate,
  endDate,
  totalDays,
  requestUuid,
}) {
  const fmtDate = (d) => (d ? String(d).slice(0, 10) : "—");
  const daysLabel = totalDays != null ? `${Number(totalDays).toFixed(1)} day(s)` : "—";
  const dateRange = `${fmtDate(startDate)} to ${fmtDate(endDate)}`;
  const approvedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  // Notify employee
  if (employeeUserUuid) {
    await insertNotification({
      recipientUuid: employeeUserUuid,
      senderUuid: senderUserUuid,
      senderRole: senderRole || "HR_ADMIN",
      type: "LEAVE_HR_APPROVED",
      title: "Leave Request Approved",
      message: `Your ${leaveType || "leave"} request (${daysLabel}, ${dateRange}) has been approved by ${hrName || "HR"}. Approved on ${approvedAt}.`,
      redirectUrl: "/leave/my-requests",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
  }

  // Also notify dept head for their record
  if (departmentHeadUserUuid && departmentHeadUserUuid !== employeeUserUuid) {
    await insertNotification({
      recipientUuid: departmentHeadUserUuid,
      senderUuid: senderUserUuid,
      senderRole: senderRole || "HR_ADMIN",
      type: "LEAVE_HR_APPROVED",
      title: "Leave Request Fully Approved",
      message: `${employeeFullName || "An employee"}'s ${leaveType || "leave"} request (${daysLabel}, ${dateRange}) has been approved by HR.`,
      redirectUrl: "/leave/manage",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
  }
}

/**
 * HR Admin rejects → notify the employee (and dept head).
 */
async function notifyHRRejected({
  senderUserUuid,
  senderRole,
  hrName,
  employeeUserUuid,
  departmentHeadUserUuid,
  employeeFullName,
  leaveType,
  rejectionReason,
  requestUuid,
}) {
  const rejectedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  if (employeeUserUuid) {
    await insertNotification({
      recipientUuid: employeeUserUuid,
      senderUuid: senderUserUuid,
      senderRole: senderRole || "HR_ADMIN",
      type: "LEAVE_HR_REJECTED",
      title: "Leave Request Rejected",
      message: `Your ${leaveType || "leave"} request was rejected by ${hrName || "HR"} on ${rejectedAt}${rejectionReason ? `. Reason: ${rejectionReason}` : "."}`,
      redirectUrl: "/leave/my-requests",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
  }

  if (departmentHeadUserUuid && departmentHeadUserUuid !== employeeUserUuid) {
    await insertNotification({
      recipientUuid: departmentHeadUserUuid,
      senderUuid: senderUserUuid,
      senderRole: senderRole || "HR_ADMIN",
      type: "LEAVE_HR_REJECTED",
      title: "Leave Request Rejected by HR",
      message: `${employeeFullName || "An employee"}'s ${leaveType || "leave"} request was rejected by HR.`,
      redirectUrl: "/leave/manage",
      entityType: "LEAVE_REQUEST",
      entityUuid: requestUuid,
    });
  }
}

/* ────────────────────────────────────────────────────────────
   LETTER NOTIFICATIONS
──────────────────────────────────────────────────────────── */

/**
 * Any role submits a letter request → notify HR_ADMIN + SUPER_ADMIN.
 */
async function notifyLetterSubmitted({
  senderUserUuid,
  senderRole,
  employeeFullName,
  departmentName,
  letterType,
  requestUuid,
}) {
  const hrAdmins = await getUsersByRole("HR_ADMIN");
  const superAdmins = await getUsersByRole("SUPER_ADMIN");
  const recipients = [...new Set([...hrAdmins, ...superAdmins])];

  const rolePart =
    senderRole === "DEPARTMENT_HEAD"
      ? " (Department Head)"
      : senderRole === "HR_ADMIN" || senderRole === "HR_OFFICER"
      ? " (HR)"
      : "";

  await fanOut(recipients, {
    senderUuid: senderUserUuid,
    senderRole: senderRole || "EMPLOYEE",
    type: "LETTER_REQUEST_SUBMITTED",
    title: `New Letter Request${rolePart}`,
    message: `${employeeFullName}${departmentName ? ` — ${departmentName}` : ""}${rolePart} requested a ${letterType || "letter"}.`,
    redirectUrl: "/letters/manage",
    entityType: "LETTER_REQUEST",
    entityUuid: requestUuid,
  });
}

/**
 * Admin approves letter → notify the requester.
 */
async function notifyLetterApproved({
  senderUserUuid,
  senderRole,
  recipientUserUuid,
  letterType,
  requestUuid,
}) {
  if (!recipientUserUuid) return;
  const approvedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await insertNotification({
    recipientUuid: recipientUserUuid,
    senderUuid: senderUserUuid,
    senderRole: senderRole || "HR_ADMIN",
    type: "LETTER_APPROVED",
    title: "Letter Request Approved",
    message: `Your ${letterType || "letter"} request has been approved and issued on ${approvedAt}.`,
    redirectUrl: "/letters/my",
    entityType: "LETTER_REQUEST",
    entityUuid: requestUuid,
  });
}

/**
 * Admin rejects letter → notify the requester.
 */
async function notifyLetterRejected({
  senderUserUuid,
  senderRole,
  recipientUserUuid,
  letterType,
  rejectionReason,
  requestUuid,
}) {
  if (!recipientUserUuid) return;
  const rejectedAt = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
  await insertNotification({
    recipientUuid: recipientUserUuid,
    senderUuid: senderUserUuid,
    senderRole: senderRole || "HR_ADMIN",
    type: "LETTER_REJECTED",
    title: "Letter Request Rejected",
    message: `Your ${letterType || "letter"} request was rejected on ${rejectedAt}${rejectionReason ? `. Reason: ${rejectionReason}` : "."}`,
    redirectUrl: "/letters/my",
    entityType: "LETTER_REQUEST",
    entityUuid: requestUuid,
  });
}

/* ────────────────────────────────────────────────────────────
   Safe wrappers — never throw
──────────────────────────────────────────────────────────── */

function makeSafe(fn) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error(`[NotificationService] ${fn.name} failed:`, err.message);
      return null;
    }
  };
}

/* ────────────────────────────────────────────────────────────
   Query functions (used by controller)
──────────────────────────────────────────────────────────── */

async function getNotificationsForUser(userUuid, { limit = 50, offset = 0 } = {}) {
  // MySQL2 prepared statements require integer LIMIT/OFFSET
  const safeLimit  = Math.min(Math.max(1, parseInt(limit,  10) || 50), 100);
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await db.promise().execute(
    `SELECT n.uuid, n.notification_type, n.title, n.message, n.redirect_url,
            n.entity_type, n.entity_uuid, n.is_read, n.created_at,
            n.sender_role,
            CONCAT(e.first_name, ' ',
                   CASE WHEN e.middle_name IS NOT NULL AND e.middle_name != ''
                        THEN CONCAT(e.middle_name, ' ') ELSE '' END,
                   e.last_name) AS sender_name,
            u.role AS sender_user_role
     FROM Notifications n
     LEFT JOIN Users u ON u.uuid = n.sender_uuid
     LEFT JOIN Employees e ON e.uuid = u.employee_uuid
     WHERE n.user_uuid = ?
     ORDER BY n.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [userUuid]
  );
  return rows;
}

async function getUnreadCount(userUuid) {
  const [rows] = await db.promise().execute(
    "SELECT COUNT(*) AS cnt FROM Notifications WHERE user_uuid = ? AND is_read = 0",
    [userUuid]
  );
  return Number(rows[0]?.cnt || 0);
}

async function markAsRead(uuid, userUuid) {
  await executeQuery(
    "UPDATE Notifications SET is_read = 1 WHERE uuid = ? AND user_uuid = ?",
    [uuid, userUuid]
  );
}

async function markAllAsRead(userUuid) {
  await executeQuery(
    "UPDATE Notifications SET is_read = 1 WHERE user_uuid = ? AND is_read = 0",
    [userUuid]
  );
}

async function deleteAllForUser(userUuid) {
  await executeQuery(
    "DELETE FROM Notifications WHERE user_uuid = ?",
    [userUuid]
  );
}

async function deleteReadForUser(userUuid) {
  await executeQuery(
    "DELETE FROM Notifications WHERE user_uuid = ? AND is_read = 1",
    [userUuid]
  );
}

module.exports = {
  // helpers for hooks in controllers
  getUserByEmployeeUuid,
  getUsersByRole,

  // notification creators (safe — non-throwing)
  notifyLeaveSubmitted:      makeSafe(notifyLeaveSubmitted),
  notifyDepartmentApproved:  makeSafe(notifyDepartmentApproved),
  notifyDepartmentRejected:  makeSafe(notifyDepartmentRejected),
  notifyHRApproved:          makeSafe(notifyHRApproved),
  notifyHRRejected:          makeSafe(notifyHRRejected),
  notifyLetterSubmitted:     makeSafe(notifyLetterSubmitted),
  notifyLetterApproved:      makeSafe(notifyLetterApproved),
  notifyLetterRejected:      makeSafe(notifyLetterRejected),

  // query helpers
  getNotificationsForUser,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteAllForUser,
  deleteReadForUser,
};
