import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { orderCreate, orderQrImageUpload } from "@/routes/api/-orders";
import { useConfirm } from "@/components/ConfirmDialog";
import { Plus, Trash2, Download, Printer, X } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string | null;
  total_amount: number;
  livraison_prix: number;
  qr_image_url: string | null;
  qr_text: string | null;
  status: string;
  items: { id: string; name: string; price: number; qty: number }[] | null;
  notes: string | null;
  is_paid: boolean;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "En attente", color: "bg-amber-50 text-amber-700" },
  { value: "processing", label: "En cours", color: "bg-blue-50 text-blue-700" },
  { value: "completed", label: "Terminée", color: "bg-green-50 text-green-700" },
  { value: "cancelled", label: "Annulée", color: "bg-red-50 text-red-600" },
] as const;

async function fetchOrders(): Promise<Order[]> {
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

type Product = { id: string; name: string; price: number; image: string | null };

async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("id, name, price, image").eq("is_active", true).order("name");
  if (error) throw error;
  return data ?? [];
}

function AdminOrders() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrPopupOrder, setQrPopupOrder] = useState<Order | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrText, setQrText] = useState("");
  const invoiceRef = useRef<HTMLDivElement>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: fetchOrders,
  });

  const { data: products } = useQuery({
    queryKey: ["admin-products-list"],
    queryFn: fetchProducts,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("orders").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, is_paid }: { id: string; is_paid: boolean }) => {
      const { error } = await supabase.from("orders").update({ is_paid }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  const createOrder = useMutation({
    mutationFn: async (input: { customer_name: string; customer_email: string; customer_phone: string | null; customer_address: string | null; items: { id: string; name: string; price: number; qty: number }[]; notes: string | null; total_amount: number; livraison_prix: number }) => {
      await orderCreate({ data: input });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setShowCreateModal(false);
    },
  });

  const saveQrSettings = useMutation({
    mutationFn: async ({ id, qr_image_url, qr_text }: { id: string; qr_image_url: string | null; qr_text: string | null }) => {
      const { error } = await supabase.from("orders").update({ qr_image_url, qr_text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      setQrPopupOrder(null);
    },
  });

  function exportCsv() {
    if (!filtered?.length) return;
    const header = "Nom,Email,Téléphone,Adresse,Total,Statut,Payé,Date\n";
    const rows = filtered.map((o) =>
      [
        `"${o.customer_name}"`,
        `"${o.customer_email}"`,
        `"${o.customer_phone ?? ""}"`,
        `"${o.customer_address ?? ""}"`,
        o.total_amount,
        o.status,
        o.is_paid ? "Oui" : "Non",
        new Date(o.created_at).toLocaleDateString("fr-FR"),
      ].join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commandes-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ponytail: generate QR code when invoice order is set
  useEffect(() => {
    if (!invoiceOrder) { setQrDataUrl(""); return; }
    if (invoiceOrder.qr_image_url) { setQrDataUrl(invoiceOrder.qr_image_url); return; }
    const text = invoiceOrder.qr_text || invoiceOrder.id;
    QRCode.toDataURL(text, {
      width: 120,
      margin: 1,
      color: { dark: "#1c1917", light: "#ffffff" },
    }).then(setQrDataUrl);
  }, [invoiceOrder]);

  function handlePrint() {
    if (!invoiceRef.current) return;
    const livraison = invoiceOrder?.livraison_prix ?? 0;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Facture #${invoiceOrder?.id.slice(0, 8).toUpperCase()}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}body{font-family:Georgia,serif;color:#1c1917;padding:40px;max-width:800px;margin:0 auto}
      .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px;border-bottom:2px solid #1c1917;padding-bottom:16px}
      .brand h1{font-size:24px;letter-spacing:-0.5px}.brand p{font-size:12px;color:#666;margin-top:4px}
      .invoice-meta{text-align:right;font-size:12px}.invoice-meta h2{font-size:18px;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin:24px 0}th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#999;border-bottom:1px solid #e5e5e5;padding:8px 0}
      td{padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:14px}.total td{border-top:2px solid #1c1917;font-weight:bold;font-size:16px}
      .footer{margin-top:40px;font-size:11px;color:#999;text-align:center;border-top:1px solid #e5e5e5;padding-top:16px}
      .qr{margin-top:16px;text-align:center}.qr img{width:80px}
      @media print{body{padding:20px}}</style></head><body>`);
    printWindow.document.write(invoiceRef.current.innerHTML);
    printWindow.document.write("</body></html>");
    printWindow.document.close();
    printWindow.print();
  }

  const filtered = filter === "all" ? orders : orders?.filter((o) => o.status === filter);

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-[#1c1917]">Commandes</h1>
          <p className="text-sm text-[#1c1917]/50 mt-1">{orders?.length ?? 0} commande(s) au total.</p>
        </div>
        <div className="flex gap-2">
          {filtered && filtered.length > 0 && (
            <button
              onClick={exportCsv}
              className="px-4 py-2 rounded-full text-xs font-medium border border-[#1c1917]/10 hover:bg-[#1c1917]/5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 inline-block mr-1" />
              Exporter CSV
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-full text-xs font-medium bg-[#F506EA] text-white hover:opacity-90 transition-opacity"
          >
            <Plus className="w-3.5 h-3.5 inline-block mr-1" />
            Nouvelle commande
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterBtn active={filter === "all"} onClick={() => setFilter("all")} label="Toutes" count={orders?.length} />
        {STATUS_OPTIONS.map((s) => (
          <FilterBtn
            key={s.value}
            active={filter === s.value}
            onClick={() => setFilter(s.value)}
            label={s.label}
            count={orders?.filter((o) => o.status === s.value).length}
          />
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl bg-white border border-[#1c1917]/5 animate-pulse" />
          ))}
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-16 text-[#1c1917]/30">
          <p className="font-serif text-xl italic">Aucune commande.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered?.map((order) => {
            const isOpen = expandedId === order.id;
            return (
              <div key={order.id} className="rounded-2xl bg-white border border-[#1c1917]/5 overflow-hidden">
                {/* Summary row — clickable */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isOpen ? null : order.id)}
                  className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-[#f3f0ec]/30 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="font-medium text-[#1c1917]">{order.customer_name}</p>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_OPTIONS.find((s) => s.value === order.status)?.color ?? "bg-gray-100 text-gray-500"}`}>
                        {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ?? order.status}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); togglePaid.mutate({ id: order.id, is_paid: !order.is_paid }); }}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                          order.is_paid ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                        }`}
                      >
                        {order.is_paid ? "Payée" : "Impayée"}
                      </span>
                    </div>
                    <p className="text-xs text-[#1c1917]/40">
                      {order.customer_email}
                      {order.customer_phone && ` · ${order.customer_phone}`}
                      {" · "}
                      {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {order.notes && !isOpen && (
                      <p className="text-xs text-[#1c1917]/50 mt-2 line-clamp-1">{order.notes}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-serif text-xl text-[#1c1917]">{(Number(order.total_amount) + (order.livraison_prix ?? 0)).toLocaleString("fr-FR")} DH</p>
                    <div className="flex items-center gap-2 mt-2 justify-end">
                      <select
                        value={order.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateStatus.mutate({ id: order.id, status: e.target.value })}
                        className="text-xs border border-[#1c1917]/10 rounded-lg px-2 py-1 bg-white focus:outline-none focus:border-[#F506EA]"
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`text-[#1c1917]/30 transition-transform ${isOpen ? "rotate-180" : ""}`}>
                        <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded detail */}
                {isOpen && (
                  <div className="px-5 pb-5 border-t border-[#1c1917]/5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                      {/* Client info */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Client</p>
                        <div className="space-y-1.5 text-sm">
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Nom :</span> {order.customer_name}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Email :</span> {order.customer_email}</p>
                          {order.customer_phone && (
                            <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Tél :</span> {order.customer_phone}</p>
                          )}
                          {order.customer_address && (
                            <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Adresse :</span> {order.customer_address}</p>
                          )}
                        </div>
                      </div>

                      {/* Products */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Produits</p>
                        {order.items && order.items.length > 0 ? (
                          <div className="space-y-2">
                            {order.items.map((item, i) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[#1c1917]/40 shrink-0">{item.qty}×</span>
                                  <span className="text-[#1c1917] truncate">{item.name}</span>
                                </div>
                                <span className="text-[#1c1917]/60 shrink-0 ml-2">{Number(item.price).toLocaleString("fr-FR")} DH</span>
                              </div>
                            ))}
                            <div className="border-t border-[#1c1917]/5 pt-2 flex justify-between text-sm font-medium">
                              <span className="text-[#1c1917]/50">Sous-total</span>
                              <span className="text-[#1c1917]">
                                {order.items.reduce((sum, it) => sum + it.price * it.qty, 0).toLocaleString("fr-FR")} DH
                              </span>
                            </div>
                            {(order.livraison_prix ?? 0) > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-[#1c1917]/50">Livraison</span>
                                <span className="text-[#1c1917]">{Number(order.livraison_prix).toLocaleString("fr-FR")} DH</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-[#1c1917]/30 italic">Pas de produits</p>
                        )}
                      </div>

                      {/* Meta */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold">Détails</p>
                        <div className="space-y-1.5 text-sm">
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Commande :</span> #{order.id.slice(0, 8).toUpperCase()}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Date :</span> {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                          <p className="text-[#1c1917]"><span className="text-[#1c1917]/40">Total :</span> <span className="font-serif text-lg">{(Number(order.total_amount) + (order.livraison_prix ?? 0)).toLocaleString("fr-FR")} DH</span></p>
                        </div>
                        {order.notes && (
                          <div>
                            <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold mb-1">Notes</p>
                            <p className="text-sm text-[#1c1917]/70 bg-[#f3f0ec]/50 rounded-lg p-3">{order.notes}</p>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setInvoiceOrder(order); }}
                          className="mt-2 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1c1917]/10 text-[#1c1917]/60 hover:border-[#F506EA] hover:text-[#F506EA] transition-colors"
                        >
                          <Printer className="w-3 h-3 inline-block mr-1" />
                          Voir facture
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreateModal && (
        <CreateOrderModal
          products={products ?? []}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(input) => createOrder.mutate(input)}
          isPending={createOrder.isPending}
        />
      )}

      {invoiceOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setInvoiceOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-b border-[#1c1917]/5">
              <h2 className="font-serif text-lg text-[#1c1917]">Facture #{invoiceOrder.id.slice(0, 8).toUpperCase()}</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1c1917] text-white hover:opacity-90 transition-opacity">
                  <Printer className="w-3 h-3 inline-block mr-1" />
                  Imprimer
                </button>
                <button onClick={() => setInvoiceOrder(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1c1917]/10 hover:bg-[#1c1917]/5 transition-colors">
                  Fermer
                </button>
              </div>
            </div>
            {/* Printable area */}
            <div ref={invoiceRef} className="p-8">
              <div className="flex justify-between items-start mb-8 pb-4 border-b-2 border-[#1c1917]">
                <div>
                  <h1 className="text-2xl font-serif tracking-tight">Magic Crochet</h1>
                  <p className="text-xs text-[#1c1917]/50 mt-1">Artisanat & Création</p>
                </div>
                <div className="text-right">
                  <h2 className="text-lg font-serif">FACTURE</h2>
                  <p className="text-xs text-[#1c1917]/50 mt-1">#{invoiceOrder.id.slice(0, 8).toUpperCase()}</p>
                  <p className="text-xs text-[#1c1917]/50">{new Date(invoiceOrder.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold mb-1">Client</p>
                <p className="text-sm font-medium">{invoiceOrder.customer_name}</p>
                <p className="text-xs text-[#1c1917]/50">{invoiceOrder.customer_email}</p>
                {invoiceOrder.customer_phone && <p className="text-xs text-[#1c1917]/50">{invoiceOrder.customer_phone}</p>}
                {invoiceOrder.customer_address && <p className="text-xs text-[#1c1917]/50">{invoiceOrder.customer_address}</p>}
              </div>

              <table className="w-full mb-6">
                <thead>
                  <tr>
                    <th className="text-left text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold border-b border-[#1c1917]/10 pb-2">Produit</th>
                    <th className="text-center text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold border-b border-[#1c1917]/10 pb-2">Qté</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold border-b border-[#1c1917]/10 pb-2">Prix</th>
                    <th className="text-right text-[10px] uppercase tracking-wider text-[#1c1917]/40 font-bold border-b border-[#1c1917]/10 pb-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceOrder.items?.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-sm border-b border-[#1c1917]/5">{item.name}</td>
                      <td className="py-2.5 text-sm text-center border-b border-[#1c1917]/5">{item.qty}</td>
                      <td className="py-2.5 text-sm text-right border-b border-[#1c1917]/5">{Number(item.price).toLocaleString("fr-FR")} DH</td>
                      <td className="py-2.5 text-sm text-right border-b border-[#1c1917]/5">{(item.price * item.qty).toLocaleString("fr-FR")} DH</td>
                    </tr>
                  ))}
                  {(invoiceOrder.livraison_prix ?? 0) > 0 && (
                    <tr>
                      <td colSpan={3} className="py-2.5 text-sm text-right border-b border-[#1c1917]/5">Livraison</td>
                      <td className="py-2.5 text-sm text-right border-b border-[#1c1917]/5">{Number(invoiceOrder.livraison_prix).toLocaleString("fr-FR")} DH</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={3} className="py-3 text-sm font-medium text-right border-t-2 border-[#1c1917]">Total</td>
                    <td className="py-3 text-lg font-serif text-right border-t-2 border-[#1c1917]">{(Number(invoiceOrder.total_amount) + (invoiceOrder.livraison_prix ?? 0)).toLocaleString("fr-FR")} DH</td>
                  </tr>
                </tbody>
              </table>

              <div className="flex justify-between items-end">
                <div className="text-[10px] text-[#1c1917]/40">
                  <p>Statut : {invoiceOrder.status === "completed" ? "Terminée" : invoiceOrder.status === "cancelled" ? "Annulée" : invoiceOrder.status === "processing" ? "En cours" : "En attente"}</p>
                  <p>Paiement : {invoiceOrder.is_paid ? "Payée" : "Impayée"}</p>
                </div>
                {qrDataUrl && (
                  <div
                    className="relative group cursor-pointer"
                    onClick={() => {
                      setQrPopupOrder(invoiceOrder);
                      setQrImageUrl(invoiceOrder.qr_image_url ?? "");
                      setQrText(invoiceOrder.qr_text ?? "");
                    }}
                  >
                    <img src={qrDataUrl} alt="QR Code" className="w-20 h-20" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <span className="text-white text-[10px] font-medium">Changer</span>
                    </div>
                    <p className="text-[9px] text-[#1c1917]/30 mt-1">{invoiceOrder.qr_image_url ? "Logo" : invoiceOrder.qr_text ? "Personnalisé" : "Scanner pour vérifier"}</p>
                  </div>
                )}
              </div>

              <div className="mt-8 pt-4 border-t border-[#1c1917]/10 text-center text-[10px] text-[#1c1917]/30">
                Magic Crochet — Merci pour votre confiance
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Popup */}
      {qrPopupOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={() => setQrPopupOrder(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-lg text-[#1c1917]">QR Code — #{qrPopupOrder.id.slice(0, 8).toUpperCase()}</h2>
              <button onClick={() => setQrPopupOrder(null)} className="p-1.5 rounded-lg hover:bg-[#1c1917]/5 transition-colors">
                <X className="w-4 h-4 text-[#1c1917]/50" />
              </button>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Image (logo, photo...)</label>
              <div className="flex gap-2">
                <input type="text" value={qrImageUrl} onChange={(e) => setQrImageUrl(e.target.value)} placeholder="URL de l'image" className="flex-1 rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors" />
                <label className="px-3 py-2 rounded-xl border border-[#1c1917]/10 text-xs font-medium text-[#1c1917]/60 hover:bg-[#1c1917]/5 transition-colors cursor-pointer shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline-block mr-1"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  Upload
                  <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = async () => {
                      const base64 = reader.result as string;
                      try {
                        const result = await orderQrImageUpload({ data: { fileBase64: base64, fileName: file.name } });
                        setQrImageUrl(result.url);
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : "Erreur upload");
                      }
                    };
                    reader.readAsDataURL(file);
                  }} />
                </label>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#1c1917]/55 mb-2">Texte personnalisé</label>
              <input type="text" value={qrText} onChange={(e) => setQrText(e.target.value)} placeholder="Texte ou URL (vide = numéro de commande)" className="w-full rounded-xl bg-[#f3f0ec]/60 border border-[#1c1917]/10 px-4 py-3 text-sm focus:outline-none focus:border-[#F506EA] transition-colors" />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => saveQrSettings.mutate({ id: qrPopupOrder.id, qr_image_url: qrImageUrl || null, qr_text: qrText || null })}
                disabled={saveQrSettings.isPending}
                className="flex-1 px-4 py-2.5 rounded-full bg-[#1c1917] text-white text-sm font-semibold hover:bg-[#F506EA] transition-colors disabled:opacity-50"
              >
                {saveQrSettings.isPending ? "Sauvegarde…" : "Enregistrer"}
              </button>
              <button
                onClick={() => saveQrSettings.mutate({ id: qrPopupOrder.id, qr_image_url: null, qr_text: null })}
                className="px-4 py-2.5 rounded-full text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 inline-block mr-1" />
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterBtn({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-xs font-medium border transition-all ${
        active
          ? "bg-[#1c1917] text-white border-[#1c1917]"
          : "bg-white text-[#1c1917]/60 border-[#1c1917]/10 hover:border-[#F506EA]"
      }`}
    >
      {label}
      {count !== undefined && count > 0 && (
        <span className={`ml-1.5 ${active ? "text-white/70" : "text-[#1c1917]/30"}`}>{count}</span>
      )}
    </button>
  );
}

type OrderItem = { id: string; name: string; price: number; qty: number };

function CreateOrderModal({
  products,
  onClose,
  onSubmit,
  isPending,
}: {
  products: Product[];
  onClose: () => void;
  onSubmit: (input: { customer_name: string; customer_email: string; customer_phone: string | null; customer_address: string | null; items: OrderItem[]; notes: string | null; total_amount: number; livraison_prix: number }) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [livraison, setLivraison] = useState(0);
  const [notes, setNotes] = useState("");

  function addItem() {
    setItems([...items, { id: "", name: "", price: 0, qty: 1 }]);
  }

  function updateItem(idx: number, patch: Partial<OrderItem>) {
    setItems(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function removeItem(idx: number) {
    setItems(items.filter((_, i) => i !== idx));
  }

  function selectProduct(idx: number, productId: string) {
    const p = products.find((pr) => pr.id === productId);
    if (p) setItems(items.map((it, i) => (i === idx ? { ...it, id: p.id, name: p.name, price: p.price } : it)));
  }

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0) + livraison;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || items.length === 0) return;
    onSubmit({
      customer_name: name.trim(),
      customer_email: email.trim(),
      customer_phone: phone.trim() || null,
      customer_address: address.trim() || null,
      items,
      notes: notes.trim() || null,
      total_amount: total - livraison,
      livraison_prix: livraison,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-serif text-xl text-[#1c1917] mb-4">Nouvelle commande</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nom du client *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Email *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
          </div>
          <div>
            <label className="text-sm font-medium">Livraison (DH)</label>
            <input type="number" min="0" value={livraison} onChange={(e) => setLivraison(Math.max(0, Number(e.target.value)))} className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Produits *</label>
              <button type="button" onClick={addItem} className="text-xs text-[#F506EA] hover:underline">+ Ajouter</button>
            </div>
            {items.length === 0 && <p className="text-xs text-[#1c1917]/30 italic">Aucun produit ajouté</p>}
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={item.id}
                    onChange={(e) => selectProduct(idx, e.target.value)}
                    className="flex-1 border border-[#d4d4d4] rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#F506EA]"
                  >
                    <option value="">Choisir un produit</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString("fr-FR")} DH</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    value={item.qty}
                    onChange={(e) => updateItem(idx, { qty: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="w-16 border border-[#d4d4d4] rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:border-[#F506EA]"
                  />
                  <span className="text-xs text-[#1c1917]/50 w-20 text-right">{(item.price * item.qty).toLocaleString("fr-FR")} DH</span>
                  <button type="button" onClick={() => removeItem(idx)} className="text-[#1c1917]/30 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="flex justify-between text-sm font-medium border-t border-[#1c1917]/5 pt-2">
              <span className="text-[#1c1917]/50">Total</span>
              <span className="font-serif text-lg">{total.toLocaleString("fr-FR")} DH</span>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="mt-1 w-full border border-[#d4d4d4] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#F506EA]" />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-xs font-medium border border-[#1c1917]/10 hover:bg-[#1c1917]/5 transition-colors">
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim() || !email.trim() || items.length === 0}
              className="px-4 py-2 rounded-full text-xs font-medium bg-[#1c1917] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isPending ? "Création..." : "Créer la commande"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
