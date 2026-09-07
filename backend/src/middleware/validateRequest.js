const { sendError } = require("../utils/response");
const { isNonEmptyString } = require("../utils/validation");
const { sanitizeString } = require("../utils/sanitize");

function validateRequest({
  required = [],
  validators = {},
  sanitize = [],
} = {}) {
  return (req, res, next) => {
    const body = req.body || {};
    const missing = required.filter((field) => !isNonEmptyString(body[field]));
    if (missing.length > 0) {
      return sendError(res, {
        status: 400,
        message: "Validation failed.",
        error: "VALIDATION_ERROR",
        details: { missing },
      });
    }

    sanitize.forEach((field) => {
      if (body[field] !== undefined) {
        body[field] = sanitizeString(body[field]);
      }
    });

    for (const [field, validator] of Object.entries(validators)) {
      if (body[field] === undefined || body[field] === null) {
        continue;
      }
      if (!validator(body[field])) {
        return sendError(res, {
          status: 400,
          message: "Validation failed.",
          error: "VALIDATION_ERROR",
          details: { field },
        });
      }
    }

    req.body = body;
    return next();
  };
}

module.exports = validateRequest;
