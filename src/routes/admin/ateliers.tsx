import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  atelierList,
  atelierCreate,
  atelierUpdate,
  atelierDelete,
  atelierBulkUpdate,
  atelierImport,
  atelierExport,
  type AtelierEntry,
} from "@/routes/api/-ateliers";
import { useConfirm } from "@/components/ConfirmDialog";
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
  ChevronLeft,
  ChevronRight,
  Trash,
  Layers,
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
  group_name: string;
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
  group_name: "",
};

const PAGE_SIZE = 25;

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
      group_name: cols[8] || null,
    });
  }
  return rows;
}

function toCSV(data: AtelierEntry[]): string {
  const header = "Client,Nom,Numéro de Téléphone,Service,personnes,Prix total,Date de paiement,Remarque,Groupe";
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
      `"${(r.group_name || "").replace(/"/g, '""')}"`,
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
  const [page, setPage] = useState(0);
  const confirm = useConfirm();
  const [bulkService, setBulkService] = useState("");
  const [bulkGroup, setBulkGroup] = useState("");
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);
  const [dialogGroupDropdownOpen, setDialogGroupDropdownOpen] = useState(false);
  const dialogGroupRef = useRef<HTMLDivElement>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editGroupNameValue, setEditGroupNameValue] = useState("");

  // ponytail: close group dropdown on outside click
  useEffect(() => {
    if (!groupDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (groupRef.current && !groupRef.current.contains(e.target as Node)) {
        setGroupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [groupDropdownOpen]);

  // ponytail: close dialog group dropdown on outside click
  useEffect(() => {
    if (!dialogGroupDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dialogGroupRef.current && !dialogGroupRef.current.contains(e.target as Node)) {
        setDialogGroupDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dialogGroupDropdownOpen]);

  type SortKey = keyof Pick<AtelierEntry, "client_number" | "nom" | "telephone" | "service" | "personnes" | "prix_total" | "date_paiement" | "remarque" | "group_name">;
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  type GroupBy = "none" | "service" | "date" | "groupe";
  const [groupBy, setGroupBy] = useState<GroupBy>("none");

  // ponytail: 3-state sort cycle: null→asc→desc→null
  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortDir === "asc") {
        setSortDir("desc");
      } else {
        setSortKey(null);
      }
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(0);
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

  const bulkDeleteMut = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await atelierDelete({ data: { id } });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success(`${selected.size} atelier(s) supprimé(s)`);
      setSelected(new Set());
    },
    onError: () => toast.error("Erreur lors de la suppression"),
  });

  const bulkUpdateMut = useMutation({
    mutationFn: ({ ids, updates }: { ids: string[]; updates: Partial<Pick<AtelierEntry, "service" | "prix_total" | "personnes">> }) =>
      atelierBulkUpdate({ data: { ids, updates } }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      const keys = Object.keys(vars.updates);
      toast.success(`${selected.size} atelier(s) mis à jour (${keys.join(", ")})`);
      setSelected(new Set());
      setBulkService("");
      setBulkGroup("");
      setGroupDropdownOpen(false);
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
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

  const sorted = sortKey
    ? [...filtered].sort((a, b) => {
        let av = a[sortKey!] ?? "";
        let bv = b[sortKey!] ?? "";
        if (typeof av === "string") av = av.toLowerCase();
        if (typeof bv === "string") bv = bv.toLowerCase();
        if (av < bv) return sortDir === "asc" ? -1 : 1;
        if (av > bv) return sortDir === "asc" ? 1 : -1;
        return 0;
      })
    : filtered;

  // ponytail: pre-compute groups before JSX to avoid nested fragment build errors
  const grouped = useMemo(() => {
    if (groupBy === "none") return null;
    const map = new Map<string, AtelierEntry[]>();
    for (const e of sorted) {
      let key: string;
      if (groupBy === "service") {
        key = e.service || "Sans service";
      } else if (groupBy === "groupe") {
        key = e.group_name || "Sans groupe";
      } else {
        // group by month/year from JJ/MM/AAAA
        const parts = (e.date_paiement || "").split("/");
        if (parts.length === 3) {
          const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
          const mi = parseInt(parts[1]) - 1;
          key = `${monthNames[mi] || parts[1]} ${parts[2]}`;
        } else {
          key = "Date inconnue";
        }
      }
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).map(([key, items]) => ({ key, items }));
  }, [sorted, groupBy]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paged = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalRevenue = filtered.reduce((sum, e) => sum + (e.prix_total || 0), 0);
  const totalPeople = filtered.reduce((sum, e) => sum + (e.personnes || 0), 0);

  const services = [...new Set(entries.map((e) => e.service).filter(Boolean))];
  const groupNames = [...new Set(entries.map((e) => e.group_name).filter(Boolean))];

  function toggleSelectAll() {
    if (selected.size === paged.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paged.map((e) => e.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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
      group_name: entry.group_name || "",
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

  // ponytail: rename group across all entries in that group
  async function saveGroupName(group: { key: string; items: AtelierEntry[] }) {
    const newName = editGroupNameValue.trim();
    if (!newName || newName === group.key) { setEditingGroupName(null); return; }
    const ids = group.items.map((e) => e.id);
    try {
      await atelierBulkUpdate({ data: { ids, updates: { group_name: newName } } });
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
      toast.success(`Groupe « ${group.key} » renommé en « ${newName} »`);
    } catch { toast.error("Erreur lors du renommage"); }
    setEditingGroupName(null);
    setEditGroupNameValue("");
  }

  // ponytail: delete group — with data (delete entries) or without (nullify group_name)
  async function deleteGroup(group: { key: string; items: AtelierEntry[] }) {
    const ok = await confirm({
      title: `Supprimer le groupe « ${group.key} »`,
      message: `Supprimer ${group.items.length} atelier(s) du groupe « ${group.key} » ?`,
      confirmLabel: "Supprimer le groupe",
      danger: true,
      checkbox: { label: "Supprimer aussi les ateliers de ce groupe", defaultValue: false, dangerMessage: "⚠ Cette action est irréversible. Tous les ateliers de ce groupe seront supprimés définitivement." },
    });
    if (!ok.ok) return;
    const ids = group.items.map((e) => e.id);
    try {
      if (ok.checkbox) {
        for (const id of ids) await atelierDelete({ data: { id } });
        toast.success(`${ids.length} atelier(s) supprimé(s)`);
      } else {
        await atelierBulkUpdate({ data: { ids, updates: { group_name: null } } });
        toast.success(`Groupe « ${group.key} » supprimé (${ids.length} atelier(s) conservé(s))`);
      }
      queryClient.invalidateQueries({ queryKey: ["ateliers"] });
    } catch { toast.error("Erreur lors de la suppression"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  }

  const cols: { key: SortKey; label: string; cls: string }[] = [
    { key: "client_number", label: "#", cls: "w-12" },
    { key: "nom", label: "Nom", cls: "" },
    { key: "telephone", label: "Tél", cls: "hidden sm:table-cell" },
    { key: "service", label: "Service", cls: "hidden md:table-cell" },
    { key: "personnes", label: "Pers.", cls: "text-center" },
    { key: "prix_total", label: "Prix", cls: "text-right" },
    { key: "date_paiement", label: "Date", cls: "hidden sm:table-cell" },
    { key: "remarque", label: "Remarque", cls: "hidden lg:table-cell" },
    { key: "group_name", label: "Groupe", cls: "hidden xl:table-cell" },
  ];

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-serif font-bold">Atelier & Chiffres d'affaires</h1>
        <p className="text-muted-foreground mt-1">
          {entries.length} atelier(s) au total.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
        <div className="p-6 rounded-2xl bg-white border border-[#1c1917]/10 hover:border-[#F506EA]/40 hover:bg-[#F506EA]/5 transition-colors duration-300">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#1c1917]/40 mb-2">
            <Users className="h-4 w-4" />
            Clients
          </div>
          <p className="font-serif text-3xl text-[#1c1917]">{filtered.length.toLocaleString("fr-FR")}</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-[#1c1917]/10 hover:border-[#F506EA]/40 hover:bg-[#F506EA]/5 transition-colors duration-300">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#1c1917]/40 mb-2">
            <DollarSign className="h-4 w-4" />
            Revenu total
          </div>
          <p className="font-serif text-3xl text-[#1c1917]">{totalRevenue.toLocaleString("fr-FR")} DH</p>
        </div>
        <div className="p-6 rounded-2xl bg-white border border-[#1c1917]/10 hover:border-[#F506EA]/40 hover:bg-[#F506EA]/5 transition-colors duration-300">
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#1c1917]/40 mb-2">
            <Calendar className="h-4 w-4" />
            Personnes
          </div>
          <p className="font-serif text-3xl text-[#1c1917]">{totalPeople.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9 border-[#d4d4d4]"
          />
        </div>
        <Select value={serviceFilter} onValueChange={(v) => { setServiceFilter(v); setPage(0); }}>
          <SelectTrigger className="w-full sm:w-48 border-[#d4d4d4] bg-white hover:border-[#F506EA]/40 transition-colors">
            <SelectValue placeholder="Service" />
          </SelectTrigger>
          <SelectContent className="bg-white border border-[#d4d4d4]">
            <SelectItem value="all" className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">Tous les services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s!} className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 flex-wrap">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
            <SelectTrigger className="w-40 border-[#d4d4d4] bg-white hover:border-[#F506EA]/40 transition-colors">
              <Layers className="mr-1 h-3.5 w-3.5" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white border border-[#d4d4d4]">
              <SelectItem value="none" className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">Aucun groupement</SelectItem>
              <SelectItem value="service" className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">Par service</SelectItem>
              <SelectItem value="groupe" className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">Par groupe</SelectItem>
              <SelectItem value="date" className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">Par date</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="border-[#d4d4d4] bg-white"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
          >
            {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            <span className="hidden sm:inline">Importer CSV</span>
          </Button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
          <Button variant="outline" className="border-[#d4d4d4] bg-white" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Exporter CSV</span>
          </Button>
          <Button className="bg-[#F506EA] hover:bg-[#d405c0] text-white" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Nouvel atelier</span>
          </Button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4 p-3 rounded-lg bg-[#F506EA]/5 border border-[#F506EA]/20">
          <span className="text-sm font-medium">{selected.size} sélectionné(s)</span>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={async () => {
                const ok = await confirm({
                  title: "Supprimer les ateliers",
                  message: `Supprimer ${selected.size} atelier(s) définitivement ?`,
                  confirmLabel: "Supprimer",
                  danger: true,
                });
                if (ok.ok) bulkDeleteMut.mutate([...selected]);
              }}
            >
              <Trash className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-muted"
              onClick={() => {
                const selectedEntries = entries.filter((e) => selected.has(e.id));
                const csv = toCSV(selectedEntries);
                const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `ateliers_selection_${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success("Export de la sélection téléchargé");
              }}
            >
              <Download className="mr-1 h-4 w-4" />
              Exporter
            </Button>
            <div className="flex items-center gap-2">
              <Select value={bulkService} onValueChange={setBulkService}>
                <SelectTrigger className="w-44 h-8 text-xs border-[#d4d4d4] bg-white hover:border-[#F506EA]/40 transition-colors">
                  <SelectValue placeholder="Changer le service..." />
                </SelectTrigger>
                <SelectContent className="bg-white border border-[#d4d4d4]">
                  {services.map((s) => (
                    <SelectItem key={s} value={s!} className="px-3 py-2 hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted"
                disabled={!bulkService}
                onClick={() => bulkUpdateMut.mutate({ ids: [...selected], updates: { service: bulkService } })}
              >
                Appliquer
              </Button>
            </div>
            <div className="relative flex items-center gap-2">
              <div className="relative" ref={groupRef}>
                <Input
                  value={bulkGroup}
                  onChange={(e) => { setBulkGroup(e.target.value); setGroupDropdownOpen(true); }}
                  onFocus={() => setGroupDropdownOpen(true)}
                  placeholder="Groupe..."
                  className="w-44 h-8 text-xs border-[#d4d4d4]"
                />
                {groupDropdownOpen && bulkGroup.trim() && (
                  <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white border border-[#d4d4d4] rounded-lg shadow-md max-h-40 overflow-auto">
                    {groupNames
                      .filter((g) => g!.toLowerCase().includes(bulkGroup.toLowerCase()))
                      .map((g) => (
                        <button
                          key={g}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors"
                          onClick={() => { setBulkGroup(g!); setGroupDropdownOpen(false); }}
                        >
                          {g}
                        </button>
                      ))}
                    {!groupNames.some((g) => g!.toLowerCase() === bulkGroup.toLowerCase()) && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors border-t border-[#d4d4d4]"
                        onClick={() => setGroupDropdownOpen(false)}
                      >
                        + Créer « {bulkGroup.trim()} »
                      </button>
                    )}
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="hover:bg-muted"
                disabled={!bulkGroup.trim()}
                onClick={() => { bulkUpdateMut.mutate({ ids: [...selected], updates: { group_name: bulkGroup.trim() } }); setGroupDropdownOpen(false); }}
              >
                Grouper
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} className="sm:ml-auto">
            Annuler
          </Button>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden sm:block rounded-xl border border-[#d4d4d4] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="rounded border-[#d4d4d4] accent-[#F506EA]"
                  checked={paged.length > 0 && selected.size === paged.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              {cols.map((c) => (
                <TableHead
                  key={c.key}
                  className={`${c.cls} cursor-pointer select-none hover:text-foreground`}
                  onClick={() => toggleSort(c.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {c.label}
                    <SortIcon col={c.key} />
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : paged.length === 0 && !grouped ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  Aucun atelier trouvé
                </TableCell>
              </TableRow>
            ) : grouped ? (
              grouped.map((group) => (
                <React.Fragment key={group.key}>
                  <TableRow className="bg-[#F506EA]/5">
                    <TableCell colSpan={11} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        {editingGroupName === group.key ? (
                          <React.Fragment>
                            <Input
                              value={editGroupNameValue}
                              onChange={(e) => setEditGroupNameValue(e.target.value)}
                              className="h-7 w-48 text-xs border-[#F506EA]/40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter") saveGroupName(group);
                                if (e.key === "Escape") { setEditingGroupName(null); setEditGroupNameValue(""); }
                              }}
                            />
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-[#F506EA]" onClick={() => saveGroupName(group)}>
                              Enregistrer
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingGroupName(null); setEditGroupNameValue(""); }}>
                              Annuler
                            </Button>
                          </React.Fragment>
                        ) : (
                          <React.Fragment>
                            <span className="text-sm font-medium text-[#F506EA]">{group.key}</span>
                            <span className="text-xs text-muted-foreground">({group.items.length})</span>
                            {group.key !== "Sans groupe" && groupBy === "groupe" && (
                              <div className="flex gap-1 ml-2">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingGroupName(group.key); setEditGroupNameValue(group.key); }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600" onClick={() => deleteGroup(group)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </React.Fragment>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.items.map((entry) => (
                    <TableRow
                      key={entry.id}
                      className={`transition-colors duration-200 ${selected.has(entry.id) ? "bg-[#F506EA]/5" : "hover:bg-[#1c1917]/5"}`}
                    >
                      <TableCell>
                        <input type="checkbox" className="rounded border-[#d4d4d4] accent-[#F506EA]" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                      </TableCell>
                      {cols.map((c) => (
                        <TableCell key={c.key} className={c.cls}>
                          {c.key === "group_name"
                            ? entry.group_name ? <span className="text-xs bg-[#F506EA]/10 text-[#F506EA] px-2 py-1 rounded-full">{entry.group_name}</span> : "—"
                            : c.key === "service"
                            ? <span className="text-xs bg-muted px-2 py-1 rounded-full">{entry.service || "—"}</span>
                            : c.key === "prix_total"
                            ? <span className="text-right font-medium">{entry.prix_total.toLocaleString()} DH</span>
                            : c.key === "date_paiement"
                            ? formatDate(entry.date_paiement)
                            : c.key === "client_number"
                            ? <span className="font-mono text-sm text-muted-foreground">{entry.client_number}</span>
                            : c.key === "personnes"
                            ? entry.personnes
                            : String(entry[c.key] ?? "—")}
                        </TableCell>
                      ))}
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={async () => { const ok = await confirm({ title: "Supprimer l'atelier", message: `Supprimer « ${entry.nom} » ?`, confirmLabel: "Supprimer", danger: true }); if (ok.ok) deleteMut.mutate(entry.id); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </React.Fragment>
              ))
            ) : (
              paged.map((entry) => (
                <TableRow
                  key={entry.id}
                  className={`transition-colors duration-200 ${selected.has(entry.id) ? "bg-[#F506EA]/5" : "hover:bg-[#1c1917]/5"}`}
                >
                  <TableCell>
                    <input type="checkbox" className="rounded border-[#d4d4d4] accent-[#F506EA]" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                  </TableCell>
                  {cols.map((c) => (
                    <TableCell key={c.key} className={c.cls}>
                      {c.key === "group_name"
                        ? entry.group_name ? <span className="text-xs bg-[#F506EA]/10 text-[#F506EA] px-2 py-1 rounded-full">{entry.group_name}</span> : "—"
                        : c.key === "service"
                        ? <span className="text-xs bg-muted px-2 py-1 rounded-full">{entry.service || "—"}</span>
                        : c.key === "prix_total"
                        ? <span className="text-right font-medium">{entry.prix_total.toLocaleString()} DH</span>
                        : c.key === "date_paiement"
                        ? formatDate(entry.date_paiement)
                        : c.key === "client_number"
                        ? <span className="font-mono text-sm text-muted-foreground">{entry.client_number}</span>
                        : c.key === "personnes"
                        ? entry.personnes
                        : String(entry[c.key] ?? "—")}
                    </TableCell>
                  ))}
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                        onClick={async () => {
                          const ok = await confirm({
                            title: "Supprimer l'atelier",
                            message: `Supprimer « ${entry.nom} » définitivement ?`,
                            confirmLabel: "Supprimer",
                            danger: true,
                           });
                          if (ok.ok) deleteMut.mutate(entry.id);
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

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Chargement...</div>
        ) : paged.length === 0 && !grouped ? (
          <div className="text-center py-8 text-muted-foreground">Aucun atelier trouvé</div>
        ) : grouped ? (
          grouped.map((group) => (
            <React.Fragment key={group.key}>
              <div className="px-3 py-2 rounded-lg bg-[#F506EA]/5 border border-[#F506EA]/20">
                <span className="text-sm font-medium text-[#F506EA]">{group.key}</span>
                <span className="text-xs text-muted-foreground ml-2">({group.items.length})</span>
              </div>
              {group.items.map((entry) => (
                <div key={entry.id} className={`rounded-xl border border-[#d4d4d4] p-4 ${selected.has(entry.id) ? "bg-[#F506EA]/5" : ""}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-[#d4d4d4] accent-[#F506EA]" checked={selected.has(entry.id)} onChange={() => toggleSelect(entry.id)} />
                      <span className="font-mono text-xs text-muted-foreground">#{entry.client_number}</span>
                      <span className="font-medium">{entry.nom}</span>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={async () => { const ok = await confirm({ title: "Supprimer l'atelier", message: `Supprimer « ${entry.nom} » ?`, confirmLabel: "Supprimer", danger: true }); if (ok.ok) deleteMut.mutate(entry.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>{entry.telephone || "—"}</div>
                    <div className="flex justify-between">
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{entry.service || "—"}</span>
                      <span>{formatDate(entry.date_paiement)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{entry.personnes} pers.</span>
                      <span className="font-medium">{entry.prix_total.toLocaleString()} DH</span>
                    </div>
                    {entry.group_name && (
                      <div><span className="text-xs bg-[#F506EA]/10 text-[#F506EA] px-2 py-0.5 rounded-full">{entry.group_name}</span></div>
                    )}
                    {entry.remarque && <div className="text-xs truncate">{entry.remarque}</div>}
                  </div>
                </div>
              ))}
            </React.Fragment>
          ))
        ) : (
          paged.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border border-[#d4d4d4] p-4 ${selected.has(entry.id) ? "bg-[#F506EA]/5" : ""}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-[#d4d4d4] accent-[#F506EA]"
                    checked={selected.has(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                  />
                  <span className="font-mono text-xs text-muted-foreground">#{entry.client_number}</span>
                  <span className="font-medium">{entry.nom}</span>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={async () => {
                      const ok = await confirm({
                        title: "Supprimer l'atelier",
                        message: `Supprimer « ${entry.nom} » définitivement ?`,
                        confirmLabel: "Supprimer",
                        danger: true,
                      });
                      if (ok.ok) deleteMut.mutate(entry.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>{entry.telephone || "—"}</div>
                <div className="flex justify-between">
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{entry.service || "—"}</span>
                  <span>{formatDate(entry.date_paiement)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{entry.personnes} pers.</span>
                  <span className="font-medium">{entry.prix_total.toLocaleString()} DH</span>
                </div>
                {entry.group_name && (
                  <div><span className="text-xs bg-[#F506EA]/10 text-[#F506EA] px-2 py-0.5 rounded-full">{entry.group_name}</span></div>
                )}
                {entry.remarque && (
                  <div className="text-xs truncate">{entry.remarque}</div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && !grouped && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-muted-foreground">
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, sorted.length)} sur {sorted.length}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#d4d4d4]"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-[#d4d4d4]"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingId ? "Modifier l'atelier" : "Nouvel atelier"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2">
              <label className="text-sm font-medium">Nom *</label>
              <Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium">Téléphone</label>
              <Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium">Service</label>
              <Input value={form.service} onChange={(e) => setForm({ ...form, service: e.target.value })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium">Personnes</label>
              <Input type="number" min={1} value={form.personnes} onChange={(e) => setForm({ ...form, personnes: parseInt(e.target.value) || 1 })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium">Prix total (DH)</label>
              <Input type="number" min={0} value={form.prix_total} onChange={(e) => setForm({ ...form, prix_total: parseFloat(e.target.value) || 0 })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium">Date (JJ/MM/AAAA)</label>
              <Input value={form.date_paiement} onChange={(e) => setForm({ ...form, date_paiement: e.target.value })} placeholder="01/03/2026" className="mt-1 border-[#d4d4d4]" />
            </div>
            <div>
              <label className="text-sm font-medium"># Client</label>
              <Input type="number" value={form.client_number ?? ""} onChange={(e) => setForm({ ...form, client_number: e.target.value ? parseInt(e.target.value) : null })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Remarque</label>
              <Input value={form.remarque} onChange={(e) => setForm({ ...form, remarque: e.target.value })} className="mt-1 border-[#d4d4d4]" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Groupe</label>
              <div className="relative mt-1" ref={dialogGroupRef}>
                <Input
                  value={form.group_name}
                  onChange={(e) => { setForm({ ...form, group_name: e.target.value }); setDialogGroupDropdownOpen(true); }}
                  onFocus={() => setDialogGroupDropdownOpen(true)}
                  placeholder="Ex: VIP, Régulier, Événement..."
                  className="border-[#d4d4d4]"
                />
                {dialogGroupDropdownOpen && form.group_name.trim() && (
                  <div className="absolute z-50 top-full mt-1 left-0 w-full bg-white border border-[#d4d4d4] rounded-lg shadow-md max-h-40 overflow-auto">
                    {groupNames
                      .filter((g) => g!.toLowerCase().includes(form.group_name.toLowerCase()))
                      .map((g) => (
                        <button
                          key={g}
                          type="button"
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#F506EA]/5 hover:text-[#F506EA] transition-colors"
                          onClick={() => { setForm({ ...form, group_name: g! }); setDialogGroupDropdownOpen(false); }}
                        >
                          {g}
                        </button>
                      ))}
                    {!groupNames.some((g) => g!.toLowerCase() === form.group_name.toLowerCase()) && (
                      <button
                        type="button"
                        className="w-full text-left px-3 py-1.5 text-xs font-medium text-[#F506EA] hover:bg-[#F506EA]/5 transition-colors border-t border-[#d4d4d4]"
                        onClick={() => setDialogGroupDropdownOpen(false)}
                      >
                        + Créer « {form.group_name.trim()} »
                      </button>
                    )}
                  </div>
                )}
              </div>
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
              {(createMut.isPending || updateMut.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingId ? "Enregistrer" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
