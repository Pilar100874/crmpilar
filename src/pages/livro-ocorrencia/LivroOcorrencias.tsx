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
import { Plus, Pencil, Trash2, Search, ShieldAlert, Camera, X, CheckCircle2 } from "lucide-react";
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
  resolvido_por?: string | null;
  resolvido_em?: string | null;
  observacao_resolucao?: string | null;
}


const TIPOS = ["Segurança", "Funcionário", "Acesso Indevido", "Furto/Roubo", "Briga/Agressão", "Acidente", "Falha Técnica", "Emergência Médica", "Incêndio", "Manutenção", "Outros"];
const SIM_NAO = [{ v: "sim", label: "Sim" }, { v: "nao", label: "Não" }];
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
  const [finalizando, setFinalizando] = useState<Ocorrencia | null>(null);
  const [finalForm, setFinalForm] = useState({ resolvido_por: "", resolvido_em: "", observacao_resolucao: "" });
  const [params, setParams] = useSearchParams();
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fotoInputRef = useRef<HTMLInputElement>(null);

  const openFinalizar = (o: Ocorrencia) => {
    setFinalizando(o);
    setFinalForm({
      resolvido_por: o.resolvido_por || "",
      resolvido_em: o.resolvido_em ? new Date(o.resolvido_em).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      observacao_resolucao: o.observacao_resolucao || "",
    });
  };

  const finalizar = async () => {
    if (!finalizando) return;
    if (!finalForm.resolvido_por.trim()) { toast.error("Informe quem resolveu"); return; }
    if (!finalForm.resolvido_em) { toast.error("Informe a data de resolução"); return; }
    const { error } = await supabase.from("livro_ocorrencias" as any).update({
      status: "resolvida",
      resolvido_por: finalForm.resolvido_por.toUpperCase(),
      resolvido_em: new Date(finalForm.resolvido_em).toISOString(),
      observacao_resolucao: finalForm.observacao_resolucao || null,
    } as any).eq("id", finalizando.id);
    if (error) { toast.error("Erro ao finalizar"); return; }
    toast.success("Ocorrência finalizada");
    setFinalizando(null);
    load();
  };

  const reabrir = async (o: Ocorrencia) => {
    const { error } = await supabase.from("livro_ocorrencias" as any).update({ status: "aberta" } as any).eq("id", o.id);
    if (error) toast.error("Erro ao reabrir");
    else { toast.success("Ocorrência reaberta"); load(); }
  };

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
    if (editing.tipo === "Funcionário") {
      const f = (editing as any).anexos?.funcionario || {};
      if (!f.dp_ciente || !f.encarregado_ciente) {
        toast.error("Informe se o DP e o encarregado estavam sabendo");
        return;
      }
    }
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
                  {o.status !== "resolvida" ? (
                    <Button variant="ghost" size="icon" title="Finalizar ocorrência" onClick={() => openFinalizar(o)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                  ) : (
                    <Button variant="ghost" size="icon" title="Reabrir ocorrência" onClick={() => reabrir(o)}><X className="h-4 w-4 text-orange-500" /></Button>
                  )}
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
                {o.status !== "resolvida" ? (
                  <Button variant="ghost" size="icon" title="Finalizar ocorrência" onClick={() => openFinalizar(o)}><CheckCircle2 className="h-4 w-4 text-green-600" /></Button>
                ) : (
                  <Button variant="ghost" size="icon" title="Reabrir ocorrência" onClick={() => reabrir(o)}><X className="h-4 w-4 text-orange-500" /></Button>
                )}
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
            {o.status === "resolvida" && o.resolvido_por && (
              <div className="text-xs text-muted-foreground border-t pt-2">
                <span className="font-medium text-green-600">Resolvida por {o.resolvido_por}</span>
                {o.resolvido_em && <> em {new Date(o.resolvido_em).toLocaleString("pt-BR")}</>}
                {o.observacao_resolucao && <div className="mt-0.5">{o.observacao_resolucao}</div>}
              </div>
            )}
          </div>
        ))}
      </div>


      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? `Editar Ocorrência #${(editing as any).numero}` : "Nova Ocorrência"}</DialogTitle>
          </DialogHeader>
          {editing && (() => {
            const isFunc = editing.tipo === "Funcionário";
            return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Data e Hora *</Label>
                <Input type="datetime-local" value={editing.data_hora as string} onChange={(e) => setEditing({ ...editing, data_hora: e.target.value })} />
              </div>
              {!isFunc && (
                <div>
                  <Label>Turno</Label>
                  <Select value={editing.turno || ""} onValueChange={(v) => setEditing({ ...editing, turno: v })}>
                    <SelectTrigger><SelectValue placeholder="Turno" /></SelectTrigger>
                    <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <div>
                <Label>Tipo *</Label>
                <Select value={editing.tipo || ""} onValueChange={(v) => setEditing({ ...editing, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!isFunc && (
                <div>
                  <Label>Gravidade *</Label>
                  <Select value={editing.gravidade || "baixa"} onValueChange={(v) => setEditing({ ...editing, gravidade: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GRAVIDADES.map((g) => <SelectItem key={g.v} value={g.v}>{g.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {editing.tipo === "Funcionário" && (
                <>
                  <div className="sm:col-span-2">
                    <Label>Funcionário envolvido</Label>
                    <Input
                      value={(editing as any).anexos?.funcionario?.nome || ""}
                      onChange={(e) => setEditing({ ...editing, anexos: { ...((editing as any).anexos || {}), funcionario: { ...((editing as any).anexos?.funcionario || {}), nome: e.target.value.toUpperCase() } } })}
                      placeholder="Nome do funcionário"
                    />
                  </div>
                  <div>
                    <Label>O DP está sabendo? *</Label>
                    <Select
                      value={(editing as any).anexos?.funcionario?.dp_ciente || ""}
                      onValueChange={(v) => setEditing({ ...editing, anexos: { ...((editing as any).anexos || {}), funcionario: { ...((editing as any).anexos?.funcionario || {}), dp_ciente: v } } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SIM_NAO.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>O encarregado estava sabendo? *</Label>
                    <Select
                      value={(editing as any).anexos?.funcionario?.encarregado_ciente || ""}
                      onValueChange={(v) => setEditing({ ...editing, anexos: { ...((editing as any).anexos || {}), funcionario: { ...((editing as any).anexos?.funcionario || {}), encarregado_ciente: v } } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{SIM_NAO.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {!isFunc && (
                <div className="sm:col-span-2">
                  <Label>Local</Label>
                  <Input value={editing.local || ""} onChange={(e) => setEditing({ ...editing, local: e.target.value })} placeholder="Ex: Portaria principal, garagem, bloco A..." />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>{isFunc ? "Motivo *" : "Descrição *"}</Label>
                <Textarea rows={4} value={editing.descricao || ""} onChange={(e) => setEditing({ ...editing, descricao: e.target.value })} placeholder={isFunc ? "Descreva o motivo da ocorrência com o funcionário..." : "Relate a ocorrência em detalhes..."} />
              </div>
              {!isFunc && (
                <div className="sm:col-span-2">
                  <Label>Envolvidos</Label>
                  <Textarea rows={2} value={editing.envolvidos || ""} onChange={(e) => setEditing({ ...editing, envolvidos: e.target.value })} placeholder="Nomes, cargos, veículos, etc." />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label>Ação Tomada</Label>
                <Textarea rows={2} value={editing.acao_tomada || ""} onChange={(e) => setEditing({ ...editing, acao_tomada: e.target.value })} placeholder="Descreva a ação/procedimento realizado" />
              </div>
              <div>
                <Label>Responsável (Porteiro)</Label>
                <Input value={editing.responsavel || ""} onChange={(e) => setEditing({ ...editing, responsavel: e.target.value })} />
              </div>
              {editing.status === "resolvida" && (
                <div className="sm:col-span-2 border rounded-lg p-3 bg-green-500/5 space-y-1 text-sm">
                  <div className="font-medium text-green-600 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ocorrência resolvida</div>
                  <div className="text-muted-foreground">Por: {editing.resolvido_por || "-"} · Em: {editing.resolvido_em ? new Date(editing.resolvido_em).toLocaleString("pt-BR") : "-"}</div>
                  {editing.observacao_resolucao && <div className="text-muted-foreground">{editing.observacao_resolucao}</div>}
                </div>
              )}
              {!isFunc && (
                <div className="sm:col-span-2">
                  <Label>Foto (opcional)</Label>
                  <input
                    ref={fotoInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFoto(f); }}
                  />
                  {editing.anexos?.foto_url ? (
                    <div className="relative inline-block mt-1">
                      <img src={editing.anexos.foto_url} alt="Foto da ocorrência" className="max-h-48 rounded border" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute -top-2 -right-2 h-6 w-6"
                        onClick={() => setEditing({ ...editing, anexos: { ...(editing.anexos || {}), foto_url: null } })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => fotoInputRef.current?.click()} disabled={uploadingFoto} className="gap-2">
                      <Camera className="h-4 w-4" /> {uploadingFoto ? "Enviando..." : "Tirar / Anexar foto"}
                    </Button>
                  )}
                </div>
              )}
              {!isFunc && (
                <div className="sm:col-span-2">
                  <Label>Observações</Label>
                  <Textarea rows={2} value={editing.observacoes || ""} onChange={(e) => setEditing({ ...editing, observacoes: e.target.value })} />
                </div>
              )}

            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Finalização */}
      <Dialog open={!!finalizando} onOpenChange={(v) => !v && setFinalizando(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Finalizar Ocorrência #{finalizando?.numero}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Quem resolveu? *</Label>
              <Input
                value={finalForm.resolvido_por}
                onChange={(e) => setFinalForm({ ...finalForm, resolvido_por: e.target.value.toUpperCase() })}
                placeholder="NOME DE QUEM RESOLVEU"
              />
            </div>
            <div>
              <Label>Data da resolução *</Label>
              <Input
                type="datetime-local"
                value={finalForm.resolvido_em}
                onChange={(e) => setFinalForm({ ...finalForm, resolvido_em: e.target.value })}
              />
            </div>
            <div>
              <Label>Observação da resolução</Label>
              <Textarea
                rows={3}
                value={finalForm.observacao_resolucao}
                onChange={(e) => setFinalForm({ ...finalForm, observacao_resolucao: e.target.value })}
                placeholder="Descreva como foi resolvido..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFinalizando(null)}>Cancelar</Button>
            <Button onClick={finalizar} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="h-4 w-4" /> Finalizar
            </Button>
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
