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
        label: lang === "ko" ? "카보닐-물 접촉 후보" : "carbonyl-water contact candidates",
        values: points.map((point) => point.hydrationContacts),
        color: "var(--sch-stretch)",
      },
      {
        label: lang === "ko" ? "최대 휴리스틱 적층 점수" : "max heuristic stacking score",
        values: points.map((point) => point.packingScore),
        color: "var(--sch-amber)",
      },
      {
        label: lang === "ko" ? "10 Å 이내 고리 중심 이웃" : "ring-center neighbors within 10 Å",
        values: points.map((point) => point.caffeineNeighbors),
        color: "var(--sch-ink)",
      },
    ];
  }, [lang, points]);

  if (failed) {
    return (
      <div className="border border-border bg-muted/40 px-3 py-4 font-mono text-xs text-muted-foreground">
        {lang === "ko" ? "궤적 관측량을 불러오지 못했습니다." : "Trajectory observables are unavailable."}
      </div>
    );
  }

  if (!points) {
    return (
      <div
        className={`h-[142px] border border-border bg-muted/40 ${reducedMotion ? "" : "animate-pulse"}`}
        aria-label={lang === "ko" ? "궤적 관측량 불러오는 중" : "Loading trajectory observables"}
      />
    );
  }

  if (!tracks.length) {
    return (
      <div className="border border-border bg-muted/40 px-3 py-4 font-mono text-xs text-muted-foreground">
        {lang === "ko" ? "사용 가능한 NVT 표본이 없습니다." : "No NVT samples are available."}
      </div>
    );
  }

  return (
    <div
      className="grid gap-3"
      role="img"
      aria-label={
        lang === "ko"
          ? "같은 생산 궤적에서 추출한 세 관측량의 실제 시간 변화"
          : "Real time-varying traces for three observables from the same production trajectory"
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
        <span>{lang === "ko" ? "각 추적선 독립 정규화" : "each trace independently normalized"}</span>
        <span>{points[0]?.timePs.toFixed(1)}-{points.at(-1)?.timePs.toFixed(1)} ps</span>
      </div>
    </div>
  );
}
