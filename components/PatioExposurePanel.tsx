"use client";

import { useState } from "react";
import type { Patio } from "@/lib/types";
import { estimateExposure } from "@/lib/sun-exposure";
import { STATUS_META } from "@/lib/format";
import { SunTimeControl } from "@/components/DateTimePicker/SunTimeControl";

export function PatioExposurePanel({ patio }: { patio: Patio }) {
  const [now, setNow] = useState(() => new Date());
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const at = previewAt ?? now;

  const exposure = estimateExposure(patio, at);
  const meta = STATUS_META[exposure.status];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex items-center gap-3 rounded-xl border p-4"
        style={{ borderColor: `${meta.color}55`, backgroundColor: `${meta.color}14` }}
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: meta.color }}
        />
        <div>
          {/* The dot carries the status colour. Colouring the label too made a
              sunny patio read like an error state. */}
          <div className="font-semibold text-foreground">{meta.label}</div>
          <div className="text-sm text-muted">{exposure.reason}</div>
        </div>
      </div>

      <SunTimeControl
        value={at}
        onChange={setPreviewAt}
        onReset={() => {
          setPreviewAt(null);
          setNow(new Date());
        }}
        isNow={previewAt === null}
      />
    </div>
  );
}
