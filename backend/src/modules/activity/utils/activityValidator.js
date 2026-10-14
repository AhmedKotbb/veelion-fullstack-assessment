const HttpError = require('../../../utils/httpError');

const ALLOWED_FIELDS = ['action', 'info'];
const ACTION_MAX_LENGTH = 100;
const INFO_MAX_LENGTH = 1000;
const ACTIVITY_LIMIT_MAX = 100;

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

function normalizeAction(payload, normalized) {
  if (!Object.hasOwn(payload, 'action')) {
    throw new HttpError(400, '"action" is required.', { field: 'action' });
  }

  if (typeof payload.action !== 'string') {
    throw new HttpError(400, '"action" must be a string.', { field: 'action' });
  }

  const trimmedAction = payload.action.trim();
  if (!trimmedAction) {
    throw new HttpError(400, '"action" cannot be empty.', { field: 'action' });
  }

  if (trimmedAction.length > ACTION_MAX_LENGTH) {
    throw new HttpError(400, `"action" must be at most ${ACTION_MAX_LENGTH} characters.`, {
      field: 'action',
    });
  }

  normalized.action = trimmedAction;
}

function normalizeInfoIfPresent(payload, normalized) {
  if (!Object.hasOwn(payload, 'info')) {
    return;
  }

  if (typeof payload.info !== 'string') {
    throw new HttpError(400, '"info" must be a string.', { field: 'info' });
  }

  const trimmedInfo = payload.info.trim();
  if (trimmedInfo.length > INFO_MAX_LENGTH) {
    throw new HttpError(400, `"info" must be at most ${INFO_MAX_LENGTH} characters.`, {
      field: 'info',
    });
  }

  normalized.info = trimmedInfo;
}

function parseActivityLimit(value) {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new HttpError(400, `"limit" must be a positive integer up to ${ACTIVITY_LIMIT_MAX}.`, {
      field: 'limit',
    });
  }

  const limit = Number(value);
  if (limit > ACTIVITY_LIMIT_MAX) {
    throw new HttpError(400, `"limit" must be at most ${ACTIVITY_LIMIT_MAX}.`, {
      field: 'limit',
    });
  }

  return limit;
}

function validateCreateActivity(payload) {
  validatePayloadShape(payload);
  ensureNoUnknownFields(payload);

  const normalized = {};
  normalizeAction(payload, normalized);
  normalizeInfoIfPresent(payload, normalized);

  return normalized;
}

module.exports = {
  validateCreateActivity,
  parseActivityLimit,
};
