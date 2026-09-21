import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SessionState } from "sip.js";
import {
  ArrowRightLeft,
  Headset,
  ListOrdered,
  Monitor,
  Pause,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  Play,
  RefreshCw,
  Search,
  Smartphone,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useSipConnection } from "@/hooks/useSipConnection";
import {
  usePainelTelefonista,
  type ChamadaAoVivo,
  type RamalTelefonista,
} from "@/hooks/usePainelTelefonista";
import { lerConfigSipDoUsuario } from "@/lib/portaria/sipConfigUsuario";

type EstadoRamal = "livre" | "tocando" | "conversa" | "offline";

const ROTULO_ESTADO: Record<EstadoRamal, string> = {
  livre: "Livre",
  tocando: "Tocando",
  conversa: "Em conversa",
  offline: "Offline",
};

/** Extrai os números (2+ dígitos) de um texto de origem/destino do PABX. */
const numerosDe = (texto?: string): string[] => (texto || "").match(/\d{2,}/g) ?? [];

const ramalNaChamada = (c: ChamadaAoVivo, ramal: string) =>
  numerosDe(c.origem).includes(ramal) || numerosDe(c.destino).includes(ramal);

function CorEstado({ estado }: { estado: EstadoRamal }) {
  const classe =
    estado === "conversa"
      ? "bg-red-500"
      : estado === "tocando"
        ? "bg-amber-500 animate-pulse"
        : estado === "livre"
          ? "bg-green-500"
          : "bg-muted-foreground/40";
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${classe}`} />;
}

export default function Telefonista() {
  const { toast } = useToast();
  const painel = usePainelTelefonista(10000);
  const sip = useSipConnection();

  const [busca, setBusca] = useState("");
  const [discagem, setDiscagem] = useState("");
  const [chamadaParaEncerrar, setChamadaParaEncerrar] = useState<ChamadaAoVivo | null>(null);
  const [encerrando, setEncerrando] = useState(false);
  const [acaoEmRamal, setAcaoEmRamal] = useState<string | null>(null);

  // Conecta o ramal do usuário automaticamente, como o Pilar Fone faz.
  const conectarRef = useRef(sip.connect);
  conectarRef.current = sip.connect;
  useEffect(() => {
    let ativo = true;
    (async () => {
      const config = await lerConfigSipDoUsuario();
      if (!ativo || !config?.ramal || !config?.senha || !config?.servidor) return;
      void conectarRef.current({
        server: config.servidor,
        serverPort: config.porta,
        extension: config.ramal,
        authUser: config.usuarioSip,
        password: config.senha,
        displayName: config.nome,
      });
    })();
    return () => {
      ativo = false;
    };
  }, []);

  const chamadaEntrando = sip.activeCalls.find(
    (c) => c.direction === "inbound" && c.state === SessionState.Initial,
  );
  const chamadaAtiva = sip.activeCalls.find((c) => c.state === SessionState.Established);

  const estadoDoRamal = useCallback(
    (r: RamalTelefonista): EstadoRamal => {
      if (painel.chamadas.some((c) => c.estado === "Em conversa" && ramalNaChamada(c, r.ramal))) {
        return "conversa";
      }
      if (painel.chamadas.some((c) => c.estado !== "Em conversa" && ramalNaChamada(c, r.ramal))) {
        return "tocando";
      }
      if (r.onlinePabx || r.noSistema) return "livre";
      return "offline";
    },
    [painel.chamadas],
  );

  const ramaisFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return painel.ramais;
    return painel.ramais.filter(
      (r) => r.ramal.includes(termo) || (r.nome ?? "").toLowerCase().includes(termo),
    );
  }, [painel.ramais, busca]);

  const invocar = async (corpo: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("ucm-telefonista", { body: corpo });
    const resposta = (data || {}) as { ok?: boolean; error?: string; message?: string };
    if (error || resposta.error) {
      throw new Error(resposta.error || "O PABX recusou a operação");
    }
    return resposta;
  };

  const ligarParaRamal = (ramal: string) => {
    if (!sip.isRegistered) {
      toast({
        title: "Ramal não registrado",
        description: "Aguarde o registro do seu ramal ou verifique a senha SIP no seu cadastro.",
        variant: "destructive",
      });
      return;
    }
    void sip.dial(ramal);
  };

  const transferirPara = async (ramal: string) => {
    if (!chamadaAtiva) return;
    setAcaoEmRamal(ramal);
    try {
      await sip.transferirChamada(chamadaAtiva.id, ramal);
    } finally {
      setAcaoEmRamal(null);
    }
  };

  const puxarChamada = async (ramal: string) => {
    setAcaoEmRamal(ramal);
    try {
      const r = await invocar({ acao: "puxar", ramal });
      toast({ title: "Captura enviada", description: r.message });
      void painel.atualizar();
    } catch (erro) {
      toast({
        title: "Não foi possível puxar",
        description: erro instanceof Error ? erro.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setAcaoEmRamal(null);
    }
  };

  const pausarAgente = async (fila: string, ramal: string, pausar: boolean) => {
    try {
      const r = await invocar({ acao: "fila_pausar", fila, ramal, pausar });
      toast({ title: pausar ? "Agente pausado" : "Agente reativado", description: r.message });
      void painel.atualizar();
    } catch (erro) {
      toast({
        title: "Operação não realizada",
        description: erro instanceof Error ? erro.message : "Erro inesperado",
        variant: "destructive",
      });
    }
  };

  const confirmarEncerramento = async () => {
    if (!chamadaParaEncerrar?.canal) return;
    setEncerrando(true);
    try {
      const r = await invocar({ acao: "desligar", canal: chamadaParaEncerrar.canal });
      toast({ title: "Chamada encerrada", description: r.message });
      setChamadaParaEncerrar(null);
      void painel.atualizar();
    } catch (erro) {
      toast({
        title: "Não foi possível encerrar",
        description: erro instanceof Error ? erro.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setEncerrando(false);
    }
  };

  const discarRapido = () => {
    const numero = discagem.trim();
    if (!numero) return;
    ligarParaRamal(numero);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Headset className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Telefonista</h1>
            <p className="text-xs text-muted-foreground">Mesa operadora do PABX</p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {painel.meuRamal && (
            <Badge variant="secondary">Meu ramal: {painel.meuRamal}</Badge>
          )}
          <Badge variant={sip.isRegistered ? "default" : "outline"}>
            {sip.isRegistered ? "Ramal registrado" : sip.isConnecting ? "Registrando..." : "Ramal offline"}
          </Badge>
          <Badge variant={painel.pabxDisponivel ? "default" : "destructive"}>
            {painel.pabxDisponivel ? "PABX online" : "PABX indisponível"}
          </Badge>
          <Button variant="outline" size="icon" onClick={() => void painel.atualizar()} title="Atualizar agora">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {painel.pabxDisponivel === false && painel.motivoPabx && (
        <Card className="border-destructive/50">
          <CardContent className="py-3 text-sm text-destructive">{painel.motivoPabx}</CardContent>
        </Card>
      )}

      {/* Chamada chegando no meu ramal (Pilar Fone da tela) */}
      {chamadaEntrando && (
        <Card className="border-primary">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <PhoneIncoming className="h-5 w-5 animate-pulse text-primary" />
            <div className="mr-auto">
              <p className="font-semibold text-foreground">Chamada recebida</p>
              <p className="text-sm text-muted-foreground">De: {chamadaEntrando.phoneNumber}</p>
            </div>
            <Button onClick={() => void sip.answer(chamadaEntrando.id)}>Atender</Button>
            <Button variant="destructive" onClick={() => void sip.hangup(chamadaEntrando.id)}>
              Recusar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Minha ligação em andamento */}
      {chamadaAtiva && (
        <Card className="border-green-500/60">
          <CardContent className="flex flex-wrap items-center gap-3 py-3">
            <PhoneCall className="h-5 w-5 text-green-500" />
            <div className="mr-auto">
              <p className="font-semibold text-foreground">Em ligação com {chamadaAtiva.phoneNumber}</p>
              <p className="text-sm text-muted-foreground">
                Para transferir, clique no ramal desejado e escolha "Transferir".
              </p>
            </div>
            <Button variant="destructive" onClick={() => void sip.hangup(chamadaAtiva.id)}>
              <PhoneOff className="mr-2 h-4 w-4" /> Desligar
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Ramais */}
        <Card className="lg:col-span-2">
          <CardHeader className="gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">Ramais</CardTitle>
              {chamadaAtiva && (
                <Badge variant="outline" className="border-primary text-primary">
                  Modo transferência: escolha um ramal
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-48 flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar ramal ou nome..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  className="w-40"
                  placeholder="Discar número"
                  value={discagem}
                  onChange={(e) => setDiscagem(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && discarRapido()}
                />
                <Button size="sm" onClick={discarRapido} disabled={!discagem.trim()}>
                  <Phone className="mr-1 h-4 w-4" /> Ligar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {painel.carregando ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Carregando ramais...</p>
            ) : ramaisFiltrados.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nenhum ramal encontrado.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {ramaisFiltrados.map((r) => {
                  const estado = estadoDoRamal(r);
                  const souEu = r.ramal === painel.meuRamal;
                  return (
                    <Popover key={r.ramal}>
                      <PopoverTrigger asChild>
                        <button
                          className={`flex flex-col items-start gap-1 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent ${
                            chamadaAtiva && !souEu ? "ring-1 ring-primary/50" : ""
                          }`}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="text-lg font-bold text-foreground">{r.ramal}</span>
                            <CorEstado estado={estado} />
                          </div>
                          <span className="w-full truncate text-xs text-muted-foreground">
                            {r.nome || (r.tipo ?? "Ramal")}
                            {souEu ? " (você)" : ""}
                          </span>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            {r.noSistema && (
                              <span title="Conectado pelo sistema"><Monitor className="h-3.5 w-3.5" /></span>
                            )}
                            {(r.onlinePabx || r.noSistema) && (
                              <span title="Registrado no PABX"><Smartphone className="h-3.5 w-3.5" /></span>
                            )}
                            <span className="text-[11px]">{ROTULO_ESTADO[estado]}</span>
                          </div>
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-56 p-2" align="start">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            disabled={souEu || acaoEmRamal === r.ramal}
                            onClick={() => ligarParaRamal(r.ramal)}
                          >
                            <Phone className="mr-2 h-4 w-4" /> Ligar para {r.ramal}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            disabled={!chamadaAtiva || souEu || acaoEmRamal === r.ramal}
                            title={chamadaAtiva ? "Transferir minha ligação para este ramal" : "Disponível durante uma ligação sua"}
                            onClick={() => void transferirPara(r.ramal)}
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Transferir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="justify-start"
                            disabled={estado !== "tocando" || souEu || acaoEmRamal === r.ramal}
                            title={estado === "tocando" ? "Atender a chamada que está tocando neste ramal" : "Disponível quando o ramal estiver tocando"}
                            onClick={() => void puxarChamada(r.ramal)}
                          >
                            <PhoneForwarded className="mr-2 h-4 w-4" /> Puxar chamada
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna lateral */}
        <div className="flex flex-col gap-4">
          {/* Chamadas ao vivo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Chamadas ao vivo</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {painel.chamadas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma chamada em andamento.</p>
              ) : (
                painel.chamadas.map((c, i) => (
                  <div key={c.canal ?? i} className="flex items-center gap-2 rounded-md border p-2">
                    <PhoneCall className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {c.origem || "?"} → {c.destino || "?"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.estado}
                        {c.duracao ? ` · ${c.duracao}` : ""}
                      </p>
                    </div>
                    {c.canal && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        title="Encerrar esta chamada"
                        onClick={() => setChamadaParaEncerrar(c)}
                      >
                        <PhoneOff className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Filas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ListOrdered className="h-4 w-4" /> Filas
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {painel.filas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma fila configurada no PABX.</p>
              ) : (
                painel.filas.map((f) => (
                  <div key={f.numero} className="rounded-md border p-2">
                    <p className="text-sm font-semibold text-foreground">
                      {f.numero} {f.nome ? `— ${f.nome}` : ""}
                    </p>
                    {f.estrategia && (
                      <p className="text-xs text-muted-foreground">Estratégia: {f.estrategia}</p>
                    )}
                    <div className="mt-1 flex flex-col gap-1">
                      {f.agentes.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Sem agentes nesta fila.</p>
                      ) : (
                        f.agentes.map((a) => (
                          <div key={a.ramal} className="flex items-center gap-2 text-sm">
                            <CorEstado estado={a.pausado ? "offline" : "livre"} />
                            <span className="flex-1 truncate">
                              {a.ramal}
                              {a.nome ? ` — ${a.nome}` : ""}
                              {a.pausado ? " (pausado)" : ""}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              title={a.pausado ? "Retomar atendimento" : "Pausar atendimento"}
                              onClick={() => void pausarAgente(f.numero, a.ramal, !a.pausado)}
                            >
                              {a.pausado ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Linhas (troncos) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Linhas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {!painel.troncosDisponiveis ? (
                <p className="text-sm text-muted-foreground">
                  A conta da API do PABX não tem permissão para listar as linhas neste UCM.
                </p>
              ) : painel.troncos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma linha configurada.</p>
              ) : (
                painel.troncos.map((t, i) => (
                  <div key={`${t.nome ?? "linha"}-${i}`} className="flex items-center gap-2 rounded-md border p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{t.nome || "Linha"}</p>
                      <p className="text-xs text-muted-foreground">{t.tipo}</p>
                    </div>
                    <Badge variant={t.status === "Ativo" ? "default" : "destructive"}>{t.status}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmação para encerrar chamada de terceiros */}
      <AlertDialog open={!!chamadaParaEncerrar} onOpenChange={(aberto) => !aberto && setChamadaParaEncerrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Encerrar chamada</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja encerrar a chamada {chamadaParaEncerrar?.origem || "?"} →{" "}
              {chamadaParaEncerrar?.destino || "?"}? A ligação cai na hora para as duas partes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={encerrando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmarEncerramento();
              }}
              disabled={encerrando}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {encerrando ? "Encerrando..." : "Encerrar chamada"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
