import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Plus, Pencil, Trash2, Users, UserPlus, X, Share2, Globe } from "lucide-react";
import { toast } from "sonner";
import { usePontoEmpresa } from "./usePontoEmpresa";

type Equipe = {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string | null;
  filial_id: string | null;
  departamento_id: string | null;
  lider_funcionario_id: string | null;
  empresa_id: string | null;
  global: boolean;
  ativo: boolean;
};

type Func = { id: string; nome: string };

const empty = { nome: "", descricao: "", cor: "#3b82f6", filial_id: "", departamento_id: "", lider_funcionario_id: "", ativo: true, compartilhado: true, global: false };

export default function PontoEquipes() {
  const { empresaId } = usePontoEmpresa();
  const [items, setItems] = useState<Equipe[]>([]);
  const [filiais, setFiliais] = useState<{ id: string; nome: string }[]>([]);
  const [departamentos, setDepartamentos] = useState<{ id: string; nome: string }[]>([]);
  const [funcionarios, setFuncionarios] = useState<Func[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipe | null>(null);
  const [form, setForm] = useState(empty);
  const [deleting, setDeleting] = useState<Equipe | null>(null);
  const [membrosOpen, setMembrosOpen] = useState<Equipe | null>(null);
  const [membros, setMembros] = useState<{ id: string; funcionario_id: string; nome: string }[]>([]);
  const [addingFunc, setAddingFunc] = useState("");

  const load = async () => {
    if (!empresaId) return;
    const { data } = await supabase
      .from("ponto_equipes").select("*").eq("empresa_id", empresaId).order("nome");
    setItems((data as any) || []);
    const [f, d, fu] = await Promise.all([
      supabase.from("ponto_filiais").select("id, nome").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ponto_departamentos").select("id, nome").eq("empresa_id", empresaId).order("nome"),
      supabase.from("ponto_funcionarios").select("id, nome").eq("empresa_id", empresaId).order("nome"),
    ]);
    setFiliais((f.data as any) || []);
    setDepartamentos((d.data as any) || []);
    setFuncionarios((fu.data as any) || []);
  };
  useEffect(() => { load(); }, [empresaId]);

  const openCreate = () => { setEditing(null); setForm(empty); setOpen(true); };
  const openEdit = (x: Equipe) => {
    setEditing(x);
    setForm({
      nome: x.nome,
      descricao: x.descricao ?? "",
      cor: x.cor ?? "#3b82f6",
      filial_id: x.filial_id ?? "",
      departamento_id: x.departamento_id ?? "",
      lider_funcionario_id: x.lider_funcionario_id ?? "",
      ativo: x.ativo,
      compartilhado: !x.filial_id,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!empresaId) return toast.error("Selecione uma empresa");
    if (!form.nome.trim()) return toast.error("Nome obrigatório");
    if (!form.compartilhado && !form.filial_id) return toast.error("Selecione uma filial ou ative o compartilhamento");
    const payload = {
      empresa_id: empresaId,
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      cor: form.cor || null,
      filial_id: form.compartilhado ? null : (form.filial_id || null),
      departamento_id: form.departamento_id || null,
      lider_funcionario_id: form.lider_funcionario_id || null,
      ativo: form.ativo,
    };
    const { error } = editing
      ? await supabase.from("ponto_equipes").update(payload).eq("id", editing.id)
      : await supabase.from("ponto_equipes").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    setOpen(false);
    load();
  };

  const remove = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("ponto_equipes").delete().eq("id", deleting.id);
    if (error) return toast.error(error.message);
    toast.success("Excluído");
    setDeleting(null);
    load();
  };

  const loadMembros = async (eq: Equipe) => {
    const { data } = await supabase
      .from("ponto_equipe_membros")
      .select("id, funcionario_id, ponto_funcionarios(nome)")
      .eq("equipe_id", eq.id);
    setMembros(((data as any[]) || []).map((m) => ({
      id: m.id,
      funcionario_id: m.funcionario_id,
      nome: m.ponto_funcionarios?.nome ?? "—",
    })));
  };
  const openMembros = async (eq: Equipe) => { setMembrosOpen(eq); setAddingFunc(""); await loadMembros(eq); };
  const addMembro = async () => {
    if (!membrosOpen || !addingFunc) return;
    const { error } = await supabase.from("ponto_equipe_membros").insert({ equipe_id: membrosOpen.id, funcionario_id: addingFunc });
    if (error) return toast.error(error.message);
    setAddingFunc("");
    loadMembros(membrosOpen);
  };
  const removeMembro = async (id: string) => {
    await supabase.from("ponto_equipe_membros").delete().eq("id", id);
    if (membrosOpen) loadMembros(membrosOpen);
  };

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold sm:text-2xl">Equipes</h2>
          <p className="text-sm text-muted-foreground">Agrupe funcionários em equipes para escalas, mapas e relatórios.</p>
        </div>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Nova equipe</Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <Users className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nenhuma equipe cadastrada.</p>
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((x) => (
            <Card key={x.id} className="transition-all hover:border-primary">
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-block h-3 w-3 shrink-0 rounded-full" style={{ background: x.cor ?? "#3b82f6" }} />
                    <h3 className="truncate font-semibold">{x.nome}</h3>
                  </div>
                  <Badge variant={x.ativo ? "default" : "secondary"}>{x.ativo ? "Ativo" : "Inativo"}</Badge>
                </div>
                {x.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{x.descricao}</p>}
                {x.filial_id
                  ? <p className="text-xs text-muted-foreground truncate">{filiais.find(f => f.id === x.filial_id)?.nome ?? "—"}</p>
                  : <p className="text-xs text-primary flex items-center gap-1"><Share2 className="h-3 w-3" />Compartilhada</p>}
                {x.lider_funcionario_id && (
                  <p className="text-xs text-muted-foreground">
                    Líder: {funcionarios.find(f => f.id === x.lider_funcionario_id)?.nome ?? "—"}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openMembros(x)}><UserPlus className="mr-1 h-3.5 w-3.5" />Membros</Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(x)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="outline" onClick={() => setDeleting(x)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Editar" : "Nova"} equipe</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_80px] gap-3">
              <div><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
              <div><Label>Cor</Label><Input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })} /></div>
            </div>
            <div><Label>Descrição</Label><Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Filial</Label>
                <Select
                  value={form.filial_id || "_none"}
                  onValueChange={(v) => setForm({ ...form, filial_id: v === "_none" ? "" : v })}
                  disabled={form.compartilhado}
                >
                  <SelectTrigger><SelectValue placeholder={form.compartilhado ? "Todas as filiais" : "Selecione..."} /></SelectTrigger>
                  <SelectContent>
                    {filiais.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Departamento</Label>
                <Select value={form.departamento_id || "_none"} onValueChange={(v) => setForm({ ...form, departamento_id: v === "_none" ? "" : v })}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">—</SelectItem>
                    {departamentos.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2"><Share2 className="h-4 w-4" />Compartilhar entre matriz e filiais</Label>
                <p className="text-xs text-muted-foreground">
                  {form.compartilhado ? "Disponível para todas as filiais." : "Restrita à filial selecionada."}
                </p>
              </div>
              <Switch
                checked={form.compartilhado}
                onCheckedChange={(v) => setForm({ ...form, compartilhado: v, filial_id: v ? "" : form.filial_id })}
              />
            </div>
            <div>
              <Label>Líder</Label>
              <Select value={form.lider_funcionario_id || "_none"} onValueChange={(v) => setForm({ ...form, lider_funcionario_id: v === "_none" ? "" : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">—</SelectItem>
                  {funcionarios.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input id="ativo" type="checkbox" checked={form.ativo} onChange={(e) => setForm({ ...form, ativo: e.target.checked })} />
              <Label htmlFor="ativo">Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!membrosOpen} onOpenChange={(v) => !v && setMembrosOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Membros — {membrosOpen?.nome}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select value={addingFunc} onValueChange={setAddingFunc}>
                <SelectTrigger><SelectValue placeholder="Selecione funcionário" /></SelectTrigger>
                <SelectContent>
                  {funcionarios
                    .filter((f) => !membros.some((m) => m.funcionario_id === f.id))
                    .map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={addMembro} disabled={!addingFunc}>Adicionar</Button>
            </div>
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {membros.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Nenhum membro ainda.</p>
              ) : (
                membros.map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded border p-2 text-sm">
                    <span className="truncate">{m.nome}</span>
                    <Button size="icon" variant="ghost" onClick={() => removeMembro(m.id)}><X className="h-4 w-4" /></Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        onConfirm={remove}
        itemName={deleting?.nome ?? ""}
        title="Excluir equipe"
      />
    </div>
  );
}
