const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");

/**
 * List audit logs with filtering and pagination
 * GET /api/logs?actor_uuid=xxx&action_type=CREATE&resource_type=USER&start_date=2024-01-01&end_date=2024-12-31&page=1&limit=50
 */
exports.listLogs = async (req, res) => {
  try {
    const {
      actor_uuid,
      action_type,
      resource_type,
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
        al.actor_user_uuid,
        al.action_type,
        al.resource_type,
        al.resource_uuid,
        al.old_values_json,
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
          al.resource_uuid
        ) as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_user_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      LEFT JOIN (
        SELECT uuid, CONCAT_WS(' ', first_name, middle_name, last_name) AS entity_label
        FROM Employees
      ) en_emp ON al.resource_type = 'EMPLOYEE' AND en_emp.uuid = al.resource_uuid
      LEFT JOIN (
        SELECT uuid, username AS entity_label FROM Users
      ) en_usr ON al.resource_type = 'USER' AND en_usr.uuid = al.resource_uuid
      LEFT JOIN (
        SELECT uuid, name AS entity_label FROM Departments
      ) en_dept ON al.resource_type = 'DEPARTMENT' AND en_dept.uuid = al.resource_uuid
      LEFT JOIN (
        SELECT uuid, title AS entity_label FROM Positions
      ) en_pos ON al.resource_type = 'POSITION' AND en_pos.uuid = al.resource_uuid
      LEFT JOIN (
        SELECT uuid, leaveType AS entity_label FROM leaveRequests
      ) en_lr ON al.resource_type = 'LEAVE_REQUEST' AND en_lr.uuid = al.resource_uuid
      WHERE 1=1
    `;

    const params = [];

    // Filter by actor
    if (actor_uuid) {
      query += " AND al.actor_user_uuid = ?";
      params.push(actor_uuid);
    }

    // Filter by action_type
    if (action_type) {
      query += " AND al.action_type = ?";
      params.push(action_type);
    }

    // Filter by entity type
    if (resource_type) {
      query += " AND al.resource_type = ?";
      params.push(resource_type);
    }

    // Filter by entity UUID
    if (entity_uuid) {
      query += " AND al.resource_uuid = ?";
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
        al.action_type LIKE ? OR
        al.resource_type LIKE ? OR
        al.resource_uuid LIKE ? OR
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

    // Parse old_values_json for each log and add frontend-compatible field names
    const logsWithParsedDiff = logs.map((log) => ({
      ...log,
      action: log.action_type, // Frontend expects 'action'
      entity_type: log.resource_type, // Frontend expects 'entity_type'
      entity_uuid: log.resource_uuid, // Frontend expects 'entity_uuid'
      diff: log.old_values_json 
        ? (typeof log.old_values_json === 'string' ? JSON.parse(log.old_values_json) : log.old_values_json)
        : null,
      old_values_json: undefined, // Remove raw JSON from response
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
        al.actor_user_uuid,
        al.action_type,
        al.resource_type,
        al.resource_uuid,
        al.old_values_json,
        al.ip_address,
        al.created_at,
        u.uuid as actor_user_uuid,
        u.username as actor_username,
        u.role_uuid as actor_role_uuid,
        r.code as actor_role,
        e.uuid as actor_employee_uuid,
        e.first_name as actor_first_name,
        e.middle_name as actor_middle_name,
        e.last_name as actor_last_name,
        e.mesob_id as actor_mesob_id,
        CASE
          WHEN al.resource_type = 'EMPLOYEE' THEN (
            SELECT CONCAT_WS(' ', first_name, middle_name, last_name)
            FROM Employees WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'USER' THEN (
            SELECT username FROM Users WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'DEPARTMENT' THEN (
            SELECT name FROM Departments WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'POSITION' THEN (
            SELECT title FROM Positions WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'LEAVE_REQUEST' THEN (
            SELECT CONCAT('Leave Request - ', leaveType)
            FROM leaveRequests WHERE uuid = al.resource_uuid LIMIT 1
          )
          ELSE al.resource_uuid
        END as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_user_uuid
      LEFT JOIN Roles r ON r.uuid = u.role_uuid
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

    // Parse old_values_json and add frontend-compatible field names
    const logWithParsedDiff = {
      ...log,
      action: log.action_type, // Frontend expects 'action'
      entity_type: log.resource_type, // Frontend expects 'entity_type'
      entity_uuid: log.resource_uuid, // Frontend expects 'entity_uuid'
      diff: log.old_values_json 
        ? (typeof log.old_values_json === 'string' ? JSON.parse(log.old_values_json) : log.old_values_json)
        : null,
      old_values_json: undefined, // Remove raw JSON from response
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
 * Get available action_type types
 * GET /api/logs/action_types
 */
exports.getActions = async (req, res) => {
  try {
    const pool = db.promise();

    const [action_types] = await pool.execute(
      `SELECT DISTINCT action_type 
       FROM AuditLogs 
       WHERE action_type IS NOT NULL 
       ORDER BY action_type ASC`
    );

    return sendSuccess(res, {
      status: 200,
      message: "Action types retrieved successfully.",
      data: action_types.map((row) => row.action_type),
    });
  } catch (error) {
    console.error("getActions error:", error);
    return sendError(res, {
      status: 500,
      message: "Failed to retrieve action_type types.",
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
      `SELECT DISTINCT resource_type 
       FROM AuditLogs 
       WHERE resource_type IS NOT NULL 
       ORDER BY resource_type ASC`
    );

    return sendSuccess(res, {
      status: 200,
      message: "Entity types retrieved successfully.",
      data: entityTypes.map((row) => row.resource_type),
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
      action_type,
      resource_type,
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
        al.action_type,
        al.resource_type,
        al.resource_uuid,
        al.ip_address,
        u.username as actor_username,
        CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name) as actor_name,
        e.mesob_id as actor_mesob_id,
        al.old_values_json,
        CASE
          WHEN al.resource_type = 'EMPLOYEE' THEN (
            SELECT CONCAT_WS(' ', first_name, middle_name, last_name)
            FROM Employees WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'USER' THEN (
            SELECT username FROM Users WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'DEPARTMENT' THEN (
            SELECT name FROM Departments WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'POSITION' THEN (
            SELECT title FROM Positions WHERE uuid = al.resource_uuid LIMIT 1
          )
          WHEN al.resource_type = 'LEAVE_REQUEST' THEN (
            SELECT CONCAT('Leave Request - ', leaveType)
            FROM leaveRequests WHERE uuid = al.resource_uuid LIMIT 1
          )
          ELSE al.resource_uuid
        END as entity_name
      FROM AuditLogs al
      LEFT JOIN Users u ON u.uuid = al.actor_user_uuid
      LEFT JOIN Employees e ON e.uuid = u.employee_uuid
      WHERE 1=1
    `;

    const params = [];

    // Apply same filters as listLogs
    if (actor_uuid) {
      query += " AND al.actor_user_uuid = ?";
      params.push(actor_uuid);
    }
    if (action_type) {
      query += " AND al.action_type = ?";
      params.push(action_type);
    }
    if (resource_type) {
      query += " AND al.resource_type = ?";
      params.push(resource_type);
    }
    if (entity_uuid) {
      query += " AND al.resource_uuid = ?";
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
        al.action_type LIKE ? OR
        al.resource_type LIKE ? OR
        al.resource_uuid LIKE ? OR
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
      const diff = log.old_values_json 
        ? JSON.stringify(typeof log.old_values_json === 'string' ? JSON.parse(log.old_values_json) : log.old_values_json)
        : "";
      csvRows.push([
        log.created_at,
        log.action_type || "",
        log.resource_type || "",
        log.entity_name || "",
        log.resource_uuid || "",
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
