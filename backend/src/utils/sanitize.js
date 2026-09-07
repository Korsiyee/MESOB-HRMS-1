function sanitizeString(value) {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim().replace(/\0/g, "");
}

function sanitizeUsername(value) {
  return sanitizeString(value);
}

module.exports = {
  sanitizeString,
  sanitizeUsername,
};
