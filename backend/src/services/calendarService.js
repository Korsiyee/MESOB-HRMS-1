// kenat is an ESM-only package — use dynamic import() from CommonJS
let _kenatPromise;
function getKenat() {
  if (!_kenatPromise) {
    _kenatPromise = import("kenat");
  }
  return _kenatPromise;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * Ethiopian Calendar Service
 * Uses the kenat library for Ethiopian-Gregorian calendar conversions
 * Ethiopian budget year runs from Hamle 1 to Sene 30 (approx. July 8 – July 7 Gregorian)
 */

/**
 * Get the current Ethiopian budget year
 * @returns {Promise<{ startDate: string, endDate: string, year: number }>}
 */
async function getCurrentEthiopianBudgetYear() {
  const today = new Date();
  const todayStr = formatDate(today);
  return getBudgetYearForDate(todayStr);
}

/**
 * Get the budget year for a given Gregorian date
 * @param {string} gregorianDate - YYYY-MM-DD format
 * @returns {Promise<{ startDate: string, endDate: string, year: number }>}
 */
async function getBudgetYearForDate(gregorianDate) {
  const eth = await toEthiopian(gregorianDate);

  // Budget year X runs from Hamle 1 of year (X-1) to Sene 30 of year X
  // Example: Budget Year 2018 runs from Hamle 1, 2017 to Sene 30, 2018
  // 
  // If we're in:
  // - Hamle through Pagume (months 11-13) of year Y → Budget Year is Y+1
  // - Meskerem through Sene (months 1-10) of year Y → Budget Year is Y
  let budgetYear = eth.year;
  if (eth.month >= 11) {
    // After Hamle 1, we're in the next budget year
    budgetYear = eth.year + 1;
  }

  // Budget year X starts on Hamle 1 of year (X-1) and ends on Sene 30 of year X
  const startDate = await toGregorian(budgetYear - 1, 11, 1); // Hamle 1 of previous year
  const endDate = await toGregorian(budgetYear, 10, 30); // Sene 30 of current year

  return {
    startDate,
    endDate,
    year: budgetYear,
  };
}

/**
 * Convert Gregorian date to Ethiopian calendar
 * @param {string} gregorianDate - YYYY-MM-DD format
 * @returns {Promise<{ year: number, month: number, day: number }>}
 */
async function toEthiopian(gregorianDate) {
  const kenatModule = await getKenat();
  const { toEC } = kenatModule;
  
  // Parse the date string
  const dateStr = String(gregorianDate);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // Use toEC function which takes (year, month, day)
  const eth = toEC(year, month, day);
  
  return {
    year: eth.year,
    month: eth.month,
    day: eth.day,
  };
}

/**
 * Convert Ethiopian date to Gregorian calendar
 * @param {number} year - Ethiopian year
 * @param {number} month - Ethiopian month (1-13)
 * @param {number} day - Ethiopian day
 * @returns {Promise<string>} Gregorian date in YYYY-MM-DD format
 */
async function toGregorian(year, month, day) {
  const Kenat = await getKenat();
  
  // Use the toGC function from kenat (named export)
  const { toGC } = Kenat;
  const gregDate = toGC(year, month, day);
  
  // gregDate is { year, month, day }
  const y = gregDate.year;
  const m = String(gregDate.month).padStart(2, '0');
  const d = String(gregDate.day).padStart(2, '0');
  
  return `${y}-${m}-${d}`;
}

/**
 * Get the start date of the fiscal year for a given budget year
 * @param {number} budgetYear - Ethiopian budget year
 * @returns {Promise<string>} Gregorian date in YYYY-MM-DD format
 */
async function getFiscalYearStartDate(budgetYear) {
  return toGregorian(budgetYear - 1, 11, 1); // Hamle 1 of previous Ethiopian year
}

/**
 * Check if today is the first day of the fiscal year
 * @returns {Promise<boolean>}
 */
async function isFirstDayOfFiscalYear() {
  const today = formatDate(new Date());
  const budgetYear = await getBudgetYearForDate(today);
  return today === budgetYear.startDate;
}

/**
 * Check if today is the fiscal year start (Hamle 1)
 * @returns {Promise<boolean>}
 */
async function isFiscalYearStartToday() {
  return isFirstDayOfFiscalYear();
}

/**
 * Get the Gregorian start date for a given budget year
 * @param {number} budgetYear - Ethiopian budget year
 * @returns {Promise<string>} Gregorian date in YYYY-MM-DD format
 */
async function getBudgetYearStartGregorianDate(budgetYear) {
  return getFiscalYearStartDate(budgetYear);
}

/**
 * Get months of service from hire date to current date
 * @param {string} hireDate - YYYY-MM-DD format
 * @param {string} currentDate - YYYY-MM-DD format (optional, defaults to today)
 * @returns {number} Months of service
 */
function getMonthsOfService(hireDate, currentDate = null) {
  const hire = parseAsUtcDate(hireDate);
  const current = currentDate ? parseAsUtcDate(currentDate) : new Date();
  
  if (!hire) return 0;
  
  const months =
    (current.getUTCFullYear() - hire.getUTCFullYear()) * 12 +
    (current.getUTCMonth() - hire.getUTCMonth());
  
  return months >= 0 ? months : 0;
}

/**
 * Get years of service from hire date to current date
 * @param {string} hireDate - YYYY-MM-DD format
 * @param {string} currentDate - YYYY-MM-DD format (optional, defaults to today)
 * @returns {number} Years of service
 */
function getYearsOfService(hireDate, currentDate = null) {
  return Math.floor(getMonthsOfService(hireDate, currentDate) / 12);
}

/**
 * Calculate months of service (same as getMonthsOfService)
 * @param {string} hireDate - YYYY-MM-DD format
 * @param {string} currentDate - YYYY-MM-DD format
 * @returns {number} Months of service
 */
function calculateMonthsOfService(hireDate, currentDate) {
  return getMonthsOfService(hireDate, currentDate);
}

/**
 * Get date range between start and end dates
 * @param {string} startDate - YYYY-MM-DD format
 * @param {string} endDate - YYYY-MM-DD format
 * @returns {string[]} Array of dates in YYYY-MM-DD format
 */
function getDateRange(startDate, endDate) {
  const start = parseAsUtcDate(startDate);
  const end = parseAsUtcDate(endDate);
  
  if (!start || !end || start > end) return [];
  
  const dates = [];
  const current = new Date(start);
  
  while (current <= end) {
    dates.push(formatDate(current));
    current.setTime(current.getTime() + DAY_IN_MS);
  }
  
  return dates;
}

/**
 * Parse date value as UTC date
 * @param {Date|string} dateValue - Date object or YYYY-MM-DD string
 * @returns {Date|null} UTC date or null if invalid
 */
function parseAsUtcDate(dateValue) {
  if (!dateValue) {
    return null;
  }

  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) {
      return null;
    }

    const year = dateValue.getUTCFullYear();
    const month = String(dateValue.getUTCMonth() + 1).padStart(2, '0');
    const day = String(dateValue.getUTCDate()).padStart(2, '0');
    return new Date(`${year}-${month}-${day}T00:00:00Z`);
  }

  const raw = String(dateValue).trim();
  if (!raw) {
    return null;
  }

  const dateOnlyMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  const normalized = dateOnlyMatch ? `${dateOnlyMatch[1]}T00:00:00Z` : raw;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Convert date value to UTC date only (without time)
 * @param {Date|string} dateValue - Date object or YYYY-MM-DD string
 * @returns {Date|null} UTC date or null if invalid
 */
function toUtcDateOnly(dateValue) {
  const parsed = parseAsUtcDate(dateValue);
  if (!parsed) {
    return null;
  }

  return new Date(
    Date.UTC(
      parsed.getUTCFullYear(),
      parsed.getUTCMonth(),
      parsed.getUTCDate(),
    ),
  );
}

/**
 * Format date as YYYY-MM-DD string
 * @param {Date|string} dateValue - Date object or date string
 * @returns {string|null} Date string in YYYY-MM-DD format or null if invalid
 */
function formatDate(dateValue) {
  // Handle null/undefined
  if (!dateValue) {
    return null;
  }
  
  // If already a string in YYYY-MM-DD format, validate and return
  if (typeof dateValue === 'string') {
    const dateOnlyMatch = String(dateValue).match(/^(\d{4}-\d{2}-\d{2})/);
    if (dateOnlyMatch) {
      const testDate = toUtcDateOnly(dateOnlyMatch[1]);
      if (testDate) {
        return dateOnlyMatch[1];
      }
    }
  }
  
  // Otherwise normalize to UTC date
  const normalized = toUtcDateOnly(dateValue);
  if (!normalized) {
    return null;
  }
  return normalized.toISOString().slice(0, 10);
}

/**
 * Check if date string is in valid YYYY-MM-DD format
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid format
 */
function isValidDateFormat(dateString) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(String(dateString || ''))) {
    return false;
  }

  return toUtcDateOnly(dateString) !== null;
}

/**
 * Check if date is a weekend (Saturday or Sunday) based on working days
 * @param {Date|string} dateValue - Date object or YYYY-MM-DD string
 * @param {Array<number>} workingDays - Array of working days (0=Sun, 1=Mon, ..., 6=Sat)
 * @returns {boolean} True if weekend
 */
function isWeekend(dateValue, workingDays = []) {
  const normalized = toUtcDateOnly(dateValue);
  if (!normalized) {
    return false;
  }

  const day = normalized.getUTCDay();
  
  // If working days are specified, check if day is NOT in working days
  if (Array.isArray(workingDays) && workingDays.length > 0) {
    return !workingDays.includes(day);
  }
  
  // Default: Saturday (6) or Sunday (0)
  return day === 0 || day === 6;
}

/**
 * Get previous budget years
 * @param {number} currentBudgetYear - Current budget year
 * @param {number} count - Number of previous years to get
 * @returns {string[]} Array of budget years
 */
function getPreviousBudgetYears(currentBudgetYear, count) {
  const current = Number(currentBudgetYear);
  if (!Number.isInteger(current)) {
    return [];
  }

  const values = [];
  for (let i = 1; i <= count; i += 1) {
    values.push(String(current - i));
  }
  return values;
}

module.exports = {
  DAY_IN_MS,
  getCurrentEthiopianBudgetYear,
  getBudgetYearForDate,
  toEthiopian,
  toGregorian,
  getFiscalYearStartDate,
  isFirstDayOfFiscalYear,
  isFiscalYearStartToday,
  getBudgetYearStartGregorianDate,
  getMonthsOfService,
  getYearsOfService,
  calculateMonthsOfService,
  getDateRange,
  parseAsUtcDate,
  toUtcDateOnly,
  formatDate,
  isValidDateFormat,
  isWeekend,
  getPreviousBudgetYears,
};
