"use client";

import { ArrowUpRight, CircleAlert, FileText, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogoMark } from "@/components/logo";
import example from "@/lib/landing-example.json";

// DECISION: this public paper example comes from a controlled test run, not a
// user's document. Its flag links to actual stored evidence and the source URL.
export function LandingProof() {
  return (
    <div className="landing-art" id="reference-example">
      <div className="landing-orbit" aria-hidden="true" />
      <span className="landing-art-note" aria-hidden="true">
        LOOK A LITTLE CLOSER.
        <svg viewBox="0 0 80 45" fill="none">
          <path
            d="M5 5c35 0 60 8 60 31m-9-7 9 8 8-9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <article
        className="landing-proof"
        aria-label="Real reference matching example"
      >
        <header>
          <span>
            <FileText size={14} />
            REFERENCE NOTE
          </span>
          <span>01 / 01</span>
        </header>
        <div className="landing-proof-title">
          <span>ACTUAL CHECK · EXAMPLE INPUT</span>
          <h2>{example.title}</h2>
          <p>Vaswani et al.</p>
        </div>
        <Tabs defaultValue="cited" className="landing-compare">
          <TabsList aria-label="Compare the bibliography with the source">
            <TabsTrigger value="cited">As cited</TabsTrigger>
            <TabsTrigger value="source">At the source</TabsTrigger>
          </TabsList>
          <TabsContent value="cited">
            <div className="landing-year">
              <span>YEAR IN BIBLIOGRAPHY</span>
              <strong>
                {example.citedYear}
                <span aria-hidden="true">*</span>
              </strong>
              <p>A small detail worth a second look.</p>
            </div>
          </TabsContent>
          <TabsContent value="source">
            <div className="landing-year">
              <span>MATCHED PUBLICATION YEAR</span>
              <strong>
                {example.sourceYear}
                <span aria-hidden="true">↗</span>
              </strong>
              <p>The year returned by the scholarly source.</p>
            </div>
          </TabsContent>
        </Tabs>
        <footer>
          <span className="landing-mismatch">
            <CircleAlert size={14} />
            Year needs review
          </span>
          <a
            href={example.sourceUrl}
            data-evidence-id={example.evidenceId}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open the source evidence for the year mismatch"
          >
            <Search size={12} />
            Source
            <ArrowUpRight size={13} />
          </a>
        </footer>
      </article>
      <div className="landing-stamp" aria-hidden="true">
        <LogoMark />
        <span>SOURCES MATTER</span>
      </div>
      <span className="landing-art-caption">
        ONE REFERENCE. THE EVIDENCE ATTACHED.
      </span>
    </div>
  );
}
