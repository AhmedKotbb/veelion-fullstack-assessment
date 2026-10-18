"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { requestJson } from "@/lib/apiClient";
import type { ActivityLog } from "@/types/api";

function sameActivity(left: ActivityLog[], right: ActivityLog[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((item, index) => {
    const other = right[index];
    return (
      item.id === other.id &&
      item.action === other.action &&
      item.info === other.info &&
      item.when === other.when
    );
  });
}

function messageFrom(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "Could not load activity.";
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function filterActivity(items: ActivityLog[], text: string) {
  const query = text.trim().toLowerCase();
  if (!query) {
    return items;
  }

  return items.filter(
    (item) =>
      (item.action || "").toLowerCase().includes(query) ||
      (item.info || "").toLowerCase().includes(query)
  );
}

export default function ActivityPage() {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await requestJson<ActivityLog[]>("/api/activity");

      if (!Array.isArray(data)) {
        setActivity([]);
        setError("Activity response was not a list.");
        return;
      }

      setActivity((current) => (sameActivity(current, data) ? current : data));
      setError("");
    } catch (caught) {
      setActivity([]);
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const visibleActivity = useMemo(() => filterActivity(activity, query), [activity, query]);

  return (
    <main className="stack">
      <section className="card card-body">
        <div className="panel-header panel-header-spaced">
          <h1 className="heading">Activity Feed</h1>
          <button
            type="button"
            className="button primary"
            onClick={() => void loadActivity()}
            disabled={loading}
          >
            Sync
          </button>
        </div>

        <input
          className="input"
          placeholder="Search activity"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search activity"
        />
      </section>

      {loading ? (
        <section className="card card-body">
          <p role="status" className="message">
            Loading activity...
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="card card-body error-box">
          <p role="alert" className="alert-block">
            {error}
          </p>
          <button type="button" className="button" onClick={() => void loadActivity()}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="card card-body">
            <small className="muted">
              Total: {activity.length} | Visible: {visibleActivity.length}
            </small>
          </section>

          <section className="card card-body">
            {activity.length === 0 ? (
              <p className="message muted">No activity yet</p>
            ) : visibleActivity.length === 0 ? (
              <p className="message muted">No activity matches your search</p>
            ) : (
              <ul className="list">
                {visibleActivity.map((item) => (
                  <li key={item.id} className="activity-item">
                    <div className="strong">{item.action || "(no action)"}</div>
                    <div>{item.info || "(no info)"}</div>
                    <small className="muted">{formatTime(item.when)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}
