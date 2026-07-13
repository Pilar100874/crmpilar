import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Plus, Pencil, Trash2, Search, ShieldAlert, Camera, X } from "lucide-react";
import { useRef } from "react";


interface Ocorrencia {
  id: string;
  numero: number;
  data_hora: string;
  turno: string | null;
  tipo: string;
  gravidade: string;
  local: string | null;
  descricao: string;
  envolvidos: string | null;
  acao_tomada: string | null;
  responsavel: string | null;
  status: string;
  observacoes: string | null;
  anexos?: any;
}


const TIPOS = ["Segurança", "Acesso Indevido", "Furto/Roubo", "Briga/Agressão", "Acidente", "Falha Técnica", "Emergência Médica", "Incêndio", "Manutenção", "Outros"];
const GRAVIDADES = [
  { v: "baixa", label: "Baixa", cls: "bg-green-500/10 text-green-600 border-green-500/30" },
  { v: "media", label: "Média", cls: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30" },
  { v: "alta", label: "Alta", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { v: "critica", label: "Crítica", cls: "bg-red-500/10 text-red-600 border-red-500/30" },
];
const STATUSES = [
  { v: "aberta", label: "Aberta", cls: "bg-orange-500/10 text-orange-600 border-orange-500/30" },
  { v: "em_andamento", label: "Em Andamento", cls: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  { v: "resolvida", label: "Resolvida", cls: "bg-green-500/10 text-green-600 border-green-500/30" },
  { v: "arquivada", label: "Arquivada", cls: "bg-muted text-muted-foreground border-border" },
];
const TURNOS = ["Manhã", "Tarde", "Noite", "Madrugada"];

const empty: Partial<Ocorrencia> = {
  data_hora: new Date().toISOString().slice(0, 16),
  turno: "Manhã",
  tipo: "Segurança",
  gravidade: "baixa",
  status: "aberta",
  descricao: "",
};

export default function LivroOcorrencias() {
  const [items, setItems] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todas");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Ocorrencia> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const uploadFoto = async (file: File) => {
    setUploadingFoto(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `ocorrencias/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage.from("chat-attachments").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from("chat-attachments").getPublicUrl(data.path);
      setEditing((prev: any) => ({ ...prev, anexos: { ...(prev?.anexos || {}), foto_url: publicUrl } }));
      toast.success("Foto anexada");
    } catch (e: any) {
      toast.error(e?.message || "Erro ao enviar foto");
    } finally {
      setUploadingFoto(false);
      if (fotoInputRef.current) fotoInputRef.current.value = "";
    }
  };


  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("livro_ocorrencias" as any).select("*").order("data_hora", { ascending: false });
    if (error) toast.error("Erro ao carregar ocorrências");
    else setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (params.get("new") === "1") { openNew(); params.delete("new"); setParams(params, { replace: true }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const openNew = () => { setEditing({ ...empty }); setDialogOpen(true); };
  const openEdit = (o: Ocorrencia) => {
    setEditing({ ...o, data_hora: new Date(o.data_hora).toISOString().slice(0, 16) });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!editing?.descricao || !editing?.tipo) { toast.error("Preencha tipo e descrição"); return; }
    const payload: any = {
      ...editing,
      data_hora: editing.data_hora ? new Date(editing.data_hora as string).toISOString() : new Date().toISOString(),
    };
    delete payload.numero;
    const { error } = editing.id
      ? await supabase.from("livro_ocorrencias" as any).update(payload).eq("id", editing.id)
      : await supabase.from("livro_ocorrencias" as any).insert(payload);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Ocorrência salva");
    setDialogOpen(false);
    load();
  };

  const remove = async () => {
    if (!deletingId) return;
    const { error } = await supabase.from("livro_ocorrencias" as any).delete().eq("id", deletingId);
    if (error) toast.error("Erro ao excluir");
    else { toast.success("Excluída"); load(); }
    setDeletingId(null);
  };

  const filtered = items.filter((o) => {
    if (statusFilter !== "todas" && o.status !== statusFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return [o.descricao, o.tipo, o.local, o.responsavel, o.envolvidos, String(o.numero)]
      .some((f) => (f || "").toLowerCase().includes(s));
  });

  const gravBadge = (v: string) => {
    const g = GRAVIDADES.find((x) => x.v === v) || GRAVIDADES[0];
    return <Badge variant="outline" className={g.cls}>{g.label}</Badge>;
  };
  const statusBadge = (v: string) => {
    const s = STATUSES.find((x) => x.v === v) || STATUSES[0];
    return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Ocorrências da Portaria</h2>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" /> Nova Ocorrência</Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por número, tipo, descrição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todos status</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Tabela (md+) */}
      <div className="hidden md:block border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nº</TableHead>
              <TableHead>Data/Hora</TableHead>
              <TableHead className="hidden lg:table-cell">Turno</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="hidden xl:table-cell">Local</TableHead>
              <TableHead>Gravidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden lg:table-cell">Responsável</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
            ) : filtered.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhuma ocorrência encontrada</TableCell></TableRow>
            ) : filtered.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="font-mono">#{o.numero}</TableCell>
                <TableCell className="whitespace-nowrap">{new Date(o.data_hora).toLocaleString("pt-BR")}</TableCell>
                <TableCell className="hidden lg:table-cell">{o.turno || "-"}</TableCell>
                <TableCell>{o.tipo}</TableCell>
                <TableCell className="hidden xl:table-cell">{o.local || "-"}</TableCell>
                <TableCell>{gravBadge(o.gravidade)}</TableCell>
                <TableCell>{statusBadge(o.status)}</TableCell>
                <TableCell className="hidden lg:table-cell">{o.responsavel || "-"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeletingId(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">Nenhuma ocorrência encontrada</div>
        ) : filtered.map((o) => (
          <div key={o.id} className="border rounded-lg p-3 bg-card space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm text-muted-foreground">#{o.numero}</span>
                  {gravBadge(o.gravidade)}
                  {statusBadge(o.status)}
                </div>
                <div className="mt-1 font-medium truncate">{o.tipo}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.data_hora).toLocaleString("pt-BR")} · {o.turno || "-"}</div>
              </div>
              <div className="flex shrink-0">
                <Button variant="ghost" size="icon" onClick={() => openEdit(o)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => setDeletingId(o.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
            {(o.local || o.responsavel) && (
              <div className="text-xs text-muted-foreground grid grid-cols-1 gap-0.5">
                {o.local && <div><span className="font-medium text-foreground/70">Local:</span> {o.local}</div>}
                {o.responsavel && <div><span className="font-medium text-foreground/70">Responsável:</span> {o.responsavel}</div>}
              </div>
            )}
            <p className="text-sm line-clamp-2">{o.descricao}</p>
          </div>
        ))}
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Editar Ocorrência #${(editing as any).numero}` : "Nova Ocorrência"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={editing.data_hora as string} onChange={(e) => setEditing({ ...editing, data_hora: e.target.value })} />
              </div>
              <div>
                <Label>Turno</Label>
                <Select value={editing.turno || ""} onValueChange={(v) => setEditing({ ...editing, turno: v })}>
                  <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                  <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo *</Label>
                <Select value={editing.tipo || ""} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Gravidade *</Label>
                <Select value={editing.gravidade || "baixa"} onValueChange={(v) => setEditing({ ...editing, gravidade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{GRAVIDADES.map((g) => <SelectItem key={g.v} value={g.v}>{g.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Local</Label>
                <Input value={editing.local || ""} onChange={(e) => setEditing({ ...editing, local: e.target.value })} placeholder="Ex: Portaria principal, garagem, bloco A..." />
              </div>
              <div className="sm:col-span-2">
                <Label>Descrição *</Label>
                <Textarea rows={4} value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} placeholder="Relate a ocorrência em detalhes..." />
              </div>
              <div className="sm:col-span-2">
                <Label>Envolvidos</Label>
                <Textarea rows={2} value={editing.envolvidos || ""} onChange={(e) => setEditing({ ...editing, envolvidos: e.target.value })} placeholder="Nomes, cargos, veículos, etc." />
              </div>
              <div className="sm:col-span-2">
                <Label>Ação Tomada</Label>
                <Textarea rows={2} value={editing.acao_tomada || ""} onChange={(e) => setEditing({ ...editing, acao_tomada: e.target.value })} placeholder="Descreva a ação/procedimento realizado" />
              </div>
              <div>
                <Label>Responsável (Porteiro)</Label>
                <Input value={editing.responsavel || ""} onChange={(e) => setEditing({ ...editing, responsavel: e.target.value })} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status || "aberta"} onValueChange={(v) => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Observações</Label>
                <Textarea rows={2} value={editing.observacoes || ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={!!deletingId}
        onOpenChange={(o) => !o && setDeletingId(null)}
        onConfirm={remove}
        itemName="esta ocorrência"
      />
    </div>
  );
}
