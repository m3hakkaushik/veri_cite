"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Clock3,
  Quote,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const steps = [
  {
    id: "exists",
    number: "01",
    name: "Find the paper",
    question: "A real paper. Not just a convincing title.",
    description:
      "Search the scholarly web and compare the title, authors, year, and venue. A reference should lead somewhere you can actually inspect.",
    api: "Search API",
    label: "EXISTENCE",
    icon: Search,
    top: "The cited reference",
    bottom: "The original publication",
    rule: "Exact details. A traceable source.",
    tags: ["Title", "Authors", "Year", "Venue"],
  },
  {
    id: "supports",
    number: "02",
    name: "Read the source",
    question: "Does the paper say what the claim says?",
    description:
      "Read the fetched source and compare it with the claim. A supported verdict requires a verbatim passage that can be found in that source.",
    api: "Fetch API",
    label: "CLAIM SUPPORT",
    icon: Quote,
    top: "The claim in your draft",
    bottom: "A passage in the source",
    rule: "No quote. No supported verdict.",
    tags: ["Numbers", "Direction", "Scope", "Context"],
  },
  {
    id: "valid",
    number: "03",
    name: "Check its standing",
    question: "Published once. Still worth citing?",
    description:
      "Look for retractions, corrections, and expressions of concern. When the signals are ambiguous, a capped browser-agent check can inspect the publisher page.",
    api: "Search → Fetch → Agent",
    label: "INTEGRITY",
    icon: ShieldCheck,
    top: "The published paper",
    bottom: "Publisher notices & updates",
    rule: "Publication is the beginning of the story.",
    tags: ["Retractions", "Corrections", "Notices"],
  },
  {
    id: "current",
    number: "04",
    name: "Keep it current",
    question: "The world moves. Your sources should, too.",
    description:
      "Compare time-sensitive claims with dated, recent coverage. The planned Current check will show when newer evidence changes the picture.",
    api: "Search API · News",
    label: "CURRENCY · PLANNED",
    icon: Clock3,
    top: "A time-sensitive claim",
    bottom: "Dated, recent coverage",
    rule: "A timestamp belongs beside the evidence.",
    tags: ["Published", "Updated", "Fetched"],
  },
];

export function MethodExplorer() {
  const [active, setActive] = useState("exists");
  return (
    <section
      id="how-it-works"
      className="method-section site-container"
      aria-labelledby="method-title"
      data-reveal
    >
      <div className="section-intro">
        <div>
          <p className="small-label">
            THE METHOD / FOUR QUESTIONS, ZERO GUESSWORK
          </p>
          <h2 id="method-title" tabIndex={-1}>
            Go beyond
            <br />
            the bibliography.
          </h2>
        </div>
        <p>
          A citation is a starting point.
          <br />
          Here’s how we plan to follow it.
        </p>
      </div>
      <Tabs value={active} onValueChange={setActive} className="method-tabs">
        <TabsList
          className="method-tablist"
          aria-label="Explore verification checks"
        >
          {steps.map((step) => (
            <TabsTrigger value={step.id} key={step.id}>
              <span>{step.number}</span>
              {step.name}
              <ArrowUpRight size={17} />
            </TabsTrigger>
          ))}
        </TabsList>
        {steps.map(
          ({
            id,
            number,
            question,
            description,
            api,
            label,
            icon: Icon,
            top,
            bottom,
            rule,
            tags,
          }) => (
            <TabsContent value={id} key={id} className="method-content">
              <div className="method-copy">
                <span className="method-number">/{number}</span>
                <div>
                  <span className="small-label">{label}</span>
                  <h3>{question}</h3>
                  <p>{description}</p>
                  <span className="method-api">
                    {api}
                    <ArrowUpRight size={12} />
                  </span>
                </div>
              </div>
              <div
                className={`method-diagram diagram-${id}`}
                aria-label={`${top} connects to ${bottom}`}
              >
                <div className="diagram-grid" aria-hidden="true" />
                <div className="diagram-node">
                  <BookOpen size={17} />
                  <span>{top}</span>
                  <span className="diagram-bracket">[a]</span>
                </div>
                <div className="diagram-bridge">
                  <span className="bridge-line" />
                  <span className="bridge-icon">
                    <Icon size={22} strokeWidth={1.6} />
                  </span>
                  <span className="bridge-line" />
                  <ArrowDown className="bridge-arrow" size={12} />
                </div>
                <div className="diagram-node diagram-source">
                  <Icon size={17} />
                  <span>{bottom}</span>
                  <ArrowUpRight size={16} />
                </div>
                <div className="diagram-tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
                <span className="diagram-rule">{rule}</span>
              </div>
            </TabsContent>
          ),
        )}
      </Tabs>
    </section>
  );
}
