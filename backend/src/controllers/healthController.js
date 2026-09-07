const { checkDatabaseConnection, isMockMode } = require("../config/db");
const { sendSuccess, sendError } = require("../utils/response");

exports.checkServiceHealth = (req, res) => {
  return sendSuccess(res, {
    status: 200,
    data: {
      service: "hrms-leave-service",
      status: "ok",
      uptime_seconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
    },
  });
};

exports.checkDatabaseHealth = async (req, res) => {
  try {
    const connected = await checkDatabaseConnection();
    return sendSuccess(res, {
      status: connected ? 200 : 503,
      data: {
        service: "database",
        connected,
        mode: isMockMode ? "mock" : "live",
      },
    });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    return sendError(res, {
      status: 503,
      message: "Database connectivity check failed.",
      error: "DB_UNAVAILABLE",
      details: isProduction ? undefined : error.message,
    });
  }
};
