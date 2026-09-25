import { useEffect, useMemo, useState } from "react";
import { addDays, format, isBefore, startOfDay, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ContactRound,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FilaAtendimentoV2 } from "@/components/atendimento-v2/FilaAtendimentoV2";
import { PainelConversaV2 } from "@/components/atendimento-v2/PainelConversaV2";
import { UnifiedDetailsPanel } from "@/components/atendimento/UnifiedDetailsPanel";
import { CustomerSearchCreatePanel } from "@/components/atendimento/CustomerSearchCreatePanel";
import { CustomerHistoryTimeline } from "@/components/atendimento/agenda/CustomerHistoryTimeline";
import { FinalizarAtendimentoDialog } from "@/components/atendimento/FinalizarAtendimentoDialog";
import { EnvioMassaWizardPanel } from "@/components/envio-massa";
import { NewTaskDialog } from "@/components/calendar/NewTaskDialog";
import { useAtendimentoV2Data } from "@/hooks/useAtendimentoV2Data";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";
import type { AtendimentoV2Canal, AtendimentoV2FilaItem, AtendimentoV2Filtro, AtendimentoV2TelaMobile } from "@/types/atendimento-v2";

const preferenciaPainel = "atendimento_v2_painel_cadastro";
const preferenciaLargura = "atendimento_v2_largura_cadastro";

function DataCard({ data, quantidade, ativo, atrasados, onClick }: { data: Date; quantidade: number; ativo: boolean; atrasados?: boolean; onClick: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className={cn("h-14 min-w-[138px] flex-1 justify-between px-3", ativo && "border-primary bg-primary/10 text-primary", atrasados && quantidade > 0 && "text-destructive")}
    >
      <span className="text-left">
        <span className="block text-xs font-medium">{atrasados ? "Atrasados" : format(data, "EEE · dd", { locale: ptBR })}</span>
        <span className="block text-lg font-bold">{quantidade}</span>
      </span>
      <CalendarDays className="h-4 w-4 opacity-60" />
    </Button>
  );
}

export default function AtendimentoV2() {
  const isMobile = useIsMobile();
  const [largura, setLargura] = useState(() => window.innerWidth);
  const [dataSelecionada, setDataSelecionada] = useState(new Date());
  const [filtro, setFiltro] = useState<AtendimentoV2Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState("prioridade");
  const [selecionado, setSelecionado] = useState<AtendimentoV2FilaItem | null>(null);
  const [canal, setCanal] = useState<AtendimentoV2Canal>("whatsapp");
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [telaMobile, setTelaMobile] = useState<AtendimentoV2TelaMobile>("agenda");
  const [cadastroAberto, setCadastroAberto] = useState(() => localStorage.getItem(preferenciaPainel) !== "false");
  const [larguraCadastro, setLarguraCadastro] = useState(() => Number(localStorage.getItem(preferenciaLargura)) || 340);
  const [redimensionando, setRedimensionando] = useState(false);
  const [finalizarAberto, setFinalizarAberto] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const [buscaCadastroAberta, setBuscaCadastroAberta] = useState(false);
  const [agendarAberto, setAgendarAberto] = useState(false);
  const [massaAberta, setMassaAberta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const dados = useAtendimentoV2Data(dataSelecionada);
  const tablet = !isMobile && largura < 1280;

  useEffect(() => {
    const aoRedimensionar = () => setLargura(window.innerWidth);
    window.addEventListener("resize", aoRedimensionar);
    return () => window.removeEventListener("resize", aoRedimensionar);
  }, []);

  useEffect(() => {
    localStorage.setItem(preferenciaPainel, String(cadastroAberto));
  }, [cadastroAberto]);

  useEffect(() => {
    if (!redimensionando) return;
    const mover = (evento: MouseEvent) => setLarguraCadastro(Math.min(480, Math.max(300, window.innerWidth - evento.clientX)));
    const parar = () => {
      setRedimensionando(false);
      localStorage.setItem(preferenciaLargura, String(larguraCadastro));
    };
    window.addEventListener("mousemove", mover);
    window.addEventListener("mouseup", parar);
    return () => {
      window.removeEventListener("mousemove", mover);
      window.removeEventListener("mouseup", parar);
    };
  }, [larguraCadastro, redimensionando]);

  useEffect(() => {
    const conversaId = selecionado?.conversa?.id;
    if (conversaId) void dados.carregarMensagens(conversaId);
  }, [dados.carregarMensagens, selecionado?.conversa?.id]);

  const datas = useMemo(() => [new Date(), addDays(new Date(), 1), addDays(new Date(), 2), addDays(new Date(), 3)], []);
  const filaFiltrada = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    let lista = dados.fila.filter((item) => {
      if (filtro === "agendados" && !item.tarefa) return false;
      if (filtro === "recebidos" && !item.recebido) return false;
      if (!termo) return true;
      return [item.nome, item.empresa, item.motivo].some((valor) => valor.toLocaleLowerCase("pt-BR").includes(termo));
    });
    if (ordem === "nome") lista = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    if (ordem === "horario") lista = [...lista].sort((a, b) => a.horario.localeCompare(b.horario));
    return lista;
  }, [busca, dados.fila, filtro, ordem]);

  const selecionarItem = (item: AtendimentoV2FilaItem) => {
    if (modoSelecao) {
      setSelecionados((atuais) => {
        const proximos = new Set(atuais);
        proximos.has(item.key) ? proximos.delete(item.key) : proximos.add(item.key);
        return proximos;
      });
      return;
    }
    setSelecionado(item);
    setCanal(item.canal);
    if (isMobile) setTelaMobile("atendimento");
  };

  const salvarTarefa = async (tarefa: { contactId: string; contactName: string; date: Date; time: string; origem: string; observation?: string; isAllDay?: boolean; userId?: string }) => {
    const { error } = await supabase.from("calendario_tarefas").insert({
      user_id: tarefa.userId || dados.usuarioId,
      estabelecimento_id: dados.estabelecimentoId,
      contact_id: tarefa.contactId,
      contact_name: tarefa.contactName,
      title: `Contato - ${tarefa.contactName}`,
      description: tarefa.observation || null,
      date: format(tarefa.date, "yyyy-MM-dd"),
      time: tarefa.isAllDay ? null : tarefa.time || null,
      is_all_day: tarefa.isAllDay || false,
      origem: tarefa.origem,
      status: "pending",
    });
    if (error) return toast.error(error.message);
    toast.success("Tarefa agendada");
    setAgendarAberto(false);
    await dados.carregar();
  };

  const enviarMensagem = async (texto: string) => {
    const conversaId = selecionado?.conversa?.id;
    if (!conversaId) return toast.error("Este contato ainda não possui uma conversa aberta");
    setEnviando(true);
    try {
      await dados.enviarMensagem(conversaId, texto);
      toast.success("Mensagem enviada");
    } catch (erro) {
      console.error(erro);
      toast.error("Não foi possível enviar a mensagem");
      throw erro;
    } finally {
      setEnviando(false);
    }
  };

  const painelCadastro = selecionado?.contato ? (
    <UnifiedDetailsPanel
      type={canal === "email" ? "email" : "chat"}
      nome={selecionado.contato.nome}
      telefone={selecionado.contato.tel}
      whatsapp={selecionado.contato.telefone}
      email={selecionado.contato.email}
      customerId={selecionado.contato.id}
      companies={selecionado.contato.companies}
      onCompaniesUpdated={() => void dados.carregar()}
    />
  ) : (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <ContactRound className="mb-3 h-10 w-10 text-muted-foreground/40" />
      <p className="font-semibold">Nenhum cadastro selecionado</p>
      <p className="mt-1 text-sm text-muted-foreground">Localize ou cadastre o contato recebido.</p>
      <Button className="mt-4" onClick={() => setBuscaCadastroAberta(true)}>Localizar contato</Button>
    </div>
  );

  const fila = (
    <section className="flex h-full min-h-0 flex-col border-r border-border bg-card">
      <div className="shrink-0 border-b border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Fila do dia</h2>
          <Select value={ordem} onValueChange={setOrdem}>
            <SelectTrigger className="h-9 w-[132px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="prioridade">Prioridade</SelectItem>
              <SelectItem value="horario">Horário</SelectItem>
              <SelectItem value="nome">Nome</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Tabs value={filtro} onValueChange={(valor) => setFiltro(valor as AtendimentoV2Filtro)} className="mt-3">
          <TabsList className="grid h-10 w-full grid-cols-3">
            <TabsTrigger value="todos">Tudo <Badge variant="secondary" className="ml-1 px-1.5">{dados.fila.length}</Badge></TabsTrigger>
            <TabsTrigger value="agendados">Agendados</TabsTrigger>
            <TabsTrigger value="recebidos">Recebidos</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 justify-between" onClick={() => { setModoSelecao((valor) => !valor); setSelecionados(new Set()); }}>
            {modoSelecao ? "Cancelar seleção" : "Selecionar"}<ChevronDown className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-11 gap-2" onClick={() => setMassaAberta(true)} disabled={modoSelecao && selecionados.size === 0}>
            <Send className="h-4 w-4" /> Envio em massa
          </Button>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <FilaAtendimentoV2
          itens={filaFiltrada}
          selecionado={selecionado?.key}
          modoSelecao={modoSelecao}
          selecionados={selecionados}
          onSelecionar={selecionarItem}
          onMarcar={(key) => setSelecionados((atuais) => { const proximos = new Set(atuais); proximos.has(key) ? proximos.delete(key) : proximos.add(key); return proximos; })}
          onIdentificar={(item) => { setSelecionado(item); setBuscaCadastroAberta(true); }}
        />
      </div>
    </section>
  );

  const atendimento = (
    <PainelConversaV2
      item={selecionado}
      canal={canal}
      mensagens={selecionado?.conversa ? dados.mensagens[selecionado.conversa.id] || [] : []}
      enviando={enviando}
      onCanalChange={setCanal}
      onEnviar={enviarMensagem}
      onCadastro={() => isMobile ? setTelaMobile("cadastro") : setCadastroAberto(true)}
      onFinalizar={() => isMobile ? setTelaMobile("finalizacao") : setFinalizarAberto(true)}
      onHistorico={() => setHistoricoAberto(true)}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-4rem)] min-h-0 flex-col overflow-hidden bg-background text-foreground">
      {!isMobile && (
        <>
          <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
            <h1 className="shrink-0 text-xl font-bold">Minha agenda</h1>
            <span className="hidden text-sm text-muted-foreground lg:block">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</span>
            <div className="relative ml-auto w-full max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar contatos, empresas, conversas..." className="h-10 pl-9" />
            </div>
            <Button className="h-10 gap-2" onClick={() => setAgendarAberto(true)}><Plus className="h-4 w-4" /> Agendar</Button>
          </header>
          <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-border bg-card p-2">
            <DataCard data={subDays(new Date(), 1)} quantidade={dados.fila.filter((item) => item.atrasado).length} atrasados ativo={false} onClick={() => setDataSelecionada(new Date())} />
            {datas.map((data) => <DataCard key={data.toISOString()} data={data} quantidade={format(data, "yyyy-MM-dd") === format(dataSelecionada, "yyyy-MM-dd") ? dados.fila.length : 0} ativo={format(data, "yyyy-MM-dd") === format(dataSelecionada, "yyyy-MM-dd")} onClick={() => setDataSelecionada(data)} />)}
          </div>
          <main className="grid min-h-0 flex-1" style={{ gridTemplateColumns: tablet ? "350px minmax(0,1fr)" : cadastroAberto ? `410px minmax(440px,1fr) ${larguraCadastro}px` : "410px minmax(440px,1fr)" }}>
            {fila}
            <section className="relative min-w-0">
              {atendimento}
              {!tablet && (
                <Button size="icon" variant="outline" onClick={() => setCadastroAberto((valor) => !valor)} className="absolute right-3 top-3 z-20 h-9 w-9" title={cadastroAberto ? "Recolher cadastro" : "Abrir cadastro"}>
                  {cadastroAberto ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                </Button>
              )}
            </section>
            {!tablet && cadastroAberto && (
              <aside className="relative min-w-0 border-l border-border bg-card">
                <div className="absolute inset-y-0 -left-1 z-20 w-2 cursor-col-resize" onMouseDown={() => setRedimensionando(true)} />
                <div className="flex h-12 items-center justify-between border-b border-border px-4"><h2 className="font-bold">Cadastro e vínculos</h2><Button size="icon" variant="ghost" onClick={() => setCadastroAberto(false)}><X className="h-4 w-4" /></Button></div>
                <div className="h-[calc(100%-3rem)]">{painelCadastro}</div>
              </aside>
            )}
          </main>
          {tablet && (
            <Sheet open={cadastroAberto} onOpenChange={setCadastroAberto}>
              <SheetContent className="w-[440px] max-w-[85vw] p-0 sm:max-w-[440px]">
                <SheetHeader className="h-14 border-b border-border px-4 py-4"><SheetTitle>Cadastro e vínculos</SheetTitle></SheetHeader>
                <div className="h-[calc(100dvh-3.5rem)]">{painelCadastro}</div>
              </SheetContent>
            </Sheet>
          )}
        </>
      )}

      {isMobile && (
        <main className="flex min-h-0 flex-1 flex-col bg-card">
          {telaMobile === "agenda" && (
            <>
              <header className="shrink-0 border-b border-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
                <div className="flex items-center justify-between"><h1 className="text-xl font-bold">Minha agenda</h1><div className="flex gap-1"><Button size="icon" variant="ghost"><Search className="h-5 w-5" /></Button><Button size="icon" onClick={() => setAgendarAberto(true)}><Plus className="h-5 w-5" /></Button></div></div>
                <div className="mt-3 flex items-center justify-between"><Button size="sm" variant="ghost" onClick={() => setDataSelecionada(subDays(dataSelecionada, 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="text-sm font-semibold">{format(dataSelecionada, "dd MMM yyyy", { locale: ptBR })}</span><Button size="sm" variant="ghost" onClick={() => setDataSelecionada(addDays(dataSelecionada, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <DataCard data={new Date()} quantidade={dados.fila.filter((item) => item.atrasado).length} atrasados ativo={false} onClick={() => undefined} />
                  <DataCard data={new Date()} quantidade={dados.fila.length} ativo onClick={() => setDataSelecionada(new Date())} />
                  <DataCard data={addDays(new Date(), 1)} quantidade={0} ativo={false} onClick={() => setDataSelecionada(addDays(new Date(), 1))} />
                </div>
                <Tabs value={filtro} onValueChange={(valor) => setFiltro(valor as AtendimentoV2Filtro)} className="mt-3"><TabsList className="grid w-full grid-cols-3"><TabsTrigger value="todos">Tudo</TabsTrigger><TabsTrigger value="agendados">Agendados</TabsTrigger><TabsTrigger value="recebidos">Recebidos</TabsTrigger></TabsList></Tabs>
                <Button variant="ghost" size="sm" className="ml-auto mt-2 flex" onClick={() => { setModoSelecao((valor) => !valor); setSelecionados(new Set()); }}>{modoSelecao ? "Cancelar" : "Selecionar"}</Button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto"><FilaAtendimentoV2 itens={filaFiltrada} selecionado={selecionado?.key} modoSelecao={modoSelecao} selecionados={selecionados} onSelecionar={selecionarItem} onMarcar={(key) => setSelecionados((atuais) => { const proximos = new Set(atuais); proximos.has(key) ? proximos.delete(key) : proximos.add(key); return proximos; })} onIdentificar={(item) => { setSelecionado(item); setBuscaCadastroAberta(true); }} /></div>
              <div className="shrink-0 border-t border-border p-3 pb-[max(.75rem,env(safe-area-inset-bottom))]"><Button variant="outline" className="h-12 w-full gap-2" onClick={() => setMassaAberta(true)}><Send className="h-4 w-4" /> Envio em massa</Button></div>
            </>
          )}
          {telaMobile === "atendimento" && <><div className="shrink-0 border-b border-border px-2 pt-[max(.5rem,env(safe-area-inset-top))]"><Button variant="ghost" className="h-11 gap-1" onClick={() => setTelaMobile("agenda")}><ArrowLeft className="h-4 w-4" />Agenda</Button></div><div className="min-h-0 flex-1">{atendimento}</div></>}
          {telaMobile === "cadastro" && <><div className="shrink-0 border-b border-border px-2 pt-[max(.5rem,env(safe-area-inset-top))]"><Button variant="ghost" className="h-11 gap-1" onClick={() => setTelaMobile("atendimento")}><ArrowLeft className="h-4 w-4" />Atendimento</Button></div><div className="min-h-0 flex-1 overflow-hidden">{painelCadastro}</div></>}
          {telaMobile === "finalizacao" && <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center"><CalendarDays className="h-12 w-12 text-primary" /><h1 className="text-xl font-bold">Finalizar atendimento</h1><p className="text-sm text-muted-foreground">Revise o resultado e defina o próximo contato antes de concluir.</p><Button className="h-12 w-full" onClick={() => setFinalizarAberto(true)}>Preencher finalização</Button><Button variant="outline" className="h-12 w-full" onClick={() => setTelaMobile("atendimento")}>Voltar</Button></div>}
        </main>
      )}

      <FinalizarAtendimentoDialog open={finalizarAberto} onOpenChange={setFinalizarAberto} contato={selecionado?.contatoId ? { id: selecionado.contatoId, nome: selecionado.nome } : null} canal={canal === "visita" ? "presencial" : canal} usuarioId={dados.usuarioId} estabelecimentoId={dados.estabelecimentoId} tarefaAtualId={selecionado?.tarefa?.id} onFinalizado={() => { void dados.carregar(); if (isMobile) setTelaMobile("agenda"); }} />
      <NewTaskDialog open={agendarAberto} onOpenChange={setAgendarAberto} onSave={(tarefa) => void salvarTarefa(tarefa)} initialDate={dataSelecionada} />

      <Dialog open={historicoAberto} onOpenChange={setHistoricoAberto}><DialogContent className="h-[85dvh] max-w-3xl overflow-hidden"><DialogHeader><DialogTitle>Histórico de {selecionado?.nome}</DialogTitle></DialogHeader><div className="min-h-0 flex-1 overflow-y-auto"><CustomerHistoryTimeline contactId={selecionado?.contatoId || undefined} contactName={selecionado?.nome} estabelecimentoId={dados.estabelecimentoId} isFullView /></div></DialogContent></Dialog>
      <Dialog open={buscaCadastroAberta} onOpenChange={setBuscaCadastroAberta}><DialogContent className="h-[82dvh] max-w-2xl overflow-hidden p-0"><DialogHeader className="border-b border-border p-4"><DialogTitle>Localizar ou cadastrar contato</DialogTitle></DialogHeader><CustomerSearchCreatePanel mode="customer" onClose={() => setBuscaCadastroAberta(false)} onSelect={() => { setBuscaCadastroAberta(false); void dados.carregar(); }} /></DialogContent></Dialog>
      {massaAberta && <EnvioMassaWizardPanel onClose={() => setMassaAberta(false)} onComplete={() => { setMassaAberta(false); void dados.carregar(); }} />}
    </div>
  );
}