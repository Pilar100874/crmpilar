import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Square, Loader2, FileText, Trash2, Inbox, Send, Lock, RotateCcw, ArrowLeft, Paperclip, X, Play, Pause, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialStep?: Step;
}

export type Step = "home" | "choose" | "texto" | "video-instructions" | "video-ready" | "video-review" | "meus";
type Anexo = { name: string; url: string; size: number; type: string };

export function SupportTicketDialog({ open, onOpenChange, initialStep = "home" }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(initialStep);

  useEffect(() => {
    if (open) setStep(initialStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialStep]);

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
  const [paused, setPaused] = useState(false);
  const [videos, setVideos] = useState<{ blob: Blob; url: string }[]>([]);
  const [telasVisitadas, setTelasVisitadas] = useState<string[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const routesRef = useRef<string[]>([]);
  const routePollRef = useRef<number | null>(null);



  // my tickets
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myMsgs, setMyMsgs] = useState<Record<string, any[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loadingMine, setLoadingMine] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"abertos" | "todos">("abertos");

  useEffect(() => {
    if (open) {
      if (videos.length === 0) setTela(location.pathname);
      if (step === "meus") loadMine();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const resetAll = () => {
    setTitulo(""); setDescricao(""); setObservacao("");
    setAnexos([]);
    videos.forEach((v) => URL.revokeObjectURL(v.url));
    setVideos([]);
    setTelasVisitadas([]);
    routesRef.current = [];
    setStep("home");
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
  const prepareRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 15 }, audio: true });
      streamRef.current = stream;
      // If user stops sharing before starting, clean up
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        } else {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          setStep("video-instructions");
          toast.info("Compartilhamento encerrado antes de iniciar.");
        }
      };
      setStep("video-ready");
      onOpenChange(false);
      toast.success("Tela pronta. Navegue até a tela do problema e clique em 'Começar a gravar'.");
    } catch (e: any) {
      toast.error("Não foi possível preparar: " + (e?.message || ""));
    }
  };

  const beginRecording = () => {
    const stream = streamRef.current;
    if (!stream) { toast.error("Stream indisponível. Tente novamente."); setStep("video-instructions"); return; }
    try {
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      chunksRef.current = [];
      routesRef.current = [window.location.pathname];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setVideos((prev) => [...prev, { blob, url }]);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (routePollRef.current) {
          window.clearInterval(routePollRef.current);
          routePollRef.current = null;
        }
        const lista = Array.from(new Set([...telasVisitadas, ...routesRef.current]));
        setTelasVisitadas(lista);
        setTela(lista.join(" → "));
        setStep("video-review");
        setRecording(false);
        setPaused(false);
        onOpenChange(true);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      routePollRef.current = window.setInterval(() => {
        const cur = window.location.pathname;
        const arr = routesRef.current;
        if (arr[arr.length - 1] !== cur) arr.push(cur);
      }, 800);
      setRecording(true);
      setPaused(false);
      toast.info("Gravação iniciada. Navegue até a tela do problema.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Não foi possível iniciar: " + (e?.message || ""));
    }
  };

  const cancelPreparedRecording = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStep("video-instructions");
  };


  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const pauseRecording = () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    if (mr.state === "recording") {
      mr.pause();
      setPaused(true);
      toast.info("Gravação pausada");
    } else if (mr.state === "paused") {
      mr.resume();
      setPaused(false);
      toast.info("Gravação retomada");
    }
  };

  const removeVideo = (idx: number) => {
    setVideos((prev) => {
      const v = prev[idx];
      if (v) URL.revokeObjectURL(v.url);
      return prev.filter((_, i) => i !== idx);
    });
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
    if (isVideo && videos.length === 0) { toast.error("Grave a tela antes de enviar."); return; }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) throw new Error("Não autenticado");
      const { data: u } = await supabase.from("usuarios").select("id, estabelecimento_id").eq("auth_user_id", authId).maybeSingle();
      if (!u) throw new Error("Usuário não encontrado");

      let videoUrl: string | null = null;
      const videoAnexos: Anexo[] = [];
      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const path = `${u.id}/${Date.now()}-${i}.webm`;
        const { error: upErr } = await supabase.storage.from("support-tickets").upload(path, v.blob, { contentType: "video/webm" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("support-tickets").getPublicUrl(path);
        if (i === 0) {
          videoUrl = pub.publicUrl;
        } else {
          videoAnexos.push({ name: `Gravação ${i + 1}.webm`, url: pub.publicUrl, size: v.blob.size, type: "video/webm" });
        }
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
        anexos: [...anexos, ...videoAnexos] as any,

      });
      if (error) throw error;
      toast.success("Ticket enviado ao admin!");
      resetAll();
      onOpenChange(false);
      if (location.pathname !== "/meus-tickets") navigate("/meus-tickets");
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e?.message || ""));
    } finally { setSaving(false); }
  };

  // ---------- shared meta ----------
  const renderMetaFields = (showTela: boolean = true) => {
    const telas = telasVisitadas.length > 0 ? telasVisitadas : [tela].filter(Boolean);
    return (
      <div className="space-y-3">
        {showTela && (
          <div>
            <Label>{telasVisitadas.length > 1 ? "Telas envolvidas (capturadas automaticamente)" : "Tela onde ocorreu (capturada automaticamente)"}</Label>
            <div className="mt-1 flex flex-wrap gap-2 rounded-md border bg-muted/30 p-2">
              {telas.length === 0 && <span className="text-xs text-muted-foreground">—</span>}
              {telas.map((t, i) => (
                <a
                  key={`${t}-${i}`}
                  href={t}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-mono px-2 py-1 rounded bg-background border hover:border-primary hover:text-primary transition-colors"
                >
                  {t}
                </a>
              ))}
            </div>
          </div>
        )}
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
    );
  };



  return (
    <>
      {/* Floating recording indicator (when dialog closed) */}
      {recording && (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full px-4 py-2 text-destructive-foreground shadow-lg ${paused ? "bg-muted-foreground" : "bg-destructive"}`}>
          <span className={`h-2 w-2 rounded-full bg-white ${paused ? "" : "animate-pulse"}`} />
          <span className="text-sm font-semibold">{paused ? "Gravação pausada" : "Gravando tela..."}</span>
          <Button size="sm" variant="secondary" onClick={pauseRecording}>
            {paused ? (<><Play className="h-3 w-3" /> Retomar</>) : (<><Pause className="h-3 w-3" /> Pausar</>)}
          </Button>
          <Button size="sm" variant="secondary" onClick={stopRecording}>
            <Square className="h-3 w-3" /> Finalizar
          </Button>
        </div>
      )}

      {/* Floating start-recording bar (dialog closed, stream ready) */}
      {!recording && step === "video-ready" && !open && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-primary-foreground shadow-lg">
          <span className="text-sm font-semibold">Pronto para gravar</span>
          <Button size="sm" variant="secondary" onClick={beginRecording}>
            <Play className="h-3 w-3 mr-1" /> Começar a gravar
          </Button>
          <Button size="sm" variant="ghost" className="text-primary-foreground hover:text-primary-foreground/80" onClick={cancelPreparedRecording}>
            Cancelar
          </Button>
        </div>
      )}


      <Dialog open={open} onOpenChange={(v) => {
        if (recording) return;
        if (!v && (step === "video-instructions" || step === "video-review")) {
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
          resetAll();
        }
        onOpenChange(v);
      }}>

        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {step !== "home" && step !== "video-review" && (
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setStep(step === "choose" || step === "meus" ? "home" : "choose")}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <DialogTitle>Suporte</DialogTitle>
            </div>
            <DialogDescription>
              {step === "home" && "O que você deseja fazer?"}
              {step === "choose" && "Como você prefere relatar o problema?"}
              {step === "texto" && "Descreva o problema e anexe documentos se necessário."}
              {step === "video-instructions" && "Vamos gravar sua tela enquanto você reproduz o problema."}
              {step === "video-ready" && "Tela selecionada. Inicie a gravação quando estiver pronto."}
              {step === "video-review" && "Revise a gravação e adicione uma observação antes de enviar."}
              {step === "meus" && "Acompanhe seus tickets e respostas do suporte."}
            </DialogDescription>
          </DialogHeader>

          {/* STEP: home */}
          {step === "home" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-2">
              <button
                onClick={() => setStep("choose")}
                className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <Send className="h-8 w-8 text-primary mb-3" />
                <div className="font-semibold">Abrir ticket</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Relate um problema ou solicitação ao suporte.
                </div>
              </button>
              <button
                onClick={() => { onOpenChange(false); navigate("/meus-tickets"); }}
                className="group rounded-xl border bg-card p-5 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <Inbox className="h-8 w-8 text-primary mb-3" />
                <div className="font-semibold">Ver tickets</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Acompanhe seus tickets e respostas do suporte.
                </div>
              </button>
            </div>
          )}

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
              {renderMetaFields(false)}
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
                  <li>Clique em <strong>Selecionar tela</strong> e escolha a aba/janela a compartilhar.</li>
                  <li>Na próxima etapa, clique em <strong>Começar a gravar</strong> apenas quando estiver pronto.</li>
                  <li>Esta janela será fechada para você navegar livremente.</li>
                  <li>Use o painel flutuante no canto inferior direito para <strong>Pausar</strong>, <strong>Retomar</strong> ou <strong>Finalizar</strong>.</li>
                  <li>Após finalizar, você poderá <strong>gravar outros vídeos</strong> ou enviar tudo de uma vez.</li>
                </ol>

              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStep("choose")}>Voltar</Button>
                <Button onClick={prepareRecording}>
                  <Video className="mr-2 h-4 w-4" /> Selecionar tela
                </Button>
              </div>
            </div>
          )}

          {/* STEP: video-ready */}
          {step === "video-ready" && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                <div className="font-semibold flex items-center gap-2"><Video className="h-4 w-4 text-primary" /> Tela selecionada e pronta</div>
                <p className="text-muted-foreground">
                  Sua tela já está compartilhada, mas a gravação <strong>ainda não começou</strong>. Posicione-se na tela do problema e clique em <strong>Começar a gravar</strong> quando estiver pronto.
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={cancelPreparedRecording}>Cancelar</Button>
                <Button onClick={beginRecording}>
                  <Play className="mr-2 h-4 w-4" /> Começar a gravar
                </Button>
              </div>
            </div>
          )}

          {/* STEP: video-review */}
          {step === "video-review" && (
            <div className="space-y-3">
              <div className="space-y-3">
                {videos.map((v, idx) => (
                  <div key={v.url} className="relative rounded-lg border overflow-hidden">
                    <div className="flex items-center justify-between px-2 py-1 bg-muted/50 text-xs">
                      <span className="font-medium">Gravação {idx + 1}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeVideo(idx)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    <video src={v.url} controls className="w-full max-h-72" />
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={prepareRecording}>
                  <Plus className="mr-2 h-3 w-3" /> Gravar outro vídeo
                </Button>
                {videos.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => { videos.forEach((v) => URL.revokeObjectURL(v.url)); setVideos([]); setStep("video-instructions"); }}>
                    <RotateCcw className="mr-2 h-3 w-3" /> Descartar tudo e recomeçar
                  </Button>
                )}
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
                <Button variant="outline" onClick={() => { resetAll(); onOpenChange(false); }} disabled={saving}>Cancelar</Button>

                <Button onClick={handleSubmit} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Enviar ticket
                </Button>
              </div>
            </div>
          )}

          {/* STEP: meus */}
          {step === "meus" && (() => {
            const filtered = statusFilter === "abertos"
              ? myTickets.filter((t) => t.status !== "fechado")
              : myTickets;
            return (
            <div>
              <div className="flex items-center gap-2 pb-2">
                <Button size="sm" variant={statusFilter === "abertos" ? "default" : "outline"} onClick={() => setStatusFilter("abertos")}>
                  Em aberto
                </Button>
                <Button size="sm" variant={statusFilter === "todos" ? "default" : "outline"} onClick={() => setStatusFilter("todos")}>
                  Todos
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">{filtered.length} ticket(s)</span>
              </div>
              {loadingMine && <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
              {!loadingMine && filtered.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-6">
                  {statusFilter === "abertos" ? "Nenhum ticket em aberto." : "Você ainda não abriu nenhum ticket."}
                </div>
              )}
              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="space-y-2">
                  {filtered.map((t) => {
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
                          <div className="space-y-3 pt-2 border-t">
                            {/* TIMELINE */}
                            {(() => {
                              const events: { at: string; label: string; tone: "primary" | "warning" | "success" | "muted" | "destructive"; desc?: string }[] = [];
                              events.push({ at: t.created_at, label: "Ticket aberto", tone: "primary", desc: t.titulo });
                              (myMsgs[t.id] || []).forEach((m) => {
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
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}
