/**
 * Surface renderer `validate()` warnings as a visible error card —
 * not just console.warn. Rule 3 (skeleton honesty): authors need to
 * see when they're configuring a chart wrong without opening DevTools.
 */
export function ChartErrorCard({
  messages,
  height = 120,
}: {
  messages: string[];
  height?: number;
}) {
  if (messages.length === 0) return null;
  return (
    <div
      role="alert"
      style={{ minHeight: height }}
      className="flex flex-col items-start gap-1 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs"
    >
      <div className="font-semibold text-amber-600 dark:text-amber-400">
        Chart — misconfigured
      </div>
      <ul className="m-0 list-disc pl-5 text-foreground/80">
        {messages.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </div>
  );
}
