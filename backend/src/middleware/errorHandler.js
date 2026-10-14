const HttpError = require('../utils/httpError');

const JSON_PARSE_FAILED = 'entity.parse.failed';
const BODY_TOO_LARGE = 'entity.too.large';

// Other body-parser client errors. The text on these errors is parser output, so it stays on the server.
const OTHER_PARSER_FAILURES = new Set([
  'entity.verify.failed',
  'encoding.unsupported',
  'charset.unsupported',
  'request.aborted',
  'request.size.invalid',
]);

function sendError(res, statusCode, message, details) {
  const body = {
    error: {
      message,
    },
  };

  if (details) {
    body.error.details = details;
  }

  return res.status(statusCode).json(body);
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof HttpError) {
    if (error.statusCode >= 500) {
      console.error(error);
    }

    return sendError(res, error.statusCode, error.message, error.details);
  }

  if (error.type === BODY_TOO_LARGE || error.type === 'parameters.too.many') {
    return sendError(res, 413, 'Request body is too large');
  }

  if (error.type === JSON_PARSE_FAILED) {
    return sendError(res, 400, 'Invalid JSON');
  }

  if (OTHER_PARSER_FAILURES.has(error.type)) {
    return sendError(res, 400, 'Invalid request body');
  }

  console.error(error);
  return sendError(res, 500, 'Internal server error');
}

module.exports = errorHandler;
