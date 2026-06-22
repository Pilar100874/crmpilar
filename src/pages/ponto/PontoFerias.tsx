import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ tipo: "ferias", bloqueia_marcacao: true });

  const load = async () => {
    const { data } = await supabase
      .from("ponto_ferias_afastamentos")
      .select("*, ponto_funcionarios(nome, matricula)")
      .order("data_inicio", { ascending: false });
    setLista(data || []);
  };

  useEffect(() => {
    load();
    supabase.from("ponto_funcionarios").select("id, nome, matricula").eq("ativo", true).order("nome")
      .then(({ data }) => setFuncionarios(data || []));
  }, []);

  const salvar = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId || !form.funcionario_id || !form.data_inicio || !form.data_fim) {
      return toast.error("Preencha funcionário, início e fim");
    }
    const { error } = await supabase.from("ponto_ferias_afastamentos").insert({
      funcionario_id: form.funcionario_id, estabelecimento_id: estId,
      tipo: form.tipo, data_inicio: form.data_inicio, data_fim: form.data_fim,
      motivo: form.motivo || null, bloqueia_marcacao: !!form.bloqueia_marcacao, status: "aprovado",
    });
    if (error) return toast.error(error.message);
    toast.success("Registrado");
    setOpen(false); setForm({ tipo: "ferias", bloqueia_marcacao: true }); load();
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
        <DialogContent>
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
