import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertOctagon, Wrench, Tags, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimento";
import { PRIORIDADES, TIPO_LABEL, type Prioridade, type TipoServico } from "@/lib/cv/ordens";

const categoryLabels: Record<string, string> = {
  mechanical: "Mecânico", electrical: "Elétrico", bodywork: "Carroceria",
  safety: "Segurança", other: "Outros",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated?: () => void;
  vehicleId?: string;
}

const hoje = () => new Date().toISOString().slice(0, 10);

export default function CVNovoLancamentoDialog({ open, onOpenChange, onCreated, vehicleId }: Props) {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [defectTypes, setDefectTypes] = useState<any[]>([]);
  const [planos, setPlanos] = useState<any[]>([]);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    tipo: "defeito" as TipoServico,
    vehicle_id: vehicleId ?? "",
    driver_id: "",
    defect_type_id: "",
    maintenance_plan_id: "",
    descricao: "",
    prioridade: "quebra" as Prioridade,
    agrupavel: false,
    pecas: "",
    data: hoje(),
    km: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const [v, d, dt, mp] = await Promise.all([
        supabase.from("cv_vehicles").select("*").eq("active", true).order("name"),
        supabase.from("cv_drivers").select("*").eq("active", true).order("name"),
        supabase.from("cv_defect_types").select("*").order("category").order("name"),
        supabase.from("cv_maintenance_plans").select("*").eq("active", true).order("name"),
      ]);
      setVehicles(v.data ?? []); setDrivers(d.data ?? []);
      setDefectTypes(dt.data ?? []); setPlanos(mp.data ?? []);
    })();
  }, [open]);

  useEffect(() => {
    if (open) {
      setForm(f => ({ ...f, vehicle_id: vehicleId ?? "", data: hoje(), km: "" }));
    }
  }, [open, vehicleId]);

  const veiculo = vehicles.find(v => v.id === form.vehicle_id);
  const planosVeiculo = useMemo(
    () => planos.filter(p => p.vehicle_id === form.vehicle_id),
    [planos, form.vehicle_id],
  );

  const selecionarVeiculo = (id: string) => {
    const v = vehicles.find(x => x.id === id);
    setForm(f => ({ ...f, vehicle_id: id, maintenance_plan_id: "", km: String(v?.current_km ?? "") }));
  };

  const salvar = async () => {
    if (!form.vehicle_id) return toast.error("Selecione o veículo");
    if (form.tipo === "defeito" && !form.defect_type_id) return toast.error("Selecione o tipo de defeito");
    if (!form.descricao.trim()) return toast.error("Descreva o serviço");
    if (!form.data) return toast.error("Informe a data do lançamento");
    const km = Number(form.km);
    if (!km || km <= 0) return toast.error("Informe o KM do veículo no lançamento");

    setSalvando(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const estId = await getEstabelecimentoId();
      if (!estId) throw new Error("Estabelecimento não encontrado");

      const { error } = await supabase.from("cv_defect_reports").insert({
        estabelecimento_id: estId,
        vehicle_id: form.vehicle_id,
        driver_id: form.driver_id || null,
        defect_type_id: form.tipo === "defeito" ? form.defect_type_id : null,
        maintenance_plan_id: form.tipo === "manutencao" ? (form.maintenance_plan_id || null) : null,
        defect_description: form.descricao.toUpperCase(),
        prioridade: form.prioridade,
        agrupavel: form.prioridade === "quebra" ? false : form.agrupavel,
        pecas: form.pecas ? form.pecas.toUpperCase() : null,
        vehicle_km: km,
        reported_at: new Date(`${form.data}T12:00:00`).toISOString(),
        reported_by: user?.id ?? null,
        status: "pending",
      });
      if (error) throw error;

      if (veiculo && km > (veiculo.current_km ?? 0)) {
        await supabase.from("cv_vehicles").update({ current_km: km }).eq("id", form.vehicle_id);
      }

      toast.success(`${TIPO_LABEL[form.tipo]} lançada com sucesso`);
      setForm(f => ({
        ...f, driver_id: "", defect_type_id: "", maintenance_plan_id: "",
        descricao: "", pecas: "", prioridade: "quebra", agrupavel: false,
      }));
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao lançar");
    }
    setSalvando(false);
  };

  const manutencao = form.tipo === "manutencao";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {manutencao ? <Wrench className="h-5 w-5 text-primary" /> : <AlertOctagon className="h-5 w-5 text-warning" />}
            Novo lançamento
          </DialogTitle>
          <DialogDescription>
            Registre uma manutenção ou um defeito/avaria — ambos entram na mesma parada do veículo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["manutencao", "defeito"] as const).map(t => (
              <Button
                key={t}
                type="button"
                variant={form.tipo === t ? "default" : "outline"}
                onClick={() => setForm(f => ({ ...f, tipo: t }))}
              >
                {t === "manutencao" ? <Wrench className="h-4 w-4 mr-1" /> : <AlertOctagon className="h-4 w-4 mr-1" />}
                {TIPO_LABEL[t]}
              </Button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Veículo *</Label>
              <Select value={form.vehicle_id} onValueChange={selecionarVeiculo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => <SelectItem key={v.id} value={v.id}>{v.name} — {v.plate}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motorista</Label>
              <Select value={form.driver_id} onValueChange={v => setForm(f => ({ ...f, driver_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {drivers.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {manutencao ? (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Wrench className="h-4 w-4" /> Plano de manutenção</Label>
              <Select
                value={form.maintenance_plan_id}
                onValueChange={v => {
                  const p = planosVeiculo.find(x => x.id === v);
                  setForm(f => ({
                    ...f,
                    maintenance_plan_id: v,
                    descricao: f.descricao || (p?.name ?? ""),
                    pecas: f.pecas || (p?.pecas ?? ""),
                  }));
                }}
                disabled={!form.vehicle_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={form.vehicle_id ? "Opcional — vincular a um plano" : "Selecione o veículo primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {planosVeiculo.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Tags className="h-4 w-4" /> Tipo de defeito *</Label>
              <Select value={form.defect_type_id} onValueChange={v => setForm(f => ({ ...f, defect_type_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                <SelectContent>
                  {defectTypes.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} <span className="text-xs text-muted-foreground">({categoryLabels[t.category] || t.category})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição do serviço *</Label>
            <Textarea
              rows={3}
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder={manutencao ? "Ex.: TROCA DE ÓLEO E FILTROS" : "Descreva o defeito/avaria..."}
            />
          </div>

          <div className="space-y-2">
            <Label>Prioridade *</Label>
            <Select
              value={form.prioridade}
              onValueChange={v => setForm(f => ({ ...f, prioridade: v as Prioridade, agrupavel: v !== "quebra" }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORIDADES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {PRIORIDADES.find(p => p.value === form.prioridade)?.descricao}
            </p>
          </div>

          {form.prioridade !== "quebra" && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.agrupavel} onCheckedChange={c => setForm(f => ({ ...f, agrupavel: !!c }))} />
              Agrupar na próxima parada do veículo
            </label>
          )}

          <div className="space-y-2">
            <Label>Peças / insumos necessários</Label>
            <Input
              placeholder="Ex.: FILTRO DE ÓLEO; ÓLEO 15W40"
              value={form.pecas}
              onChange={e => setForm(f => ({ ...f, pecas: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data do lançamento *</Label>
              <Input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>KM do veículo *</Label>
              <Input
                type="number"
                placeholder="Ex.: 45230"
                value={form.km}
                onChange={e => setForm(f => ({ ...f, km: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Lançar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
