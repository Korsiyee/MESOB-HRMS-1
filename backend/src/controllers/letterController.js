const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");
const LetterTemplateStorageService = require("../services/letterTemplateStorageService");
const PDFService = require("../services/pdfService");
const { safeLogEvent } = require("../services/auditLogService");
const {
  notifyLetterSubmitted,
  notifyLetterApproved,
  notifyLetterRejected,
  getUserByEmployeeUuid,
} = require("../services/notificationService");

/* ─── helpers ─────────────────────────────────────────────────── */

/**
 * Schema changes have been moved to database migrations
 * All required columns should exist in the schema.sql file
 */
async function ensureLetterSchema() {
  // No-op: schema is managed by migrations
  return Promise.resolve();
}

/**
 * Replace {{placeholder}} tokens in a template body with employee data.
 */
function renderTemplate(bodyTemplate, employee) {
  const map = {
    employee_name: [employee.first_name, employee.middle_name, employee.last_name]
      .filter(Boolean)
      .join(" "),
    position: employee.position_title || employee.position || "",
    department: employee.department_name || employee.department || "",
    hire_date: employee.hire_date
      ? new Date(employee.hire_date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "",
    date: new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
    mesob_id: employee.mesob_id || "",
  };

  return bodyTemplate.replace(/\{\{(\w+)\}\}/g, (_, key) =>
    map[key] !== undefined ? map[key] : `{{${key}}}`
  );
}

/* ─── controllers ─────────────────────────────────────────────── */

exports.listLetterTemplates = async (req, res) => {
  try {
    const pool = db.promise();

    const [rows] = await pool.execute(`
      SELECT
        uuid,
        template_name AS name,
        type,
        body_template AS content,
        text_content,
        pdf_template_key,
        original_filename,
        file_size,
        mime_type,
        created_at,
        updated_at
      FROM LetterTemplates
      ORDER BY created_at DESC
    `);

    // Add template_type field to indicate if it's text or PDF
    const data = rows.map((row) => ({
      ...row,
      template_type: row.pdf_template_key ? "pdf" : "text",
      pdf_template_key: row.pdf_template_key || null,
      original_filename: row.original_filename || null,
      file_size: row.file_size || null,
      mime_type: row.mime_type || null,
    }));

    return sendSuccess(res, { status: 200, data });
  } catch (err) {
    console.error("listLetterTemplates error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load templates.",
    });
  }
};

exports.createLetterTemplate = async (req, res) => {
  try {
    const { name, type, content, text_content } = req.body || {};
    const file = req.file; // PDF file from multer
    
    // Must have either content (text) or file (PDF)
    if (!name || (!content && !file)) {
      return sendError(res, {
        status: 400,
        message: "name and either content or PDF file are required.",
        error: "VALIDATION_ERROR",
      });
    }
    
    const pool = db.promise();
    const id = uuidv4();
    
    let pdf_template_key = null;
    let original_filename = null;
    let file_size = null;
    let mime_type = null;
    let pdf_metadata = null;
    
    // Handle PDF upload
    if (file) {
      if (!file.mimetype.includes("pdf")) {
        return sendError(res, {
          status: 400,
          message: "Only PDF files are allowed for template upload.",
          error: "INVALID_FILE_TYPE",
        });
      }

      // Validate PDF
      const isValidPDF = await PDFService.validatePDF(file.buffer);
      if (!isValidPDF) {
        return sendError(res, {
          status: 400,
          message: "Invalid or corrupted PDF file.",
          error: "INVALID_PDF",
        });
      }

      // Extract PDF metadata
      try {
        pdf_metadata = await PDFService.extractPDFMetadata(file.buffer);
      } catch (error) {
        console.error("Failed to extract PDF metadata:", error);
        pdf_metadata = null;
      }
      
      // Generate object key: templates/{uuid}/{filename}
      const objectKey = `templates/${id}/${file.originalname}`;
      
      await LetterTemplateStorageService.uploadTemplate({
        objectKey,
        buffer: file.buffer,
        mimeType: file.mimetype,
      });
      
      pdf_template_key = objectKey;
      original_filename = file.originalname;
      file_size = file.size;
      mime_type = file.mimetype;
    }
    
    // Store template with both body_template (for backward compat) and text_content (for PDF overlay)
    const codeVal = `TPL_${Date.now().toString().slice(-6)}`;
    const bodyVal = content || text_content || null;
    await pool.execute(
      `INSERT INTO LetterTemplates 
       (uuid, template_code, template_name, title, type, category, letter_type, body_template, main_body, text_content, subject_template, pdf_template_key, original_filename, file_size, mime_type, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        codeVal,
        name.trim(),
        name.trim(),
        type || "Employment Verification",
        type || "Employment Verification",
        type || "Employment Verification",
        bodyVal,
        bodyVal,
        text_content || content || null,
        name.trim(),
        pdf_template_key,
        original_filename,
        file_size,
        mime_type,
        req.user?.employee_uuid || null,
      ]
    );
    
    const [rows] = await pool.execute(
      `SELECT uuid, template_name AS name, type, body_template AS content, text_content,
              pdf_template_key, original_filename, file_size, mime_type,
              created_at, updated_at
       FROM LetterTemplates WHERE uuid = ?`,
      [id]
    );
    
    const data = {
      ...rows[0],
      template_type: rows[0].pdf_template_key ? "pdf" : "text",
      pdf_metadata,
    };
    
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "CREATE_LETTER_TEMPLATE",
      entityType: "LETTER_TEMPLATE",
      entityUuid: id,
      diff: { name: name.trim(), type, template_type: data.template_type },
      ipAddress: req.ip,
    });
    
    return sendSuccess(res, {
      status: 201,
      message: "Template created.",
      data,
    });
  } catch (err) {
    console.error("createLetterTemplate error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to create template.",
    });
  }
};

exports.updateLetterTemplate = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { name, type, description, content } = req.body || {};
    const pool = db.promise();

    const [existing] = await pool.execute(
      "SELECT uuid FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );
    if (!existing.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }

    const updates = [];
    const values = [];
    if (name !== undefined) { updates.push("title = ?", "template_name = ?"); values.push(name.trim(), name.trim()); }
    if (type !== undefined) { updates.push("type = ?", "category = ?", "letter_type = ?"); values.push(type, type, type); }
    if (content !== undefined) { updates.push("body_template = ?", "main_body = ?", "text_content = ?"); values.push(content, content, content); }

    if (updates.length) {
      values.push(uuid);
      await pool.execute(
        `UPDATE LetterTemplates SET ${updates.join(", ")} WHERE uuid = ?`,
        values
      );
    }

    const [rows] = await pool.execute(
      `SELECT uuid, template_name AS name, type, body_template AS content, created_at, updated_at
       FROM LetterTemplates WHERE uuid = ?`,
      [uuid]
    );
    return sendSuccess(res, { status: 200, message: "Template updated.", data: rows[0] });
  } catch (err) {
    console.error("updateLetterTemplate error:", err);
    return sendError(res, { status: 500, message: err.message || "Failed to update template." });
  }
};

exports.deleteLetterTemplate = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();
    
    // Get template info before deleting
    const [existing] = await pool.execute(
      "SELECT uuid, title, pdf_template_key FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );
    
    if (!existing.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    
    const template = existing[0];
    
    // Delete PDF from MinIO if exists
    if (template.pdf_template_key) {
      try {
        await LetterTemplateStorageService.deleteTemplate(template.pdf_template_key);
      } catch (error) {
        console.error("Failed to delete PDF from storage:", error);
        // Continue with database deletion even if storage deletion fails
      }
    }
    
    const [result] = await pool.execute(
      "DELETE FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );
    
    if (!result.affectedRows) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "DELETE_LETTER_TEMPLATE",
      entityType: "LETTER_TEMPLATE",
      entityUuid: uuid,
      diff: { title: template.title },
      ipAddress: req.ip,
    });
    
    return sendSuccess(res, { status: 200, message: "Template deleted." });
  } catch (err) {
    console.error("deleteLetterTemplate error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to delete template.",
    });
  }
};

exports.generateLetter = async (req, res) => {
  try {
    await ensureLetterSchema();
    const { template_uuid, employee_uuid, mesob_id } = req.body || {};
    
    // Must provide either employee_uuid or mesob_id
    if (!template_uuid || (!employee_uuid && !mesob_id)) {
      return sendError(res, {
        status: 400,
        message: "template_uuid and either employee_uuid or mesob_id are required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();
    
    // Resolve employee UUID if mesob_id was provided
    let finalEmployeeUuid = employee_uuid;
    if (mesob_id && !employee_uuid) {
      const [employees] = await pool.execute(
        "SELECT uuid FROM Employees WHERE mesob_id = ?",
        [mesob_id]
      );
      if (!employees.length) {
        return sendError(res, { 
          status: 404, 
          message: "Employee not found with that Mesob ID." 
        });
      }
      finalEmployeeUuid = employees[0].uuid;
    }

    // Load template
    const [templates] = await pool.execute(
      "SELECT uuid, title, type, body_template FROM LetterTemplates WHERE uuid = ?",
      [template_uuid]
    );
    if (!templates.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    const template = templates[0];

    // Load employee with position and department names
    const [employees] = await pool.execute(
      `SELECT e.uuid, e.first_name, e.middle_name, e.last_name, e.mesob_id, e.hire_date,
              p.title AS position_title, d.name AS department_name
       FROM Employees e
       LEFT JOIN Positions p ON p.uuid = e.position_uuid
       LEFT JOIN Departments d ON d.uuid = p.department_uuid
       WHERE e.uuid = ?`,
      [finalEmployeeUuid]
    );
    if (!employees.length) {
      return sendError(res, { status: 404, message: "Employee not found." });
    }
    const employee = employees[0];

    const generatedContent = renderTemplate(template.body_template || "", employee);
    const issuedId = uuidv4();

    const letterNumber = `LTR-${Date.now().toString().slice(-6)}`;
    await pool.execute(
      `INSERT INTO IssuedLetters
         (uuid, employee_uuid, template_uuid, issued_by, issued_by_uuid, name, type, generated_content, content_html, letter_number, issued_date, file_key, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'generated', 0)`,
      [
        issuedId,
        finalEmployeeUuid,
        template_uuid,
        req.user?.employee_uuid || null,
        req.user?.employee_uuid || null,
        template.title || "Letter",
        template.type || "—",
        generatedContent,
        generatedContent,
        letterNumber,
      ]
    );

    return sendSuccess(res, {
      status: 201,
      message: "Letter generated.",
      data: {
        uuid: issuedId,
        name: template.title,
        type: template.type,
        generated_content: generatedContent,
        issued_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("generateLetter error:", err);
    return sendError(res, { status: 500, message: err.message || "Failed to generate letter." });
  }
};

exports.listIssuedLetters = async (req, res) => {
  try {
    await ensureLetterSchema();
    const { uuid: identifier } = req.params;
    const pool = db.promise();
    
    // Determine if identifier is mesob_id (starts with "MES-") or UUID
    const isMesobId = identifier && identifier.toUpperCase().startsWith("MES-");
    
    let employeeUuid;
    if (isMesobId) {
      // Look up employee by mesob_id
      const [employees] = await pool.execute(
        "SELECT uuid FROM Employees WHERE mesob_id = ?",
        [identifier]
      );
      if (!employees.length) {
        return sendError(res, { 
          status: 404, 
          message: "Employee not found with that Mesob ID." 
        });
      }
      employeeUuid = employees[0].uuid;
    } else {
      employeeUuid = identifier;
    }
    
    const [rows] = await pool.execute(
      `SELECT il.uuid, il.name, il.type, il.generated_content, il.issued_at,
              lt.template_name, lt.type AS template_type
       FROM IssuedLetters il
       LEFT JOIN LetterTemplates lt ON lt.uuid = il.template_uuid
       WHERE il.employee_uuid = ?
       ORDER BY il.issued_at DESC`,
      [employeeUuid]
    );
    // Normalise: use template fields as fallback if columns not yet populated
    const data = rows.map((r) => ({
      ...r,
      name: r.name || r.template_name || "Letter",
      type: r.type || r.template_type || "—",
    }));
    return sendSuccess(res, { status: 200, data });
  } catch (err) {
    console.error("listIssuedLetters error:", err);
    return sendError(res, { status: 500, message: "Failed to load issued letters." });
  }
};

exports.downloadLetterContent = async (req, res) => {
  try {
    await ensureLetterSchema();
    const { uuid } = req.params;
    const pool = db.promise();
    const [rows] = await pool.execute(
      "SELECT uuid, name, type, generated_content, issued_at FROM IssuedLetters WHERE uuid = ?",
      [uuid]
    );
    if (!rows.length) {
      return sendError(res, { status: 404, message: "Letter not found." });
    }
    return sendSuccess(res, { status: 200, data: rows[0] });
  } catch (err) {
    console.error("downloadLetterContent error:", err);
    return sendError(res, { status: 500, message: "Failed to load letter content." });
  }
};

/**
 * Get PDF template preview URL
 * GET /api/letters/templates/:uuid/preview
 */
exports.getTemplatePDFPreview = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();
    
    const [templates] = await pool.execute(
      "SELECT uuid, title, pdf_template_key, original_filename FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );
    
    if (!templates.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    
    const template = templates[0];
    
    if (!template.pdf_template_key) {
      return sendError(res, {
        status: 400,
        message: "This template does not have a PDF file.",
        error: "NO_PDF_TEMPLATE",
      });
    }
    
    // Generate presigned URL valid for 1 hour
    const previewUrl = await LetterTemplateStorageService.getTemplateUrl(
      template.pdf_template_key,
      3600
    );
    
    return sendSuccess(res, {
      status: 200,
      data: {
        uuid: template.uuid,
        title: template.title,
        filename: template.original_filename,
        preview_url: previewUrl,
        expires_in: 3600,
      },
    });
  } catch (err) {
    console.error("getTemplatePDFPreview error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to generate preview URL.",
    });
  }
};

/**
 * Download PDF template
 * GET /api/letters/templates/:uuid/download
 */
exports.downloadTemplatePDF = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();
    
    const [templates] = await pool.execute(
      "SELECT uuid, title, pdf_template_key, original_filename, mime_type FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );
    
    if (!templates.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    
    const template = templates[0];
    
    if (!template.pdf_template_key) {
      return sendError(res, {
        status: 400,
        message: "This template does not have a PDF file.",
        error: "NO_PDF_TEMPLATE",
      });
    }
    
    const stream = await LetterTemplateStorageService.getTemplateStream(
      template.pdf_template_key
    );
    
    res.setHeader("Content-Type", template.mime_type || "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${template.original_filename || "template.pdf"}"`
    );
    
    stream.pipe(res);
  } catch (err) {
    console.error("downloadTemplatePDF error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to download PDF template.",
    });
  }
};


/* ══════════════════════════════════════════════════════════
   LETTER REQUESTS - Employee submits, HR approves/rejects
══════════════════════════════════════════════════════════ */

/**
 * Request a letter (employee action)
 * POST /api/letters/request
 */
exports.requestLetter = async (req, res) => {
  try {
    await ensureLetterSchema();
    const { template_uuid } = req.body || {};
    const employee_uuid = req.user?.employee_uuid;

    if (!template_uuid || !employee_uuid) {
      return sendError(res, {
        status: 400,
        message: "template_uuid is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Load template with PDF info
    const [templates] = await pool.execute(
      "SELECT uuid, title, type, body_template, text_content, pdf_template_key FROM LetterTemplates WHERE uuid = ?",
      [template_uuid]
    );
    if (!templates.length) {
      return sendError(res, { status: 404, message: "Template not found." });
    }
    const template = templates[0];

    // Load employee with position and department names
    const [employees] = await pool.execute(
      `SELECT e.uuid, e.first_name, e.middle_name, e.last_name, e.mesob_id, e.hire_date,
              p.title AS position_title, d.name AS department_name,
              ea.email, ea.phone_primary AS phone
       FROM Employees e
       LEFT JOIN Positions p ON p.uuid = e.position_uuid
       LEFT JOIN Departments d ON d.uuid = p.department_uuid
       LEFT JOIN EmployeeAddresses ea ON ea.employee_uuid = e.uuid AND ea.address_type = 'CURRENT'
       WHERE e.uuid = ?`,
      [employee_uuid]
    );
    if (!employees.length) {
      return sendError(res, { status: 404, message: "Employee not found." });
    }
    const employee = employees[0];

    let generatedContent = '';
    let pdfBuffer = null;

    // Handle PDF template
    if (template.pdf_template_key) {
      try {
        // Get PDF template from storage
        const pdfStream = await LetterTemplateStorageService.getTemplateStream(template.pdf_template_key);
        const chunks = [];
        for await (const chunk of pdfStream) {
          chunks.push(chunk);
        }
        const templatePdfBuffer = Buffer.concat(chunks);

        // Generate PDF with employee data filled in
        const textContent = template.text_content || template.body_template || '';
        pdfBuffer = await PDFService.createFilledPDF(templatePdfBuffer, textContent, employee);
        
        // Store generated content as text for preview
        generatedContent = PDFService.replacePlaceholders(textContent, employee);
      } catch (error) {
        console.error('Error generating PDF:', error);
        return sendError(res, {
          status: 500,
          message: "Failed to generate PDF letter.",
        });
      }
    } else {
      // Handle text-only template (backward compatibility)
      const textContent = template.body_template || '';
      generatedContent = PDFService.replacePlaceholders(textContent, employee);
    }

    const requestId = uuidv4();

    // Store the request with generated PDF if available
    let pdfKey = null;
    if (pdfBuffer) {
      // Store generated PDF
      pdfKey = `letter-requests/${requestId}/generated.pdf`;
      await LetterTemplateStorageService.uploadTemplate({
        objectKey: pdfKey,
        buffer: pdfBuffer,
        mimeType: 'application/pdf',
      });
    }

    await pool.execute(
      `INSERT INTO LetterRequests
         (uuid, employee_uuid, template_uuid, generated_content, body_content, generated_pdf_key, status, letter_type, subject, requested_by_uuid)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?)`,
      [requestId, employee_uuid, template_uuid, generatedContent, generatedContent, pdfKey, template.type || template.title || 'GENERAL', template.title || 'Letter Request', req.user?.uuid || null]
    );

    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "REQUEST_LETTER",
      entityType: "LETTER_REQUEST",
      entityUuid: requestId,
      diff: { template: template.title },
      ipAddress: req.ip,
    });

    // Notify admins — non-blocking, never breaks the main response
    try {
      await notifyLetterSubmitted({
        senderUserUuid: req.user?.uuid,
        senderRole:     req.user?.role,
        employeeFullName: [employee.first_name, employee.middle_name, employee.last_name].filter(Boolean).join(" "),
        departmentName:   employee.department_name || "",
        letterType:       template.type || template.title || "Letter",
        requestUuid:      requestId,
      });
    } catch (notifErr) {
      console.error("[Notification] requestLetter notify failed (non-fatal):", notifErr.message);
    }

    // Generate preview URL for PDF if available
    let previewUrl = null;
    if (pdfKey) {
      previewUrl = await LetterTemplateStorageService.getTemplateUrl(pdfKey, 3600);
    }

    return sendSuccess(res, {
      status: 201,
      message: "Letter request submitted.",
      data: {
        uuid: requestId,
        template_name: template.title,
        template_type: template.type,
        generated_content: generatedContent,
        preview_url: previewUrl,
        has_pdf: !!pdfKey,
        status: "PENDING",
        requested_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("requestLetter error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to submit letter request.",
    });
  }
};

/**
 * Get employee's own letter requests
 * GET /api/letters/requests/my
 */
exports.getMyLetterRequests = async (req, res) => {
  try {
    const employee_uuid = req.user?.employee_uuid;
    if (!employee_uuid) {
      return sendError(res, { status: 401, message: "Not authenticated." });
    }

    const pool = db.promise();
    const [rows] = await pool.execute(
      `SELECT lr.uuid, lr.template_uuid, lr.employee_uuid,
              lr.body_content, lr.status, lr.requested_at,
              lr.reviewed_at, lr.rejection_reason,
              lt.template_name, lt.type AS template_type,
              CONCAT(u.username) AS reviewed_by_name
       FROM LetterRequests lr
       LEFT JOIN LetterTemplates lt ON lt.uuid = lr.template_uuid
       LEFT JOIN Users u ON u.employee_uuid = lr.reviewed_by
       WHERE lr.employee_uuid = ?
       ORDER BY lr.requested_at DESC`,
      [employee_uuid]
    );

    return sendSuccess(res, { status: 200, data: rows });
  } catch (err) {
    console.error("getMyLetterRequests error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load your letter requests.",
    });
  }
};

/**
 * Get all pending letter requests (HR view)
 * GET /api/letters/requests/pending
 */
exports.getPendingLetterRequests = async (req, res) => {
  try {
    const pool = db.promise();
    const [rows] = await pool.execute(
      `SELECT lr.uuid, lr.template_uuid, lr.employee_uuid, lr.ref_no,
              lr.body_content, lr.status, lr.requested_at,
              lt.template_name, lt.type AS template_type,
              e.mesob_id, e.first_name, e.middle_name, e.last_name,
              CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name) AS employee_name
       FROM LetterRequests lr
       LEFT JOIN LetterTemplates lt ON lt.uuid = lr.template_uuid
       LEFT JOIN Employees e ON e.uuid = lr.employee_uuid
       WHERE lr.status = 'PENDING'
       ORDER BY lr.requested_at ASC`
    );

    return sendSuccess(res, { status: 200, data: rows });
  } catch (err) {
    console.error("getPendingLetterRequests error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load pending letter requests.",
    });
  }
};

/**
 * Get all letter requests (HR view - all statuses)
 * GET /api/letters/requests/all
 */
exports.getAllLetterRequests = async (req, res) => {
  try {
    const pool = db.promise();
    const [rows] = await pool.execute(
      `SELECT lr.uuid, lr.template_uuid, lr.employee_uuid,
              lr.body_content, lr.status, lr.requested_at,
              lr.reviewed_at, lr.rejection_reason,
              lt.template_name, lt.type AS template_type,
              e.mesob_id, e.first_name, e.middle_name, e.last_name,
              CONCAT(e.first_name, ' ', COALESCE(e.middle_name, ''), ' ', e.last_name) AS employee_name,
              CONCAT(u.username) AS reviewed_by_name
       FROM LetterRequests lr
       LEFT JOIN LetterTemplates lt ON lt.uuid = lr.template_uuid
       LEFT JOIN Employees e ON e.uuid = lr.employee_uuid
       LEFT JOIN Users u ON u.employee_uuid = lr.reviewed_by
       ORDER BY lr.requested_at DESC`
    );

    return sendSuccess(res, { status: 200, data: rows });
  } catch (err) {
    console.error("getAllLetterRequests error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load letter requests.",
    });
  }
};

/**
 * Approve a letter request (HR action)
 * POST /api/letters/requests/:uuid/approve
 */
exports.approveLetterRequest = async (req, res) => {
  try {
    await ensureLetterSchema();
    const { uuid } = req.params;
    const reviewer_uuid = req.user?.employee_uuid;

    const pool = db.promise();

    // Get the request
    const [requests] = await pool.execute(
      `SELECT lr.*, e.uuid AS employee_uuid
       FROM LetterRequests lr
       LEFT JOIN Employees e ON e.uuid = lr.employee_uuid
       WHERE lr.uuid = ?`,
      [uuid]
    );

    if (!requests.length) {
      return sendError(res, { status: 404, message: "Letter request not found." });
    }

    const request = requests[0];

    if (request.status !== "PENDING") {
      return sendError(res, {
        status: 400,
        message: "This request has already been reviewed.",
      });
    }

    // Create the issued letter
    const issuedId = uuidv4();
    const [templates] = await pool.execute(
      "SELECT title, type FROM LetterTemplates WHERE uuid = ?",
      [request.template_uuid]
    );

    const contentVal = request.generated_content || request.body_content || "";
    const letterNumber = `LTR-${Date.now().toString().slice(-6)}`;
    await pool.execute(
      `INSERT INTO IssuedLetters
         (uuid, employee_uuid, template_uuid, issued_by, issued_by_uuid, name, type, generated_content, content_html, letter_number, issued_date, file_key, file_size)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, 0)`,
      [
        issuedId,
        request.employee_uuid,
        request.template_uuid,
        reviewer_uuid,
        reviewer_uuid,
        templates[0]?.title || "Letter",
        templates[0]?.type || "—",
        contentVal,
        contentVal,
        letterNumber,
        request.generated_pdf_key || "generated",
      ]
    );

    // Update request status
    await pool.execute(
      `UPDATE LetterRequests
       SET status = 'APPROVED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
       WHERE uuid = ?`,
      [reviewer_uuid, uuid]
    );

    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "APPROVE_LETTER_REQUEST",
      entityType: "LETTER_REQUEST",
      entityUuid: uuid,
      diff: { issued_letter_uuid: issuedId },
      ipAddress: req.ip,
    });

    // Notify the requester — non-blocking, never breaks the main response
    try {
      const requesterUserUuid = await getUserByEmployeeUuid(request.employee_uuid);
      await notifyLetterApproved({
        senderUserUuid:     req.user?.uuid,
        senderRole:         req.user?.role,
        recipientUserUuid:  requesterUserUuid,
        letterType:         templates[0]?.type || templates[0]?.title || "Letter",
        requestUuid:        uuid,
      });
    } catch (notifErr) {
      console.error("[Notification] approveLetterRequest notify failed (non-fatal):", notifErr.message);
    }

    return sendSuccess(res, {
      status: 200,
      message: "Letter request approved and letter issued.",
      data: { issued_letter_uuid: issuedId },
    });
  } catch (err) {
    console.error("approveLetterRequest error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to approve letter request.",
    });
  }
};

/**
 * Reject a letter request (HR action)
 * POST /api/letters/requests/:uuid/reject
 */
exports.rejectLetterRequest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reason } = req.body || {};
    const reviewer_uuid = req.user?.employee_uuid;

    const pool = db.promise();

    // Get the request — include employee_uuid for notification
    const [requests] = await pool.execute(
      "SELECT uuid, status, employee_uuid, template_uuid FROM LetterRequests WHERE uuid = ?",
      [uuid]
    );

    if (!requests.length) {
      return sendError(res, { status: 404, message: "Letter request not found." });
    }

    if (requests[0].status !== "PENDING") {
      return sendError(res, {
        status: 400,
        message: "This request has already been reviewed.",
      });
    }

    await pool.execute(
      `UPDATE LetterRequests
       SET status = 'REJECTED', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = ?
       WHERE uuid = ?`,
      [reviewer_uuid, reason || null, uuid]
    );

    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "REJECT_LETTER_REQUEST",
      entityType: "LETTER_REQUEST",
      entityUuid: uuid,
      diff: { reason },
      ipAddress: req.ip,
    });

    // Notify the requester — non-blocking, never breaks the main response
    try {
      const [tmplRows] = await pool.execute(
        "SELECT type, title FROM LetterTemplates WHERE uuid = ?",
        [requests[0].template_uuid]
      );
      const requesterUserUuid = await getUserByEmployeeUuid(requests[0].employee_uuid);
      await notifyLetterRejected({
        senderUserUuid:    req.user?.uuid,
        senderRole:        req.user?.role,
        recipientUserUuid: requesterUserUuid,
        letterType:        tmplRows[0]?.type || tmplRows[0]?.title || "Letter",
        rejectionReason:   reason || null,
        requestUuid:       uuid,
      });
    } catch (notifErr) {
      console.error("[Notification] rejectLetterRequest notify failed (non-fatal):", notifErr.message);
    }

    return sendSuccess(res, {
      status: 200,
      message: "Letter request rejected.",
    });
  } catch (err) {
    console.error("rejectLetterRequest error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to reject letter request.",
    });
  }
};

/**
 * Cancel own letter request (employee action)
 * DELETE /api/letters/requests/:uuid
 */
exports.cancelLetterRequest = async (req, res) => {
  try {
    const { uuid } = req.params;
    const employee_uuid = req.user?.employee_uuid;

    const pool = db.promise();

    const [requests] = await pool.execute(
      "SELECT uuid, employee_uuid, status FROM LetterRequests WHERE uuid = ?",
      [uuid]
    );

    if (!requests.length) {
      return sendError(res, { status: 404, message: "Letter request not found." });
    }

    const request = requests[0];

    // Only owner can cancel, and only if still pending
    if (request.employee_uuid !== employee_uuid) {
      return sendError(res, {
        status: 403,
        message: "You can only cancel your own requests.",
      });
    }

    if (request.status !== "PENDING") {
      return sendError(res, {
        status: 400,
        message: "Only pending requests can be cancelled.",
      });
    }

    await pool.execute("DELETE FROM LetterRequests WHERE uuid = ?", [uuid]);

    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "CANCEL_LETTER_REQUEST",
      entityType: "LETTER_REQUEST",
      entityUuid: uuid,
      diff: null,
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Letter request cancelled.",
    });
  } catch (err) {
    console.error("cancelLetterRequest error:", err);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to cancel letter request.",
    });
  }
};

/**
 * Get available placeholders for letter templates
 * GET /api/letters/placeholders
 */
exports.getPlaceholders = (req, res) => {
  try {
    const placeholders = PDFService.getAvailablePlaceholders();
    return sendSuccess(res, {
      status: 200,
      data: placeholders,
    });
  } catch (err) {
    console.error("getPlaceholders error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to get placeholders.",
    });
  }
};
