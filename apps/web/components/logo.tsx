import Link from "next/link";
import type { SVGProps } from "react";

export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M14 6H8v36h6M34 6h6v36h-6M16 25l6 6 11-13" />
    </svg>
  );
}

export function Logo() {
  return (
    <Link
      href="/"
      aria-label="VeriCite home"
      className="inline-flex items-center gap-2.5"
    >
      <LogoMark className="size-8" />
      <span className="text-xl font-bold tracking-[-0.04em]">VeriCite</span>
    </Link>
  );
}
