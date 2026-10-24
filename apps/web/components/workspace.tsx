"use client";

import { useEffect, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  FileUp,
  Fish,
  History,
  LockKeyhole,
  Menu,
  MessageSquare,
  Plus,
  Quote,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { Logo, LogoMark } from "@/components/logo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { validateDocument } from "@/lib/input-validation";
import { AuthControls } from "@/components/auth-controls";

type View = "check" | "ask" | "history";
type Step = "input" | "review";
const exampleText =
  "The Transformer architecture uses attention mechanisms [1].\n\nReferences\n[1] Vaswani, A., et al. (2017). Attention Is All You Need. arXiv:1706.03762.";
const exampleQuestion = "How does the Transformer architecture use attention?";
const navItems = [
  { view: "check" as const, label: "New check", icon: FileText },
  { view: "ask" as const, label: "Ask a question", icon: MessageSquare },
  { view: "history" as const, label: "History", icon: History },
];
const checkItems = [
  { title: "Exists", detail: "Title, authors, and year", icon: Search },
  {
    title: "Supports the claim",
    detail: "Quoted source passages",
    icon: Quote,
  },
  {
    title: "Still valid",
    detail: "Retractions and corrections",
    icon: ShieldCheck,
  },
];

export function Workspace({ initialView = "check" }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [step, setStep] = useState<Step>("input");
  const [inputMode, setInputMode] = useState("upload");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lastPosition = useRef({ view, step });
  const navSelected = useRef(false);
  const asking = view === "ask";
  const content = asking ? question : text;
  const hasFile = !asking && inputMode === "upload";
  const ready = hasFile ? !!file : !!content.trim();
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;

  useEffect(() => {
    if (
      lastPosition.current.view !== view ||
      lastPosition.current.step !== step
    ) {
      titleRef.current?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    lastPosition.current = { view, step };
  }, [view, step]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "text/x-bibtex": [".bib"],
      "text/plain": [".bib"],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
    validator: validateDocument,
    onDropAccepted: (files) => {
      setFile(files[0]);
      setError("");
    },
    onDropRejected: (files: FileRejection[]) =>
      setError(
        files.length > 1
          ? "Choose one file at a time."
          : files[0]?.errors[0]?.message || "Choose a PDF or .bib file.",
      ),
  });

  function navigate(next: View) {
    setView(next);
    setStep("input");
    setError("");
    navSelected.current = menuOpen;
    setMenuOpen(false);
  }
  function loadExample() {
    if (asking) setQuestion(exampleQuestion);
    else {
      setText(exampleText);
      setInputMode("text");
    }
    setError("");
  }
  function clearInput() {
    if (asking) setQuestion("");
    else if (hasFile) setFile(null);
    else setText("");
    setError("");
  }
  const heading =
    view === "history"
      ? "Your reports"
      : step === "review"
        ? "Review input"
        : asking
          ? "Ask a question"
          : "Check your references";

  const navigation = (
    <>
      <div className="desk-brand">
        <Logo
          onClick={(event) => {
            event.preventDefault();
            navigate("check");
          }}
        />
      </div>
      <span className="desk-nav-label">WORKSPACE</span>
      <nav aria-label="Workspace navigation" className="desk-nav">
        {navItems.map(({ view: itemView, label, icon: Icon }) => (
          <button
            key={itemView}
            onClick={() => navigate(itemView)}
            aria-current={view === itemView ? "page" : undefined}
          >
            <Icon size={18} strokeWidth={1.6} />
            <span>{label}</span>
            {itemView === "check" && <Plus size={14} className="nav-plus" />}
          </button>
        ))}
      </nav>
      <div className="desk-sidebar-bottom">
        <button
          className="desk-help"
          onClick={() => {
            setHelpOpen(true);
            setMenuOpen(false);
          }}
        >
          <CircleHelp size={17} strokeWidth={1.6} />
          How it works
          <ArrowUpRight size={13} />
        </button>
        <div className="desk-team">
          <span className="team-avatar">S</span>
          <div>
            <strong>Team Savencia</strong>
            <span>HackIIITD 2026</span>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="desk-app">
      <aside className="desk-sidebar">{navigation}</aside>
      <div className="desk-main">
        <header className="desk-topbar">
          <div className="desk-mobile-brand">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="desk-icon-button"
                  aria-label="Open navigation"
                >
                  <Menu size={21} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="desk-mobile-menu"
                onCloseAutoFocus={(event) => {
                  if (navSelected.current) {
                    event.preventDefault();
                    navSelected.current = false;
                    titleRef.current?.focus({ preventScroll: true });
                  }
                }}
              >
                <SheetTitle className="sr-only">
                  Workspace navigation
                </SheetTitle>
                <SheetDescription className="sr-only">
                  Choose reference checks, questions, or history.
                </SheetDescription>
                {navigation}
              </SheetContent>
            </Sheet>
            <Logo
              onClick={(event) => {
                event.preventDefault();
                navigate("check");
              }}
            />
          </div>
          <div className="desk-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {navItems.find((item) => item.view === view)?.label}
            </strong>
          </div>
          <AuthControls />
          <span className="desk-preview">
            <span />
            Local preview
          </span>
          <button
            className="desk-icon-button topbar-help"
            aria-label="About this preview"
            onClick={() => setHelpOpen(true)}
          >
            <CircleHelp size={18} />
          </button>
        </header>
        <main id="main" className="desk-content">
          <div className="desk-page-heading">
            <div>
              <p className="desk-eyebrow">
                {view === "history"
                  ? "HISTORY"
                  : asking
                    ? "GROUNDED ANSWER"
                    : "NEW CHECK"}
              </p>
              <h1 ref={titleRef} tabIndex={-1}>
                {heading}
              </h1>
              <p className="desk-subtitle">
                {view === "history"
                  ? "Saved reports will live here."
                  : step === "review"
                    ? "Check the details before you continue."
                    : asking
                      ? "Start with a question and review it before searching."
                      : "Add a paper, bibliography, or draft."}
              </p>
            </div>
            {view !== "history" && (
              <span className="desk-heading-mark" aria-hidden="true">
                <LogoMark />
              </span>
            )}
          </div>
          {view === "history" ? (
            <section className="desk-history">
              <span className="history-art" aria-hidden="true">
                <History size={37} strokeWidth={1} />
              </span>
              <h2>No saved reports in this preview.</h2>
              <p>Live verification is not connected yet.</p>
              <button
                className="desk-primary"
                onClick={() => navigate("check")}
              >
                Check references <ArrowRight size={16} />
              </button>
            </section>
          ) : (
            <>
              <ol className="desk-steps" aria-label="Check progress">
                <li
                  aria-current={step === "input" ? "step" : undefined}
                  className={
                    step === "review" ? "step-complete" : "step-active"
                  }
                >
                  <button onClick={() => setStep("input")}>
                    <span>{step === "review" ? <Check size={13} /> : "1"}</span>
                    {asking ? "Question" : "Add document"}
                  </button>
                </li>
                <li className="step-connector" aria-hidden="true" />
                <li
                  aria-current={step === "review" ? "step" : undefined}
                  className={step === "review" ? "step-active" : ""}
                >
                  <button onClick={() => setStep("review")} disabled={!ready}>
                    <span>2</span>Review
                  </button>
                </li>
                <li className="step-connector" aria-hidden="true" />
                <li className="step-future">
                  <span className="step-circle">3</span>
                  {asking ? "Answer" : "Report"}
                </li>
              </ol>
              <div className="desk-columns">
                <section
                  className="desk-input-card"
                  aria-label={step === "review" ? "Review input" : "Add input"}
                >
                  {step === "input" ? (
                    <>
                      <div className="desk-card-heading">
                        <h2>{asking ? "Your question" : "Your document"}</h2>
                        <button
                          className="desk-text-button"
                          onClick={loadExample}
                        >
                          Load example <ArrowUpRight size={12} />
                        </button>
                      </div>
                      {asking ? (
                        <div className="desk-question-input">
                          <label htmlFor="desk-question" className="sr-only">
                            Your question
                          </label>
                          <textarea
                            id="desk-question"
                            value={question}
                            maxLength={500}
                            onChange={(event) =>
                              setQuestion(event.target.value)
                            }
                            placeholder="What would you like to check?"
                            aria-describedby="desk-question-count"
                          />
                          <div
                            className="desk-text-meta"
                            id="desk-question-count"
                          >
                            <span>Up to 500 characters</span>
                            <span>{question.length} / 500</span>
                          </div>
                        </div>
                      ) : (
                        <Tabs
                          value={inputMode}
                          onValueChange={(value) => {
                            setInputMode(value);
                            setError("");
                          }}
                          className="desk-input-tabs"
                        >
                          <TabsList variant="line" className="desk-tablist">
                            <TabsTrigger value="upload">
                              <FileUp size={15} />
                              Upload file
                            </TabsTrigger>
                            <TabsTrigger value="text">
                              <Quote size={15} />
                              Paste text
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent
                            value="upload"
                            className="desk-tab-panel"
                          >
                            <div
                              {...getRootProps({
                                className: `desk-dropzone ${isDragActive ? "is-dragging" : ""}`,
                              })}
                            >
                              <input
                                {...getInputProps({
                                  "aria-label": "Select a PDF or BibTeX file",
                                })}
                              />
                              {file ? (
                                <div className="desk-file-selected">
                                  <span className="selected-file-icon">
                                    <FileText size={29} strokeWidth={1.3} />
                                  </span>
                                  <strong>{file.name}</strong>
                                  <span>
                                    {(file.size / 1024).toLocaleString(
                                      undefined,
                                      { maximumFractionDigits: 1 },
                                    )}{" "}
                                    KB ·{" "}
                                    {file.name.toLowerCase().endsWith(".bib")
                                      ? "BibTeX"
                                      : "PDF"}
                                  </span>
                                  <span className="desk-file-ready">
                                    <Check size={12} />
                                    Ready to review
                                  </span>
                                  <button
                                    className="desk-text-button"
                                    onClick={open}
                                  >
                                    Choose another file
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <div
                                    className="desk-upload-art"
                                    aria-hidden="true"
                                  >
                                    <div className="upload-paper-back" />
                                    <div className="upload-paper">
                                      <FileText size={32} strokeWidth={1} />
                                      <i />
                                      <i />
                                      <i />
                                    </div>
                                    <span className="upload-badge">
                                      <Plus size={18} />
                                    </span>
                                  </div>
                                  <h3>
                                    {isDragActive
                                      ? "Drop it here."
                                      : "Drop a PDF or .bib file"}
                                  </h3>
                                  <p>PDF up to 20 MB · BibTeX up to 2 MB</p>
                                  <button
                                    className="desk-browse"
                                    onClick={open}
                                  >
                                    Browse files <FileUp size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </TabsContent>
                          <TabsContent value="text" className="desk-tab-panel">
                            <div className="desk-text-input">
                              <label htmlFor="desk-text" className="sr-only">
                                Draft and references
                              </label>
                              <textarea
                                id="desk-text"
                                value={text}
                                maxLength={60000}
                                onChange={(event) =>
                                  setText(event.target.value)
                                }
                                placeholder="Paste your draft and references…"
                                aria-describedby="desk-text-count"
                              />
                              <div
                                className="desk-text-meta"
                                id="desk-text-count"
                              >
                                <span>{words} words</span>
                                <span>
                                  {text.length.toLocaleString()} / 60,000
                                </span>
                              </div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      )}
                      <div
                        className="desk-error"
                        role="status"
                        aria-live="polite"
                      >
                        {error}
                      </div>
                      <div className="desk-card-actions">
                        {ready ? (
                          <button
                            className="desk-text-button"
                            onClick={clearInput}
                          >
                            <X size={13} />
                            Clear input
                          </button>
                        ) : (
                          <span className="desk-input-hint">
                            <LockKeyhole size={12} />
                            Kept in this tab
                          </span>
                        )}
                        <button
                          className="desk-primary"
                          disabled={!ready}
                          onClick={() => setStep("review")}
                        >
                          Review input <ArrowRight size={16} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="desk-card-heading">
                        <h2>
                          {asking ? "Question details" : "Document details"}
                        </h2>
                        <button
                          className="desk-text-button"
                          onClick={() => setStep("input")}
                        >
                          Edit input <ArrowUpRight size={12} />
                        </button>
                      </div>
                      <div className="desk-review-summary">
                        <span className="review-file-icon">
                          {asking ? (
                            <MessageSquare size={23} strokeWidth={1.4} />
                          ) : (
                            <FileText size={23} strokeWidth={1.4} />
                          )}
                        </span>
                        <div>
                          <strong>
                            {hasFile
                              ? file?.name
                              : asking
                                ? "Your question"
                                : "Pasted text"}
                          </strong>
                          <span>
                            {hasFile
                              ? `${((file?.size || 0) / 1024).toLocaleString(undefined, { maximumFractionDigits: 1 })} KB`
                              : `${words} words · ${content.length.toLocaleString()} characters`}
                          </span>
                        </div>
                        <Check size={16} className="review-check" />
                      </div>
                      {!hasFile && (
                        <div className="desk-input-preview">
                          <pre>{content.slice(0, 6000)}</pre>
                          {content.length > 6000 && (
                            <span>Preview limited to 6,000 characters.</span>
                          )}
                        </div>
                      )}
                      {hasFile && (
                        <div className="desk-review-file">
                          <FileText size={52} strokeWidth={1} />
                          <span>
                            {file?.name.toLowerCase().endsWith(".bib")
                              ? "Bibliography selected"
                              : "PDF selected"}
                          </span>
                          <p>No file has been uploaded.</p>
                        </div>
                      )}
                      <div className="desk-connection-note">
                        <LockKeyhole size={15} />
                        <div>
                          <strong>Live checking isn’t connected yet.</strong>
                          <p>
                            Your input is ready. You can return and edit it.
                          </p>
                        </div>
                      </div>
                      <div className="desk-card-actions">
                        <button
                          className="desk-text-button"
                          onClick={() => setStep("input")}
                        >
                          <ArrowLeft size={14} />
                          Back
                        </button>
                        <button
                          className="desk-primary"
                          disabled
                          aria-describedby="connection-detail"
                        >
                          {asking ? "Find sources" : "Start check"}
                          <ArrowRight size={16} />
                        </button>
                      </div>
                      <span id="connection-detail" className="sr-only">
                        Live verification is unavailable in this preview.
                      </span>
                    </>
                  )}
                </section>
                <aside className="desk-context">
                  <section className="desk-checks-card">
                    <div className="context-card-heading">
                      <h2>
                        {asking ? "Answer requirements" : "Checks included"}
                      </h2>
                      <button
                        className="desk-icon-button"
                        aria-label="Explain the checks"
                        onClick={() => setHelpOpen(true)}
                      >
                        <CircleHelp size={15} />
                      </button>
                    </div>
                    {asking
                      ? [
                          {
                            title: "Live sources",
                            detail: "Pages fetched for this question",
                            icon: Search,
                          },
                          {
                            title: "Cited passages",
                            detail: "A source for each sentence",
                            icon: Quote,
                          },
                          {
                            title: "Visible uncertainty",
                            detail: "Missing evidence stays explicit",
                            icon: ShieldCheck,
                          },
                        ].map(({ title, detail, icon: Icon }) => (
                          <div className="desk-check-item" key={title}>
                            <span>
                              <Icon size={17} strokeWidth={1.5} />
                            </span>
                            <div>
                              <h3>{title}</h3>
                              <p>{detail}</p>
                            </div>
                          </div>
                        ))
                      : checkItems.map(({ title, detail, icon: Icon }) => (
                          <div className="desk-check-item" key={title}>
                            <span>
                              <Icon size={17} strokeWidth={1.5} />
                            </span>
                            <div>
                              <h3>{title}</h3>
                              <p>{detail}</p>
                            </div>
                          </div>
                        ))}
                    {!asking && (
                      <p className="desk-checks-note">
                        Claim support needs citing text.
                      </p>
                    )}
                  </section>
                  <section className="desk-report-placeholder">
                    <div className="mini-report" aria-hidden="true">
                      <span className="mini-report-label">
                        {asking ? "ANSWER" : "TRUST REPORT"}
                      </span>
                      <div className="mini-report-line" />
                      <div className="mini-report-line short" />
                      <div className="mini-report-rule" />
                      <span className="mini-report-brackets">[ ]</span>
                      <div className="mini-report-line" />
                      <div className="mini-report-line short" />
                    </div>
                    <h3>{asking ? "Cited answer" : "Trust Report"}</h3>
                    <p>
                      {asking
                        ? "A cited answer appears after a live search."
                        : "Results appear after a live check."}
                    </p>
                  </section>
                </aside>
              </div>
              <div className="desk-bottom-note">
                <LockKeyhole size={12} />
                <span>Nothing is uploaded in this preview.</span>
              </div>
            </>
          )}
          <footer className="desk-footer">
            <span>
              <Fish size={14} strokeWidth={1.5} />
              Built on TinyFish
            </span>
            <button onClick={() => setHelpOpen(true)}>
              How it works <ArrowUpRight size={12} />
            </button>
          </footer>
        </main>
      </div>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="desk-help-dialog">
          <span className="help-symbol">
            <BookOpen size={23} strokeWidth={1.4} />
          </span>
          <DialogTitle>Three checks.</DialogTitle>
          <DialogDescription>
            Each result will link to its source.
          </DialogDescription>
          {checkItems.map(({ title, detail, icon: Icon }, i) => (
            <div className="help-check" key={title}>
              <span>0{i + 1}</span>
              <Icon size={18} />
              <div>
                <strong>{title}</strong>
                <p>{detail}.</p>
              </div>
            </div>
          ))}
          <p className="help-preview-note">
            This preview supports input and review. Live checks and saved
            reports are still being connected.
          </p>
          <button className="desk-primary" onClick={() => setHelpOpen(false)}>
            Got it <Check size={15} />
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
