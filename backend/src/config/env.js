const dotenv = require("dotenv");

dotenv.config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getEnv(name, defaultValue) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    return defaultValue;
  }
  return value;
}

function getIntEnv(name, defaultValue) {
  const value = getEnv(name, undefined);
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

function getBoolEnv(name, defaultValue) {
  const value = getEnv(name, undefined);
  if (value === undefined) {
    return defaultValue;
  }
  return ["true", "1", "yes", "y"].includes(String(value).toLowerCase());
}

module.exports = {
  requireEnv,
  getEnv,
  getIntEnv,
  getBoolEnv,
};
