import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Alert — vendored from shadcn/ui (https://ui.shadcn.com/docs/components/base/alert)
 * with two extensions:
 *
 *   1. Tone variants — `info` / `success` / `warn` / `danger` — added
 *      next to the canonical `default` and `destructive`. Each tinted
 *      bg + tinted icon + tinted title + readable body in both light
 *      and dark themes.
 *   2. Slot grid — `[&>svg]` selector positions a single 16px lucide-
 *      style icon to the left of `<AlertTitle>` + `<AlertDescription>`.
 *
 * Mirrors the shadcn API exactly:
 *
 *     <Alert variant="info">
 *       <Icon />
 *       <AlertTitle>Heads up</AlertTitle>
 *       <AlertDescription>The body content goes here.</AlertDescription>
 *     </Alert>
 */

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

const alertVariants = cva(
  "relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        destructive:
          "text-destructive bg-card [&>*]:text-current *:data-[slot=alert-description]:text-destructive/90 [&>svg]:text-current",
        info: "border-blue-200 bg-blue-50/70 text-blue-900 dark:border-blue-500/30 dark:bg-blue-950/30 dark:text-blue-100 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-400 *:data-[slot=alert-description]:text-blue-900/80 dark:*:data-[slot=alert-description]:text-blue-100/85",
        success:
          "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-100 [&>svg]:text-emerald-600 dark:[&>svg]:text-emerald-400 *:data-[slot=alert-description]:text-emerald-900/80 dark:*:data-[slot=alert-description]:text-emerald-100/85",
        warn: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-400 *:data-[slot=alert-description]:text-amber-900/80 dark:*:data-[slot=alert-description]:text-amber-100/85",
        danger:
          "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-500/30 dark:bg-rose-950/30 dark:text-rose-100 [&>svg]:text-rose-600 dark:[&>svg]:text-rose-400 *:data-[slot=alert-description]:text-rose-900/80 dark:*:data-[slot=alert-description]:text-rose-100/85",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export function Alert({
  className,
  variant,
  ...props
}: ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      className={cn(alertVariants({ variant }), className)}
      {...props}
    />
  );
}

export function AlertTitle({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "col-start-2 line-clamp-1 min-h-4 font-semibold tracking-tight",
        className
      )}
      {...props}
    />
  );
}

export function AlertDescription({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed",
        className
      )}
      {...props}
    />
  );
}

export { alertVariants };
