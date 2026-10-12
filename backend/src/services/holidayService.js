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
    name: row.holiday_name,
    gregorianDate: formatDate(row.holiday_date),
    type: String(row.source || row.calendar_type || "PUBLIC").toUpperCase(),
    calendarType: row.calendar_type,
    ethiopian_date: row.calendar_year ? `${row.calendar_year}-01-01` : null,
    calendar_year: row.calendar_year,
    calendarYear: row.calendar_year,
    is_active: asBoolean(row.is_active, true),
    isActive: asBoolean(row.is_active, true),
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
      SELECT uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description
      FROM Holidays
      WHERE uuid = ?
      LIMIT 1
      `,
      [holidayUuid],
    );

    return rows.length ? mapHolidayRow(rows[0]) : null;
  }

  static async ensureHolidaySchema() {
    // Schema changes have been moved to database migrations
    // All required columns should exist in the schema.sql file
    return Promise.resolve();
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

    const whereStatus = activeOnly ? "AND is_active = 1" : "";
    const [rows] = await pool.execute(
      `
      SELECT uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description
      FROM Holidays
      WHERE holiday_date = ? ${whereStatus}
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
    const whereStatus = activeOnly ? "AND is_active = 1" : "";

    const [rows] = await pool.execute(
      `
      SELECT uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description
      FROM Holidays
      WHERE holiday_date BETWEEN ? AND ? ${whereStatus}
      ORDER BY holiday_date ASC
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
    const rawType = String(payload.type || payload.calendar_type || payload.calendarType || "PUBLIC").trim().toUpperCase();
    const calendarType = (rawType === "GREGORIAN" || payload.calendar_type === "GREGORIAN" || payload.calendarType === "GREGORIAN")
      ? "GREGORIAN"
      : "ETHIOPIAN";
    const source = payload.source ? String(payload.source).trim().toUpperCase() : (rawType || "MANUAL");
    const description = String(payload.description || "").trim() || null;
    const is_active = asBoolean(payload.is_active ?? payload.isActive, true);

    if (!name) {
      throw new Error("Holiday name is required.");
    }

    const calendar_year = payload.calendar_year || payload.calendarYear
      ? String(payload.calendar_year || payload.calendarYear).trim()
      : await convertToEthiopianYear(date);

    const pool = db.promise();
    await pool.execute(
      `
      INSERT INTO Holidays (uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        holiday_name = VALUES(holiday_name),
        calendar_year = VALUES(calendar_year),
        calendar_type = VALUES(calendar_type),
        is_active = VALUES(is_active),
        source = VALUES(source),
        description = VALUES(description)
      `,
      [
        uuidv4(),
        date,
        name,
        calendar_year,
        calendarType,
        is_active ? 1 : 0,
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
    const rawType = payload.type ? String(payload.type).trim().toUpperCase() : (existing.type || "PUBLIC");
    const calendarType = (rawType === "GREGORIAN" || payload.calendar_type === "GREGORIAN" || payload.calendarType === "GREGORIAN")
      ? "GREGORIAN"
      : (existing.calendarType || "ETHIOPIAN");
    const source = payload.source
      ? String(payload.source).trim().toUpperCase()
      : (rawType || existing.source || "MANUAL");
    const description = Object.prototype.hasOwnProperty.call(
      payload,
      "description",
    )
      ? String(payload.description || "").trim() || null
      : existing.description || null;
    const is_active = Object.prototype.hasOwnProperty.call(payload, "is_active")
      ? asBoolean(payload.is_active, true)
      : (Object.prototype.hasOwnProperty.call(payload, "isActive")
          ? asBoolean(payload.isActive, true)
          : asBoolean(existing.is_active, true));
    const calendar_year = payload.calendar_year || payload.calendarYear
      ? String(payload.calendar_year || payload.calendarYear).trim()
      : existing.calendar_year || (await convertToEthiopianYear(date));

    if (!name) {
      throw new Error("Holiday name is required.");
    }

    const pool = db.promise();
    await pool.execute(
      `
      UPDATE Holidays
      SET holiday_date = ?,
          holiday_name = ?,
          calendar_year = ?,
          calendar_type = ?,
          is_active = ?,
          source = ?,
          description = ?
      WHERE uuid = ?
      `,
      [
        date,
        name,
        calendar_year,
        calendarType,
        is_active ? 1 : 0,
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

  static async updateHolidayStatus(date, is_active) {
    await this.ensureHolidaySchema();
    const dateStr = normalizeDate(date);
    const status = asBoolean(is_active, true);
    const pool = db.promise();

    const [result] = await pool.execute(
      `
      UPDATE Holidays
      SET is_active = ?
      WHERE holiday_date = ?
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

        const holiday_date = rawDate;
        const holiday_name = String(holiday.name || "Unnamed Holiday").trim();
        const calendar_type = "ETHIOPIAN";
        const holiday_source = String(holiday.type || "LIBRARY").toUpperCase();
        const calendar_year = await convertToEthiopianYear(holiday_date);

        const [result] = await pool.execute(
          `
          INSERT INTO Holidays (uuid, holiday_date, holiday_name, calendar_year, calendar_type, is_active, source, description)
          VALUES (?, ?, ?, ?, ?, 1, ?, NULL)
          ON DUPLICATE KEY UPDATE
            holiday_name = IF(source = 'MANUAL' AND ? = 0, holiday_name, VALUES(holiday_name)),
            calendar_year = IF(source = 'MANUAL' AND ? = 0, calendar_year, VALUES(calendar_year)),
            calendar_type = IF(source = 'MANUAL' AND ? = 0, calendar_type, VALUES(calendar_type)),
            is_active = IF(source = 'MANUAL' AND ? = 0, is_active, 1),
            source = IF(source = 'MANUAL' AND ? = 0, source, VALUES(source))
          `,
          [
            uuidv4(),
            holiday_date,
            holiday_name,
            calendar_year,
            calendar_type,
            holiday_source,
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
      WHERE holiday_date BETWEEN ? AND ?
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
        SUM(CASE WHEN UPPER(calendar_type) = 'PUBLIC' THEN 1 ELSE 0 END) AS public_holidays,
        SUM(CASE WHEN UPPER(calendar_type) = 'RELIGIOUS' THEN 1 ELSE 0 END) AS religious_holidays,
        SUM(CASE WHEN UPPER(calendar_type) = 'SPECIAL' THEN 1 ELSE 0 END) AS special_holidays,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_holidays
      FROM Holidays
      WHERE holiday_date BETWEEN ? AND ?
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
