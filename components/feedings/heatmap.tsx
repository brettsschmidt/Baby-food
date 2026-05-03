interface Props {
  /** Counts indexed by day-of-week (0=Sun..6=Sat) and hour (0..23). */
  matrix: number[][];
  weeks: number;
}

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Read-only 7×24 heatmap of feeding density. Pure SVG, no deps. */
export function FeedingHeatmap({ matrix, weeks }: Props) {
  const flat = matrix.flat();
  const max = Math.max(1, ...flat);
  const cell = 12;
  const gap = 2;
  const left = 18;
  const top = 14;
  const width = left + 24 * (cell + gap);
  const height = top + 7 * (cell + gap);

  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">
        Last {weeks} weeks · brighter = more feedings
      </p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full text-primary"
        role="img"
        aria-label="Feeding density by day-of-week and hour"
      >
        {DAYS.map((d, i) => (
          <text
            key={i}
            x={0}
            y={top + i * (cell + gap) + cell - 2}
            fontSize={10}
            fill="currentColor"
            className="text-muted-foreground"
          >
            {d}
          </text>
        ))}
        {[0, 6, 12, 18].map((h) => (
          <text
            key={h}
            x={left + h * (cell + gap)}
            y={top - 4}
            fontSize={9}
            fill="currentColor"
            className="text-muted-foreground"
          >
            {h}
          </text>
        ))}
        {matrix.map((row, day) =>
          row.map((count, hour) => {
            const opacity = count === 0 ? 0.05 : 0.15 + 0.85 * (count / max);
            return (
              <rect
                key={`${day}-${hour}`}
                x={left + hour * (cell + gap)}
                y={top + day * (cell + gap)}
                width={cell}
                height={cell}
                rx={2}
                fill="currentColor"
                opacity={opacity}
              >
                <title>
                  {DAYS[day]} {hour}:00 — {count} feeding{count === 1 ? "" : "s"}
                </title>
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );
}
