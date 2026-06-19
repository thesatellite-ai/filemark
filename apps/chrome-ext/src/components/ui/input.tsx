import { Input as InputPrimitive } from "@base-ui/react/input";
import * as React from "react";

import { cn } from "@/lib/utils";

// Compact density default: h-7, 12px text, flat 1px border, no shadow, 1px
// focus ring — matches the NativeSelect/Button heights so form rows line up.
// Override per-instance via className (tailwind-merge wins on conflicts).
function Input({
  className,
  type,
  ...props
}: InputPrimitive.Props & React.RefAttributes<HTMLInputElement>) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-7 w-full min-w-0 rounded-md border bg-transparent px-2.5 text-[12px] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[12px] file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:border-ring focus-visible:ring-ring focus-visible:ring-1",
        "aria-invalid:ring-destructive/30 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Input };
