function sendSuccess(res, { status = 200, message, data, meta } = {}) {
  const payload = { success: true };
  if (message) {
    payload.message = message;
  }
  if (data !== undefined) {
    payload.data = data;
  }
  if (meta !== undefined) {
    payload.meta = meta;
  }
  return res.status(status).json(payload);
}

function sendError(res, { status = 500, message, error, details } = {}) {
  const payload = {
    success: false,
    message: message || "Request failed.",
  };
  if (error) {
    payload.error = error;
  }
  if (details) {
    payload.details = details;
  }
  return res.status(status).json(payload);
}

module.exports = {
  sendSuccess,
  sendError,
};
