import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundApp } from "../playground/PlaygroundApp";

export const Route = createFileRoute("/demo")({
  component: Demo,
});

// /demo IS the playground — same Gallery + Monaco-backed Playground that
// used to live in apps/playground, now merged into the site so the demo
// page literally is the real product, not a watered-down preview.
// __root.tsx detects /demo and skips the website chrome so this gets
// the full viewport (the playground supplies its own header + footer).
function Demo(): React.ReactElement {
  return <PlaygroundApp />;
}
