import { useEffect, useState, useCallback } from "react";
import { Plus, Search, Loader2, Pencil, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { maskTelefone, usePortariaPerfil } from "@/lib/portaria/api";

type Visitante = {
  id: string;
  nome: string;
  telefone: string | null;
  documento: string | null;
  visitado_person_id: string | null;
  unidade: string | null;
  inicio: string | null;
  fim: string | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  access_point_id: string | null;
  tipo_autorizacao: string | null;
  status: string | null;
  observacoes: string | null;
};

const VAZIO: Partial<Visitante> = {
  nome: "", telefone: "", documento: "", unidade: "", tipo_autorizacao: "unico", status: "ativo",
};

export default function PortariaVisitantes() {
  const { toast } = useToast();
  const { isStaff } = usePortariaPerfil();
  const [visitantes, setVisitantes] = useState<Visitante[]>([]);
  const [pessoas, setPessoas] = useState<{ id: string; nome: string; unidade: string | null }[]>([]);
  const [acessos, setAcessos] = useState<{ id: string; nome: string }[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState<Partial<Visitante>>(VAZIO);
  const [excluir, setExcluir] = useState<Visitante | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    const [{ data: v }, { data: p }, { data: a }] = await Promise.all([
      supabase.from("port_visitors").select("*").order("created_at", { ascending: false }),
      supabase.from("port_people").select("id, nome, unidade").eq("ativo", true).order("nome"),
      supabase.from("port_access_points").select("id, nome").eq("ativo", true).order("ordem"),
    ]);
    setVisitantes((v ?? []) as Visitante[]);
    setPessoas(p ?? []);
    setAcessos(a ?? []);
    setCarregando(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const salvar = async () => {
    if (!form.nome?.trim()) { toast({ title: "Informe o nome do visitante.", variant: "destructive" }); return; }
    setSalvando(true);
    const payload = {
      nome: form.nome.trim().toUpperCase(),
      telefone: form.telefone || null,
      documento: form.documento?.toUpperCase() || null,
      visitado_person_id: form.visitado_person_id || null,
      unidade: form.unidade?.toUpperCase() || null,
      inicio: form.inicio ? new Date(form.inicio).toISOString() : null,
      fim: form.fim ? new Date(form.fim).toISOString() : null,
      hora_inicio: form.hora_inicio || null,
      hora_fim: form.hora_fim || null,
      access_point_id: form.access_point_id || null,
      tipo_autorizacao: form.tipo_autorizacao || "unico",
      status: form.status || "ativo",
      observacoes: form.observacoes || null,
    };
    const { error } = form.id
      ? await supabase.from("port_visitors").update(payload).eq("id", form.id)
      : await supabase.from("port_visitors").insert(payload);
    setSalvando(false);
    if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
    setAberto(false);
    toast({ title: "Visitante salvo com sucesso." });
    carregar();
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("port_visitors").delete().eq("id", excluir.id);
    toast({
      title: error ? "Não foi possível excluir" : "Visitante excluído",
      description: error?.message,
      variant: error ? "destructive" : undefined,
    });
    setExcluir(null);
    carregar();
  };

  const filtrados = visitantes.filter((v) => {
    const texto = `${v.nome} ${v.documento ?? ""} ${v.unidade ?? ""}`.toLowerCase();
    if (busca && !texto.includes(busca.toLowerCase())) return false;
    if (filtro !== "todos" && v.status !== filtro) return false;
    return true;
  });

  const dtLocal = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h2 className="text-xl font-bold">Visitantes</h2>
          <p className="text-sm text-muted-foreground">Autorizações únicas, temporárias e recorrentes.</p>
        </div>
        {isStaff && <Button onClick={() => { setForm(VAZIO); setAberto(true); }}><Plus className="h-4 w-4 mr-2" />Novo visitante</Button>}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome, documento ou unidade" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent className="bg-popover">
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="expirado">Expirados</SelectItem>
            <SelectItem value="cancelado">Cancelados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carregando ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtrados.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum visitante encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtrados.map((v) => {
            const visitado = pessoas.find((p) => p.id === v.visitado_person_id);
            return (
              <div key={v.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate flex items-center gap-2"><UserCheck className="h-4 w-4 text-primary" />{v.nome}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[visitado?.nome, v.unidade, v.telefone].filter(Boolean).join(" · ") || "Sem dados adicionais"}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      <Badge variant={v.status === "ativo" ? "default" : "secondary"}>{v.status}</Badge>
                      <Badge variant="outline" className="text-[10px] capitalize">{v.tipo_autorizacao}</Badge>
                      {v.fim && <span className="text-[11px] text-muted-foreground">até {new Date(v.fim).toLocaleString("pt-BR")}</span>}
                    </div>
                  </div>
                  {isStaff && (
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" onClick={() => { setForm(v); setAberto(true); }}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setExcluir(v)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? "Editar visitante" : "Novo visitante"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label>Nome *</Label><Input value={form.nome ?? ""} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></div>
            <div><Label>Telefone</Label><Input value={form.telefone ?? ""} onChange={(e) => setForm({ ...form, telefone: maskTelefone(e.target.value) })} /></div>
            <div><Label>Documento</Label><Input value={form.documento ?? ""} onChange={(e) => setForm({ ...form, documento: e.target.value })} /></div>
            <div>
              <Label>Pessoa visitada</Label>
              <Select value={form.visitado_person_id ?? ""} onValueChange={(v) => {
                const p = pessoas.find((x) => x.id === v);
                setForm({ ...form, visitado_person_id: v, unidade: form.unidade || p?.unidade || "" });
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {pessoas.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Unidade</Label><Input value={form.unidade ?? ""} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
            <div><Label>Início</Label><Input type="datetime-local" value={dtLocal(form.inicio ?? null)} onChange={(e) => setForm({ ...form, inicio: e.target.value })} /></div>
            <div><Label>Término</Label><Input type="datetime-local" value={dtLocal(form.fim ?? null)} onChange={(e) => setForm({ ...form, fim: e.target.value })} /></div>
            <div><Label>Horário permitido (início)</Label><Input type="time" value={form.hora_inicio?.slice(0, 5) ?? ""} onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })} /></div>
            <div><Label>Horário permitido (fim)</Label><Input type="time" value={form.hora_fim?.slice(0, 5) ?? ""} onChange={(e) => setForm({ ...form, hora_fim: e.target.value })} /></div>
            <div>
              <Label>Porta/portão autorizado</Label>
              <Select value={form.access_point_id ?? ""} onValueChange={(v) => setForm({ ...form, access_point_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {acessos.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo de autorização</Label>
              <Select value={form.tipo_autorizacao ?? "unico"} onValueChange={(v) => setForm({ ...form, tipo_autorizacao: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="unico">Acesso único</SelectItem>
                  <SelectItem value="temporario">Temporário</SelectItem>
                  <SelectItem value="recorrente">Recorrente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "ativo"} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes ?? ""} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)}>Cancelar</Button>
            <Button onClick={salvar} disabled={salvando}>{salvando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!excluir}
        onOpenChange={(o) => !o && setExcluir(null)}
        onConfirm={confirmarExclusao}
        itemName={excluir?.nome}
      />
    </div>
  );
}
