import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import type { OrientationOverrides } from "@/lib/orientation-overrides";

/**
 * Read/write endpoint behind the /admin/orientation entry tool. Writes to the
 * repo working tree, so it is refused outside `next dev` — there is no source
 * checkout to write to on a deployed host.
 */

const FILE = path.join(process.cwd(), "data", "orientations.json");

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;

  try {
    const raw = await readFile(FILE, "utf8");
    return NextResponse.json(JSON.parse(raw) as OrientationOverrides);
  } catch {
    return NextResponse.json({});
  }
}

export async function POST(request: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const body = (await request.json()) as OrientationOverrides;
  // Sort by key so the diff stays readable as entries trickle in.
  const sorted = Object.fromEntries(
    Object.entries(body).sort(([a], [b]) => a.localeCompare(b))
  );
  await writeFile(FILE, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
  return NextResponse.json({ saved: Object.keys(sorted).length });
}
