import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BellRing,
  BookUser,
  MessageCircle,
  Delete,
  Grid3X3,
  Mic,
  MicOff,
  Phone,
  PhoneCall,
  PhoneOff,
  RefreshCw,
  Search,
  Settings2,
  Smartphone,
  Users,
  Video,
  VideoOff,
  Volume2,
  X,
} from "lucide-react";
import { SessionState } from "sip.js";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useSipConnection } from "@/hooks/useSipConnection";
import { useToast } from "@/hooks/use-toast";
import AvisoInline from "@/components/portaria/AvisoInline";
import PilarFoneContatos, { type ContatoCadastro } from "@/components/portaria/PilarFoneContatos";
import PilarFoneWhatsapp, { type AlvoWhatsapp } from "@/components/portaria/PilarFoneWhatsapp";
import PilarFoneHistorico from "@/components/portaria/PilarFoneHistorico";
import { registrarChamada } from "@/lib/portaria/historicoChamadas";

import {
  lerConfigSip,
  salvarConfigSip,
  type PortariaSipConfig,
} from "@/lib/portaria/sipConfig";
import { sincronizarConfigSip, salvarConfigNaNuvem } from "@/lib/portaria/sipConfigCloud";
import { agendaDisponivel, lerAgendaCelular, type ContatoCelular } from "@/lib/portaria/agendaCelular";

const TECLAS = [
  { d: "1", l: "" },
  { d: "2", l: "ABC" },
  { d: "3", l: "DEF" },
  { d: "4", l: "GHI" },
  { d: "5", l: "JKL" },
  { d: "6", l: "MNO" },
  { d: "7", l: "PQRS" },
  { d: "8", l: "TUV" },
  { d: "9", l: "WXYZ" },
  { d: "*", l: "" },
  { d: "0", l: "+" },
  { d: "#", l: "" },
];

const CORES_AVATAR = ["#00A884", "#53BDEB", "#F5A623", "#7F66FF", "#EF6C6C", "#20A0A0"];

interface RamalCrm {
  id: string;
  nome: string;
  ramal: string;
  tipo: string | null;
}

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).slice(0, 2);
  return partes.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function corAvatar(chave: string) {
  let soma = 0;
  for (let i = 0; i < chave.length; i += 1) soma += chave.charCodeAt(i);
  return CORES_AVATAR[soma % CORES_AVATAR.length];
}

function Avatar({ nome }: { nome: string }) {
  return (
    <span
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ backgroundColor: corAvatar(nome) }}
    >
      {iniciais(nome)}
    </span>
  );
}

type Aba = "ramais" | "cadastros" | "whatsapp" | "chamadas";

interface Props {
  /** Abre a tela do interfone (campainha). */
  onAbrirInterfone: () => void;
  /** Ativa alertas de campainha no aparelho. */
  onAtivarAlertas?: () => void;
  alertasAtivos?: boolean;
  historico?: Array<{ id: string; created_at: string; status: string }>;
  onAbrirToque?: (id: string) => void;
  /** Embutido no sistema (popup em formato de celular). */
  embedded?: boolean;
  initialNumber?: string;
  /** Tela que deve ser exibida ao abrir. */
  initialAba?: Aba;
  /** Abre direto a conversa de WhatsApp do contato. */
  initialWhatsapp?: { nome: string; numero: string };

  /** Servidores vindos da configuração do estabelecimento. */
  serverConfig?: { servidor: string; servidorRemoto: string };
  mostrarInterfone?: boolean;
  /** Fecha o telefone (exibido apenas no modo embutido). */
  onFechar?: () => void;
  /** Ações extras exibidas no cabeçalho do telefone. */
  headerExtra?: React.ReactNode;
  /** Abas liberadas para o usuário (vazio/indefinido = todas). */
  abasPermitidas?: Aba[];
  /** Disparado quando chega uma chamada SIP. */
  onChamadaRecebida?: () => void;
}

/** Telefone SIP da Pilar com visual de app de mensagens: agenda, teclado e chamadas. */
export default function PilarFone({
  onAbrirInterfone,
  onAtivarAlertas,
  alertasAtivos,
  historico = [],
  onAbrirToque,
  embedded = false,
  initialNumber,
  initialAba,
  initialWhatsapp,

  serverConfig,
  mostrarInterfone = true,
  onFechar,
  headerExtra,
  abasPermitidas,
  onChamadaRecebida,
}: Props) {

  const { toast } = useToast();
  const {
    connect,
    disconnect,
    dial,
    hangup,
    answer,
    isRegistered,
    isConnecting,
    activeCalls,
    remoteStream,
    localVideoStream,
    vivaVoz,
    mudo,
    toggleVivaVoz,
    toggleMudo,
    toggleCamera,
  } = useSipConnection();

  const [config, setConfig] = useState<PortariaSipConfig>(() => lerConfigSip());
  const [rascunho, setRascunho] = useState<PortariaSipConfig>(config);
  const [configAberta, setConfigAberta] = useState(false);
  const [configSincronizada, setConfigSincronizada] = useState(false);
  const [aba, setAba] = useState<Aba>("ramais");
  const [alvoWhatsapp, setAlvoWhatsapp] = useState<AlvoWhatsapp | null>(null);
  const [busca, setBusca] = useState("");
  const [tipoRamal, setTipoRamal] = useState<string>("todos");

  
  const [tecladoAberto, setTecladoAberto] = useState(false);
  const [numero, setNumero] = useState("");
  const [ramais, setRamais] = useState<RamalCrm[]>([]);
  const [carregandoRamais, setCarregandoRamais] = useState(true);
  const [contatos, setContatos] = useState<ContatoCelular[]>([]);
  const [erroAgenda, setErroAgenda] = useState<string | null>(null);
  const [carregandoAgenda, setCarregandoAgenda] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const tentouAuto = useRef(false);

  const configValida = useMemo(
    () => !!(config.servidor && config.ramal && config.senha),
    [config.servidor, config.ramal, config.senha],
  );

  const abasVisiveis = useMemo(() => {
    const todas = [
      { id: "ramais" as Aba, rotulo: "Ramais", Icone: Users },
      { id: "cadastros" as Aba, rotulo: "Cadastros", Icone: BookUser },
      { id: "whatsapp" as Aba, rotulo: "WhatsApp", Icone: MessageCircle },
      ...(mostrarInterfone ? [{ id: "chamadas" as Aba, rotulo: "Interfone", Icone: BellRing }] : []),
    ];
    // `undefined` = ainda carregando (mostra tudo). Lista vazia = nenhuma aba liberada.
    if (!abasPermitidas) return todas;
    return todas.filter((t) => abasPermitidas.includes(t.id));
  }, [mostrarInterfone, abasPermitidas]);

  useEffect(() => {
    if (abasVisiveis.length && !abasVisiveis.some((t) => t.id === aba)) {
      setAba(abasVisiveis[0].id);
    }
  }, [abasVisiveis, aba]);

  useEffect(() => {
    let ativo = true;
    void sincronizarConfigSip().then((sincronizada) => {
      if (!ativo) return;
      const final = serverConfig?.servidor ? { ...sincronizada, ...serverConfig } : sincronizada;
      setConfig(final);
      setRascunho(final);
      setConfigSincronizada(true);
    });
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!serverConfig?.servidor) return;
    setConfig((atual) => ({ ...atual, ...serverConfig }));
    setRascunho((atual) => ({ ...atual, ...serverConfig }));
  }, [serverConfig?.servidor, serverConfig?.servidorRemoto]);

  useEffect(() => {
    if (initialWhatsapp?.numero) {
      setAlvoWhatsapp(initialWhatsapp);
      setAba("whatsapp");
      setTecladoAberto(false);
      return;
    }
    if (initialAba) {
      setAba(initialAba);
      if (initialAba !== "ramais") setTecladoAberto(false);
    }
    if (initialNumber && !initialAba) {
      setNumero(initialNumber);
      setTecladoAberto(true);
    }
  }, [initialNumber, initialAba, initialWhatsapp?.numero, initialWhatsapp?.nome]);



  const conectar = useCallback(async () => {
    if (!configValida) {
      setRascunho(config);
      setConfigAberta(true);
      setAviso("Informe servidor, ramal e senha SIP para registrar o aparelho.");
      return;
    }
    setAviso(null);
    await connect({
      server: config.servidor.trim(),
      remoteServer: config.servidorRemoto.trim() || undefined,
      extension: config.ramal.trim(),
      password: config.senha,
      displayName: config.nome.trim() || config.ramal.trim(),
    });
  }, [config, configValida, connect]);

  useEffect(() => {
    if (!configSincronizada || tentouAuto.current || !config.autoConectar || !configValida || isRegistered || isConnecting) return;
    tentouAuto.current = true;
    void conectar();
  }, [config.autoConectar, configSincronizada, configValida, isRegistered, isConnecting, conectar]);

  // Grupo de ramais SIP cadastrados no CRM
  const carregarRamais = useCallback(async () => {
    setCarregandoRamais(true);
    const { data } = await supabase
      .from("usuarios")
      .select("id, nome, ramal, tipo, ativo")
      .not("ramal", "is", null)
      .neq("ramal", "")
      .order("nome");
    const lista = ((data ?? []) as Array<RamalCrm & { ativo: boolean | null }>)
      .filter((u) => u.ativo !== false)
      .map((u) => ({ id: u.id, nome: u.nome, ramal: String(u.ramal), tipo: u.tipo }));
    setRamais(lista);
    setCarregandoRamais(false);
  }, []);

  useEffect(() => {
    void carregarRamais();
  }, [carregarRamais]);

  const carregarAgenda = useCallback(async () => {
    setCarregandoAgenda(true);
    setErroAgenda(null);
    try {
      setContatos(await lerAgendaCelular());
    } catch (e) {
      setErroAgenda((e as Error).message);
    } finally {
      setCarregandoAgenda(false);
    }
  }, []);

  const chamadaEntrante = activeCalls.find(
    (c) => c.direction === "inbound" && c.state !== SessionState.Established,
  );
  const chamadaAtual = activeCalls[0] ?? null;

  // Avisa o container (aba lateral) que há chamada entrante para piscar o botão
  useEffect(() => {
    if (chamadaEntrante) onChamadaRecebida?.();
  }, [chamadaEntrante, onChamadaRecebida]);


  useEffect(() => {
    if (!config.autoAtender || !chamadaEntrante) return;
    void answer(chamadaEntrante.id);
  }, [config.autoAtender, chamadaEntrante, answer]);

  const videoRemotoRef = useRef<HTMLVideoElement | null>(null);
  const videoLocalRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRemotoRef.current && remoteStream) videoRemotoRef.current.srcObject = remoteStream;
  }, [remoteStream, chamadaAtual?.id]);

  useEffect(() => {
    if (videoLocalRef.current && localVideoStream) videoLocalRef.current.srcObject = localVideoStream;
  }, [localVideoStream]);

  const temVideoRemoto = !!remoteStream && remoteStream.getVideoTracks().length > 0;

  const nomePorNumero = useCallback(
    (num: string) => {
      const r = ramais.find((x) => x.ramal === num);
      if (r) return r.nome;
      const c = contatos.find((x) => x.numero.endsWith(num) || num.endsWith(x.numero));
      return c?.nome ?? num;
    },
    [contatos, ramais],
  );

  const ligar = useCallback(
    (destino: string, comVideo = false, comVivaVoz = false) => {
      const alvo = destino.trim();
      if (!alvo) return;
      if (!isRegistered) {
        toast({
          title: "Ramal desconectado",
          description: "Conecte o ramal SIP antes de ligar.",
          variant: "destructive",
        });
        return;
      }
      setTecladoAberto(false);
      void dial(alvo, { video: comVideo, vivaVoz: comVivaVoz });
    },
    [dial, isRegistered, toast],
  );

  const salvar = () => {
    salvarConfigSip(rascunho);
    setConfig(rascunho);
    setConfigAberta(false);
    tentouAuto.current = false;
    setAviso(null);
    void salvarConfigNaNuvem(rascunho);
    toast({ title: "Ramal salvo", description: "Configuração guardada neste aparelho e protegida na nuvem." });
  };

  const filtro = busca.trim().toLowerCase();
  const tiposRamal = useMemo(() => {
    const set = new Set<string>();
    ramais.forEach((r) => { if (r.tipo) set.add(r.tipo); });
    return Array.from(set).sort();
  }, [ramais]);
  const ramaisFiltrados = ramais.filter(
    (r) =>
      (tipoRamal === "todos" || (r.tipo ?? "") === tipoRamal) &&
      (!filtro || r.nome.toLowerCase().includes(filtro) || r.ramal.includes(filtro)),
  );

  const contatosFiltrados = contatos.filter(
    (c) => !filtro || c.nome.toLowerCase().includes(filtro) || c.numero.includes(filtro),
  );

  const camada = embedded ? "absolute" : "fixed";
  const padTop = embedded ? "0px" : "env(safe-area-inset-top, 0px)";
  const padBottom = embedded ? "0px" : "env(safe-area-inset-bottom, 0px)";

  const campo = "border-white/10 !bg-[#0B141A] !text-[#E9EDEF] placeholder:text-[#8696A0] focus-visible:ring-[#00A884]";

  return (
    <div className={`relative flex flex-col overflow-hidden bg-[#0B141A] text-[#E9EDEF] ${embedded ? "h-full" : "min-h-[100dvh]"}`}>
      {/* Cabeçalho */}
      <header
        className="sticky top-0 z-20 shrink-0 bg-[#1F2C34]"
        style={{ paddingTop: padTop }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          <h1 className="flex-1 text-xl font-semibold tracking-tight">Pilar Fone</h1>
          {headerExtra}
          {onFechar && (
            <button
              type="button"
              aria-label="Fechar Pilar Fone"
              onClick={onFechar}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[#AEBAC1] transition active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            aria-label="Configurar ramal"
            onClick={() => {
              setRascunho(config);
              setConfigAberta(true);
            }}
            className="p-1"
          >
            <Settings2 className="h-5 w-5 text-[#AEBAC1]" />
          </button>
        </div>


        <div className="flex items-center gap-2 px-4 pb-2 text-[11px]">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${
              isRegistered
                ? "bg-[#00A884]/20 text-[#00A884]"
                : isConnecting
                  ? "bg-amber-500/20 text-amber-400"
                  : "bg-red-500/20 text-red-400"
            }`}
          >
            <PhoneCall className="h-3 w-3" />
            {isConnecting ? "Conectando..." : isRegistered ? `Ramal ${config.ramal} online` : "Ramal desconectado"}
          </span>
          {!isRegistered && !isConnecting && (
            <button type="button" onClick={() => void conectar()} className="font-semibold text-[#00A884] underline">
              Conectar
            </button>
          )}
          {isRegistered && (
            <button type="button" onClick={() => void disconnect()} className="font-semibold text-[#8696A0] underline">
              Desconectar
            </button>
          )}
        </div>

        <nav className="px-3 pb-3">
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-white/[0.06] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {abasVisiveis.map((t) => {
              const ativa = aba === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAba(t.id)}
                  aria-label={t.rotulo}
                  aria-current={ativa}
                  title={t.rotulo}
                  className={`flex flex-1 items-center justify-center rounded-xl py-2.5 transition ${
                    ativa
                      ? "bg-[#00A884] text-[#0B141A] shadow-[0_2px_10px_rgba(0,168,132,0.35)]"
                      : "text-[#AEBAC1] hover:bg-white/5"
                  }`}
                >
                  <t.Icone className="h-[18px] w-[18px] shrink-0" />
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      <main className={`flex-1 pb-28 ${embedded ? "min-h-0 overflow-y-auto" : ""}`}>
        {aviso && (
          <div className="p-3">
            <AvisoInline tipo="aviso">{aviso}</AvisoInline>
          </div>
        )}

        {aba === "ramais" && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#00A884]">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" /> Ramais do CRM ({ramaisFiltrados.length})
              </span>
              <button type="button" aria-label="Atualizar ramais" onClick={() => void carregarRamais()}>
                <RefreshCw className={`h-4 w-4 ${carregandoRamais ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#111B21] px-3 py-2">
                <Search className="h-4 w-4 shrink-0 text-[#8696A0]" />
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar nome ou ramal"
                  className="w-full bg-transparent text-sm text-[#E9EDEF] outline-none placeholder:text-[#8696A0]"
                />
                {busca && (
                  <button type="button" aria-label="Limpar busca" onClick={() => setBusca("")}>
                    <X className="h-4 w-4 text-[#8696A0]" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {(["todos", ...tiposRamal] as string[]).map((t) => {
                const ativo = tipoRamal === t;
                const total = t === "todos" ? ramais.length : ramais.filter((r) => (r.tipo ?? "") === t).length;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoRamal(t)}
                    title={t === "todos" ? "Todos os ramais" : t}
                    aria-label={t === "todos" ? "Todos os ramais" : t}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold capitalize transition ${
                      ativo ? "bg-[#00A884] text-[#0B141A]" : "bg-white/[0.06] text-[#AEBAC1] active:scale-95"
                    }`}
                  >
                    {t === "todos" ? <Users className="h-3.5 w-3.5" /> : <BookUser className="h-3.5 w-3.5" />}
                    {t === "todos" ? "Todos" : t}
                    <span className={`rounded-full px-1.5 text-[10px] ${ativo ? "bg-black/15" : "bg-white/10"}`}>{total}</span>
                  </button>
                );
              })}
            </div>

            {mostrarInterfone && (
              <button
                type="button"
                onClick={onAbrirInterfone}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                  <BellRing className="h-5 w-5 text-orange-400" />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-semibold">Interfone da portaria</span>
                  <span className="block text-[13px] text-[#8696A0]">Câmeras, abertura e conversa</span>
                </span>
              </button>
            )}
            {carregandoRamais && <p className="px-4 py-6 text-sm text-[#8696A0]">Carregando ramais...</p>}
            {!carregandoRamais && ramaisFiltrados.length === 0 && (
              <p className="px-4 py-6 text-sm text-[#8696A0]">Nenhum ramal SIP cadastrado no CRM.</p>
            )}
            {ramaisFiltrados.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-4 py-2.5 active:bg-white/5">
                <Avatar nome={r.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{r.nome}</p>
                  <p className="truncate text-[13px] text-[#8696A0]">Ramal {r.ramal}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Ligar para ${r.nome}`}
                  disabled={!isRegistered}
                  title={isRegistered ? `Ligar para ${r.nome}` : "Ramal SIP desconectado"}
                  onClick={() => {
                    registrarChamada({ grupo: "ramais", nome: r.nome, numero: r.ramal, direcao: "saida" });
                    ligar(r.ramal);
                  }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884]/15 text-[#00A884] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            ))}
            <PilarFoneHistorico grupo="ramais" titulo="Chamadas recentes" onLigar={isRegistered ? (n) => ligar(n) : undefined} />
          </div>
        )}

        {aba === "cadastros" && (
          <div>
            <PilarFoneContatos
              onLigar={(numero, nome) => {
                registrarChamada({ grupo: "cadastros", nome: nome || numero, numero, direcao: "saida" });
                ligar(numero);
              }}
              ligarDesabilitado={!isRegistered}
              onWhatsapp={(c: ContatoCadastro) => {
                setAlvoWhatsapp({ nome: c.nome, numero: c.numero });
                setAba("whatsapp");
              }}
            />
            <PilarFoneHistorico
              grupo="cadastros"
              titulo="Cadastros recentes"
              onLigar={isRegistered ? (n) => ligar(n) : undefined}
            />
          </div>
        )}

        {aba === "whatsapp" && (
          <div className={embedded ? "h-full" : "h-[calc(100vh-220px)]"}>
            <PilarFoneWhatsapp alvo={alvoWhatsapp} onAlvoConsumido={() => setAlvoWhatsapp(null)} />
          </div>
        )}

        {aba === "chamadas" && (
          <div>
            {/* Cartão principal: abre o interfone com câmeras, áudio e abertura */}
            <button
              type="button"
              onClick={onAbrirInterfone}
              className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left active:bg-white/5"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-500/20">
                <BellRing className="h-5 w-5 text-orange-400" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">Abrir Interfone</span>
                <span className="block text-[13px] text-[#8696A0]">Câmeras ao vivo, conversa e abertura</span>
              </span>
            </button>
            <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#00A884]">
              Toques do interfone
            </p>
            {historico.length === 0 && (
              <p className="px-4 py-6 text-sm text-[#8696A0]">Nenhum toque registrado ainda.</p>
            )}
            {historico.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onAbrirToque?.(t.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-white/5"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                  <BellRing className={`h-5 w-5 ${t.status === "pendente" ? "text-orange-400" : "text-[#8696A0]"}`} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold">Toque no interfone</span>
                  <span className="block text-[13px] text-[#8696A0]">
                    {new Date(t.created_at).toLocaleString("pt-BR")}
                  </span>
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    t.status === "pendente" ? "bg-orange-500 text-white" : "bg-white/10 text-[#AEBAC1]"
                  }`}
                >
                  {t.status === "pendente" ? "Novo" : "Atendido"}
                </span>
              </button>
            ))}

            {!alertasAtivos && onAtivarAlertas && (
              <div className="p-4">
                <button
                  type="button"
                  onClick={onAtivarAlertas}
                  className="h-11 w-full rounded-full bg-white/10 text-sm font-semibold text-[#E9EDEF] transition active:scale-95"
                >
                  Ativar alertas do interfone
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Botão flutuante: age conforme a aba aberta */}
      <button
        type="button"
        aria-label={
          aba === "chamadas" ? "Abrir interfone" : aba === "whatsapp" ? "Nova conversa de WhatsApp" : "Abrir teclado"
        }
        title={
          aba === "chamadas" ? "Abrir interfone" : aba === "whatsapp" ? "Nova conversa de WhatsApp" : "Abrir teclado"
        }
        disabled={(aba === "ramais" || aba === "cadastros") && !isRegistered}
        onClick={() => (aba === "chamadas" ? onAbrirInterfone() : setTecladoAberto(true))}
        className={`${camada} left-1/2 z-30 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A884] text-[#0B141A] shadow-xl shadow-black/40 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40`}
        style={{ bottom: `calc(${padBottom} + 20px)` }}
      >
        {aba === "chamadas" ? (
          <BellRing className="h-6 w-6" />
        ) : aba === "whatsapp" ? (
          <MessageCircle className="h-6 w-6" />
        ) : (
          <Grid3X3 className="h-6 w-6" />
        )}
      </button>





      {/* Teclado de discagem */}
      {tecladoAberto && (
        <div className={`${camada} inset-0 z-40 flex flex-col bg-[#0B141A]`} style={{ paddingTop: padTop }}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-base font-semibold">{aba === "whatsapp" ? "Nova conversa" : "Discar"}</span>
            <button
              type="button"
              aria-label="Fechar teclado"
              onClick={() => setTecladoAberto(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-end overflow-y-auto px-6 pb-8" style={{ paddingBottom: `calc(${padBottom} + 24px)` }}>
            <div className="mb-6 text-center">
              <p className="min-h-[2.5rem] text-3xl font-light tracking-widest">{numero || "\u00A0"}</p>
              {numero && <p className="mt-1 text-sm text-[#00A884]">{nomePorNumero(numero)}</p>}
            </div>
            <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-4">
              {TECLAS.map((t) => (
                <button
                  key={t.d}
                  type="button"
                  onClick={() => setNumero((n) => n + t.d)}
                  className="flex h-16 w-16 flex-col items-center justify-center justify-self-center rounded-full bg-[#1F2C34] transition active:scale-90"
                >
                  <span className="text-2xl font-medium leading-none">{t.d}</span>
                  {t.l && <span className="mt-0.5 text-[10px] tracking-widest text-[#8696A0]">{t.l}</span>}
                </button>
              ))}
            </div>
            <div className="mx-auto mt-6 flex w-full max-w-xs items-center justify-between">
              <button
                type="button"
                aria-label="Ligar com vídeo"
                disabled={!numero.trim() || aba === "whatsapp" || !isRegistered}
                onClick={() => ligar(numero, true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F2C34] text-[#00A884] transition active:scale-90 disabled:opacity-40"
              >
                <Video className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label={aba === "whatsapp" ? "Abrir conversa de WhatsApp" : "Ligar"}
                title={aba === "whatsapp" ? "Abrir conversa de WhatsApp" : "Ligar"}
                disabled={!numero.trim() || (aba !== "whatsapp" && !isRegistered)}
                onClick={() => {
                  const alvo = numero.trim();
                  if (!alvo) return;
                  if (aba === "whatsapp") {
                    registrarChamada({ grupo: "whatsapp", nome: nomePorNumero(alvo), numero: alvo, direcao: "saida" });
                    setAlvoWhatsapp({ nome: nomePorNumero(alvo), numero: alvo });
                    setTecladoAberto(false);
                    return;
                  }
                  registrarChamada({
                    grupo: aba === "cadastros" ? "cadastros" : "ramais",
                    nome: nomePorNumero(alvo),
                    numero: alvo,
                    direcao: "saida",
                  });
                  ligar(alvo);
                }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00A884] text-[#0B141A] shadow-lg transition active:scale-95 disabled:opacity-40"
              >
                {aba === "whatsapp" ? <MessageCircle className="h-7 w-7" /> : <Phone className="h-7 w-7" />}
              </button>

              <button
                type="button"
                aria-label="Apagar"
                onClick={() => setNumero((n) => n.slice(0, -1))}
                className="flex h-12 w-12 items-center justify-center rounded-full text-[#8696A0] transition active:scale-90"
              >
                <Delete className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tela de chamada (estilo WhatsApp: viva-voz, mudo e vídeo sempre à mão) */}
      {chamadaAtual && (
        <div
          className={`${camada} inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1F2C34] to-[#0B141A] px-6 pb-8 text-center`}
          style={{
            paddingTop: `calc(${padTop} + 24px)`,
            paddingBottom: `calc(${padBottom} + 24px)`,
          }}
        >
          {/* Vídeo da outra ponta em tela cheia quando disponível */}
          {temVideoRemoto && (
            <video
              ref={videoRemotoRef}
              autoPlay
              playsInline
              className="absolute inset-0 h-full w-full bg-black object-cover"
            />
          )}

          {/* Minha câmera em miniatura (PiP) */}
          {localVideoStream && (
            <video
              ref={videoLocalRef}
              autoPlay
              playsInline
              muted
              className="absolute right-4 z-10 h-36 w-24 rounded-2xl border-2 border-white/20 bg-black object-cover shadow-xl"
              style={{ top: `calc(${padTop} + 80px)` }}
            />
          )}

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-3">
            {!temVideoRemoto && (
              <span
                className="flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
                style={{ backgroundColor: corAvatar(nomePorNumero(chamadaAtual.phoneNumber)) }}
              >
                {iniciais(nomePorNumero(chamadaAtual.phoneNumber))}
              </span>
            )}
            <p
              className={`text-2xl font-semibold ${temVideoRemoto ? "rounded-full bg-black/50 px-4 py-1 backdrop-blur" : ""}`}
            >
              {nomePorNumero(chamadaAtual.phoneNumber)}
            </p>
            <p
              className={`text-sm ${temVideoRemoto ? "rounded-full bg-black/50 px-3 py-0.5 text-white/80 backdrop-blur" : "text-[#8696A0]"}`}
            >
              {chamadaAtual.state === SessionState.Established
                ? temVideoRemoto
                  ? "Videochamada"
                  : "Em conversa"
                : chamadaAtual.direction === "inbound"
                  ? "Chamada recebida"
                  : "Chamando..."}
            </p>
          </div>

          {/* Controles da chamada */}
          <div className="relative z-10 flex w-full max-w-sm items-center justify-around self-center">
            {chamadaAtual.state === SessionState.Established ? (
              <>
                <button
                  type="button"
                  aria-label={mudo ? "Ativar microfone" : "Silenciar microfone"}
                  onClick={toggleMudo}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-full transition active:scale-95 ${
                    mudo ? "bg-white text-[#0B141A]" : "bg-white/15 text-white backdrop-blur"
                  }`}
                >
                  {mudo ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
                </button>
                <button
                  type="button"
                  aria-label={vivaVoz ? "Desligar viva-voz" : "Ligar viva-voz"}
                  onClick={() => void toggleVivaVoz()}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-full transition active:scale-95 ${
                    vivaVoz ? "bg-white text-[#0B141A]" : "bg-white/15 text-white backdrop-blur"
                  }`}
                >
                  <Volume2 className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label={localVideoStream ? "Desligar câmera" : "Ligar câmera"}
                  onClick={() => void toggleCamera(chamadaAtual.id)}
                  className={`flex h-14 w-14 flex-col items-center justify-center rounded-full transition active:scale-95 ${
                    localVideoStream ? "bg-white text-[#0B141A]" : "bg-white/15 text-white backdrop-blur"
                  }`}
                >
                  {localVideoStream ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
                </button>
                <button
                  type="button"
                  aria-label="Encerrar"
                  onClick={() => void hangup(chamadaAtual.id)}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition active:scale-95"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
              </>
            ) : chamadaAtual.direction === "inbound" ? (
              <>
                <button
                  type="button"
                  aria-label="Atender com vídeo"
                  onClick={() => void answer(chamadaAtual.id, { video: true })}
                  className="flex h-14 w-14 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur transition active:scale-95"
                >
                  <Video className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  aria-label="Recusar"
                  onClick={() => void hangup(chamadaAtual.id)}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition active:scale-95"
                >
                  <PhoneOff className="h-7 w-7" />
                </button>
                <button
                  type="button"
                  aria-label="Atender"
                  onClick={() => void answer(chamadaAtual.id, { vivaVoz: false })}
                  className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00A884] text-[#0B141A] shadow-lg transition active:scale-95"
                >
                  <Phone className="h-7 w-7" />
                </button>
              </>
            ) : (
              <button
                type="button"
                aria-label="Cancelar chamada"
                onClick={() => void hangup(chamadaAtual.id)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500 text-white shadow-lg transition active:scale-95"
              >
                <PhoneOff className="h-7 w-7" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Configuração do ramal */}
      {configAberta && (
        <div className={`${camada} inset-0 z-50 flex flex-col bg-[#0B141A]`} style={{ paddingTop: padTop }}>
          <div className="flex items-center gap-3 bg-[#1F2C34] px-4 py-3">
            <button type="button" aria-label="Fechar" onClick={() => setConfigAberta(false)}>
              <ArrowLeft className="h-5 w-5 text-[#AEBAC1]" />
            </button>
            <span className="text-base font-semibold">Configurar ramal SIP</span>
          </div>
          <div
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            style={{ paddingBottom: `calc(${padBottom} + 24px)` }}
          >
            <p className="text-xs text-[#8696A0]">
              {serverConfig?.servidor
                ? `Servidor definido na configuração do estabelecimento: ${serverConfig.servidor}${serverConfig.servidorRemoto ? ` (alternativo: ${serverConfig.servidorRemoto})` : ""}.`
                : "O servidor SIP é definido na configuração do estabelecimento. Peça ao administrador para cadastrá-lo."}
            </p>
            {[
              { id: "ramal", rotulo: "Ramal", ph: "1001" },
              { id: "senha", rotulo: "Senha SIP", ph: "" },
              { id: "nome", rotulo: "Nome exibido", ph: "Portaria" },
              { id: "ramalPortaria", rotulo: "Ramal da portaria/interfone", ph: "2000" },
            ].map((campoCfg) => (
              <div key={campoCfg.id} className="space-y-1.5">
                <Label htmlFor={`sip-${campoCfg.id}`} className="text-[13px] text-[#8696A0]">
                  {campoCfg.rotulo}
                </Label>
                <Input
                  id={`sip-${campoCfg.id}`}
                  className={campo}
                  type={campoCfg.id === "senha" ? "password" : "text"}
                  inputMode={campoCfg.id === "ramal" || campoCfg.id === "ramalPortaria" ? "numeric" : undefined}
                  placeholder={campoCfg.ph}
                  value={rascunho[campoCfg.id as keyof PortariaSipConfig] as string}
                  onChange={(e) => setRascunho({ ...rascunho, [campoCfg.id]: e.target.value })}
                />
              </div>
            ))}

            <div className="flex items-center justify-between rounded-xl bg-[#1F2C34] px-4 py-3">
              <Label htmlFor="sip-auto" className="text-sm font-normal text-white">
                Conectar automaticamente ao abrir
              </Label>
              <Switch
                id="sip-auto"
                checked={rascunho.autoConectar}
                onCheckedChange={(v) => setRascunho({ ...rascunho, autoConectar: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#1F2C34] px-4 py-3">
              <Label htmlFor="sip-atender" className="text-sm font-normal text-white">
                Atender chamadas automaticamente
              </Label>
              <Switch
                id="sip-atender"
                checked={rascunho.autoAtender}
                onCheckedChange={(v) => setRascunho({ ...rascunho, autoAtender: v })}
              />
            </div>

            <button
              type="button"
              onClick={salvar}
              className="h-12 w-full rounded-full bg-[#00A884] text-sm font-semibold text-[#0B141A] transition active:scale-95"
            >
              Salvar ramal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
