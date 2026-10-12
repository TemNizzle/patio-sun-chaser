"use client";

import Link from "next/link";
import { CITIES, cityPath, type CityId } from "@/lib/cities";
import { setCityCookie } from "@/lib/city-choice";

/** Lets the visitor pick a city. The choice sticks, so "/" opens there next time. */
export function CitySwitcher({ current }: { current: CityId }) {
  return (
    <nav
      aria-label="City"
      className="absolute left-4 top-16 z-20 flex rounded-full border border-border bg-surface/90 p-0.5 text-xs font-medium shadow-sm backdrop-blur"
    >
      {Object.values(CITIES).map((c) => (
        <Link
          key={c.id}
          href={cityPath(c.id)}
          onClick={() => setCityCookie(c.id)}
          aria-current={c.id === current ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 transition ${
            c.id === current
              ? "bg-accent text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {c.name}
        </Link>
      ))}
    </nav>
  );
}
