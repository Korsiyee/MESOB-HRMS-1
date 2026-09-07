const HolidayService = require("./holidayService");
const { DAY_IN_MS, formatDate } = require("./calendarService");

// Working days configuration for Ethiopia: Monday-Saturday (Sunday is weekend)
const WORKING_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

/**
 * Check if a date is a weekend (Sunday only in Ethiopia)
 * @param {Date|string} dateValue - Date object or YYYY-MM-DD string
 * @returns {boolean}
 */
function isWeekend(dateValue) {
  let date;
  if (typeof dateValue === 'string') {
    const [year, month, day] = dateValue.split("-").map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = dateValue;
  }
  
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // In Ethiopia, only Sunday (0) is weekend
  return dayOfWeek === 0;
}

async function isNonWorkingDay(dateValue) {
  const weekend = isWeekend(dateValue);
  if (weekend) {
    // Weekend has priority so a holiday on weekend is still excluded once.
    return true;
  }

  return HolidayService.isHoliday(dateValue);
}

async function countWorkingDaysInRange(startDate, endDate) {
  let count = 0;
  let cursor = new Date(startDate);

  while (cursor <= endDate) {
    const nonWorkingDay = await isNonWorkingDay(cursor);
    if (!nonWorkingDay) {
      count += 1;
    }
    cursor.setTime(cursor.getTime() + DAY_IN_MS);
  }

  return count;
}

async function listWorkingDatesInOrder(startDate, numberOfWorkingDates) {
  const dates = [];
  let cursor = new Date(startDate);

  while (dates.length < numberOfWorkingDates) {
    const nonWorkingDay = await isNonWorkingDay(cursor);
    if (!nonWorkingDay) {
      dates.push(formatDate(cursor));
    }

    cursor.setTime(cursor.getTime() + DAY_IN_MS);

    if (cursor > new Date(startDate.getTime() + 366 * DAY_IN_MS)) {
      throw new Error(
        "Could not calculate working dates within a reasonable timeframe",
      );
    }
  }

  return dates;
}

class DateCalculationService {
  /**
   * Calculate end date from start date and number of working days
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {number} numberOfDays - Number of working days required
   * @returns {Promise<Object>} Object with endDate and actual working days
   */
  static async calculateEndDate(startDate, numberOfDays) {
    try {
      if (!Number.isFinite(numberOfDays) || numberOfDays <= 0) {
        throw new Error("numberOfDays must be a positive number");
      }

      if (!Number.isInteger(numberOfDays * 2)) {
        throw new Error("numberOfDays must be in 0.5 increments");
      }

      const hasHalfDay = numberOfDays % 1 !== 0;
      const requiredWorkingDateCount = Math.ceil(numberOfDays);

      const [year, month, day] = startDate.split("-").map(Number);
      const start = new Date(Date.UTC(year, month - 1, day));
      let currentDate = new Date(start);
      let workingDaysFound = 0;
      let endDate = null;

      // Loop until we find the required number of working dates.
      while (workingDaysFound < requiredWorkingDateCount) {
        // Non-working days (weekend/holiday overlap) are excluded once.
        const nonWorkingDay = await isNonWorkingDay(currentDate);

        if (!nonWorkingDay) {
          workingDaysFound++;
          endDate = new Date(currentDate); // This will be our end date when we reach the required days
        }

        // Move to next day using UTC time addition to avoid timezone issues
        currentDate.setTime(currentDate.getTime() + DAY_IN_MS);

        // Safety check to prevent infinite loops (max 1 year)
        if (currentDate > new Date(start.getTime() + 365 * DAY_IN_MS)) {
          throw new Error(
            "Could not calculate end date within a reasonable timeframe",
          );
        }
      }

      const startUtc = Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate(),
      );
      const endUtc = Date.UTC(
        endDate.getUTCFullYear(),
        endDate.getUTCMonth(),
        endDate.getUTCDate(),
      );

      return {
        endDate: formatDate(endDate),
        actualWorkingDays: hasHalfDay
          ? requiredWorkingDateCount - 0.5
          : requiredWorkingDateCount,
        totalCalendarDays: Math.floor((endUtc - startUtc) / DAY_IN_MS) + 1,
      };
    } catch (error) {
      console.error("Error calculating end date:", error);
      throw error;
    }
  }

  /**
   * Validate that the calculated end date is reasonable
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {number} maxDays - Maximum allowed days
   * @returns {Object} Validation result
   */
  static validateCalculatedDates(startDate, endDate, maxDays = 90) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startUtc = Date.UTC(
      start.getUTCFullYear(),
      start.getUTCMonth(),
      start.getUTCDate(),
    );
    const endUtc = Date.UTC(
      end.getUTCFullYear(),
      end.getUTCMonth(),
      end.getUTCDate(),
    );
    const totalCalendarDays = Math.floor((endUtc - startUtc) / DAY_IN_MS) + 1;

    if (totalCalendarDays > maxDays * 3) {
      // Allow more buffer for weekends/holidays
      return {
        valid: false,
        message: `Calculated end date is too far in the future (${totalCalendarDays} calendar days). Maximum allowed is approximately ${maxDays * 3} calendar days.`,
      };
    }

    if (end < start) {
      return {
        valid: false,
        message: "Calculated end date cannot be before start date",
      };
    }

    return {
      valid: true,
      message: "Date calculation is valid",
    };
  }

  /**
   * Get date range preview for user to review
   * @param {string} startDate - Start date
   * @param {number} numberOfDays - Number of working days
   * @returns {Promise<Object>} Preview information
   */
  static async getDateRangePreview(startDate, numberOfDays) {
    try {
      const calculation = await this.calculateEndDate(startDate, numberOfDays);
      const validation = this.validateCalculatedDates(
        startDate,
        calculation.endDate,
        numberOfDays,
      );

      // Confirmed working days should mirror computed leave-day semantics,
      // including half-day returns.
      const confirmedWorkingDays = calculation.actualWorkingDays;
      const workingDates = await this.listWorkingDates(
        startDate,
        Math.ceil(numberOfDays),
      );

      return {
        startDate,
        requestedWorkingDays: numberOfDays,
        calculatedEndDate: calculation.endDate,
        confirmedWorkingDays,
        totalCalendarDays: calculation.totalCalendarDays,
        workingDates,
        validation,
        preview: {
          message: `Your ${numberOfDays} working day leave will run from ${startDate} to ${calculation.endDate} (${calculation.totalCalendarDays} calendar days including weekends and holidays)`,
        },
      };
    } catch (error) {
      throw new Error(`Failed to generate date preview: ${error.message}`);
    }
  }

  static async countWorkingDaysInRangeInclusive(startDate, endDate) {
    if (!startDate || !endDate) {
      return 0;
    }

    const start = new Date(`${startDate}T00:00:00Z`);
    const end = new Date(`${endDate}T00:00:00Z`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return 0;
    }

    if (end < start) {
      return 0;
    }

    return countWorkingDaysInRange(start, end);
  }

  static async listWorkingDates(startDate, numberOfWorkingDates) {
    if (!startDate || !Number.isInteger(numberOfWorkingDates)) {
      return [];
    }

    if (numberOfWorkingDates <= 0) {
      return [];
    }

    const [year, month, day] = String(startDate)
      .split("-")
      .map((item) => Number(item));
    const normalizedStart = new Date(Date.UTC(year, month - 1, day));

    if (Number.isNaN(normalizedStart.getTime())) {
      return [];
    }

    return listWorkingDatesInOrder(normalizedStart, numberOfWorkingDates);
  }
}

module.exports = DateCalculationService;
