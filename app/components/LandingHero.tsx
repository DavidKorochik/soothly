"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import BrandMark from "./BrandMark";

// The landing CTA plays a gentle "rise away" exit before handing off to the interview: the words
// drift up and fade, then we navigate (the welcome card rises up to meet them). A plain left-click
// is hijacked for the animation; modified clicks and reduced-motion fall through to a normal <Link>.
export default function LandingHero() {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  function start(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(() => router.push("/interview"), 420);
  }

  return (
    <div className={`paper-content max-w-prose text-center${leaving ? " soothly-leave" : ""}`}>
      <BrandMark className="mx-auto mb-7 h-9 w-auto" />
      <h1 className="mb-5 font-display font-bold text-4xl leading-[1.12] sm:text-5xl">הסיפור שלך, כמו שרואים אותו מבחוץ</h1>
      <p className="mb-8 font-sans text-lg leading-relaxed text-ink-soft">
        כמה שאלות על החיים שלך, וספר שנכתב מהתשובות.
      </p>
      <Link
        href="/interview"
        onClick={start}
        className="inline-block rounded-full bg-ink px-8 py-3.5 font-sans text-paper transition hover:opacity-90"
      >
        מתחילים
      </Link>
      <div className="mx-auto mt-10 h-px w-9 bg-gold-line" />
      <p className="mt-8 font-sans text-xs text-muted">Soothly</p>
    </div>
  );
}
