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
import { matchRotaPorFala, matchRotaComCandidatos, type RotaSistema } from "@/lib/voz/rotasSistema";
import RelatorioVozWizard from "@/components/voz/RelatorioVozWizard";

type Config = {
  wake_word_ativo: boolean;
  responder_por_voz: boolean;
  voz: string;
  wake_word: string;
};

type LogItem = { user: string; assistant: string; ts: number };

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
  tabela_base?: string | null; tipo_fonte?: "tabela" | "api";
  filtros_disponiveis?: any[]; campos_exibicao?: any[];
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
  const [ambiguas, setAmbiguas] = useState<RotaSistema[] | null>(null);
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
        const { data: rels } = await supabase.from("relatorios_voz")
          .select("id, nome, grupo, descricao, prompt_geracao, tipo_saida, aliases, ativo")
          .eq("estabelecimento_id", usuario.estabelecimento_id)
          .eq("ativo", true);
        setRelatorios((rels as any) || []);
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
              setShowConfig(false);
              setHistory([]);
              setAmbiguas(null);
              setInterimText("");
              setManualText("");
              setRelatorioMode(null);
              setGrupoSelecionado(null);
              setRelatorioAtual(null);
              setResultadoRelatorio("");
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

  // ---------- Gerar relatório ----------
  const gerarRelatorio = async (r: RelatorioVoz) => {
    setRelatorioAtual(r);
    setRelatorioMode("gerando");
    setResultadoRelatorio("");
    setOpen(true);
    if (cfg.responder_por_voz) falar(`Gerando ${r.nome}.`);
    try {
      const promptSistema =
        `Você é um analista. Gere o relatório "${r.nome}" (grupo: ${r.grupo}, tipo: ${r.tipo_saida}). ` +
        `Instruções do usuário: ${r.prompt_geracao}. ` +
        `Responda em português, formatado em Markdown com títulos, tabelas e/ou bullets conforme apropriado. ` +
        `Se não tiver dados reais disponíveis, indique claramente e sugira quais fontes seriam necessárias.`;
      const chatResp = await supabase.functions.invoke("assistente-voz-chat", {
        body: { transcricao: promptSistema, messages: [] },
      });
      if (chatResp.error) throw new Error(chatResp.error.message);
      const resposta = chatResp.data?.resposta || "Não foi possível gerar o relatório.";
      setResultadoRelatorio(resposta);
      setRelatorioMode("resultado");
    } catch (e: any) {
      toast.error(e.message);
      setResultadoRelatorio(`Erro ao gerar: ${e.message}`);
      setRelatorioMode("resultado");
    }
  };

  // ---------- Processa texto ----------
  // Apenas 2 intenções: (1) ABRIR TELA (por título) e (2) RELATÓRIOS.
  const processarTexto = async (texto: string) => {
    setProcessing(true);
    try {
      const t = norm(texto);

      // 1) Gatilho de "mostrar relatórios" → abre lista de grupos
      if (GATILHOS_RELATORIOS.some(g => t === g || t.startsWith(g + " ") || t.endsWith(" " + g))) {
        setRelatorioMode("grupos");
        setGrupoSelecionado(null);
        const resposta = relatorios.length === 0
          ? "Você ainda não tem relatórios cadastrados. Cadastre em Admin > Relatórios por Voz."
          : "Escolha um grupo de relatórios.";
        setHistory(h => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));
        if (cfg.responder_por_voz) falar(resposta);
        return;
      }

      // 2) Relatório específico pelo nome/alias
      const rel = relatorios.find(r => {
        if (norm(r.nome) === t) return true;
        if (r.aliases?.some(a => norm(a) === t)) return true;
        // parcial: "gerar vendas por vendedor"
        return r.aliases?.some(a => t.includes(norm(a))) || t.includes(norm(r.nome));
      });
      if (rel) {
        setHistory(h => [...h, { user: texto, assistant: `Gerando ${rel.nome}…`, ts: Date.now() }].slice(-10));
        await gerarRelatorio(rel);
        return;
      }

      // 3) Abrir tela por título (match local instantâneo com desambiguação)
      const { escolhida, topN } = matchRotaComCandidatos(texto);
      if (escolhida) {
        const resposta = `Abrindo ${escolhida.titulo}.`;
        setHistory((h) => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));
        setAmbiguas(null);
        if (cfg.responder_por_voz) falar(resposta);
        setTimeout(() => { navigate(escolhida.path); setOpen(false); }, 350);
        return;
      }

      // 3b) Ambíguo? mostra opções (sem inventar)
      const candidatosBons = topN.filter((c) => c.score >= 40).map((c) => c.rota);
      if (candidatosBons.length > 0) {
        const resposta = "Não tenho certeza. Escolha uma tela abaixo:";
        setHistory((h) => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));
        setAmbiguas(candidatosBons.slice(0, 5));
        if (cfg.responder_por_voz) falar(resposta);
        return;
      }

      // 4) Nada reconhecido — resposta guiada, sem alucinação
      const resposta =
        `Não entendi. Só respondo a duas coisas: "abrir <nome da tela>" ou "relatórios" para ver a lista.`;
      setHistory(h => [...h, { user: texto, assistant: resposta, ts: Date.now() }].slice(-10));
      setAmbiguas(null);
      if (cfg.responder_por_voz) falar(resposta);
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

  // Sempre abre limpo, na aba do chat
  const abrirLimpo = useCallback(() => {
    setShowConfig(false);
    setHistory([]);
    setAmbiguas(null);
    setInterimText("");
    setManualText("");
    setRelatorioMode(null);
    setGrupoSelecionado(null);
    setRelatorioAtual(null);
    setResultadoRelatorio("");
    setOpen(true);
  }, []);

  // ---------- UI ----------
  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={abrirLimpo}
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
                  {/* Fluxo de RELATÓRIOS */}
                  {relatorioMode && (
                    <div className="rounded-lg border-2 border-primary/40 bg-primary/5 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-semibold text-primary flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {relatorioMode === "grupos" && "Escolha um grupo"}
                          {relatorioMode === "lista" && `Grupo: ${grupoSelecionado}`}
                          {relatorioMode === "gerando" && `Gerando: ${relatorioAtual?.nome}…`}
                          {relatorioMode === "resultado" && (relatorioAtual?.nome || "Relatório")}
                        </div>
                        <button
                          onClick={() => { setRelatorioMode(null); setGrupoSelecionado(null); setRelatorioAtual(null); setResultadoRelatorio(""); }}
                          className="p-1 hover:bg-background rounded"
                        ><X className="h-3 w-3" /></button>
                      </div>

                      {relatorioMode === "grupos" && (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.from(new Set(relatorios.map(r => r.grupo))).sort().map(g => (
                            <button key={g}
                              onClick={() => { setGrupoSelecionado(g); setRelatorioMode("lista"); }}
                              className="text-xs px-2.5 py-1 rounded-full border bg-background hover:bg-primary/10 transition"
                            >{g} ({relatorios.filter(r => r.grupo === g).length})</button>
                          ))}
                          {relatorios.length === 0 && (
                            <div className="text-xs text-muted-foreground">
                              Nenhum relatório cadastrado.{" "}
                              <button className="underline" onClick={() => { navigate("/admin/relatorios-voz"); setOpen(false); }}>
                                Cadastrar agora
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {relatorioMode === "lista" && grupoSelecionado && (
                        <div className="space-y-1">
                          {relatorios.filter(r => r.grupo === grupoSelecionado).map(r => (
                            <button key={r.id}
                              onClick={() => gerarRelatorio(r)}
                              className="w-full text-left text-sm px-2.5 py-1.5 rounded border bg-background hover:bg-primary/10 transition"
                            >
                              <div className="font-medium">{r.nome}</div>
                              {r.descricao && <div className="text-[11px] text-muted-foreground">{r.descricao}</div>}
                            </button>
                          ))}
                          <button
                            onClick={() => { setRelatorioMode("grupos"); setGrupoSelecionado(null); }}
                            className="text-xs text-muted-foreground hover:text-foreground pl-1"
                          >← voltar aos grupos</button>
                        </div>
                      )}

                      {relatorioMode === "gerando" && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Aguarde…
                        </div>
                      )}

                      {relatorioMode === "resultado" && (
                        <div className="text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
                          {resultadoRelatorio}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Home — 2 intenções */}
                  {history.length === 0 && !isRecording && !processing && !ambiguas && !relatorioMode && (
                    <div className="space-y-3">
                      <div className="text-center py-2">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Diga "{cfg.wake_word}" ou toque no mic</div>
                        <div className="text-[11px] text-muted-foreground mt-1">Só entendo 2 comandos: <b>abrir &lt;tela&gt;</b> ou <b>relatórios</b></div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" /> ABRIR TELA
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {SUGESTOES_ABRIR.map((s) => (
                            <button key={s} onClick={() => processarTexto(s)}
                              className="text-xs px-2.5 py-1 rounded-full border bg-muted/40 hover:bg-muted transition"
                            >{s}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> RELATÓRIOS
                        </div>
                        <button
                          onClick={() => processarTexto("relatorios")}
                          className="w-full text-sm px-3 py-2 rounded border-2 border-primary/40 bg-primary/5 hover:bg-primary/10 transition font-medium"
                        >
                          📊 Ver meus relatórios ({relatorios.length})
                        </button>
                      </div>

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

                  {/* Desambiguação: opções quando o match não é claro — aparece no final do chat */}
                  {ambiguas && ambiguas.length > 0 && (
                    <div className="rounded-lg border-2 border-yellow-500/40 bg-yellow-500/5 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                          Não tenho certeza. Qual tela você quer abrir?
                        </div>
                        <button onClick={() => setAmbiguas(null)} className="p-1 hover:bg-background rounded">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="space-y-1">
                        {ambiguas.map((r) => (
                          <button
                            key={r.path}
                            onClick={() => { navigate(r.path); setAmbiguas(null); setOpen(false); }}
                            className="w-full text-left text-sm px-2.5 py-1.5 rounded border bg-background hover:bg-primary/10 transition"
                          >
                            <div className="font-medium">{r.titulo}</div>
                            <div className="text-[11px] text-muted-foreground">{r.path}</div>
                          </button>
                        ))}
                      </div>
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
