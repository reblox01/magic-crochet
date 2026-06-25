import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { PRODUCTS } from "@/lib/products";

// TODO: replace with the project's public URL once a custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly" | "yearly";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/boutique", changefreq: "weekly", priority: "0.9" },
          { path: "/reserver", changefreq: "weekly", priority: "0.9" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/sur-mesure", changefreq: "monthly", priority: "0.7" },
          ...PRODUCTS.map((p) => ({
            path: `/boutique/${p.id}`,
            changefreq: "monthly" as const,
            priority: "0.8",
          })),
        ];

        const urls = entries
          .map((e) =>
            [
              `  <url>`,
              `    <loc>${BASE_URL}${e.path}</loc>`,
              e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
              e.priority ? `    <priority>${e.priority}</priority>` : null,
              `  </url>`,
            ]
              .filter(Boolean)
              .join("\n"),
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
