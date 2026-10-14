const { rateLimit } = require('express-rate-limit');

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Reads stay unlimited. The cap is per connecting address: behind a proxy, every
// caller shares the proxy address unless that proxy is trusted.
const writeRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => !WRITE_METHODS.has(req.method),
  message: {
    error: {
      message: 'Too many requests',
    },
  },
});

module.exports = writeRateLimit;
