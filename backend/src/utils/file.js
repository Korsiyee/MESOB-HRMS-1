const path = require("path");

function sanitizeFileName(name) {
  const baseName = String(name || "file")
    .trim()
    .replace(/\\/g, "/")
    .split("/")
    .pop();

  const safeBase = (baseName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  return safeBase;
}

function getFileExtension(name) {
  return path.extname(name || "");
}

module.exports = {
  sanitizeFileName,
  getFileExtension,
};
