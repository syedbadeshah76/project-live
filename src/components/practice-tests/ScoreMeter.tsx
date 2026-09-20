interface Props {
  score: number; // 0-100
  outOf?: number;
}

export function ScoreMeter({ score, outOf = 100 }: Props) {
  const numScore = Math.round(Number(score) || 0);
  const ticks = 40;
  const filled = Math.round((numScore / outOf) * ticks);
  const radius = 130;
  const center = 160;
  return (
    <div className="relative grid place-items-center">
      <svg width={320} height={320} viewBox="0 0 320 320">
        {Array.from({ length: ticks }).map((_, i) => {
          const angle = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const x1 = center + Math.cos(angle) * (radius - 12);
          const y1 = center + Math.sin(angle) * (radius - 12);
          const x2 = center + Math.cos(angle) * radius;
          const y2 = center + Math.sin(angle) * radius;
          const active = i < filled;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={active ? (i < ticks * 0.85 ? "#2D4BFF" : "#7C3AED") : "#E5E9F2"}
              strokeWidth={4}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="text-5xl font-bold text-[#1F2937]">{numScore}</div>
          <div className="text-xs text-[#6B7280]">out of {outOf}</div>
        </div>
      </div>
    </div>
  );
}
