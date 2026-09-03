import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BellRing,
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

type Aba = "ramais" | "agenda" | "chamadas";

interface Props {
  /** Abre a tela do interfone (campainha). */
  onAbrirInterfone: () => void;
  /** Ativa alertas de campainha no aparelho. */
  onAtivarAlertas?: () => void;
  alertasAtivos?: boolean;
  historico?: Array<{ id: string; created_at: string; status: string }>;
  onAbrirToque?: (id: string) => void;
  /** Quando embutido no sistema, os servidores vêm da configuração do estabelecimento. */
  embedded?: boolean;
  initialNumber?: string;
  serverConfig?: { servidor: string; servidorRemoto: string };
  mostrarInterfone?: boolean;
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
  serverConfig,
  mostrarInterfone = true,
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
  const [busca, setBusca] = useState("");
  const [buscaAberta, setBuscaAberta] = useState(false);
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

  useEffect(() => {
    let ativo = true;
    void sincronizarConfigSip().then((sincronizada) => {
      if (!ativo) return;
      const configuracao = serverConfig ? { ...sincronizada, ...serverConfig } : sincronizada;
      setConfig(configuracao);
      setRascunho(configuracao);
      setConfigSincronizada(true);
    });
    return () => {
      ativo = false;
    };
  }, [serverConfig]);

  useEffect(() => {
    if (serverConfig) {
      setConfig((atual) => ({ ...atual, ...serverConfig }));
      setRascunho((atual) => ({ ...atual, ...serverConfig }));
    }
  }, [serverConfig]);

  useEffect(() => {
    if (initialNumber) setNumero(initialNumber);
  }, [initialNumber]);

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
    if (!configSincronizada || (embedded && !serverConfig) || tentouAuto.current || !config.autoConectar || !configValida || isRegistered || isConnecting) return;
    tentouAuto.current = true;
    void conectar();
  }, [config.autoConectar, configSincronizada, configValida, embedded, isRegistered, isConnecting, serverConfig, conectar]);

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
  const ramaisFiltrados = ramais.filter(
    (r) => !filtro || r.nome.toLowerCase().includes(filtro) || r.ramal.includes(filtro),
  );
  const contatosFiltrados = contatos.filter(
    (c) => !filtro || c.nome.toLowerCase().includes(filtro) || c.numero.includes(filtro),
  );

  const campo = "border-white/10 !bg-[#0B141A] !text-[#E9EDEF] placeholder:text-[#8696A0] focus-visible:ring-[#00A884]";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#0B141A] text-[#E9EDEF]">
      {/* Cabeçalho */}
      <header
        className="sticky top-0 z-20 bg-[#1F2C34]"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center gap-2 px-4 py-3">
          {buscaAberta ? (
            <>
              <button type="button" aria-label="Fechar busca" onClick={() => { setBuscaAberta(false); setBusca(""); }}>
                <ArrowLeft className="h-5 w-5 text-[#8696A0]" />
              </button>
              <input
                autoFocus
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar nome ou ramal"
                className="flex-1 bg-transparent text-base text-[#E9EDEF] outline-none placeholder:text-[#8696A0]"
              />
            </>
          ) : (
            <>
              <h1 className="flex-1 text-xl font-semibold tracking-tight">Pilar Sip</h1>
              <button type="button" aria-label="Buscar" onClick={() => setBuscaAberta(true)} className="p-1">
                <Search className="h-5 w-5 text-[#AEBAC1]" />
              </button>
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
            </>
          )}
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

        <nav className="grid grid-cols-3 border-b border-white/5">
          {([
            { id: "ramais", rotulo: "Ramais" },
            { id: "agenda", rotulo: "Agenda" },
            { id: "chamadas", rotulo: "Campainha" },
          ] as Array<{ id: Aba; rotulo: string }>).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setAba(t.id)}
              className={`relative py-3 text-sm font-semibold uppercase tracking-wide transition ${
                aba === t.id ? "text-[#00A884]" : "text-[#8696A0]"
              }`}
            >
              {t.rotulo}
              {aba === t.id && <span className="absolute inset-x-4 bottom-0 h-[3px] rounded-full bg-[#00A884]" />}
            </button>
          ))}
        </nav>
      </header>

      <main className="flex-1 pb-28">
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
                  onClick={() => ligar(r.ramal)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884]/15 text-[#00A884] transition active:scale-95"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {aba === "agenda" && (
          <div>
            <div className="flex items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#00A884]">
              <span className="inline-flex items-center gap-2">
                <Smartphone className="h-4 w-4" /> Agenda do celular ({contatosFiltrados.length})
              </span>
              <button type="button" aria-label="Atualizar agenda" onClick={() => void carregarAgenda()}>
                <RefreshCw className={`h-4 w-4 ${carregandoAgenda ? "animate-spin" : ""}`} />
              </button>
            </div>
            {contatos.length === 0 && !carregandoAgenda && (
              <div className="space-y-3 px-4 py-6">
                <p className="text-sm text-[#8696A0]">
                  {agendaDisponivel()
                    ? "Permita o acesso aos contatos para ligar para pessoas da sua agenda."
                    : "Este aparelho não permite ler a agenda por aqui. Use o teclado para discar."}
                </p>
                {erroAgenda && <AvisoInline tipo="erro">{erroAgenda}</AvisoInline>}
                {agendaDisponivel() && (
                  <button
                    type="button"
                    onClick={() => void carregarAgenda()}
                    className="h-11 w-full rounded-full bg-[#00A884] text-sm font-semibold text-[#0B141A] transition active:scale-95"
                  >
                    Carregar contatos do celular
                  </button>
                )}
              </div>
            )}
            {contatosFiltrados.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-2.5 active:bg-white/5">
                <Avatar nome={c.nome} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold">{c.nome}</p>
                  <p className="truncate text-[13px] text-[#8696A0]">{c.numero}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Ligar para ${c.nome}`}
                  onClick={() => ligar(c.numero)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00A884]/15 text-[#00A884] transition active:scale-95"
                >
                  <Phone className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {aba === "chamadas" && (
          <div>
            <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#00A884]">
              Toques da campainha
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
                  <span className="block text-[15px] font-semibold">Campainha do interfone</span>
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
                  Ativar alertas de campainha
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Botão flutuante do teclado */}
      <button
        type="button"
        aria-label="Abrir teclado"
        onClick={() => setTecladoAberto(true)}
        className="fixed right-5 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#00A884] text-[#0B141A] shadow-xl shadow-black/40 transition active:scale-95"
        style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 20px)" }}
      >
        <Grid3X3 className="h-6 w-6" />
      </button>

      {/* Teclado de discagem */}
      {tecladoAberto && (
        <div className="fixed inset-0 z-40 flex flex-col bg-[#0B141A]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-base font-semibold">Discar</span>
            <button
              type="button"
              aria-label="Fechar teclado"
              onClick={() => setTecladoAberto(false)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex flex-1 flex-col justify-end px-6 pb-8" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
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
                disabled={!numero.trim()}
                onClick={() => ligar(numero, true)}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1F2C34] text-[#00A884] transition active:scale-90 disabled:opacity-40"
              >
                <Video className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Ligar"
                disabled={!numero.trim()}
                onClick={() => ligar(numero)}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-[#00A884] text-[#0B141A] shadow-lg transition active:scale-95 disabled:opacity-40"
              >
                <Phone className="h-7 w-7" />
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
          className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1F2C34] to-[#0B141A] px-6 pb-8 text-center"
          style={{
            paddingTop: "calc(env(safe-area-inset-top, 0px) + 24px)",
            paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
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
              style={{ top: "calc(env(safe-area-inset-top, 0px) + 80px)" }}
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
        <div className="fixed inset-0 z-50 flex flex-col bg-[#0B141A]" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
          <div className="flex items-center gap-3 bg-[#1F2C34] px-4 py-3">
            <button type="button" aria-label="Fechar" onClick={() => setConfigAberta(false)}>
              <ArrowLeft className="h-5 w-5 text-[#AEBAC1]" />
            </button>
            <span className="text-base font-semibold">Configurar ramal SIP</span>
          </div>
          <div
            className="flex-1 space-y-4 overflow-y-auto px-4 py-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)" }}
          >
            {[
              ...(serverConfig ? [] : [
                { id: "servidor", rotulo: "Servidor (PABX)", ph: "pabx.empresa.com.br" },
                { id: "servidorRemoto", rotulo: "Servidor alternativo (fora da empresa)", ph: "pilar.myddns.me" },
              ]),
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
              <Label htmlFor="sip-auto" className="text-sm font-normal">
                Conectar automaticamente ao abrir
              </Label>
              <Switch
                id="sip-auto"
                checked={rascunho.autoConectar}
                onCheckedChange={(v) => setRascunho({ ...rascunho, autoConectar: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-[#1F2C34] px-4 py-3">
              <Label htmlFor="sip-atender" className="text-sm font-normal">
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
