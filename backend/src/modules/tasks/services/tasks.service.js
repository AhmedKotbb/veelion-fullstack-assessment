const path = require('node:path');

const { DATA_DIR } = require('../../../config');
const { createId } = require('../../../utils/id');
const {
  readJsonArray,
  modifyJsonArray,
  ensureJsonArrayFile,
} = require('../../../utils/jsonStore');
const HttpError = require('../../../utils/httpError');
const { assertStatusTransition } = require('../utils/taskValidator');
const activityService = require('../../activity/services/activity.service');

const TASKS_FILE_PATH = path.join(DATA_DIR, 'tasks.json');

function recordTaskActivity(action, task) {
  return activityService.createNewActivity({
    action,
    info: `${task.id} ${task.title}`,
  });
}

function saveTaskChange(mutator, action) {
  return modifyJsonArray(TASKS_FILE_PATH, mutator, (task) => {
    recordTaskActivity(action, task);
  });
}

function buildTaskRecord(payload) {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title: payload.title,
    status: payload.status,
    createdAt: now,
    updatedAt: now,
  };
}

async function getAllTasks() {
  return readJsonArray(TASKS_FILE_PATH);
}

async function getTaskById(taskId) {
  const tasks = await readJsonArray(TASKS_FILE_PATH);
  const task = tasks.find((item) => item.id === taskId);

  if (!task) {
    throw new HttpError(404, 'Task not found.');
  }

  return task;
}

async function createTask(payload) {
  return saveTaskChange((tasks) => {
    const newTask = buildTaskRecord(payload);
    tasks.push(newTask);
    return newTask;
  }, 'task.created');
}

async function updateTask(taskId, updates) {
  return saveTaskChange((tasks) => {
    const taskIndex = tasks.findIndex((item) => item.id === taskId);

    if (taskIndex === -1) {
      throw new HttpError(404, 'Task not found.');
    }

    const existingTask = tasks[taskIndex];
    const updatedTask = {
      ...existingTask,
      updatedAt: new Date().toISOString(),
    };

    if (Object.hasOwn(updates, 'title')) {
      updatedTask.title = updates.title;
    }

    if (Object.hasOwn(updates, 'status')) {
      assertStatusTransition(existingTask.status, updates.status);
      updatedTask.status = updates.status;
    }

    tasks[taskIndex] = updatedTask;
    return updatedTask;
  }, 'task.updated');
}

async function deleteTask(taskId) {
  return saveTaskChange((tasks) => {
    const taskIndex = tasks.findIndex((item) => item.id === taskId);

    if (taskIndex === -1) {
      throw new HttpError(404, 'Task not found.');
    }

    const [removedTask] = tasks.splice(taskIndex, 1);
    return removedTask;
  }, 'task.deleted');
}

function ensureTasksFile() {
  return ensureJsonArrayFile(TASKS_FILE_PATH);
}

module.exports = {
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  ensureTasksFile,
};
