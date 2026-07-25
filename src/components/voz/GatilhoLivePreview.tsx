import { ExternalLink, MessagesSquare, PieChart, Mic, Sparkles, BarChart3, Save, Volume2 } from "lucide-react";

interface Props {
  tipo?: string;
  payload?: any;
  frase?: string;
  resposta?: string | null;
  provedorLabel?: string;
}

/**
 * Prévia em tempo real do que acontecerá quando o gatilho for disparado.
 * Renderiza uma simulação visual (janela do navegador, popup ou chat) conforme o tipo de ação.
 */
export function GatilhoLivePreview({ tipo, payload, frase, resposta, provedorLabel }: Props) {
  const cfg = payload || {};
  const fraseFmt = frase?.trim() ? `"${frase.trim()}"` : '"(diga a frase gatilho)"';

  return (
    <div className="rounded-lg border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-3 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
          <Mic className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
            Prévia em tempo real
          </div>
          <div className="text-xs font-medium truncate">Você fala: {fraseFmt}</div>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="text-[10px] text-muted-foreground">↓ o Pilar executa ↓</div>
      </div>

      {/* ABRIR PROGRAMA */}
      {tipo === "abrir_programa" && (
        <div className="rounded-md border bg-background shadow-sm overflow-hidden">
          <div className="bg-muted/70 px-2 py-1 flex items-center gap-1.5 border-b">
            <div className="w-2 h-2 rounded-full bg-red-400" />
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <div className="ml-2 flex-1 text-[10px] font-mono bg-background/60 rounded px-1.5 py-0.5 truncate">
              pilar.app{cfg.path || "/…"}
            </div>
          </div>
          <div className="p-3">
            <div className="flex items-center gap-2 mb-1">
              <ExternalLink className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold truncate">{cfg.label || "(escolha um programa)"}</span>
            </div>
            {cfg.instrucao ? (
              <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 p-2 flex gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                <div className="text-xs">
                  <div className="text-[10px] uppercase text-primary font-bold mb-0.5">Instrução ao abrir</div>
                  <div className="text-foreground line-clamp-3">{cfg.instrucao}</div>
                </div>
              </div>
            ) : (
              <div className="text-[10px] text-muted-foreground italic">Sem instrução — apenas abre a tela.</div>
            )}
          </div>
        </div>
      )}

      {/* POPUP EM TELA */}
      {tipo === "popup_tela" && (
        <div className="relative rounded-md bg-muted/40 border p-4 min-h-[110px]">
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] rounded-md" />
          <div className="relative rounded-lg bg-background shadow-lg border p-3 max-w-[92%] mx-auto">
            <div className="flex items-center gap-1.5 mb-1.5">
              <PieChart className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase font-bold text-primary">Popup no sistema</span>
            </div>
            <div className="text-xs text-foreground line-clamp-3">
              {cfg.prompt || "(o que trazer no popup?)"}
            </div>
            {cfg.mostrar_grafico && (
              <div className="mt-2 flex items-end gap-1 h-10 bg-muted/40 rounded p-1.5">
                <div className="flex-1 bg-primary/60 rounded-sm" style={{ height: "40%" }} />
                <div className="flex-1 bg-primary/80 rounded-sm" style={{ height: "70%" }} />
                <div className="flex-1 bg-primary rounded-sm" style={{ height: "95%" }} />
                <div className="flex-1 bg-primary/70 rounded-sm" style={{ height: "55%" }} />
                <div className="flex-1 bg-primary/50 rounded-sm" style={{ height: "30%" }} />
                <BarChart3 className="w-3 h-3 text-muted-foreground ml-1" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONVERSA */}
      {tipo === "conversa" && (
        <div className="rounded-md border bg-background p-2 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <MessagesSquare className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase font-bold text-primary">Conversa livre</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {provedorLabel || cfg.provedor || "interno"}
            </span>
          </div>
          {cfg.contexto && (
            <div className="text-[10px] italic text-muted-foreground bg-muted/40 rounded px-2 py-1 line-clamp-2">
              Contexto: {cfg.contexto}
            </div>
          )}
          <div className="flex justify-end">
            <div className="max-w-[80%] text-xs bg-primary text-primary-foreground rounded-lg rounded-br-sm px-2 py-1">
              {fraseFmt}
            </div>
          </div>
          <div className="flex justify-start">
            <div className="max-w-[80%] text-xs bg-muted rounded-lg rounded-bl-sm px-2 py-1 text-muted-foreground">
              {cfg.resumir === false ? "Resposta completa da IA…" : "Resposta resumida da IA…"}
            </div>
          </div>
        </div>
      )}

      {/* Outros tipos - texto simples */}
      {tipo && !["abrir_programa", "popup_tela", "conversa"].includes(tipo) && (
        <div className="rounded-md border bg-background p-2 text-xs text-muted-foreground">
          Executa: <span className="font-medium text-foreground">{tipo}</span>
          {cfg.path && <span className="ml-1 font-mono">({cfg.path})</span>}
          {cfg.metrica && <span className="ml-1 font-mono">({cfg.metrica})</span>}
          {cfg.comando && <span className="ml-1 font-mono">({cfg.comando})</span>}
          {cfg.nome_automacao && <span className="ml-1 font-mono">({cfg.nome_automacao})</span>}
        </div>
      )}

      {(resposta || cfg.requer_tela_salva) && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t">
          {resposta && (
            <div className="flex items-center gap-1 text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
              <Volume2 className="w-3 h-3" />
              <span className="max-w-[220px] truncate">Fala: "{resposta}"</span>
            </div>
          )}
          {cfg.requer_tela_salva && (
            <div className="flex items-center gap-1 text-[10px] bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded">
              <Save className="w-3 h-3" /> Exige telas salvas
            </div>
          )}
        </div>
      )}
    </div>
  );
}
