import { createFileRoute, Outlet, useMatches, useNavigate } from "@tanstack/react-router";
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

function AdminLayout() {
  const { user, loading } = useAuth();
  const matches = useMatches();
  const navigate = useNavigate();

  const isLoginPage = matches.some((m) => m.routeId === "/admin/login");

  const currentPage = matches
    .filter((m) => m.pathname !== "/admin" && m.pathname !== "/admin/login")
    .pop()?.pathname;

  const pageNames: Record<string, string> = {
    "/admin/products": "Produits",
    "/admin/orders": "Commandes",
    "/admin/reservations": "Réservations",
    "/admin/contacts": "Contacts",
    "/admin/partnerships": "Partenaires",
    "/admin/reviews": "Avis",
    "/admin/users": "Utilisateurs",
    "/admin/settings": "Paramètres",
  };

  const pageName = currentPage ? pageNames[currentPage] || "Admin" : "Tableau de bord";

  // Check if user has set their password (invited users need to set one)
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("admin_users")
        .select("has_password")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user && !isLoginPage,
  });

  // Login page renders without sidebar
  if (isLoginPage) {
    return <Outlet />;
  }

  if (loading || profileLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#faf9f7]">
        <div className="size-8 border-2 border-[#F506EA] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/admin/login" });
    return null;
  }

  // Invited user who hasn't set password yet → force to login page (shows password setup)
  if (profile && profile.has_password === false) {
    navigate({ to: "/admin/login" });
    return null;
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
