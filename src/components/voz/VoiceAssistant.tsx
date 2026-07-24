import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, X, Loader2, Settings, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Config = {
  wake_word_ativo: boolean;
  responder_por_voz: boolean;
  voz: string;
  wake_word: string;
};

type LogItem = { user: string; assistant: string; ts: number };

const WAKE_DEFAULT = "ei pilar";

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [wakeListening, setWakeListening] = useState(false);
  const [history, setHistory] = useState<LogItem[]>([]);
  const [cfg, setCfg] = useState<Config>({
    wake_word_ativo: false,
    responder_por_voz: true,
    voz: "alloy",
    wake_word: WAKE_DEFAULT,
  });
  const [pendingConfirm, setPendingConfirm] = useState<any>(null);

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeRecogRef = useRef<any>(null);

  // carrega config
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("assistente_voz_config")
        .select("*").eq("auth_user_id", u.user.id).maybeSingle();
      if (data) setCfg({
        wake_word_ativo: !!data.wake_word_ativo,
        responder_por_voz: data.responder_por_voz !== false,
        voz: data.voz || "alloy",
        wake_word: data.wake_word || WAKE_DEFAULT,
      });
    })();
  }, []);

  const salvarConfig = async (next: Partial<Config>) => {
    const merged = { ...cfg, ...next };
    setCfg(merged);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("assistente_voz_config").upsert({
      auth_user_id: u.user.id,
      ...merged,
    }, { onConflict: "auth_user_id" });
  };

  // Wake word via Web Speech API
  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!cfg.wake_word_ativo || !SR) {
      wakeRecogRef.current?.stop?.();
      wakeRecogRef.current = null;
      setWakeListening(false);
      return;
    }
    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = (e.results[i][0]?.transcript || "").toLowerCase();
          if (txt.includes(cfg.wake_word.toLowerCase())) {
            rec.stop();
            setTimeout(() => { setOpen(true); startRecording(); }, 200);
            break;
          }
        }
      };
      rec.onend = () => { if (cfg.wake_word_ativo && !isRecording) { try { rec.start(); } catch {} } };
      rec.onerror = () => {};
      rec.start();
      wakeRecogRef.current = rec;
      setWakeListening(true);
    } catch (e) {
      console.warn("wake word start failed", e);
    }
    return () => { try { wakeRecogRef.current?.stop(); } catch {} };
  }, [cfg.wake_word_ativo, cfg.wake_word]);

  const startRecording = useCallback(async () => {
    if (isRecording || processing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200) { toast.error("Áudio muito curto"); return; }
        await processarAudio(blob);
      };
      rec.start();
      mediaRecRef.current = rec;
      setIsRecording(true);
    } catch (e: any) {
      toast.error("Sem acesso ao microfone");
    }
  }, [isRecording, processing]);

  const stopRecording = () => {
    if (mediaRecRef.current && isRecording) {
      mediaRecRef.current.stop();
      setIsRecording(false);
    }
  };

  const processarAudio = async (blob: Blob) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1) transcrever
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      const trResp = await fetch(
        `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/assistente-voz-transcribe`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd }
      );
      const trJson = await trResp.json();
      if (!trResp.ok) throw new Error(trJson.error || "Falha na transcrição");
      const texto = (trJson.text || "").trim();
      if (!texto) { toast.error("Não entendi o áudio"); return; }

      // 2) processar com IA
      const chatResp = await supabase.functions.invoke("assistente-voz-chat", {
        body: { transcricao: texto, messages: [] },
      });
      if (chatResp.error) throw new Error(chatResp.error.message);
      const { resposta, acao } = chatResp.data;

      setHistory((h) => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));

      // 3) executar ação
      if (acao?.tipo === "navegar_para" && acao.path) {
        setTimeout(() => navigate(acao.path), 400);
      } else if (acao?.tipo === "confirmar_disparo_bot" || acao?.tipo === "confirmar_comando_tv") {
        setPendingConfirm(acao);
      }

      // 4) TTS opcional
      if (cfg.responder_por_voz && resposta) {
        await falar(resposta);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const falar = async (texto: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/assistente-voz-tts`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.access_token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ texto, voz: cfg.voz }),
        }
      );
      if (!resp.ok) return;
      const buf = await resp.arrayBuffer();
      const url = URL.createObjectURL(new Blob([buf], { type: "audio/mpeg" }));
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.play().catch(() => {});
    } catch {}
  };

  const executarConfirmacao = async () => {
    if (!pendingConfirm) return;
    // placeholder — apenas confirma. Integração real com bot/tv fica para próxima iteração.
    toast.success("Ação confirmada (integração completa na próxima iteração).");
    setPendingConfirm(null);
  };

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-24 right-6 z-[650] h-14 w-14 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105",
          wakeListening
            ? "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground ring-4 ring-primary/30 animate-pulse"
            : "bg-primary text-primary-foreground"
        )}
        title={wakeListening ? `Escutando "${cfg.wake_word}"...` : "Assistente por voz"}
      >
        <Mic className="h-6 w-6" />
      </button>

      {/* Painel */}
      {open && (
        <div className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setOpen(false)}>
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-background border shadow-2xl"
          >
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Assistente Pilar</span>
                {wakeListening && <span className="text-xs text-muted-foreground">• escutando "{cfg.wake_word}"</span>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConfig((s) => !s)}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showConfig ? (
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ativação por palavra ("{cfg.wake_word}")</Label>
                    <p className="text-xs text-muted-foreground">Escuta contínua em background</p>
                  </div>
                  <Switch checked={cfg.wake_word_ativo} onCheckedChange={(v) => salvarConfig({ wake_word_ativo: v })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Responder por voz</Label>
                    <p className="text-xs text-muted-foreground">Fala a resposta em áudio</p>
                  </div>
                  <Switch checked={cfg.responder_por_voz} onCheckedChange={(v) => salvarConfig({ responder_por_voz: v })} />
                </div>
                <div>
                  <Label className="text-xs">Voz</Label>
                  <select
                    className="w-full mt-1 rounded-md border bg-background px-2 py-1.5 text-sm"
                    value={cfg.voz}
                    onChange={(e) => salvarConfig({ voz: e.target.value })}
                  >
                    {["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"].map((v) => (
                      <option key={v} value={v}>{v}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {history.length === 0 && !isRecording && !processing && (
                  <div className="text-center py-6 text-sm text-muted-foreground">
                    Toque no microfone e diga algo como:
                    <ul className="mt-2 space-y-1 text-xs">
                      <li>"Abrir dashboard"</li>
                      <li>"Quantos veículos estão online?"</li>
                      <li>"Ir para orçamentos"</li>
                      <li>"Quantas empresas cadastradas?"</li>
                    </ul>
                  </div>
                )}

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {history.map((h, i) => (
                    <div key={i} className="space-y-1">
                      <div className="text-xs bg-primary/10 rounded-lg p-2 ml-6">{h.user}</div>
                      <div className="text-xs bg-muted rounded-lg p-2 mr-6">{h.assistant}</div>
                    </div>
                  ))}
                </div>

                {pendingConfirm && (
                  <div className="border border-yellow-500/40 bg-yellow-500/10 rounded-lg p-2 flex gap-2">
                    <Button size="sm" onClick={executarConfirmacao}>Confirmar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setPendingConfirm(null)}>Cancelar</Button>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-2">
                  <Button
                    size="lg"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={processing}
                    className={cn(
                      "h-14 w-14 rounded-full",
                      isRecording && "bg-destructive hover:bg-destructive/90 animate-pulse"
                    )}
                  >
                    {processing ? <Loader2 className="h-6 w-6 animate-spin" /> :
                      isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => salvarConfig({ responder_por_voz: !cfg.responder_por_voz })}
                    title={cfg.responder_por_voz ? "Silenciar voz" : "Ativar voz"}
                  >
                    {cfg.responder_por_voz ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-center text-xs text-muted-foreground">
                  {processing ? "Processando..." : isRecording ? "Ouvindo... toque para enviar" : "Toque no microfone"}
                </p>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
