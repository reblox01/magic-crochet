import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/boutique")({
  head: () => ({
    meta: [
      { title: "Boutique · Magic Crochet" },
      {
        name: "description",
        content:
          "Découvrez la collection Magic Crochet : cabas, chapeaux et décoration crochetés à la main au Maroc à partir de fil recyclé.",
      },
      { property: "og:title", content: "Boutique · Magic Crochet" },
      {
        property: "og:description",
        content: "Pièces uniques bouclées main à partir de textile recyclé.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { property: "og:url", content: "https://magic-crochet.com/boutique" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [{ rel: "canonical", href: "https://magic-crochet.com/boutique" }],
  }),
  component: BoutiqueLayout,
});

function BoutiqueLayout() {
  return <Outlet />;
}
