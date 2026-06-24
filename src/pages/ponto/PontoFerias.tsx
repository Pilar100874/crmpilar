import { useEffect, useState } from "react";
import { supabase as supabaseTyped } from "@/integrations/supabase/client";
const supabase = supabaseTyped as any;
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plane, Plus, Send } from "lucide-react";
import { toast } from "sonner";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

const tipos = [
  { value: "ferias", label: "Férias" },
  { value: "afastamento_inss", label: "Afastamento INSS" },
  { value: "licenca_maternidade", label: "Licença Maternidade" },
  { value: "licenca_paternidade", label: "Licença Paternidade" },
  { value: "licenca_remunerada", label: "Licença Remunerada" },
  { value: "licenca_nao_remunerada", label: "Licença Não Remunerada" },
  { value: "suspensao_contrato", label: "Suspensão de Contrato" },
  { value: "outro", label: "Outro" },
];

export default function PontoFerias() {
  const [lista, setLista] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [cltCfg, setCltCfg] = useState<any>({ ferias_aviso_minimo_dias: 30, ferias_max_fracionamentos: 3, ferias_minimo_periodo_dias: 5, ferias_abono_max_dias: 10 });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ tipo: "ferias", bloqueia_marcacao: true, abono_pecuniario_dias: 0 });

  const load = async () => {
    const { data } = await supabase
      .from("ponto_ferias_afastamentos")
      .select("*, ponto_funcionarios(nome, matricula, empresa_id)")
      .order("data_inicio", { ascending: false });
    setLista(data || []);
  };

  useEffect(() => {
    load();
    supabase.from("ponto_funcionarios").select("id, nome, matricula").eq("ativo", true).order("nome")
      .then(({ data }: any) => setFuncionarios(data || []));
    supabase.from("ponto_clt_config").select("ferias_aviso_minimo_dias, ferias_max_fracionamentos, ferias_minimo_periodo_dias, ferias_abono_max_dias").limit(1).maybeSingle()
      .then(({ data }: any) => { if (data) setCltCfg(data); });
  }, []);

  // ---- Validações em tempo real (espelham o trigger ponto_validar_ferias) ----
  const dias = form.data_inicio && form.data_fim
    ? Math.floor((new Date(form.data_fim).getTime() - new Date(form.data_inicio).getTime()) / 86400000) + 1
    : 0;
  const avisoDias = form.data_inicio ? Math.floor((new Date(form.data_inicio).getTime() - Date.now()) / 86400000) : 0;
  const periodosAnteriores = lista.filter((l) => l.funcionario_id === form.funcionario_id && l.tipo === "ferias" && ["aprovado","pendente"].includes(l.status));
  const temPeriodo14 = periodosAnteriores.some((p) => (Math.floor((new Date(p.data_fim).getTime() - new Date(p.data_inicio).getTime())/86400000)+1) >= 14) || dias >= 14;
  const totalFracionamentos = periodosAnteriores.length + 1;

  const validationErrors: string[] = [];
  if (form.tipo === "ferias" && form.data_inicio && form.data_fim) {
    if (dias < cltCfg.ferias_minimo_periodo_dias) validationErrors.push(`Cada período deve ter no mínimo ${cltCfg.ferias_minimo_periodo_dias} dias (atual: ${dias})`);
    if (avisoDias < cltCfg.ferias_aviso_minimo_dias) validationErrors.push(`Aviso prévio mínimo de ${cltCfg.ferias_aviso_minimo_dias} dias (atual: ${avisoDias})`);
    if (totalFracionamentos > cltCfg.ferias_max_fracionamentos) validationErrors.push(`Máximo de ${cltCfg.ferias_max_fracionamentos} fracionamentos no período aquisitivo`);
    if (totalFracionamentos > 1 && !temPeriodo14) validationErrors.push("Quando fracionadas, um dos períodos deve ter no mínimo 14 dias corridos");
    if (form.abono_pecuniario_dias > cltCfg.ferias_abono_max_dias) validationErrors.push(`Abono pecuniário (⅓) limitado a ${cltCfg.ferias_abono_max_dias} dias`);
    if (form.abono_pecuniario_dias > Math.floor(dias / 3)) validationErrors.push(`Abono não pode exceder ⅓ do período (máx: ${Math.floor(dias/3)} dias)`);
  }

  const salvar = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId || !form.funcionario_id || !form.data_inicio || !form.data_fim) {
      return toast.error("Preencha funcionário, início e fim");
    }
    if (validationErrors.length) return toast.error(validationErrors[0]);
    const { error } = await supabase.from("ponto_ferias_afastamentos").insert({
      funcionario_id: form.funcionario_id, estabelecimento_id: estId,
      tipo: form.tipo, data_inicio: form.data_inicio, data_fim: form.data_fim,
      motivo: form.motivo || null, bloqueia_marcacao: !!form.bloqueia_marcacao, status: "aprovado",
      abono_pecuniario_dias: form.abono_pecuniario_dias || 0,
    });
    if (error) return toast.error(error.message);
    toast.success("Registrado");
    setOpen(false); setForm({ tipo: "ferias", bloqueia_marcacao: true, abono_pecuniario_dias: 0 }); load();
  };


  const enviarEsocial = async (id: string) => {
    const estId = await getEstabelecimentoId();
    const { error } = await supabase.functions.invoke("ponto-esocial-gerar", {
      body: { estabelecimento_id: estId, evento: "S-2230", referencia_id: id },
    });
    if (error) return toast.error(error.message);
    toast.success("Evento eSocial gerado");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Plane className="w-6 h-6" /> Férias & Afastamentos</h1>
          <p className="text-muted-foreground text-sm">Gestão de períodos com bloqueio automático de marcação</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="w-4 h-4 mr-2" />Novo</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Registros</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow>
              <TableHead>Funcionário</TableHead><TableHead>Tipo</TableHead>
              <TableHead>Período</TableHead><TableHead>Dias</TableHead>
              <TableHead>Status</TableHead><TableHead>eSocial</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {lista.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.ponto_funcionarios?.nome}</TableCell>
                  <TableCell><Badge variant="outline">{tipos.find((t) => t.value === l.tipo)?.label || l.tipo}</Badge></TableCell>
                  <TableCell className="text-xs">{new Date(l.data_inicio).toLocaleDateString("pt-BR")} → {new Date(l.data_fim).toLocaleDateString("pt-BR")}</TableCell>
                  <TableCell>{l.dias}</TableCell>
                  <TableCell><Badge>{l.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => enviarEsocial(l.id)} disabled={!!l.esocial_enviado_em}>
                      <Send className="w-3 h-3 mr-1" />{l.esocial_enviado_em ? "Enviado" : "Gerar"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Registro</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Funcionário *</Label>
              <Select value={form.funcionario_id} onValueChange={(v) => setForm({ ...form, funcionario_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{funcionarios.map((f) => (<SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div><Label>Tipo *</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{tipos.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Início *</Label><Input type="date" value={form.data_inicio || ""} onChange={(e) => setForm({ ...form, data_inicio: e.target.value })} /></div>
              <div><Label>Fim *</Label><Input type="date" value={form.data_fim || ""} onChange={(e) => setForm({ ...form, data_fim: e.target.value })} /></div>
            </div>
            <div><Label>Motivo</Label><Input value={form.motivo || ""} onChange={(e) => setForm({ ...form, motivo: e.target.value })} /></div>
            <div className="flex items-center justify-between">
              <Label>Bloquear marcação durante o período</Label>
              <Switch checked={form.bloqueia_marcacao} onCheckedChange={(c) => setForm({ ...form, bloqueia_marcacao: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={salvar}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
