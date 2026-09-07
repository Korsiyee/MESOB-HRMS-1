const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

class PDFService {
  /**
   * Extract text content from PDF (for display purposes)
   * Note: pdf-lib doesn't natively extract text, so we'll store text separately
   */
  static async extractPDFMetadata(pdfBuffer) {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      const pages = pdfDoc.getPages();
      
      return {
        pageCount: pages.length,
        pageSize: {
          width: pages[0].getWidth(),
          height: pages[0].getHeight(),
        },
        title: pdfDoc.getTitle() || '',
        author: pdfDoc.getAuthor() || '',
      };
    } catch (error) {
      console.error('Error extracting PDF metadata:', error);
      throw new Error('Failed to process PDF file');
    }
  }

  /**
   * Replace placeholders in text content with employee data
   */
  static replacePlaceholders(textContent, employeeData) {
    if (!textContent) return '';

    const placeholderMap = {
      employee_name: [
        employeeData.first_name,
        employeeData.middle_name,
        employeeData.last_name
      ].filter(Boolean).join(' '),
      position: employeeData.position_title || employeeData.position || '',
      department: employeeData.department_name || employeeData.department || '',
      hire_date: employeeData.hire_date
        ? new Date(employeeData.hire_date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })
        : '',
      date: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      mesob_id: employeeData.mesob_id || '',
      email: employeeData.email || '',
      phone: employeeData.phone || '',
      salary: employeeData.salary || '',
    };

    return textContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return placeholderMap[key] !== undefined ? placeholderMap[key] : match;
    });
  }

  /**
   * Generate PDF with text overlay on template
   * Takes a PDF template buffer and overlays text content with filled placeholders
   */
  static async generatePDFWithTextOverlay(templatePdfBuffer, textContent, employeeData = null) {
    try {
      // Load the template PDF
      const pdfDoc = await PDFDocument.load(templatePdfBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      
      // Replace placeholders if employee data is provided
      const finalText = employeeData 
        ? this.replacePlaceholders(textContent, employeeData)
        : textContent;

      // Embed font
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const lineHeight = fontSize + 4;

      // Get page dimensions
      const { width, height } = firstPage.getSize();
      
      // Calculate text area (with margins)
      const margin = 70;
      const textX = margin;
      const textY = height - margin - 100; // Start below letterhead area
      const maxWidth = width - (margin * 2);

      // Split text into lines that fit the page width
      const lines = this.wrapText(finalText, font, fontSize, maxWidth);

      // Draw text on the PDF
      let currentY = textY;
      for (const line of lines) {
        if (currentY < margin) break; // Stop if we reach bottom margin
        
        firstPage.drawText(line, {
          x: textX,
          y: currentY,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        currentY -= lineHeight;
      }

      // Return the modified PDF as buffer
      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Error generating PDF with text overlay:', error);
      throw new Error('Failed to generate PDF with text overlay');
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  static wrapText(text, font, fontSize, maxWidth) {
    const lines = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph.trim()) {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = font.widthOfTextAtSize(testLine, fontSize);

        if (testWidth > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }
    }

    return lines;
  }

  /**
   * Create a preview PDF (template without employee data filled in)
   */
  static async createPreviewPDF(templatePdfBuffer, textContent) {
    return this.generatePDFWithTextOverlay(templatePdfBuffer, textContent, null);
  }

  /**
   * Create a filled PDF (template with employee data)
   */
  static async createFilledPDF(templatePdfBuffer, textContent, employeeData) {
    return this.generatePDFWithTextOverlay(templatePdfBuffer, textContent, employeeData);
  }

  /**
   * Validate if file is a valid PDF
   */
  static async validatePDF(buffer) {
    try {
      await PDFDocument.load(buffer);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get list of available placeholders
   */
  static getAvailablePlaceholders() {
    return [
      { key: '{{employee_name}}', description: 'Full name of the employee' },
      { key: '{{position}}', description: 'Job position/title' },
      { key: '{{department}}', description: 'Department name' },
      { key: '{{hire_date}}', description: 'Date employee was hired' },
      { key: '{{date}}', description: 'Current date' },
      { key: '{{mesob_id}}', description: 'Employee Mesob ID' },
      { key: '{{email}}', description: 'Employee email address' },
      { key: '{{phone}}', description: 'Employee phone number' },
      { key: '{{salary}}', description: 'Employee salary' },
    ];
  }
}

module.exports = PDFService;
