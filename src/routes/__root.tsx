import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { CartDrawer } from "../components/SiteChrome";
import { LenisProvider } from "../components/LenisProvider";
import { Preloader } from "../components/Preloader";

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
      { title: "Magic Crochet, fil recyclé, gestes d'artisanes, impact réel" },
      {
        name: "description",
        content:
          "Magic Crochet transforme les textiles recyclés en pièces de crochet contemporaines et en ateliers émancipateurs au Maroc. Découvrez la collection, nos ateliers et les artisanes derrière chaque maille.",
      },
      { name: "author", content: "Magic Crochet, Enactus EMSI Casablanca" },
      { property: "og:title", content: "Magic Crochet, histoires bouclées" },
      {
        property: "og:description",
        content:
          "Pièces de crochet faites main et ateliers nés du fil de t-shirts recyclés. Fabriqué à Casablanca.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Magic Crochet" },
      { property: "og:locale", content: "fr_MA" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "canonical",
        href: "https://magic-crochet.com",
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

function ScrollToTop() {
  const router = useRouter();
  useEffect(() => {
    const unsub = router.subscribe("onLoad", () => {
      window.scrollTo(0, 0);
    });
    return unsub;
  }, [router]);
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [loading, setLoading] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      <LenisProvider>
        <CartProvider>
          <ScrollToTop />
          <Outlet />
          <CartDrawer />
        </CartProvider>
      </LenisProvider>
    </QueryClientProvider>
  );
}
