import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { CartDrawer } from "../components/SiteChrome";
import { SmoothScroll } from "../lib/smooth-scroll";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Magic Crochet — Artisanat marocain en fil recyclé" },
      {
        name: "description",
        content:
          "Magic Crochet — sacs, chapeaux et décoration crochetés main à Casablanca à partir de textiles recyclés. Ateliers, sur-mesure et boutique en ligne.",
      },
      { name: "author", content: "Magic Crochet · Enactus EMSI" },
      { name: "theme-color", content: "#914110" },
      { name: "robots", content: "index,follow" },
      { property: "og:site_name", content: "Magic Crochet" },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "fr_FR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@magic.crochet_0" },
      { property: "og:title", content: "Magic Crochet — Artisanat marocain en fil recyclé" },
      { name: "twitter:title", content: "Magic Crochet — Artisanat marocain en fil recyclé" },
      { name: "description", content: "Magic Crochet Revive is a website showcasing handcrafted crochet products with engaging animations and a stunning UI." },
      { property: "og:description", content: "Magic Crochet Revive is a website showcasing handcrafted crochet products with engaging animations and a stunning UI." },
      { name: "twitter:description", content: "Magic Crochet Revive is a website showcasing handcrafted crochet products with engaging animations and a stunning UI." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/870ac1bf-21b7-4258-a912-7780d9c89de5/id-preview-36d8265c--9294c85c-f836-46c6-af90-f6d1901616c5.lovable.app-1782436766389.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/870ac1bf-21b7-4258-a912-7780d9c89de5/id-preview-36d8265c--9294c85c-f836-46c6-af90-f6d1901616c5.lovable.app-1782436766389.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "Magic Crochet",
          url: "https://www.magic-crochet.com/",
          logo: "https://www.magic-crochet.com/favicon.ico",
          sameAs: ["https://www.instagram.com/magic.crochet_0/"],
          address: {
            "@type": "PostalAddress",
            addressLocality: "Casablanca",
            addressCountry: "MA",
          },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <SmoothScroll>
          <Outlet />
          <CartDrawer />
        </SmoothScroll>
      </CartProvider>
    </QueryClientProvider>
  );
}
