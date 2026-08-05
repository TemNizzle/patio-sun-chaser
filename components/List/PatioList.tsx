"use client";

import { Fragment } from "react";
import type { Patio } from "@/lib/types";
import { PatioCard } from "@/components/List/PatioCard";
import { AdSlot } from "@/components/Ads/AdSlot";

interface Props {
  patios: Patio[];
  at: Date;
  cloudCoverPercent?: number;
  selectedId?: string;
  onSelect?: (id: string) => void;
}

export function PatioList({
  patios,
  at,
  cloudCoverPercent,
  selectedId,
  onSelect,
}: Props) {
  if (patios.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface-muted p-8 text-center text-sm text-muted">
        No patios match these filters. Try clearing the “sunny now” filter or
        picking a different time of day.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {patios.map((patio, i) => (
        <Fragment key={patio.id}>
          <PatioCard
            patio={patio}
            at={at}
            cloudCoverPercent={cloudCoverPercent}
            selected={patio.id === selectedId}
            onSelect={onSelect}
          />
          {i === 3 && <AdSlot placement="list-inline" />}
        </Fragment>
      ))}
    </div>
  );
}
