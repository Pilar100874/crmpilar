import React, { useEffect, useState } from "react";
import { ListChecks, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";

const RegrasFormularioVisita: React.FC = () => {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [formularios, setFormularios] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [segmentos, setSegmentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ escopo: "global", obrigatorio_encerrar: false, prioridade: 0, ativa: true });
  const [toDelete, setToDelete] = useState<any>(null);

  useEffect(() => { (async () => setEstabId(await getEstabelecimentoId()))(); }, []);
  useEffect(() => { if (estabId) load(); }, [estabId]);

  async function load() {
    setLoading(true);
    const [{ data: r }, { data: f }, { data: u }, { data: s }] = await Promise.all([
      supabase.from("visita_formulario_regras").select("*").order("prioridade", { ascending: false }),
      supabase.from("visita_formularios").select("id, nome").eq("ativo", true).order("nome"),
      supabase.from("usuarios").select("id, nome").order("nome"),
      supabase.from("customer_segmentos").select("id, nome").order("nome"),
    ]);
    setRows(r || []);
    setFormularios(f || []);
    setUsuarios(u || []);
    setSegmentos(s || []);
    setLoading(false);
  }

  function openNew() { setForm({ escopo: "global", obrigatorio_encerrar: false, prioridade: 0, ativa: true }); setOpen(true); }
  function openEdit(r: any) { setForm(r); setOpen(true); }

  async function save() {
    if (!form.formulario_id) { toast.error("Selecione o formulário"); return; }
    const payload: any = { ...form, estabelecimento_id: estabId };
    if (payload.escopo !== "usuario") payload.usuario_id = null;
    if (payload.escopo !== "filial") payload.filial_id = null;
    if (payload.escopo !== "segmento") payload.segmento_id = null;
    const { error } = form.id
      ? await supabase.from("visita_formulario_regras").update(payload).eq("id", form.id)
      : await supabase.from("visita_formulario_regras").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("Regra salva"); setOpen(false); load();
  }

  async function remove() {
    if (!toDelete) return;
    const { error } = await supabase.from("visita_formulario_regras").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluída"); setToDelete(null); load();
  }

  const formMap = new Map(formularios.map(f => [f.id, f.nome]));
  const userMap = new Map(usuarios.map(u => [u.id, u.nome]));

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ListChecks className="h-5 w-5" /> Regras de Formulário de Visita
          </h1>
          <p className="text-sm text-muted-foreground">
            Defina qual formulário cada funcionário/filial/segmento deve preencher.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Nova Regra</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Regras</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Formulário</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Alvo</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{formMap.get(r.formulario_id) || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{r.escopo}</Badge></TableCell>
                    <TableCell>{r.escopo === "usuario" ? userMap.get(r.usuario_id) : (r.escopo === "global" ? "Todos" : "—")}</TableCell>
                    <TableCell>{r.obrigatorio_encerrar ? "Sim" : "Não"}</TableCell>
                    <TableCell>{r.prioridade}</TableCell>
                    <TableCell>{r.ativa ? <Badge>Ativa</Badge> : <Badge variant="secondary">Inativa</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nenhuma regra</TableCell></TableRow>
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
              <Label>Formulário</Label>
              <Select value={form.formulario_id || ""} onValueChange={v => setForm({ ...form, formulario_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{formularios.map(f => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Escopo</Label>
              <Select value={form.escopo} onValueChange={v => setForm({ ...form, escopo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="global">Global (todos)</SelectItem>
                  <SelectItem value="usuario">Por Usuário</SelectItem>
                  <SelectItem value="filial">Por Filial</SelectItem>
                  <SelectItem value="segmento">Por Segmento do Cliente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.escopo === "usuario" && (
              <div>
                <Label>Usuário</Label>
                <Select value={form.usuario_id || ""} onValueChange={v => setForm({ ...form, usuario_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{usuarios.map(u => <SelectItem key={u.id} value={u.id}>{u.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.escopo === "segmento" && (
              <div>
                <Label>Segmento</Label>
                <Select value={form.segmento_id || ""} onValueChange={v => setForm({ ...form, segmento_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{segmentos.map(s => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Prioridade</Label>
                <Input type="number" value={form.prioridade ?? 0} onChange={e => setForm({ ...form, prioridade: Number(e.target.value) })} />
              </div>
              <div className="flex items-center justify-between pt-6">
                <Label>Ativa</Label>
                <Switch checked={form.ativa ?? true} onCheckedChange={v => setForm({ ...form, ativa: v })} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Obrigatório para encerrar visita</Label>
              <Switch checked={!!form.obrigatorio_encerrar} onCheckedChange={v => setForm({ ...form, obrigatorio_encerrar: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)} onConfirm={remove} />
    </div>
  );
};

export default RegrasFormularioVisita;
