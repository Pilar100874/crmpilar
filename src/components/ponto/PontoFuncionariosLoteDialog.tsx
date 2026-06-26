import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { handleLockError } from "@/lib/ponto/lockErrors";

type Opt = { id: string; nome: string };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedIds: string[];
  empresaId: string;
  cargos: Opt[];
  departamentos: Opt[];
  equipes: Opt[];
  filiais: Opt[];
  escalas: Opt[];
  exportLayouts: { id: string; descricao: string }[];
  onSaved: () => void;
}

const SECTIONS = [
  { key: "admissao", label: "Admissão" },
  { key: "afastamento", label: "Afastamento e férias" },
  { key: "cargo", label: "Cargo" },
  { key: "centro_custo", label: "Centro de custo" },
  { key: "demissao", label: "Demissão" },
  { key: "localizacao", label: "Envio de localização" },
  { key: "equipe", label: "Equipe" },
  { key: "departamento", label: "Departamento" },
  { key: "filial", label: "Filial" },
  { key: "registro_offline", label: "Registro de ponto offline" },
  { key: "tipo_registro", label: "Tipo de registro de ponto" },
  { key: "escala", label: "Turno (escala)" },
  { key: "layout", label: "Layout de exportação" },
  { key: "qualquer_disp", label: "Permitir qualquer dispositivo" },
  { key: "jornada", label: "Jornada contratada (h)" },
  { key: "tipo_contrato", label: "Tipo de contrato" },
];

export default function PontoFuncionariosLoteDialog({
  open, onOpenChange, selectedIds, empresaId,
  cargos, departamentos, equipes, filiais, escalas, exportLayouts, onSaved,
}: Props) {
  const [section, setSection] = useState<string>("cargo");
  const [val, setVal] = useState<any>({});
  const [saving, setSaving] = useState(false);

  const reset = () => { setVal({}); };

  const save = async () => {
    if (selectedIds.length === 0) return toast.error("Nenhum funcionário selecionado");
    setSaving(true);
    try {
      const sb = supabase as any;
      const patch: any = {};
      let extraOps: Array<() => Promise<any>> = [];

      switch (section) {
        case "admissao":
          if (!val.admissao) return toast.error("Informe a data");
          patch.admissao = val.admissao; break;
        case "demissao":
          if (!val.demissao) return toast.error("Informe a data");
          patch.demissao = val.demissao;
          patch.status = "demitido"; break;
        case "afastamento": {
          if (!val.tipo || !val.inicio) return toast.error("Tipo e início obrigatórios");
          // cria registros em ponto_ferias_afastamentos
          extraOps.push(async () => {
            const rows = selectedIds.map((fid) => ({
              empresa_id: empresaId,
              funcionario_id: fid,
              tipo: val.tipo,
              data_inicio: val.inicio,
              data_fim: val.fim || null,
              observacao: val.obs || null,
            }));
            return sb.from("ponto_ferias_afastamentos").insert(rows);
          });
          break;
        }
        case "cargo": {
          if (!val.cargo_id) return toast.error("Selecione o cargo");
          const nome = cargos.find((c) => c.id === val.cargo_id)?.nome ?? null;
          patch.cargo_id = val.cargo_id; patch.cargo = nome; break;
        }
        case "centro_custo":
          patch.centro_custo = val.centro_custo?.trim() || null; break;
        case "localizacao":
          if (!val.permitir_localizacao) return toast.error("Selecione");
          patch.permitir_localizacao = val.permitir_localizacao; break;
        case "equipe": {
          if (!val.equipe_id) return toast.error("Selecione a equipe");
          extraOps.push(async () => {
            await sb.from("ponto_equipe_membros").delete().in("funcionario_id", selectedIds);
            const rows = selectedIds.map((fid) => ({ funcionario_id: fid, equipe_id: val.equipe_id }));
            return sb.from("ponto_equipe_membros").insert(rows);
          });
          break;
        }
        case "departamento":
          if (!val.departamento_id) return toast.error("Selecione");
          patch.departamento_id = val.departamento_id; break;
        case "filial":
          if (!val.filial_id) return toast.error("Selecione");
          patch.filial_id = val.filial_id; break;
        case "registro_offline":
          if (!val.permitir_offline) return toast.error("Selecione");
          patch.permitir_offline = val.permitir_offline; break;
        case "tipo_registro":
          if (!val.tipo_registro_ponto) return toast.error("Selecione");
          patch.tipo_registro_ponto = val.tipo_registro_ponto; break;
        case "escala":
          if (!val.escala_id) return toast.error("Selecione a escala");
          patch.escala_id = val.escala_id;
          if (val.data_inicio_ponto) patch.data_inicio_ponto = val.data_inicio_ponto;
          break;
        case "layout":
          patch.layout_exportacao_id = val.layout_exportacao_id || null; break;
        case "qualquer_disp":
          patch.permitir_qualquer_dispositivo = !!val.permitir_qualquer_dispositivo; break;
        case "jornada":
          if (!val.jornada_contratada_horas) return toast.error("Informe as horas");
          patch.jornada_contratada_horas = Number(val.jornada_contratada_horas); break;
        case "tipo_contrato":
          if (!val.tipo_contrato) return toast.error("Selecione");
          patch.tipo_contrato = val.tipo_contrato; break;
      }

      if (Object.keys(patch).length) {
        const { error } = await sb.from("ponto_funcionarios").update(patch).in("id", selectedIds);
        if (error) { handleLockError(error); return; }
      }
      for (const op of extraOps) {
        const r = await op();
        if (r?.error) { handleLockError(r.error); return; }
      }

      toast.success(`${selectedIds.length} funcionário(s) atualizado(s)`);
      reset();
      onOpenChange(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Atualização em lote</DialogTitle>
          <DialogDescription>
            <Badge variant="secondary">{selectedIds.length} colaborador(es) selecionado(s)</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <ScrollArea className="h-[420px] rounded-md border p-2">
            <div className="flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setSection(s.key); setVal({}); }}
                  className={`text-left text-sm px-3 py-2 rounded-md ${
                    section === s.key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3">
            {section === "admissao" && (
              <div><Label>Data de admissão *</Label>
                <Input type="date" value={val.admissao || ""} onChange={(e) => setVal({ ...val, admissao: e.target.value })} /></div>
            )}

            {section === "demissao" && (
              <div><Label>Data de demissão *</Label>
                <Input type="date" value={val.demissao || ""} onChange={(e) => setVal({ ...val, demissao: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">Status será definido como "demitido".</p></div>
            )}

            {section === "afastamento" && (
              <div className="space-y-3">
                <div><Label>Tipo *</Label>
                  <Select value={val.tipo || ""} onValueChange={(v) => setVal({ ...val, tipo: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ferias">Férias</SelectItem>
                      <SelectItem value="atestado">Atestado</SelectItem>
                      <SelectItem value="licenca">Licença</SelectItem>
                      <SelectItem value="afastamento">Afastamento INSS</SelectItem>
                      <SelectItem value="suspensao">Suspensão</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Início *</Label><Input type="date" value={val.inicio || ""} onChange={(e) => setVal({ ...val, inicio: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="date" value={val.fim || ""} onChange={(e) => setVal({ ...val, fim: e.target.value })} /></div>
                </div>
                <div><Label>Observação</Label><Input value={val.obs || ""} onChange={(e) => setVal({ ...val, obs: e.target.value })} /></div>
              </div>
            )}

            {section === "cargo" && (
              <div><Label>Cargo *</Label>
                <Select value={val.cargo_id || ""} onValueChange={(v) => setVal({ ...val, cargo_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{cargos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select></div>
            )}

            {section === "centro_custo" && (
              <div><Label>Centro de custo</Label>
                <Input value={val.centro_custo || ""} onChange={(e) => setVal({ ...val, centro_custo: e.target.value })} /></div>
            )}

            {section === "localizacao" && (
              <div><Label>Permitir localização *</Label>
                <Select value={val.permitir_localizacao || ""} onValueChange={(v) => setVal({ ...val, permitir_localizacao: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta">Conforme conta</SelectItem>
                    <SelectItem value="sempre">Sempre enviar</SelectItem>
                    <SelectItem value="nunca">Nunca enviar</SelectItem>
                  </SelectContent>
                </Select></div>
            )}

            {section === "equipe" && (
              <div><Label>Equipe *</Label>
                <Select value={val.equipe_id || ""} onValueChange={(v) => setVal({ ...val, equipe_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{equipes.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">Membros anteriores serão substituídos.</p>
              </div>
            )}

            {section === "departamento" && (
              <div><Label>Departamento *</Label>
                <Select value={val.departamento_id || ""} onValueChange={(v) => setVal({ ...val, departamento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{departamentos.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select></div>
            )}

            {section === "filial" && (
              <div><Label>Filial *</Label>
                <Select value={val.filial_id || ""} onValueChange={(v) => setVal({ ...val, filial_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{filiais.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select></div>
            )}

            {section === "registro_offline" && (
              <div><Label>Permitir registro offline *</Label>
                <Select value={val.permitir_offline || ""} onValueChange={(v) => setVal({ ...val, permitir_offline: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conta">Conforme conta</SelectItem>
                    <SelectItem value="sempre">Sempre</SelectItem>
                    <SelectItem value="nunca">Nunca</SelectItem>
                  </SelectContent>
                </Select></div>
            )}

            {section === "tipo_registro" && (
              <div><Label>Tipo de registro de ponto *</Label>
                <Select value={val.tipo_registro_ponto || ""} onValueChange={(v) => setVal({ ...val, tipo_registro_ponto: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relogio">Relógio ponto</SelectItem>
                    <SelectItem value="app">Aplicativo</SelectItem>
                    <SelectItem value="web">Web</SelectItem>
                    <SelectItem value="totem">Totem QR Code</SelectItem>
                  </SelectContent>
                </Select></div>
            )}

            {section === "escala" && (
              <div className="space-y-3">
                <div><Label>Turno (escala) *</Label>
                  <Select value={val.escala_id || ""} onValueChange={(v) => setVal({ ...val, escala_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{escalas.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                  </Select></div>
                <div><Label>Data de início no turno</Label>
                  <Input type="date" value={val.data_inicio_ponto || ""} onChange={(e) => setVal({ ...val, data_inicio_ponto: e.target.value })} /></div>
              </div>
            )}

            {section === "layout" && (
              <div><Label>Layout de exportação</Label>
                <Select value={val.layout_exportacao_id || "none"} onValueChange={(v) => setVal({ ...val, layout_exportacao_id: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— Nenhum —</SelectItem>
                    {exportLayouts.map((c) => <SelectItem key={c.id} value={c.id}>{c.descricao}</SelectItem>)}
                  </SelectContent>
                </Select></div>
            )}

            {section === "qualquer_disp" && (
              <div className="flex items-center gap-2">
                <Switch checked={!!val.permitir_qualquer_dispositivo} onCheckedChange={(v) => setVal({ ...val, permitir_qualquer_dispositivo: v })} />
                <Label>Permitir registrar em qualquer dispositivo</Label>
              </div>
            )}

            {section === "jornada" && (
              <div><Label>Jornada contratada (horas/mês) *</Label>
                <Input type="number" step="0.01" value={val.jornada_contratada_horas || ""} onChange={(e) => setVal({ ...val, jornada_contratada_horas: e.target.value })} /></div>
            )}

            {section === "tipo_contrato" && (
              <div><Label>Tipo de contrato *</Label>
                <Select value={val.tipo_contrato || ""} onValueChange={(v) => setVal({ ...val, tipo_contrato: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensalista">Mensalista</SelectItem>
                    <SelectItem value="horista">Horista</SelectItem>
                    <SelectItem value="diarista">Diarista</SelectItem>
                    <SelectItem value="comissionado">Comissionado</SelectItem>
                  </SelectContent>
                </Select></div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={saving || selectedIds.length === 0}>
            {saving ? "Aplicando..." : `Aplicar a ${selectedIds.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
