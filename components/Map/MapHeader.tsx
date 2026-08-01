import Link from "next/link";

export function MapHeader() {
  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center p-3">
      <Link
        href="/"
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-border bg-surface/85 px-5 py-2 text-sm font-bold uppercase tracking-[0.2em] text-foreground shadow-sm backdrop-blur"
      >
        <span aria-hidden className="text-accent">
          ☀
        </span>
        Sun Chaser
      </Link>
    </header>
  );
}
