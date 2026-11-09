import { useEffect, useMemo, useState } from "react";
import { PrazosProximoContatoDialog } from "./PrazosProximoContatoDialog";
import { LayoutList, CalendarClock, Bot, CalendarCheck, CalendarDays, FileText, Flag, Ban, History, PhoneCall, ListOrdered, PhoneForwarded, UserX } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useBotUsuario } from "./useBotUsuario";
import { usePendenciasAtendimento, useModoSimultaneo } from "@/hooks/usePendenciasAtendimento";
import { pedirFinalizacao } from "@/lib/atendimento/finalizarAtendimento";
import { itemNaoFinalizado } from "@/lib/atendimento/barraFinalizacao";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  Mail,
  MapPin,
  Send,
  ChevronDown,
  MoreVertical,
  MessageCircle,
  Inbox,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RegrasPotenciaisDialog } from "./RegrasPotenciaisDialog";
import { AutomacoesAtendimentoDialog } from "./AutomacoesAtendimentoDialog";
import { RemetentesIgnoradosDialog } from "./RemetentesIgnoradosDialog";
import { TutorialAtendimentoDialog, CHAVE_TUTORIAL_VISTO } from "./TutorialAtendimentoDialog";
import { GraduationCap } from "lucide-react";
import { URGENCIA, SELO_CREDITO, proximoDaFila, type NivelUrgencia, type SituacaoCredito } from "@/lib/atendimento/copilotoAtendimento";

export type FilaCanal = "telefone" | "whatsapp" | "email" | "visita";

export interface FilaItem {
  id: string;
  tipo: "agendado" | "recebido" | "potencial";
  /** Potenciais: motivo (sempre visível) de o cliente estar na lista. */
  potencial?: { rotulo: string; motivos: string[] };
  contactId?: string | null;
  nome: string;
  empresa?: string;
  motivo: string;
  canal: FilaCanal;
  horario?: string;
  /** Data do agendamento atrasado (dd/MM). */
  data?: string;
  atrasado?: boolean;
  mensagensNovas?: number;
  /** Origem visível da mensagem recebida (ex.: WhatsApp, Instagram, E-mail). */
  origem?: string;
  selecionado?: boolean;
  bloqueado?: boolean;
  /** Tarefa de outro usuário assumido (cor diferente). */
  assumido?: boolean;
  /** Canais que o contato tem cadastrados. */
  canais?: FilaCanal[];
  onCanal?: (canal: FilaCanal) => void;
  onOrcamento?: (orcamentoId: string) => void;
  onOrcamentosCentro?: (contactId: string, nome: string) => void;
  onAgendaCentro?: (contactId: string, nome: string) => void;
  onHistorico?: () => void;
  onClick: () => void;
  menuItems?: { label: string; onClick: () => void }[];
  /** Recebidos: item sinalizado como tratado sem resposta. */
  sinalizado?: boolean;
  onSinalizar?: () => void;
  /** Recebidos: opções para ignorar o remetente (não é cliente). */
  ignorarOpcoes?: { rotulo: string; tipo: "email" | "dominio" | "telefone"; valor: string }[];
  onIgnorar?: (tipo: "email" | "dominio" | "telefone", valor: string) => void;
  /** Recebidos: classificação de urgência do texto (IA de palavras-chave). */
  urgencia?: NivelUrgencia;
  /** Situação de crédito da empresa principal do contato. */
  credito?: SituacaoCredito;
  onCredito?: (s: SituacaoCredito) => void;
  /** Itens importantes faltando no cadastro do contato. */
  cadastroFaltando?: string[];
}

export type FiltroFila = "tudo" | "agendados" | "recebidos" | "potenciais";
type OrdenacaoFila = "prioridade" | "horario" | "nome";

const CANAL_CONFIG: Record<FilaCanal, { label: string; icon: typeof Phone; cor: string; fundo: string; borda: string }> = {
  telefone: { label: "Telefone", icon: Phone, cor: "text-primary", fundo: "bg-primary/10", borda: "border-primary" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, cor: "text-success", fundo: "bg-success/10", borda: "border-success" },
  email: { label: "E-mail", icon: Mail, cor: "text-info", fundo: "bg-info/10", borda: "border-info" },
  visita: { label: "Visita", icon: MapPin, cor: "text-purple-500", fundo: "bg-purple-500/10", borda: "border-purple-500" },
};

function iniciais(nome: string): string {
  return nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();
}

export interface AssumirContatosConfig {
  grupos: { titulo: string; itens: { id: string; nome: string }[] }[];
  assumidos: string[];
  onAlternar: (id: string, marcado: boolean) => void;
  onLimpar: () => void;
}

interface FilaDoDiaProps {
  items: FilaItem[];
  tablet?: boolean;
  onEnvioMassa?: (idsSelecionados: string[]) => void;
  /** Abre a tela de disparo em massa (canal + seleção de contatos). */
  onDisparoMassa?: () => void;
  /** Ligação sequencial/aprovação com os contatos selecionados (ids de contato). */
  onLigacaoSequencial?: (contactIds: string[]) => void;
  /** Modo do discador em execução (null = parado). */
  discadorAtivo?: "previa" | "sequencial" | null;
  onPararDiscador?: () => void;
  onConfigurarRegra: () => void;
  vazioTexto?: string;
  headerExtra?: React.ReactNode;
  painelAberto?: boolean;
  onTogglePainel?: () => void;
  filtro?: FiltroFila;
  onFiltroChange?: (filtro: FiltroFila) => void;
  assumirContatos?: AssumirContatosConfig;
  /** Totais fixos de cada aba (não dependem da aba ativa). */
  totais?: { tudo: number; agendados: number; recebidos: number; potenciais?: number };
  /** Recebidos: alterna a visão dos itens sinalizados como tratados sem resposta. */
  verSinalizados?: boolean;
  onToggleSinalizados?: () => void;
  totalSinalizados?: number;
  /** Termômetro da carteira (calculado a partir dos potenciais). */
  termometro?: { risco: number; reposicao: number; orcamentos: number };
}

/** O item pertence ao canal se for o canal de origem ou se o contato tiver esse canal disponível. */
function temCanalItem(item: FilaItem, canais: Set<FilaCanal>) {
  if (canais.has(item.canal)) return true;
  return (item.canais || []).some((c) => canais.has(c));
}

const ICONE_ABA: Partial<Record<FiltroFila, typeof LayoutList>> = {
  tudo: LayoutList,
  agendados: CalendarClock,
  recebidos: Inbox,
  potenciais: Sparkles,
};

export function FilaDoDia({ items, tablet = false, onDisparoMassa, discadorAtivo, onPararDiscador, onConfigurarRegra, vazioTexto, headerExtra, painelAberto, onTogglePainel, filtro: filtroProp, onFiltroChange, assumirContatos, totais, verSinalizados, onToggleSinalizados, totalSinalizados, termometro }: FilaDoDiaProps) {
  const [filtroInterno, setFiltroInterno] = useState<FiltroFila>("tudo");
  const [acoesExpandidas, setAcoesExpandidas] = useState<Set<string>>(new Set());
  const [orcAberto, setOrcAberto] = useState<string | null>(null);
  const [orcLista, setOrcLista] = useState<any[]>([]);
  const [orcCarregando, setOrcCarregando] = useState(false);
  const alternarOrcamentos = async (contactId: string) => {
    if (orcAberto === contactId) { setOrcAberto(null); return; }
    setOrcAberto(contactId);
    setOrcCarregando(true);
    const { data } = await supabase
      .from("orcamentos")
      .select("id, created_at, status, etapa, valor_total")
      .eq("cliente_id", contactId)
      .order("created_at", { ascending: false })
      .limit(5);
    setOrcLista(data || []);
    setOrcCarregando(false);
  };
  const filtro = filtroProp ?? filtroInterno;
  const setFiltro = (valor: FiltroFila) => {
    setFiltroInterno(valor);
    onFiltroChange?.(valor);
  };
  const [ordenacao, setOrdenacao] = useState<OrdenacaoFila>("prioridade");
  const pendencias = usePendenciasAtendimento();
  const [simultaneo] = useModoSimultaneo();
  const [canaisAtivos, setCanaisAtivos] = useState<Set<FilaCanal>>(new Set());
  const [somenteNaoFinalizados, setSomenteNaoFinalizados] = useState(false);
  const [prazosAberto, setPrazosAberto] = useState(false);
  const [regrasPotenciaisAberto, setRegrasPotenciaisAberto] = useState(false);
  const [automacoesAberto, setAutomacoesAberto] = useState(false);
  const [ignoradosAberto, setIgnoradosAberto] = useState(false);
  const [tutorialAberto, setTutorialAberto] = useState(false);
  const [simulacoesAberto, setSimulacoesAberto] = useState(false);
  const [ehAdmin, setEhAdmin] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem(CHAVE_TUTORIAL_VISTO)) setTimeout(() => setTutorialAberto(true), 800);
    let vivo = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: eu } = await (supabase as any).from("usuarios").select("id, grupos_acesso(perfil)").eq("auth_user_id", auth.user.id).limit(1).maybeSingle();
      const grupo: any = Array.isArray(eu?.grupos_acesso) ? eu.grupos_acesso[0] : eu?.grupos_acesso;
      const ids = [auth.user.id, eu?.id].filter(Boolean);
      const { data: role } = await supabase.from("user_roles").select("user_id").in("user_id", ids).eq("role", "admin").limit(1).maybeSingle();
      if (vivo) setEhAdmin(!!role || grupo?.perfil === "admin");
    })();
    return () => { vivo = false; };
  }, []);

  const alternarCanal = (canal: FilaCanal) => {
    setCanaisAtivos((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(canal)) proximo.delete(canal);
      else proximo.add(canal);
      return proximo;
    });
  };

  const botUsuario = useBotUsuario();
  const totalAgendados = items.filter((item) => item.tipo === "agendado").length;
  const totalRecebidos = items.filter((item) => item.tipo === "recebido").length;

  const baseAba = useMemo(() => {
    if (filtro === "agendados") return items.filter((item) => item.tipo === "agendado");
    if (filtro === "recebidos") return items.filter((item) => item.tipo === "recebido");
    if (filtro === "potenciais") return items.filter((item) => item.tipo === "potencial");
    return items;
  }, [items, filtro]);

  /** Contatos da aba atual com atendimento ainda não finalizado. */
  const totalNaoFinalizados = useMemo(
    () => baseAba.filter((item) => itemNaoFinalizado(item.contactId, pendencias)).length,
    [baseAba, pendencias]
  );

  const visiveis = useMemo(() => {
    let lista = items;
    if (filtro === "agendados") lista = lista.filter((item) => item.tipo === "agendado");
    if (filtro === "recebidos") lista = lista.filter((item) => item.tipo === "recebido");
    if (filtro === "potenciais") lista = lista.filter((item) => item.tipo === "potencial");
    if (canaisAtivos.size > 0) lista = lista.filter((item) => temCanalItem(item, canaisAtivos));
    if (somenteNaoFinalizados) lista = lista.filter((item) => itemNaoFinalizado(item.contactId, pendencias));


    const ordenada = [...lista];
    if (ordenacao === "nome") {
      ordenada.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    } else if (ordenacao === "horario") {
      ordenada.sort((a, b) => (a.horario || "99:99").localeCompare(b.horario || "99:99"));
    } else {
      // Prioridade: atrasados primeiro, depois com mensagens novas, depois por horário
      ordenada.sort((a, b) => {
        const urg = (b.urgencia ? URGENCIA[b.urgencia].peso : 0) - (a.urgencia ? URGENCIA[a.urgencia].peso : 0);
        if (urg !== 0) return urg;
        const atrasoDiff = Number(b.atrasado || false) - Number(a.atrasado || false);
        if (atrasoDiff !== 0) return atrasoDiff;
        const msgDiff = (b.mensagensNovas || 0) - (a.mensagensNovas || 0);
        if (msgDiff !== 0) return msgDiff;
        return (a.horario || "99:99").localeCompare(b.horario || "99:99");
      });
    }
    return ordenada;
  }, [items, filtro, ordenacao, canaisAtivos, somenteNaoFinalizados, pendencias]);

  const abrirProximo = () => {
    const atual = visiveis.find((i) => i.selecionado)?.id ?? null;
    const prox = proximoDaFila(visiveis, atual);
    if (!prox) return;
    prox.onClick();
    setTimeout(() => document.querySelector(`[data-fila-id="${CSS.escape(prox.id)}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50);
  };
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => { if (e.altKey && e.key === "ArrowDown") { e.preventDefault(); abrirProximo(); } };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  const chips: { id: FiltroFila; label: string; total: number }[] = [
    { id: "tudo", label: "Tudo", total: totais?.tudo ?? items.length },
    { id: "agendados", label: "Agendados", total: totais?.agendados ?? totalAgendados },
    { id: "recebidos", label: "Recebidos", total: totais?.recebidos ?? totalRecebidos },
    { id: "potenciais", label: "Potenciais", total: totais?.potenciais ?? items.filter((item) => item.tipo === "potencial").length },
  ];

  return (
    <div className="flex min-w-0 flex-col flex-1 min-h-0 overflow-x-hidden bg-background">
      <RegrasPotenciaisDialog
        open={regrasPotenciaisAberto}
        onOpenChange={(v) => {
          setRegrasPotenciaisAberto(v);
          if (!v) setTimeout(() => { document.body.style.pointerEvents = ""; }, 300);
        }}
      />
      <TutorialAtendimentoDialog open={tutorialAberto} onOpenChange={setTutorialAberto} />
      <RemetentesIgnoradosDialog
        open={ignoradosAberto}
        onOpenChange={(v) => {
          setIgnoradosAberto(v);
          if (!v) setTimeout(() => { document.body.style.pointerEvents = ""; }, 300);
        }}
      />
      <AutomacoesAtendimentoDialog
        open={automacoesAberto}
        onOpenChange={(v) => {
          setAutomacoesAberto(v);
          if (!v) setTimeout(() => { document.body.style.pointerEvents = ""; }, 300);
        }}
      />
      <PrazosProximoContatoDialog
        open={prazosAberto}
        onOpenChange={(v) => {
          setPrazosAberto(v);
          if (!v) setTimeout(() => { document.body.style.pointerEvents = ""; }, 300);
        }}
      />
      {/* Cabeçalho */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="text-lg font-bold text-foreground">Contatos</h2>
            {botUsuario.botAtual && (
              <label
                className="flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground"
                title={`Bot: ${botUsuario.botAtual.nome}`}
              >
                <Bot className="h-3.5 w-3.5 shrink-0" />
                <Switch
                  checked={botUsuario.ativo}
                  onCheckedChange={(v) => void botUsuario.alternarAtivo(v)}
                  aria-label="Ativar bot de atendimento"
                  className="scale-75"
                />
              </label>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTutorialAberto(true)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-primary hover:bg-muted transition-colors"
              aria-label="Tour interativo do Atendimento"
              title="Tour interativo do Atendimento"
            >
              <GraduationCap className="h-4 w-4" />
            </button>
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Mais opções"
                  data-tour="fila-menu"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    Ordenar fila: {ordenacao === "prioridade" ? "Prioridade" : ordenacao === "horario" ? "Horário" : "Nome"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-72">
                    {([
                      { v: "prioridade", t: "Prioridade (recomendado)", d: "Coloca no topo quem precisa de você primeiro: 1º mensagens urgentes ou reclamações, 2º contatos atrasados, 3º quem tem mais mensagens sem resposta, 4º horário agendado. O atalho Alt + ↓ segue esta ordem." },
                      { v: "horario", t: "Horário agendado", d: "Mostra os contatos pela hora marcada, do mais cedo ao mais tarde. Bom para seguir a agenda do dia à risca." },
                      { v: "nome", t: "Nome do contato", d: "Ordem alfabética (A–Z). Útil para achar um contato rapidamente." },
                    ] as const).map((o) => (
                      <DropdownMenuItem key={o.v} onSelect={() => setOrdenacao(o.v)} className="flex flex-col items-start gap-0.5">
                        <span className="text-sm font-medium">{ordenacao === o.v ? "✓ " : ""}{o.t}</span>
                        <span className="text-[11px] leading-snug text-muted-foreground whitespace-normal">{o.d}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { setTimeout(() => setPrazosAberto(true), 0); }}>Datas dos próximos contatos</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setTimeout(() => setRegrasPotenciaisAberto(true), 0); }}>Regras de clientes potenciais</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setTimeout(() => setAutomacoesAberto(true), 0); }}>Automações (IA e fora do horário)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => { setTimeout(() => setIgnoradosAberto(true), 0); }}>Remetentes ignorados</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    {botUsuario.botAtual ? `Bot: ${botUsuario.botAtual.nome}` : "Bot de atendimento"}
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="max-h-80 w-60 overflow-y-auto">
                    <DropdownMenuItem onClick={() => void botUsuario.escolherBot(null)}>
                      {!botUsuario.botId ? "✓ " : ""}Nenhum bot
                    </DropdownMenuItem>
                    {botUsuario.bots.length === 0 && (
                      <p className="px-2 py-1.5 text-xs text-muted-foreground">Nenhum bot cadastrado</p>
                    )}
                    {botUsuario.bots.map((b) => (
                      <DropdownMenuItem key={b.id} onClick={() => void botUsuario.escolherBot(b.id)}>
                        {botUsuario.botId === b.id ? "✓ " : ""}
                        {b.nome}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                {assumirContatos && assumirContatos.grupos.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        {assumirContatos.assumidos.length === 0
                          ? "Assumir contatos de..."
                          : `Assumindo ${assumirContatos.assumidos.length} pessoa${assumirContatos.assumidos.length > 1 ? "s" : ""}`}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="max-h-80 w-64 overflow-y-auto">
                        {assumirContatos.assumidos.length > 0 && (
                          <DropdownMenuItem onClick={assumirContatos.onLimpar}>Limpar seleção</DropdownMenuItem>
                        )}
                        {assumirContatos.grupos.map((grupo) => (
                          <div key={grupo.titulo}>
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              {grupo.titulo}
                            </DropdownMenuLabel>
                            {grupo.itens.map((pessoa) => (
                              <label
                                key={pessoa.id}
                                className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-accent"
                                onClick={(event) => event.stopPropagation()}
                              >
                                <Checkbox
                                  checked={assumirContatos.assumidos.includes(pessoa.id)}
                                  onCheckedChange={(valor) => assumirContatos.onAlternar(pessoa.id, valor === true)}
                                />
                                <span className="truncate">{pessoa.nome}</span>
                              </label>
                            ))}
                          </div>
                        ))}
                        <p className="px-2 pt-2 text-[10px] text-muted-foreground">
                          Seus contatos continuam aparecendo. Ao marcar um gerente, os vendedores dele também entram.
                        </p>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            {onTogglePainel && (
              <button
                type="button"
                onClick={onTogglePainel}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-orange-600 hover:bg-primary/10 transition-colors"
                title={painelAberto ? "Reduzir fila do dia" : "Ampliar fila do dia"}
                aria-label={painelAberto ? "Reduzir fila do dia" : "Ampliar fila do dia"}
              >
                {painelAberto ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              </button>
            )}
            {headerExtra}
          </div>
        </div>

        {/* Filtros */}
        <div className="mt-2.5 grid min-w-0 grid-cols-4 gap-1" data-filtros-contatos data-tour="fila-abas">
          {chips.map((chip) => {
            const ativo = filtro === chip.id;
            return (
              <Button
                key={chip.id}
                type="button"
                variant="ghost"
                aria-pressed={ativo}
                onClick={() => setFiltro(chip.id)}
                title={chip.label}
                aria-label={chip.label}
                className={cn(
                  "flex h-9 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-md px-1 text-[11px] font-medium transition-colors",
                  ativo
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {(() => { const Icone = ICONE_ABA[chip.id] ?? LayoutList; return <Icone className="h-4 w-4 shrink-0" />; })()}
                <span
                  className={cn(
                    "h-5 shrink-0 px-1 rounded-full flex items-center justify-center text-[10px] font-bold",
                    ativo ? "bg-primary text-primary-foreground" : "bg-background text-foreground/70"
                  )}
                >
                  {chip.total > 99 ? "99+" : chip.total}
                </span>
              </Button>
            );
          })}
        </div>

        {/* Filtro por canal */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {(Object.keys(CANAL_CONFIG) as FilaCanal[]).map((canal) => {
            const cfg = CANAL_CONFIG[canal];
            const Icone = cfg.icon;
            const ativo = canaisAtivos.has(canal);
            const total = baseAba.filter((item) => temCanalItem(item, new Set([canal]))).length;
            return (
              <button
                key={canal}
                type="button"
                onClick={() => alternarCanal(canal)}
                title={`${cfg.label} (${total})`}
                aria-label={`Filtrar por ${cfg.label}`}
                aria-pressed={ativo}
                className={cn(
                  "flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                  ativo
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icone className={cn("h-4 w-4", ativo ? cfg.cor : "")} />
                <span className="tabular-nums">{total}</span>
              </button>
            );
          })}
          {canaisAtivos.size > 0 && (
            <button
              type="button"
              onClick={() => setCanaisAtivos(new Set())}
              className="h-8 rounded-lg px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
            >
              Limpar
            </button>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSomenteNaoFinalizados((v) => !v)}
              data-tour="fila-nao-finalizados"
              aria-pressed={somenteNaoFinalizados}
              aria-label="Ver somente contatos com atendimento não finalizado"
              title={`Não finalizados (${totalNaoFinalizados})`}

              className={cn(
                "flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                somenteNaoFinalizados ? "border-destructive/50 bg-destructive/10 text-destructive" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <CalendarCheck className={cn("h-4 w-4", somenteNaoFinalizados && "text-destructive")} />

              <span className="tabular-nums">{totalNaoFinalizados}</span>
            </button>
            {filtro === "recebidos" && onToggleSinalizados && (
              <button
                type="button"
                onClick={onToggleSinalizados}
                aria-pressed={!!verSinalizados}
                title="Ver itens sinalizados"
                className={cn(
                  "flex h-8 items-center gap-1 rounded-lg border px-2 text-[11px] font-semibold transition-colors",
                  verSinalizados ? "border-primary/50 bg-primary/10 text-primary" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Flag className="h-4 w-4" />
                <span>Sinalizados</span>
                <span className="tabular-nums">{totalSinalizados ?? 0}</span>
              </button>
            )}
          </div>
        </div>

        {/* Disparo em massa: WhatsApp, E-mail ou Telefone */}
        <div className="flex items-center gap-2 mt-2.5" data-tour="fila-disparo">
          <Button
            variant="outline"
            onClick={() => onDisparoMassa?.()}
            className="h-9 flex-1 justify-start gap-2 rounded-lg border-border/60 text-xs font-semibold"
            title="Disparo em massa por WhatsApp, E-mail ou Telefone"
          >
            <span className="flex items-center -space-x-1">
              <Send className="h-3.5 w-3.5 text-success" />
              <Mail className="h-3.5 w-3.5 text-info" />
              <PhoneCall className="h-3.5 w-3.5 text-primary" />
            </span>
            Disparo em massa
          </Button>
          {discadorAtivo && (
            <Button
              variant="default"
              size="icon"
              title={`Discador rodando (${discadorAtivo === "sequencial" ? "sequencial" : "aprovação uma a uma"}) — clique para parar`}
              onClick={() => onPararDiscador?.()}
              className="relative h-9 w-9 shrink-0 rounded-lg ring-2 ring-primary/40 ring-offset-1 animate-pulse"
            >
              {discadorAtivo === "sequencial" ? <ListOrdered className="h-4 w-4" /> : <PhoneForwarded className="h-4 w-4" />}
              <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-destructive" />
            </Button>
          )}
        </div>
      </div>

      {(termometro || visiveis.length > 0) && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/40 px-3 py-1.5">
          {termometro && (
            <>
              <span title="Clientes com queda de compras ou inativos" className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", termometro.risco > 0 ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-muted-foreground")}>Em risco: {termometro.risco}</span>
              <span title="Clientes no ciclo de recompra" className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[10px] font-semibold text-success">Reposição: {termometro.reposicao}</span>
              <span title="Orçamentos sem retorno" className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning">Orçamentos: {termometro.orcamentos}</span>
            </>
          )}
          {visiveis.length > 0 && (
            <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 px-2 text-[11px]" title="Abrir o próximo cliente da fila (atalho: Alt + seta para baixo)"
              onClick={() => abrirProximo()}>
              <ChevronDown className="h-3.5 w-3.5 -rotate-90" /> Próximo cliente
            </Button>
          )}
        </div>
      )}

      {/* Lista */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-3 pt-3">
        {visiveis.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-primary/40" />
            </div>
            <p className="text-sm font-medium">Fila vazia</p>
            <p className="text-xs text-muted-foreground mt-1">
              {somenteNaoFinalizados ? "Nenhum contato com atendimento pendente de finalização" : filtro === "potenciais" ? "Nenhum cliente potencial pelas regras atuais" : vazioTexto || "Nenhum item para exibir"}
            </p>
          </div>
        ) : (
          visiveis.map((item) => {
            return (
              <div key={item.id} data-fila-id={item.id} data-fila-contato={item.contactId ?? undefined}>
              <div
                onClick={() => {
                  item.onClick();
                }}
                title={item.tipo === "potencial" ? "Potencial" : item.tipo === "recebido" ? "Recebido" : item.assumido ? "Agendado (contato assumido)" : "Agendado"}
                className={cn(
                   "group relative mb-3 overflow-hidden rounded-md border border-border/60 bg-card cursor-pointer transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
                   tablet ? "grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-2.5 py-3" : "flex items-center gap-3 px-3 py-3.5",
                  item.atrasado ? "before:bg-destructive" : item.tipo === "potencial" ? "before:bg-warning" : item.tipo === "recebido" ? "before:bg-success" : item.assumido ? "before:bg-info" : "before:bg-primary",
                  item.assumido && !item.selecionado && "bg-info/[0.05]",
                  item.selecionado
                    ? "bg-primary/10 ring-2 ring-primary/60 shadow-sm"
                    : "hover:bg-muted/40",
                  item.contactId && pendencias.includes(item.contactId) && "ring-2 ring-inset ring-destructive/50"
                )}
              >

                {/* Contato: avatar + nome em cima */}
                 <div className={cn("flex flex-1 min-w-0", tablet ? "items-start gap-2" : "items-center gap-3")}>
                   <div className={cn("shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-foreground/70", tablet ? "h-9 w-9 text-xs" : "h-11 w-11 text-[13px]")}>
                    {iniciais(item.nome)}
                  </div>
                   <div className="min-w-0 flex-1">
                     <p className={cn("text-[14px] font-semibold text-foreground leading-tight", tablet ? "break-words" : "truncate")}>
                      {item.nome}
                      {item.cadastroFaltando?.length ? (
                        <span
                          role="img"
                          aria-label={`Cadastro incompleto: ${item.cadastroFaltando.join(", ")}`}
                          title={`Cadastro incompleto — falta: ${item.cadastroFaltando.join(", ")}`}
                          className="ml-1 inline-flex align-middle text-destructive"
                        >
                          <UserX className="h-3.5 w-3.5" />
                        </span>
                      ) : null}
                    </p>
                     {item.tipo === "recebido" && (() => {
                       const cfg = CANAL_CONFIG[item.canal];
                       const Ic = cfg.icon;
                       return (
                         <span className={cn("mt-1 inline-flex max-w-full items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", cfg.fundo, cfg.cor)}>
                           <Ic className="h-3 w-3 shrink-0" />
                           <span className="truncate">{item.origem || cfg.label}{item.horario ? ` · ${item.horario}` : ""}</span>
                         </span>
                       );
                     })()}
                     {(item.empresa || item.atrasado) && (
                        <p className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-[11px] leading-tight">
                          {item.empresa && (
                            <span className={cn("min-w-0 text-muted-foreground", tablet ? "break-words" : "truncate")}>{item.empresa}</span>
                          )}
                          {item.atrasado && (
                            <span className="shrink-0 font-semibold text-destructive">
                              Atrasado{item.data ? ` ${item.data}` : ""}{item.horario ? ` ${item.horario}` : ""}
                            </span>
                          )}
                        </p>
                     )}
                    {(item.urgencia || item.credito) && (
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {item.urgencia && (
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold",
                            item.urgencia === "reclamacao" ? "border-destructive/40 bg-destructive/10 text-destructive" : item.urgencia === "cotacao" ? "border-success/40 bg-success/10 text-success" : "border-warning/40 bg-warning/10 text-warning")}>
                            {URGENCIA[item.urgencia].rotulo}
                          </span>
                        )}
                        {item.credito && item.credito !== "nao_informado" && (
                          <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px] font-semibold", SELO_CREDITO[item.credito].classe)}>{SELO_CREDITO[item.credito].rotulo}</span>
                        )}
                      </div>
                    )}
                    {item.onSinalizar && (
                      <button type="button"
                        title={item.sinalizado ? "Remover sinalização (volta para Recebidos)" : "Sinalizar como tratado sem responder"}
                        aria-pressed={!!item.sinalizado}
                        onClick={(e) => { e.stopPropagation(); item.onSinalizar!(); }}
                        className={cn("mt-1 mr-1 inline-flex h-6 items-center gap-1 rounded-md border px-2 text-[10px] font-semibold transition-colors",
                          item.sinalizado ? "border-primary/50 bg-primary/10 text-primary hover:bg-primary/20" : "border-border/60 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground")}>
                        <Flag className="h-3 w-3" /> {item.sinalizado ? "Sinalizado · desfazer" : "Sinalizar"}
                      </button>
                    )}
                    {item.onIgnorar && item.ignorarOpcoes?.length ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" title="Não é cliente — ignorar remetente"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1 mr-1 inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-card px-2 text-[10px] font-semibold text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground">
                            <Ban className="h-3 w-3" /> Não é cliente
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                          {item.ignorarOpcoes.map((o) => (
                            <DropdownMenuItem key={o.tipo + o.valor} onSelect={() => item.onIgnorar!(o.tipo, o.valor)}>{o.rotulo}</DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                    {item.contactId && pendencias.includes(item.contactId) && (
                      <button type="button" title="Finalizar atendimento (próximo contato)"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!item.contactId) return;
                          item.onClick();
                          pedirFinalizacao({ customerId: item.contactId, nome: item.nome });
                        }}
                        className="mt-1 inline-flex h-6 items-center gap-1 rounded-md border border-destructive/50 bg-destructive/10 px-2 text-[10px] font-semibold text-destructive hover:bg-destructive/20">
                        <CalendarCheck className="h-3 w-3" /> Finalizar atendimento
                      </button>
                    )}
                     {((item.contactId && (item.canais?.length || 0) > 0) || item.tipo === "recebido") && (
                       <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                         {(item.canais?.length ? item.canais! : [item.canal]).map((c) => {
                          const cfg = CANAL_CONFIG[c];
                          const Ic = cfg.icon;
                          const destaque = filtro !== "tudo" && c === item.canal;
                          return (
                            <button key={c} type="button" title={cfg.label} onClick={(e) => { e.stopPropagation(); if (item.tipo === "recebido" && c === item.canal) { item.onClick(); } else { item.onCanal?.(c); } }}
                              className={cn("h-7 w-7 md:h-5 md:w-5 rounded-full border-2 flex items-center justify-center", destaque ? cfg.borda : "border-transparent", cfg.fundo, cfg.cor, "hover:ring-1 hover:ring-current")}>
                              <Ic className="h-3.5 w-3.5 md:h-2.5 md:w-2.5" />
                            </button>
                          );
                        })}
                        {item.onHistorico && (
                          <button type="button" title="Histórico" onClick={(e) => { e.stopPropagation(); item.onHistorico?.(); }}
                            className="h-7 w-7 md:h-5 md:w-5 rounded-full flex items-center justify-center bg-muted text-orange-600 hover:ring-1 hover:ring-current">
                            <History className="h-3.5 w-3.5 md:h-2.5 md:w-2.5" />
                          </button>
                        )}
                        {item.onAgendaCentro && (
                          <button type="button" title="Agenda" onClick={(e) => { e.stopPropagation(); item.onAgendaCentro?.(item.contactId!, item.nome); }}
                            className="h-7 w-7 md:h-5 md:w-5 rounded-full flex items-center justify-center bg-primary/10 text-primary hover:ring-1 hover:ring-current">
                            <CalendarDays className="h-3.5 w-3.5 md:h-2.5 md:w-2.5" />
                          </button>
                        )}
                        <button type="button" title="Últimos orçamentos" onClick={(e) => { e.stopPropagation(); void alternarOrcamentos(item.contactId!); item.onOrcamentosCentro?.(item.contactId, item.nome); }}
                          className={cn("h-7 w-7 md:h-5 md:w-5 rounded-full flex items-center justify-center bg-warning/10 text-warning hover:ring-1 hover:ring-current", orcAberto === item.contactId && "ring-1 ring-current")}>
                          <FileText className="h-3.5 w-3.5 md:h-2.5 md:w-2.5" />
                        </button>
                      </div>
                    )}
                      {item.potencial && (
                        <div className="mt-1 flex min-w-0 items-start gap-2 rounded-md bg-warning/10 px-2 py-1.5">
                          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-warning">{item.potencial.rotulo}</p>
                            {item.potencial.motivos.map((m) => <p key={m} className="break-words text-[11px] text-foreground">{m}</p>)}
                          </div>
                        </div>
                      )}
                      <div id={`proxima-acao-${item.id}`} hidden={!acoesExpandidas.has(item.id) || !!item.potencial}>
                      <div className="mt-1 flex min-w-0 items-start gap-2 rounded-md bg-muted/50 px-2 py-2">
                        <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="break-words text-xs font-semibold text-foreground">{item.motivo || "Atendimento"}</p>
                          <p className={cn("mt-0.5 text-[11px]", item.atrasado ? "text-destructive" : "text-info")}>{item.data || "Hoje"}{item.horario ? `, ${item.horario}` : " · Sem horário"}</p>
                        </div>
                      </div>
                      </div>
                    {(item.mensagensNovas || 0) > 0 && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                        {item.mensagensNovas === 1
                          ? "1 mensagem nova"
                          : `${item.mensagensNovas} mensagens novas`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Coluna direita: menu e ampliar */}
                <div className={cn("flex shrink-0 flex-col items-center gap-0.5 self-start", tablet && "col-start-2 row-start-1")}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        onClick={(event) => event.stopPropagation()}
                        className="h-8 w-8 md:h-6 md:w-6 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {(item.menuItems && item.menuItems.length > 0
                        ? item.menuItems
                        : [{ label: "Abrir atendimento", onClick: item.onClick }]
                      ).map((menuItem) => (
                        <DropdownMenuItem key={menuItem.label} onClick={menuItem.onClick}>
                          {menuItem.label}
                        </DropdownMenuItem>
                      ))}
                      {item.onCredito && (
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>Situação de crédito</DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {(Object.keys(SELO_CREDITO) as SituacaoCredito[]).map((k) => (
                              <DropdownMenuItem key={k} onClick={(e) => { e.stopPropagation(); item.onCredito!(k); }}>
                                {item.credito === k ? "✓ " : ""}{SELO_CREDITO[k].rotulo}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    title={acoesExpandidas.has(item.id) ? "Recolher tarefa" : "Ampliar tarefa"}
                    aria-label={acoesExpandidas.has(item.id) ? "Recolher tarefa" : "Ampliar tarefa"}
                    aria-expanded={acoesExpandidas.has(item.id)}
                    aria-controls={`proxima-acao-${item.id}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      setAcoesExpandidas((anterior) => {
                        const proximo = new Set(anterior);
                        if (proximo.has(item.id)) proximo.delete(item.id);
                        else proximo.add(item.id);
                        return proximo;
                      });
                    }}
                    className="h-8 w-8 md:h-6 md:w-6 rounded-full text-muted-foreground"
                  >
                    <ChevronDown className={cn("h-4 w-4 md:h-3.5 md:w-3.5 transition-transform", acoesExpandidas.has(item.id) && "rotate-180")} />
                  </Button>
                </div>
              </div>
              {item.contactId && orcAberto === item.contactId && (
                <div className="border-b border-border/20 bg-muted/30 px-4 py-2 space-y-1">
                  {orcCarregando ? (
                    <p className="text-[11px] text-muted-foreground">Carregando orçamentos...</p>
                  ) : orcLista.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhum orçamento deste contato.</p>
                  ) : orcLista.map((o) => (
                    <button key={o.id} type="button" onClick={() => item.onOrcamento?.(o.id)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[11px] hover:bg-muted">
                      <span>{new Date(o.created_at).toLocaleDateString("pt-BR")} · {o.status || o.etapa || "—"}</span>
                      <span className="font-semibold tabular-nums">{Number(o.valor_total || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                    </button>
                  ))}
                </div>
              )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
