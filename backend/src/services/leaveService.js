function getCompletedYears(startDate, endDate) {
  // Ensure dates are Date objects
  const start = startDate instanceof Date ? startDate : new Date(startDate);
  const end = endDate instanceof Date ? endDate : new Date(endDate);

  let years = end.getUTCFullYear() - start.getUTCFullYear();

  if (
    end.getUTCMonth() < start.getUTCMonth() ||
    (end.getUTCMonth() === start.getUTCMonth() &&
      end.getUTCDate() < start.getUTCDate())
  ) {
    years -= 1;
  }

  return Math.max(0, years);
}

function calculateEntitledDays(policy, yearsOfService) {
  const base = Number(policy.baseDays || 0);
  const increment = Number(policy.incrementPerYear || 0);
  const maxDays = Number(policy.maxDays || 0);
  const serviceYears = Math.max(1, Number(yearsOfService || 0));

  const calculated = base + Math.max(0, serviceYears - 1) * increment;
  if (maxDays > 0) {
    return Math.min(calculated, maxDays);
  }

  return calculated;
}

async function getAnnualPolicy(conn) {
  const [rows] = await conn.execute(
    `
      SELECT baseDays, incrementPerYear, maxDays
      FROM leavePolicies
      WHERE leaveType = 'Annual'
      LIMIT 1
    `,
  );
  return rows[0] || null;
}

module.exports = {
  getCompletedYears,
  calculateEntitledDays,
  getAnnualPolicy,
};
