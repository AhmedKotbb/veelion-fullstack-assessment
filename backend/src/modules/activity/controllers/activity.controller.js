const aSvc = require('../services/activity.service');
const { validateCreateActivity } = require('../utils/activityValidator');

function get_activity(req, res) {
  const x = aSvc.getAllActivity();
  res.json(x);
}

function addActivity(req, res) {
  const payload = validateCreateActivity(req.body);
  const made = aSvc.createNewActivity(payload);
  res.status(201).json(made);
}

module.exports = {
  get_activity,
  addActivity,
};
