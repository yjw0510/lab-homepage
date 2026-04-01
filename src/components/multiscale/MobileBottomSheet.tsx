"use client";

import { useRef, useCallback, useEffect, useState, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useDragControls,
  animate as fmAnimate,
  type PanInfo,
} from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export type SheetSnap = "peek" | "half" | "full";

const PEEK_PX = 120;
const HALF_RATIO = 0.48;
const FULL_RATIO = 0.88;

interface Props {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header: ReactNode;
  children: ReactNode;
}

export function MobileBottomSheet({ snap, onSnapChange, header, children }: Props) {
  const reducedMotion = useReducedMotion();
  const sheetRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const y = useMotionValue(0);
  const dragControls = useDragControls();

  // Measure parent container height
  useEffect(() => {
    const parent = sheetRef.current?.parentElement;
    if (!parent) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerH(entry.contentRect.height);
    });
    ro.observe(parent);
    setContainerH(parent.getBoundingClientRect().height);
    return () => ro.disconnect();
  }, []);

  const sheetH = containerH * FULL_RATIO;

  // Y offset for each snap (0 = fully open, larger = more hidden)
  const getSnapY = useCallback(
    (s: SheetSnap) => {
      if (!containerH) return 0;
      switch (s) {
        case "full":
          return 0;
        case "half":
          return sheetH - containerH * HALF_RATIO;
        case "peek":
          return sheetH - PEEK_PX;
      }
    },
    [containerH, sheetH],
  );

  // Animate to snap position
  useEffect(() => {
    if (!containerH) return;
    const target = getSnapY(snap);
    if (reducedMotion) {
      y.set(target);
    } else {
      fmAnimate(y, target, { type: "spring", damping: 30, stiffness: 300 });
    }
  }, [snap, containerH, getSnapY, y, reducedMotion]);

  const handleDragEnd = useCallback(
    (_: unknown, info: PanInfo) => {
      const currentY = y.get();
      const vel = info.velocity.y;

      // High velocity → snap in direction
      if (vel > 500) {
        onSnapChange(snap === "full" ? "half" : "peek");
        return;
      }
      if (vel < -500) {
        onSnapChange(snap === "peek" ? "half" : "full");
        return;
      }

      // Otherwise snap to nearest
      const snaps: SheetSnap[] = ["full", "half", "peek"];
      let closest: SheetSnap = snap;
      let minDist = Infinity;
      for (const s of snaps) {
        const dist = Math.abs(currentY - getSnapY(s));
        if (dist < minDist) {
          minDist = dist;
          closest = s;
        }
      }
      onSnapChange(closest);
    },
    [snap, y, getSnapY, onSnapChange],
  );

  const isPeek = snap === "peek";

  return (
    <motion.div
      ref={sheetRef}
      className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-2xl border-t border-white/10 bg-[#050913] shadow-[0_-8px_32px_rgba(0,0,0,0.4)]"
      style={{
        height: containerH ? `${sheetH}px` : `${FULL_RATIO * 100}vh`,
        y,
      }}
      drag={reducedMotion ? false : "y"}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{
        top: 0,
        bottom: containerH ? getSnapY("peek") : 0,
      }}
      dragElastic={0.08}
      onDragEnd={handleDragEnd}
    >
      {/* Drag handle + header (drag trigger area) */}
      <div
        onPointerDown={(e) => dragControls.start(e)}
        style={{ touchAction: "none" }}
        className="flex-shrink-0 cursor-grab active:cursor-grabbing"
      >
        <div className="flex justify-center pt-2 pb-1">
          <div className="h-1 w-9 rounded-full bg-white/25" />
        </div>
        {header}
      </div>

      {/* Scrollable content */}
      <div
        className="min-h-0 flex-1 overflow-y-auto"
        aria-hidden={isPeek}
        tabIndex={isPeek ? -1 : undefined}
      >
        {children}
      </div>
    </motion.div>
  );
}
