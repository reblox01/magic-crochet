import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { AdminSidebar } from "@/components/admin-sidebar";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const PAGE_NAMES: Record<string, string> = {
  "/admin/products": "Produits",
  "/admin/orders": "Commandes",
  "/admin/reservations": "Réservations",
  "/admin/ateliers": "Atelier & Chiffres d'affaires",
  "/admin/contacts": "Contacts",
  "/admin/partnerships": "Partenaires",
  "/admin/gallery": "Galerie",
  "/admin/reviews": "Avis clients",
  "/admin/avis": "Témoignages",
  "/admin/users": "Utilisateurs",
  "/admin/settings": "Paramètres",
};

function AdminLayout() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === "/admin/login";
  // ponytail: use location.pathname directly — useMatches() includes root "/" which broke currentPage
  const currentPage = location.pathname !== "/admin" && location.pathname !== "/admin/login"
    ? location.pathname
    : undefined;

  const pageName = currentPage ? PAGE_NAMES[currentPage] || "Admin" : "Tableau de bord";

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("admin_users")
        .select("has_password, role, custom_permissions, permissions_expires_at")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error("Profile query error:", error);
        return null;
      }
      return data as { has_password: boolean; role: string; custom_permissions: string[] | null; permissions_expires_at: string | null } | null;
    },
    enabled: !!user && !isLoginPage,
    retry: 1,
  });

  // ponytail: all redirects via useEffect to avoid render-loop "page not responding"
  useEffect(() => {
    if (loading || profileLoading || isLoginPage) return;
    if (!user) { navigate({ to: "/admin/login" }); return; }
    if (profile && profile.has_password === false) { navigate({ to: "/admin/login" }); return; }
    if (profile?.role === "custom" && currentPage) {
      const expired = profile.permissions_expires_at && new Date(profile.permissions_expires_at) < new Date();
      if (expired || !profile.custom_permissions?.includes(currentPage)) {
        navigate({ to: "/admin" });
      }
    }
  }, [loading, profileLoading, isLoginPage, user, profile, currentPage, navigate]);

  if (isLoginPage) return <Outlet />;

  if (loading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f7]">
        <div className="size-8 border-2 border-[#F506EA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || (profile && profile.has_password === false)) return null;

  // ponytail: custom user on unauthorized page — render nothing while useEffect redirects
  if (profile?.role === "custom" && currentPage) {
    const expired = profile.permissions_expires_at && new Date(profile.permissions_expires_at) < new Date();
    if (expired || !profile.custom_permissions?.includes(currentPage)) return null;
  }

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b border-[#1c1917]/5 bg-[#faf9f7]/80 backdrop-blur-md px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage>{pageName}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex-1 overflow-auto px-4 py-3 md:px-6 md:py-4" data-lenis-prevent>
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
