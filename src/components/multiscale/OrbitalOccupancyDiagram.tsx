type Variant = "singlet" | "spin-crossover";

export function OrbitalOccupancyDiagram({
  variant,
  lang,
  className = "",
}: {
  variant: Variant;
  lang: string;
  className?: string;
}) {
  const ko = lang === "ko";
  const crossover = variant === "spin-crossover";

  return (
    <svg
      viewBox="0 0 240 150"
      className={className}
      role="img"
      aria-label={
        crossover
          ? ko
            ? "낮은 에너지 준위에 짝지어진 두 전자가 서로 다른 준위의 평행 스핀으로 바뀌는 도식"
            : "Two paired electrons on the lower level change into parallel spins on separate energy levels"
          : ko
            ? "낮은 두 에너지 준위에 전자가 두 개씩 짝지어진 singlet 점유 도식"
            : "Singlet occupation with paired electrons on the two lower energy levels"
      }
    >
      <text x="12" y="20" fill="#94a3b8" fontSize="12">E</text>
      <path d="M18 130 V24 M14 30 L18 22 L22 30" fill="none" stroke="#64748b" strokeWidth="1.6" />

      {[42, 82, 122].map((y, index) => (
        <g key={y}>
          <text x="34" y={y + 4} fill="#94a3b8" fontSize="12">
            ε{3 - index}
          </text>
          <line
            x1="58"
            y1={y}
            x2="196"
            y2={y}
            stroke={index === 0 ? "#a78bfa" : "#64748b"}
            strokeWidth="2"
          />
        </g>
      ))}

      <g>
        <line x1="104" y1="122" x2="104" y2="99" stroke="#67e8f9" strokeWidth="3" />
        <path d="M98 106 L104 98 L110 106" fill="none" stroke="#67e8f9" strokeWidth="2.5" />
      </g>
      {!crossover ? (
        <g>
          <line x1="124" y1="99" x2="124" y2="122" stroke="#fda4af" strokeWidth="3" />
          <path d="M118 114 L124 122 L130 114" fill="none" stroke="#fda4af" strokeWidth="2.5" />
        </g>
      ) : null}

      {!crossover ? (
        <>
          <g>
            <line x1="104" y1="82" x2="104" y2="59" stroke="#67e8f9" strokeWidth="3" />
            <path d="M98 66 L104 58 L110 66" fill="none" stroke="#67e8f9" strokeWidth="2.5" />
          </g>
          <g>
            <line x1="124" y1="59" x2="124" y2="82" stroke="#fda4af" strokeWidth="3" />
            <path d="M118 74 L124 82 L130 74" fill="none" stroke="#fda4af" strokeWidth="2.5" />
          </g>
        </>
      ) : (
        <>
          <g className="dft-spin-ls">
            <line x1="124" y1="99" x2="124" y2="122" stroke="#c4b5fd" strokeWidth="3" />
            <path d="M118 114 L124 122 L130 114" fill="none" stroke="#c4b5fd" strokeWidth="2.5" />
          </g>
          <g className="dft-spin-hs">
            <line x1="124" y1="82" x2="124" y2="59" stroke="#c4b5fd" strokeWidth="3" />
            <path d="M118 66 L124 58 L130 66" fill="none" stroke="#c4b5fd" strokeWidth="2.5" />
          </g>
          <path
            className="dft-spin-path"
            d="M130 112 Q166 96 130 72"
            fill="none"
            stroke="#c4b5fd"
            strokeWidth="1.8"
            strokeDasharray="4 4"
          />
        </>
      )}

      <line
        x1="212"
        y1={crossover ? 82 : 42}
        x2="212"
        y2={crossover ? 122 : 82}
        stroke="#94a3b8"
        strokeWidth="1.4"
      />
      <path
        d={
          crossover
            ? "M207 89 L212 82 L217 89 M207 115 L212 122 L217 115"
            : "M207 49 L212 42 L217 49 M207 75 L212 82 L217 75"
        }
        fill="none"
        stroke="#94a3b8"
        strokeWidth="1.4"
      />
      <text x="220" y={crossover ? 106 : 66} fill="#cbd5e1" fontSize="12">Δε</text>
    </svg>
  );
}
