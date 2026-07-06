import React, { useEffect, useState } from "react";
import { ClipboardList, Plus, Pencil, Trash2, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Badge } from "@/components/ui/badge";

type Campo = {
  id?: string;
  tipo: string;
  rotulo: string;
  chave: string;
  obrigatorio: boolean;
  ordem: number;
  opcoes?: string[] | null;
  placeholder?: string | null;
};

const TIPOS = [
  { v: "texto", l: "Texto curto" },
  { v: "textarea", l: "Texto longo" },
  { v: "numero", l: "Número" },
  { v: "booleano", l: "Sim / Não" },
  { v: "selecao", l: "Seleção única" },
  { v: "multi", l: "Seleção múltipla" },
  { v: "data", l: "Data" },
  { v: "hora", l: "Hora" },
  { v: "nota", l: "Nota (0-10)" },
  { v: "foto", l: "Foto" },
  { v: "assinatura", l: "Assinatura" },
  { v: "localizacao", l: "Localização (auto)" },
];

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const FormulariosVisita: React.FC = () => {
  const [estabId, setEstabId] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ nome: "", descricao: "", ativo: true });
  const [campos, setCampos] = useState<Campo[]>([]);
  const [toDelete, setToDelete] = useState<any>(null);

  useEffect(() => { (async () => setEstabId(await getEstabelecimentoId()))(); }, []);
  useEffect(() => { if (estabId) load(); }, [estabId]);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("visita_formularios").select("*").order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  async function openEdit(r?: any) {
    if (r) {
      setForm(r);
      const { data } = await supabase.from("visita_formulario_campos").select("*").eq("formulario_id", r.id).order("ordem");
      setCampos((data as any) || []);
    } else {
      setForm({ nome: "", descricao: "", ativo: true });
      setCampos([]);
    }
    setOpen(true);
  }

  function addCampo() {
    setCampos([...campos, { tipo: "texto", rotulo: "", chave: "", obrigatorio: false, ordem: campos.length }]);
  }

  function moveCampo(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= campos.length) return;
    const arr = [...campos];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setCampos(arr.map((c, i) => ({ ...c, ordem: i })));
  }

  async function save() {
    if (!form.nome?.trim()) { toast.error("Informe o nome"); return; }
    const payload = { ...form, estabelecimento_id: estabId };
    let formularioId = form.id;
    if (formularioId) {
      const { error } = await supabase.from("visita_formularios").update(payload).eq("id", formularioId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { data, error } = await supabase.from("visita_formularios").insert(payload).select().single();
      if (error) { toast.error(error.message); return; }
      formularioId = data.id;
    }
    // sync campos: apaga tudo e insere de novo (simples)
    await supabase.from("visita_formulario_campos").delete().eq("formulario_id", formularioId);
    const camposPayload = campos
      .filter(c => c.rotulo.trim())
      .map((c, i) => ({
        formulario_id: formularioId,
        tipo: c.tipo,
        rotulo: c.rotulo.trim(),
        chave: c.chave?.trim() || slug(c.rotulo),
        obrigatorio: !!c.obrigatorio,
        ordem: i,
        opcoes: (c.tipo === "selecao" || c.tipo === "multi") ? c.opcoes || [] : null,
        placeholder: c.placeholder || null,
      }));
    if (camposPayload.length) {
      const { error } = await supabase.from("visita_formulario_campos").insert(camposPayload);
      if (error) { toast.error(error.message); return; }
    }
    toast.success("Formulário salvo");
    setOpen(false); load();
  }

  async function remove() {
    if (!toDelete) return;
    const { error } = await supabase.from("visita_formularios").delete().eq("id", toDelete.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Excluído"); setToDelete(null); load();
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Formulários de Visita
          </h1>
          <p className="text-sm text-muted-foreground">
            Crie formulários preenchidos pelos vendedores ao encerrar cada visita.
          </p>
        </div>
        <Button onClick={() => openEdit()} className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" /> Novo Formulário</Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Formulários</CardTitle></CardHeader>
        <CardContent>
          {loading ? <div className="text-muted-foreground">Carregando...</div> : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden sm:table-cell">Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.nome}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground">{r.descricao || "—"}</TableCell>
                      <TableCell>{r.ativo ? <Badge>Ativo</Badge> : <Badge variant="secondary">Inativo</Badge>}</TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setToDelete(r)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Nenhum formulário</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader><DialogTitle>{form.id ? "Editar Formulário" : "Novo Formulário"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div><Label>Nome</Label><Input value={form.nome || ""} onChange={e => setForm({ ...form, nome: e.target.value })} /></div>
              <div className="flex items-center justify-between sm:pt-6">
                <Label>Ativo</Label>
                <Switch checked={form.ativo ?? true} onCheckedChange={v => setForm({ ...form, ativo: v })} />
              </div>
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea value={form.descricao || ""} onChange={e => setForm({ ...form, descricao: e.target.value })} rows={2} />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="font-medium">Campos</h3>
              <Button size="sm" variant="outline" onClick={addCampo}><Plus className="h-4 w-4 mr-1" /> Adicionar</Button>
            </div>

            <div className="space-y-2">
              {campos.map((c, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:items-end">
                      <div className="sm:col-span-6">
                        <Label>Rótulo</Label>
                        <Input value={c.rotulo} onChange={e => {
                          const arr = [...campos]; arr[i].rotulo = e.target.value; setCampos(arr);
                        }} />
                      </div>
                      <div className="sm:col-span-4">
                        <Label>Tipo</Label>
                        <Select value={c.tipo} onValueChange={v => { const arr = [...campos]; arr[i].tipo = v; setCampos(arr); }}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>{TIPOS.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-1 justify-between sm:justify-end flex-wrap">
                        <div className="flex items-center gap-1">
                          <Switch checked={c.obrigatorio} onCheckedChange={v => { const arr = [...campos]; arr[i].obrigatorio = v; setCampos(arr); }} />
                          <span className="text-xs">Obrig.</span>
                        </div>
                        <div className="flex items-center">
                          <Button size="icon" variant="ghost" onClick={() => moveCampo(i, -1)}><ArrowUp className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => moveCampo(i, 1)}><ArrowDown className="h-3 w-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setCampos(campos.filter((_, j) => j !== i))}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </div>
                    </div>
                    {(c.tipo === "selecao" || c.tipo === "multi") && (
                      <div>
                        <Label>Opções (uma por linha)</Label>
                        <Textarea rows={2} value={(c.opcoes || []).join("\n")} onChange={e => {
                          const arr = [...campos]; arr[i].opcoes = e.target.value.split("\n").map(s => s.trim()).filter(Boolean); setCampos(arr);
                        }} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {campos.length === 0 && <div className="text-sm text-muted-foreground text-center py-4">Nenhum campo. Clique em "Adicionar".</div>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog open={!!toDelete} onOpenChange={o => !o && setToDelete(null)} onConfirm={remove} itemName={toDelete?.nome} />
    </div>
  );
};

export default FormulariosVisita;
