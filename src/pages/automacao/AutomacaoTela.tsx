import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BlocoCard from "@/components/automacao/BlocoCard";
import {
  Ambiente, Bloco, TELA_PADRAO, listarAmbientes, listarBlocos, urlImagemAutomacao,
} from "@/lib/automacao/api";

const COLUNAS = 12;
const ALTURA_LINHA = 74;
const ESPACO = 8;

interface PosLivre { l: number; t: number; w: number; h: number }

const posLivre = (b: Bloco, cx: number): PosLivre => {
  const p = (b.config as any)?.pos;
  if (p && typeof p.l === "number") return p as PosLivre;
  return {
    l: b.x * cx,
    t: b.y * (ALTURA_LINHA + ESPACO),
    w: Math.max(60, b.w * cx - ESPACO),
    h: b.h * ALTURA_LINHA + (b.h - 1) * ESPACO,
  };
};

/**
 * Tela do painel de Automação para telas remotas (TV, totem, monitor de parede).
 * Funciona com mouse/toque normalmente: os elementos continuam clicáveis, só não
 * é possível editar. Aceita na barra de endereço:
 *   ?ambiente=<id|todos>&largura=1920&altura=1080&barra=0
 */
export default function AutomacaoTela() {
  const [params, setParams] = useSearchParams();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [estados, setEstados] = useState<Record<string, boolean | null>>({});
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const palcoRef = useRef<HTMLDivElement | null>(null);

  const pedido = params.get("ambiente") || "todos";
  const todos = pedido === "todos";
  const mostrarBarra = params.get("barra") !== "0";
  const [ambienteId, setAmbienteId] = useState<string>(todos ? "" : pedido);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([listarAmbientes(), listarBlocos()]);
      setAmbientes(a);
      setBlocos(b);
      setAmbienteId((atual) => (a.some((x) => x.id === atual) ? atual : a[0]?.id || ""));
    })();
  }, []);

  const ambienteAtual = ambientes.find((a) => a.id === ambienteId);
  const telaL = Number(params.get("largura")) || ambienteAtual?.tela_largura || TELA_PADRAO.largura;
  const telaA = Number(params.get("altura")) || ambienteAtual?.tela_altura || TELA_PADRAO.altura;
  const fundoAjuste = ambienteAtual?.fundo_ajuste ?? "cobrir";
  const fundoOpacidade = Math.max(0, Math.min(100, ambienteAtual?.fundo_opacidade ?? 100)) / 100;

  useEffect(() => {
    let ativo = true;
    const caminho = ambienteAtual?.fundo_caminho;
    if (!caminho) { setFundoUrl(null); return; }
    if (/^https?:\/\//.test(caminho)) { setFundoUrl(caminho); return; }
    urlImagemAutomacao(caminho).then((u) => { if (ativo) setFundoUrl(u); });
    return () => { ativo = false; };
  }, [ambienteAtual?.fundo_caminho]);

  // Encaixa a tela de parede inteira no espaço disponível, sem barra de rolagem.
  const ultimaMedida = useRef({ l: 0, a: 0 });

  useEffect(() => {
    const alvo = palcoRef.current;
    if (!alvo) return;
    ultimaMedida.current = { l: 0, a: 0 };
    const medir = () => {
      const l = alvo.clientWidth || telaL;
      const a = alvo.clientHeight || telaA;
      // Ignora variações pequenas para a tela de fundo não recarregar em loop.
      if (Math.abs(l - ultimaMedida.current.l) < 8 && Math.abs(a - ultimaMedida.current.a) < 8) return;
      ultimaMedida.current = { l, a };
      setEscala(Math.max(0.05, Math.min(l / telaL, a / telaA)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(alvo);
    return () => ro.disconnect();
  }, [telaL, telaA, ambienteId]);

  const doAmbiente = blocos.filter((b) => b.ambiente_id === ambienteId && b.visivel !== false);
  const camadaDe = (b: Bloco) => Number((b.config as any)?.camada ?? 0);
  const ordenados = [...doAmbiente].sort((a, b) => camadaDe(a) - camadaDe(b));
  const cx = telaL / COLUNAS;
  const livre = (ambienteAtual?.modo ?? "grade") === "livre";

  const trocarAmbiente = (id: string) => {
    setAmbienteId(id);
    if (!todos) {
      const p = new URLSearchParams(params);
      p.set("ambiente", id);
      setParams(p, { replace: true });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {mostrarBarra && todos && ambientes.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-card/60 px-3 py-2">
          {ambientes.map((a) => (
            <button
              key={a.id}
              onClick={() => trocarAmbiente(a.id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                a.id === ambienteId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
              }`}
            >
              {a.nome}
            </button>
          ))}
        </div>
      )}

      <div ref={palcoRef} className="relative flex-1 min-h-0 overflow-hidden">
        <div
          className={livre ? "absolute left-1/2 top-1/2 overflow-hidden" : "absolute left-1/2 top-1/2 grid gap-2 overflow-hidden"}
          style={{
            width: telaL,
            height: telaA,
            transform: `translate(-50%, -50%) scale(${escala})`,
            ...(livre ? {} : { gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))`, gridAutoRows: `${ALTURA_LINHA}px` }),
          }}
        >
          {fundoUrl && (
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage: `url(${fundoUrl})`,
                backgroundSize: fundoAjuste === "conter" ? "contain" : fundoAjuste === "esticar" ? "100% 100%" : "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                opacity: fundoOpacidade,
              }}
            />
          )}
          {ordenados.map((b, indice) => {
            const p = livre ? posLivre(b, cx) : null;
            return (
              <div
                key={b.id}
                className="relative"
                style={
                  p
                    ? { position: "absolute", left: p.l, top: p.t, width: p.w, height: p.h, zIndex: indice + 1 }
                    : { gridColumn: `${b.x + 1} / span ${b.w}`, gridRow: `${b.y + 1} / span ${b.h}`, zIndex: indice + 1 }
                }
              >
                <BlocoCard
                  bloco={b}
                  ligado={estados[b.id] ?? null}
                  edicao={false}
                  onEstado={(v) => setEstados((s) => ({ ...s, [b.id]: v }))}
                />
              </div>
            );
          })}
          {!ordenados.length && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
              Nenhum elemento neste ambiente.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
