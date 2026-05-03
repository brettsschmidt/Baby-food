interface Props {
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  stroke?: string;
  label: string;
  unit: string;
}

/** Tiny dependency-free SVG sparkline. x = days since first point. */
export function Sparkline({
  points,
  width = 320,
  height = 80,
  stroke = "currentColor",
  label,
  unit,
}: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-md border bg-card/50 p-3 text-xs text-muted-foreground">
        No {label.toLowerCase()} data yet.
      </div>
    );
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys) * 0.95;
  const maxY = Math.max(...ys) * 1.05;
  const xRange = maxX - minX || 1;
  const yRange = maxY - minY || 1;
  const padding = 8;

  const project = (p: { x: number; y: number }) => ({
    cx: padding + ((p.x - minX) / xRange) * (width - padding * 2),
    cy: height - padding - ((p.y - minY) / yRange) * (height - padding * 2),
  });

  const path = points
    .map((p, i) => {
      const { cx, cy } = project(p);
      return `${i === 0 ? "M" : "L"} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
    })
    .join(" ");

  const last = points[points.length - 1];

  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-sm font-semibold">
          {last.y.toFixed(2)} {unit}
        </span>
      </div>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-primary"
        role="img"
        aria-label={`${label} over time`}
      >
        <path d={path} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => {
          const { cx, cy } = project(p);
          return <circle key={i} cx={cx} cy={cy} r="2.5" fill={stroke} />;
        })}
      </svg>
    </div>
  );
}
