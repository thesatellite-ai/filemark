import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * Visual smoke-test for the shadcn / basecn / Tailwind v4 stack.
 * Access via `?demo=components` in the URL. Delete this once the primitives
 * are used across the real UI.
 */
export function ComponentsDemo() {
  return (
    <div className="bg-background text-foreground min-h-screen p-10">
      <div className="mx-auto max-w-3xl space-y-10">
        <header>
          <h1 className="text-foreground text-3xl font-semibold tracking-tight">
            shadcn + basecn + Tailwind v4 smoke test
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Each block below is a basecn component rendered with our design
            tokens. Switching the theme in the main app (<kbd>⌘</kbd> or the
            theme picker) should recolor every block without re-rendering.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-foreground text-xl font-medium">Button variants</h2>
          <div className="flex flex-wrap gap-2">
            <Button>Default</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="link">Link</Button>
            <Button variant="destructive">Destructive</Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm">Small</Button>
            <Button>Default size</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" aria-label="Icon">
              ⏵
            </Button>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-xl font-medium">Accordion</h2>
          <Accordion
            defaultValue={["item-1"]}
            className="w-full"
          >
            <AccordionItem value="item-1">
              <AccordionTrigger>What is basecn?</AccordionTrigger>
              <AccordionContent>
                shadcn/ui components rebuilt on Base UI primitives. Same copy-
                paste philosophy, better foundation.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-2">
              <AccordionTrigger>Why Base UI instead of Radix?</AccordionTrigger>
              <AccordionContent>
                Base UI is the successor project from the Radix team with
                improved accessibility primitives and a cleaner API.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="item-3">
              <AccordionTrigger>How do I add more components?</AccordionTrigger>
              <AccordionContent>
                <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                  pnpm dlx shadcn@latest add https://basecn.dev/r/&lt;name&gt;.json
                </code>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        <section className="space-y-3">
          <h2 className="text-foreground text-xl font-medium">Dialog</h2>
          <Dialog>
            <DialogTrigger
              render={<Button variant="outline">Open dialog</Button>}
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm action</DialogTitle>
                <DialogDescription>
                  This is a basecn dialog driven by Base UI — focus trap,
                  escape-to-close, click-outside, and return-focus all
                  handled for free.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="ghost">Cancel</Button>
                <Button>Continue</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </section>
      </div>
    </div>
  );
}
