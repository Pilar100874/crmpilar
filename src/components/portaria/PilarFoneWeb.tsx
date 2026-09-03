import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, GripHorizontal, Maximize2, Minimize2, PanelRight, Phone, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lerConfigSipDoUsuario } from "@/lib/portaria/sipConfigUsuario";
import { useUnidadeAtual } from "@/lib/unidadeAtual";
import { useCampainha, useInterfoneConfig, tocarAlerta } from "@/lib/portaria/interfone";
import InterfonePopup from "./InterfonePopup";
import PilarFone from "./PilarFone";
import { useAbasPermitidas } from "@/lib/portaria/abasPilarFone";

const EVENTO_ABRIR = "pilar-sip:abrir";

export type AbaPilarFone = "ramais" | "cadastros" | "whatsapp" | "chamadas";

export interface OpcoesAbrirPilarFone {
  /** Tela do telefone que deve ser aberta. */
  aba?: AbaPilarFone;
  /** Nome do contato (usado na tela de WhatsApp). */
  nome?: string;
}

/** Abre o Pilar Fone em qualquer lugar do sistema (opcionalmente já com um número e tela). */
export function abrirPilarSip(numero?: string, opcoes?: OpcoesAbrirPilarFone) {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR, { detail: { numero, ...opcoes } }));
}

/** Abre o telefone direto na conversa de WhatsApp do número. */
export function abrirWhatsappPilarFone(numero: string, nome?: string) {
  abrirPilarSip(numero, { aba: "whatsapp", nome });
}

/** Baixa o pacote da extensão do Chrome que abre o Pilar Fone sem a barra do navegador. */
export function baixarExtensao() {
  fetch("/pilar-fone-extension.zip")
    .then((res) => {
      if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`);
      return res.blob();
    })
    .then((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pilar-fone-extension.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((err) => alert(err.message));
}


interface PilarFoneWebProps {
  /** Renderiza o telefone ocupando toda a janela (rota /pilar-sip aberta em outro monitor). */
  janela?: boolean;
}

export default function PilarFoneWeb({ janela = false }: PilarFoneWebProps) {
  const [aberto, setAberto] = useState(janela);
  const [modo, setModo] = useState<"popup" | "painel">(
    () => (localStorage.getItem("pilarSipModo") as "popup" | "painel") || "popup",
  );
  const abasPermitidas = useAbasPermitidas();
  // Sem nenhuma aba marcada no cadastro = sem acesso ao Pilar Fone (botão não aparece).
  const semAcesso = abasPermitidas !== undefined && abasPermitidas.length === 0;
  const semAcessoRef = useRef(semAcesso);
  semAcessoRef.current = semAcesso;
  const [alerta, setAlerta] = useState(false);
  const [numeroInicial, setNumeroInicial] = useState<string | undefined>();
  const [abaInicial, setAbaInicial] = useState<AbaPilarFone | undefined>();
  const [contatoInicial, setContatoInicial] = useState<{ nome: string; numero: string } | undefined>();

  const [servidores, setServidores] = useState<{ servidor: string; servidorRemoto: string }>({
    servidor: "",
    servidorRemoto: "",
  });

  // Interfone dentro do Pilar Fone (igual ao APK)
  const { unidadeId } = useUnidadeAtual();
  const { config } = useInterfoneConfig(unidadeId);
  const [interfoneAberto, setInterfoneAberto] = useState(false);
  const [toqueId, setToqueId] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Array<{ id: string; created_at: string; status: string }>>([]);

  // Tela cheia na janela separada (remove a barra do navegador)
  const [emTelaCheia, setEmTelaCheia] = useState(false);
  useEffect(() => {
    if (!janela) return;
    const sincronizar = () => setEmTelaCheia(!!document.fullscreenElement);
    sincronizar();
    document.addEventListener("fullscreenchange", sincronizar);
    return () => document.removeEventListener("fullscreenchange", sincronizar);
  }, [janela]);

  const alternarTelaCheia = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      /* navegador pode bloquear sem interação do usuário */
    }
  };

  // Posição vertical da aba, arrastável (mesma ideia do chat interno)
  const [posicaoY, setPosicaoY] = useState<number | null>(() => {
    const salvo = localStorage.getItem("pilarSipTabY");
    return salvo ? Number(salvo) : null;
  });
  const arrasto = useRef<{ ativo: boolean; movido: boolean; inicioY: number }>({
    ativo: false,
    movido: false,
    inicioY: 0,
  });

  // Posição da janela flutuante (modo flutuante: arrastar e soltar)
  const [posFlutuante, setPosFlutuante] = useState<{ x: number; y: number } | null>(() => {
    try {
      const salvo = localStorage.getItem("pilarSipFloatPos");
      return salvo ? (JSON.parse(salvo) as { x: number; y: number }) : null;
    } catch {
      return null;
    }
  });
  const arrastoJanela = useRef<{ ativo: boolean; inicioX: number; inicioY: number; baseX: number; baseY: number }>({
    ativo: false,
    inicioX: 0,
    inicioY: 0,
    baseX: 0,
    baseY: 0,
  });

  useEffect(() => {
    const abrir = (event: Event) => {
      if (semAcessoRef.current) return;
      const detail = (event as CustomEvent<{ numero?: string; aba?: AbaPilarFone; nome?: string }>).detail;
      setNumeroInicial(detail?.numero);
      setAbaInicial(detail?.aba);
      setContatoInicial(
        detail?.aba === "whatsapp" && detail?.numero
          ? { nome: detail.nome || detail.numero, numero: detail.numero }
          : undefined,
      );
      setAberto(true);
    };

    window.addEventListener(EVENTO_ABRIR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR, abrir);
  }, []);

  useEffect(() => {
    localStorage.setItem("pilarSipModo", modo);
  }, [modo]);

  useEffect(() => {
    if (semAcesso) return;
    let ativo = true;
    // Toda a telefonia (servidor e servidor alternativo inclusos) vem do cadastro do usuário.
    void lerConfigSipDoUsuario().then((cfg) => {
      if (!ativo || !cfg) return;
      setServidores({ servidor: cfg.servidor ?? "", servidorRemoto: cfg.servidorRemoto ?? "" });
    });
    return () => {
      ativo = false;
    };
  }, [semAcesso]);


  // Histórico de toques da campainha para a aba Campainha
  useEffect(() => {
    if (!aberto) return;
    let ativo = true;
    void (async () => {
      let q = supabase
        .from("port_campainha_eventos")
        .select("id, created_at, status")
        .order("created_at", { ascending: false })
        .limit(20);
      if (unidadeId) q = q.eq("unidade_id", unidadeId);
      const { data } = await q;
      if (ativo && data) setHistorico(data as Array<{ id: string; created_at: string; status: string }>);
    })();
    return () => {
      ativo = false;
    };
  }, [aberto, unidadeId]);

  useCampainha(unidadeId, !!config?.ativo && !semAcesso, (toque) => {
    setHistorico((atual) => [{ id: toque.id, created_at: toque.created_at, status: toque.status }, ...atual].slice(0, 20));
    setToqueId(toque.id);
    setAberto(true);
    setInterfoneAberto(true);
    setAlerta(true);
    if (config?.som) tocarAlerta();
  });

  // Novas mensagens de WhatsApp fazem a aba piscar (igual ao chat interno)
  useEffect(() => {
    if (semAcesso) return;
    const canal = supabase
      .channel("pilar-fone-alerta-wa")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (payload) => {
        const msg = payload.new as { sender?: string };
        if (msg?.sender === "agent" || msg?.sender === "user") return;
        setAlerta(true);
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [semAcesso]);

  // Ao abrir o telefone o alerta para
  useEffect(() => {
    if (aberto) setAlerta(false);
  }, [aberto]);

  const alternar = () => {
    if (aberto) {
      setAberto(false);
      return;
    }
    setNumeroInicial(undefined);
    setAlerta(false);
    setAberto(true);
  };


  const iniciarArrasto = (clientY: number) => {
    arrasto.current = { ativo: true, movido: false, inicioY: clientY };
  };

  const moverArrasto = (clientY: number) => {
    if (!arrasto.current.ativo) return;
    if (Math.abs(clientY - arrasto.current.inicioY) > 4) arrasto.current.movido = true;
    if (!arrasto.current.movido) return;
    const limite = Math.max(8, Math.min(window.innerHeight - 68, clientY - 30));
    setPosicaoY(limite);
  };

  const terminarArrasto = () => {
    if (!arrasto.current.ativo) return;
    const movido = arrasto.current.movido;
    arrasto.current.ativo = false;
    if (movido) {
      if (posicaoY !== null) localStorage.setItem("pilarSipTabY", String(posicaoY));
      return;
    }
    alternar();
  };

  // Arrasto da janela flutuante pela alça no topo
  const iniciarArrastoJanela = (e: React.PointerEvent<HTMLDivElement>) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    const largura = Math.min(400, window.innerWidth - 24);
    const altura = Math.min(780, window.innerHeight - 48);
    const base = posFlutuante ?? { x: window.innerWidth - largura - 16, y: window.innerHeight - altura - 16 };
    arrastoJanela.current = { ativo: true, inicioX: e.clientX, inicioY: e.clientY, baseX: base.x, baseY: base.y };
    if (!posFlutuante) setPosFlutuante(base);
  };

  const moverArrastoJanela = (e: React.PointerEvent<HTMLDivElement>) => {
    const a = arrastoJanela.current;
    if (!a.ativo) return;
    const largura = Math.min(400, window.innerWidth - 24);
    const altura = Math.min(780, window.innerHeight - 48);
    const x = Math.max(0, Math.min(window.innerWidth - largura, a.baseX + (e.clientX - a.inicioX)));
    const y = Math.max(0, Math.min(window.innerHeight - altura, a.baseY + (e.clientY - a.inicioY)));
    setPosFlutuante({ x, y });
  };

  const terminarArrastoJanela = () => {
    if (!arrastoJanela.current.ativo) return;
    arrastoJanela.current.ativo = false;
    if (posFlutuante) localStorage.setItem("pilarSipFloatPos", JSON.stringify(posFlutuante));
  };

  const controlesTelefone = (
    <PilarFone
      embedded
      initialNumber={numeroInicial}
      onChamadaRecebida={() => setAlerta(true)}
      initialAba={abaInicial}
      initialWhatsapp={contatoInicial}

      serverConfig={servidores}
      abasPermitidas={abasPermitidas}
      mostrarInterfone={!!config}
      historico={historico}
      onAbrirToque={(id) => {
        setToqueId(id);
        setInterfoneAberto(true);
      }}
      onAbrirInterfone={() => {
        setToqueId(historico[0]?.id ?? null);
        setInterfoneAberto(true);
      }}
      headerExtra={
        <>
          <button
            type="button"
            aria-label="Baixar extensão do Chrome (janela sem barra do navegador)"
            title="Baixar extensão do Chrome (janela sem barra do navegador)"
            onClick={baixarExtensao}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#AEBAC1] transition active:scale-95"
          >
            <Download className="h-4 w-4" />
          </button>
          {janela ? (
            <button
              type="button"
              aria-label={emTelaCheia ? "Sair da tela cheia" : "Tela cheia (sem barra do navegador)"}
              title={emTelaCheia ? "Sair da tela cheia" : "Tela cheia (sem barra do navegador)"}
              onClick={() => void alternarTelaCheia()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#AEBAC1] transition active:scale-95"
            >
              {emTelaCheia ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          ) : (
            <>
              <button
                type="button"
                aria-label="Abrir em janela separada (outro monitor)"
                title="Abrir em janela separada (outro monitor)"
                onClick={() => {
                  window.open(
                    "/pilar-sip",
                    "pilarSipJanela",
                    "popup=yes,width=430,height=840,left=80,top=80,menubar=no,toolbar=no",
                  );
                  setAberto(false);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#AEBAC1] transition active:scale-95"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={modo === "popup" ? "Abrir como painel lateral" : "Abrir como janela flutuante"}
                title={modo === "popup" ? "Abrir como painel lateral" : "Abrir como janela flutuante"}
                onClick={() => setModo(modo === "popup" ? "painel" : "popup")}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#AEBAC1] transition active:scale-95"
              >
                {modo === "popup" ? <PanelRight className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
              </button>
            </>
          )}
        </>
      }

      onFechar={() => (janela ? window.close() : setAberto(false))}
    />
  );

  // Sem abas liberadas: telefone indisponível (nada é renderizado, inclusive a aba lateral)
  if (semAcesso) return null;

  if (janela) {
    return (
      <>
        {/* Mesma aparência da janela flutuante: cartão estilo celular centralizado.
            Em tela cheia, o cartão expande e ocupa a tela inteira (sem barra do navegador). */}
        <div className="fixed inset-0 flex items-center justify-center bg-[#0B141A] p-3">
          <div
            className={`overflow-hidden bg-[#0B141A] shadow-2xl transition-all duration-200 ${
              emTelaCheia
                ? "h-full w-full rounded-none border-0"
                : "h-[min(780px,calc(100vh-1.5rem))] w-[min(400px,100%)] rounded-[28px] border border-border/60"
            }`}
          >
            {controlesTelefone}
          </div>
        </div>
        {config && (
          <InterfonePopup
            aberto={interfoneAberto}
            onFechar={() => setInterfoneAberto(false)}
            config={config}
            unidadeId={unidadeId}
            toqueId={toqueId}
          />
        )}
      </>
    );
  }

  return (
    <>
      {/* Aba lateral (mesmo padrão do chat interno): clique abre/fecha e pode ser arrastada.
          Só aparece depois de carregar as permissões e apenas se houver abas liberadas. */}
      {abasPermitidas !== undefined && (
      <div
        className={`sip-tab ${aberto && modo === "painel" ? "open" : ""} ${alerta && !aberto ? "sip-tab-pulse" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={aberto ? "Fechar Pilar Fone" : "Abrir Pilar Fone"}
        title="Pilar Fone (arraste para mover)"
        style={posicaoY !== null ? { top: posicaoY, bottom: "auto" } : undefined}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          iniciarArrasto(e.clientY);
        }}
        onPointerMove={(e) => moverArrasto(e.clientY)}
        onPointerUp={terminarArrasto}
        onPointerCancel={() => {
          arrasto.current.ativo = false;
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") alternar();
        }}
      >
        <Phone className="w-3 h-3" />
        {alerta && !aberto && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </div>
      )}

      {modo === "popup" ? (
        // Modo flutuante: janela estilo celular arrastável.
        // Fica montada (oculta) quando fechada para o ramal SIP continuar registrado e avisar chamadas.
        abasPermitidas !== undefined && (
          <div
            role="dialog"
            aria-label="Pilar Fone"
            aria-hidden={!aberto}
            className={`fixed z-[1100] w-[min(400px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-border/60 bg-[#0B141A] shadow-2xl ${
              aberto ? "" : "pointer-events-none invisible opacity-0"
            }`}
            style={{
              left: posFlutuante?.x ?? undefined,
              top: posFlutuante?.y ?? undefined,
              right: posFlutuante ? undefined : 16,
              bottom: posFlutuante ? undefined : 16,
            }}
          >
            {/* Alça de arrasto */}
            <div
              className="flex h-7 cursor-grab items-center justify-center bg-white/5 text-[#AEBAC1] active:cursor-grabbing"
              style={{ touchAction: "none" }}
              title="Arraste para mover o Pilar Fone"
              onPointerDown={iniciarArrastoJanela}
              onPointerMove={moverArrastoJanela}
              onPointerUp={terminarArrastoJanela}
              onPointerCancel={terminarArrastoJanela}
            >
              <GripHorizontal className="h-4 w-4" />
            </div>
            <div className="relative h-[min(740px,calc(100dvh-5rem))] w-full overflow-hidden">
              {controlesTelefone}
            </div>
          </div>
        )

      ) : (
        // Modo painel: abre deslizando igual ao chat interno
        <div className={`sip-slide-menu ${aberto ? "open" : ""}`} aria-hidden={!aberto}>
          <div className="relative h-full w-full overflow-hidden">{controlesTelefone}</div>
        </div>
      )}

      {config && (
        <InterfonePopup
          aberto={interfoneAberto}
          onFechar={() => setInterfoneAberto(false)}
          config={config}
          unidadeId={unidadeId}
          toqueId={toqueId}
        />
      )}
    </>
  );
}
