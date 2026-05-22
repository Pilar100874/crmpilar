import { useEffect, useRef, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Send, Lock, RotateCcw, LifeBuoy, Plus, Trash2, X, Paperclip, Video, Square } from "lucide-react";

import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";

type Anexo = { name: string; url: string; size: number; type: string };

export default function MeusTickets() {
  
  const [tickets, setTickets] = useState<any[]>([]);
  const [msgs, setMsgs] = useState<Record<string, any[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"abertos" | "todos">("abertos");
  
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);


  const load = async () => {
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) return;
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", authId).maybeSingle();
      if (!u) return;
      try { await (supabase.rpc as any)("auto_close_support_tickets"); } catch {}
      const { data } = await supabase
        .from("support_tickets").select("*")
        .eq("usuario_id", u.id).order("created_at", { ascending: false });
      const list = (data as any) || [];
      setTickets(list);
      list.forEach((t: any) => loadMsgs(t.id));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onCreated = () => load();
    window.addEventListener("support-ticket-created", onCreated);
    return () => window.removeEventListener("support-ticket-created", onCreated);
  }, []);

  const loadMsgs = async (ticketId: string) => {
    const { data } = await supabase.from("support_ticket_mensagens")
      .select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    setMsgs((p) => ({ ...p, [ticketId]: (data as any) || [] }));
  };

  const sendReply = async (ticketId: string) => {
    const text = (reply[ticketId] || "").trim();
    if (!text) return;
    const { data: userRes } = await supabase.auth.getUser();
    const authId = userRes.user?.id;
    if (!authId) return;
    const { data: u } = await supabase.from("usuarios").select("id,nome").eq("auth_user_id", authId).maybeSingle();
    if (!u) return;
    const { error } = await supabase.from("support_ticket_mensagens").insert({
      ticket_id: ticketId, autor_tipo: "user", autor_usuario_id: u.id, autor_nome: u.nome, mensagem: text,
    });
    if (error) return toast.error(error.message);
    setReply((p) => ({ ...p, [ticketId]: "" }));
    await loadMsgs(ticketId);
    await load();
  };

  const closeTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets")
      .update({ status: "fechado", closed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ticket encerrado"); load();
  };

  const deleteTicket = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await supabase.from("support_ticket_mensagens").delete().eq("ticket_id", deleteId);
      const { error } = await supabase.from("support_tickets").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Ticket excluído");
      setDeleteId(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao excluir");
    } finally {
      setDeleting(false);
    }
  };

  const filtered = tickets.filter((t) => {
    if (statusFilter === "abertos" && t.status === "fechado") return false;
    const ts = new Date(t.created_at).getTime();
    if (dateFrom && ts < new Date(dateFrom + "T00:00:00").getTime()) return false;
    if (dateTo && ts > new Date(dateTo + "T23:59:59").getTime()) return false;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <LifeBuoy className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Meus tickets</h1>
        </div>
        <Button onClick={() => window.dispatchEvent(new CustomEvent("open-support-ticket", { detail: { step: "choose" } }))}>
          <Plus className="h-4 w-4 mr-2" /> Novo ticket
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Button size="sm" variant={statusFilter === "abertos" ? "default" : "outline"} onClick={() => setStatusFilter("abertos")}>
          Em aberto
        </Button>
        <Button size="sm" variant={statusFilter === "todos" ? "default" : "outline"} onClick={() => setStatusFilter("todos")}>
          Todos
        </Button>
        <div className="flex items-center gap-1 ml-2">
          <Label className="text-xs text-muted-foreground">De:</Label>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-[150px] text-xs" />
          <Label className="text-xs text-muted-foreground ml-1">Até:</Label>
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-8 w-[150px] text-xs" />
          {(dateFrom || dateTo) && (
            <Button size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setDateFrom(""); setDateTo(""); }}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} ticket(s)</span>
      </div>

      {loading && <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin" /></div>}
      {!loading && filtered.length === 0 && (
        <div className="text-center text-muted-foreground py-12 border rounded-lg">
          {statusFilter === "abertos" ? "Nenhum ticket em aberto." : "Você ainda não abriu nenhum ticket."}
        </div>
      )}

      <ScrollArea className="max-h-[calc(100vh-220px)] pr-2">
        <div className="space-y-3">
          {filtered.map((t) => {
            const isOpen = openTicket === t.id;
            const isClosed = t.status === "fechado";
            return (
              <div key={t.id} className="border rounded-lg p-4 space-y-2 bg-card">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{t.titulo || "Sem título"}</span>
                    <Badge variant="outline" className="text-[10px]">{t.prioridade}</Badge>
                    <Badge className={
                      t.status === "aberto" ? "bg-blue-500" :
                      t.status === "em_andamento" ? "bg-yellow-500" :
                      t.status === "resolvido" ? "bg-green-500" : "bg-gray-500"
                    }>{t.status}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setOpenTicket(isOpen ? null : t.id)}>
                      {isOpen ? "Ocultar" : "Abrir"}
                    </Button>

                    {!isClosed ? (
                      <Button size="sm" variant="outline" onClick={() => closeTicket(t.id)}>
                        <Lock className="h-3 w-3 mr-1" /> Encerrar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => sendReply(t.id)} disabled={!reply[t.id]?.trim()}>
                        <RotateCcw className="h-3 w-3 mr-1" /> Reabrir respondendo
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(t.id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Excluir
                    </Button>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("pt-BR")} · Tela: <code>{t.tela || "—"}</code>
                </div>
                {isOpen && (
                  <div className="space-y-3 pt-2 border-t">
                    {(() => {
                      const events: { at: string; label: string; tone: string; desc?: string }[] = [];
                      events.push({ at: t.created_at, label: "Ticket aberto", tone: "primary", desc: t.titulo });
                      (msgs[t.id] || []).forEach((m) => {
                        events.push({
                          at: m.created_at,
                          label: m.autor_tipo === "user" ? "Mensagem do solicitante" : "Resposta do suporte",
                          tone: m.autor_tipo === "user" ? "muted" : "warning",
                          desc: (m.mensagem || "").slice(0, 120),
                        });
                      });
                      if (t.reopened_at) events.push({ at: t.reopened_at, label: "Ticket reaberto", tone: "warning" });
                      if (t.status === "resolvido") events.push({ at: t.updated_at, label: "Marcado como resolvido", tone: "success" });
                      if (t.closed_at) events.push({ at: t.closed_at, label: "Ticket encerrado", tone: "destructive" });
                      events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
                      const toneClass = (tone: string) =>
                        tone === "primary" ? "bg-primary" :
                        tone === "warning" ? "bg-yellow-500" :
                        tone === "success" ? "bg-green-500" :
                        tone === "destructive" ? "bg-destructive" : "bg-muted-foreground";
                      return (
                        <div className="rounded-md border bg-muted/20 p-3">
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Linha do tempo</div>
                          <ol className="relative border-l border-border ml-2 space-y-3">
                            {events.map((e, i) => (
                              <li key={i} className="ml-4">
                                <span className={`absolute -left-1.5 mt-1 h-3 w-3 rounded-full ring-2 ring-background ${toneClass(e.tone)}`} />
                                <div className="text-[11px] text-muted-foreground">{new Date(e.at).toLocaleString("pt-BR")}</div>
                                <div className="text-xs font-medium">{e.label}</div>
                                {e.desc && <div className="text-[11px] text-muted-foreground truncate">{e.desc}</div>}
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })()}

                    {t.descricao && <div className="text-xs bg-muted/40 p-2 rounded whitespace-pre-wrap">{t.descricao}</div>}
                    {(() => {
                      const anexos: any[] = Array.isArray(t.anexos) ? t.anexos : [];
                      const videoAnexos = anexos.filter((a: any) => (a?.type || "").startsWith("video/") || /\.webm($|\?)/i.test(a?.url || ""));
                      const docAnexos = anexos.filter((a: any) => !videoAnexos.includes(a));
                      const allVideos = [
                        ...(t.video_url ? [{ name: "Gravação 1.webm", url: t.video_url }] : []),
                        ...videoAnexos.map((a: any, i: number) => ({ name: a.name || `Gravação ${i + 2}.webm`, url: a.url })),
                      ];
                      return (
                        <>
                          {allVideos.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {allVideos.map((v, i) => (
                                <div key={i} className="rounded-lg border bg-card overflow-hidden flex flex-col">
                                  <div className="px-2 py-1 text-xs font-medium border-b bg-muted/40 truncate">{v.name}</div>
                                  <video src={v.url} controls className="w-full aspect-video object-contain bg-black" />
                                </div>
                              ))}
                            </div>
                          )}
                          {docAnexos.length > 0 && (
                            <div className="space-y-1">
                              {docAnexos.map((a: Anexo, i: number) => (
                                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline block truncate">📎 {a.name}</a>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    <div className="max-h-72 overflow-y-auto space-y-1">
                      {(msgs[t.id] || []).map((m) => (
                        <div key={m.id} className={`flex ${m.autor_tipo === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.autor_tipo === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                            <div className="text-[10px] opacity-70">{m.autor_nome || m.autor_tipo} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
                            <div className="whitespace-pre-wrap">{m.mensagem}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Textarea
                        rows={2}
                        value={reply[t.id] || ""}
                        onChange={(e) => setReply((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder={isClosed ? "Responda para reabrir o ticket..." : "Sua resposta..."}
                        className="flex-1 text-sm"
                      />
                      <Button size="sm" onClick={() => sendReply(t.id)} disabled={!reply[t.id]?.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Recarrega a lista quando o popup global de ticket fechar */}


      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        onConfirm={deleteTicket}
        isLoading={deleting}
        title="Excluir ticket"
        description="Tem certeza que deseja excluir este ticket? Todas as mensagens e anexos serão removidos. Esta ação não pode ser desfeita."
      />
    </div>
  );
}
