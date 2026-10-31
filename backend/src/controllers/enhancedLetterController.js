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
      "SELECT uuid FROM LetterLayoutConfig WHERE is_active = TRUE LIMIT 1"
    );
    const layoutUuid = layouts.length ? layouts[0].uuid : null;

    // Build metadata JSON for fields that don't have dedicated columns
    const metadata = {
      description: description || null,
      recipient_info: recipient_info || null,
      closing_text: closing_text || null,
      cc_recipients: cc_recipients || null,
      category: category || "GENERAL",
    };

    await pool.execute(
      `INSERT INTO LetterTemplates (
        uuid, template_code, template_name, letter_type, 
        subject_template, body_template, footer_template,
        layout_config_uuid, is_active, required_fields_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [
        templateId,
        `TPL_${Date.now().toString().slice(-6)}`,
        title.trim(),
        category || "GENERAL",
        subject || title.trim(),
        main_body,
        closing_text || null,
        layoutUuid,
        JSON.stringify(metadata),
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
        uuid, template_code, template_name, letter_type,
        subject_template, body_template, footer_template,
        layout_config_uuid, is_active, required_fields_json, created_at
      FROM LetterTemplates WHERE uuid = ?`,
      [templateId]
    );

    // Parse metadata back for response
    const template = created[0];
    const meta = template.required_fields_json ? JSON.parse(template.required_fields_json) : {};

    return sendSuccess(res, {
      status: 201,
      message: "Letter template created successfully.",
      data: {
        uuid: template.uuid,
        template_code: template.template_code,
        title: template.template_name,
        category: meta.category || template.letter_type,
        description: meta.description,
        subject: template.subject_template,
        main_body: template.body_template,
        closing_text: template.footer_template,
        recipient_info: meta.recipient_info,
        cc_recipients: meta.cc_recipients,
        is_active: template.is_active,
        created_at: template.created_at,
      },
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
      "SELECT uuid, required_fields_json FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Template not found.",
      });
    }

    // Get existing metadata
    const existingMeta = existing[0].required_fields_json 
      ? JSON.parse(existing[0].required_fields_json) 
      : {};

    // Build update query dynamically
    const updates = [];
    const values = [];
    
    // Update metadata fields
    const newMeta = { ...existingMeta };
    if (description !== undefined) newMeta.description = description;
    if (recipient_info !== undefined) newMeta.recipient_info = recipient_info;
    if (cc_recipients !== undefined) newMeta.cc_recipients = cc_recipients;
    if (category !== undefined) newMeta.category = category;

    if (title !== undefined) {
      updates.push("template_name = ?");
      values.push(title.trim());
    }
    if (category !== undefined) {
      updates.push("letter_type = ?");
      values.push(category);
    }
    if (subject !== undefined) {
      updates.push("subject_template = ?");
      values.push(subject);
    }
    if (main_body !== undefined) {
      updates.push("body_template = ?");
      values.push(main_body);
    }
    if (closing_text !== undefined) {
      updates.push("footer_template = ?");
      values.push(closing_text);
    }
    if (is_active !== undefined) {
      updates.push("is_active = ?");
      values.push(is_active ? 1 : 0);
    }

    // Always update metadata if any meta fields changed
    if (Object.keys(newMeta).length > 0) {
      updates.push("required_fields_json = ?");
      values.push(JSON.stringify(newMeta));
    }

    values.push(uuid);

    if (updates.length > 0) {
      await pool.execute(
        `UPDATE LetterTemplates SET ${updates.join(", ")} WHERE uuid = ?`,
        values
      );
    }

    // Return updated template
    const [updated] = await pool.execute(
      `SELECT 
        uuid, template_code, template_name, letter_type,
        subject_template, body_template, footer_template,
        layout_config_uuid, is_active, required_fields_json, updated_at
      FROM LetterTemplates WHERE uuid = ?`,
      [uuid]
    );

    const template = updated[0];
    const meta = template.required_fields_json ? JSON.parse(template.required_fields_json) : {};

    return sendSuccess(res, {
      status: 200,
      message: "Template updated successfully.",
      data: {
        uuid: template.uuid,
        template_code: template.template_code,
        title: template.template_name,
        category: meta.category || template.letter_type,
        description: meta.description,
        subject: template.subject_template,
        main_body: template.body_template,
        closing_text: template.footer_template,
        recipient_info: meta.recipient_info,
        cc_recipients: meta.cc_recipients,
        is_active: template.is_active,
        updated_at: template.updated_at,
      },
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
        lt.uuid, lt.template_name, lt.letter_type,
        lt.subject_template, lt.body_template,
        lt.footer_template, lt.required_fields_json
      FROM LetterTemplates lt
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

    const templateRow = templates[0];
    const metadata = templateRow.required_fields_json ? JSON.parse(templateRow.required_fields_json) : {};
    
    // Map to expected format
    const template = {
      uuid: templateRow.uuid,
      title: templateRow.template_name,
      type: templateRow.letter_type,
      category: metadata.category || templateRow.letter_type,
      recipient_info: metadata.recipient_info || '',
      subject: templateRow.subject_template || '',
      main_body: templateRow.body_template || '',
      closing_text: templateRow.footer_template || '',
      cc_recipients: metadata.cc_recipients || '',
    };
    
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
      `SELECT 
        uuid, template_code, template_name as title, letter_type as category,
        subject_template as subject, body_template as main_body, 
        footer_template as closing_text, layout_config_uuid,
        is_active, required_fields_json, created_at, updated_at
      FROM LetterTemplates 
      WHERE letter_type = ? AND is_active = 1
      ORDER BY created_at DESC`,
      [category]
    );

    // Parse metadata for each template
    const data = templates.map(t => {
      const meta = t.required_fields_json ? JSON.parse(t.required_fields_json) : {};
      return {
        uuid: t.uuid,
        template_code: t.template_code,
        title: t.title,
        category: t.category,
        description: meta.description,
        subject: t.subject,
        main_body: t.main_body,
        closing_text: t.closing_text,
        recipient_info: meta.recipient_info,
        cc_recipients: meta.cc_recipients,
        is_active: t.is_active,
        created_at: t.created_at,
        updated_at: t.updated_at,
      };
    });

    return sendSuccess(res, {
      status: 200,
      data,
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

    // Check if template exists
    const [templates] = await pool.execute(
      "SELECT uuid, template_name, created_at, updated_at FROM LetterTemplates WHERE uuid = ?",
      [uuid]
    );

    if (!templates.length) {
      return sendError(res, {
        status: 404,
        message: "Template not found.",
      });
    }

    // For now, return a single version entry (the current version)
    // In the future, you can implement a LetterTemplateVersions table
    const template = templates[0];
    const versions = [{
      id: 1,
      version: 1,
      title: template.template_name,
      change_description: "Template created",
      created_at: template.created_at,
      updated_at: template.updated_at,
    }];

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

