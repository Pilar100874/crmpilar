import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Video, Square, Loader2, FileText, Trash2, Inbox, Send, Lock, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function SupportTicketDialog({ open, onOpenChange }: Props) {
  const location = useLocation();
  const [tab, setTab] = useState<"texto" | "video" | "meus">("texto");
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myMsgs, setMyMsgs] = useState<Record<string, any[]>>({});
  const [reply, setReply] = useState<Record<string, string>>({});
  const [loadingMine, setLoadingMine] = useState(false);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [observacao, setObservacao] = useState("");
  const [tela, setTela] = useState(location.pathname);
  const [prioridade, setPrioridade] = useState("normal");
  const [saving, setSaving] = useState(false);

  // Recording state
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoUrlPreview, setVideoUrlPreview] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (open) setTela(location.pathname);
  }, [open, location.pathname]);

  const resetAll = () => {
    setTitulo(""); setDescricao(""); setObservacao("");
    setVideoBlob(null);
    if (videoUrlPreview) URL.revokeObjectURL(videoUrlPreview);
    setVideoUrlPreview(null);
    setTab("texto");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 15 },
        audio: true,
      });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setVideoBlob(blob);
        setVideoUrlPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      // Auto-stop when user stops sharing from browser UI
      stream.getVideoTracks()[0].onended = () => {
        if (mr.state !== "inactive") mr.stop();
        setRecording(false);
      };
      mr.start();
      mediaRecorderRef.current = mr;
      setRecording(true);
      // Minimize dialog hint
      toast.info("Gravação iniciada. Volte para a tela com o problema.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Não foi possível iniciar a gravação: " + (e?.message || ""));
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    onOpenChange(true);
  };

  const handleSubmit = async () => {
    if (tab === "texto" && !descricao.trim()) {
      toast.error("Descreva o problema."); return;
    }
    if (tab === "video" && !videoBlob) {
      toast.error("Grave a tela antes de enviar."); return;
    }
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const authId = userRes.user?.id;
      if (!authId) throw new Error("Não autenticado");
      const { data: u } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", authId)
        .maybeSingle();
      if (!u) throw new Error("Usuário não encontrado");

      let videoUrl: string | null = null;
      if (videoBlob) {
        const path = `${u.id}/${Date.now()}.webm`;
        const { error: upErr } = await supabase.storage
          .from("support-tickets")
          .upload(path, videoBlob, { contentType: "video/webm" });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("support-tickets").getPublicUrl(path);
        videoUrl = pub.publicUrl;
      }

      const { error } = await supabase.from("support_tickets").insert({
        usuario_id: u.id,
        estabelecimento_id: u.estabelecimento_id,
        tipo: tab,
        tela,
        titulo: titulo || (tab === "video" ? "Ticket com gravação de tela" : "Ticket"),
        descricao: tab === "texto" ? descricao : null,
        observacao: observacao || null,
        video_url: videoUrl,
        prioridade,
      });
      if (error) throw error;
      toast.success("Ticket enviado ao admin!");
      resetAll();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao enviar: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Floating recording indicator (when dialog closed) */}
      {recording && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-destructive-foreground shadow-lg">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
          <span className="text-sm font-semibold">Gravando tela...</span>
          <Button size="sm" variant="secondary" onClick={stopRecording}>
            <Square className="h-3 w-3" /> Parar
          </Button>
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!recording) onOpenChange(v); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir Ticket de Suporte</DialogTitle>
            <DialogDescription>
              Descreva o problema ou grave sua tela para enviar ao administrador.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="texto"><FileText className="mr-2 h-4 w-4" /> Descrever</TabsTrigger>
              <TabsTrigger value="video"><Video className="mr-2 h-4 w-4" /> Gravar tela</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-3">
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

            <TabsContent value="texto" className="mt-4">
              <Label>Descrição do problema</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={5}
                placeholder="Descreva o que aconteceu, passos para reproduzir, etc."
              />
            </TabsContent>

            <TabsContent value="video" className="mt-4 space-y-3">
              {!videoBlob && !recording && (
                <Button onClick={startRecording} className="w-full" variant="default">
                  <Video className="mr-2 h-4 w-4" /> Iniciar gravação de tela
                </Button>
              )}
              {videoUrlPreview && (
                <div className="space-y-2">
                  <video src={videoUrlPreview} controls className="w-full rounded-lg border" />
                  <Button variant="outline" size="sm" onClick={() => { setVideoBlob(null); URL.revokeObjectURL(videoUrlPreview); setVideoUrlPreview(null); }}>
                    <Trash2 className="mr-2 h-3 w-3" /> Descartar e gravar novamente
                  </Button>
                </div>
              )}
              <div>
                <Label>Observação</Label>
                <Textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  rows={3}
                  placeholder="Comente algo sobre a gravação..."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar ticket
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
