/**
 * HTML to PDF Conversion Service
 * 
 * This service converts HTML content to PDF using different strategies:
 * 1. Puppeteer (recommended) - Full Chrome browser for best rendering
 * 2. html-pdf-node - Lighter weight alternative
 * 3. pdf-lib fallback - Basic PDF generation
 */

class HtmlToPdfService {
  constructor() {
    this.strategy = null;
    this.initializeStrategy();
  }

  /**
   * Initialize the PDF generation strategy based on available libraries
   */
  initializeStrategy() {
    // Try to load puppeteer first (best quality)
    try {
      const puppeteer = require('puppeteer');
      this.strategy = 'puppeteer';
      this.puppeteer = puppeteer;
      console.log('Using Puppeteer for PDF generation');
      return;
    } catch (err) {
      console.log('Puppeteer not available, trying html-pdf-node...');
    }

    // Try html-pdf-node as fallback
    try {
      const htmlPdf = require('html-pdf-node');
      this.strategy = 'html-pdf-node';
      this.htmlPdf = htmlPdf;
      console.log('Using html-pdf-node for PDF generation');
      return;
    } catch (err) {
      console.log('html-pdf-node not available, using basic PDF generation');
    }

    // Fallback to basic PDF generation
    this.strategy = 'basic';
    console.log('WARNING: Using basic PDF generation (limited functionality)');
  }

  /**
   * Convert HTML to PDF buffer
   * @param {string} htmlContent - Complete HTML document
   * @param {object} options - PDF generation options
   * @returns {Promise<Buffer>} PDF buffer
   */
  async convertToPdf(htmlContent, options = {}) {
    const defaultOptions = {
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
      preferCSSPageSize: true,
      ...options,
    };

    if (this.strategy === 'puppeteer') {
      try {
        return await this.convertWithPuppeteer(htmlContent, defaultOptions);
      } catch (err) {
        console.warn('[HtmlToPdfService] Puppeteer conversion failed, falling back to basic PDF:', err.message);
        return await this.convertWithBasicPdf(htmlContent, defaultOptions);
      }
    }

    if (this.strategy === 'html-pdf-node') {
      try {
        return await this.convertWithHtmlPdfNode(htmlContent, defaultOptions);
      } catch (err) {
        console.warn('[HtmlToPdfService] html-pdf-node conversion failed, falling back to basic PDF:', err.message);
        return await this.convertWithBasicPdf(htmlContent, defaultOptions);
      }
    }

    return await this.convertWithBasicPdf(htmlContent, defaultOptions);
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  async convertWithPuppeteer(htmlContent, options) {
    let browser = null;
    try {
      console.log('[Puppeteer] Launching browser...');
      browser = await this.puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      console.log('[Puppeteer] Setting HTML content...');
      
      // Set content
      await page.setContent(htmlContent, {
        waitUntil: ['networkidle0', 'domcontentloaded'],
        timeout: 30000,
      });

      console.log('[Puppeteer] Generating PDF...');
      // Generate PDF
      const pdfData = await page.pdf({
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
        preferCSSPageSize: true,
      });

      // Close browser first
      await browser.close();

      // Convert to Buffer if it's a Uint8Array
      let pdfBuffer;
      if (Buffer.isBuffer(pdfData)) {
        pdfBuffer = pdfData;
      } else if (pdfData instanceof Uint8Array) {
        pdfBuffer = Buffer.from(pdfData);
      } else if (ArrayBuffer.isView(pdfData)) {
        pdfBuffer = Buffer.from(pdfData.buffer, pdfData.byteOffset, pdfData.byteLength);
      } else {
        throw new Error(`Unexpected PDF data type: ${pdfData.constructor.name}`);
      }

      console.log(`[Puppeteer] PDF generated successfully: ${pdfBuffer.length} bytes`);
      
      return pdfBuffer;
    } catch (error) {
      if (browser) {
        try {
          await browser.close();
        } catch (closeError) {
          console.error('[Puppeteer] Error closing browser:', closeError.message);
        }
      }
      console.error('[Puppeteer] PDF generation error:', error);
      throw new Error('Failed to generate PDF with Puppeteer: ' + error.message);
    }
  }

  /**
   * Convert HTML to PDF using html-pdf-node
   */
  async convertWithHtmlPdfNode(htmlContent, options) {
    try {
      const file = { content: htmlContent };
      const pdfOptions = {
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        margin: options.margin || {
          top: '0',
          right: '0',
          bottom: '0',
          left: '0',
        },
      };

      const pdfBuffer = await this.htmlPdf.generatePdf(file, pdfOptions);
      return pdfBuffer;
    } catch (error) {
      console.error('html-pdf-node PDF generation error:', error);
      throw new Error('Failed to generate PDF with html-pdf-node: ' + error.message);
    }
  }

  /**
   * Basic PDF generation fallback (limited functionality)
   * Uses pdf-lib to create a simple PDF with text
   */
  async convertWithBasicPdf(htmlContent, options) {
    try {
      const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');
      
      // Strip HTML tags for basic text extraction
      const textContent = htmlContent
        .replace(/<style[^>]*>.*?<\/style>/gis, '')
        .replace(/<script[^>]*>.*?<\/script>/gis, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontSize = 11;
      const lineHeight = fontSize + 4;
      
      const { width, height } = page.getSize();
      const margin = 50;
      const maxWidth = width - (margin * 2);
      
      // Split text into lines
      const sanitizedText = textContent.replace(/[^\x00-\x7F]/g, ' ');
      const lines = this.wrapText(sanitizedText, font, fontSize, maxWidth);
      
      let y = height - margin;
      for (const line of lines) {
        if (y < margin) break;
        
        page.drawText(line, {
          x: margin,
          y: y,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
        });
        
        y -= lineHeight;
      }

      const pdfBytes = await pdfDoc.save();
      return Buffer.from(pdfBytes);
    } catch (error) {
      console.error('Basic PDF generation error:', error);
      throw new Error('Failed to generate PDF with basic method: ' + error.message);
    }
  }

  /**
   * Wrap text to fit within specified width
   */
  wrapText(text, font, fontSize, maxWidth) {
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
   * Get current strategy being used
   */
  getStrategy() {
    return this.strategy;
  }

  /**
   * Check if advanced PDF features are available
   */
  hasAdvancedFeatures() {
    return this.strategy === 'puppeteer' || this.strategy === 'html-pdf-node';
  }
}

// Export singleton instance
module.exports = new HtmlToPdfService();
