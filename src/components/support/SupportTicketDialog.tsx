import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Square, Loader2, FileText, Trash2, Inbox, Send, Lock, RotateCcw, ArrowLeft, Paperclip, X, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

type Step = "choose" | "texto" | "video-instructions" | "video-review" | "meus";
type Anexo = { name: string; url: string; size: number; type: string };

export function SupportTicketDialog({ open, onOpenChange }: Props) {
  const location = useLocation();
  const [step, setStep] = useState<Step>("choose");

  // shared form state
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [tela, setTela] = useState(location.pathname);
  const [prioridade, setPrioridade] = useState("normal");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // recording
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrlPreview, setVideoUrlPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // my tickets
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myMsgs, setMyMsgs] = useState<Record<string, any[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loadingMine, setLoadingMine] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      // when reopening from a recording finish, keep video-review step
      if (!videoBlob) setTela(location.pathname);
      if (step === "meus") loadMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const resetAll = () => {
    setTitulo(""); setDescricao(""); setObservacao("");
    setAnexos([]);
    setVideoBlob(null);
    if (videoUrlPreview) URL.revokeObjectURL(videoUrlPreview);
    setVideoUrlPreview(null);
    setStep("choose");
  };

  // ---------- attachments ----------
  const handleFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) throw new Error("Não autenticado");
      const { data: u } = await supabase.from("usuarios").select("id").eq("auth_user_id", authId).maybeSingle();
      if (!u) throw new Error("Usuário não encontrado");
      const novos: Anexo[] = [];
      for (const f of Array.from(files)) {
        if (f.size > 25 * 1024 * 1024) {
          toast.error(`${f.name} excede 25MB`); continue;
        }
        const path = `${u.id}/attachments/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("support-tickets").upload(path, f, { contentType: f.type, upsert: false });
        if (error) { toast.error(`Falha ao enviar ${f.name}: ${error.message}`); continue; }
        const { data: pub } = supabase.storage.from("support-tickets").getPublicUrl(path);
        novos.push({ name: f.name, url: pub.publicUrl, size: f.size, type: f.type });
      }
      setAnexos((p) => [...p, ...novos]);
    } catch (e: any) {
      toast.error(e?.message || "Erro no upload");
    } finally {
      setUploading(false);
    }
  };

  // ---------- recording ----------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoUrlPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        // capture current screen route at the moment of stop
        setTela(window.location.pathname);
        setStep("video-review");
        setRecording(false);
        onOpenChange(true);
      };
      stream.getVideoTracks()[0].onended = () => {
        if (mr.state !== "inactive") mr.stop();
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      toast.info("Gravação iniciada. Navegue até a tela do problema.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Não foi possível iniciar: " + (e?.message || ""));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  // ---------- my tickets ----------
  const loadMine = async () => {
    setLoadingMine(true);
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
      setMyTickets((data as any) || []);
    } finally { setLoadingMine(false); }
  };

  const loadTicketMsgs = async (ticketId: string) => {
    const { data } = await supabase.from("support_ticket_mensagens")
      .select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true });
    setMyMsgs((p) => ({ ...p, [ticketId]: (data as any) || [] }));
  };

  const sendUserReply = async (ticketId: string) => {
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
    await loadTicketMsgs(ticketId);
    await loadMine();
  };

  const closeMyTicket = async (id: string) => {
    const { error } = await supabase.from("support_tickets")
      .update({ status: "fechado", closed_at: new Date().toISOString() }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ticket encerrado"); loadMine();
  };

  // ---------- submit ----------
  const handleSubmit = async () => {
    const isVideo = step === "video-review";
    if (!isVideo && !descricao.trim()) { toast.error("Descreva o problema."); return; }
    if (isVideo && !videoBlob) { toast.error("Grave a tela antes de enviar."); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) throw new Error("Não autenticado");
      const { data: u } = await supabase.from("usuarios").select("id, estabelecimento_id").eq("auth_user_id", authId).maybeSingle();
      if (!u) throw new Error("Usuário não encontrado");

      let videoUrl: string | null = null;
      if (videoBlob) {
        const path = `${u.id}/${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage.from("support-tickets").upload(path, videoBlob, { contentType: "video/webm" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("support-tickets").getPublicUrl(path);
        videoUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("support_tickets").insert({
        usuario_id: u.id,
        estabelecimento_id: u.estabelecimento_id,
        tipo: isVideo ? "video" : "texto",
        tela,
        titulo: titulo || (isVideo ? "Ticket com gravação de tela" : "Ticket"),
        descricao: !isVideo ? descricao : null,
        observacao: observacao || null,
        video_url: videoUrl,
        prioridade,
        anexos: anexos as any,
      });
      if (error) throw error;
      toast.success("Ticket enviado ao admin!");
      resetAll();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e?.message || ""));
    } finally { setSaving(false); }
  };

  // ---------- shared meta ----------
  const renderMetaFields = () => (
    <div className="space-y-3">
      <div>
        <Label>Tela / Rota onde ocorreu</Label>
        <Input value={tela} onChange={(e) => setTela(e.target.value)} placeholder="/dashboard" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Título (opcional)</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>
        <div>
          <Label>Prioridade</Label>
          <Select value={prioridade} onValueChange={setPrioridade}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="urgente">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Floating recording indicator (when dialog closed) */}
      {recording && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-destructive-foreground shadow-lg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-sm font-semibold">Gravando tela...</span>
          <Button size="sm" variant="secondary" onClick={stopRecording}>
            <Square className="h-3 w-3" /> Finalizar
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!recording) onOpenChange(v); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {step !== "choose" && step !== "video-review" && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep("choose")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle>Suporte</DialogTitle>
              <div className="ml-auto">
                {step !== "meus" ? (
                  <Button size="sm" variant="outline" onClick={() => setStep("meus")}>
                    <Inbox className="mr-2 h-4 w-4" /> Meus tickets
                  </Button>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setStep("choose")}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Novo ticket
                  </Button>
                )}
              </div>
            </div>
            <DialogDescription>
              {step === "choose" && "Como você prefere relatar o problema?"}
              {step === "texto" && "Descreva o problema e anexe documentos se necessário."}
              {step === "video-instructions" && "Vamos gravar sua tela enquanto você reproduz o problema."}
              {step === "video-review" && "Revise a gravação e adicione uma observação antes de enviar."}
              {step === "meus" && "Acompanhe seus tickets e respostas do suporte."}
            </DialogDescription>
          </DialogHeader>

          {/* STEP: choose */}
          {step === "choose" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <button
                onClick={() => setStep("texto")}
                className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <FileText className="h-8 w-8 text-primary mb-3" />
                <div className="font-semibold">Apenas texto</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Descreva o problema e anexe prints, PDFs ou outros documentos.
                </div>
              </button>
              <button
                onClick={() => setStep("video-instructions")}
                className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <Video className="h-8 w-8 text-primary mb-3" />
                <div className="font-semibold">Gravar tela</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Grave o que está acontecendo na tela e envie ao suporte com observações.
                </div>
              </button>
            </div>
          )}

          {/* STEP: texto */}
          {step === "texto" && (
            <div className="space-y-3">
              {renderMetaFields()}
              <div>
                <Label>Descrição do problema</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={5}
                  placeholder="Descreva o que aconteceu, passos para reproduzir, etc."
                />
              </div>
              <div>
                <Label className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4" /> Anexos (opcional)
                </Label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={uploading}
                />
                {uploading && <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Enviando...</div>}
                {anexos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {anexos.map((a, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-muted/40 rounded px-2 py-1">
                        <a href={a.url} target="_blank" rel="noreferrer" className="truncate hover:underline">{a.name}</a>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setAnexos((p) => p.filter((_, idx) => idx !== i))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving || uploading}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar ticket
                </Button>
              </div>
            </div>
          )}

          {/* STEP: video-instructions */}
          {step === "video-instructions" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="font-semibold flex items-center gap-2"><Play className="h-4 w-4" /> Como funciona</div>
                <ol className="list-decimal pl-5 space-y-1 text-muted-foreground">
                  <li>Clique em <strong>Iniciar gravação</strong> e escolha a aba/janela a compartilhar.</li>
                  <li>Esta janela será fechada automaticamente para você navegar livremente.</li>
                  <li>Vá até a tela onde o problema acontece e reproduza o erro.</li>
                  <li>Quando terminar, clique em <strong>Finalizar</strong> no canto inferior direito (ou pare o compartilhamento do navegador).</li>
                  <li>Um popup vai abrir no local em que você estava, com o vídeo anexado para você adicionar observações.</li>
                </ol>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("choose")}>Voltar</Button>
                <Button onClick={startRecording}>
                  <Video className="mr-2 h-4 w-4" /> Iniciar gravação
                </Button>
              </div>
            </div>
          )}

          {/* STEP: video-review */}
          {step === "video-review" && (
            <div className="space-y-3">
              {videoUrlPreview && (
                <video src={videoUrlPreview} controls className="w-full rounded-lg border max-h-72" />
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setVideoBlob(null); if (videoUrlPreview) URL.revokeObjectURL(videoUrlPreview); setVideoUrlPreview(null); setStep("video-instructions"); }}>
                  <Trash2 className="mr-2 h-3 w-3" /> Descartar e gravar novamente
                </Button>
              </div>
              {renderMetaFields()}
              <div>
                <Label>Observação adicional</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Explique o que está acontecendo no vídeo..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar ticket
                </Button>
              </div>
            </div>
          )}

          {/* STEP: meus */}
          {step === "meus" && (
            <div>
              {loadingMine && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!loadingMine && myTickets.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">Você ainda não abriu nenhum ticket.</div>
              )}
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="space-y-2">
                  {myTickets.map((t) => {
                    const isOpen = openTicket === t.id;
                    const isClosed = t.status === "fechado";
                    return (
                      <div key={t.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{t.titulo || "Sem título"}</span>
                            <Badge variant="outline" className="text-[10px]">{t.prioridade}</Badge>
                            <Badge className={
                              t.status === "aberto" ? "bg-blue-500" :
                              t.status === "em_andamento" ? "bg-yellow-500" :
                              t.status === "resolvido" ? "bg-green-500" : "bg-gray-500"
                            }>{t.status}</Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" onClick={() => { setOpenTicket(isOpen ? null : t.id); if (!isOpen) loadTicketMsgs(t.id); }}>
                              {isOpen ? "Fechar" : "Abrir"}
                            </Button>
                            {!isClosed ? (
                              <Button size="sm" variant="outline" onClick={() => closeMyTicket(t.id)}>
                                <Lock className="h-3 w-3 mr-1" /> Encerrar
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" onClick={() => sendUserReply(t.id)} disabled={!reply[t.id]?.trim()} title="Envie uma mensagem para reabrir">
                                <RotateCcw className="h-3 w-3 mr-1" /> Reabrir respondendo
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(t.created_at).toLocaleString("pt-BR")} · Tela: <code>{t.tela || "—"}</code>
                        </div>
                        {isOpen && (
                          <div className="space-y-2 pt-2 border-t">
                            {t.descricao && <div className="text-xs bg-muted/40 p-2 rounded whitespace-pre-wrap">{t.descricao}</div>}
                            {Array.isArray(t.anexos) && t.anexos.length > 0 && (
                              <div className="space-y-1">
                                {t.anexos.map((a: Anexo, i: number) => (
                                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline block truncate">📎 {a.name}</a>
                                ))}
                              </div>
                            )}
                            {t.video_url && (
                              <video src={t.video_url} controls className="w-full rounded border max-h-48" />
                            )}
                            <div className="max-h-60 overflow-y-auto space-y-1">
                              {(myMsgs[t.id] || []).map((m) => (
                                <div key={m.id} className={`flex ${m.autor_tipo === "user" ? "justify-end" : "justify-start"}`}>
                                  <div className={`max-w-[80%] rounded-lg px-2 py-1 text-xs ${m.autor_tipo === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                                    <div className="text-[9px] opacity-70">{m.autor_nome || m.autor_tipo} · {new Date(m.created_at).toLocaleString("pt-BR")}</div>
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
                              <Button size="sm" onClick={() => sendUserReply(t.id)} disabled={!reply[t.id]?.trim()}>
                                <Send className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
