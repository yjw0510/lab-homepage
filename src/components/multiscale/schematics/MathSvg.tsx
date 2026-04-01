import { MATH_SVG } from "./mathSvgData";

interface MathSvgProps {
  formulaKey: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  anchor?: "start" | "middle" | "end";
}

export function MathSvg({
  formulaKey, x, y, width, height, color, anchor = "start",
}: MathSvgProps) {
  const d = MATH_SVG[formulaKey];
  if (!d) return null;

  const left =
    anchor === "end" ? x - width :
    anchor === "middle" ? x - width / 2 :
    x;

  return (
    <svg
      x={left}
      y={y}
      width={width}
      height={height}
      viewBox={d.viewBox}
      overflow="visible"
      preserveAspectRatio="xMinYMin meet"
      style={{ color }}
      dangerouslySetInnerHTML={{ __html: d.svg }}
    />
  );
}
