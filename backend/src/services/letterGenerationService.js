const { db } = require("../config/db");
const PDFService = require("./pdfService");
const { headerImage, footerImage } = require("../config/pdfAssets");

class LetterGenerationService {
  /**
   * Generate a complete letter by combining master layout + template body + employee data
   */
  static async generateLetter({ templateUuid, employeeUuid, customData = {}, manualRefNo = null }) {
    const pool = db.promise();

    // 1. Load the template (new format only)
    const [templates] = await pool.execute(
      `SELECT 
        lt.uuid, lt.title, lt.type, lt.category,
        lt.recipient_info, lt.subject, lt.main_body,
        lt.closing_text, lt.cc_recipients,
        lt.layout_config_id, lt.pdf_template_key,
        llc.header_template, llc.footer_template,
        llc.page_margins, llc.font_family, llc.font_size, llc.additional_styles
      FROM LetterTemplates lt
      LEFT JOIN LetterLayoutConfig llc ON llc.id = lt.layout_config_id
      WHERE lt.uuid = ? AND lt.is_active = TRUE`,
      [templateUuid]
    );

    if (!templates.length) {
      throw new Error("Template not found or inactive");
    }

    const template = templates[0];

    // 2. Load employee data with related info
    console.log(`[LetterGen] Loading employee: ${employeeUuid}`);
    const [employees] = await pool.execute(
      `SELECT 
        e.uuid, e.mesob_id, e.title,
        e.first_name, e.middle_name, e.last_name,
        e.gender, e.hire_date, e.status,
        p.title AS position_title,
        d.name AS department_name,
        ea.email, ea.phone_primary
      FROM Employees e
      LEFT JOIN Positions p ON p.uuid = e.position_uuid
      LEFT JOIN Departments d ON d.uuid = e.department_uuid
      LEFT JOIN EmployeeAddresses ea ON ea.employee_uuid = e.uuid AND ea.address_type = 'CURRENT'
      WHERE e.uuid = ?`,
      [employeeUuid]
    );

    if (!employees.length) {
      console.error(`[LetterGen] Employee not found: ${employeeUuid}`);
      throw new Error("Employee not found or inactive");
    }

    const employee = employees[0];
    
    // Check if employee is active
    if (employee.status !== 'ACTIVE') {
      console.error(`[LetterGen] Employee ${employeeUuid} has status: ${employee.status}`);
      throw new Error(`Employee not found or inactive (status: ${employee.status})`);
    }
    
    console.log(`[LetterGen] Employee loaded: ${employee.first_name} ${employee.last_name} (${employee.mesob_id})`);

    // 3. Load organization config
    const [orgConfigs] = await pool.execute(
      "SELECT * FROM OrganizationConfig ORDER BY id DESC LIMIT 1"
    );

    const orgConfig = orgConfigs[0] || {};

    // 4. Use manual reference number if provided, otherwise generate
    const refNo = manualRefNo || await this.generateReferenceNumber(template.category);

    // 5. Prepare data map
    const dataMap = this.buildDataMap({
      employee,
      organization: orgConfig,
      refNo,
      customData,
    });

    // 6. Generate letter content (new format only)
    const letterContent = {
      ref_no: refNo,
      recipient_info: this.replacePlaceholders(template.recipient_info || '', dataMap),
      subject: this.replacePlaceholders(template.subject || '', dataMap),
      main_body: this.replacePlaceholders(template.main_body || '', dataMap),
      closing_text: this.replacePlaceholders(template.closing_text || '', dataMap),
      cc_recipients: this.replacePlaceholders(template.cc_recipients || '', dataMap),
      header: this.replacePlaceholders(template.header_template || '', dataMap),
      footer: this.replacePlaceholders(template.footer_template || '', dataMap),
    };

    // 7. Generate HTML
    const htmlContent = this.buildLetterHTML({
      template,
      content: letterContent,
      dataMap,
    });

    return {
      template,
      employee,
      refNo,
      letterContent,
      htmlContent,
      dataMap,
    };
  }

  /**
   * Generate unique reference number for letter
   */
  static async generateReferenceNumber(letterType = 'GENERAL') {
    const pool = db.promise();
    const currentYear = new Date().getFullYear();

    // Get next sequence number for current year
    const [result] = await pool.execute(
      `SELECT COALESCE(MAX(sequence_number), 0) + 1 AS next_sequence
       FROM LetterReferenceSequence
       WHERE year = ?`,
      [currentYear]
    );

    const sequenceNumber = result[0].next_sequence;
    
    // Format: MESOB/2026/001 or MESOB/EMP/2026/001
    const typePrefix = letterType !== 'GENERAL' ? `${letterType.substring(0, 3)}/` : '';
    const refNo = `MESOB/${typePrefix}${currentYear}/${String(sequenceNumber).padStart(4, '0')}`;

    return refNo;
  }

  /**
   * Save reference number to database
   */
  static async saveReferenceNumber(refNo, letterType, letterUuid) {
    const pool = db.promise();
    const currentYear = new Date().getFullYear();
    const sequenceMatch = refNo.match(/\/(\d{4})$/);
    const sequenceNumber = sequenceMatch ? parseInt(sequenceMatch[1]) : 1;

    try {
      await pool.execute(
        `INSERT INTO LetterReferenceSequence 
         (year, sequence_number, letter_type, generated_ref_no, letter_uuid)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE letter_uuid = VALUES(letter_uuid)`,
        [currentYear, sequenceNumber, letterType, refNo, letterUuid]
      );
    } catch (error) {
      // If still duplicate, it means concurrent requests - that's okay
      console.warn('Reference number already exists, continuing...');
    }
  }

  /**
   * Build comprehensive data map with all available placeholders
   */
  static buildDataMap({ employee, organization, refNo, customData }) {
    const now = new Date();
    
    return {
      // Reference and date
      ref_no: refNo || '',
      date: this.formatDate(now),
      date_am: this.formatDateAmharic(now),
      
      // Employee info
      employee_name: [employee.first_name, employee.middle_name, employee.last_name]
        .filter(Boolean)
        .join(' '),
      employee_name_am: employee.name_am || '',
      employee_title: employee.title || '',
      mesob_id: employee.mesob_id || '',
      position: employee.position_title || '',
      department: employee.department_name || '',
      hire_date: this.formatDate(new Date(employee.hire_date)),
      email: employee.email || '',
      phone: employee.phone_primary || '',
      salary: employee.salary || '',
      
      // Organization info
      organization_name: organization.organization_name_en || 'MESOB Service',
      organization_name_am: organization.organization_name_am || 'የመሶብ አገልግሎት',
      organization_address: [
        organization.address_line1_en,
        organization.address_line2_en,
        organization.city_en,
        organization.country_en,
      ].filter(Boolean).join(', '),
      organization_address_am: [
        organization.address_line1_am,
        organization.address_line2_am,
        organization.city_am,
        organization.country_am,
      ].filter(Boolean).join('፣ '),
      phone: organization.phone || '',
      email: organization.email || '',
      website: organization.website || '',
      
      // Custom fields
      custom_field_1: customData.custom_field_1 || '',
      custom_field_2: customData.custom_field_2 || '',
      custom_field_3: customData.custom_field_3 || '',
      
      // Additional custom data
      ...customData,
    };
  }

  /**
   * Replace placeholders in text with actual data
   */
  static replacePlaceholders(text, dataMap) {
    if (!text) return '';

    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return dataMap[key] !== undefined ? dataMap[key] : match;
    });
  }

  /**
   * Build complete HTML letter with master layout matching official MESOB template
   * Official format with structured sections
   */
  static buildLetterHTML({ template, content, dataMap }) {
    const styles = this.getLetterStyles(template);
    
    // Build header: Logo on left, Date + Ref on right (same row)
    const header = `
      <div class="letterhead-row">
        <div class="header-logo-left">
          <img src="${headerImage}" alt="MESOB Header" class="header-logo-image" />
        </div>
        <div class="header-info-right">
          <div class="ref-line">
            <span class="label">ቁጥር/Ref No:</span>
            <span class="value">${dataMap.ref_no || '_____________________'}</span>
          </div>
          <div class="date-line">
            <span class="label">ቀን/Date:</span>
            <span class="value">${dataMap.date || '_____________________'}</span>
          </div>
        </div>
      </div>
    `;

    // Build footer: Contact on left, Logo on right (same row)
    const footer = `
      <div class="footer-row">
        <div class="footer-contact-left">
          <div class="contact-item">+251 111137500</div>
          <div class="contact-item">info@mesobcenter.et</div>
          <div class="contact-item">www.mesobcenter.et</div>
          <div class="contact-item">Imperial, Addis Ababa, Ethiopia</div>
        </div>
        <div class="footer-logo-right">
          <img src="${footerImage}" alt="MESOB Footer" class="footer-logo-image" />
        </div>
      </div>
    `;
    
    // Build letter body with official structured sections
    const letterBody = `
      <!-- RECIPIENT INFORMATION (Top-left under header) -->
      ${content.recipient_info ? `<div class="recipient-info-section">
        ${content.recipient_info}
      </div>` : ''}

      <!-- SUBJECT (Bold, separated) -->
      ${content.subject ? `<div class="subject-section">
        <div class="subject"><strong>ጉዳዩ/Subject:</strong> ${content.subject}</div>
      </div>` : ''}

      <!-- MAIN BODY (Center content area) -->
      <div class="letter-body">
        <div class="content main-body-content">${content.main_body}</div>
      </div>

      <!-- CLOSING TEXT (Bottom-right) -->
      ${content.closing_text ? `<div class="closing-section">
        ${content.closing_text}
      </div>` : ''}

      <!-- COPY RECIPIENTS (CC - LEFT side above footer) -->
      ${content.cc_recipients ? `<div class="cc-section">
        <div class="cc-title"><strong>ግልባጭ / Copy:</strong></div>
        <div class="cc-content">${content.cc_recipients}</div>
      </div>` : ''}
    `;
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${template.title}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  <div class="letter-container">
    <!-- OFFICIAL MESOB HEADER -->
    <div class="letter-header">
      ${header}
    </div>

    ${letterBody}

    <!-- OFFICIAL MESOB FOOTER -->
    <div class="letter-footer">
      ${footer}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Get CSS styles for letter matching official MESOB format
   */
  static getLetterStyles(template) {
    let margins = { top: 50, bottom: 50, left: 70, right: 70 };
    
    if (template.page_margins) {
      if (typeof template.page_margins === 'string') {
        try {
          margins = JSON.parse(template.page_margins);
        } catch (e) {
          console.warn('Failed to parse page_margins, using defaults');
        }
      } else if (typeof template.page_margins === 'object') {
        margins = template.page_margins;
      }
    }
    
    return `
      @page {
        size: A4;
        margin: 0;
      }
      
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: ${template.font_family || "'Nyala', 'Abyssinica SIL', 'Ebrima', Arial, sans-serif"};
        font-size: ${template.font_size || 11.5}pt;
        line-height: 1.6;
        color: #000;
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      .letter-container {
        width: 210mm;
        min-height: 297mm;
        padding: ${margins.top}px ${margins.right}px ${margins.bottom}px ${margins.left}px;
        margin: 0 auto;
        background: white;
        position: relative;
      }
      
      /* Header: Logo left, Date+Ref right (same row) */
      .letter-header {
        margin-bottom: 35px;
      }
      
      .letterhead-row {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 20px;
        margin-bottom: 15px;
      }
      
      .header-logo-left {
        flex: 0 0 auto;
        max-width: 270px;
      }
      
      .header-logo-image {
        width: 100%;
        height: auto;
        display: block;
      }
      
      .header-info-right {
        flex: 0 0 auto;
        text-align: right;
      }
      
      .ref-line, .date-line {
        margin-bottom: 6px;
        display: flex;
        justify-content: flex-end;
        align-items: baseline;
        gap: 10px;
      }
      
      .label {
        font-weight: 600;
        white-space: nowrap;
        color: #333;
        font-size: 10.5pt;
      }
      
      .value {
        border-bottom: 1px solid #000;
        padding: 0 10px 2px 10px;
        min-width: 200px;
        text-align: center;
        font-size: 10.5pt;
      }
      
      /* Subject Section */
      .subject-section {
        margin: 30px 0 25px 0;
      }
      
      .subject {
        margin: 15px 0;
        padding: 6px 0;
        line-height: 1.6;
        font-size: 11pt;
      }
      
      /* Recipient Information Section (Top-left under header) */
      .recipient-info-section {
        margin: 20px 0 30px 0;
        line-height: 1.7;
        font-size: 10.5pt;
      }
      
      .recipient-info-section p {
        margin: 4px 0;
      }
      
      /* Letter Body */
      .letter-body {
        min-height: 350px;
        margin-bottom: 40px;
      }
      
      .salutation {
        margin: 25px 0 20px 0;
        line-height: 1.6;
      }
      
      .content {
        margin: 20px 0;
        text-align: justify;
        line-height: 1.7;
      }
      
      .main-body-content {
        white-space: normal;
      }
      
      .main-body-content p {
        margin-bottom: 15px;
      }
      
      .main-body-content ul, .main-body-content ol {
        margin: 10px 0;
        padding-left: 30px;
      }
      
      .main-body-content li {
        margin: 5px 0;
      }
      
      .main-body-content strong {
        font-weight: 700;
      }
      
      .main-body-content em {
        font-style: italic;
      }
      
      .main-body-content u {
        text-decoration: underline;
      }
      
      .main-body-content hr {
        border: none;
        border-top: 1px solid #333;
        margin: 15px 0;
      }
      
      .closing {
        margin: 30px 0 15px 0;
        line-height: 1.6;
      }
      
      /* Closing Text Section (Bottom-right) */
      .closing-section {
        margin: 35px 0 20px 0;
        text-align: right;
        line-height: 1.7;
      }
      
      .closing-section p {
        margin: 6px 0;
      }
      
      /* Signature Block - Simplified for stamp */
      .signature-block {
        margin-top: 40px;
        margin-bottom: 60px;
      }
      
      .signature-line {
        margin: 8px 0;
        line-height: 1.6;
      }
      
      /* Copy To Section */
      .copy-to-section {
        margin: 35px 0 18px 0;
        padding: 12px 0;
        border-top: 1px solid #ddd;
      }
      
      .copy-to-title {
        font-weight: bold;
        margin-bottom: 8px;
      }
      
      .copy-to-recipient {
        margin: 6px 0;
        padding-left: 18px;
      }
      
      /* CC Section (Left side above footer) */
      .cc-section {
        margin: 30px 0 20px 0;
        text-align: left;
      }
      
      .cc-title {
        font-weight: bold;
        margin-bottom: 10px;
        font-size: 10.5pt;
      }
      
      .cc-content {
        line-height: 1.7;
        font-size: 10pt;
      }
      
      .cc-content p {
        margin: 5px 0;
      }
      
      /* Footer: Contact left, Logo right (same row) */
      .letter-footer {
        margin-top: 50px;
      }
      
      .footer-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 20px;
        padding-top: 20px;
        border-top: 2px solid #333;
      }
      
      .footer-contact-left {
        flex: 1;
      }
      
      .contact-item {
        font-family: 'Poppins', Arial, sans-serif;
        font-size: 10.5pt;
        font-weight: 700;
        line-height: 1.8;
        color: #1A1A1A;
        margin: 5px 0;
      }
      
      .footer-logo-right {
        flex: 0 0 auto;
        max-width: 270px;
      }
      
      .footer-logo-image {
        width: 100%;
        height: auto;
        display: block;
      }
      
      ${template.additional_styles || ''}
    `;
  }

  /**
   * Format date in English format
   */
  static formatDate(date) {
    if (!date) return '';
    
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  /**
   * Format date in Amharic format
   */
  static formatDateAmharic(date) {
    if (!date) return '';
    
    // TODO: Implement Ethiopian calendar conversion
    // For now, return Gregorian date
    return this.formatDate(date);
  }

  /**
   * Get list of all available placeholders
   */
  static async getAvailablePlaceholders() {
    const pool = db.promise();
    
    const [placeholders] = await pool.execute(
      `SELECT placeholder_key, display_name_en, display_name_am, 
              description_en, description_am, category
       FROM LetterPlaceholders
       WHERE is_active = TRUE
       ORDER BY category, placeholder_key`
    );

    return placeholders;
  }
}

module.exports = LetterGenerationService;

