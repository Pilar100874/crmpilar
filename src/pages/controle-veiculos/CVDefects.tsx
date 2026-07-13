import { useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertTriangle, Search, Filter, Wrench, DollarSign, CheckCircle, Clock,
  MessageSquare, Eye, CalendarIcon, Plus, User, Tags,
} from "lucide-react";
import { toast } from "sonner";
import { CVPageHeader, CVKpiCard } from "./CVPageHeader";

const categoryLabels: Record<string, string> = {
  mechanical: "Mecânico", electrical: "Elétrico", bodywork: "Carroceria",
  safety: "Segurança", other: "Outros",
};

export default function CVDefects() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [defectTypes, setDefectTypes] = useState<any[]>([]);
  const [defects, setDefects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const [editing, setEditing] = useState<any | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ solution: "", cost: 0, resolvedBy: "", validatedBy: "" });

  const [createOpen, setCreateOpen] = useState(false);
  const [newDefect, setNewDefect] = useState({
    vehicle_id: "", driver_id: "", defect_type_id: "", defect_description: "",
  });

  const loadAll = async () => {
    setLoading(true);
    const [v, d, dt, def] = await Promise.all([
      supabase.from("cv_vehicles").select("*").eq("active", true).order("name"),
      supabase.from("cv_drivers").select("*").eq("active", true).order("name"),
      supabase.from("cv_defect_types").select("*").order("category").order("name"),
      supabase.from("cv_defect_reports").select("*").order("reported_at", { ascending: false }),
    ]);
    setVehicles(v.data ?? []); setDrivers(d.data ?? []); setDefectTypes(dt.data ?? []); setDefects(def.data ?? []);
    setLoading(false);
  };
  useEffect(() => { loadAll(); }, []);

  const getVehicle = (id: string) => vehicles.find((v) => v.id === id);
  const getDriver = (id: string) => drivers.find((d) => d.id === id);
  const getDefectType = (id: string) => defectTypes.find((t) => t.id === id);

  const filtered = defects.filter((defect) => {
    const v = getVehicle(defect.vehicle_id);
    const dr = getDriver(defect.driver_id);
    const s = searchTerm.toLowerCase();
    const matchesSearch = !s
      || v?.name?.toLowerCase().includes(s)
      || v?.plate?.toLowerCase().includes(s)
      || dr?.name?.toLowerCase().includes(s)
      || defect.defect_description?.toLowerCase().includes(s);
    const matchesStatus = statusFilter === "all" || defect.status === statusFilter;
    let matchesDate = true;
    if (dateFrom || dateTo) {
      const rd = new Date(defect.reported_at);
      if (dateFrom && rd < new Date(new Date(dateFrom).setHours(0, 0, 0, 0))) matchesDate = false;
      if (dateTo && rd > new Date(new Date(dateTo).setHours(23, 59, 59, 999))) matchesDate = false;
    }
    return matchesSearch && matchesStatus && matchesDate;
  });

  const handleSave = async () => {
    if (!editing) return;
    if (!formData.solution.trim()) return toast.error("Descreva a solução");
    if (!formData.resolvedBy.trim()) return toast.error("Informe o mecânico responsável");
    if (formData.cost <= 0) return toast.error("Informe custo maior que zero");

    const resolvedAt = new Date().toISOString();
    const { error } = await supabase.from("cv_defect_reports").update({
      solution: formData.solution,
      cost: formData.cost,
      resolved_by: formData.resolvedBy,
      validated_by: formData.validatedBy || null,
      resolved_at: resolvedAt,
      status: "resolved",
    }).eq("id", editing.id);
    if (error) return toast.error(error.message);
    toast.success("Defeito resolvido!");
    setDialogOpen(false);
    setEditing(null);
    loadAll();
  };

  const handleCreate = async () => {
    if (!newDefect.vehicle_id || !newDefect.driver_id || !newDefect.defect_type_id || !newDefect.defect_description.trim()) {
      return toast.error("Preencha todos os campos obrigatórios");
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("cv_defect_reports").insert({
      ...newDefect,
      reported_at: new Date().toISOString(),
      reported_by: user?.id ?? null,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Defeito reportado!");
    setCreateOpen(false);
    setNewDefect({ vehicle_id: "", driver_id: "", defect_type_id: "", defect_description: "" });
    loadAll();
  };

  const handleWhatsApp = (defect: any) => {
    const v = getVehicle(defect.vehicle_id);
    const dr = getDriver(defect.driver_id);
    const msg = `🚨 NOTIFICAÇÃO DE VEÍCULO\nVeículo: ${v?.name} (${v?.plate})\nMotorista: ${dr?.name}\nData: ${new Date(defect.reported_at).toLocaleString("pt-BR")}\n\n${defect.is_damage_report ? "⚠️ AVARIA" : "🔧 DEFEITO"}:\n${defect.defect_description}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const getStatusBadge = (status: string) => {
    if (status === "pending") return <Badge className="bg-warning text-warning-foreground">Pendente</Badge>;
    if (status === "in_progress") return <Badge variant="outline" className="border-primary text-primary">Em Andamento</Badge>;
    return <Badge className="bg-success text-success-foreground">Resolvido</Badge>;
  };

  const pendingCount = defects.filter((d) => d.status === "pending").length;
  const inProgressCount = defects.filter((d) => d.status === "in_progress").length;
  const resolvedCount = defects.filter((d) => d.status === "resolved").length;
  const totalCost = defects.filter((d) => d.status === "resolved").reduce((s, d) => s + (Number(d.cost) || 0), 0);

  return (
    <div className="space-y-4">
      <CVPageHeader
        icon={AlertTriangle}
        title="Defeitos & Avarias"
        subtitle={`${pendingCount} pendente(s) • ${resolvedCount} resolvido(s)`}
        actions={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="bg-white text-primary hover:bg-white/90">
                <Plus className="h-4 w-4 mr-1" /> Reportar Defeito
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" /> Reportar Novo Defeito</DialogTitle>
                <DialogDescription>Registre manualmente um defeito da frota.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Veículo *</Label>
                    <Select value={newDefect.vehicle_id} onValueChange={(v) => setNewDefect({ ...newDefect, vehicle_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Motorista *</Label>
                    <Select value={newDefect.driver_id} onValueChange={(v) => setNewDefect({ ...newDefect, driver_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Tags className="h-4 w-4" /> Tipo de Defeito *</Label>
                  <Select value={newDefect.defect_type_id} onValueChange={(v) => setNewDefect({ ...newDefect, defect_type_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {defectTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} <span className="text-xs text-muted-foreground">({categoryLabels[t.category] || t.category})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Descrição *</Label>
                  <Textarea rows={3} value={newDefect.defect_description}
                    onChange={(e) => setNewDefect({ ...newDefect, defect_description: e.target.value })}
                    placeholder="Descreva o defeito..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate}>Reportar Defeito</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <CVKpiCard label="Pendentes" value={pendingCount} icon={Clock} tone="warning" />
        <CVKpiCard label="Em Andamento" value={inProgressCount} icon={Wrench} tone="info" />
        <CVKpiCard label="Resolvidos" value={resolvedCount} icon={CheckCircle} tone="success" />
        <CVKpiCard label="Custo Total" value={`R$ ${totalCost.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} icon={DollarSign} tone="primary" />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Filter className="h-5 w-5" /> Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar:</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Veículo, placa, motorista ou defeito..." value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="resolved">Resolvido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data De:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Data Até:</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yyyy") : "Selecionar"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" /></PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Defects List */}
      <div className="space-y-4">
        {loading && <Card><CardContent className="p-8 text-center text-muted-foreground">Carregando...</CardContent></Card>}
        {!loading && filtered.length === 0 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Nenhum defeito encontrado</CardContent></Card>
        )}
        {filtered.map((defect) => {
          const v = getVehicle(defect.vehicle_id);
          const dr = getDriver(defect.driver_id);
          const dt = getDefectType(defect.defect_type_id);
          const repairH = defect.resolved_at && defect.reported_at
            ? Math.round((new Date(defect.resolved_at).getTime() - new Date(defect.reported_at).getTime()) / 3600000 * 10) / 10
            : null;
          return (
            <Card key={defect.id} className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    {v?.name} — {v?.plate}
                  </CardTitle>
                  {getStatusBadge(defect.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div><span className="font-medium">Motorista:</span> {dr?.name}</div>
                    <div className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Reportado em:</span> {new Date(defect.reported_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </div>

                <div className={cn("p-3 rounded border-l-4",
                  defect.is_damage_report ? "bg-destructive/10 border-destructive" : "bg-warning/10 border-warning"
                )}>
                  <div className={cn("flex items-center gap-2 text-sm font-medium mb-1",
                    defect.is_damage_report ? "text-destructive" : "text-warning"
                  )}>
                    {defect.is_damage_report ? <Eye className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {defect.is_damage_report ? "Avaria Encontrada na Vistoria:" : "Defeito Reportado:"}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium">Tipo:</span>
                      <Badge variant="outline" className="text-xs">{dt?.name || "Não classificado"}</Badge>
                    </div>
                    <p className="text-sm">{defect.defect_description}</p>
                  </div>
                </div>

                {(defect.solution || defect.cost || defect.resolved_by || defect.validated_by) && (
                  <div className="p-3 bg-primary/10 rounded border-l-4 border-primary">
                    <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                      <Wrench className="h-4 w-4" /> Informações da Solução:
                    </div>
                    <div className="space-y-2 text-sm">
                      {defect.solution && (
                        <div><span className="font-medium">Solução:</span> <p className="mt-1">{defect.solution}</p></div>
                      )}
                      {defect.cost !== null && defect.cost !== undefined && (
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-success" /><span className="font-medium">Custo:</span>
                          <span className="font-bold text-success">R$ {Number(defect.cost).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      {defect.resolved_by && defect.resolved_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-success" /><span className="font-medium">Resolvido por:</span>
                          <span>{defect.resolved_by} em {new Date(defect.resolved_at).toLocaleString("pt-BR")}</span>
                        </div>
                      )}
                      {repairH !== null && (
                        <div><span className="font-medium">Tempo de reparo:</span> <span className="text-primary">{repairH}h</span></div>
                      )}
                      {defect.validated_by && (
                        <div><span className="font-medium">Validado por:</span> <span className="text-success">{defect.validated_by}</span></div>
                      )}
                    </div>
                  </div>
                )}

                {defect.status !== "resolved" && (
                  <div className="flex justify-end gap-2 flex-wrap">
                    <Button onClick={() => handleWhatsApp(defect)} className="bg-success text-success-foreground hover:opacity-90">
                      <MessageSquare className="h-4 w-4 mr-2" /> Enviar WhatsApp
                    </Button>
                    <Dialog open={dialogOpen && editing?.id === defect.id} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditing(defect);
                          setFormData({
                            solution: defect.solution || "",
                            cost: defect.cost || 0,
                            resolvedBy: defect.resolved_by || "",
                            validatedBy: defect.validated_by || "",
                          });
                          setDialogOpen(true);
                        }} className="bg-primary hover:opacity-90">
                          <Wrench className="h-4 w-4 mr-2" />
                          {defect.status === "pending" ? "Adicionar Solução" : "Editar Solução"}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Solução do Defeito</DialogTitle>
                          <DialogDescription>Registre custo e responsável pelo reparo.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Solução Apresentada</Label>
                            <Textarea rows={3} value={formData.solution}
                              onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                              placeholder="Descreva a solução..." />
                          </div>
                          <div className="space-y-2">
                            <Label>Custo (R$)</Label>
                            <Input type="number" min="0" step="0.01" value={formData.cost}
                              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })} />
                          </div>
                          <div className="space-y-2">
                            <Label>Mecânico Responsável</Label>
                            <Input value={formData.resolvedBy}
                              onChange={(e) => setFormData({ ...formData, resolvedBy: e.target.value })}
                              placeholder="Nome do mecânico" />
                          </div>
                          <div className="space-y-2">
                            <Label>Motorista que Validou</Label>
                            <Select value={formData.validatedBy} onValueChange={(v) => setFormData({ ...formData, validatedBy: v })}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {drivers.map((d) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button className="w-full bg-success text-success-foreground hover:opacity-90" onClick={handleSave}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Salvar
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
