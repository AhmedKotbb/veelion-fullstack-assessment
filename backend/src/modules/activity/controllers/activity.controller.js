const activityService = require('../services/activity.service');
const { parseActivityLimit, validateCreateActivity } = require('../utils/activityValidator');

async function listActivity(req, res) {
  const limit = parseActivityLimit(req.query.limit);
  const entries = await activityService.getAllActivity(limit);
  res.json(entries);
}

async function createActivity(req, res) {
  const payload = validateCreateActivity(req.body);
  const entry = await activityService.createNewActivity(payload);
  res.status(201).json(entry);
}

module.exports = {
  listActivity,
  createActivity,
};
