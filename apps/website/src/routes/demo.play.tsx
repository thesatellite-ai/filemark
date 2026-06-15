import { createFileRoute } from "@tanstack/react-router";
import { PlaygroundApp } from "../playground/PlaygroundApp";
import { EXAMPLES } from "../playground/examples";

const SITE = "https://khanakia.com/apps/filemark";

export const Route = createFileRoute("/demo/play")({
  head: () => {
    const title = "Playground — Filemark";
    const desc =
      "Live Monaco-backed scratch editor — write markdown on the left, watch every Filemark renderer respond live on the right.";
    const url = `${SITE}/demo/play`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PlayRoute,
});

function PlayRoute() {
  // The Playground (Monaco scratch editor) doesn't need an example id —
  // pass the first one so the type stays a non-empty string when the user
  // toggles back to the Gallery view via the header tabs.
  return <PlaygroundApp view="playground" exampleId={EXAMPLES[0]!.id} />;
}
