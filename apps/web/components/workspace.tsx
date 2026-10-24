"use client";

import { useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  ArrowRight,
  ArrowUpRight,
  Braces,
  Check,
  CircleHelp,
  FileText,
  FileUp,
  LockKeyhole,
  MessageSquare,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

const sampleText =
  "The Transformer architecture is based on attention mechanisms [1].\n\nReferences\n[1] Vaswani, A., et al. (2017). Attention Is All You Need. arXiv:1706.03762.";
const sampleQuestion =
  "What does the Transformer architecture change about sequence modeling?";
const modes = {
  document: "Document",
  text: "Pasted text",
  question: "Question",
} as const;
type Mode = keyof typeof modes;

export function Workspace() {
  const [mode, setMode] = useState<Mode>("document");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [question, setQuestion] = useState("");
  const [error, setError] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const content = mode === "question" ? question : text;
  const ready = mode === "document" ? !!file : !!content.trim();
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    accept: {
      "application/pdf": [".pdf"],
      "text/x-bibtex": [".bib"],
      "text/plain": [".bib"],
    },
    maxFiles: 1,
    noClick: true,
    noKeyboard: true,
    validator: (candidate) => {
      if (!/\.(pdf|bib)$/i.test(candidate.name))
        return { code: "file-type", message: "Choose a PDF or .bib file." };
      if (!candidate.size)
        return {
          code: "empty-file",
          message: "This file is empty. Please choose another.",
        };
      const limit = candidate.name.toLowerCase().endsWith(".bib") ? 2 : 20;
      return candidate.size > limit * 1024 * 1024
        ? {
            code: "file-size",
            message: `This file is too large. The limit is ${limit} MB.`,
          }
        : null;
    },
    onDropAccepted: (files) => {
      setFile(files[0]);
      setError("");
    },
    onDropRejected: (rejections: FileRejection[]) =>
      setError(
        rejections.length > 1
          ? "Please choose one document at a time."
          : rejections[0]?.errors[0]?.message ||
              "This file could not be opened.",
      ),
  });
  function changeMode(value: string) {
    setMode(value as Mode);
    setError("");
  }
  function clearInput() {
    if (mode === "document") setFile(null);
    else if (mode === "text") setText("");
    else setQuestion("");
    setError("");
  }
  function useSample() {
    if (mode === "question") setQuestion(sampleQuestion);
    else {
      setText(sampleText);
      setMode("text");
    }
    setError("");
  }
  return (
    <>
      <section
        id="workspace"
        className="workspace-section site-container"
        aria-labelledby="workspace-title"
        data-reveal
      >
        <div className="workspace-label">
          <span>
            <span className="status-dot" />
            YOUR EVIDENCE WORKSPACE
          </span>
          <span>01 — START WITH A SOURCE</span>
        </div>
        <div className="workspace-shell">
          <aside className="workspace-aside">
            <span className="small-label">
              A little curiosity goes a long way.
            </span>
            <h2 id="workspace-title" tabIndex={-1}>
              Bring your <br />
              next big idea.
            </h2>
            <p>
              A draft. A bibliography. A question.
              <br />
              Every good check starts somewhere.
            </p>
            <div className="document-stack" aria-hidden="true">
              <div className="stack-page stack-back">
                <span>REFERENCES</span>
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="stack-page stack-front">
                <FileText size={22} strokeWidth={1.3} />
                <div className="stack-lines">
                  <i />
                  <i />
                  <i />
                </div>
                <span className="stack-reference">[ 1 ]</span>
                <div className="stack-stamp">
                  FOLLOW THE SOURCE <ArrowUpRight size={12} />
                </div>
              </div>
              <span className="stack-plus">
                <Plus size={21} />
              </span>
            </div>
            <span className="aside-footer">
              <LockKeyhole size={13} />
              Your draft stays in this browser.
            </span>
          </aside>
          <div className="workspace-main">
            <Tabs
              value={mode}
              onValueChange={changeMode}
              className="input-tabs"
            >
              <div className="workspace-toolbar">
                <TabsList className="workspace-tablist" variant="line">
                  <TabsTrigger value="document">
                    <FileUp size={15} />
                    <span>Document</span>
                  </TabsTrigger>
                  <TabsTrigger value="text">
                    <Braces size={15} />
                    <span>Paste text</span>
                  </TabsTrigger>
                  <TabsTrigger value="question">
                    <MessageSquare size={15} />
                    <span>Ask a question</span>
                  </TabsTrigger>
                </TabsList>
                <button
                  className="icon-button help-button"
                  onClick={() => setHelpOpen(true)}
                  aria-label="About this workspace"
                >
                  <CircleHelp size={17} />
                </button>
              </div>
              <TabsContent value="document" className="workspace-panel">
                <div
                  {...getRootProps({
                    className: `drop-area ${isDragActive ? "is-dragging" : ""} ${file ? "has-file" : ""}`,
                  })}
                >
                  <input
                    {...getInputProps({
                      "aria-label": "Choose a PDF or BibTeX file",
                    })}
                  />
                  {file ? (
                    <div className="selected-document">
                      <span className="selected-document-icon">
                        <FileText size={30} strokeWidth={1.3} />
                      </span>
                      <h3>{file.name}</h3>
                      <p>
                        {(file.size / 1024).toLocaleString(undefined, {
                          maximumFractionDigits: 1,
                        })}{" "}
                        KB ·{" "}
                        {file.name.toLowerCase().endsWith(".bib")
                          ? "BibTeX bibliography"
                          : "PDF document"}
                      </p>
                      <span className="input-ready">
                        <Check size={12} />
                        Selected for review
                      </span>
                      <button className="text-button" onClick={open}>
                        Choose a different file <ArrowUpRight size={13} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="upload-orbit">
                        <FileUp size={25} strokeWidth={1.4} />
                        <span className="upload-plus">+</span>
                      </span>
                      <h3>
                        {isDragActive
                          ? "A good place to drop it."
                          : "Drop a little knowledge here."}
                      </h3>
                      <p>
                        Drag in your paper or bibliography, or{" "}
                        <button className="inline-link" onClick={open}>
                          browse files
                        </button>
                      </p>
                      <div className="file-types">
                        <span>
                          PDF <small>up to 20 MB</small>
                        </span>
                        <span>
                          .BIB <small>up to 2 MB</small>
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="text" className="workspace-panel">
                <div className="writing-area">
                  <div className="writing-label">
                    <label htmlFor="reference-text">
                      Your draft or reference list
                    </label>
                    <button onClick={useSample} className="text-button">
                      Load an example <ArrowUpRight size={12} />
                    </button>
                  </div>
                  <textarea
                    id="reference-text"
                    value={text}
                    maxLength={60000}
                    onChange={(event) => setText(event.target.value)}
                    placeholder={
                      "Paste your text here. Include the reference list and the claims you’d like to check.\n\nOne citation is a good place to start."
                    }
                    aria-describedby="text-count"
                  />
                  <div id="text-count" className="writing-meta">
                    <span>{wordCount} words</span>
                    <span>
                      {text.length.toLocaleString()} / 60,000 characters
                    </span>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="question" className="workspace-panel">
                <div className="writing-area question-writing">
                  <label htmlFor="research-question">
                    What are you curious about?
                  </label>
                  <textarea
                    id="research-question"
                    value={question}
                    maxLength={500}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="Ask a question worth going to the source for…"
                    aria-describedby="question-count"
                  />
                  <div id="question-count" className="writing-meta">
                    <span>Grounded Answer</span>
                    <span>{question.length} / 500 characters</span>
                  </div>
                  <button
                    className="question-suggestion"
                    onClick={() => setQuestion(sampleQuestion)}
                  >
                    <MessageSquare size={14} />
                    <span>
                      Try a question about the Transformer architecture
                    </span>
                    <ArrowUpRight size={13} />
                  </button>
                </div>
              </TabsContent>
            </Tabs>
            <div className="workspace-notice" role="status" aria-live="polite">
              {error ? (
                <span className="input-error">{error}</span>
              ) : (
                <span>
                  Interactive preview <span className="notice-divider">/</span>{" "}
                  Live verification is not connected yet.
                </span>
              )}
            </div>
            <div className="workspace-actions">
              <button
                className="text-button sample-button"
                onClick={ready ? clearInput : useSample}
              >
                {ready ? <RotateCcw size={13} /> : <FileText size={14} />}
                {ready ? "Clear input" : "Start with an example"}
              </button>
              <button
                className="primary-button review-button"
                disabled={!ready}
                onClick={() => setReviewOpen(true)}
              >
                Review {mode === "question" ? "question" : "draft"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
        <div className="workspace-caption">
          <span>
            <LockKeyhole size={12} />
            Nothing is uploaded in this preview.
          </span>
          <span>Good research starts with good questions.</span>
        </div>
      </section>
      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="draft-dialog">
          <div className="dialog-symbol">
            <FileText size={26} strokeWidth={1.4} />
          </div>
          <p className="small-label">ONE STEP CLOSER</p>
          <DialogTitle className="draft-title">
            Your {mode === "question" ? "question" : "draft"} is ready to
            review.
          </DialogTitle>
          <DialogDescription className="draft-description">
            Live verification is not available in this preview. Your input has
            not been uploaded, checked, or saved to a server.
          </DialogDescription>
          <div className="draft-summary">
            <span>{modes[mode]}</span>
            <strong>
              {mode === "document"
                ? file?.name
                : `${wordCount} words · ${content.length.toLocaleString()} characters`}
            </strong>
            {mode !== "document" && (
              <pre>
                {content.slice(0, 2000)}
                {content.length > 2000
                  ? "\n… Preview limited to 2,000 characters."
                  : ""}
              </pre>
            )}
          </div>
          <div className="draft-next">
            <span className="small-label">WHEN LIVE CHECKING IS CONNECTED</span>
            <p>
              {mode === "question"
                ? "Search live sources → read the pages → validate every cited passage."
                : "Find each reference → check the claim → look for corrections and retractions."}
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => setReviewOpen(false)}
          >
            Back to your workspace <ArrowRight size={16} />
          </button>
        </DialogContent>
      </Dialog>
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="draft-dialog">
          <DialogTitle className="draft-title">
            A place to start checking.
          </DialogTitle>
          <DialogDescription className="draft-description">
            Explore how VeriCite will accept your research. Select a PDF or .bib
            file, paste a draft, or write a question. You can review and edit
            your input here; live verification is still being built.
          </DialogDescription>
          <p className="help-privacy">
            <LockKeyhole size={16} />
            Your input stays in memory in this tab. Refreshing the page clears
            it.
          </p>
          <button className="primary-button" onClick={() => setHelpOpen(false)}>
            Got it <Check size={16} />
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
