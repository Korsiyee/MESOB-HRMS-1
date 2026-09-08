const { sendError } = require("../utils/response");

function internalApiKeyMiddleware(req, res, next) {
  const expectedApiKey = process.env.INTERNAL_SYNC_API_KEY;
  
  // SECURITY: Fail closed - deny request if API key is not configured
  if (!expectedApiKey) {
    console.error('[SECURITY] INTERNAL_SYNC_API_KEY not configured - denying request');
    return sendError(res, {
      status: 503,
      message: "Service misconfigured - sync endpoint unavailable.",
      error: "SERVICE_UNAVAILABLE",
    });
  }

  const providedApiKey = String(req.headers["x-internal-api-key"] || "");
  if (providedApiKey !== expectedApiKey) {
    console.warn('[SECURITY] Invalid internal API key attempt');
    return sendError(res, {
      status: 401,
      message: "Unauthorized request.",
      error: "UNAUTHORIZED",
    });
  }

  return next();
}

module.exports = internalApiKeyMiddleware;
