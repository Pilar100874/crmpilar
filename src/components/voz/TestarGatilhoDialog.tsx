import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mic, ExternalLink, PieChart, MessagesSquare, BarChart3, Sparkles, Volume2, Bot, User as UserIcon } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tipo?: string;
  payload?: any;
  frase?: string;
  resposta?: string | null;
  provedorLabel?: string;
  responderPorVoz?: boolean;
}

const EXEMPLOS: Record<string, any> = {
  abrir_programa: { label: "Dashboard", path: "/", instrucao: "cadastrar CNPJ 12.345.678/0001-90 com nome Empresa Exemplo" },
  popup_tela: { prompt: "qual vendedor vendeu mais hoje?", mostrar_grafico: true },
  conversa: { contexto: "você é um consultor comercial focado em pós-venda", provedor: "interno", resumir: true },
};

function falarSeAtivo(texto: string, ativo?: boolean) {
  if (!ativo || !texto) return;
  try {
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = "pt-BR";
    window.speechSynthesis?.cancel();
    window.speechSynthesis?.speak(u);
  } catch {}
}

export function TestarGatilhoDialog({
  open, onOpenChange, tipo, payload, frase, resposta, provedorLabel, responderPorVoz,
}: Props) {
  const navigate = useNavigate();
  const cfg = { ...(EXEMPLOS[tipo || ""] || {}), ...(payload || {}) };
  const fraseFmt = (frase?.trim() || "abrir cadastro de clientes");

  const [step, setStep] = useState<"escutando" | "resultado">("escutando");
  const [msgs, setMsgs] = useState<{ from: "user" | "bot"; text: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setStep("escutando");
    setMsgs([]);
    const t = setTimeout(() => {
      setStep("resultado");
      if (tipo === "conversa") {
        setMsgs([{ from: "user", text: fraseFmt }]);
        setTimeout(() => {
          const respTxt = cfg.resumir === false
            ? "Resposta completa da IA (exemplo): esta é uma simulação detalhada da resposta que o assistente daria com base no seu contexto e frase gatilho."
            : "Resposta resumida (exemplo): tudo certo por aqui!";
          setMsgs((m) => [...m, { from: "bot", text: respTxt }]);
          falarSeAtivo(resposta || respTxt, responderPorVoz);
        }, 700);
      } else {
        falarSeAtivo(resposta || "", responderPorVoz);
      }
    }, 900);
    return () => clearTimeout(t);
  }, [open, tipo]);

  const handleAbrirPrograma = () => {
    if (!cfg.path) { toast.error("Nenhum programa selecionado"); return; }
    toast.success(`Abrindo ${cfg.label || cfg.path}${cfg.instrucao ? " com instrução" : ""}`);
    onOpenChange(false);
    setTimeout(() => navigate(cfg.path), 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" /> Simulação do gatilho
          </DialogTitle>
          <DialogDescription>
            Isto é uma simulação com dados de exemplo — nada é salvo no banco.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-2 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${step === "escutando" ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="text-xs text-muted-foreground">
              {step === "escutando" ? "Escutando…" : "Comando reconhecido"}
            </span>
            <span className="ml-auto text-xs font-medium">"{fraseFmt}"</span>
          </div>

          {step === "resultado" && tipo === "abrir_programa" && (
            <div className="rounded-md border overflow-hidden">
              <div className="bg-muted/70 px-2 py-1 flex items-center gap-1.5 border-b">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <div className="w-2 h-2 rounded-full bg-green-400" />
                <div className="ml-2 flex-1 text-[10px] font-mono bg-background/60 rounded px-1.5 py-0.5 truncate">
                  pilar.app{cfg.path || "/…"}
                </div>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{cfg.label || "(programa exemplo)"}</span>
                </div>
                {cfg.instrucao && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-2 flex gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    <div className="text-xs">{cfg.instrucao}</div>
                  </div>
                )}
                <Button size="sm" className="mt-3 w-full" onClick={handleAbrirPrograma}>
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Abrir agora
                </Button>
              </div>
            </div>
          )}

          {step === "resultado" && tipo === "popup_tela" && (
            <div className="rounded-md border bg-background p-3 shadow-sm">
              <div className="flex items-center gap-1.5 mb-2">
                <PieChart className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase text-primary">Popup</span>
              </div>
              <div className="text-sm mb-2">{cfg.prompt || "(sem prompt)"}</div>
              <div className="rounded bg-muted/40 p-2 text-xs text-muted-foreground italic">
                Resultado simulado: Vendedor João Silva — R$ 12.480,00 (3 pedidos)
              </div>
              {cfg.mostrar_grafico && (
                <div className="mt-2 flex items-end gap-1 h-14 bg-muted/40 rounded p-1.5">
                  {[40, 70, 95, 55, 30, 60].map((h, i) => (
                    <div key={i} className="flex-1 bg-primary rounded-sm" style={{ height: `${h}%`, opacity: 0.5 + i * 0.08 }} />
                  ))}
                  <BarChart3 className="w-3 h-3 text-muted-foreground ml-1" />
                </div>
              )}
            </div>
          )}

          {step === "resultado" && tipo === "conversa" && (
            <div className="rounded-md border bg-background p-2 space-y-2 max-h-64 overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessagesSquare className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] uppercase font-bold text-primary">Conversa livre</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{provedorLabel || cfg.provedor}</span>
              </div>
              {cfg.contexto && (
                <div className="text-[10px] italic text-muted-foreground bg-muted/40 rounded px-2 py-1">
                  Contexto: {cfg.contexto}
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} className={`flex gap-1.5 ${m.from === "user" ? "justify-end" : "justify-start"}`}>
                  {m.from === "bot" && <Bot className="w-4 h-4 text-primary mt-1 shrink-0" />}
                  <div className={`max-w-[80%] text-xs rounded-lg px-2 py-1.5 ${
                    m.from === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted rounded-bl-sm"
                  }`}>{m.text}</div>
                  {m.from === "user" && <UserIcon className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />}
                </div>
              ))}
              {msgs.length === 1 && (
                <div className="text-[10px] text-muted-foreground italic pl-6">digitando…</div>
              )}
            </div>
          )}

          {step === "resultado" && tipo && !["abrir_programa", "popup_tela", "conversa"].includes(tipo) && (
            <div className="rounded-md border bg-background p-3 text-xs text-muted-foreground">
              Ação <span className="font-medium text-foreground">{tipo}</span> executada (simulação).
            </div>
          )}

          {step === "resultado" && resposta && (
            <div className="flex items-center gap-1.5 text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-2 py-1.5 rounded">
              <Volume2 className="w-3.5 h-3.5" />
              <span>Pilar responde: "{resposta}"</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button variant="outline" onClick={() => { setStep("escutando"); setMsgs([]); setTimeout(() => setStep("resultado"), 900); }}>
            Rodar de novo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
