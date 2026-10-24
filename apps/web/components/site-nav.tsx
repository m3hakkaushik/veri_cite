"use client";

import { ArrowUpRight, Menu } from "lucide-react";
import { useRef, useState } from "react";
import { Logo } from "@/components/logo";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const links = [
  { href: "#workspace", label: "Workspace" },
  { href: "#how-it-works", label: "The method" },
  { href: "#principles", label: "Our principles" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pendingSection = useRef<string | null>(null);
  return (
    <header className="navigation">
      <div className="site-container navigation-inner">
        <Logo />
        <nav aria-label="Main navigation" className="desktop-links">
          {links.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="nav-cta" href="#workspace">
          Start exploring <ArrowUpRight size={15} />
        </a>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              className="mobile-menu icon-button"
              aria-label="Open navigation"
            >
              <Menu size={22} />
            </button>
          </SheetTrigger>
          <SheetContent
            className="mobile-navigation"
            onCloseAutoFocus={(event) => {
              const href = pendingSection.current;
              if (!href) return;
              event.preventDefault();
              pendingSection.current = null;
              const section = document.querySelector<HTMLElement>(href);
              section
                ?.querySelector<HTMLElement>("h2")
                ?.focus({ preventScroll: true });
              section?.scrollIntoView({
                behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
                  .matches
                  ? "instant"
                  : "smooth",
                block: "start",
              });
              window.history.replaceState(null, "", href);
            }}
          >
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SheetDescription className="sr-only">
              Explore the workspace, verification method, and product
              principles.
            </SheetDescription>
            <Logo />
            <nav aria-label="Mobile navigation">
              {links.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(event) => {
                    event.preventDefault();
                    pendingSection.current = link.href;
                    setOpen(false);
                  }}
                >
                  <span>0{i + 1}</span>
                  {link.label}
                  <ArrowUpRight size={20} />
                </a>
              ))}
            </nav>
            <p>
              Every citation is a promise.
              <br />
              Let’s follow it to the source.
            </p>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
