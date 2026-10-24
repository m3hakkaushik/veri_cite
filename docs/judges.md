# VeriCite — judge pitch

**Team Savencia · Mehak and Nitesh · HackIIITD 2026**

**One line:** Every citation and claim, checked against the live web—with the evidence attached.

## Three-minute spoken pitch

Target: about 390 words, delivered at 140–150 words per minute. The timings
include a few seconds to point at the interface. Read the script, not the
follow-up notes below.

### 0:00–0:25 — The problem

A citation is a promise: the source exists, and it says what the author claims.
But a convincing reference can lead to a nonexistent paper, a misquoted result,
or work that has been retracted. Checking every reference manually means
searching, opening papers, finding passages, and checking publisher notices.
Students and reviewers need a faster way to inspect that evidence.

### 0:25–1:00 — What we are building and the user journey

We’re building VeriCite, a live citation and claim verification engine.

Imagine a student finishing a literature review. They sign in, upload a PDF
or BibTeX file, or paste their draft. VeriCite is designed to return a live
Trust Report: which references exist, whether they support the linked claims,
and whether they have been retracted or corrected.

The student opens a flag, sees the relevant passage and original source,
reviews a proposed correction, and exports corrected BibTeX. A bibliography
alone gets existence and integrity checks; claim support needs the citing text.

### 1:00–1:40 — How it works and why TinyFish matters

Gemini extracts references and links them to claims. TinyFish is our only
verification web-access layer: Search finds candidate papers, Fetch reads
sources, and Agent investigates ambiguous publisher notices within a strict
budget. RapidFuzz compares metadata and checks that quoted passages actually
occur in the fetched text.

Our rule is simple: no quote, no supported verdict. Missing evidence stays
uncertain. Grounded Answer follows the same idea: answer a question only from
retrieved pages, with validated supporting quotes. Recent-news checks are a
later extension.

### 1:40–2:15 — How we are building it and why this stack

Next.js and TypeScript give us the web interface and a shared API for future
mobile clients. Tailwind and shadcn give us accessible interface primitives.
Clerk handles identity. Hosted Supabase provides Postgres, private file storage,
and realtime updates with row-level access control.

A separate Python FastAPI worker handles longer verification jobs and the
Python parsing and matching libraries. Gemini handles PDF extraction directly,
so we need no Docker parser service. We chose managed services to spend the
hackathon on verification rather than infrastructure.

### 2:15–2:50 — Impact, feasibility, and the close

The intended impact is practical: help students correct references before
submission, give researchers a preflight audit, and give reviewers inspectable
evidence. We will measure citation accuracy, false flags, and completion time;
our target is a forty-reference audit within three minutes, not a result we
claim to have achieved yet.

Caching, batched fetching, rate limits, and capped Agent calls keep the design
feasible. Today, our parser and live reference lookup pass hosted checks;
claim verification and deployment are next.

VeriCite helps people inspect a citation’s promise—with the evidence attached.

## What to show while speaking

| Moment | Action | What the judge should understand |
|---|---|---|
| User journey | Open the workspace; load the example draft | PDF, BibTeX, text, and questions have a clear entry point |
| How it works | Open the brief “How it works” help | Search, Fetch, and Agent have distinct roles |
| Evidence rule | Point to “No quote, no supported verdict” | The design requires inspectable evidence |
| Current build | Advance from input to Review | Existence runs pass hosted smoke checks; claim auditing and the deployed journey remain pending |

**Once the live pipeline is verified:** replace the preview walkthrough with a
real run, expand its evidence, and export its actual corrected BibTeX. Update
the spoken build-status sentence only after the deployed journey succeeds.

## Short answers for follow-up questions

### Why this problem rather than plagiarism detection?

The question here is whether a reference resolves and supports a particular
claim. An originality check answers a different question. VeriCite focuses on
the source-to-claim connection and leaves the evidence available for human
review. We do not claim that no competing product offers related capabilities.

### Why these technologies instead of the alternatives?

| Choice | Reason for this project | Tradeoff / alternative considered |
|---|---|---|
| Next.js + TypeScript | One web codebase for the UI and public API; clear shared contracts | A separate SPA and API would add deployment and integration work |
| Tailwind + shadcn | Brand control with accessible, editable primitives | Bespoke controls would take more time to build and validate |
| Hosted Supabase | Relational evidence records, private uploads, realtime updates, and RLS together | Self-hosting Postgres plus storage and a realtime layer adds operations work |
| Clerk | Managed Google/email identity and the planned mobile integration | Another identity provider could work; this is the locked project choice |
| FastAPI + Python | Longer-running jobs plus the selected Python SDK/parsing/matching ecosystem | Keeping all work in web request handlers would couple the UI to job runtime limits |
| Gemini | Structured extraction/judgment and direct PDF input behind a provider interface | It can make mistakes; outputs still require evidence validation. Other models can replace it later |
| TinyFish | The required live Search/Fetch/Agent integration behind one gateway | Other retrieval services are deliberately excluded from verification |
| RapidFuzz | Deterministic title and quote matching after retrieval | Text similarity is a guardrail, not proof that a claim follows logically |

### What makes it feasible within a hackathon?

Deliver the smallest real journey first: parse one input, check existence,
persist progress, show evidence, then add support, integrity, fixes, and
Grounded Answer. Use hosted Supabase and Gemini PDF input; no Docker or local
Supabase stack. Cache shared metadata, batch Fetch calls, and cap paid Agent
escalations. Search/Fetch have free allowances, not unlimited free usage.

### How do you avoid replacing one hallucination with another?

The model judges fetched source text, not its remembered knowledge. A support
quote must pass the specified fuzzy-match threshold of at least 90. An absent
or invalid quote downgrades the result. Inaccessible text and ambiguous notices
remain uncertain. Even a matching quote can be misinterpreted, so the report
must expose the passage and source for human review.

### What are the limits and how will impact be measured?

Paywalls, extraction failures, missing notices, ambiguous metadata, and model
judgment errors can limit coverage. The system is a research aid, not a
guarantee of scientific correctness. Evaluate known real/fabricated references,
misquotes, and public retractions; measure recall, false-not-found rate,
quote-validation failures, latency, cache benefit, and API usage. Numerical
goals in the PRD are targets until the evaluation is run.

### Who could adopt or pay for it later?

Start with students and researchers checking work before submission. Potential
later users include university libraries, reviewers, conferences, and
publishers. Fair-use student access, researcher subscriptions, and institutional
licensing are hypotheses to validate—not existing customers or revenue.

## Build truthfulness checklist

- Demonstrate only features that work in the current build.
- Label the live pipeline, authentication, exports, and deployment as pending
  until their acceptance checks pass.
- Never present an illustrative diagram as a real verification result.
- Do not quote accuracy, time savings, customer numbers, or API-cost savings
  as measured outcomes without an actual evaluation.
- The source of truth for progress is [CHANGELOG.md](CHANGELOG.md).
