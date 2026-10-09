const { db } = require("../config/db");
const { randomUUID } = require("crypto");
const { ApiError } = require("../utils/errors");
const {
  getCurrentEthiopianBudgetYear,
  parseAsUtcDate,
  isFiscalYearStartToday,
  getBudgetYearStartGregorianDate,
} = require("./calendarService");
const {
  getCompletedYears,
  calculateEntitledDays,
  getAnnualPolicy,
} = require("./leaveService");

const DECIMAL_DAY_TYPES = new Set([
  "decimal",
  "numeric",
  "float",
  "double",
  "real",
]);
let decimalDayColumnsEnsurePromise = null;

async function ensureDecimalDayColumns() {
  // Schema changes have been moved to database migrations
  // All required columns should exist in the schema.sql file with correct data types
  return Promise.resolve();
}

function normalizeDays(value) {
  return Math.max(0, Number(value || 0));
}

function calculateRemainingDays(entitledDays, carriedForwardDays, usedDays) {
  return Math.max(0, entitledDays + carriedForwardDays - usedDays);
}

function getPreviousYearsQueryParts(currentBudgetYear) {
  const baseYear = Number(currentBudgetYear);
  if (!Number.isFinite(baseYear)) {
    return { previousYears: [], placeholders: "" };
  }
  const previousYears = [baseYear - 1, baseYear - 2];
  return {
    previousYears,
    placeholders: previousYears.map(() => "?").join(", "),
  };
}

async function computeCarryForwardDays(conn, employeeUuid, currentBudgetYear) {
  const { previousYears, placeholders } =
    getPreviousYearsQueryParts(currentBudgetYear);
  if (previousYears.length === 0) {
    return 0;
  }

  const params = [employeeUuid, ...previousYears];

  const [rows] = await conn.execute(
    `
      SELECT COALESCE(SUM(lp.postponedDays), 0) AS carriedForward
      FROM leavePostponements lp
      INNER JOIN employeeLeaveBalances lb
        ON lb.uuid = lp.leaveBalanceUuid
      WHERE lp.employee_uuid = ?
        AND lp.status = 'APPROVED'
        AND lb.budgetYear IN (${placeholders})
    `,
    params,
  );

  return Number(rows[0]?.carriedForward || 0);
}

async function ensureAutomaticPostponements(
  conn,
  employeeUuid,
  currentBudgetYear,
) {
  const shouldGeneratePostponements = await isFiscalYearStartToday();
  if (!shouldGeneratePostponements) {
    return;
  }

  const { previousYears, placeholders } =
    getPreviousYearsQueryParts(currentBudgetYear);
  if (previousYears.length === 0) {
    return;
  }

  // Set-based insert keeps the flow idempotent while avoiding per-row checks.
  await conn.execute(
    `
      INSERT INTO leavePostponements (
        uuid,
        employee_uuid,
        leaveBalanceUuid,
        postponedDays,
        reason,
        status
      )
      SELECT
        UUID(),
        ?,
        lb.uuid,
        GREATEST(0, COALESCE(lb.remainingDays, 0)),
        CONCAT('Automatic carry-over from budget year ', lb.budgetYear),
        'APPROVED'
      FROM employeeLeaveBalances lb
      LEFT JOIN leavePostponements lp
        ON lp.leaveBalanceUuid = lb.uuid
       AND lp.status = 'APPROVED'
      WHERE lb.employee_uuid = ?
        AND lb.budgetYear IN (${placeholders})
        AND GREATEST(0, COALESCE(lb.remainingDays, 0)) >= 1
        AND lp.uuid IS NULL
    `,
    [employeeUuid, employeeUuid, ...previousYears],
  );
}

async function upsertCurrentYearBalance(conn, employeeUuid, currentBudgetYear) {
  const { getEmployee } = require("./employeeService");
  const employee = await getEmployee(conn, employeeUuid);
  if (!employee) {
    throw new ApiError(
      "Employee not found for supplied uuid.",
      404,
      "NOT_FOUND",
    );
  }

  if (employee.status !== "ACTIVE") {
    throw new ApiError(
      "Employee is inactive and cannot receive balance updates.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const annualPolicy = await getAnnualPolicy(conn);
  if (!annualPolicy) {
    throw new ApiError(
      "Annual leave policy is not configured.",
      422,
      "VALIDATION_ERROR",
    );
  }

  const hireDate = parseAsUtcDate(employee.hire_date);
  if (!hireDate) {
    throw new ApiError(
      `Employee ${employeeUuid} hire_date is invalid.`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const fiscalYearStartDate =
    await getBudgetYearStartGregorianDate(currentBudgetYear);
  if (!fiscalYearStartDate) {
    throw new ApiError(
      `Could not resolve fiscal-year start date for budget year ${currentBudgetYear}.`,
      422,
      "VALIDATION_ERROR",
    );
  }

  const completedYears = getCompletedYears(hireDate, fiscalYearStartDate);
  const priorGovService = normalizeDays(employee.prior_gov_service_years);
  const yearsOfService = completedYears + priorGovService;

  const entitledDays = calculateEntitledDays(annualPolicy, yearsOfService);

  await ensureAutomaticPostponements(conn, employeeUuid, currentBudgetYear);

  const carriedForwardDays = await computeCarryForwardDays(
    conn,
    employeeUuid,
    currentBudgetYear,
  );

  const [existingRows] = await conn.execute(
    `
      SELECT uuid, usedDays, entitledDays
      FROM employeeLeaveBalances
      WHERE employee_uuid = ? AND budgetYear = ?
      LIMIT 1
    `,
    [employeeUuid, currentBudgetYear],
  );

  if (existingRows.length === 0) {
    const balanceUuid = randomUUID();
    const usedDays = 0;
    const remainingDays = calculateRemainingDays(
      entitledDays,
      carriedForwardDays,
      usedDays,
    );

    await conn.execute(
      `
        INSERT INTO employeeLeaveBalances (
          uuid,
          employee_uuid,
          budgetYear,
          entitledDays,
          carriedForwardDays,
          usedDays,
          remainingDays,
          status,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_DATE)
      `,
      [
        balanceUuid,
        employeeUuid,
        currentBudgetYear,
        entitledDays,
        carriedForwardDays,
        usedDays,
        remainingDays,
      ],
    );
  } else {
    const existing = existingRows[0];
    const usedDays = normalizeDays(existing.usedDays);
    const remainingDays = calculateRemainingDays(
      entitledDays,
      carriedForwardDays,
      usedDays,
    );

    await conn.execute(
      `
        UPDATE employeeLeaveBalances
        SET entitledDays = ?,
            carriedForwardDays = ?,
            remainingDays = ?,
            status = 'ACTIVE',
            updated_at = CURRENT_DATE
        WHERE uuid = ?
      `,
      [entitledDays, carriedForwardDays, remainingDays, existing.uuid],
    );
  }
}

async function fetchBalance(employeeUuid, budgetYear = null) {
  await ensureDecimalDayColumns();

  const currentBudgetYear = budgetYear || Number(
    (await getCurrentEthiopianBudgetYear()).year,
  );

  const budgetYearClause = budgetYear ? "AND budgetYear = ?" : "";
  const params = budgetYear ? [employeeUuid, budgetYear] : [employeeUuid];

  const query = `
    SELECT
      entitledDays,
      carriedForwardDays,
      usedDays,
      remainingDays,
      budgetYear,
      DATE_FORMAT(updated_at, '%Y-%m-%d') AS asOfDate
    FROM employeeLeaveBalances
    WHERE employee_uuid = ? ${budgetYearClause} AND status = 'ACTIVE'
    ORDER BY budgetYear DESC
    LIMIT 1
  `;

  const [rows] = await db.promise().execute(query, params);

  if (rows.length === 0) return null;

  const row = rows[0];
  return {
    entitledDays: Number(row.entitledDays),
    carriedForward: Number(row.carriedForwardDays),
    usedDays: Number(row.usedDays),
    remainingDays: Number(row.remainingDays),
    budgetYear: row.budgetYear,
    asOfDate: row.asOfDate,
  };
}

async function rebuildCurrentYearBalance(employeeUuid) {
  await ensureDecimalDayColumns();

  const currentBudgetYear = Number(
    (await getCurrentEthiopianBudgetYear()).year,
  );
  const conn = await db.promise().getConnection();

  try {
    await conn.beginTransaction();
    await upsertCurrentYearBalance(conn, employeeUuid, currentBudgetYear);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }

  return fetchBalance(employeeUuid);
}

async function rebuildCurrentYearBalancesForAllActiveEmployees() {
  await ensureDecimalDayColumns();

  const currentBudgetYear = Number(
    (await getCurrentEthiopianBudgetYear()).year,
  );
  const conn = await db.promise().getConnection();

  try {
    const [employeeRows] = await conn.execute(
      `
        SELECT uuid
        FROM Employees
        WHERE status = 'ACTIVE'
      `,
    );

    let succeededEmployees = 0;
    const failedEmployees = [];

    for (const row of employeeRows) {
      try {
        await conn.beginTransaction();
        await upsertCurrentYearBalance(conn, row.uuid, currentBudgetYear);
        await conn.commit();
        succeededEmployees += 1;
      } catch (error) {
        await conn.rollback();
        failedEmployees.push({
          uuid: row.uuid,
          message: error.message || "Failed to rebuild employee balance.",
        });
      }
    }

    return {
      budgetYear: currentBudgetYear,
      processedEmployees: employeeRows.length,
      succeededEmployees,
      failedEmployees: failedEmployees.length,
      failures: failedEmployees,
    };
  } catch (error) {
    throw error;
  } finally {
    conn.release();
  }
}

module.exports = {
  fetchBalance,
  rebuildCurrentYearBalance,
  rebuildCurrentYearBalancesForAllActiveEmployees,
  upsertCurrentYearBalance,
  computeCarryForwardDays,
};
