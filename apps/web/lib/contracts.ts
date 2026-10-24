export type InputType = "text" | "pdf" | "bib" | "url";
export type RunStatus =
  "queued" | "parsing" | "checking" | "completed" | "failed";
export type CitationStatus =
  | "pending"
  | "checking"
  | "verified"
  | "partially_verified"
  | "needs_review"
  | "not_found"
  | "not_supported"
  | "retracted"
  | "error";
export type CheckName = "existence" | "support" | "integrity" | "currency";

export interface RunOptions {
  checks: CheckName[];
  recencyMinutes?: number;
}

export interface Run {
  id: string;
  title: string;
  inputType: InputType;
  status: RunStatus;
  stageDetail?: string;
  totalCitations: number;
  checkedCitations: number;
  counts: Partial<Record<CitationStatus, number>>;
  trustScore: number | null;
  tinyfishUsage: {
    search: number;
    fetch: number;
    agent: number;
    cacheHits: number;
  };
  shareId?: string | null;
  createdAt: string;
  completedAt?: string | null;
  error?: string | null;
}

export interface Citation {
  id: string;
  idx: number;
  bibKey?: string;
  raw: string;
  parsed: {
    title?: string;
    authors: string[];
    year?: number;
    venue?: string;
    doi?: string;
    arxivId?: string;
    url?: string;
  };
  status: CitationStatus;
  existence: string;
  support: string;
  integrity: string;
  reason?: string;
  matched?: {
    title: string;
    authors: string[];
    year?: number;
    venue?: string;
    doi?: string;
    url?: string;
    pdfUrl?: string;
    citedByCount?: number;
  } | null;
  fieldDiffs?: { field: string; cited: string | null; actual: string | null }[];
  fix?: {
    type: "canonical" | "claim" | "remove";
    payload?: unknown;
    appliedAt: string;
  } | null;
  claims?: Claim[];
  evidence?: Evidence[];
}

export interface Claim {
  id: string;
  text: string;
  context?: string;
  support: string;
  currency: string;
  suggestedFix?: { find: string; replace: string } | null;
}

export interface Evidence {
  id: string;
  checkType:
    | "identifier"
    | "existence"
    | "support"
    | "integrity"
    | "currency"
    | "answer";
  verdict: string;
  api: "search" | "fetch" | "agent" | "none";
  sourceUrl?: string;
  sourceTitle?: string;
  publisher?: string;
  publishedAt?: string;
  quote?: string;
  explanation?: string;
  confidence?: number;
}
