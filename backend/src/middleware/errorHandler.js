const { sendError } = require("../utils/response");

function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === "production";
  const message =
    status >= 500 ? "Internal server error." : err.message || "Request failed.";

  const payload = {
    status,
    message,
    error: err.code,
  };

  if (!isProduction) {
    if (err.details) {
      payload.details = err.details;
    } else if (status >= 500 && err.stack) {
      payload.details = err.stack;
    }
  }

  if (status >= 500) {
    console.error(err);
  }

  return sendError(res, payload);
}

module.exports = errorHandler;
