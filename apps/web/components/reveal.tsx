"use client";

import { useEffect, useRef } from "react";

export function RevealObserver() {
  const ref = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>("[data-reveal]");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    ref.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            ref.current?.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    for (const element of elements) {
      // Only animate content below the fold; the hero is immediately available.
      if (element.getBoundingClientRect().top > window.innerHeight) {
        element.classList.add("will-reveal");
        ref.current.observe(element);
      }
    }
    return () => {
      ref.current?.disconnect();
      elements.forEach((el) => el.classList.remove("will-reveal"));
    };
  }, []);
  return null;
}
