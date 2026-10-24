import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Ban,
  FileText,
  Fish,
  LockKeyhole,
  Quote,
  Search,
  Clock3,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { AuthControls } from "@/components/auth-controls";
import { LandingProof } from "@/components/landing-proof";
import "./landing.css";

export const metadata: Metadata = {
  title: "VeriCite — Know what you're citing",
  description:
    "Check academic references against live sources. Find matching papers, catch metadata differences, and inspect the evidence.",
};

const checks = [
  {
    number: "01",
    title: "Does it exist?",
    detail: "Find the paper. Compare the title, authors, and year.",
    icon: Search,
    status: "Live now",
  },
  {
    number: "02",
    title: "Does it say that?",
    detail: "Trace a claim back to a passage in its source.",
    icon: Quote,
    status: "Coming next",
  },
  {
    number: "03",
    title: "Is it still valid?",
    detail: "Look for retractions and publisher corrections.",
    icon: Ban,
    status: "Coming next",
  },
  {
    number: "04",
    title: "Is it current?",
    detail: "Check changing claims against recent coverage.",
    icon: Clock3,
    status: "Planned",
  },
];

export default function Home() {
  return (
    <div className="landing-page">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#checks">The checks</a>
        </nav>
        <AuthControls showSignUp={false} />
        <Link className="landing-nav-cta" href="/app/new" prefetch={false}>
          Workspace
          <ArrowUpRight size={15} />
        </Link>
      </header>
      <main id="main">
        <section className="landing-hero" aria-labelledby="landing-heading">
          <div className="landing-hero-copy">
            <div className="landing-eyebrow">
              <span />A SECOND LOOK AT YOUR REFERENCES
            </div>
            <h1 id="landing-heading">
              Know what
              <br />
              you’re <span className="landing-underlined">citing.</span>
              <sup aria-hidden="true">[1]</sup>
            </h1>
            <p className="landing-intro">
              Check academic references against live sources. See the match, the
              mismatch, and the evidence.
            </p>
            <div className="landing-actions">
              <Link
                href="/app/new"
                prefetch={false}
                className="landing-primary"
              >
                Check my references
                <ArrowUpRight size={19} />
              </Link>
              <a href="#how-it-works" className="landing-text-link">
                See how
                <ArrowDown size={15} />
              </a>
            </div>
            <div className="landing-inputs">
              <span>PDF</span>
              <span>BIBTEX</span>
              <span>PASTED TEXT</span>
              <span className="landing-private">
                <LockKeyhole size={12} />
                Private uploads
              </span>
            </div>
          </div>
          <LandingProof />
        </section>
        <div className="landing-credit">
          <span>
            <Fish size={18} />
            Built on <strong>TinyFish</strong>
          </span>
          <p>Live scholarly search. Inspectable sources.</p>
          <span className="landing-credit-end">
            FOR THE WORK BEFORE YOU PUBLISH
            <ArrowDown size={15} />
          </span>
        </div>
        <section
          className="landing-process"
          id="how-it-works"
          aria-labelledby="process-heading"
        >
          <div className="landing-section-heading">
            <span className="landing-eyebrow">THE PROCESS</span>
            <h2 id="process-heading">Follow the reference.</h2>
            <p>From your draft to the original source.</p>
          </div>
          <ol>
            <li>
              <span className="landing-step-number">
                01<span>↗</span>
              </span>
              <h3>Bring your draft.</h3>
              <p>
                Upload a PDF or BibTeX file.
                <br />
                Or paste your reference list.
              </p>
            </li>
            <li>
              <span className="landing-step-number">
                02<span>↗</span>
              </span>
              <h3>Check the match.</h3>
              <p>
                We search for the paper and
                <br />
                compare its bibliographic details.
              </p>
            </li>
            <li>
              <span className="landing-step-number">
                03
                <LogoMark />
              </span>
              <h3>Open the evidence.</h3>
              <p>
                Inspect each result, see what differs,
                <br />
                and follow the source.
              </p>
            </li>
          </ol>
        </section>
        <section
          className="landing-coverage"
          id="checks"
          aria-labelledby="coverage-heading"
        >
          <div className="landing-coverage-intro">
            <span className="landing-eyebrow">A CLOSER LOOK</span>
            <h2 id="coverage-heading">
              Small details.
              <br />
              Worth checking.
            </h2>
            <p>
              Reference matching is live.
              <br />
              Here’s what we’re building toward.
            </p>
            <span className="landing-coverage-mark" aria-hidden="true">
              ✳
            </span>
          </div>
          <div className="landing-checks">
            {checks.map(({ number, title, detail, icon: Icon, status }) => (
              <div className="landing-check" key={number}>
                <span className="landing-check-number">{number}</span>
                <Icon size={20} strokeWidth={1.5} />
                <div>
                  <h3>{title}</h3>
                  <p>{detail}</p>
                </div>
                <span
                  className={
                    status === "Live now"
                      ? "landing-availability is-live"
                      : "landing-availability"
                  }
                >
                  {status === "Live now" && <span />}
                  {status}
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="landing-closing" aria-label="Start checking">
          <div>
            <span className="landing-eyebrow">BEFORE THE FINAL DRAFT</span>
            <h2>
              Give your references
              <br />a second look.
            </h2>
          </div>
          <Link href="/app/new" prefetch={false} className="landing-primary">
            Open the workspace
            <ArrowRight size={18} />
          </Link>
        </section>
      </main>
      <footer className="landing-footer">
        <Logo />
        <span>Team Savencia · HackIIITD 2026</span>
        <a
          href="https://github.com/m3hakkaushik/veri_cite"
          target="_blank"
          rel="noopener noreferrer"
        >
          On GitHub
          <ArrowUpRight size={13} />
        </a>
        <span className="landing-footer-note">
          <FileText size={13} />A source for every flag.
        </span>
      </footer>
    </div>
  );
}
