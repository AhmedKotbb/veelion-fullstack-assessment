const HttpError = require('../../../utils/httpError');

const ALLOWED_FIELDS = ['title', 'status'];
const TASK_STATUSES = ['todo', 'in-progress', 'done'];
const DEFAULT_STATUS = 'todo';
const STATUS_TRANSITIONS = {
  todo: ['in-progress'],
  'in-progress': ['todo', 'done'],
  done: ['in-progress'],
};
const TITLE_MIN_LENGTH = 4;
const TITLE_MAX_LENGTH = 200;

function validatePayloadShape(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new HttpError(400, 'Body must be a JSON object.', { field: 'body' });
  }
}

function ensureNoUnknownFields(payload) {
  const unknownFields = Object.keys(payload).filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    throw new HttpError(400, 'Body contains unsupported fields.', {
      unsupportedFields: unknownFields,
    });
  }
}

function normalizeTitleIfPresent(payload, normalized) {
  if (!Object.hasOwn(payload, 'title')) {
    return;
  }

  if (typeof payload.title !== 'string') {
    throw new HttpError(400, '"title" must be a string.', { field: 'title' });
  }

  const trimmedTitle = payload.title.trim();
  if (!trimmedTitle) {
    throw new HttpError(400, '"title" cannot be empty.', { field: 'title' });
  }

  if (trimmedTitle.length < TITLE_MIN_LENGTH || trimmedTitle.length > TITLE_MAX_LENGTH) {
    throw new HttpError(
      400,
      `"title" must be between ${TITLE_MIN_LENGTH} and ${TITLE_MAX_LENGTH} characters.`,
      { field: 'title' }
    );
  }

  normalized.title = trimmedTitle;
}

function normalizeStatusIfPresent(payload, normalized) {
  if (!Object.hasOwn(payload, 'status')) {
    return;
  }

  if (!TASK_STATUSES.includes(payload.status)) {
    throw new HttpError(
      400,
      '"status" must be one of "todo", "in-progress", or "done".',
      { field: 'status' }
    );
  }

  normalized.status = payload.status;
}

function assertStatusTransition(currentStatus, nextStatus) {
  const allowedNext = STATUS_TRANSITIONS[currentStatus] || [];

  if (allowedNext.includes(nextStatus)) {
    return;
  }

  throw new HttpError(
    400,
    '"status" can only move between "todo" and "in-progress", or between "in-progress" and "done".',
    { field: 'status', from: currentStatus, to: nextStatus }
  );
}

function validateCreateTask(payload) {
  validatePayloadShape(payload);
  ensureNoUnknownFields(payload);

  const normalized = {};
  normalizeTitleIfPresent(payload, normalized);
  normalizeStatusIfPresent(payload, normalized);

  if (!Object.hasOwn(normalized, 'title')) {
    throw new HttpError(400, '"title" is required.', { field: 'title' });
  }

  if (!Object.hasOwn(normalized, 'status')) {
    normalized.status = DEFAULT_STATUS;
  }

  return normalized;
}

function validateUpdateTask(payload) {
  validatePayloadShape(payload);
  ensureNoUnknownFields(payload);

  const normalized = {};
  normalizeTitleIfPresent(payload, normalized);
  normalizeStatusIfPresent(payload, normalized);

  if (Object.keys(normalized).length === 0) {
    throw new HttpError(400, 'Provide at least one updatable field.', {
      fields: ALLOWED_FIELDS,
    });
  }

  return normalized;
}

module.exports = {
  validateCreateTask,
  validateUpdateTask,
  assertStatusTransition,
};
