import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEstablishment } from "@/hooks/useEstablishment";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, AlertOctagon, CheckCircle2, Loader2, Eye, Filter, CalendarIcon, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Incident {
  id: string;
  title: string;
  description: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  reporterName: string | null;
  status: string;
  severity: string;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
}

interface Sector {
  id: string;
  name: string;
  color: string;
}

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const { establishmentId } = useEstablishment();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    sectorId: "",
    severity: "medium",
  });

  // Resolve dialog
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  // Detail dialog
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Filters
  const [filterSector, setFilterSector] = useState("all");
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

  // Delete
  const [canDeleteIncidents, setCanDeleteIncidents] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchData();
    checkDeletePermission();
  }, [user]);

  const checkDeletePermission = async () => {
    if (!user) return;
    try {
      const [flagsRes, roleRes] = await Promise.all([
        supabase.rpc("get_my_profile_flags" as any).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      const isAdminOrManager = (roleRes.data || []).some(r => r.role === "admin" || r.role === "manager");
      setCanDeleteIncidents(isAdminOrManager || (flagsRes.data as any)?.can_delete_incidents || false);

    } catch {}
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      const { error } = await supabase.from("incidents").delete().eq("id", deletingId);
      if (error) throw error;
      toast({ title: "Incidente excluído!" });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error deleting incident:", error);
      toast({ title: "Erro ao excluir", variant: "destructive" });
    }
  };

  const fetchData = async () => {
    try {
      const [incidentsRes, sectorsRes, profilesRes] = await Promise.all([
        supabase.from("incidents").select(`
          id, title, description, status, severity, created_at, reported_by_user_id, resolved_at, resolution_notes, sector_id,
          sectors (name, color)
        `).order("created_at", { ascending: false }),
        supabase.from("sectors").select("id, name, color").order("name"),
        supabase.from("profiles").select("user_id, full_name"),
      ]);

      if (sectorsRes.data) setSectors(sectorsRes.data);

      const profiles = profilesRes.data || [];
      const mapped = (incidentsRes.data || []).map((i: any) => {
        const profile = profiles.find(p => p.user_id === i.reported_by_user_id);
        return {
          id: i.id,
          title: i.title,
          description: i.description,
          sectorId: i.sector_id,
          sectorName: i.sectors?.name || null,
          sectorColor: i.sectors?.color || null,
          reporterName: profile?.full_name || null,
          status: i.status,
          severity: i.severity,
          createdAt: i.created_at,
          resolvedAt: i.resolved_at,
          resolutionNotes: i.resolution_notes,
        };
      });

      setIncidents(mapped);
    } catch (error) {
      console.error("Error fetching incidents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!form.title) {
      toast({ title: "Título é obrigatório", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("incidents").insert({
        title: form.title,
        description: form.description || null,
        sector_id: form.sectorId || null,
        severity: form.severity,
        reported_by_user_id: user?.id,
        establishment_id: establishmentId,
      });

      if (error) throw error;

      toast({ title: "Incidente registrado!" });
      setDialogOpen(false);
      setForm({ title: "", description: "", sectorId: "", severity: "medium" });
      fetchData();
    } catch (error) {
      console.error("Error creating incident:", error);
      toast({ title: "Erro ao registrar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openResolveDialog = (id: string) => {
    setResolvingId(id);
    setResolutionNotes("");
    setResolveDialogOpen(true);
  };

  const handleResolve = async () => {
    if (!resolutionNotes.trim()) {
      toast({ title: "A solução é obrigatória", variant: "destructive" });
      return;
    }
    if (!resolvingId) return;

    setResolving(true);
    try {
      const { error } = await supabase
        .from("incidents")
        .update({
          status: "resolved",
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes.trim(),
        })
        .eq("id", resolvingId);

      if (error) throw error;

      toast({ title: "Incidente resolvido!" });
      setResolveDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error resolving incident:", error);
      toast({ title: "Erro ao resolver", variant: "destructive" });
    } finally {
      setResolving(false);
    }
  };

  const openDetail = (incident: Incident) => {
    setSelectedIncident(incident);
    setDetailDialogOpen(true);
  };

  const severityLabels: Record<string, string> = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    critical: "Crítica",
  };

  const severityColors: Record<string, string> = {
    low: "text-muted-foreground bg-muted",
    medium: "text-primary bg-primary/10",
    high: "text-warning bg-warning/10",
    critical: "text-critical bg-critical/10",
  };

  // Filtered incidents
  const filtered = incidents.filter((i) => {
    if (filterSector !== "all" && i.sectorId !== filterSector) return false;
    if (filterDate) {
      const incidentDate = new Date(i.createdAt).toDateString();
      if (incidentDate !== filterDate.toDateString()) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">Incidentes</h1>
            <p className="text-muted-foreground">
              Registre e acompanhe incidentes operacionais
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Incidente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Registrar Incidente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Descreva o incidente brevemente"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Detalhes do incidente..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Setor</Label>
                    <Select value={form.sectorId} onValueChange={(v) => setForm({ ...form, sectorId: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectors.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Severidade</Label>
                    <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="critical">Crítica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Registrar Incidente"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-border bg-card">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterSector} onValueChange={setFilterSector}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {sectors.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className={cn("w-[180px] justify-start text-left font-normal", !filterDate && "text-muted-foreground")}>
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDate ? format(filterDate, "dd/MM/yyyy") : "Filtrar data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={filterDate}
                onSelect={setFilterDate}
                locale={ptBR}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {(filterSector !== "all" || filterDate) && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterSector("all"); setFilterDate(undefined); }}>
              Limpar filtros
            </Button>
          )}
        </div>

        {/* List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-border bg-card">
              <AlertOctagon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum incidente encontrado</p>
            </div>
          ) : (
            filtered.map((incident) => (
              <div
                key={incident.id}
                className={cn(
                  "p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                  incident.status === "resolved"
                    ? "border-border bg-card/50 opacity-70"
                    : "border-border bg-card"
                )}
                onClick={() => openDetail(incident)}
              >
                <div className="flex items-start gap-4">
                  <AlertOctagon className={cn(
                    "h-5 w-5 mt-0.5 flex-shrink-0",
                    incident.severity === "critical" && "text-critical",
                    incident.severity === "high" && "text-warning",
                    incident.severity === "medium" && "text-primary",
                    incident.severity === "low" && "text-muted-foreground"
                  )} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <span className={cn(
                        "px-2 py-0.5 rounded text-xs font-medium",
                        severityColors[incident.severity]
                      )}>
                        {severityLabels[incident.severity]}
                      </span>
                      {incident.status === "resolved" && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
                          Resolvido
                        </span>
                      )}
                    </div>
                    {incident.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{incident.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      {incident.sectorName && (
                        <div className="flex items-center gap-1">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: incident.sectorColor || "#3b82f6" }}
                          />
                          {incident.sectorName}
                        </div>
                      )}
                      {incident.reporterName && <span>Por: {incident.reporterName}</span>}
                      <span>{new Date(incident.createdAt).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {incident.status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openResolveDialog(incident.id); }}
                        className="gap-1"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Resolver
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openDetail(incident); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    {canDeleteIncidents && (
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); setDeletingId(incident.id); setDeleteDialogOpen(true); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Resolver Incidente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Solução aplicada *</Label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Descreva a solução que foi aplicada para resolver este incidente..."
                rows={4}
              />
            </div>
            <Button className="w-full" onClick={handleResolve} disabled={resolving}>
              {resolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolvendo...
                </>
              ) : (
                "Confirmar Resolução"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertOctagon className={cn(
                "h-5 w-5",
                selectedIncident?.severity === "critical" && "text-critical",
                selectedIncident?.severity === "high" && "text-warning",
                selectedIncident?.severity === "medium" && "text-primary",
                selectedIncident?.severity === "low" && "text-muted-foreground"
              )} />
              {selectedIncident?.title}
            </DialogTitle>
          </DialogHeader>
          {selectedIncident && (
            <div className="space-y-4 mt-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("px-2 py-0.5 rounded text-xs font-medium", severityColors[selectedIncident.severity])}>
                  {severityLabels[selectedIncident.severity]}
                </span>
                {selectedIncident.status === "resolved" ? (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">Resolvido</span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-warning/10 text-warning">Aberto</span>
                )}
              </div>

              {selectedIncident.description && (
                <div>
                  <Label className="text-muted-foreground text-xs">Descrição</Label>
                  <p className="text-sm mt-1">{selectedIncident.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                {selectedIncident.sectorName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Setor</Label>
                    <div className="flex items-center gap-1 mt-1">
                      <div className="h-2 w-2 rounded-full" style={{ backgroundColor: selectedIncident.sectorColor || "#3b82f6" }} />
                      {selectedIncident.sectorName}
                    </div>
                  </div>
                )}
                {selectedIncident.reporterName && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Reportado por</Label>
                    <p className="mt-1">{selectedIncident.reporterName}</p>
                  </div>
                )}
                <div>
                  <Label className="text-muted-foreground text-xs">Data de criação</Label>
                  <p className="mt-1">{new Date(selectedIncident.createdAt).toLocaleString("pt-BR")}</p>
                </div>
                {selectedIncident.resolvedAt && (
                  <div>
                    <Label className="text-muted-foreground text-xs">Resolvido em</Label>
                    <p className="mt-1">{new Date(selectedIncident.resolvedAt).toLocaleString("pt-BR")}</p>
                  </div>
                )}
              </div>

              {selectedIncident.resolutionNotes && (
                <div className="p-3 rounded-lg border border-success/30 bg-success/5">
                  <Label className="text-success text-xs font-semibold">Solução aplicada</Label>
                  <p className="text-sm mt-1">{selectedIncident.resolutionNotes}</p>
                </div>
              )}

              {selectedIncident.status !== "resolved" && (
                <Button className="w-full gap-2" onClick={() => { setDetailDialogOpen(false); openResolveDialog(selectedIncident.id); }}>
                  <CheckCircle2 className="h-4 w-4" />
                  Resolver Incidente
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir incidente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O incidente será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
