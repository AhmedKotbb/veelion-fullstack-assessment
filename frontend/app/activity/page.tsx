"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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

export default function ActivityPage() {
  const [allActivity, setAllActivity] = useState<ActivityLog[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function formatTimeA(value: string) {
    return new Date(value).toLocaleString();
  }

  function formatTimeB(value: string) {
    return new Date(value).toLocaleString();
  }

  function applyFilterA(items: ActivityLog[], text: string) {
    if (!text) {
      return items;
    }

    const lower = text.toLowerCase();
    return items.filter(
      (item) =>
        (item.action || "").toLowerCase().includes(lower) ||
        (item.info || "").toLowerCase().includes(lower)
    );
  }

  function applyFilterB(items: ActivityLog[], text: string) {
    if (!text) {
      return items;
    }

    const lower = text.toLowerCase();
    return items.filter(
      (item) =>
        (item.action || "").toLowerCase().indexOf(lower) !== -1 ||
        (item.info || "").toLowerCase().indexOf(lower) !== -1
    );
  }

  const loadActivity = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await requestJson<ActivityLog[]>("/api/activity");

      if (!Array.isArray(data)) {
        setAllActivity([]);
        setError("Activity response was not a list.");
        return;
      }

      setAllActivity((current) => (sameActivity(current, data) ? current : data));
      setError("");
    } catch (caught) {
      setAllActivity([]);
      setError(messageFrom(caught));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  const visibleActivity = applyFilterB(applyFilterA(allActivity, query), query);

  return (
    <main className="stack">
      <nav>
        <Link href="/" className="button">
          Back
        </Link>
      </nav>

      <section className="card" style={{ padding: "1rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.8rem",
            marginBottom: "0.75rem",
          }}
        >
          <h1 style={{ margin: 0 }}>Activity Feed</h1>
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
        />
      </section>

      {loading ? (
        <section className="card" style={{ padding: "1rem" }}>
          <p role="status" style={{ margin: 0 }}>
            Loading activity...
          </p>
        </section>
      ) : null}

      {error ? (
        <section className="card" style={{ padding: "1rem", borderColor: "#e3b4c0", background: "#fff8fa" }}>
          <p role="alert" style={{ marginTop: 0, marginBottom: "0.75rem", color: "var(--danger)" }}>
            {error}
          </p>
          <button type="button" className="button" onClick={() => void loadActivity()}>
            Retry
          </button>
        </section>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="card" style={{ padding: "1rem" }}>
            <small style={{ color: "var(--muted)" }}>
              Total: {allActivity.length} | Visible: {visibleActivity.length}
            </small>
          </section>

          <section className="card" style={{ padding: "1rem" }}>
            {allActivity.length === 0 ? (
              <p style={{ margin: 0, color: "var(--muted)" }}>No activity yet</p>
            ) : (
              <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.7rem" }}>
                {visibleActivity.map((item) => (
                  <li key={item.id} style={{ borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem" }}>
                    <div style={{ fontWeight: 600 }}>{item.action || "(no action)"}</div>
                    <div>{item.info || "(no info)"}</div>
                    <small style={{ color: "var(--muted)" }}>{formatTimeA(item.when)}</small>
                    <br />
                    <small style={{ color: "var(--muted)" }}>{formatTimeB(item.when)}</small>
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
