const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
// Ethiopian phone numbers: 10 digits, optionally starting with +251 or 0
const ETHIOPIAN_PHONE_REGEX = /^(?:\+251|0)?([0-9]{9})$/;
// Standard email validation
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidFullName(value) {
  if (typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }
  // Split by one or more spaces and filter out empty strings
  const parts = trimmed.split(/\s+/).filter(part => part.length > 0);
  // Must have at least 2 name parts
  return parts.length >= 2;
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

/**
 * Validates Ethiopian phone numbers
 * Accepts:
 * - 10 digits: 0912345678
 * - 9 digits with +251: +251912345678
 * - 9 digits with 0: will be normalized to 10 digits
 * Returns normalized 10-digit format if valid, null otherwise
 */
function isValidEthiopianPhone(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  const cleaned = value.trim().replace(/[\s-]/g, ""); // Remove spaces and dashes
  const match = cleaned.match(ETHIOPIAN_PHONE_REGEX);
  if (!match) {
    return false;
  }
  // Must be exactly 10 digits when normalized (starting with 0)
  const normalized = "0" + match[1];
  return normalized.length === 10;
}

/**
 * Normalizes Ethiopian phone number to 10-digit format starting with 0
 */
function normalizeEthiopianPhone(value) {
  if (!value || typeof value !== "string") {
    return null;
  }
  const cleaned = value.trim().replace(/[\s-]/g, "");
  const match = cleaned.match(ETHIOPIAN_PHONE_REGEX);
  if (!match) {
    return null;
  }
  return "0" + match[1];
}

/**
 * Validates email address format
 */
function isValidEmail(value) {
  if (!value || typeof value !== "string") {
    return false;
  }
  const trimmed = value.trim();
  return EMAIL_REGEX.test(trimmed);
}

module.exports = {
  isNonEmptyString,
  isValidFullName,
  isValidUuid,
  isValidIsoDate,
  isValidEthiopianPhone,
  normalizeEthiopianPhone,
  isValidEmail,
};
