class ApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.status = status || 500;
    this.code = code;
    this.details = details;
  }
}

module.exports = {
  ApiError,
};
