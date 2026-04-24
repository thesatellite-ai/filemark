// ─────────────────────────────────────────────────────────────────────────
// Combobox — shadcn-style wrapper around Base UI's Combobox primitive.
//
// Base UI ships a full combobox (@base-ui/react/combobox) with
// Root / Input / Trigger / Popup / Positioner / Portal / List / Item /
// Group / GroupLabel / Empty / Icon parts. This file wraps each piece
// with consistent Tailwind styling + Portal+Positioner convenience so
// consumers don't have to repeat the portal plumbing every time.
//
// Usage:
//
//   <Combobox items={opts} value={v} onValueChange={setV}>
//     <ComboboxTrigger>
//       <ComboboxValue placeholder="Pick…" />
//       <ComboboxIcon><ChevronDown/></ComboboxIcon>
//     </ComboboxTrigger>
//     <ComboboxContent>
//       <ComboboxInput placeholder="Search…" />
//       <ComboboxList>
//         <ComboboxEmpty>No match</ComboboxEmpty>
//         <ComboboxGroup items={groupItems}>
//           <ComboboxGroupLabel>Group A</ComboboxGroupLabel>
//           <ComboboxItem value="a">A</ComboboxItem>
//         </ComboboxGroup>
//       </ComboboxList>
//     </ComboboxContent>
//   </Combobox>
//
// Spec: https://base-ui.com/react/components/combobox
// ─────────────────────────────────────────────────────────────────────────

import type * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { cn } from "@/lib/utils";

/** Root — wires the combobox state. Pass `items` + `value` + `onValueChange`. */
const Combobox = ComboboxPrimitive.Root;

/** The labeled button that opens the popup. Styled like a shadcn select trigger. */
function ComboboxTrigger({
  className,
  children,
  ...props
}: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn(
        "bg-muted focus-visible:ring-ring/50 flex h-8 w-full items-center justify-between gap-2 rounded-md border px-3 text-xs font-normal capitalize",
        "hover:bg-accent hover:text-accent-foreground transition-colors",
        "focus-visible:ring-2 focus-visible:outline-none",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </ComboboxPrimitive.Trigger>
  );
}

/** Displays the current selected value inside the trigger. */
function ComboboxValue(
  props: ComboboxPrimitive.Value.Props
) {
  return (
    <ComboboxPrimitive.Value
      data-slot="combobox-value"
      {...props}
    />
  );
}

/** Chevron / icon slot inside the trigger. Rotates when the popup is open. */
function ComboboxIcon({
  className,
  ...props
}: ComboboxPrimitive.Icon.Props) {
  return (
    <ComboboxPrimitive.Icon
      data-slot="combobox-icon"
      className={cn(
        "text-muted-foreground size-3.5 shrink-0 transition-transform",
        "data-[popup-open]:rotate-180",
        className
      )}
      {...props}
    />
  );
}

/**
 * Portal + Positioner + Popup combined. Accepts the body content as
 * children — search input, list, groups, items. Positioned below the
 * trigger by default; use `side` to change.
 */
function ComboboxContent({
  className,
  sideOffset = 4,
  children,
  ...props
}: ComboboxPrimitive.Positioner.Props) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        data-slot="combobox-positioner"
        sideOffset={sideOffset}
        className={cn("z-50", className)}
        {...props}
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-popup"
          className={cn(
            "bg-popover text-popover-foreground overflow-hidden rounded-md border shadow-md",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
            "transition-opacity duration-150",
            "min-w-[var(--anchor-width)]",
            "flex flex-col"
          )}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

/** Search input at the top of the popup. */
function ComboboxInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <div
      className="flex items-center border-b px-3"
      data-slot="combobox-input-wrapper"
    >
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "placeholder:text-muted-foreground flex h-9 w-full bg-transparent text-sm outline-none",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </div>
  );
}

/**
 * Scrollable list container.
 *
 * Accepts either static ReactNode children (for manually rendered item
 * trees) or a function child `(item, index) => ReactNode` that Base UI
 * calls for each filtered item. Use the function form for flat lists
 * where you want filtering to auto-hide non-matches. For grouped lists,
 * use a function child at List level that returns `<ComboboxGroup>`
 * elements, then `<ComboboxCollection>` inside each group for item
 * filtering.
 */
type ComboboxListProps = Omit<ComboboxPrimitive.List.Props, "children"> & {
  children?:
    | React.ReactNode
    | ((item: any, index: number) => React.ReactNode);
};
function ComboboxList({ className, ...props }: ComboboxListProps) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("max-h-[300px] overflow-y-auto p-1", className)}
      {...(props as ComboboxPrimitive.List.Props)}
    />
  );
}

/**
 * Empty state when no items match.
 *
 * Base UI mandates the element stays in the DOM for aria-live screen
 * reader announcements, so we can't conditionally render it. Instead,
 * we zero out its padding when it has no children (no match state
 * inactive) using CSS `:empty` — the visual gap disappears when the
 * list has matches, but the element survives for accessibility.
 */
function ComboboxEmpty({
  className,
  ...props
}: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "text-muted-foreground text-center text-xs",
        "[&:empty]:py-0 [&:not(:empty)]:py-6",
        className
      )}
      {...props}
    />
  );
}

/**
 * Grouped section. Base UI requires the group to know its items, so
 * pass `items` matching the subset. The GroupLabel goes inside.
 */
function ComboboxGroup({
  className,
  ...props
}: ComboboxPrimitive.Group.Props) {
  return (
    <ComboboxPrimitive.Group
      data-slot="combobox-group"
      className={cn("overflow-hidden p-1", className)}
      {...props}
    />
  );
}

/** Heading for a group. */
function ComboboxGroupLabel({
  className,
  ...props
}: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-group-label"
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
        className
      )}
      {...props}
    />
  );
}

/** One selectable row. */
function ComboboxItem({
  className,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
        "data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        "data-[selected]:font-medium",
        "disabled:pointer-events-none disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

/**
 * Render-prop wrapper for filtered items inside a group. Base UI drives
 * filtering through this component — it receives the filtered subset
 * for the enclosing group and calls the render function for each item.
 *
 * For flat (ungrouped) lists, pass the render function directly as a
 * child of `<ComboboxList>` — no Collection needed.
 */
const ComboboxCollection = ComboboxPrimitive.Collection;

export {
  Combobox,
  ComboboxTrigger,
  ComboboxValue,
  ComboboxIcon,
  ComboboxContent,
  ComboboxInput,
  ComboboxList,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxItem,
  ComboboxCollection,
};
