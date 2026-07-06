import React, { useEffect, useState } from "react";
import { Settings, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";

interface Regra {
  id: string;
  nome: string;
  escopo: "global" | "usuario" | "filial";
  usuario_id: string | null;
  filial_id: string | null;
  fonte_localizacao: "veiculo" | "celular" | "ambos";
  raio_metros: number;
  tempo_minimo_min: number;
  exigir_janela_horario: boolean;
  ativa: boolean;
}

const empty: Partial<Regra> = {
  nome: "",
  escopo: "global",
  fonte_localizacao: "ambos",
  raio_metros: 150,
  tempo_minimo_min: 5,
  exigir_janela_horario: false,
  ativa: true,
};

const ConfigRegrasMonitoramentoVisita: React.FC = () => {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [rows, setRows] = useState<Regra[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Regra>>(empty);
  const [toDelete, setToDelete] = useState<Regra | null>(null);

  useEffect(() => { (async () => {
    const id = await getEstabelecimentoId();
    setEstabId(id);
  })(); }, []);

  useEffect(() => { if (estabId) load(); }, [estabId]);

  async function load() {
    setLoading(true);
    const [{ data: regras }, { data: us }] = await Promise.all([
      supabase.from("visita_regras_monitoramento").select("*").order("created_at", { ascending: false }),
      supabase.from("usuarios").select("id, nome").order("nome"),
    ]);
    setRows((regras as Regra[]) || []);
    setUsuarios(us || []);
    setLoading(false);
  }

  function openNew() { setForm(empty); setOpen(true); }
  function openEdit(r: Regra) { setForm(r); setOpen(true); }

  async function save() {
    if (!form.nome?.trim()) { toast.error("Informe o nome da regra"); return; }
    const payload: any = { ...form, estabelecimento_id: estabId };
    const { error } = form.id
      ? await supabase.from("visita_regras_monitoramento").update(payload).eq("id", form.id)
      : await supabase.from("visita_regras_monitoramento").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra salva");
    setOpen(false); load();
  }

  async function remove() {
    if (!toDelete) return;
    const { error } = await supabase.from("visita_regras_monitoramento").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra excluída"); setToDelete(null); load();
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5" /> Regras de Monitoramento de Visita
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina como o sistema valida a presença do funcionário no cliente.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Regras cadastradas</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Raio</TableHead>
                  <TableHead>Tempo mín.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.nome}</TableCell>
                    <TableCell><Badge variant="outline">{r.escopo}</Badge></TableCell>
                    <TableCell>{r.fonte_localizacao}</TableCell>
                    <TableCell>{r.raio_metros} m</TableCell>
                    <TableCell>{r.tempo_minimo_min} min</TableCell>
                    <TableCell>{r.ativa ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma regra cadastrada</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{form.id ? "Editar Regra" : "Nova Regra"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome</Label>
              <Input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Escopo</Label>
                <Select value={form.escopo} onValueChange={v => setForm({ ...form, escopo: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global</SelectItem>
                    <SelectItem value="usuario">Por Usuário</SelectItem>
                    <SelectItem value="filial">Por Filial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Fonte de Localização</Label>
                <Select value={form.fonte_localizacao} onValueChange={v => setForm({ ...form, fonte_localizacao: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veiculo">Veículo vinculado</SelectItem>
                    <SelectItem value="celular">Celular do funcionário</SelectItem>
                    <SelectItem value="ambos">Qualquer uma</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.escopo === "usuario" && (
              <div>
                <Label>Usuário</Label>
                <Select value={form.usuario_id || ""} onValueChange={v => setForm({ ...form, usuario_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Raio (metros)</Label>
                <Input type="number" value={form.raio_metros ?? 150} onChange={e => setForm({ ...form, raio_metros: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Tempo mínimo (min)</Label>
                <Input type="number" value={form.tempo_minimo_min ?? 5} onChange={e => setForm({ ...form, tempo_minimo_min: Number(e.target.value) })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Exigir janela de horário</Label>
              <Switch checked={!!form.exigir_janela_horario} onCheckedChange={v => setForm({ ...form, exigir_janela_horario: v })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Ativa</Label>
              <Switch checked={form.ativa ?? true} onCheckedChange={v => setForm({ ...form, ativa: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!toDelete}
        onOpenChange={o => !o && setToDelete(null)}
        onConfirm={remove}
        itemName={toDelete?.nome}
      />
    </div>
  );
};

export default ConfigRegrasMonitoramentoVisita;
