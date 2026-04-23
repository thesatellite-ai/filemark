/**
 * Minimal skeleton while recharts loads (lazy dynamic import, first
 * chart only; cached for the rest of the session).
 */
export function ChartLoading({ height = 260 }: { height?: number }) {
  return (
    <div
      style={{ height }}
      role="status"
      aria-live="polite"
      className="my-4 flex w-full items-center justify-center rounded-md border border-border/60 bg-card text-[11.5px] italic text-muted-foreground"
    >
      loading chart…
    </div>
  );
}
