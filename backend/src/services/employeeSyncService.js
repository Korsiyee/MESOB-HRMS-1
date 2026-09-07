const { db } = require("../config/db");
const { getCurrentEthiopianBudgetYear } = require("./calendarService");
const { upsertCurrentYearBalance, fetchBalance } = require("./balanceService");
const { ApiError } = require("../utils/errors");

/**
 * Rebuild balance for an employee (used by employee module after create/update)
 * This replaces the old sync service - employee data is already in Employees table
 */
async function upsertEmployeeAndRebuildBalance(profile) {
  const { uuid, full_name, hire_date, prior_gov_service, status } = profile;

  if (!uuid || !full_name || !hire_date) {
    throw new ApiError(
      "uuid, full_name and hire_date are required.",
      400,
      "VALIDATION_ERROR",
    );
  }

  const employeeStatus = String(status || "ACTIVE")
    .trim()
    .toUpperCase();
  if (!["ACTIVE", "INACTIVE", "TERMINATED"].includes(employeeStatus)) {
    throw new ApiError(
      "Employee status must be ACTIVE, INACTIVE, or TERMINATED.",
      422,
      "INVALID_STATUS",
    );
  }

  // Employee data is already in Employees table from employee module
  // We just need to rebuild the balance

  const currentBudgetYear = Number(
    (await getCurrentEthiopianBudgetYear()).year,
  );
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();

    if (employeeStatus === "ACTIVE") {
      await upsertCurrentYearBalance(conn, uuid, currentBudgetYear);
    }

    await conn.commit();

    const balance =
      employeeStatus === "ACTIVE" ? await fetchBalance(uuid) : null;
    return {
      employee: {
        uuid,
        status: employeeStatus,
      },
      balance,
    };
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  upsertEmployeeAndRebuildBalance,
};
