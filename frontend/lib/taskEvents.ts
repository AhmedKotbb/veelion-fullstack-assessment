export const OPEN_CREATE_TASK = "task-tracker:open-create";

export function openCreateTask() {
  window.dispatchEvent(new Event(OPEN_CREATE_TASK));
}
