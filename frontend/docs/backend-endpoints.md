# Backend API Endpoints

Base URL: `http://localhost:4000`

## Shared Error Shape

```ts
type ErrorResponse = {
  error: {
    message: string;
  };
};
```

## Task Endpoints

### GET /tasks

Fetch all tasks.

```ts
type Task = {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string; // ISO datetime
  updatedAt: string; // ISO datetime
};

type GetTasksResponse = {
  data: Task[];
};
```

### GET /tasks/:id

Fetch one task by ID.

```ts
type GetTaskResponse = {
  data: Task;
};
```

Possible errors:
- `404` when task does not exist.

### POST /tasks

Create a task.

```ts
type CreateTaskRequest = {
  title: string; // required, trimmed, 4–200 characters
  completed?: boolean; // default false
};

type CreateTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is not an object.
- `400` when title is missing, not a string, empty, or outside 4–200 characters.
- `400` when completed is not a boolean.

### PATCH /tasks/:id

Update task title or status.

```ts
type PatchTaskRequest = {
  title?: string; // if provided, trimmed, 4–200 characters
  completed?: boolean;
};

type PatchTaskResponse = {
  data: Task;
};
```

Possible errors:
- `400` when body is invalid.
- `400` when no supported fields are provided.
- `404` when task does not exist.

### DELETE /tasks/:id

Delete task by ID.

```ts
type DeleteTaskResponse = void; // status 204
```

Possible errors:
- `404` when task does not exist.

## Activity Endpoints

This is the legacy activity shape. Current clients depend on it, so these two routes stay as they are.

```ts
type ActivityLog = {
  id: string; // UUID for new rows; older rows may still be a numeric string
  action?: string;
  info?: string;
  when: string; // ISO datetime. Tasks use createdAt; activity still uses when.
};

type GetActivityResponse = ActivityLog[]; // raw array, not { data: ActivityLog[] }
type CreateActivityResponse = ActivityLog; // raw object, not { data: ActivityLog }
```

New endpoints should return `{ data }` and use `createdAt`. Do not copy `when` or the unwrapped body. Moving activity itself onto that shape needs a versioned path first, so the clients of `GET /activity` and `POST /activity` keep working.

### GET /activity

Fetch activity logs.

With no query, the response is the full log, oldest first.

```ts
type GetActivityQuery = {
  limit?: number; // optional, integer, 1–100
};
```

When `limit` is set, the response contains at most that many entries, newest first. A limit above 100 is rejected. The stored file stays oldest first either way.

Possible errors:
- `400` when `limit` is present but is not an integer from 1 to 100.

### POST /activity

Create activity log entry.

```ts
type CreateActivityRequest = {
  action: string; // required, trimmed, 1–100 characters
  info?: string; // optional, trimmed, at most 1000 characters
};
```

Possible errors:
- `400` when body is not an object.
- `400` when `action` is missing, not a string, empty, or longer than 100 characters.
- `400` when `info` is present but not a string, or longer than 1000 characters.
- `400` when the body contains unsupported fields.

## Reports Endpoints

### GET /reports/tasks-summary

Fetch summary statistics for tasks and activity.

```ts
type TasksSummary = {
  total: number;
  byStatus: {
    todo: number;
    "in-progress": number;
    done: number;
  };
  recentActivityCount: number;
};

type GetTasksSummaryResponse = TasksSummary;
```

Notes:
- `in-progress` is currently returned as `0` because task data only includes boolean `completed`.
- Response shape is raw object.
