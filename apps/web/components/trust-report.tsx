"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleCheck,
  CircleHelp,
  FileText,
  Fish,
  Loader2,
  SearchX,
  TriangleAlert,
} from "lucide-react";
import type { Citation, CitationStatus, Run } from "@/lib/contracts";
import { useSupabase } from "@/lib/supabase/client";
import { AuthControls } from "@/components/auth-controls";
import { Logo } from "@/components/logo";

type Report = { run: Run; citations: Citation[] };
const labels: Record<CitationStatus, string> = {
  verified: "Verified",
  partially_verified: "Partially verified",
  needs_review: "Needs review",
  not_found: "Not found",
  not_supported: "Not supported",
  retracted: "Retracted",
  pending: "Queued",
  checking: "Checking…",
  error: "Couldn't check",
};
function Status({ value }: { value: CitationStatus }) {
  const Icon =
    value === "verified"
      ? CircleCheck
      : ["pending", "checking"].includes(value)
        ? Loader2
        : value === "not_found"
          ? SearchX
          : TriangleAlert;
  return (
    <span className={`report-status status-${value}`}>
      <Icon
        size={14}
        className={
          ["pending", "checking"].includes(value) ? "animate-spin" : ""
        }
      />
      {labels[value]}
    </span>
  );
}
function url(value?: string) {
  try {
    const parsed = new URL(value || "");
    return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : null;
  } catch {
    return null;
  }
}

export function TrustReport({
  initial,
  live = true,
}: {
  initial: Report;
  live?: boolean;
}) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [syncError, setSyncError] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const supabase = useSupabase();
  const { run, citations } = data;
  const running = !["completed", "failed"].includes(run.status);
  useEffect(() => {
    if (!live || !running) return;
    let active = true,
      connected = false;
    let debounce: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function refresh() {
      try {
        const response = await fetch(`/api/v1/runs/${initial.run.id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const next = await response.json();
        if (!response.ok)
          throw new Error(
            next.error?.message || "Could not refresh this report.",
          );
        if (active) {
          setData(next);
          setSyncError("");
        }
      } catch (error) {
        if (active && !controller.signal.aborted)
          setSyncError(
            error instanceof Error ? error.message : "Connection interrupted.",
          );
      }
    }
    function changed() {
      clearTimeout(debounce);
      debounce = setTimeout(refresh, 100);
    }
    const channel = supabase
      .channel(`run:${initial.run.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "runs",
          filter: `id=eq.${initial.run.id}`,
        },
        changed,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "citations",
          filter: `run_id=eq.${initial.run.id}`,
        },
        changed,
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "evidence",
          filter: `run_id=eq.${initial.run.id}`,
        },
        changed,
      )
      .subscribe((status) => {
        connected = status === "SUBSCRIBED";
        if (active) setSubscribed(connected);
      });
    void refresh();
    const fallback = setInterval(() => {
      if (!connected) void refresh();
    }, 2000);
    return () => {
      active = false;
      controller.abort();
      clearTimeout(debounce);
      clearInterval(fallback);
      void supabase.removeChannel(channel);
    };
  }, [initial.run.id, live, running, supabase]);
  const flagged: CitationStatus[] = [
    "not_found",
    "not_supported",
    "retracted",
    "needs_review",
  ];
  const visible = citations.filter(
    (row) =>
      filter === "all" ||
      (filter === "flagged"
        ? flagged.includes(row.status)
        : row.status === filter),
  );
  const verified = citations.filter((row) => row.status === "verified").length;
  const flags = citations.filter((row) => flagged.includes(row.status)).length;
  const percent = run.totalCitations
    ? Math.min(100, (run.checkedCitations / run.totalCitations) * 100)
    : 0;
  return (
    <div className="report-screen">
      <header className="report-nav">
        <Logo />
        <nav>
          <Link href="/app/new">New check</Link>
          <Link href="/app?view=history">History</Link>
        </nav>
        <AuthControls />
      </header>
      <main id="main" className="report-main">
        <Link className="report-back" href="/app/new">
          <ArrowLeft size={15} />
          Workspace
        </Link>
        <div className="report-heading">
          <div>
            <span className="desk-eyebrow">TRUST REPORT</span>
            <h1>{run.title}</h1>
            <p>
              {new Date(run.createdAt).toLocaleString()} ·{" "}
              {run.inputType.toUpperCase()}
            </p>
          </div>
          <FileText size={44} strokeWidth={1} />
        </div>
        <div className="report-scope">
          <CircleHelp size={18} />
          <p>
            <strong>Existence checks only.</strong> Claim support and retraction
            checks are being connected. Open a reference to inspect what was
            checked.
          </p>
        </div>
        {run.status === "failed" && (
          <section className="report-error" role="alert">
            <strong>This check stopped.</strong>
            <p>{run.error}</p>
            <Link href="/app/new">Start a new check</Link>
          </section>
        )}
        <section className="report-summary" aria-label="Check summary">
          <div>
            <span>Checked</span>
            <strong>
              {run.checkedCitations}
              <small> / {run.totalCitations}</small>
            </strong>
          </div>
          <div>
            <span>Verified</span>
            <strong>{verified}</strong>
          </div>
          <div>
            <span>Flagged</span>
            <strong>{flags}</strong>
          </div>
          <div className="report-score">
            <span>Trust score</span>
            <strong>
              {run.trustScore === null ? "—" : `${run.trustScore}%`}
            </strong>
          </div>
        </section>
        <section className="report-live" aria-live="polite" aria-atomic="true">
          <div>
            <span>
              {running && <Loader2 size={15} className="animate-spin" />}
              {run.stageDetail || "Queued for checking"}
            </span>
            {running && (
              <small>
                {subscribed ? "Live updates" : "Checking for updates"}
              </small>
            )}
          </div>
          <div
            className="report-progress"
            role="progressbar"
            aria-label="References checked"
            aria-valuenow={run.checkedCitations}
            aria-valuemax={run.totalCitations || 1}
          >
            <span style={{ width: `${percent}%` }} />
          </div>
          <p className="report-meter">
            <Fish size={16} />
            TinyFish <span>Search {run.tinyfishUsage.search}</span>
            <span>Fetch {run.tinyfishUsage.fetch}</span>
            <span>Agent {run.tinyfishUsage.agent}</span>
            <span>Cache hits {run.tinyfishUsage.cacheHits}</span>
          </p>
        </section>
        {syncError && (
          <p className="report-error" role="alert">
            {syncError} Reconnecting…
          </p>
        )}
        <div className="report-filters" aria-label="Filter citations">
          {[
            ["all", "All"],
            ["flagged", "Flagged"],
            ["verified", "Verified"],
            ["not_found", "Not found"],
            ["needs_review", "Needs review"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <section
          className="report-citations"
          aria-label="References and evidence"
        >
          {!citations.length && (
            <div className="report-empty">
              {running ? (
                <>
                  <Loader2 className="animate-spin" />
                  <h2>Reading your document</h2>
                  <p>References appear here after extraction.</p>
                </>
              ) : (
                <>
                  <SearchX />
                  <h2>No references to display</h2>
                  <p>Add a bibliography or choose another document.</p>
                </>
              )}
            </div>
          )}
          {citations.length > 0 && visible.length === 0 && (
            <div className="report-empty">No references match this filter.</div>
          )}
          {visible.map((row) => (
            <details className="report-citation" key={row.id}>
              <summary>
                <span className="report-index">[{row.idx}]</span>
                <span className="report-reference">
                  <strong>{row.parsed.title || row.raw}</strong>
                  <small>
                    {row.parsed.authors.join("; ")}
                    {row.parsed.year ? ` (${row.parsed.year})` : ""}
                  </small>
                  <span>{row.reason || "Waiting for the live lookup"}</span>
                </span>
                <Status value={row.status} />
              </summary>
              <div className="report-evidence">
                <div className="report-verdicts">
                  <span>Exists: {row.existence.replaceAll("_", " ")}</span>
                  <span>Claim: {row.support.replaceAll("_", " ")}</span>
                  <span>Integrity: {row.integrity.replaceAll("_", " ")}</span>
                </div>
                {!!row.fieldDiffs?.length && (
                  <table>
                    <caption>Metadata differences</caption>
                    <thead>
                      <tr>
                        <th>Field</th>
                        <th>Cited</th>
                        <th>Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.fieldDiffs.map((diff) => (
                        <tr key={diff.field}>
                          <th>{diff.field}</th>
                          <td>{diff.cited ?? "—"}</td>
                          <td>{diff.actual ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {row.evidence?.map((item) => (
                  <article className="report-proof" key={item.id}>
                    <div>
                      <span className="report-api">
                        {item.api === "none"
                          ? "Identifier check"
                          : `${item.api[0].toUpperCase() + item.api.slice(1)} API`}
                      </span>
                      <strong>{item.sourceTitle || item.checkType}</strong>
                    </div>
                    {item.quote && <blockquote>“{item.quote}”</blockquote>}
                    <p>{item.explanation}</p>
                    {url(item.sourceUrl) && (
                      <a
                        href={url(item.sourceUrl)!}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open source <ArrowUpRight size={14} />
                      </a>
                    )}
                  </article>
                ))}
                {!row.evidence?.length && (
                  <p>Evidence will appear when this check finishes.</p>
                )}
              </div>
            </details>
          ))}
        </section>
        <footer className="report-footer">
          <Fish size={16} /> Built on TinyFish{" "}
          <span>Every verdict stays attached to its evidence.</span>
        </footer>
      </main>
    </div>
  );
}
