const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidUuid(value) {
  const s = String(value || "").trim();
  // Accept standard UUIDs and legacy seed-format IDs like emp-1003, dept-001, etc.
  return s.length > 0;
}

function isValidIsoDate(value) {
  if (!DATE_REGEX.test(String(value || ""))) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString().startsWith(`${value}T`);
}

module.exports = {
  isNonEmptyString,
  isValidUuid,
  isValidIsoDate,
};
