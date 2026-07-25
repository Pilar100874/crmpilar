import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Mic, MicOff, X, Loader2, Settings, Volume2, VolumeX,
  Sparkles, Radio, Zap, MessageSquare, ChevronRight, HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { matchRotaPorFala } from "@/lib/voz/rotasSistema";

type Config = {
  wake_word_ativo: boolean;
  responder_por_voz: boolean;
  voz: string;
  wake_word: string;
};

type LogItem = { user: string; assistant: string; ts: number };
type CustomCmd = { id: string; frase_gatilho: string; tipo_acao: string; payload: any; ativo: boolean };

const WAKE_DEFAULT = "ei pilar";

// Palavras que ativam o modo "listar relatórios"
const GATILHOS_RELATORIOS = [
  "relatorios", "relatorio", "meus relatorios", "lista de relatorios",
  "menu de relatorios", "mostrar relatorios", "ver relatorios", "abrir relatorios",
];

const SUGESTOES_ABRIR = [
  "Abrir dashboard",
  "Abrir orçamentos",
  "Abrir logística",
  "Abrir empresas",
];

type RelatorioVoz = {
  id: string; nome: string; grupo: string; descricao: string | null;
  prompt_geracao: string; tipo_saida: string; aliases: string[]; ativo: boolean;
};

// util: normaliza texto (remove acentos, minúsculas)
const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

export default function VoiceAssistant() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [wakeListening, setWakeListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [history, setHistory] = useState<LogItem[]>([]);
  const [customCmds, setCustomCmds] = useState<CustomCmd[]>([]);
  const [popupResult, setPopupResult] = useState<{ titulo: string; texto: string } | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<any>(null);
  const [manualText, setManualText] = useState("");

  // === Fluxo de RELATÓRIOS ===
  const [relatorios, setRelatorios] = useState<RelatorioVoz[]>([]);
  const [relatorioMode, setRelatorioMode] = useState<null | "grupos" | "lista" | "gerando" | "resultado">(null);
  const [grupoSelecionado, setGrupoSelecionado] = useState<string | null>(null);
  const [relatorioAtual, setRelatorioAtual] = useState<RelatorioVoz | null>(null);
  const [resultadoRelatorio, setResultadoRelatorio] = useState<string>("");
  const [cfg, setCfg] = useState<Config>({
    wake_word_ativo: true, // padrão ON — usuário reclamou que não dispara
    responder_por_voz: true,
    voz: "alloy",
    wake_word: WAKE_DEFAULT,
  });

  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wakeRecogRef = useRef<any>(null);
  const dictationRef = useRef<any>(null);
  const wakeRetriesRef = useRef(0);
  const wakeHeartbeatRef = useRef<any>(null);
  const shouldWakeRef = useRef(false);

  const hasWebSpeech = useMemo(
    () => typeof window !== "undefined" &&
      !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    []
  );

  // ---------- carrega config + comandos custom ----------
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("assistente_voz_config")
        .select("*").eq("auth_user_id", u.user.id).maybeSingle();
      if (data) {
        setCfg({
          wake_word_ativo: data.wake_word_ativo !== false,
          responder_por_voz: data.responder_por_voz !== false,
          voz: data.voz || "alloy",
          wake_word: data.wake_word || WAKE_DEFAULT,
        });
      }
      const { data: usuario } = await supabase.from("usuarios")
        .select("estabelecimento_id").eq("auth_user_id", u.user.id).maybeSingle();
      if (usuario?.estabelecimento_id) {
        const { data: cmds } = await supabase.from("assistente_voz_comandos")
          .select("id, frase_gatilho, tipo_acao, payload, ativo")
          .eq("estabelecimento_id", usuario.estabelecimento_id)
          .eq("ativo", true);
        setCustomCmds((cmds as any) || []);
      }
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

  // ---------- Wake word robusto ----------
  const stopWake = useCallback(() => {
    shouldWakeRef.current = false;
    try { wakeRecogRef.current?.abort?.(); } catch {}
    try { wakeRecogRef.current?.stop?.(); } catch {}
    wakeRecogRef.current = null;
    if (wakeHeartbeatRef.current) { clearInterval(wakeHeartbeatRef.current); wakeHeartbeatRef.current = null; }
    setWakeListening(false);
  }, []);

  const startWake = useCallback(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (wakeRecogRef.current) return; // já rodando
    shouldWakeRef.current = true;
    try {
      const rec = new SR();
      rec.lang = "pt-BR";
      rec.continuous = true;
      rec.interimResults = true;
      const target = norm(cfg.wake_word || WAKE_DEFAULT);

      rec.onstart = () => { setWakeListening(true); wakeRetriesRef.current = 0; };
      rec.onresult = (e: any) => {
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const txt = norm(e.results[i][0]?.transcript || "");
          if (!txt) continue;
          // aceita "ei pilar", "hey pilar", "oi pilar", "pilar" isolado
          const matched =
            txt.includes(target) ||
            txt.includes("ei pilar") ||
            txt.includes("hey pilar") ||
            txt.includes("oi pilar") ||
            /\bpilar\b/.test(txt);
          if (matched) {
            try { rec.stop(); } catch {}
            wakeRecogRef.current = null;
            setWakeListening(false);
            // beep + abre e grava
            playChime();
            setTimeout(() => {
              setOpen(true);
              startDictation();
            }, 150);
            return;
          }
        }
      };
      rec.onerror = (ev: any) => {
        // no-speech / aborted são normais — só reinicia
        const fatal = ev?.error === "not-allowed" || ev?.error === "service-not-allowed";
        if (fatal) {
          shouldWakeRef.current = false;
          setWakeListening(false);
          toast.error("Permissão de microfone negada. Ative nas configurações do navegador.");
        }
      };
      rec.onend = () => {
        wakeRecogRef.current = null;
        setWakeListening(false);
        if (!shouldWakeRef.current) return;
        // reinicia com backoff curto
        wakeRetriesRef.current = Math.min(wakeRetriesRef.current + 1, 5);
        const delay = Math.min(300 * wakeRetriesRef.current, 2000);
        setTimeout(() => { if (shouldWakeRef.current) startWake(); }, delay);
      };
      rec.start();
      wakeRecogRef.current = rec;
    } catch (e) {
      // se falhar, tenta de novo mais tarde
      setTimeout(() => { if (shouldWakeRef.current) startWake(); }, 1500);
    }
  }, [cfg.wake_word]);

  // Efeito: liga/desliga wake conforme config e estado do painel
  useEffect(() => {
    if (cfg.wake_word_ativo && !isRecording && !processing) {
      startWake();
      // heartbeat: se por algum motivo parar sem onend, reinicia a cada 20s
      wakeHeartbeatRef.current = setInterval(() => {
        if (shouldWakeRef.current && !wakeRecogRef.current) startWake();
      }, 20000);
    } else {
      stopWake();
    }
    return () => stopWake();
  }, [cfg.wake_word_ativo, cfg.wake_word, isRecording, processing, startWake, stopWake]);

  // ---------- Chime ----------
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
      g.gain.setValueAtTime(0.15, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      o.start(); o.stop(ctx.currentTime + 0.2);
      setTimeout(() => ctx.close(), 300);
    } catch {}
  };

  // ---------- Ditado (Web Speech como STT primário) ----------
  const startDictation = useCallback(async () => {
    if (isRecording || processing) return;
    setInterimText("");

    // 1) tenta Web Speech (rápido, sem upload)
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.lang = "pt-BR";
        rec.continuous = false;
        rec.interimResults = true;
        let finalTxt = "";
        rec.onresult = (e: any) => {
          let interim = "";
          for (let i = e.resultIndex; i < e.results.length; i++) {
            const t = e.results[i][0]?.transcript || "";
            if (e.results[i].isFinal) finalTxt += t + " ";
            else interim += t;
          }
          setInterimText((finalTxt + interim).trim());
        };
        rec.onerror = (ev: any) => {
          if (ev?.error === "no-speech") { setIsRecording(false); return; }
          if (ev?.error === "not-allowed") { toast.error("Sem permissão de microfone"); setIsRecording(false); }
        };
        rec.onend = () => {
          setIsRecording(false);
          dictationRef.current = null;
          const txt = finalTxt.trim() || interimText.trim();
          setInterimText("");
          if (txt) processarTexto(txt);
        };
        rec.start();
        dictationRef.current = rec;
        setIsRecording(true);
        return;
      } catch {
        // cai para MediaRecorder abaixo
      }
    }

    // 2) Fallback: grava e envia pra Whisper (edge function)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 1200) { setIsRecording(false); return; }
        await transcreverEProcessar(blob);
      };
      rec.start();
      mediaRecRef.current = rec;
      setIsRecording(true);
    } catch {
      toast.error("Sem acesso ao microfone");
    }
  }, [isRecording, processing, interimText]);

  const stopDictation = () => {
    try { dictationRef.current?.stop?.(); } catch {}
    if (mediaRecRef.current && mediaRecRef.current.state !== "inactive") {
      try { mediaRecRef.current.stop(); } catch {}
    }
    setIsRecording(false);
  };

  const transcreverEProcessar = async (blob: Blob) => {
    setProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append("file", blob, "recording.webm");
      const trResp = await fetch(
        `https://ioxugupvxlcdweldocmq.supabase.co/functions/v1/assistente-voz-transcribe`,
        { method: "POST", headers: { Authorization: `Bearer ${session?.access_token}` }, body: fd }
      );
      const trJson = await trResp.json();
      if (!trResp.ok) throw new Error(trJson.error || "Falha na transcrição");
      const texto = (trJson.text || "").trim();
      if (!texto) { toast.error("Não entendi"); return; }
      await processarTexto(texto);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  // ---------- Processa texto ----------
  const processarTexto = async (texto: string) => {
    setProcessing(true);
    try {
      // 1) Match local por título de tela — abre instantaneamente sem chamar IA
      const rotaMatch = matchRotaPorFala(texto);
      if (rotaMatch) {
        const resposta = `Abrindo ${rotaMatch.titulo}.`;
        setHistory((h) => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));
        if (cfg.responder_por_voz) falar(resposta);
        setTimeout(() => { navigate(rotaMatch.path); setOpen(false); }, 350);
        return;
      }

      const chatResp = await supabase.functions.invoke("assistente-voz-chat", {
        body: { transcricao: texto, messages: history.slice(-4).flatMap((h) => [
          { role: "user", content: h.user }, { role: "assistant", content: h.assistant },
        ]) },
      });
      if (chatResp.error) throw new Error(chatResp.error.message);
      const { resposta, acao } = chatResp.data;

      setHistory((h) => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));

      // Executa ação
      if (acao?.tipo === "navegar_para" && acao.path) {
        setTimeout(() => { navigate(acao.path); setOpen(false); }, 500);
      } else if (acao?.tipo === "popup_tela") {
        setPopupResult({ titulo: acao.titulo || "Resultado", texto: acao.texto || resposta });
      } else if (acao?.tipo === "iniciar_conversa") {
        // apenas mantém painel aberto
      } else if (acao?.tipo === "confirmar_disparo_bot" || acao?.tipo === "confirmar_comando_tv") {
        setPendingConfirm(acao);
      }

      if (cfg.responder_por_voz && resposta) falar(resposta);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setProcessing(false);
    }
  };

  const falar = async (texto: string) => {
    // 1) tenta TTS nativa (rápido, gratuito)
    try {
      if ("speechSynthesis" in window) {
        const u = new SpeechSynthesisUtterance(texto);
        u.lang = "pt-BR";
        u.rate = 1.05;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        return;
      }
    } catch {}
    // 2) fallback: TTS server-side
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
    toast.success("Ação confirmada.");
    setPendingConfirm(null);
  };

  // Push-to-talk com barra de espaço enquanto painel aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isRecording && !processing &&
          !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        startDictation();
      }
      if (e.code === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, isRecording, processing, startDictation]);

  // ---------- UI ----------
  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-16 right-4 z-[1000] h-12 w-12 rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-110",
          "bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground",
          wakeListening && "ring-4 ring-primary/40 animate-pulse"
        )}
        title={
          wakeListening ? `Escutando "${cfg.wake_word}"…` :
          cfg.wake_word_ativo ? "Ativando escuta…" : "Assistente por voz"
        }
      >
        {wakeListening ? <Radio className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        {wakeListening && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Painel */}
      {open && (
        <div
          className="fixed inset-0 z-[700] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-2 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <Card
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-background border shadow-2xl flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b bg-gradient-to-r from-primary/5 to-transparent">
              <div className="flex items-center gap-2 min-w-0">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm">Assistente Pilar</div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {wakeListening ? (
                      <span className="flex items-center gap-1"><Radio className="h-2.5 w-2.5 text-green-500" /> escutando "{cfg.wake_word}"</span>
                    ) : cfg.wake_word_ativo ? "ativando escuta…" : "escuta desativada"}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin/assistente-voz")} title="Gerenciar gatilhos">
                  <Zap className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConfig((s) => !s)}>
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {showConfig ? (
              <div className="p-4 space-y-4 overflow-y-auto">
                {!hasWebSpeech && (
                  <div className="rounded-md border border-yellow-500/40 bg-yellow-500/10 p-2 text-xs">
                    Este navegador não suporta escuta contínua ("ei Pilar"). Use Chrome/Edge para o wake word funcionar.
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Label>Ativação por voz ("{cfg.wake_word}")</Label>
                    <p className="text-xs text-muted-foreground">Escuta contínua em background. Diga a palavra para abrir.</p>
                  </div>
                  <Switch checked={cfg.wake_word_ativo} onCheckedChange={(v) => salvarConfig({ wake_word_ativo: v })} />
                </div>
                <div>
                  <Label className="text-xs">Palavra de ativação</Label>
                  <Input
                    value={cfg.wake_word}
                    onChange={(e) => setCfg({ ...cfg, wake_word: e.target.value })}
                    onBlur={() => salvarConfig({ wake_word: cfg.wake_word })}
                    placeholder="ei pilar"
                    className="mt-1"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">Dica: use 2 sílabas + "pilar" para melhor detecção.</p>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Label>Responder por voz</Label>
                    <p className="text-xs text-muted-foreground">Fala a resposta em áudio</p>
                  </div>
                  <Switch checked={cfg.responder_por_voz} onCheckedChange={(v) => salvarConfig({ responder_por_voz: v })} />
                </div>
                <Button variant="outline" className="w-full" onClick={() => { stopWake(); setTimeout(startWake, 300); toast.success("Escuta reiniciada"); }}>
                  <Radio className="h-4 w-4 mr-2" /> Reiniciar escuta
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {/* Popup result */}
                  {popupResult && (
                    <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 relative">
                      <button onClick={() => setPopupResult(null)} className="absolute top-1 right-1 p-1 hover:bg-background rounded">
                        <X className="h-3 w-3" />
                      </button>
                      <div className="text-xs font-semibold text-primary mb-1">{popupResult.titulo}</div>
                      <div className="text-sm whitespace-pre-wrap">{popupResult.texto}</div>
                    </div>
                  )}

                  {/* Histórico */}
                  {history.length === 0 && !isRecording && !processing && !popupResult && (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diga "{cfg.wake_word}" ou toque no mic</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <HelpCircle className="h-3 w-3" /> EXEMPLOS
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {QUICK_SUGGESTIONS.map((s) => (
                            <button
                              key={s}
                              onClick={() => processarTexto(s)}
                              className="text-xs px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-muted transition"
                            >{s}</button>
                          ))}
                        </div>
                      </div>
                      {customCmds.length > 0 && (
                        <div>
                          <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                            <Zap className="h-3 w-3" /> SEUS GATILHOS ({customCmds.length})
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {customCmds.slice(0, 8).map((c) => (
                              <button
                                key={c.id}
                                onClick={() => processarTexto(c.frase_gatilho)}
                                className="text-xs px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10 transition"
                              >{c.frase_gatilho}</button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {history.map((h, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex justify-end">
                        <div className="text-sm bg-primary text-primary-foreground rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[85%]">{h.user}</div>
                      </div>
                      <div className="flex justify-start">
                        <div className="text-sm bg-muted rounded-2xl rounded-bl-sm px-3 py-1.5 max-w-[85%]">{h.assistant}</div>
                      </div>
                    </div>
                  ))}

                  {isRecording && (
                    <div className="flex justify-end">
                      <div className="text-sm bg-primary/70 text-primary-foreground rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[85%] italic">
                        {interimText || "ouvindo…"}
                      </div>
                    </div>
                  )}
                  {processing && (
                    <div className="flex justify-start">
                      <div className="text-sm bg-muted rounded-2xl rounded-bl-sm px-3 py-1.5 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> pensando…
                      </div>
                    </div>
                  )}

                  {pendingConfirm && (
                    <div className="border border-yellow-500/40 bg-yellow-500/10 rounded-lg p-2 flex gap-2">
                      <Button size="sm" onClick={executarConfirmacao}>Confirmar</Button>
                      <Button size="sm" variant="ghost" onClick={() => setPendingConfirm(null)}>Cancelar</Button>
                    </div>
                  )}
                </div>

                {/* Composer */}
                <div className="border-t p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      value={manualText}
                      onChange={(e) => setManualText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && manualText.trim()) {
                          const t = manualText.trim();
                          setManualText("");
                          processarTexto(t);
                        }
                      }}
                      placeholder="Ou digite aqui…"
                      className="h-9 text-sm"
                      disabled={processing}
                    />
                    <Button
                      size="icon"
                      onClick={isRecording ? stopDictation : startDictation}
                      disabled={processing}
                      className={cn(
                        "h-12 w-12 rounded-full shrink-0",
                        isRecording && "bg-destructive hover:bg-destructive/90 animate-pulse"
                      )}
                    >
                      {processing ? <Loader2 className="h-5 w-5 animate-spin" /> :
                        isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Button
                      variant="outline" size="icon" className="h-9 w-9"
                      onClick={() => salvarConfig({ responder_por_voz: !cfg.responder_por_voz })}
                      title={cfg.responder_por_voz ? "Silenciar voz" : "Ativar voz"}
                    >
                      {cfg.responder_por_voz ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Segure <kbd className="px-1 rounded bg-muted">espaço</kbd> para falar</span>
                    <span className="flex items-center gap-1">
                      {wakeListening && <><span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> escuta ativa</>}
                    </span>
                  </div>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
