# 01 — Problem Statement

## Statement

> Researchers, students and reviewers cannot quickly verify whether a cited source **exists**, **says what it is cited for**, is **still valid**, or is **still current** — because LLM-assisted writing produces plausible references from frozen training data, and no tool checks those references against the **live web** with evidence.

## Exhibit A

`arXiv:2305.XXXX` — a placeholder ID printed as a real reference in a paper accepted at NeurIPS 2025, the world's top AI conference. It passed peer review. *(The Decoder, reporting GPTZero's analysis, Jan 2026.)*

## Evidence (from the Round-1 deck)

| Stat | Meaning | Source |
|------|---------|--------|
| **~100** | Hallucinated citations in accepted NeurIPS 2025 papers, each vetted by 3+ reviewers | GPTZero, 2026 |
| **18%** | Of GPT-4's references in AI-written literature reviews were fabricated | *Scientific Reports*, 2023 |
| **86%** | Of papers citing a retracted article never mention the retraction | iConference 2022 |
| **1 year** | arXiv ban for submitting unchecked AI content, including fake citations | arXiv policy, May 2026 |
| **$440K** | Government report partially refunded by Deloitte Australia over fake references | AP, 2025 |

## Root causes

1. **Frozen knowledge.** LLMs generate references from training data; they don't look anything up. Titles, authors and venues are recombined into plausible but nonexistent papers.
2. **Wrong tools.** Plagiarism checkers look for *copied* text. A fabricated reference is "original", so it passes.
3. **Verification is manual and slow.** Checking 40 references by hand (search, open PDF, find passage, check retraction status) takes hours, so nobody does it, not even reviewers.
4. **Retractions are invisible.** Retraction notices sit on publisher pages and are rarely propagated to citing works.
5. **Claims go stale fast.** Breaking-news and fast-moving scientific claims change within hours; static models can't know.

## Why existing tools fall short

| Capability | GPTZero Hallucination Check | scite Reference Check | Plagiarism checkers | **VeriCite** |
|------------|-----------------------------|-----------------------|---------------------|--------------|
| Reference exists | Yes | Yes | No | **Yes** |
| Source supports the claim | Metadata match only | Shows snippets, you judge | No | **Yes, with the verbatim quote** |
| Retractions & corrections | — | Yes | No | **Yes** |
| Breaking-news claims | — | — | No | **Yes, live** |
| Grounded Q&A on live pages | — | — | No | **Yes** |

*"—" = not described in the tool's public documentation (checked Oct 2026).*

## Why now

- AI writing assistants are default tools for 4.14 crore Indian higher-ed students (AISHE 2020-21: 43,796 colleges, 1,113 universities).
- Venues and preprint servers are introducing penalties (arXiv ban), raising the stakes for authors.
- **TinyFish** makes live web retrieval cheap and structured: rank-stable JSON search (including a `research_paper` domain with authors/venue/year), browser-rendered page fetch that returns clean markdown, and a goal-driven browser agent. That makes a live-verification product feasible on a free tier.

## Problem framing for judges (30 seconds)

> "A citation is a promise that the source exists and says what you claim. Today nobody checks that promise. 100 fake citations got past NeurIPS reviewers. VeriCite checks the promise, live, using TinyFish, and attaches the evidence."
