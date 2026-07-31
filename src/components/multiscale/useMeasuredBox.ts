"use client";

import { useEffect, useRef, useState } from "react";

/**
 * An element's own pixel size, kept current.
 *
 * Three places needed this and each had written it out: the SCF slider's track, the
 * convergence chart's svg, and the plot container's measuring div. The reason it matters
 * beyond tidiness is that all three write a coordinate system from the number. When
 * PlotContainer floored its measurement at 320 the viewBox stopped matching pixels and
 * every label in three plots silently shrank to boxWidth/320 of its declared size, while
 * getComputedStyle kept reporting the declared value. Sub-pixel and zero readings are
 * dropped rather than written, so a coordinate system is never built from a box that has
 * not been laid out yet.
 */
export function useMeasuredBox<T extends Element>(initial: { width: number; height: number }) {
  const ref = useRef<T>(null);
  const [box, setBox] = useState(initial);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      setBox({ width: Math.round(rect.width), height: Math.round(rect.height) });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return [ref, box] as const;
}
