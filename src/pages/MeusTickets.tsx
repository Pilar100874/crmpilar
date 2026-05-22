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
  const [replyAnexos, setReplyAnexos] = useState<Record<string, Anexo[]>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [recordingTicket, setRecordingTicket] = useState<string | null>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recStreamRef = useRef<MediaStream | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});


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

  const uploadFilesForReply = async (ticketId: string, files: FileList | File[]) => {
    const arr = Array.from(files);
    if (!arr.length) return;
    setUploading((p) => ({ ...p, [ticketId]: true }));
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) throw new Error("Não autenticado");
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", authId).maybeSingle();
      if (!u) throw new Error("Usuário não encontrado");
      const novos: Anexo[] = [];
      for (const f of arr) {
        if (f.size > 25 * 1024 * 1024) { toast.error(`${f.name} excede 25MB`); continue; }
        const path = `${u.id}/replies/${ticketId}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("support-tickets").upload(path, f, { contentType: f.type, upsert: false });
        if (error) { toast.error(`Falha ao enviar ${f.name}: ${error.message}`); continue; }
        const { data: pub } = supabase.storage.from("support-tickets").getPublicUrl(path);
        novos.push({ name: f.name, url: pub.publicUrl, size: f.size, type: f.type });
      }
      setReplyAnexos((p) => ({ ...p, [ticketId]: [...(p[ticketId] || []), ...novos] }));
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload");
    } finally {
      setUploading((p) => ({ ...p, [ticketId]: false }));
    }
  };

  const startRecording = async (ticketId: string) => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
      recStreamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      recChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) recChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(recChunksRef.current, { type: "video/webm" });
        recStreamRef.current?.getTracks().forEach((t) => t.stop());
        recStreamRef.current = null;
        setRecordingTicket(null);
        const idx = (replyAnexos[ticketId] || []).filter(a => (a.type || "").startsWith("video/")).length + 1;
        const file = new File([blob], `gravacao-${Date.now()}-${idx}.webm`, { type: "video/webm" });
        await uploadFilesForReply(ticketId, [file]);
      };
      stream.getVideoTracks()[0].onended = () => { if (mr.state !== "inactive") mr.stop(); };
      mr.start();
      mediaRecRef.current = mr;
      setRecordingTicket(ticketId);
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível iniciar a gravação");
    }
  };

  const stopRecording = () => {
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      mediaRecRef.current.stop();
    }
  };

  const removeReplyAnexo = (ticketId: string, idx: number) => {
    setReplyAnexos((p) => ({ ...p, [ticketId]: (p[ticketId] || []).filter((_, i) => i !== idx) }));
  };

  const sendReply = async (ticketId: string) => {
    const text = (reply[ticketId] || "").trim();
    const anexos = replyAnexos[ticketId] || [];
    if (!text && anexos.length === 0) return;
    const { data: userRes } = await supabase.auth.getUser();
    const authId = userRes.user?.id;
    if (!authId) return;
    const { data: u } = await supabase.from("usuarios").select("id,nome").eq("auth_user_id", authId).maybeSingle();
    if (!u) return;
    const { error } = await supabase.from("support_ticket_mensagens").insert({
      ticket_id: ticketId, autor_tipo: "user", autor_usuario_id: u.id, autor_nome: u.nome,
      mensagem: text || (anexos.length ? "(anexos)" : ""),
      anexos: anexos as any,
    } as any);
    if (error) return toast.error(error.message);
    setReply((p) => ({ ...p, [ticketId]: "" }));
    setReplyAnexos((p) => ({ ...p, [ticketId]: [] }));
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
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {(msgs[t.id] || []).map((m) => {
                        const mAnexos: Anexo[] = Array.isArray(m.anexos) ? m.anexos : [];
                        const mVideos = mAnexos.filter((a) => (a?.type || "").startsWith("video/") || /\.webm($|\?)/i.test(a?.url || ""));
                        const mDocs = mAnexos.filter((a) => !mVideos.includes(a));
                        return (
                          <div key={m.id} className={`flex ${m.autor_tipo === "user" ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm space-y-2 ${m.autor_tipo === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                              <div className="text-[10px] opacity-70">{m.autor_nome || m.autor_tipo} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
                              {m.mensagem && <div className="whitespace-pre-wrap">{m.mensagem}</div>}
                              {mVideos.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {mVideos.map((v, i) => (
                                    <video key={i} src={v.url} controls className="w-full aspect-video object-contain rounded bg-black" />
                                  ))}
                                </div>
                              )}
                              {mDocs.map((a, i) => (
                                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-[11px] underline block truncate">📎 {a.name}</a>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {(replyAnexos[t.id] || []).length > 0 && (
                      <div className="flex flex-wrap gap-2 p-2 border rounded bg-muted/30">
                        {(replyAnexos[t.id] || []).map((a, i) => (
                          <div key={i} className="flex items-center gap-1 text-xs bg-background border rounded px-2 py-1">
                            <span className="truncate max-w-[160px]">{(a.type || "").startsWith("video/") ? "🎥" : "📎"} {a.name}</span>
                            <button onClick={() => removeReplyAnexo(t.id, i)} className="text-destructive hover:opacity-70"><X className="h-3 w-3" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Textarea
                        rows={2}
                        value={reply[t.id] || ""}
                        onChange={(e) => setReply((p) => ({ ...p, [t.id]: e.target.value }))}
                        placeholder={isClosed ? "Responda para reabrir o ticket..." : "Sua resposta..."}
                        className="w-full text-sm"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={(el) => { fileInputsRef.current[t.id] = el; }}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => { if (e.target.files) { uploadFilesForReply(t.id, e.target.files); e.target.value = ""; } }}
                        />
                        <Button size="sm" variant="outline" type="button" onClick={() => fileInputsRef.current[t.id]?.click()} disabled={uploading[t.id]} title="Anexar arquivos">
                          {uploading[t.id] ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Paperclip className="h-4 w-4 mr-1" />}
                          <span className="hidden sm:inline">Anexar</span>
                        </Button>
                        {recordingTicket === t.id ? (
                          <Button size="sm" variant="destructive" type="button" onClick={stopRecording} title="Parar gravação">
                            <Square className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Parar</span>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            type="button"
                            onClick={() => startRecording(t.id)}
                            disabled={!!recordingTicket}
                            title={canRecordScreen() ? "Gravar vídeo da tela" : "Gravação indisponível neste dispositivo/navegador"}
                          >
                            <Video className={`h-4 w-4 mr-1 ${canRecordScreen() ? "" : "opacity-50"}`} />
                            <span className="hidden sm:inline">Gravar</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          className="ml-auto"
                          onClick={() => sendReply(t.id)}
                          disabled={(!reply[t.id]?.trim() && (replyAnexos[t.id] || []).length === 0) || uploading[t.id]}
                        >
                          <Send className="h-4 w-4 mr-1" /> Enviar
                        </Button>
                      </div>
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
