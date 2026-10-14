const aSvc = require('../services/activity.service');
const { validateCreateActivity } = require('../utils/activityValidator');

async function get_activity(req, res) {
  const x = await aSvc.getAllActivity();
  res.json(x);
}

async function addActivity(req, res) {
  const payload = validateCreateActivity(req.body);
  const made = await aSvc.createNewActivity(payload);
  res.status(201).json(made);
}

module.exports = {
  get_activity,
  addActivity,
};
