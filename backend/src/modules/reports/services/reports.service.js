const tasksService = require('../../tasks/services/tasks.service');
const activityService = require('../../activity/services/activity.service');

const STATUS_KEYS = ['todo', 'in-progress', 'done'];

// Rolling window from the moment of the request, not a calendar day.
const RECENT_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

function countTasksByStatus(tasks) {
  const byStatus = {
    todo: 0,
    'in-progress': 0,
    done: 0,
  };

  for (const task of tasks) {
    if (STATUS_KEYS.includes(task.status)) {
      byStatus[task.status] += 1;
    }
  }

  return byStatus;
}

function countRecentActivity(entries, nowMs) {
  const cutoffMs = nowMs - RECENT_ACTIVITY_WINDOW_MS;
  let count = 0;

  for (const entry of entries) {
    const whenMs = Date.parse(entry.when);

    if (Number.isNaN(whenMs) || whenMs < cutoffMs) {
      continue;
    }

    count += 1;
  }

  return count;
}

async function getTasksSummary() {
  const [tasks, activity] = await Promise.all([
    tasksService.getAllTasks(),
    activityService.getAllActivity(),
  ]);

  return {
    total: tasks.length,
    byStatus: countTasksByStatus(tasks),
    recentActivityCount: countRecentActivity(activity, Date.now()),
  };
}

module.exports = {
  getTasksSummary,
};
