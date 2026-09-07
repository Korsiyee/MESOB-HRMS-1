const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * List audit logs with filtering and pagination
 * GET /api/logs?actor_uuid=xxx&action=CREATE&entity_type=USER&start_date=2024-01-01&end_date=2024-12-31&page=1&limit=50
 */
exports.listLogs = async (req, res) => {
  try {
    const {
      actor_uuid,
      action,
      entity_type,
      entity_uuid,
      start_date,
      end_date,
      search,
      page = "1",
      limit = "50",
    } = req.query;

    const pool = db.promise();
    
    // Parse and validate pagination parameters
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const offset = (pageNum - 1) * limitNum;
    
    // Validate pagination parameters are positive integers
    if (pageNum < 1 || limitNum < 1 || limitNum > 1000) {
      return sendError(res, {
        status: 400,
        message: "Invalid pagination parameters. Page must be >= 1, limit must be between 1 and 1000.",
        error: "VALIDATION_ERROR",
      });
    }

    let query = `
      SELECT
        al.uuid,
        al.actor_uuid,
        al.action,
        al.entity_type,
        al.entity_uuid,
        al.diff_json,
        al.ip_address,
        al.created_at,
        u.username as actor_username,
        e.first_name as actor_first_name,
        e.last_name as actor_last_name,
        e.mesob_id as actor_mesob_id,
        CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as actor_name,
        COALESCE(
          en_emp.entity_label,
          en_usr.entity_label,
          en_dept.entity_label,
          en_pos.entity_label,
          en_lr.entity_label,
          al.entity_uuid
        ) as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN (
        SELECT uuid, CONCAT_WS(' ', first_name, middle_name, last_name) AS entity_label
        FROM Employees
      ) en_emp ON al.entity_type = 'EMPLOYEE' AND en_emp.uuid = al.entity_uuid
      LEFT JOIN (
        SELECT uuid, username AS entity_label FROM Users
      ) en_usr ON al.entity_type = 'USER' AND en_usr.uuid = al.entity_uuid
      LEFT JOIN (
        SELECT uuid, name AS entity_label FROM Departments
      ) en_dept ON al.entity_type = 'DEPARTMENT' AND en_dept.uuid = al.entity_uuid
      LEFT JOIN (
        SELECT uuid, title AS entity_label FROM Positions
      ) en_pos ON al.entity_type = 'POSITION' AND en_pos.uuid = al.entity_uuid
      LEFT JOIN (
        SELECT uuid, leaveType AS entity_label FROM leaveRequests
      ) en_lr ON al.entity_type = 'LEAVE_REQUEST' AND en_lr.uuid = al.entity_uuid
      WHERE 1=1
    `;

    const params = [];

    // Filter by actor
    if (actor_uuid) {
      query += " AND al.actor_uuid = ?";
      params.push(actor_uuid);
    }

    // Filter by action
    if (action) {
      query += " AND al.action = ?";
      params.push(action);
    }

    // Filter by entity type
    if (entity_type) {
      query += " AND al.entity_type = ?";
      params.push(entity_type);
    }

    // Filter by entity UUID
    if (entity_uuid) {
      query += " AND al.entity_uuid = ?";
      params.push(entity_uuid);
    }

    // Filter by date range
    if (start_date) {
      query += " AND DATE(al.created_at) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(al.created_at) <= ?";
      params.push(end_date);
    }

    // Search across multiple fields including mesob_id and full name
    if (search && search.trim()) {
      query += ` AND (
        al.action LIKE ? OR
        al.entity_type LIKE ? OR
        al.entity_uuid LIKE ? OR
        u.username LIKE ? OR
        e.first_name LIKE ? OR
        e.last_name LIKE ? OR
        e.mesob_id LIKE ? OR
        CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Count total records
    const countQuery = query.replace(
      /SELECT[\s\S]*?FROM/,
      "SELECT COUNT(*) as total FROM"
    );
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    // Add ordering and pagination - use direct integer values instead of placeholders
    query += ` ORDER BY al.created_at DESC LIMIT ${limitNum} OFFSET ${offset}`;

    const [logs] = await pool.execute(query, params);

    // Parse diff_json for each log
    const logsWithParsedDiff = logs.map((log) => ({
      ...log,
      diff: log.diff_json 
        ? (typeof log.diff_json === 'string' ? JSON.parse(log.diff_json) : log.diff_json)
        : null,
      diff_json: undefined, // Remove raw JSON from response
    }));

    return sendSuccess(res, {
      status: 200,
      message: "Audit logs retrieved successfully.",
      data: {
        logs: logsWithParsedDiff,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error("listLogs error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve audit logs.",
      error: "LIST_LOGS_ERROR",
    });
  }
};

/**
 * Get single audit log entry by UUID
 * GET /api/logs/:uuid
 */
exports.getLog = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();

    const [logs] = await pool.execute(
      `SELECT 
        al.uuid,
        al.actor_uuid,
        al.action,
        al.entity_type,
        al.entity_uuid,
        al.diff_json,
        al.ip_address,
        al.created_at,
        u.uuid as actor_user_uuid,
        u.username as actor_username,
        u.role as actor_role,
        e.uuid as actor_employee_uuid,
        e.first_name as actor_first_name,
        e.middle_name as actor_middle_name,
        e.last_name as actor_last_name,
        e.mesob_id as actor_mesob_id,
        CASE
          WHEN al.entity_type = 'EMPLOYEE' THEN (
            SELECT CONCAT_WS(' ', first_name, middle_name, last_name)
            FROM Employees WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'USER' THEN (
            SELECT username FROM Users WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'DEPARTMENT' THEN (
            SELECT name FROM Departments WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'POSITION' THEN (
            SELECT title FROM Positions WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'LEAVE_REQUEST' THEN (
            SELECT CONCAT('Leave Request - ', leaveType)
            FROM leaveRequests WHERE uuid = al.entity_uuid LIMIT 1
          )
          ELSE al.entity_uuid
        END as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      WHERE al.uuid = ?`,
      [uuid]
    );

    if (!logs.length) {
      return sendError(res, {
        status: 404,
        message: "Audit log entry not found.",
        error: "LOG_NOT_FOUND",
      });
    }

    const log = logs[0];

    // Parse diff_json
    const logWithParsedDiff = {
      ...log,
      diff: log.diff_json 
        ? (typeof log.diff_json === 'string' ? JSON.parse(log.diff_json) : log.diff_json)
        : null,
      diff_json: undefined, // Remove raw JSON from response
    };

    return sendSuccess(res, {
      status: 200,
      message: "Audit log retrieved successfully.",
      data: logWithParsedDiff,
    });
  } catch (error) {
    console.error("getLog error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve audit log.",
      error: "GET_LOG_ERROR",
    });
  }
};

/**
 * Get available action types
 * GET /api/logs/actions
 */
exports.getActions = async (req, res) => {
  try {
    const pool = db.promise();

    const [actions] = await pool.execute(
      `SELECT DISTINCT action 
       FROM AuditLogs 
       WHERE action IS NOT NULL 
       ORDER BY action ASC`
    );

    return sendSuccess(res, {
      status: 200,
      message: "Action types retrieved successfully.",
      data: actions.map((row) => row.action),
    });
  } catch (error) {
    console.error("getActions error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve action types.",
      error: "GET_ACTIONS_ERROR",
    });
  }
};

/**
 * Get available entity types
 * GET /api/logs/entity-types
 */
exports.getEntityTypes = async (req, res) => {
  try {
    const pool = db.promise();

    const [entityTypes] = await pool.execute(
      `SELECT DISTINCT entity_type 
       FROM AuditLogs 
       WHERE entity_type IS NOT NULL 
       ORDER BY entity_type ASC`
    );

    return sendSuccess(res, {
      status: 200,
      message: "Entity types retrieved successfully.",
      data: entityTypes.map((row) => row.entity_type),
    });
  } catch (error) {
    console.error("getEntityTypes error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve entity types.",
      error: "GET_ENTITY_TYPES_ERROR",
    });
  }
};

/**
 * Export audit logs to CSV
 * GET /api/logs/export?format=csv&...filters
 */
exports.exportLogs = async (req, res) => {
  try {
    const {
      actor_uuid,
      action,
      entity_type,
      entity_uuid,
      start_date,
      end_date,
      search,
      format = "csv",
    } = req.query;

    if (format !== "csv") {
      return sendError(res, {
        status: 400,
        message: "Only CSV format is currently supported.",
        error: "INVALID_FORMAT",
      });
    }

    const pool = db.promise();

    let query = `
      SELECT 
        al.uuid,
        al.created_at,
        al.action,
        al.entity_type,
        al.entity_uuid,
        al.ip_address,
        u.username as actor_username,
        CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as actor_name,
        e.mesob_id as actor_mesob_id,
        al.diff_json,
        CASE
          WHEN al.entity_type = 'EMPLOYEE' THEN (
            SELECT CONCAT_WS(' ', first_name, middle_name, last_name)
            FROM Employees WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'USER' THEN (
            SELECT username FROM Users WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'DEPARTMENT' THEN (
            SELECT name FROM Departments WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'POSITION' THEN (
            SELECT title FROM Positions WHERE uuid = al.entity_uuid LIMIT 1
          )
          WHEN al.entity_type = 'LEAVE_REQUEST' THEN (
            SELECT CONCAT('Leave Request - ', leaveType)
            FROM leaveRequests WHERE uuid = al.entity_uuid LIMIT 1
          )
          ELSE al.entity_uuid
        END as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      WHERE 1=1
    `;

    const params = [];

    // Apply same filters as listLogs
    if (actor_uuid) {
      query += " AND al.actor_uuid = ?";
      params.push(actor_uuid);
    }
    if (action) {
      query += " AND al.action = ?";
      params.push(action);
    }
    if (entity_type) {
      query += " AND al.entity_type = ?";
      params.push(entity_type);
    }
    if (entity_uuid) {
      query += " AND al.entity_uuid = ?";
      params.push(entity_uuid);
    }
    if (start_date) {
      query += " AND DATE(al.created_at) >= ?";
      params.push(start_date);
    }
    if (end_date) {
      query += " AND DATE(al.created_at) <= ?";
      params.push(end_date);
    }
    if (search && search.trim()) {
      query += ` AND (
        al.action LIKE ? OR
        al.entity_type LIKE ? OR
        al.entity_uuid LIKE ? OR
        u.username LIKE ? OR
        e.first_name LIKE ? OR
        e.last_name LIKE ? OR
        e.mesob_id LIKE ? OR
        CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) LIKE ?
      )`;
      const searchTerm = `%${search.trim()}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY al.created_at DESC LIMIT 10000"; // Limit exports to 10k records

    const [logs] = await pool.execute(query, params);

    // Generate CSV
    const csvRows = [];
    
    // Header
    csvRows.push([
      "Timestamp",
      "Action",
      "Entity Type",
      "Entity Name",
      "Entity UUID",
      "Actor Username",
      "Actor Name",
      "Actor MESOB ID",
      "IP Address",
      "Changes",
    ].map(escapeCSV).join(","));

    // Rows
    for (const log of logs) {
      const diff = log.diff_json 
        ? JSON.stringify(typeof log.diff_json === 'string' ? JSON.parse(log.diff_json) : log.diff_json)
        : "";
      csvRows.push([
        log.created_at,
        log.action || "",
        log.entity_type || "",
        log.entity_name || "",
        log.entity_uuid || "",
        log.actor_username || "",
        log.actor_name || "",
        log.actor_mesob_id || "",
        log.ip_address || "",
        diff,
      ].map(escapeCSV).join(","));
    }

    const csvContent = csvRows.join("\n");

    // Set response headers for CSV download
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`
    );

    return res.status(200).send(csvContent);
  } catch (error) {
    console.error("exportLogs error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to export audit logs.",
      error: "EXPORT_LOGS_ERROR",
    });
  }
};

/**
 * Helper function to escape CSV values
 */
function escapeCSV(value) {
  if (value === null || value === undefined) {
    return "";
  }
  
  const stringValue = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  
  return stringValue;
}
