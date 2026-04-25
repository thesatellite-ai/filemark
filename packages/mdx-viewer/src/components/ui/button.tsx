import { type ComponentProps } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Button — shadcn-style primitive vendored into @filemark/mdx.
 *
 * Uses shadcn token variables (--primary, --secondary, --destructive,
 * --background, --foreground) so it tracks the host theme automatically.
 * Adds `tone` variants — info / success / warn / danger — for status
 * alerts (CalloutWithAction etc.). Style names + cva pattern intentionally
 * mirror shadcn/ui so a future host can swap this out for the canonical
 * shadcn registry without changing call sites.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] no-underline [&]:no-underline hover:no-underline",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        outline:
          "bg-background text-foreground border border-input shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "text-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        destructive:
          "bg-destructive text-white shadow-sm hover:bg-destructive/90",
        info: "bg-blue-600 text-white shadow-sm hover:bg-blue-500",
        success: "bg-emerald-600 text-white shadow-sm hover:bg-emerald-500",
        warn: "bg-amber-600 text-white shadow-sm hover:bg-amber-500",
        danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-500",
        // Outline-tone variants — sleek alternative to solid tone fills.
        // Transparent bg, tone-coloured text + border, hover fills lightly.
        "info-outline":
          "bg-transparent text-blue-700 dark:text-blue-300 border border-blue-500/40 hover:bg-blue-500/10 hover:border-blue-500/60",
        "success-outline":
          "bg-transparent text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/10 hover:border-emerald-500/60",
        "warn-outline":
          "bg-transparent text-amber-700 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/10 hover:border-amber-500/60",
        "danger-outline":
          "bg-transparent text-rose-700 dark:text-rose-300 border border-rose-500/40 hover:bg-rose-500/10 hover:border-rose-500/60",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-[13px]",
        lg: "h-10 px-6 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface ButtonProps
  extends ComponentProps<"button">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export interface ButtonLinkProps
  extends ComponentProps<"a">,
    VariantProps<typeof buttonVariants> {}

export function ButtonLink({
  className,
  variant,
  size,
  ...props
}: ButtonLinkProps) {
  return (
    <a
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { buttonVariants };
