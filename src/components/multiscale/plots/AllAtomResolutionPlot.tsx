"use client";

import { PlotContainer, PLOT_COLORS } from "./PlotContainer";

/*
 * Caffeine xanthine scaffold — fused 6+5 ring, 14 heavy atoms.
 * Coordinates relative to molecule center (0,0), hex circumradius r=14.
 */

interface Atom { dx: number; dy: number; r: number; color: string }
interface Bond { from: number; to: number; width: number; opacity?: number }

const ATOMS: Atom[] = [
  /* 0  N1  */ { dx: -12.1, dy: 7, r: 5.0, color: "#3b82f6" },
  /* 1  C2  */ { dx: -12.1, dy: -7, r: 4.0, color: "#94a3b8" },
  /* 2  N3  */ { dx: 0, dy: -14, r: 5.0, color: "#3b82f6" },
  /* 3  C4  */ { dx: 12.1, dy: -7, r: 4.0, color: "#94a3b8" },
  /* 4  C5  */ { dx: 12.1, dy: 7, r: 4.0, color: "#94a3b8" },
  /* 5  C6  */ { dx: 0, dy: 14, r: 4.0, color: "#94a3b8" },
  /* 6  N7  */ { dx: 25.4, dy: 11.3, r: 5.0, color: "#3b82f6" },
  /* 7  C8  */ { dx: 33.7, dy: 0, r: 4.0, color: "#94a3b8" },
  /* 8  N9  */ { dx: 25.4, dy: -11.3, r: 5.0, color: "#3b82f6" },
  /* 9  O@C2*/ { dx: -24.2, dy: -14, r: 4.5, color: "#ef4444" },
  /* 10 O@C6*/ { dx: 0, dy: 28, r: 4.5, color: "#ef4444" },
  /* 11 Me@N1*/{ dx: -24.2, dy: 14, r: 3.2, color: "#cbd5e1" },
  /* 12 Me@N3*/{ dx: 0, dy: -28, r: 3.2, color: "#cbd5e1" },
  /* 13 Me@N7*/{ dx: 32, dy: 23, r: 3.2, color: "#cbd5e1" },
];

const BONDS: Bond[] = [
  { from: 0, to: 1, width: 1.6 }, { from: 1, to: 2, width: 1.6 },
  { from: 2, to: 3, width: 1.6 }, { from: 3, to: 4, width: 1.6 },
  { from: 4, to: 5, width: 1.6 }, { from: 5, to: 0, width: 1.6 },
  { from: 3, to: 8, width: 1.6 }, { from: 8, to: 7, width: 1.6 },
  { from: 7, to: 6, width: 1.6 }, { from: 6, to: 4, width: 1.6 },
  { from: 1, to: 9, width: 2.0 }, { from: 5, to: 10, width: 2.0 },
  { from: 0, to: 11, width: 1.2, opacity: 0.7 },
  { from: 2, to: 12, width: 1.2, opacity: 0.7 },
  { from: 6, to: 13, width: 1.2, opacity: 0.7 },
];

function waterSvg(cx: number, cy: number, oR: number, hR: number, angle: number, opacity: number, key: string) {
  const bondLen = oR * 2.6;
  const half = (104.5 / 2) * (Math.PI / 180);
  const h1x = cx + Math.cos(angle - half) * bondLen;
  const h1y = cy + Math.sin(angle - half) * bondLen;
  const h2x = cx + Math.cos(angle + half) * bondLen;
  const h2y = cy + Math.sin(angle + half) * bondLen;
  return (
    <g key={key} opacity={opacity}>
      <line x1={cx} y1={cy} x2={h1x} y2={h1y} stroke="#93c5fd" strokeWidth={1.3} opacity={0.55} />
      <line x1={cx} y1={cy} x2={h2x} y2={h2y} stroke="#93c5fd" strokeWidth={1.3} opacity={0.55} />
      <circle cx={cx} cy={cy} r={oR} fill="#60a5fa" />
      <circle cx={h1x} cy={h1y} r={hR} fill="#e2e8f0" />
      <circle cx={h2x} cy={h2y} r={hR} fill="#e2e8f0" />
    </g>
  );
}

export function AllAtomResolutionPlot({
  accentColor,
}: {
  progress: number;
  accentColor: string;
  rdfActiveRadius?: number;
}) {
  return (
    <PlotContainer
      ariaLabel="Atomistic resolution: caffeine in explicit water — every atom resolved"
      aspectRatio={0.8}
      minHeight={250}
      maxHeight={320}
    >
      {({ innerWidth, innerHeight, margin, font }) => {
        // Box fills most of the drawable area
        const boxPadX = innerWidth * 0.04;
        const boxPadTop = innerHeight * 0.04;
        const boxPadBot = innerHeight * 0.16; // room for label below
        const boxX = margin.left + boxPadX;
        const boxY = margin.top + boxPadTop;
        const boxW = innerWidth - boxPadX * 2;
        const boxH = innerHeight - boxPadTop - boxPadBot;

        // Caffeine center — slightly left of box center to balance the imidazole extension
        const cx = boxX + boxW * 0.38;
        const cy = boxY + boxH * 0.46;

        // 8 water molecules scattered around caffeine, inside box
        // Each: [O_x, O_y, angle_rad]
        const waters: [number, number, number][] = [
          [boxX + boxW * 0.08, boxY + boxH * 0.18, 2.4],
          [boxX + boxW * 0.06, boxY + boxH * 0.58, 4.2],
          [boxX + boxW * 0.10, boxY + boxH * 0.88, 1.0],
          [boxX + boxW * 0.78, boxY + boxH * 0.12, 3.6],
          [boxX + boxW * 0.88, boxY + boxH * 0.42, 5.2],
          [boxX + boxW * 0.82, boxY + boxH * 0.78, 0.4],
          [boxX + boxW * 0.48, boxY + boxH * 0.88, 2.8],
          [boxX + boxW * 0.32, boxY + boxH * 0.12, 4.8],
        ];

        // Pick one water to label — upper-right one (index 4) is clearly a water
        const labelWater = waters[4];

        return {
          svg: (
            <g>
              {/* 1. Box background — solid border, not dashed */}
              <rect
                x={boxX} y={boxY} width={boxW} height={boxH}
                rx={4} fill="#080e1a"
                stroke={accentColor} strokeWidth={1.0} opacity={0.8}
              />

              {/* 2. Water molecules (faded) */}
              {waters.map(([wx, wy, angle], i) =>
                waterSvg(wx, wy, 4, 2.2, angle, 0.42, `w${i}`),
              )}

              {/* 3. Caffeine bonds */}
              {BONDS.map((bond, i) => {
                const a = ATOMS[bond.from];
                const b = ATOMS[bond.to];
                return (
                  <line
                    key={`b${i}`}
                    x1={cx + a.dx} y1={cy + a.dy}
                    x2={cx + b.dx} y2={cy + b.dy}
                    stroke="#64748b" strokeWidth={bond.width}
                    strokeLinecap="round" opacity={bond.opacity ?? 0.85}
                  />
                );
              })}

              {/* 4. Caffeine atoms (on top of bonds) */}
              {ATOMS.map((atom, i) => (
                <circle
                  key={`a${i}`}
                  cx={cx + atom.dx} cy={cy + atom.dy}
                  r={atom.r} fill={atom.color}
                />
              ))}
            </g>
          ),
          overlays: [
            // Label below box — the key message of this page
            {
              x: boxX + boxW * 0.5,
              y: boxY + boxH + font.annotation * 1.5,
              text: "caffeine in explicit solvent — every atom resolved",
              align: "middle",
              color: accentColor,
              fontSize: font.annotation,
            },
            // Label pointing at a specific water inside the box
            {
              x: labelWater[0] + 16,
              y: labelWater[1] - 12,
              text: "H\u2082O",
              align: "start",
              color: PLOT_COLORS.text,
              fontSize: font.annotation * 0.9,
            },
          ],
        };
      }}
    </PlotContainer>
  );
}
