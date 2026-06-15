import { createFileRoute, redirect } from "@tanstack/react-router";
import { EXAMPLES } from "../playground/examples";

// /demo on its own has no view — redirect to the first gallery example so
// the URL always names the doc the user is looking at.
export const Route = createFileRoute("/demo/")({
  beforeLoad: () => {
    throw redirect({
      to: "/demo/gallery/$exampleId",
      params: { exampleId: EXAMPLES[0]!.id },
      replace: true,
    });
  },
});
