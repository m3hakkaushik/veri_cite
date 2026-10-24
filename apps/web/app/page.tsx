import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Asterisk,
  Brackets,
  Check,
  Fish,
  Link2,
  LockKeyhole,
  Quote,
  ScanLine,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { SiteNav } from "@/components/site-nav";
import { Workspace } from "@/components/workspace";
import { MethodExplorer } from "@/components/method-explorer";
import { RevealObserver } from "@/components/reveal";

export default function Home() {
  return (
    <>
      <RevealObserver />
      <SiteNav />
      <main id="main">
        <section
          className="editorial-hero site-container"
          aria-labelledby="hero-title"
        >
          <div className="hero-topline">
            <span className="edition-label">
              A RESEARCHER’S SECOND PAIR OF EYES
            </span>
            <span className="hero-edition">
              VOL. 01 <span>—</span> HACKIIITD ’26
            </span>
          </div>
          <div className="hero-layout">
            <div className="hero-heading">
              <div className="hero-kicker">
                <span className="status-dot" />
                LESS GUESSWORK. MORE GROUNDWORK.
              </div>
              <h1 id="hero-title">
                Bold ideas.
                <br />
                <span>Solid evidence.</span>
                <span className="heading-asterisk" aria-hidden="true">
                  ✳
                </span>
              </h1>
              <p>
                Every citation makes a promise.
                <br />
                Follow it to the source.
              </p>
              <div className="hero-buttons">
                <a href="#workspace" className="primary-button">
                  Explore the workspace <ArrowUpRight size={17} />
                </a>
                <a href="#how-it-works" className="secondary-link">
                  See the method <ArrowDown size={14} />
                </a>
              </div>
              <span className="hero-footnote">
                FOR THE CURIOUS. THE CAREFUL. THE NOT-QUITE-CONVINCED.
              </span>
            </div>
            <div className="evidence-sculpture" aria-hidden="true">
              <div className="sculpture-grid" />
              <div className="sculpture-orbit orbit-outer" />
              <div className="sculpture-orbit orbit-inner" />
              <span className="sculpture-coordinate coordinate-top">
                FIG. 01 — THE PAPER TRAIL
              </span>
              <div className="sculpture-disc">
                <LogoMark />
                <span>CHECK THE PROMISE.</span>
              </div>
              <div className="floating-reference reference-one">
                <span className="reference-id">[1]</span>
                <div>
                  <span className="reference-line" />
                  <span className="reference-line short" />
                </div>
                <ArrowUpRight size={17} />
              </div>
              <div className="floating-reference reference-two">
                <Quote size={18} />
                <span>Back to the source.</span>
                <span className="reference-tick">
                  <Check size={13} />
                </span>
              </div>
              <span className="orbit-endpoint endpoint-one" />
              <span className="orbit-endpoint endpoint-two" />
              <span className="sculpture-note">
                A claim. A source.
                <br />A connection you can follow.
                <svg viewBox="0 0 90 45" fill="none">
                  <path
                    d="M3 6c30-4 67 0 74 27M65 26l14 10 6-16"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="sculpture-coordinate coordinate-bottom">
                [ TRUST IS TRACEABLE. ]
              </span>
            </div>
          </div>
          <div className="hero-bottomline">
            <span>
              <Fish size={17} strokeWidth={1.5} />
              Built on <strong>TinyFish</strong>
            </span>
            <span>
              <span className="tiny-bracket">[ ]</span>Search. Read. Trace.
            </span>
            <span>
              Evidence attached. Always.
              <Link2 size={14} />
            </span>
          </div>
        </section>
        <Workspace />
        <section className="belief-strip site-container" data-reveal>
          <span className="small-label">THE IDEA IS SIMPLE.</span>
          <p>
            You do the thinking.
            <br />
            <span>Let the sources do the talking.</span>
          </p>
          <Asterisk size={48} strokeWidth={1} aria-hidden="true" />
        </section>
        <MethodExplorer />
        <section
          id="principles"
          className="principles-section"
          aria-labelledby="principles-title"
        >
          <div className="site-container principles-inner" data-reveal>
            <div className="principles-heading">
              <span className="small-label">BUILT FOR HEALTHY SKEPTICISM</span>
              <h2 id="principles-title" tabIndex={-1}>
                Show the work.
                <br />
                <span>Earn the trust.</span>
              </h2>
              <p>
                A confident answer means very little
                <br />
                without something to stand on.
              </p>
              <div className="principles-seal" aria-hidden="true">
                <LogoMark />
                <span>
                  VERICITE
                  <br />
                  EVIDENCE FIRST
                </span>
              </div>
            </div>
            <div className="principles-list">
              {[
                {
                  icon: Quote,
                  title: "No quote, no ‘supported’.",
                  body: "Every supported verdict needs a passage that matches the fetched source. A fluent explanation alone doesn’t count.",
                },
                {
                  icon: Link2,
                  title: "A way back to the original.",
                  body: "Evidence belongs beside the verdict, with a source link you can open and inspect for yourself.",
                },
                {
                  icon: ScanLine,
                  title: "Uncertainty, in plain sight.",
                  body: "An inaccessible paper or a missing passage is a limit to show, not a gap to fill with a guess.",
                },
                {
                  icon: LockKeyhole,
                  title: "Your draft, handled thoughtfully.",
                  body: "This preview keeps your input in this browser tab. Nothing is uploaded, and refreshing clears the draft.",
                },
              ].map(({ icon: Icon, title, body }, i) => (
                <article key={title}>
                  <span className="principle-index">0{i + 1}</span>
                  <Icon size={21} strokeWidth={1.4} />
                  <div>
                    <h3>{title}</h3>
                    <p>{body}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className="final-invitation site-container" data-reveal>
          <span className="small-label">
            FOR YOUR NEXT “WAIT, IS THAT RIGHT?”
          </span>
          <h2>
            A little doubt.
            <br />
            <span>A better paper.</span>
          </h2>
          <a href="#workspace" className="primary-button">
            Bring your curiosity <ArrowRight size={17} />
          </a>
          <span className="invitation-bracket bracket-left" aria-hidden="true">
            [
          </span>
          <span className="invitation-bracket bracket-right" aria-hidden="true">
            ]
          </span>
        </section>
      </main>
      <footer className="editorial-footer site-container">
        <div className="footer-top">
          <Logo />
          <p>Check the promise, live.</p>
          <a href="#main" className="back-to-top">
            Back to top <ArrowUpRight size={15} />
          </a>
        </div>
        <div className="footer-bottom">
          <span>Built with care by Team Savencia.</span>
          <span>
            Mehak & Nitesh <span className="footer-divider">/</span> IIIT Delhi
            · Esya ’26
          </span>
          <span className="footer-preview">
            <Brackets size={12} />
            An interactive product preview
          </span>
        </div>
      </footer>
    </>
  );
}
