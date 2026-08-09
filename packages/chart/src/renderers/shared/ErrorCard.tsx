/**
 * Surface renderer `validate()` warnings as a visible error card —
 * not just console.warn. Rule 3 (skeleton honesty): authors need to
 * see when they're configuring a chart wrong without opening DevTools.
 *
 * The card hugs its content — it is a *message*, not a chart, so it must not
 * reserve the chart's plotting height. Forcing `minHeight` to the chart height
 * (the old behavior) left a large empty band under a one/two-line error, which
 * read as broken. A callout-sized card is the correct affordance.
 */
export function ChartErrorCard({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div
      role="alert"
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
