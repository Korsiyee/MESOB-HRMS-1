const { sendError } = require("../utils/response");

function notFoundHandler(req, res) {
  return sendError(res, {
    status: 404,
    message: "Route not found.",
    error: "NOT_FOUND",
  });
}

module.exports = notFoundHandler;
