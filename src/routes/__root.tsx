import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  useMatches,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { CartProvider } from "../lib/cart";
import { CartDrawer } from "../components/SiteChrome";
import { RouteProgress } from "../components/RouteProgress";
import { LenisProvider, useLenis } from "../components/LenisProvider";
import { Preloader } from "../components/Preloader";
import { AuthProvider } from "../contexts/AuthContext";
import { MaintenanceScreen } from "../components/MaintenanceScreen";
import { ConfirmProvider } from "../components/ConfirmDialog";
import { supabase } from "../lib/supabase";

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
      { title: "Magic Crochet - Fil recyclé, art crocheté" },
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
      { property: "og:image", content: "https://magic-crochet.com/og.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://magic-crochet.com/og.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", sizes: "48x48" },
      { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
      { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
      { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/site.webmanifest" },
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
  const lenis = useLenis();
  useEffect(() => {
    const unsub = router.subscribe("onLoad", () => {
      if (lenis) {
        lenis.scrollTo(0, { immediate: true });
      } else {
        window.scrollTo(0, 0);
      }
    });
    return unsub;
  }, [router, lenis]);
  return null;
}

function MaintenanceGuard({ children }: { children: ReactNode }) {
  const matches = useMatches();
  const isAdmin = matches.some((m) => m.pathname.startsWith("/admin"));
  const [maintenance, setMaintenance] = useState(false);

  useEffect(() => {
    if (isAdmin) return;
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "site")
          .single();
        const val = data?.value as { maintenance_mode?: boolean } | null;
        if (val?.maintenance_mode) setMaintenance(true);
      } catch {
        // ignore — default to not in maintenance
      }
    })();
  }, [isAdmin]);

  if (isAdmin) return <>{children}</>;
  if (maintenance) return <MaintenanceScreen />;
  return <>{children}</>;
}

function PreloaderGate() {
  const [loading, setLoading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "site")
        .single();
      return (data?.value as Record<string, unknown>) ?? null;
    },
  });

  const showPreloader = !isLoading && settings?.show_preloader !== false;

  useEffect(() => {
    if (showPreloader) setLoading(true);
  }, [showPreloader]);

  if (!loading) return null;
  return <Preloader onComplete={() => setLoading(false)} />;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfirmProvider>
          <PreloaderGate />
          <LenisProvider>
            <CartProvider>
              <ScrollToTop />
              <MaintenanceGuard>
                <Outlet />
              </MaintenanceGuard>
              <CartDrawer />
              <RouteProgress />
              <Toaster position="bottom-right" richColors closeButton />
            </CartProvider>
          </LenisProvider>
        </ConfirmProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
