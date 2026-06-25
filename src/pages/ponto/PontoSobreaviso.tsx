import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Bell, Plus, Trash2, Pencil, Phone } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

export default function PontoSobreaviso() {
  const { empresaId } = usePontoEmpresa();
  const [registros, setRegistros] = useState<any[]>([]);
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({ sobreaviso_percentual: 33.33, prontidao_percentual: 66.66 });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const carregar = async () => {
    if (!empresaId) return;
    setLoading(true);
    const [r, f, c] = await Promise.all([
      supabase.from("ponto_sobreaviso").select("*, funcionario:ponto_funcionarios(nome)").eq("empresa_id", empresaId).order("data_inicio", { ascending: false }).limit(200),
      supabase.from("ponto_funcionarios").select("id, nome").eq("empresa_id", empresaId).eq("status", "ativo").order("nome"),
      supabase.from("ponto_clt_config").select("sobreaviso_percentual, prontidao_percentual").eq("empresa_id", empresaId).maybeSingle(),
    ]);
    setRegistros(r.data || []);
    setFuncionarios(f.data || []);
    if (c.data) setConfig(c.data);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [empresaId]);

  const salvar = async () => {
    if (!editing.funcionario_id || !editing.data_inicio || !editing.data_fim) {
      toast.error("Preencha funcionário, início e fim"); return;
    }
    const payload = { ...editing, empresa_id: empresaId };
    const { error } = editing.id
      ? await supabase.from("ponto_sobreaviso").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_sobreaviso").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Salvo"); setOpen(false); setEditing(null); await carregar();
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("ponto_sobreaviso").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído"); await carregar();
  };

  const calcValor = (r: any) => {
    const horas = r.horas_totais ?? 0;
    const perc = r.tipo === "prontidao" ? config.prontidao_percentual : config.sobreaviso_percentual;
    return `${horas.toFixed(1)}h × ${perc}% hora normal`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Sobreaviso e Prontidão</h1>
            <p className="text-muted-foreground">CLT art. 244 — sobreaviso 1/3 ({config.sobreaviso_percentual}%), prontidão 2/3 ({config.prontidao_percentual}%)</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ tipo: "sobreaviso", status: "agendado", acionado: false })}>
              <Plus className="h-4 w-4 mr-2" /> Novo registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Novo"} sobreaviso/prontidão</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>Funcionário</Label>
                  <Select value={editing.funcionario_id} onValueChange={(v) => setEditing({ ...editing, funcionario_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{funcionarios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={editing.tipo} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sobreaviso">Sobreaviso (1/3)</SelectItem>
                      <SelectItem value="prontidao">Prontidão (2/3)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Início</Label><Input type="datetime-local" value={editing.data_inicio?.substring(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, data_inicio: e.target.value })} /></div>
                  <div><Label>Fim</Label><Input type="datetime-local" value={editing.data_fim?.substring(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, data_fim: e.target.value })} /></div>
                </div>
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                  <input type="checkbox" checked={editing.acionado ?? false} onChange={(e) => setEditing({ ...editing, acionado: e.target.checked })} />
                  <Label>Foi acionado durante o período?</Label>
                </div>
                {editing.acionado && (
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Acionamento - início</Label><Input type="datetime-local" value={editing.acionado_inicio?.substring(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, acionado_inicio: e.target.value })} /></div>
                    <div><Label>Acionamento - fim</Label><Input type="datetime-local" value={editing.acionado_fim?.substring(0, 16) ?? ""} onChange={(e) => setEditing({ ...editing, acionado_fim: e.target.value })} /></div>
                  </div>
                )}
                <div><Label>Observação</Label><Input value={editing.observacao ?? ""} onChange={(e) => setEditing({ ...editing, observacao: e.target.value })} /></div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={salvar}>Salvar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Registros ({registros.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Carregando...</p> : registros.length === 0 ? <p className="text-muted-foreground">Nenhum registro</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm resp-table">
                <thead className="border-b">
                  <tr className="text-left">
                    <th className="p-2">Funcionário</th><th className="p-2">Tipo</th><th className="p-2">Período</th>
                    <th className="p-2">Valor</th><th className="p-2">Acionado</th><th className="p-2">Status</th><th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {registros.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{r.funcionario?.nome}</td>
                      <td className="p-2"><Badge variant={r.tipo === "prontidao" ? "default" : "secondary"}>{r.tipo}</Badge></td>
                      <td className="p-2 text-xs">{new Date(r.data_inicio).toLocaleString("pt-BR")}<br />→ {new Date(r.data_fim).toLocaleString("pt-BR")}</td>
                      <td className="p-2 text-xs">{calcValor(r)}</td>
                      <td className="p-2">{r.acionado ? <Badge variant="default"><Phone className="h-3 w-3 mr-1" />Sim</Badge> : "—"}</td>
                      <td className="p-2"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="p-2 flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => { if (deleteId) excluir(deleteId); setDeleteId(null); }}
        title="Excluir registro?" description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
