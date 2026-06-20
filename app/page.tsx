import Link from "next/link";
import PaperField from "@/app/components/PaperField";

export default function Home() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <PaperField surface="full" />
      <div className="paper-content max-w-prose text-center">
        <p className="mb-6 font-sans text-xs tracking-[0.28em] text-muted">ספר אישי</p>
        <h1 className="mb-5 font-serif text-4xl leading-tight sm:text-5xl">כאן נולד הספר שלך</h1>
        <p className="mb-8 font-sans text-lg leading-relaxed text-ink-soft">
          מקום שקט לספר את החיים שלך - ולגלות את מה שרק מבחוץ אפשר לראות.
        </p>
        <Link
          href="/interview"
          className="inline-block rounded-full bg-ink px-8 py-3.5 font-sans text-paper transition hover:opacity-90"
        >
          להתחיל לספר
        </Link>
        <div className="mx-auto mt-10 h-px w-9 bg-gold-line" />
        <p className="mt-8 font-sans text-xs text-muted">Soothly</p>
      </div>
    </main>
  );
}
