import { useState, useRef, useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  atelierList,
  atelierCreate,
  atelierUpdate,
  atelierDelete,
  atelierImport,
  atelierExport,
  type AtelierEntry,
} from "@/routes/api/-ateliers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Download,
  Upload,
  Plus,
  Pencil,
  Trash2,
  Search,
  Users,
  DollarSign,
  Calendar,
  Loader2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

export const Route = createFileRoute("/admin/ateliers")({
  component: AdminAteliers,
});

type FormData = {
  client_number: number | null;
  nom: string;
  telephone: string;
  service: string;
  personnes: number;
  prix_total: number;
  date_paiement: string;
  remarque: string;
};

const emptyForm: FormData = {
  client_number: null,
  nom: "",
  telephone: "",
  service: "atelier crochet",
  personnes: 1,
  prix_total: 250,
  date_paiement: "",
  remarque: "",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return `${parts[0].padStart(2, "0")}/${parts[1].padStart(2, "0")}/${parts[2]}`;
  }
  return dateStr;
}

function parseCSV(text: string): Omit<AtelierEntry, "id" | "created_at">[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const rows: Omit<AtelierEntry, "id" | "created_at">[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (!cols[1] || !cols[1].trim()) continue;
    const n = parseInt(cols[0]);
    rows.push({
      client_number: isNaN(n) ? null : n,
      nom: cols[1] || "",
      telephone: cols[2] || "",
      service: cols[3] || "atelier crochet",
      personnes: parseInt(cols[4]) || 1,
      prix_total: parseFloat(cols[5]) || 0,
      date_paiement: cols[6] || "",
      remarque: cols[7] || null,
    });
  }
  return rows;
}

function toCSV(data: AtelierEntry[]): string {
  const header = "Client,Nom,Numéro de Téléphone,Service,personnes,Prix total,Date de paiement,Remarque";
  const rows = data.map((r) =>
    [
      r.client_number ?? "",
      `"${(r.nom || "").replace(/"/g, '""')}"`,
      `"${r.telephone || ""}"`,
      `"${r.service || ""}"`,
      r.personnes,
      r.prix_total,
      `"${r.date_paiement || ""}"`,
      `"${(r.remarque || "").replace(/"/g, '""')}"`,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

function AdminAteliers() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [importing, setImporting] = useState(false);
  // ponytail: sort state — one pair covers all columns, no abstraction needed
  type SortKey = keyof Pick<AtelierEntry, "client_number" | "nom" | "telephone" | "service" | "personnes" | "prix_total" | "date_paiement" | "remarque">;
  const [sortKey, setSortKey] = useState<SortKey>("date_paiement");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["ateliers"],
    queryFn: async () => {
      const result = await atelierList();
      return result;
    },
  });

  const createMut = useMutation({
    mutationFn: (data: FormData) => atelierCreate({ data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success("Atelier ajouté");
      setDialogOpen(false);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FormData> }) =>
      atelierUpdate({ data: { id, updates } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success("Atelier modifié");
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
    },
    onError: () => toast.error("Erreur lors de la modification"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => atelierDelete({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success("Atelier supprimé");
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const importMut = useMutation({
    mutationFn: (rows: Omit<AtelierEntry, "id" | "created_at">[]) =>
      atelierImport({ data: { rows } }),
    onSuccess: (_, rows) => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success(`${rows.length} atelier(s) importé(s)`);
    },
    onError: () => toast.error("Erreur lors de l'import"),
  });

  const filtered = entries.filter((e) => {
    const matchSearch =
      !search ||
      e.nom.toLowerCase().includes(search.toLowerCase()) ||
      (e.telephone || "").includes(search);
    const matchService =
      serviceFilter === "all" ||
      (e.service || "").toLowerCase() === serviceFilter.toLowerCase();
    return matchSearch && matchService;
  });

  const sorted = [...filtered].sort((a, b) => {
    let av = a[sortKey] ?? "";
    let bv = b[sortKey] ?? "";
    if (typeof av === "string") av = av.toLowerCase();
    if (typeof bv === "string") bv = bv.toLowerCase();
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const totalRevenue = filtered.reduce((sum, e) => sum + (e.prix_total || 0), 0);
  const totalPeople = filtered.reduce((sum, e) => sum + (e.personnes || 0), 0);

  const services = [...new Set(entries.map((e) => e.service).filter(Boolean))];

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, client_number: entries.length + 1 });
    setDialogOpen(true);
  };

  const openEdit = (entry: AtelierEntry) => {
    setEditingId(entry.id);
    setForm({
      client_number: entry.client_number,
      nom: entry.nom,
      telephone: entry.telephone || "",
      service: entry.service || "atelier crochet",
      personnes: entry.personnes,
      prix_total: entry.prix_total,
      date_paiement: entry.date_paiement || "",
      remarque: entry.remarque || "",
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.nom.trim()) {
      toast.error("Le nom est requis");
      return;
    }
    if (editingId) {
      updateMut.mutate({ id: editingId, updates: form });
    } else {
      createMut.mutate(form);
    }
  };

  const handleImport = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setImporting(true);
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          toast.error("Aucune donnée valide trouvée");
          setImporting(false);
          return;
        }
        importMut.mutate(rows, {
          onSettled: () => setImporting(false),
        });
      };
      reader.readAsText(file);
      e.target.value = "";
    },
    [importMut]
  );

  const handleExport = async () => {
    const data = await atelierExport();
    const csv = toCSV(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ateliers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export téléchargé");
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold">Atelier & Chiffres d'affaires</h1>
        <p className="text-muted-foreground mt-1">
          {entries.length} atelier(s) au total.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-[#d4d4d4] p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Users className="h-4 w-4" />
            Clients
          </div>
          <p className="text-2xl font-bold">{filtered.length}</p>
        </div>
        <div className="rounded-xl border border-[#d4d4d4] p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <DollarSign className="h-4 w-4" />
            Revenu total
          </div>
          <p className="text-2xl font-bold">{totalRevenue.toLocaleString()} DH</p>
        </div>
        <div className="rounded-xl border border-[#d4d4d4] p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Calendar className="h-4 w-4" />
            Personnes
          </div>
          <p className="text-2xl font-bold">{totalPeople}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou téléphone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 border-[#d4d4d4]"
          />
        </div>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-full sm:w-48 border-[#d4d4d4]">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s!}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="border-[#d4d4d4]"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importer CSV
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImport}
          />
          <Button variant="outline" className="border-[#d4d4d4]" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exporter CSV
          </Button>
          <Button className="bg-[#F506EA] hover:bg-[#d405c0] text-white" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Nouvel atelier
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-[#d4d4d4] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {([
                ["client_number", "#", "w-12"],
                ["nom", "Nom", ""],
                ["telephone", "Téléphone", ""],
                ["service", "Service", ""],
                ["personnes", "Pers.", "text-center"],
                ["prix_total", "Prix", "text-right"],
                ["date_paiement", "Date", ""],
                ["remarque", "Remarque", ""],
              ] as const).map(([key, label, cls]) => (
                <TableHead
                  key={key}
                  className={`${cls} cursor-pointer select-none hover:text-foreground`}
                  onClick={() => toggleSort(key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {label}
                    {sortKey === key ? (
                      sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Aucun atelier trouvé
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {entry.client_number}
                  </TableCell>
                  <TableCell className="font-medium">{entry.nom}</TableCell>
                  <TableCell className="text-sm">{entry.telephone || "—"}</TableCell>
                  <TableCell>
                    <span className="text-xs bg-muted px-2 py-1 rounded-full">
                      {entry.service || "—"}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{entry.personnes}</TableCell>
                  <TableCell className="text-right font-medium">
                    {entry.prix_total.toLocaleString()} DH
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(entry.date_paiement)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                    {entry.remarque || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEdit(entry)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={() => {
                          if (confirm(`Supprimer "${entry.nom}" ?`)) {
                            deleteMut.mutate(entry.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingId ? "Modifier l'atelier" : "Nouvel atelier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Nom *</label>
              <Input
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input
                value={form.telephone}
                onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <Input
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Personnes</label>
              <Input
                type="number"
                min={1}
                value={form.personnes}
                onChange={(e) => setForm({ ...form, personnes: parseInt(e.target.value) || 1 })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Prix total (DH)</label>
              <Input
                type="number"
                min={0}
                value={form.prix_total}
                onChange={(e) => setForm({ ...form, prix_total: parseFloat(e.target.value) || 0 })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Date (JJ/MM/AAAA)</label>
              <Input
                value={form.date_paiement}
                onChange={(e) => setForm({ ...form, date_paiement: e.target.value })}
                placeholder="01/03/2026"
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div>
              <label className="text-sm font-medium"># Client</label>
              <Input
                type="number"
                value={form.client_number ?? ""}
                onChange={(e) =>
                  setForm({
                    ...form,
                    client_number: e.target.value ? parseInt(e.target.value) : null,
                  })
                }
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Remarque</label>
              <Input
                value={form.remarque}
                onChange={(e) => setForm({ ...form, remarque: e.target.value })}
                className="mt-1 border-[#d4d4d4]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="border-[#d4d4d4]" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button
              className="bg-[#F506EA] hover:bg-[#d405c0] text-white"
              onClick={handleSave}
              disabled={createMut.isPending || updateMut.isPending}
            >
              {(createMut.isPending || updateMut.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
