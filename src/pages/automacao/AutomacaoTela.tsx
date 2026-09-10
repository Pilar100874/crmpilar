import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import BlocoCard from "@/components/automacao/BlocoCard";
import {
  Ambiente, Bloco, TELA_PADRAO, TipoTela, detectarTipoTela, listarAmbientes, listarBlocos, urlImagemAutomacao,
} from "@/lib/automacao/api";
import { AmbientesNavContext } from "@/lib/automacao/navegacao";
import { PainelBlocosContext, idsDentroDeExpansiveis } from "@/lib/automacao/painelBlocos";
import { supabase } from "@/integrations/supabase/client";

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
 * Tela do painel de Automação para telas remotas (TV, computador, tablet ou celular).
 * O painel certo é escolhido sozinho pelo tamanho do aparelho; em tablet e celular
 * o painel pode rolar para baixo quando o ambiente foi montado assim.
 * Aceita na barra de endereço:
 *   ?ambiente=<id|todos>&tipo=celular&largura=1920&altura=1080&barra=0
 */
export default function AutomacaoTela() {
  const [params, setParams] = useSearchParams();
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [blocos, setBlocos] = useState<Bloco[]>([]);
  const [estados, setEstados] = useState<Record<string, boolean | null>>({});
  const [fundoUrl, setFundoUrl] = useState<string | null>(null);
  const [escala, setEscala] = useState(1);
  const [tipoAparelho, setTipoAparelho] = useState<TipoTela>(() =>
    (params.get("tipo") as TipoTela) || detectarTipoTela(),
  );
  const palcoRef = useRef<HTMLDivElement | null>(null);

  const pedido = params.get("ambiente") || "todos";
  const todos = pedido === "todos";
  // Nome da tela (grupo de abas) pedido na URL — tem prioridade sobre "ambiente".
  const telaPedida = (params.get("tela") || "").trim();
  const mostrarBarra = params.get("barra") !== "0";
  const [ambienteId, setAmbienteId] = useState<string>(todos ? "" : pedido);

  // Acompanha o tamanho da janela para saber se é TV, computador, tablet ou celular.
  useEffect(() => {
    if (params.get("tipo")) return;
    const medir = () => setTipoAparelho(detectarTipoTela());
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [params]);

  useEffect(() => {
    (async () => {
      const [todosAmbientes, b] = await Promise.all([listarAmbientes(), listarBlocos()]);
      const a = todosAmbientes.filter((x) => x.ativo !== false);
      setAmbientes(a);
      setBlocos(b);
    })();
  }, []);

  // Painel definido para o usuário logado (celular e tablet).
  const [ambienteDoUsuario, setAmbienteDoUsuario] = useState<string>("");

  useEffect(() => {
    (async () => {
      if (tipoAparelho !== "celular" && tipoAparelho !== "tablet") { setAmbienteDoUsuario(""); return; }
      const { data: sessao } = await supabase.auth.getUser();
      const authId = sessao?.user?.id;
      if (!authId) return;
      const { data } = await supabase
        .from("usuarios")
        .select("automacao_ambiente_celular, automacao_ambiente_tablet")
        .eq("auth_user_id", authId)
        .maybeSingle();
      const escolhido = tipoAparelho === "celular"
        ? (data as any)?.automacao_ambiente_celular
        : (data as any)?.automacao_ambiente_tablet;
      setAmbienteDoUsuario((escolhido as string) || "");
    })();
  }, [tipoAparelho]);

  // Ambientes da tela (grupo de abas) pedida na URL.
  const grupoTela = telaPedida
    ? ambientes.filter((a) => ((a as any).tela_nome || a.nome) === telaPedida)
    : [];

  // Escolhe sozinho o painel feito para este tipo de aparelho.
  useEffect(() => {
    if (!ambientes.length) return;
    setAmbienteId((atual) => {
      if (telaPedida) {
        if (atual && grupoTela.some((x) => x.id === atual)) return atual;
        return grupoTela[0]?.id || ambientes[0]?.id || "";
      }
      if (todos && ambienteDoUsuario && ambientes.some((x) => x.id === ambienteDoUsuario)) return ambienteDoUsuario;
      if (atual && ambientes.some((x) => x.id === atual)) return atual;
      const doTipo = ambientes.find((x) => (x.dispositivo ?? "tv") === tipoAparelho);
      return doTipo?.id || ambientes[0]?.id || "";
    });
  }, [ambientes, tipoAparelho, ambienteDoUsuario, todos, telaPedida]);

  const ambienteAtual = ambientes.find((a) => a.id === ambienteId);
  // Abas: da tela pedida, ou só dos ambientes montados para este mesmo tipo de tela.
  const doTipo = ambientes.filter((a) => (a.dispositivo ?? "tv") === tipoAparelho);
  const abas = telaPedida
    ? (grupoTela.length ? grupoTela : ambientes)
    : (doTipo.length ? doTipo : ambientes);
  const mostrarAbas = mostrarBarra && ambienteAtual?.mostrar_abas !== false && abas.length > 1;
  const telaL = Number(params.get("largura")) || ambienteAtual?.tela_largura || TELA_PADRAO.largura;
  const telaA = Number(params.get("altura")) || ambienteAtual?.tela_altura || TELA_PADRAO.altura;
  const rolar = ambienteAtual?.rolagem === true;
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

  // Encaixa a tela inteira no espaço disponível, sem barra de rolagem — a não ser
  // que o painel esteja configurado para rolar para baixo (tablet/celular).
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
      setEscala(rolar ? Math.max(0.05, l / telaL) : Math.max(0.05, Math.min(l / telaL, a / telaA)));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(alvo);
    return () => ro.disconnect();
  }, [telaL, telaA, ambienteId, rolar]);

  const doAmbiente = blocos.filter((b) => b.ambiente_id === ambienteId && b.visivel !== false);
  const camadaDe = (b: Bloco) => Number((b.config as any)?.camada ?? 0);
  const ocultos = idsDentroDeExpansiveis(doAmbiente);
  const ordenados = [...doAmbiente].filter((b) => !ocultos.has(b.id)).sort((a, b) => camadaDe(a) - camadaDe(b));
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

  const palcoStyle = rolar
    ? { width: telaL, height: telaA, transform: `scale(${escala})`, transformOrigin: "top left" as const }
    : { width: telaL, height: telaA, transform: `translate(-50%, -50%) scale(${escala})` };

  return (
    <AmbientesNavContext.Provider value={{ ambientes: abas, ambienteId, trocar: trocarAmbiente }}>
    <PainelBlocosContext.Provider
      value={{
        blocos: doAmbiente,
        estados,
        aplicarEstado: (b, v) => setEstados((s) => ({ ...s, [b.id]: v })),
      }}
    >
    <div className="fixed inset-0 flex flex-col bg-background text-foreground">
      {mostrarAbas && (
        <div className="flex flex-wrap items-center gap-2 border-b bg-card/60 px-3 py-2">
          {abas.map((a) => (
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

      <div
        ref={palcoRef}
        className={`relative flex-1 min-h-0 ${rolar ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden"}`}
      >
        {/* Com rolagem, reserva na página a altura já reduzida do painel. */}
        <div style={rolar ? { height: telaA * escala, width: "100%" } : undefined} className={rolar ? "relative" : "contents"}>
          <div
            className={
              (rolar ? "absolute left-0 top-0 " : "absolute left-1/2 top-1/2 ") +
              (livre ? "overflow-hidden" : "grid gap-2 overflow-hidden")
            }
            style={{
              ...palcoStyle,
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
    </div>
    </PainelBlocosContext.Provider>
    </AmbientesNavContext.Provider>
  );
}
