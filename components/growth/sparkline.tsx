import { bandsFor, interpolateBand, type PercentileMetric } from "@/lib/who-growth";

interface Props {
  /** x is days-since-birth so WHO bands can be aligned. */
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  stroke?: string;
  label: string;
  unit: string;
  /** When set, overlay WHO percentile bands for this metric. */
  metric?: PercentileMetric;
  showBands?: boolean;
}

const BAND_KEYS = ["p3", "p15", "p50", "p85", "p97"] as const;

/** Tiny dependency-free SVG sparkline with optional WHO percentile overlay. */
export function Sparkline({
  points,
  width = 320,
  height = 100,
  stroke = "currentColor",
  label,
  unit,
  metric,
  showBands = true,
}: Props) {
  if (points.length === 0) {
    return (
      <div className="rounded-md border bg-card/50 p-3 text-xs text-muted-foreground">
        No {label.toLowerCase()} data yet.
      </div>
    );
  }

  const renderBands = !!metric && showBands;
  const bands = renderBands ? bandsFor(metric) : [];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);

  // Extend the x-window to at least cover the band ages (in days) so the
  // overlay is visible even with one data point.
  const maxBandDays = renderBands ? bands[bands.length - 1].ageMonths * 30.44 : 0;
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, renderBands ? maxBandDays : 0);

  // Y range from data + band extremes so the curves fit.
  let minY = Math.min(...ys);
  let maxY = Math.max(...ys);
  if (renderBands) {
    for (const b of bands) {
      minY = Math.min(minY, b.p3);
      maxY = Math.max(maxY, b.p97);
    }
  }
  minY *= 0.95;
  maxY *= 1.05;

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

  // Build band paths in days-since-birth space.
  const bandPaths = renderBands
    ? BAND_KEYS.map((k) => {
        const path = bands
          .map((b, i) => {
            const days = b.ageMonths * 30.44;
            const value = interpolateBand(bands, b.ageMonths, k);
            const { cx, cy } = project({ x: days, y: value });
            return `${i === 0 ? "M" : "L"} ${cx.toFixed(1)} ${cy.toFixed(1)}`;
          })
          .join(" ");
        return { key: k, d: path };
      })
    : [];

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
        aria-label={`${label} over time${renderBands ? " with WHO percentile bands" : ""}`}
      >
        {bandPaths.map(({ key, d }) => (
          <path
            key={key}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeWidth={key === "p50" ? "1" : "0.5"}
            strokeDasharray={key === "p50" ? undefined : "2 2"}
            opacity={key === "p50" ? 0.4 : 0.2}
            className="text-muted-foreground"
          />
        ))}
        <path
          d={path}
          fill="none"
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points.map((p, i) => {
          const { cx, cy } = project(p);
          return <circle key={i} cx={cx} cy={cy} r="2.5" fill={stroke} />;
        })}
      </svg>
    </div>
  );
}
