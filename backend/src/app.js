const express = require('express');
const helmet = require('helmet');
const cors = require('cors');

const { CORS_ORIGINS } = require('./config');
const tasksRouter = require('./modules/tasks/routes/tasks.routes');
const activityRouter = require('./modules/activity/routes/activity.routes');
const errorHandler = require('./middleware/errorHandler');
const writeRateLimit = require('./middleware/writeRateLimit');
const HttpError = require('./utils/httpError');

const JSON_BODY_LIMIT = '100kb';

const app = express();

// No authentication on these routes. Reach them through the Next.js proxy
// (frontend/app/api) or put an auth layer in front before exposing the process.
app.use(
  helmet({
    // The CORS allow-list is what decides browser access. same-origin CORP would block an allowed origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (requestOrigin && CORS_ORIGINS.includes(requestOrigin)) {
        callback(null, requestOrigin);
        return;
      }

      // No Origin header (server-side callers) or an origin that is not listed.
      // The request still runs; browsers simply get no CORS headers.
      callback(null, false);
    },
  })
);

app.use(writeRateLimit);
app.use(express.json({ limit: JSON_BODY_LIMIT }));

app.use('/tasks', tasksRouter);
app.use('/activity', activityRouter);

app.use((req, res, next) => {
  next(new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(errorHandler);

module.exports = app;
