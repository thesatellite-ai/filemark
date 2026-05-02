import { useEffect, useRef, useState } from "react";
import type { FileRef, StorageAdapter } from "@filemark/core";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  file: FileRef;
  storage?: StorageAdapter;
  /** Source line number from remark's AST (passed as a prop only when
   *  the host can resolve it for `<input>` itself — react-markdown's
   *  `node.position` is unreliable for inputs synthesised by remark-gfm,
   *  so the runtime DOM walk to `data-fv-task-line` on the parent `<li>`
   *  is the trusted path. The `<li>` is decorated by TaskItem). */
  line?: number;
}

// v2 storage key — bumped from v1 (which used DOM-position indices and
// leaked across files mounted in the same tab session). Old v1 data is
// silently ignored so a previously-corrupted IDB row stops mis-toggling
// state on the next view.
const taskKey = (fileId: string) => `fv:task:v2:${fileId}`;

/**
 * Fallback when `line` isn't available from the AST. Scoped to the
 * per-file `.fv-mdx-body` ancestor so document-wide queries can't
 * collide across simultaneously-mounted files.
 */
function indexOfTask(el: HTMLInputElement): number {
  const scope = el.closest(".fv-mdx-body") ?? document;
  const all = scope.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][data-fv-task]'
  );
  return Array.from(all).indexOf(el);
}

export function TaskCheckbox({
  file,
  storage,
  line,
  disabled: _disabled, // remark-gfm forces `disabled`; override so users can toggle.
  ...rest
}: Props) {
  const initial = !!rest.checked || !!rest.defaultChecked;
  const [checked, setChecked] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);

  // Stable identifier for this checkbox in this file. Resolution order:
  //   1. `data-fv-task-line` on the closest `<li>` ancestor — set by
  //      TaskItem from the hast LI's position. Most reliable for
  //      remark-gfm task bullets.
  //   2. The `line` prop (host-supplied, sometimes unreliable for
  //      inputs depending on react-markdown internals).
  //   3. Scoped DOM index — last resort, only for non-task `<input>`s
  //      that somehow flow through here, or hosts without TaskItem.
  // Use a string prefix so JSON storage stays object-shaped instead of
  // turning into an array for integer-only keys.
  const keyOf = (el: HTMLInputElement): string => {
    const li = el.closest("li[data-fv-task-line]") as HTMLElement | null;
    const liLine = li?.getAttribute("data-fv-task-line");
    if (liLine) {
      const n = parseInt(liLine, 10);
      if (Number.isFinite(n)) return `L${n}`;
    }
    if (typeof line === "number") return `L${line}`;
    const idx = indexOfTask(el);
    return idx >= 0 ? `i${idx}` : "";
  };

  // Restore persisted state once mounted. Re-runs if the file changes.
  useEffect(() => {
    if (!storage) return;
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    (async () => {
      const data = await storage.get<Record<string, boolean>>(taskKey(file.id));
      if (cancelled || !data) return;
      const k = keyOf(el);
      if (k && data[k] !== undefined) setChecked(data[k]);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storage, file.id, line]);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setChecked(next);
    if (!storage) return;
    const el = ref.current;
    if (!el) return;
    const k = keyOf(el);
    if (!k) return;
    const existing =
      (await storage.get<Record<string, boolean>>(taskKey(file.id))) ?? {};
    existing[k] = next;
    await storage.set(taskKey(file.id), existing);
  };

  return (
    <input
      {...rest}
      ref={ref}
      type="checkbox"
      data-fv-task=""
      checked={checked}
      onChange={onChange}
      className={`fv-task ${rest.className ?? ""}`}
    />
  );
}
