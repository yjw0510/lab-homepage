"use client";

import { useEffect, useMemo, useState } from "react";
import { withBasePath } from "@/lib/basePath";

interface MetricPoint {
  phase: string;
  frame: number;
  timePs: number;
  hydrationContacts: number;
  packingScore: number;
  caffeineNeighbors: number;
}

interface MetricsPayload {
  trajectory?: MetricPoint[];
}

function normalize(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span < 1e-9) return values.map(() => 0.5);
  return values.map((value) => (value - min) / span);
}

function buildPath(values: number[], rowY: number, width: number) {
  const normalized = normalize(values);
  return normalized
    .map((value, index) => {
      const x = normalized.length <= 1 ? 0 : (index / (normalized.length - 1)) * width;
      const y = rowY + 10 - value * 20;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function ObservableTrace({
  lang,
  reducedMotion,
}: {
  lang: string;
  reducedMotion: boolean;
}) {
  const [points, setPoints] = useState<MetricPoint[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(withBasePath("/data/multiscale/allatom/metrics.json"))
      .then((response) => {
        if (!response.ok) throw new Error(`Metrics request failed: ${response.status}`);
        return response.json() as Promise<MetricsPayload>;
      })
      .then((payload) => {
        if (cancelled) return;
        const production = (payload.trajectory ?? []).filter(
          (entry) =>
            entry.phase === "nvt" &&
            Number.isFinite(entry.timePs) &&
            Number.isFinite(entry.hydrationContacts) &&
            Number.isFinite(entry.packingScore) &&
            Number.isFinite(entry.caffeineNeighbors),
        );
        setPoints(production.slice(-24));
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tracks = useMemo(() => {
    if (!points?.length) return [];
    return [
      {
        label: lang === "ko" ? "물과의 접촉" : "water contacts",
        values: points.map((point) => point.hydrationContacts),
        color: "var(--sch-stretch)",
      },
      {
        label: lang === "ko" ? "분자 정렬" : "molecular alignment",
        values: points.map((point) => point.packingScore),
        color: "var(--sch-amber)",
      },
      {
        label: lang === "ko" ? "가까운 분자 수" : "nearby molecules",
        values: points.map((point) => point.caffeineNeighbors),
        color: "var(--sch-ink)",
      },
    ];
  }, [lang, points]);

  if (failed) {
    return (
      <div className="border border-border bg-muted/40 px-3 py-4 font-mono text-xs text-muted-foreground">
        {lang === "ko" ? "궤적 측정값을 불러오지 못했습니다." : "Trajectory measurements are unavailable."}
      </div>
    );
  }

  if (!points) {
    return (
      <div
        className={`h-[142px] border border-border bg-muted/40 ${reducedMotion ? "" : "animate-pulse"}`}
        aria-label={lang === "ko" ? "궤적 측정값 불러오는 중" : "Loading trajectory measurements"}
      />
    );
  }

  if (!tracks.length) {
    return (
      <div className="border border-border bg-muted/40 px-3 py-4 font-mono text-xs text-muted-foreground">
        {lang === "ko" ? "사용 가능한 궤적 표본이 없습니다." : "No trajectory samples are available."}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      role="img"
      aria-label={
        lang === "ko"
          ? "같은 분자 궤적에서 세 가지 성질이 시간에 따라 변하는 모습"
          : "Three properties changing over time along the same molecular trajectory"
      }
    >
      {tracks.map((track, index) => {
        const width = 430;
        const rowY = 16;
        const path = buildPath(track.values, rowY, width);
        return (
          <div key={track.label} className="grid gap-1.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
            <span className="text-sm font-medium leading-5" style={{ color: track.color }}>
              {track.label}
            </span>
            <svg viewBox="0 0 430 32" className="h-9 w-full" aria-hidden="true">
              <line
                x1={0}
                x2={width}
                y1={rowY}
                y2={rowY}
                stroke="var(--plot-axis)"
                strokeOpacity={0.24}
                strokeDasharray="3 5"
              />
              <path
                d={path}
                fill="none"
                stroke={track.color}
                strokeWidth={index === 0 ? 2.2 : 1.8}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {track.values.map((_, pointIndex) => {
                const normalized = normalize(track.values)[pointIndex];
                const x = track.values.length <= 1 ? 0 : (pointIndex / (track.values.length - 1)) * width;
                const y = rowY + 10 - normalized * 20;
                return (
                  <circle
                    key={`${track.label}-${pointIndex}`}
                    cx={x}
                    cy={y}
                    r={pointIndex === track.values.length - 1 ? 2.7 : 1.25}
                    fill={track.color}
                    fillOpacity={pointIndex === track.values.length - 1 ? 0.95 : 0.42}
                  />
                );
              })}
            </svg>
          </div>
        );
      })}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-2 font-mono text-xs text-muted-foreground">
        <span>{lang === "ko" ? "곡선마다 범위를 따로 맞춤" : "each curve scaled separately"}</span>
        <span>{lang === "ko" ? "이른 시점 → 늦은 시점" : "earlier → later"}</span>
      </div>
    </div>
  );
}
