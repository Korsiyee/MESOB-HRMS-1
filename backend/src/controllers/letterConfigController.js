const { db } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");
const LetterTemplateStorageService = require("../services/letterTemplateStorageService");
const LetterGenerationService = require("../services/letterGenerationService");

/* ─── Organization Configuration ─────────────────────────────── */

/**
 * Get organization configuration
 * GET /api/letters/config/organization
 */
exports.getOrganizationConfig = async (req, res) => {
  try {
    const pool = db.promise();
    const [rows] = await pool.execute(
      "SELECT * FROM OrganizationConfig ORDER BY id DESC LIMIT 1"
    );

    if (!rows.length) {
      return sendError(res, {
        status: 404,
        message: "Organization configuration not found.",
      });
    }

    return sendSuccess(res, { status: 200, data: rows[0] });
  } catch (err) {
    console.error("getOrganizationConfig error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load organization configuration.",
    });
  }
};

/**
 * Update organization configuration
 * PUT /api/letters/config/organization
 */
exports.updateOrganizationConfig = async (req, res) => {
  try {
    const {
      organization_name_en,
      organization_name_am,
      address_line1_en,
      address_line1_am,
      address_line2_en,
      address_line2_am,
      city_en,
      city_am,
      country_en,
      country_am,
      phone,
      email,
      website,
      additional_info,
    } = req.body || {};

    const pool = db.promise();

    // Check if config exists
    const [existing] = await pool.execute(
      "SELECT id FROM OrganizationConfig LIMIT 1"
    );

    if (existing.length) {
      // Update existing
      await pool.execute(
        `UPDATE OrganizationConfig 
         SET organization_name_en = ?,
             organization_name_am = ?,
             address_line1_en = ?,
             address_line1_am = ?,
             address_line2_en = ?,
             address_line2_am = ?,
             city_en = ?,
             city_am = ?,
             country_en = ?,
             country_am = ?,
             phone = ?,
             email = ?,
             website = ?,
             additional_info = ?
         WHERE id = ?`,
        [
          organization_name_en,
          organization_name_am,
          address_line1_en,
          address_line1_am,
          address_line2_en,
          address_line2_am,
          city_en,
          city_am,
          country_en,
          country_am,
          phone,
          email,
          website,
          additional_info ? JSON.stringify(additional_info) : null,
          existing[0].id,
        ]
      );
    } else {
      // Insert new
      await pool.execute(
        `INSERT INTO OrganizationConfig (
          organization_name_en, organization_name_am,
          address_line1_en, address_line1_am,
          address_line2_en, address_line2_am,
          city_en, city_am,
          country_en, country_am,
          phone, email, website, additional_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          organization_name_en,
          organization_name_am,
          address_line1_en,
          address_line1_am,
          address_line2_en,
          address_line2_am,
          city_en,
          city_am,
          country_en || "Ethiopia",
          country_am || "ኢትዮጵያ",
          phone,
          email,
          website,
          additional_info ? JSON.stringify(additional_info) : null,
        ]
      );
    }

    // Return updated config
    const [updated] = await pool.execute(
      "SELECT * FROM OrganizationConfig ORDER BY id DESC LIMIT 1"
    );

    return sendSuccess(res, {
      status: 200,
      message: "Organization configuration updated.",
      data: updated[0],
    });
  } catch (err) {
    console.error("updateOrganizationConfig error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to update organization configuration.",
    });
  }
};

/**
 * Upload organization logo
 * POST /api/letters/config/organization/logo
 */
exports.uploadOrganizationLogo = async (req, res) => {
  try {
    const file = req.file;

    if (!file) {
      return sendError(res, {
        status: 400,
        message: "Logo file is required.",
      });
    }

    // Validate file type
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.mimetype)) {
      return sendError(res, {
        status: 400,
        message: "Only PNG and JPEG images are allowed for logo.",
      });
    }

    const pool = db.promise();

    // Get current config to delete old logo if exists
    const [existing] = await pool.execute(
      "SELECT id, logo_key FROM OrganizationConfig LIMIT 1"
    );

    // Delete old logo if exists
    if (existing.length && existing[0].logo_key) {
      try {
        await LetterTemplateStorageService.deleteTemplate(existing[0].logo_key);
      } catch (error) {
        console.warn("Failed to delete old logo:", error);
      }
    }

    // Upload new logo
    const objectKey = `organization/logo/${Date.now()}_${file.originalname}`;
    await LetterTemplateStorageService.uploadTemplate({
      objectKey,
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    // Update config with new logo key
    if (existing.length) {
      await pool.execute(
        "UPDATE OrganizationConfig SET logo_key = ? WHERE id = ?",
        [objectKey, existing[0].id]
      );
    } else {
      await pool.execute(
        "INSERT INTO OrganizationConfig (logo_key) VALUES (?)",
        [objectKey]
      );
    }

    // Generate logo URL
    const logoUrl = await LetterTemplateStorageService.getTemplateUrl(
      objectKey,
      86400 // 24 hours
    );

    return sendSuccess(res, {
      status: 200,
      message: "Organization logo uploaded.",
      data: {
        logo_key: objectKey,
        logo_url: logoUrl,
      },
    });
  } catch (err) {
    console.error("uploadOrganizationLogo error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to upload organization logo.",
    });
  }
};

/* ─── Letter Layout Configuration ─────────────────────────────── */

/**
 * Get all letter layouts
 * GET /api/letters/config/layouts
 */
exports.getLetterLayouts = async (req, res) => {
  try {
    const pool = db.promise();
    const [rows] = await pool.execute(
      `SELECT id, layout_name, description, page_margins, font_family, 
              font_size, line_height, is_active, created_at, updated_at
       FROM LetterLayoutConfig
       ORDER BY is_active DESC, created_at DESC`
    );

    return sendSuccess(res, { status: 200, data: rows });
  } catch (err) {
    console.error("getLetterLayouts error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load letter layouts.",
    });
  }
};

/**
 * Get active letter layout
 * GET /api/letters/config/layouts/active
 */
exports.getActiveLetterLayout = async (req, res) => {
  try {
    const pool = db.promise();
    const [rows] = await pool.execute(
      `SELECT * FROM LetterLayoutConfig 
       WHERE is_active = TRUE
       ORDER BY id DESC
       LIMIT 1`
    );

    if (!rows.length) {
      return sendError(res, {
        status: 404,
        message: "No active letter layout found.",
      });
    }

    return sendSuccess(res, { status: 200, data: rows[0] });
  } catch (err) {
    console.error("getActiveLetterLayout error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load active letter layout.",
    });
  }
};

/**
 * Activate a letter layout
 * POST /api/letters/config/layouts/:id/activate
 */
exports.activateLetterLayout = async (req, res) => {
  try {
    const { id } = req.params;
    const pool = db.promise();

    // Check if layout exists
    const [existing] = await pool.execute(
      "SELECT id FROM LetterLayoutConfig WHERE id = ?",
      [id]
    );

    if (!existing.length) {
      return sendError(res, {
        status: 404,
        message: "Letter layout not found.",
      });
    }

    // Deactivate all layouts
    await pool.execute("UPDATE LetterLayoutConfig SET is_active = FALSE");

    // Activate selected layout
    await pool.execute(
      "UPDATE LetterLayoutConfig SET is_active = TRUE WHERE id = ?",
      [id]
    );

    return sendSuccess(res, {
      status: 200,
      message: "Letter layout activated.",
    });
  } catch (err) {
    console.error("activateLetterLayout error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to activate letter layout.",
    });
  }
};

/* ─── Letter Placeholders ─────────────────────────────────────── */

/**
 * Get all available placeholders
 * GET /api/letters/placeholders
 */
exports.getAvailablePlaceholders = async (req, res) => {
  try {
    const placeholders = await LetterGenerationService.getAvailablePlaceholders();
    
    return sendSuccess(res, { status: 200, data: placeholders });
  } catch (err) {
    console.error("getAvailablePlaceholders error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load placeholders.",
    });
  }
};

/**
 * Get letter categories
 * GET /api/letters/categories
 */
exports.getLetterCategories = async (req, res) => {
  try {
    const categories = [
      { value: "EMPLOYMENT", label: "Employment Letter", label_am: "የቅጥር ደብዳቤ" },
      { value: "PROMOTION", label: "Promotion Letter", label_am: "የማስረከቢያ ደብዳቤ" },
      { value: "TRANSFER", label: "Transfer Letter", label_am: "የዝውውር ደብዳቤ" },
      { value: "WARNING", label: "Warning Letter", label_am: "የማስጠንቀቂያ ደብዳቤ" },
      { value: "EXPERIENCE", label: "Experience Certificate", label_am: "የልምድ ማረጋገጫ" },
      { value: "LEAVE_APPROVAL", label: "Leave Approval", label_am: "የእረፍት ፈቃድ" },
      { value: "TERMINATION", label: "Termination Letter", label_am: "የስራ ማቋረጫ ደብዳቤ" },
      { value: "SALARY_VERIFICATION", label: "Salary Verification", label_am: "የደመወዝ ማረጋገጫ" },
      { value: "TAX_VERIFICATION", label: "Tax Verification", label_am: "የግብር ማረጋገጫ" },
      { value: "GENERAL", label: "General Letter", label_am: "አጠቃላይ ደብዳቤ" },
    ];

    return sendSuccess(res, { status: 200, data: categories });
  } catch (err) {
    console.error("getLetterCategories error:", err);
    return sendError(res, {
      status: 500,
      message: "Failed to load letter categories.",
    });
  }
};

module.exports = exports;
