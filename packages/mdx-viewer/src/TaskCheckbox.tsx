import { useEffect, useRef, useState } from "react";
import type { FileRef, StorageAdapter } from "@filemark/core";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  file: FileRef;
  storage?: StorageAdapter;
}

const taskKey = (fileId: string) => `fv:task:${fileId}`;

function indexOfTask(el: HTMLInputElement): number {
  const all = document.querySelectorAll<HTMLInputElement>(
    'input[type="checkbox"][data-fv-task]'
  );
  return Array.from(all).indexOf(el);
}

export function TaskCheckbox({
  file,
  storage,
  disabled: _disabled, // remark-gfm forces `disabled`; override so users can toggle.
  ...rest
}: Props) {
  const initial = !!rest.checked || !!rest.defaultChecked;
  const [checked, setChecked] = useState(initial);
  const ref = useRef<HTMLInputElement | null>(null);

  // Restore persisted state once mounted. Re-runs if the file changes.
  useEffect(() => {
    if (!storage) return;
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    (async () => {
      const data = await storage.get<Record<number, boolean>>(taskKey(file.id));
      if (cancelled || !data) return;
      const idx = indexOfTask(el);
      if (idx >= 0 && data[idx] !== undefined) setChecked(data[idx]);
    })();
    return () => {
      cancelled = true;
    };
  }, [storage, file.id]);

  const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.checked;
    setChecked(next);
    if (!storage) return;
    const el = ref.current;
    if (!el) return;
    const idx = indexOfTask(el);
    if (idx < 0) return;
    const existing =
      (await storage.get<Record<number, boolean>>(taskKey(file.id))) ?? {};
    existing[idx] = next;
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
