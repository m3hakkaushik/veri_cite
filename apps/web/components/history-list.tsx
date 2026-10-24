"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, FileText, Loader2 } from "lucide-react";
import type { Run } from "@/lib/contracts";

export function HistoryList() {
  const [runs, setRuns] = useState<Run[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/v1/runs", { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error?.message || "Could not load reports.");
        setRuns(data.runs);
        setCursor(data.nextCursor);
      })
      .catch((error) => {
        if (error.name !== "AbortError") setError(error.message);
      });
    return () => controller.abort();
  }, []);
  async function more() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/v1/runs?cursor=${encodeURIComponent(cursor || "")}`,
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error?.message || "Could not load reports.");
      setRuns((current) => [...(current || []), ...data.runs]);
      setCursor(data.nextCursor);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Could not load reports.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="report-history" aria-label="Your saved reports">
      {error && (
        <p role="alert" className="report-error">
          {error}
        </p>
      )}
      {!runs && !error && (
        <p role="status">
          <Loader2 size={18} className="animate-spin" /> Loading your reports…
        </p>
      )}
      {runs?.length === 0 && (
        <p>No reports yet. Start a new check to save your first report.</p>
      )}
      {runs?.map((run) => (
        <Link className="history-row" href={`/app/runs/${run.id}`} key={run.id}>
          <FileText size={22} />
          <span>
            <strong>{run.title}</strong>
            <small>
              {new Date(run.createdAt).toLocaleString()} ·{" "}
              {run.inputType.toUpperCase()}
            </small>
          </span>
          <span className={`report-status status-${run.status}`}>
            {run.status}
          </span>
          <b>{run.trustScore === null ? "—" : `${run.trustScore}%`}</b>
          <ArrowUpRight size={16} />
        </Link>
      ))}
      {cursor && (
        <button className="desk-secondary" disabled={busy} onClick={more}>
          {busy ? "Loading…" : "Load more"}
        </button>
      )}
    </section>
  );
}
