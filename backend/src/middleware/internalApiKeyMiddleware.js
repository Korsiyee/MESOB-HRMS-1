const { sendError } = require("../utils/response");

function internalApiKeyMiddleware(req, res, next) {
  const expectedApiKey = process.env.INTERNAL_SYNC_API_KEY;
  if (!expectedApiKey) {
    return next();
  }

  const providedApiKey = String(req.headers["x-internal-api-key"] || "");
  if (providedApiKey !== expectedApiKey) {
    return sendError(res, {
      status: 401,
      message: "Unauthorized request.",
      error: "UNAUTHORIZED",
    });
  }

  return next();
}

module.exports = internalApiKeyMiddleware;
