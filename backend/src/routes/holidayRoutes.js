const express = require("express");
const HolidayService = require("../services/holidayService");
const { authorize } = require("../middleware/authorize");
const { authenticateJwt } = require("../middleware/authMiddleware");
const { safeLogEvent } = require("../services/auditLogService");
const { sendSuccess, sendError } = require("../utils/response");

const router = express.Router();

// POST /api/holidays/initialize - Initialize holidays for a range of years
router.post("/initialize", authorize("Holidays.Create"), async (req, res) => {
  try {
    const { startYear, endYear, overwriteManual } = req.body;

    if (!startYear || !endYear) {
      return sendError(res, {
        status: 400,
        message: "startYear and endYear are required",
        error: "VALIDATION_ERROR",
      });
    }

    const result = await HolidayService.insertEthiopianHolidays(
      startYear,
      endYear,
      {
        overwriteManual: Boolean(overwriteManual),
      },
    );

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "INITIALIZE_HOLIDAYS",
      entityType: "HOLIDAY",
      entityUuid: null,
      diff: { startYear, endYear, overwriteManual, result },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `Holidays initialized from ${startYear} to ${endYear}`,
      data: result,
    });
  } catch (error) {
    console.error("Error initializing holidays:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error initializing holidays",
      error: "HOLIDAY_INITIALIZATION_ERROR",
    });
  }
});

// GET /api/holidays/year/:year - Get holidays for a specific year (all authenticated users)
router.get("/year/:year", authenticateJwt, async (req, res) => {
  try {
    const { year } = req.params;

    const holidays = await HolidayService.getHolidaysByYear(parseInt(year));

    return sendSuccess(res, {
      status: 200,
      message: `Holidays for year ${year} retrieved successfully`,
      data: holidays,
    });
  } catch (error) {
    console.error("Error getting holidays by year:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving holidays",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /api/holidays/range - Get holidays within a date range (all authenticated users)
router.get("/range", authenticateJwt, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return sendError(res, {
        status: 400,
        message: "startDate and endDate query parameters are required",
        error: "VALIDATION_ERROR",
      });
    }

    const holidays = await HolidayService.getHolidaysInRange(
      startDate,
      endDate,
    );

    return sendSuccess(res, {
      status: 200,
      message: `Holidays from ${startDate} to ${endDate} retrieved successfully`,
      data: holidays,
    });
  } catch (error) {
    console.error("Error getting holidays in range:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving holidays",
      error: "INTERNAL_ERROR",
    });
  }
});

// GET /api/holidays/check/:date - Check if a specific date is a holiday (all authenticated users)
router.get("/check/:date", authenticateJwt, async (req, res) => {
  try {
    const { date } = req.params;

    const isHoliday = await HolidayService.isHoliday(date);

    return sendSuccess(res, {
      status: 200,
      message: "Holiday check completed",
      data: {
        date,
        isHoliday,
      },
    });
  } catch (error) {
    console.error("Error checking holiday:", error);
    return sendError(res, {
      status: 500,
      message: "Error checking holiday",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /api/holidays - Add a new holiday
router.post("/", authorize("Holidays.Create"), async (req, res) => {
  try {
    const { date, name, type, ethiopian_date } = req.body;

    if (!date || !name || !type) {
      return sendError(res, {
        status: 400,
        message: "date, name, and type are required",
        error: "VALIDATION_ERROR",
      });
    }

    const holiday = await HolidayService.addHoliday({
      date,
      name,
      type,
      ethiopian_date,
      is_active: req.body.is_active,
      description: req.body.description,
      source: "MANUAL",
      calendar_year: req.body.calendar_year,
    });

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "ADD_HOLIDAY",
      entityType: "HOLIDAY",
      entityUuid: holiday.uuid || date,
      diff: { date, name, type },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 201,
      message: "Holiday added successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Error adding holiday:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error adding holiday",
      error: "HOLIDAY_CREATE_ERROR",
    });
  }
});

// PATCH /api/holidays/:date/status - Update holiday status
router.patch("/:date/status", authorize("Holidays.Update"), async (req, res) => {
  try {
    const { date } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== "boolean") {
      return sendError(res, {
        status: 400,
        message: "is_active must be a boolean value",
        error: "VALIDATION_ERROR",
      });
    }

    const holiday = await HolidayService.updateHolidayStatus(date, is_active);

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "UPDATE_HOLIDAY_STATUS",
      entityType: "HOLIDAY",
      entityUuid: date,
      diff: { is_active },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `Holiday status updated to ${is_active ? "active" : "inactive"}`,
      data: holiday,
    });
  } catch (error) {
    console.error("Error updating holiday status:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error updating holiday status",
      error: "HOLIDAY_STATUS_UPDATE_ERROR",
    });
  }
});

// PATCH /api/holidays/item/:uuid - Update a holiday record by UUID
router.patch("/item/:uuid", authorize("Holidays.Update"), async (req, res) => {
  try {
    const { uuid } = req.params;
    const holiday = await HolidayService.updateHolidayByUuid(
      uuid,
      req.body || {},
    );

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "UPDATE_HOLIDAY",
      entityType: "HOLIDAY",
      entityUuid: uuid,
      diff: req.body,
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Holiday updated successfully",
      data: holiday,
    });
  } catch (error) {
    console.error("Error updating holiday:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error updating holiday",
      error: "HOLIDAY_UPDATE_ERROR",
    });
  }
});

// DELETE /api/holidays/item/:uuid - Permanently delete holiday by UUID
router.delete("/item/:uuid", authorize("Holidays.Delete"), async (req, res) => {
  try {
    const { uuid } = req.params;
    const result = await HolidayService.deleteHolidayByUuid(uuid);

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "DELETE_HOLIDAY",
      entityType: "HOLIDAY",
      entityUuid: uuid,
      diff: { deleted: true },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: "Holiday deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error deleting holiday",
      error: "HOLIDAY_DELETE_ERROR",
    });
  }
});

// GET /api/holidays/statistics - Get holiday statistics (all authenticated users)
router.get("/statistics", authenticateJwt, async (req, res) => {
  try {
    const statistics = await HolidayService.getHolidayStatistics();

    return sendSuccess(res, {
      status: 200,
      message: "Holiday statistics retrieved successfully",
      data: statistics,
    });
  } catch (error) {
    console.error("Error getting holiday statistics:", error);
    return sendError(res, {
      status: 500,
      message: "Error retrieving holiday statistics",
      error: "INTERNAL_ERROR",
    });
  }
});

// POST /api/holidays/sync/:ethiopianYear - Sync holidays for Ethiopian year
router.post("/sync/:ethiopianYear", authorize("Holidays.Create"), async (req, res) => {
  try {
    const { ethiopianYear } = req.params;
    const { overwriteManual } = req.body || {};

    const syncResult = await HolidayService.syncHolidaysForYear(
      parseInt(ethiopianYear, 10),
      {
        overwriteManual: Boolean(overwriteManual),
      },
    );

    await safeLogEvent({
      actorUuid: req.user.uuid,
      action: "SYNC_HOLIDAYS",
      entityType: "HOLIDAY",
      entityUuid: null,
      diff: { ethiopianYear, overwriteManual, syncResult },
      ipAddress: req.ip,
    });

    return sendSuccess(res, {
      status: 200,
      message: `Holiday sync completed for Ethiopian year ${ethiopianYear}`,
      data: syncResult,
    });
  } catch (error) {
    console.error("Error syncing holidays:", error);
    return sendError(res, {
      status: 400,
      message: error.message || "Error syncing holidays",
      error: "HOLIDAY_SYNC_ERROR",
    });
  }
});

module.exports = router;
