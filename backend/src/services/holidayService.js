const { v4: uuidv4 } = require("uuid");
const { db } = require("../config/db");
const {
  formatDate,
  toEthiopian,
  getCurrentEthiopianBudgetYear,
  isValidDateFormat,
} = require("./calendarService");

let hd = null;

function getHd() {
  if (hd === null) {
    try {
      const Holidays = require("date-holidays");
      hd = new Holidays("ET");
      hd.setLanguages("en");
    } catch (error) {
      console.error("Failed to initialize date-holidays:", error);
      hd = null;
    }
  }
  return hd;
}

function normalizeDate(inputDate) {
  const normalized = formatDate(inputDate);
  if (!normalized || !isValidDateFormat(normalized)) {
    throw new Error("Invalid date format. Expected YYYY-MM-DD.");
  }
  return normalized;
}

function asBoolean(value, defaultValue = true) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === 1 || value === "1") {
    return true;
  }
  if (value === 0 || value === "0") {
    return false;
  }
  return defaultValue;
}

function mapHolidayRow(row) {
  return {
    uuid: row.uuid,
    name: row.holidayName,
    gregorianDate: formatDate(row.holidayDate),
    type: String(row.calendarType || "PUBLIC").toUpperCase(),
    ethiopian_date: row.calendarYear ? `${row.calendarYear}-01-01` : null,
    calendarYear: row.calendarYear,
    is_active: asBoolean(row.isActive, true),
    source: row.source || "MANUAL",
    description: row.description || "",
  };
}

async function convertToEthiopianYear(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const ethDate = await toEthiopian(`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`);
  return String(ethDate.year);
}

class HolidayService {
  static schemaInitPromise = null;

  static async getHolidayByUuid(uuid) {
    await this.ensureHolidaySchema();
    const holidayUuid = String(uuid || "").trim();
    if (!holidayUuid) {
      throw new Error("Holiday uuid is required.");
    }

    const pool = db.promise();
    const [rows] = await pool.execute(
      `
      SELECT uuid, holidayDate, holidayName, calendarYear, calendarType, isActive, source, description
      FROM Holidays
      WHERE uuid = ?
      LIMIT 1
      `,
      [holidayUuid],
    );

    return rows.length ? mapHolidayRow(rows[0]) : null;
  }

  static async ensureHolidaySchema() {
    if (this.schemaInitPromise) {
      await this.schemaInitPromise;
      return;
    }

    this.schemaInitPromise = (async () => {
      const pool = db.promise();
      const [columns] = await pool.execute(
        `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'Holidays'
        `,
      );

      const columnSet = new Set(columns.map((item) => item.COLUMN_NAME));
      const alterStatements = [];

      if (!columnSet.has("isActive")) {
        alterStatements.push(
          "ALTER TABLE Holidays ADD COLUMN isActive BOOLEAN NOT NULL DEFAULT TRUE",
        );
      }
      if (!columnSet.has("source")) {
        alterStatements.push(
          "ALTER TABLE Holidays ADD COLUMN source VARCHAR(30) NOT NULL DEFAULT 'MANUAL'",
        );
      }
      if (!columnSet.has("description")) {
        alterStatements.push(
          "ALTER TABLE Holidays ADD COLUMN description TEXT NULL",
        );
      }

      for (const statement of alterStatements) {
        await pool.execute(statement);
      }
    })();

    await this.schemaInitPromise;
  }

  static async isHoliday(date) {
    try {
      const holiday = await this.getHolidayByDate(date, true);
      return Boolean(holiday);
    } catch (error) {
      console.error("Error checking holiday:", error);
      return false;
    }
  }

  static async getHolidayByDate(date, activeOnly = true) {
    await this.ensureHolidaySchema();
    const dateStr = normalizeDate(date);
    const pool = db.promise();

    const whereStatus = activeOnly ? "AND isActive = 1" : "";
    const [rows] = await pool.execute(
      `
      SELECT uuid, holidayDate, holidayName, calendarYear, calendarType, isActive, source, description
      FROM Holidays
      WHERE holidayDate = ? ${whereStatus}
      LIMIT 1
      `,
      [dateStr],
    );

    if (!rows.length) {
      return null;
    }

    return mapHolidayRow(rows[0]);
  }

  static async getHolidaysInRange(startDate, endDate, activeOnly = true) {
    await this.ensureHolidaySchema();
    const startDateStr = normalizeDate(startDate);
    const endDateStr = normalizeDate(endDate);

    if (endDateStr < startDateStr) {
      throw new Error("endDate must be greater than or equal to startDate.");
    }

    const pool = db.promise();
    const whereStatus = activeOnly ? "AND isActive = 1" : "";

    const [rows] = await pool.execute(
      `
      SELECT uuid, holidayDate, holidayName, calendarYear, calendarType, isActive, source, description
      FROM Holidays
      WHERE holidayDate BETWEEN ? AND ? ${whereStatus}
      ORDER BY holidayDate ASC
      `,
      [startDateStr, endDateStr],
    );

    return rows.map(mapHolidayRow);
  }

  static async getHolidaysByYear(year, activeOnly = true) {
    const gregorianYear = Number(year);
    if (!Number.isInteger(gregorianYear)) {
      throw new Error("Invalid year.");
    }

    const startDate = `${gregorianYear}-01-01`;
    const endDate = `${gregorianYear}-12-31`;
    return this.getHolidaysInRange(startDate, endDate, activeOnly);
  }

  static async addHoliday(payload) {
    await this.ensureHolidaySchema();
    const date = normalizeDate(payload.date);
    const name = String(payload.name || "").trim();
    const type = String(payload.type || "MANUAL")
      .trim()
      .toUpperCase();
    const description = String(payload.description || "").trim() || null;
    const isActive = asBoolean(payload.isActive, true);
    const source = String(payload.source || "MANUAL")
      .trim()
      .toUpperCase();

    if (!name) {
      throw new Error("Holiday name is required.");
    }

    const calendarYear = payload.calendarYear
      ? String(payload.calendarYear).trim()
      : await convertToEthiopianYear(date);

    const pool = db.promise();
    await pool.execute(
      `
      INSERT INTO Holidays (uuid, holidayDate, holidayName, calendarYear, calendarType, isActive, source, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        holidayName = VALUES(holidayName),
        calendarYear = VALUES(calendarYear),
        calendarType = VALUES(calendarType),
        isActive = VALUES(isActive),
        source = VALUES(source),
        description = VALUES(description)
      `,
      [
        uuidv4(),
        date,
        name,
        calendarYear,
        type,
        isActive ? 1 : 0,
        source,
        description,
      ],
    );

    return this.getHolidayByDate(date, false);
  }

  static async updateHolidayByUuid(uuid, payload) {
    await this.ensureHolidaySchema();
    const holidayUuid = String(uuid || "").trim();
    if (!holidayUuid) {
      throw new Error("Holiday uuid is required.");
    }

    const existing = await this.getHolidayByUuid(holidayUuid);
    if (!existing) {
      throw new Error("Holiday not found.");
    }

    const date = payload.date
      ? normalizeDate(payload.date)
      : existing.gregorianDate;
    const name = payload.name ? String(payload.name).trim() : existing.name;
    const type = payload.type
      ? String(payload.type).trim().toUpperCase()
      : existing.type;
    const description = Object.prototype.hasOwnProperty.call(
      payload,
      "description",
    )
      ? String(payload.description || "").trim() || null
      : existing.description || null;
    const isActive = Object.prototype.hasOwnProperty.call(payload, "isActive")
      ? asBoolean(payload.isActive, true)
      : asBoolean(existing.is_active, true);
    const source = payload.source
      ? String(payload.source).trim().toUpperCase()
      : String(existing.source || "MANUAL")
          .trim()
          .toUpperCase();
    const calendarYear = payload.calendarYear
      ? String(payload.calendarYear).trim()
      : existing.calendarYear || (await convertToEthiopianYear(date));

    if (!name) {
      throw new Error("Holiday name is required.");
    }

    const pool = db.promise();
    await pool.execute(
      `
      UPDATE Holidays
      SET holidayDate = ?,
          holidayName = ?,
          calendarYear = ?,
          calendarType = ?,
          isActive = ?,
          source = ?,
          description = ?
      WHERE uuid = ?
      `,
      [
        date,
        name,
        calendarYear,
        type,
        isActive ? 1 : 0,
        source,
        description,
        holidayUuid,
      ],
    );

    return this.getHolidayByUuid(holidayUuid);
  }

  static async deleteHolidayByUuid(uuid) {
    await this.ensureHolidaySchema();
    const holidayUuid = String(uuid || "").trim();
    if (!holidayUuid) {
      throw new Error("Holiday uuid is required.");
    }

    const pool = db.promise();
    const [result] = await pool.execute(
      `
      DELETE FROM Holidays
      WHERE uuid = ?
      `,
      [holidayUuid],
    );

    if (!result.affectedRows) {
      throw new Error("Holiday not found for delete.");
    }

    return { deleted: true, uuid: holidayUuid };
  }

  static async updateHolidayStatus(date, isActive) {
    await this.ensureHolidaySchema();
    const dateStr = normalizeDate(date);
    const status = asBoolean(isActive, true);
    const pool = db.promise();

    const [result] = await pool.execute(
      `
      UPDATE Holidays
      SET isActive = ?
      WHERE holidayDate = ?
      `,
      [status ? 1 : 0, dateStr],
    );

    if (!result.affectedRows) {
      throw new Error("Holiday not found for status update.");
    }

    return this.getHolidayByDate(dateStr, false);
  }

  static async insertEthiopianHolidays(startYear, endYear, options = {}) {
    await this.ensureHolidaySchema();
    const start = Number(startYear);
    const end = Number(endYear);
    const overwriteManual = Boolean(options.overwriteManual);

    if (!Number.isInteger(start) || !Number.isInteger(end) || start > end) {
      throw new Error("Invalid year range provided.");
    }

    const holidaysLib = getHd();
    if (!holidaysLib) {
      throw new Error("date-holidays library is unavailable.");
    }

    const pool = db.promise();
    let insertedOrUpdated = 0;

    for (let year = start; year <= end; year += 1) {
      const generated = holidaysLib.getHolidays(year) || [];

      for (const holiday of generated) {
        const rawDate = String(holiday.date || holiday.start || "").split(
          " ",
        )[0];
        if (!isValidDateFormat(rawDate)) {
          continue;
        }

        const holidayDate = rawDate;
        const holidayName = String(holiday.name || "Unnamed Holiday").trim();
        const calendarType = String(holiday.type || "PUBLIC").toUpperCase();
        const calendarYear = await convertToEthiopianYear(holidayDate);

        const [result] = await pool.execute(
          `
          INSERT INTO Holidays (uuid, holidayDate, holidayName, calendarYear, calendarType, isActive, source, description)
          VALUES (?, ?, ?, ?, ?, 1, 'LIBRARY', NULL)
          ON DUPLICATE KEY UPDATE
            holidayName = IF(source = 'MANUAL' AND ? = 0, holidayName, VALUES(holidayName)),
            calendarYear = IF(source = 'MANUAL' AND ? = 0, calendarYear, VALUES(calendarYear)),
            calendarType = IF(source = 'MANUAL' AND ? = 0, calendarType, VALUES(calendarType)),
            isActive = IF(source = 'MANUAL' AND ? = 0, isActive, 1),
            source = IF(source = 'MANUAL' AND ? = 0, source, 'LIBRARY')
          `,
          [
            uuidv4(),
            holidayDate,
            holidayName,
            calendarYear,
            calendarType,
            overwriteManual ? 1 : 0,
            overwriteManual ? 1 : 0,
            overwriteManual ? 1 : 0,
            overwriteManual ? 1 : 0,
            overwriteManual ? 1 : 0,
          ],
        );

        insertedOrUpdated += Number(result.affectedRows || 0) > 0 ? 1 : 0;
      }
    }

    return {
      startYear: start,
      endYear: end,
      overwriteManual,
      changedRows: insertedOrUpdated,
    };
  }

  static async syncHolidaysForYear(ethiopianYear, options = {}) {
    const ethYear = Number(ethiopianYear);
    if (!Number.isInteger(ethYear)) {
      throw new Error("Invalid Ethiopian year.");
    }

    // Ethiopian budget year X spans from Hamle 1 (year X-1) to Sene 30 (year X)
    // We need to get the actual Gregorian date range for this budget year
    const { getBudgetYearStartGregorianDate } = require("./calendarService");
    const startDateStr = await getBudgetYearStartGregorianDate(ethYear);
    const startDate = new Date(startDateStr);
    
    // Budget year spans approximately 2 Gregorian years
    const gregorianStartYear = startDate.getFullYear();
    const gregorianEndYear = gregorianStartYear + 1;
    
    const syncResult = await this.insertEthiopianHolidays(
      gregorianStartYear,
      gregorianEndYear,
      options,
    );

    return {
      ethiopianYear: ethYear,
      gregorianYearRange: `${gregorianStartYear}-${gregorianEndYear}`,
      ...syncResult,
    };
  }

  static async initializeHolidays(startYear, endYear, options = {}) {
    return this.insertEthiopianHolidays(startYear, endYear, options);
  }

  static async ensureHolidaysInitialized() {
    await this.ensureHolidaySchema();
    const budgetYearInfo = await getCurrentEthiopianBudgetYear();
    const currentBudgetYear = Number(budgetYearInfo.year);
    
    // Get the actual Gregorian date range for the current budget year
    // Budget year X spans from Hamle 1 (year X-1) to Sene 30 (year X)
    // Example: Budget Year 2018 = July 8, 2025 to July 7, 2026
    const startDate = budgetYearInfo.startDate; // e.g., "2025-07-08"
    const endDate = budgetYearInfo.endDate;     // e.g., "2026-07-07"
    
    // Extract Gregorian years from the date range
    const startYear = new Date(startDate).getFullYear();
    const endYear = new Date(endDate).getFullYear();
    
    const pool = db.promise();

    const [rows] = await pool.execute(
      `
      SELECT COUNT(*) AS total
      FROM Holidays
      WHERE holidayDate BETWEEN ? AND ?
      `,
      [startDate, endDate],
    );

    const count = Number(rows[0]?.total || 0);
    if (count > 0) {
      return false;
    }

    // Insert holidays for the Gregorian years that overlap with this budget year
    // For budget year 2018 (2025-07-08 to 2026-07-07), we need holidays from 2025 and 2026
    await this.insertEthiopianHolidays(
      startYear,
      endYear,
      {
        overwriteManual: false,
      },
    );

    return true;
  }

  static async getHolidayStatistics() {
    await this.ensureHolidaySchema();
    const currentYear = new Date().getUTCFullYear();
    const pool = db.promise();

    const [rows] = await pool.execute(
      `
      SELECT
        COUNT(*) AS total_holidays,
        SUM(CASE WHEN UPPER(calendarType) = 'PUBLIC' THEN 1 ELSE 0 END) AS public_holidays,
        SUM(CASE WHEN UPPER(calendarType) = 'RELIGIOUS' THEN 1 ELSE 0 END) AS religious_holidays,
        SUM(CASE WHEN UPPER(calendarType) = 'SPECIAL' THEN 1 ELSE 0 END) AS special_holidays,
        SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) AS active_holidays
      FROM Holidays
      WHERE holidayDate BETWEEN ? AND ?
      `,
      [`${currentYear}-01-01`, `${currentYear}-12-31`],
    );

    const stats = rows[0] || {};
    return {
      total_holidays: Number(stats.total_holidays || 0),
      public_holidays: Number(stats.public_holidays || 0),
      religious_holidays: Number(stats.religious_holidays || 0),
      special_holidays: Number(stats.special_holidays || 0),
      active_holidays: Number(stats.active_holidays || 0),
    };
  }
}

module.exports = HolidayService;
