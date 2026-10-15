const reportsService = require('../services/reports.service');

async function getTasksSummary(req, res) {
  const summary = await reportsService.getTasksSummary();
  res.status(200).json(summary);
}

module.exports = {
  getTasksSummary,
};
