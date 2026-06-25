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
import { GitBranch, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Nivel = { ordem: number; papel: string; usuario_id?: string; sla_horas: number };

export default function PontoAprovacaoRegras() {
  const { empresaId } = usePontoEmpresa();
  const [regras, setRegras] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const carregar = async () => {
    if (!empresaId) return;
    setLoading(true);
    const { data } = await supabase.from("ponto_aprovacao_regras").select("*").eq("empresa_id", empresaId).order("prioridade");
    setRegras(data || []);
    setLoading(false);
  };

  useEffect(() => { carregar(); }, [empresaId]);

  const salvar = async () => {
    if (!editing.nome || !editing.tipo_anomalia) { toast.error("Preencha nome e tipo"); return; }
    const payload = { ...editing, empresa_id: empresaId };
    const { error } = editing.id
      ? await supabase.from("ponto_aprovacao_regras").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_aprovacao_regras").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra salva"); setOpen(false); setEditing(null); await carregar();
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from("ponto_aprovacao_regras").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra excluída"); await carregar();
  };

  const addNivel = () => {
    const niveis: Nivel[] = editing?.niveis ?? [];
    setEditing({ ...editing, niveis: [...niveis, { ordem: niveis.length + 1, papel: "gestor_direto", sla_horas: 24 }] });
  };
  const updNivel = (i: number, patch: Partial<Nivel>) => {
    const niveis = [...(editing.niveis ?? [])]; niveis[i] = { ...niveis[i], ...patch };
    setEditing({ ...editing, niveis });
  };
  const rmNivel = (i: number) => {
    const niveis = (editing.niveis ?? []).filter((_: any, idx: number) => idx !== i);
    setEditing({ ...editing, niveis });
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Regras de Aprovação Multi-nível</h1>
            <p className="text-muted-foreground">Configure níveis de aprovação por tipo de anomalia e faixa de valor</p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing({ nome: "", tipo_anomalia: "qualquer", valor_min_min: 0, niveis: [], ativo: true, prioridade: 100 })}>
              <Plus className="h-4 w-4 mr-2" /> Nova regra
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing?.id ? "Editar" : "Nova"} regra de aprovação</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Nome</Label><Input value={editing.nome} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} /></div>
                  <div><Label>Prioridade (menor = primeiro)</Label><Input type="number" value={editing.prioridade} onChange={(e) => setEditing({ ...editing, prioridade: +e.target.value })} /></div>
                  <div>
                    <Label>Tipo de anomalia</Label>
                    <Select value={editing.tipo_anomalia} onValueChange={(v) => setEditing({ ...editing, tipo_anomalia: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="qualquer">Qualquer</SelectItem>
                        <SelectItem value="he_acima_limite">HE acima do limite</SelectItem>
                        <SelectItem value="jornada_acima_limite">Jornada acima do limite</SelectItem>
                        <SelectItem value="atraso">Atraso</SelectItem>
                        <SelectItem value="falta">Falta</SelectItem>
                        <SelectItem value="ajuste_manual">Ajuste manual</SelectItem>
                        <SelectItem value="ferias">Férias</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Valor mínimo (min)</Label><Input type="number" value={editing.valor_min_min ?? 0} onChange={(e) => setEditing({ ...editing, valor_min_min: +e.target.value })} /></div>
                  <div><Label>Valor máximo (min, opcional)</Label><Input type="number" value={editing.valor_max_min ?? ""} onChange={(e) => setEditing({ ...editing, valor_max_min: e.target.value ? +e.target.value : null })} /></div>
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-base">Níveis de aprovação</Label>
                    <Button size="sm" variant="outline" onClick={addNivel}><Plus className="h-3 w-3 mr-1" />Nível</Button>
                  </div>
                  {(editing.niveis ?? []).map((n: Nivel, i: number) => (
                    <div key={i} className="grid grid-cols-[40px_1fr_120px_40px] gap-2 items-end p-2 bg-muted/30 rounded">
                      <div className="text-sm font-bold pt-6">{i + 1}.</div>
                      <div>
                        <Label className="text-xs">Papel</Label>
                        <Select value={n.papel} onValueChange={(v) => updNivel(i, { papel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gestor_direto">Gestor direto</SelectItem>
                            <SelectItem value="rh">RH</SelectItem>
                            <SelectItem value="diretoria">Diretoria</SelectItem>
                            <SelectItem value="financeiro">Financeiro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">SLA (h)</Label>
                        <Input type="number" value={n.sla_horas} onChange={(e) => updNivel(i, { sla_horas: +e.target.value })} />
                      </div>
                      <Button size="icon" variant="ghost" onClick={() => rmNivel(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  ))}
                </div>

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
        <CardHeader><CardTitle>Regras configuradas ({regras.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p>Carregando...</p> : regras.length === 0 ? <p className="text-muted-foreground">Nenhuma regra. Crie a primeira ↑</p> : (
            <div className="space-y-2">
              {regras.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {r.nome}
                      {r.ativo ? <Badge variant="default">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {r.tipo_anomalia} • {r.valor_min_min}-{r.valor_max_min ?? "∞"} min • {(r.niveis ?? []).length} nível(eis)
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(r); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}
        onConfirm={() => { if (deleteId) excluir(deleteId); setDeleteId(null); }}
        title="Excluir regra?" description="Esta ação não pode ser desfeita."
      />
    </div>
  );
}
