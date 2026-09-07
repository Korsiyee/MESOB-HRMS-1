/**
 * Enhanced Letter Controller
 * Uses the new centralized letter template system with master layouts
 */

const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");
const LetterGenerationService = require("../services/letterGenerationService");
const HtmlToPdfService = require("../services/htmlToPdfService");
const LetterTemplateStorageService = require("../services/letterTemplateStorageService");
const { safeLogEvent } = require("../services/auditLogService");

/* ─── Enhanced Template Management ─────────────────────────────── */

/**
 * Create letter template with new structured format
 * POST /api/letters/templates/enhanced
 */
exports.createEnhancedLetterTemplate = async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      recipient_info,
      subject,
      main_body,
      closing_text,
      cc_recipients,
    } = req.body || {};

    // Validation - main_body is required
    if (!title || !main_body) {
      return sendError(res, {
        status: 400,
        message: "title and main_body are required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();
    const templateId = uuidv4();

    // Get active layout
    const [layouts] = await pool.execute(
      "SELECT id FROM LetterLayoutConfig WHERE is_active = TRUE LIMIT 1"
    );
    const layoutId = layouts.length ? layouts[0].id : null;

    await pool.execute(
      `INSERT INTO LetterTemplates (
        uuid, title, category, description, layout_config_id,
        recipient_info, subject, main_body, closing_text, cc_recipients,
        uses_new_format, is_active, created_by, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, TRUE, ?, 1)`,
      [
        templateId,
        title.trim(),
        category || "GENERAL",
        description || null,
        layoutId,
        recipient_info || null,
        subject || null,
        main_body,
        closing_text || null,
        cc_recipients || null,
        req.user?.employee_uuid || null,
      ]
    );

    // Log template creation
    await safeLogEvent({
      actorUuid: req.user?.uuid,
      action: "CREATE_ENHANCED_LETTER_TEMPLATE",
      entityType: "LETTER_TEMPLATE",
      entityUuid: templateId,
      diff: { title, category },
      ipAddress: req.ip,
    });

    const [created] = await pool.execute(
      `SELECT 
        uuid, title, category, description,
        recipient_info, subject, main_body, closing_text, cc_recipients,
        uses_new_format, is_active, version, created_at
      FROM LetterTemplates WHERE uuid = ?`,
      [templateId]
    );

    return sendSuccess(res, {
      status: 201,
      message: "Letter template created successfully.",
      data: created[0],
    });
  } catch (err) {
    console.error("createEnhancedLetterTemplate error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to create letter template.",
    });
  }
};

/**
 * Update enhanced letter template
 * PUT /api/letters/templates/enhanced/:uuid
 */
exports.updateEnhancedLetterTemplate = async (req, res) => {
  try {
    const { uuid } = req.params;
    const {
      title,
      category,
      description,
      recipient_info,
      subject,
      main_body,
      closing_text,
      cc_recipients,
      is_active,
    } = req.body || {};

    const pool = db.promise();

    // Check if template exists
    const [existing] = await pool.execute(
      "SELECT uuid, version FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Template not found.",
      });
    }

    const currentVersion = existing[0].version || 1;

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push("title = ?");
      values.push(title.trim());
    }
    if (category !== undefined) {
      updates.push("category = ?");
      values.push(category);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      values.push(description);
    }
    if (recipient_info !== undefined) {
      updates.push("recipient_info = ?");
      values.push(recipient_info);
    }
    if (subject !== undefined) {
      updates.push("subject = ?");
      values.push(subject);
    }
    if (main_body !== undefined) {
      updates.push("main_body = ?");
      values.push(main_body);
    }
    if (closing_text !== undefined) {
      updates.push("closing_text = ?");
      values.push(closing_text);
    }
    if (cc_recipients !== undefined) {
      updates.push("cc_recipients = ?");
      values.push(cc_recipients);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    // Increment version
    updates.push("version = ?");
    values.push(currentVersion + 1);

    values.push(uuid);

    if (updates.length > 1) {
      await pool.execute(
        `UPDATE LetterTemplates SET ${updates.join(", ")} WHERE uuid = ?`,
        values
      );
    }

    // Return updated template
    const [updated] = await pool.execute(
      `SELECT 
        uuid, title, category, description,
        recipient_info, subject, main_body, closing_text, cc_recipients,
        uses_new_format, is_active, version, updated_at
      FROM LetterTemplates WHERE uuid = ?`,
      [uuid]
    );

    return sendSuccess(res, {
      status: 200,
      message: "Template updated successfully.",
      data: updated[0],
    });
  } catch (err) {
    console.error("updateEnhancedLetterTemplate error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to update template.",
    });
  }
};

/* ─── Enhanced Letter Generation ─────────────────────────────── */

/**
 * Generate and download letter as PDF (does NOT save to database)
 * POST /api/letters/enhanced/generate
 */
exports.generateEnhancedLetter = async (req, res) => {
  try {
    const { template_uuid, employee_uuid, custom_data, ref_no } = req.body || {};

    if (!template_uuid || !employee_uuid) {
      return sendError(res, {
        status: 400,
        message: "template_uuid and employee_uuid are required.",
        error: "VALIDATION_ERROR",
      });
    }

    // Generate letter using new service
    const letterData = await LetterGenerationService.generateLetter({
      templateUuid: template_uuid,
      employeeUuid: employee_uuid,
      customData: custom_data || {},
      manualRefNo: ref_no,
    });

    // Convert HTML to PDF
    const pdfBuffer = await HtmlToPdfService.convertToPdf(letterData.htmlContent);
    
    // Validate buffer
    if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
      throw new Error('PDF generation failed - invalid buffer');
    }

    // Generate safe filename
    const safeName = letterData.dataMap.employee_name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Letter_${safeName}_${Date.now()}.pdf`;

    // Set headers for PDF download (Chrome-compatible)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Send PDF buffer directly
    return res.end(pdfBuffer, 'binary');
  } catch (err) {
    console.error("PDF generation error:", err.message);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to generate letter.",
      error: "PDF_GENERATION_ERROR"
    });
  }
};

/**
 * Preview letter template without employee data (shows placeholders)
 * POST /api/letters/enhanced/preview
 */
exports.previewEnhancedLetter = async (req, res) => {
  try {
    console.log('[Preview] Request body:', JSON.stringify(req.body, null, 2));
    
    const { template_uuid, employee_uuid, custom_data, ref_no, show_placeholders } = req.body || {};

    if (!template_uuid) {
      return sendError(res, {
        status: 400,
        message: "template_uuid is required.",
        error: "VALIDATION_ERROR",
      });
    }

    const pool = db.promise();

    // Load template - only new format columns
    console.log('[Preview] Loading template:', template_uuid);
    
    const [templates] = await pool.execute(
      `SELECT 
        lt.uuid, lt.title, lt.type, lt.category,
        lt.recipient_info, lt.subject, lt.main_body,
        lt.closing_text, lt.cc_recipients,
        llc.header_template, llc.footer_template,
        llc.page_margins, llc.font_family, llc.font_size, llc.additional_styles
      FROM LetterTemplates lt
      LEFT JOIN LetterLayoutConfig llc ON llc.id = lt.layout_config_id
      WHERE lt.uuid = ? AND lt.is_active = TRUE`,
      [template_uuid]
    );
    
    if (!templates.length) {
      console.error('[Preview] Template not found:', template_uuid);
      return sendError(res, {
        status: 404,
        message: "Template not found or inactive",
        error: "TEMPLATE_NOT_FOUND",
      });
    }

    const template = templates[0];
    console.log('[Preview] Template loaded:', template.title);

    // ALWAYS show placeholders for template preview (no employee needed)
    console.log('[Preview] Generating preview with placeholders (no employee data needed)');

    // Load organization config
    const [orgConfigs] = await pool.execute(
      "SELECT * FROM OrganizationConfig ORDER BY id DESC LIMIT 1"
    );
    const orgConfig = orgConfigs[0] || {};

    const refNo = ref_no || 'PREVIEW/{{ref_no}}';
    const currentDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    // Build minimal data map with organization info only
    // Employee fields are shown as placeholders
    const dataMap = {
      // System placeholders
      ref_no: refNo,
      date: currentDate,
      date_am: currentDate,
      
      // Employee placeholders (shown as-is)
      employee_name: '{{employee_name}}',
      employee_name_am: '{{employee_name_am}}',
      employee_title: '{{employee_title}}',
      mesob_id: '{{mesob_id}}',
      position: '{{position}}',
      department: '{{department}}',
      hire_date: '{{hire_date}}',
      email: '{{email}}',
      phone: '{{phone}}',
      salary: '{{salary}}',
      
      // Organization info (use real data if available)
      organization_name: orgConfig.organization_name_en || '{{organization_name}}',
      organization_name_am: orgConfig.organization_name_am || '{{organization_name_am}}',
      organization_address: [
        orgConfig.address_line1_en,
        orgConfig.address_line2_en,
        orgConfig.city_en,
        orgConfig.country_en,
      ].filter(Boolean).join(', ') || '{{organization_address}}',
      organization_address_am: [
        orgConfig.address_line1_am,
        orgConfig.address_line2_am,
        orgConfig.city_am,
        orgConfig.country_am,
      ].filter(Boolean).join('፣ ') || '{{organization_address_am}}',
      
      // Custom fields (shown as placeholders)
      custom_field_1: '{{custom_field_1}}',
      custom_field_2: '{{custom_field_2}}',
      custom_field_3: '{{custom_field_3}}',
    };

    console.log('[Preview] Data map created with placeholders');

    // Generate letter content with new format only
    const letterContent = {
      ref_no: refNo,
      recipient_info: LetterGenerationService.replacePlaceholders(template.recipient_info || '', dataMap),
      subject: LetterGenerationService.replacePlaceholders(template.subject || '', dataMap),
      main_body: LetterGenerationService.replacePlaceholders(template.main_body || '', dataMap),
      closing_text: LetterGenerationService.replacePlaceholders(template.closing_text || '', dataMap),
      cc_recipients: LetterGenerationService.replacePlaceholders(template.cc_recipients || '', dataMap),
    };

    console.log('[Preview] Letter content generated');

    // Build HTML with placeholders
    const htmlContent = LetterGenerationService.buildLetterHTML({
      template,
      content: letterContent,
      dataMap,
    });

    console.log('[Preview] HTML content built, length:', htmlContent.length);

    // Try to generate PDF
    let pdfBase64 = null;
    try {
      const pdfBuffer = await HtmlToPdfService.convertToPdf(htmlContent);
      if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
        pdfBase64 = pdfBuffer.toString("base64");
        console.log('[Preview] PDF generated, size:', pdfBuffer.length);
      }
    } catch (pdfError) {
      console.warn("[Preview] PDF generation failed:", pdfError.message);
    }

    console.log('[Preview] Success - returning placeholder preview');

    return sendSuccess(res, {
      status: 200,
      data: {
        ref_no: refNo,
        template_name: template.title,
        category: template.category,
        employee_name: '{{employee_name}}',
        employee_uuid: null,
        html_content: htmlContent,
        pdf_base64: pdfBase64,
        letter_content: letterContent,
        preview_mode: 'placeholder',
        placeholder_notice: 'This preview shows template structure with placeholders. Real letters will replace placeholders with actual employee data.',
      },
    });
  } catch (err) {
    console.error("[Preview] Error:", err);
    console.error("[Preview] Stack:", err.stack);
    return sendError(res, {
      status: 500,
      message: err.message || "Failed to preview letter.",
      error: "PREVIEW_ERROR",
    });
  }
};

/**
 * Get letter templates by category
 * GET /api/letters/templates/category/:category
 */
exports.getTemplatesByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const pool = db.promise();

    const [templates] = await pool.execute(
      `SELECT * FROM v_active_letter_templates WHERE category = ?`,
      [category]
    );

    return sendSuccess(res, {
      status: 200,
      data: templates,
    });
  } catch (err) {
    console.error("getTemplatesByCategory error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load templates.",
    });
  }
};

/**
 * Get template version history
 * GET /api/letters/templates/:uuid/versions
 */
exports.getTemplateVersionHistory = async (req, res) => {
  try {
    const { uuid } = req.params;
    const pool = db.promise();

    const [versions] = await pool.execute(
      `SELECT 
        v.id, v.version, v.title, v.change_description,
        v.created_at, e.first_name, e.last_name
      FROM LetterTemplateVersions v
      LEFT JOIN Employees e ON e.uuid = v.changed_by
      WHERE v.template_uuid = ?
      ORDER BY v.version DESC`,
      [uuid]
    );

    return sendSuccess(res, {
      status: 200,
      data: versions,
    });
  } catch (err) {
    console.error("getTemplateVersionHistory error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load version history.",
    });
  }
};

module.exports = exports;

