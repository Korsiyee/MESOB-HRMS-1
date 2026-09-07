const cron = require("node-cron");
const {
  rebuildCurrentYearBalancesForAllActiveEmployees,
} = require("./balanceService");
const HolidayService = require("./holidayService");
const {
  getCurrentEthiopianBudgetYear,
  isFiscalYearStartToday,
} = require("./calendarService");

function isSchedulerEnabled() {
  const raw = String(process.env.INTERNAL_REBUILD_SCHEDULER_ENABLED || "true")
    .trim()
    .toLowerCase();
  return !["0", "false", "no", "off"].includes(raw);
}

function getCronExpression() {
  return String(process.env.INTERNAL_REBUILD_CRON || "10 0 * * *").trim();
}

function getTimezone() {
  const timezone = String(process.env.INTERNAL_REBUILD_TIMEZONE || "").trim();
  return timezone || undefined;
}

function startInternalRebuildScheduler() {
  if (!isSchedulerEnabled()) {
    console.log("[scheduler] Internal rebuild scheduler is disabled.");
    return null;
  }

  const expression = getCronExpression();
  const timezone = getTimezone();

  if (!cron.validate(expression)) {
    console.error(
      `[scheduler] Invalid INTERNAL_REBUILD_CRON expression: ${expression}`,
    );
    return null;
  }

  let isRunning = false;

  const task = cron.schedule(
    expression,
    async () => {
      if (isRunning) {
        console.log(
          "[scheduler] Rebuild job skipped (previous run still active).",
        );
        return;
      }

      isRunning = true;
      try {
        const fiscalYearStartToday = await isFiscalYearStartToday();
        if (!fiscalYearStartToday) {
          console.log(
            "[scheduler] Scheduled run skipped (today is not fiscal-year start).",
          );
          return;
        }

        console.log("[scheduler] Rebuild-all job started.");
        const result = await rebuildCurrentYearBalancesForAllActiveEmployees();
        console.log("[scheduler] Rebuild-all job finished:", result);

        const budgetYearNumber = Number(
          (await getCurrentEthiopianBudgetYear()).year,
        );

        if (Number.isInteger(budgetYearNumber)) {
          console.log(
            `[scheduler] Holiday sync started for Ethiopian year ${budgetYearNumber}.`,
          );
          const holidaySyncResult = await HolidayService.syncHolidaysForYear(
            budgetYearNumber,
            {
              overwriteManual: false,
            },
          );
          console.log("[scheduler] Holiday sync finished:", holidaySyncResult);
        }
      } catch (error) {
        console.error(
          "[scheduler] Scheduled job failed:",
          error.message || error,
        );
      } finally {
        isRunning = false;
      }
    },
    {
      scheduled: true,
      timezone,
    },
  );

  console.log(
    `[scheduler] Internal rebuild scheduler enabled (${expression})${
      timezone ? ` timezone=${timezone}` : ""
    }`,
  );

  return task;
}

module.exports = {
  startInternalRebuildScheduler,
};
