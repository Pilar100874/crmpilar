import { useMemo, useState } from "react";
import { FileText, History } from "lucide-react";
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

export type FilaCanal = "telefone" | "whatsapp" | "email" | "visita";

export interface FilaItem {
  id: string;
  tipo: "agendado" | "recebido";
  contactId?: string | null;
  nome: string;
  empresa?: string;
  motivo: string;
  canal: FilaCanal;
  horario?: string;
  atrasado?: boolean;
  mensagensNovas?: number;
  selecionado?: boolean;
  bloqueado?: boolean;
  /** Tarefa de outro usuário assumido (cor diferente). */
  assumido?: boolean;
  /** Canais que o contato tem cadastrados. */
  canais?: FilaCanal[];
  onCanal?: (canal: FilaCanal) => void;
  onOrcamento?: (orcamentoId: string) => void;
  onHistorico?: () => void;
  onClick: () => void;
  menuItems?: { label: string; onClick: () => void }[];
}

type FiltroFila = "tudo" | "agendados" | "recebidos";
type OrdenacaoFila = "prioridade" | "horario" | "nome";

const CANAL_CONFIG: Record<FilaCanal, { label: string; icon: typeof Phone; cor: string; fundo: string; fundoEscuro: string }> = {
  telefone: { label: "Telefone", icon: Phone, cor: "text-primary", fundo: "bg-primary/10", fundoEscuro: "bg-primary/30" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, cor: "text-success", fundo: "bg-success/10", fundoEscuro: "bg-success/30" },
  email: { label: "E-mail", icon: Mail, cor: "text-info", fundo: "bg-info/10", fundoEscuro: "bg-info/30" },
  visita: { label: "Visita", icon: MapPin, cor: "text-purple-500", fundo: "bg-purple-500/10", fundoEscuro: "bg-purple-500/30" },
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
  onEnvioMassa: (idsSelecionados: string[]) => void;
  onConfigurarRegra: () => void;
  vazioTexto?: string;
  headerExtra?: React.ReactNode;
  painelAberto?: boolean;
  onTogglePainel?: () => void;
  filtro?: FiltroFila;
  onFiltroChange?: (filtro: FiltroFila) => void;
  assumirContatos?: AssumirContatosConfig;
  /** Totais fixos de cada aba (não dependem da aba ativa). */
  totais?: { tudo: number; agendados: number; recebidos: number };
}

export function FilaDoDia({ items, tablet = false, onEnvioMassa, onConfigurarRegra, vazioTexto, headerExtra, painelAberto, onTogglePainel, filtro: filtroProp, onFiltroChange, assumirContatos, totais }: FilaDoDiaProps) {
  const [filtroInterno, setFiltroInterno] = useState<FiltroFila>("tudo");
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
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const [canaisAtivos, setCanaisAtivos] = useState<Set<FilaCanal>>(new Set());

  const alternarCanal = (canal: FilaCanal) => {
    setCanaisAtivos((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(canal)) proximo.delete(canal);
      else proximo.add(canal);
      return proximo;
    });
  };

  const totalAgendados = items.filter((item) => item.tipo === "agendado").length;
  const totalRecebidos = items.filter((item) => item.tipo === "recebido").length;

  const visiveis = useMemo(() => {
    let lista = items;
    if (filtro === "agendados") lista = lista.filter((item) => item.tipo === "agendado");
    if (filtro === "recebidos") lista = lista.filter((item) => item.tipo === "recebido");
    if (canaisAtivos.size > 0) lista = lista.filter((item) => canaisAtivos.has(item.canal));


    const ordenada = [...lista];
    if (ordenacao === "nome") {
      ordenada.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    } else if (ordenacao === "horario") {
      ordenada.sort((a, b) => (a.horario || "99:99").localeCompare(b.horario || "99:99"));
    } else {
      // Prioridade: atrasados primeiro, depois com mensagens novas, depois por horário
      ordenada.sort((a, b) => {
        const atrasoDiff = Number(b.atrasado || false) - Number(a.atrasado || false);
        if (atrasoDiff !== 0) return atrasoDiff;
        const msgDiff = (b.mensagensNovas || 0) - (a.mensagensNovas || 0);
        if (msgDiff !== 0) return msgDiff;
        return (a.horario || "99:99").localeCompare(b.horario || "99:99");
      });
    }
    return ordenada;
  }, [items, filtro, ordenacao, canaisAtivos]);

  const alternarSelecao = (id: string) => {
    setSelecionados((anterior) => {
      const proximo = new Set(anterior);
      if (proximo.has(id)) proximo.delete(id);
      else proximo.add(id);
      return proximo;
    });
  };

  const alternarModoSelecao = () => {
    setModoSelecao((valor) => {
      if (valor) setSelecionados(new Set());
      return !valor;
    });
  };

  const chips: { id: FiltroFila; label: string; total: number }[] = [
    { id: "tudo", label: "Tudo", total: totais?.tudo ?? items.length },
    { id: "agendados", label: "Agendados", total: totais?.agendados ?? totalAgendados },
    { id: "recebidos", label: "Recebidos", total: totais?.recebidos ?? totalRecebidos },
  ];

  return (
    <div className="flex min-w-0 flex-col flex-1 min-h-0 overflow-x-hidden bg-background">
      {/* Cabeçalho */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2 border-b border-border/40">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Fila do dia</h2>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground hidden xl:inline">Ordenar por:</span>
            <Select value={ordenacao} onValueChange={(valor) => setOrdenacao(valor as OrdenacaoFila)}>
              <SelectTrigger className="h-8 w-[104px] rounded-lg text-xs bg-card border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="prioridade">Prioridade</SelectItem>
                <SelectItem value="horario">Horário</SelectItem>
                <SelectItem value="nome">Nome</SelectItem>
              </SelectContent>
            </Select>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                  aria-label="Mais opções"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={alternarModoSelecao}>
                  {modoSelecao ? "Cancelar seleção" : "Selecionar contatos"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onConfigurarRegra}>Configurar regra</DropdownMenuItem>
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
        <div className={cn("flex items-center gap-1.5 mt-2.5", tablet && "flex-wrap")}>
          {chips.map((chip) => {
            const ativo = filtro === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFiltro(chip.id)}
                className={cn(
                  "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                  ativo
                    ? "bg-primary/10 text-primary font-semibold"
                    : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center text-[10px] font-bold",
                    ativo ? "bg-primary text-primary-foreground" : "bg-background text-foreground/70"
                  )}
                >
                  {chip.total > 99 ? "99+" : chip.total}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filtro por canal */}
        <div className="flex items-center gap-1.5 mt-2">
          {(Object.keys(CANAL_CONFIG) as FilaCanal[]).map((canal) => {
            const cfg = CANAL_CONFIG[canal];
            const Icone = cfg.icon;
            const ativo = canaisAtivos.has(canal);
            const total = items.filter((item) => item.canal === canal).length;
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
        </div>

        {/* Seleção e envio em massa */}
        <div className={cn("flex items-center gap-2 mt-2.5", tablet && "flex-wrap")}>
          <button
            type="button"
            onClick={alternarModoSelecao}
            className={cn(
              "flex h-9 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-xs font-medium transition-colors",
              modoSelecao
                ? "border-primary/50 bg-primary/5 text-primary"
                : "border-border/60 bg-card text-foreground hover:bg-muted/50"
            )}
          >
            <span className="flex items-center gap-2">
              <Checkbox checked={modoSelecao} className="pointer-events-none" />
              {modoSelecao && selecionados.size > 0
                ? `${selecionados.size} selecionado${selecionados.size > 1 ? "s" : ""}`
                : "Selecionar contatos"}
            </span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEnvioMassa(Array.from(selecionados))}
            className={cn("h-9 gap-1.5 rounded-lg text-xs", tablet && "shrink-0")}
          >
            <Send className="h-3.5 w-3.5" />
            Envio em massa
          </Button>
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {visiveis.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
              <Inbox className="w-7 h-7 text-primary/40" />
            </div>
            <p className="text-sm font-medium">Fila vazia</p>
            <p className="text-xs text-muted-foreground mt-1">
              {vazioTexto || "Nenhum item para exibir"}
            </p>
          </div>
        ) : (
          visiveis.map((item) => {
            const marcado = selecionados.has(item.id);
            return (
              <div key={item.id}>
              <div
                onClick={() => {
                  if (modoSelecao) {
                    alternarSelecao(item.id);
                    return;
                  }
                  item.onClick();
                }}
                title={item.tipo === "recebido" ? "Recebido" : item.assumido ? "Agendado (contato assumido)" : "Agendado"}
                className={cn(
                   "group relative border-b border-border/20 cursor-pointer transition-colors before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px]",
                   tablet ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1 px-2.5 py-3" : "flex items-center gap-3 px-3 py-3.5",
                  item.tipo === "recebido" ? "before:bg-success" : item.assumido ? "before:bg-info" : "before:bg-primary/60",
                  item.assumido && !item.selecionado && "bg-info/[0.05]",
                  item.selecionado
                    ? "bg-orange-500/[0.08] before:bg-orange-500"
                    : "hover:bg-muted/40",
                  marcado && "bg-orange-500/[0.08]",
                  item.bloqueado && "opacity-50 grayscale"
                )}
              >
                <Checkbox
                  checked={marcado}
                  onCheckedChange={() => alternarSelecao(item.id)}
                  onClick={(event) => event.stopPropagation()}
                   className={cn("shrink-0 border-orange-500 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500", tablet && "mt-2")}
                />

                {/* Contato: avatar + nome em cima */}
                 <div className={cn("flex flex-1 min-w-0", tablet ? "items-start gap-2" : "items-center gap-3")}>
                   <div className={cn("shrink-0 rounded-full bg-muted flex items-center justify-center font-bold text-foreground/70", tablet ? "h-9 w-9 text-xs" : "h-11 w-11 text-[13px]")}>
                    {iniciais(item.nome)}
                  </div>
                   <div className="min-w-0 flex-1">
                     <p className={cn("text-[14px] font-semibold text-foreground leading-tight", tablet ? "break-words" : "truncate")}>
                      {item.nome}
                    </p>
                    {item.empresa && (
                       <p className={cn("text-[11px] text-muted-foreground leading-tight", tablet ? "break-words" : "truncate")}>{item.empresa}</p>
                    )}
                    {item.contactId && (item.canais?.length || 0) > 0 && (
                      <div className="mt-1 flex items-center gap-1">
                        {item.canais!.map((c) => {
                          const cfg = CANAL_CONFIG[c];
                          const Ic = cfg.icon;
                          const destaque = filtro !== "tudo" && c === item.canal;
                          return (
                            <button key={c} type="button" title={cfg.label} onClick={(e) => { e.stopPropagation(); item.onCanal?.(c); }}
                              className={cn("h-6 w-6 rounded-full flex items-center justify-center", destaque ? cfg.fundoEscuro : cfg.fundo, cfg.cor, "hover:ring-1 hover:ring-current")}>
                              <Ic className="h-3 w-3" />
                            </button>
                          );
                        })}
                        {item.onHistorico && (
                          <button type="button" title="Histórico" onClick={(e) => { e.stopPropagation(); item.onHistorico?.(); }}
                            className="h-6 w-6 rounded-full flex items-center justify-center bg-muted text-orange-600 hover:ring-1 hover:ring-current">
                            <History className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" title="Últimos orçamentos" onClick={(e) => { e.stopPropagation(); void alternarOrcamentos(item.contactId!); }}
                          className={cn("h-6 w-6 rounded-full flex items-center justify-center bg-warning/10 text-warning hover:ring-1 hover:ring-current", orcAberto === item.contactId && "ring-1 ring-current")}>
                          <FileText className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {(item.mensagensNovas || 0) > 0 && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-600">
                        {item.mensagensNovas === 1
                          ? "1 mensagem nova"
                          : `${item.mensagensNovas} mensagens novas`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Horário em destaque */}
                 <div className={cn("shrink-0 text-right", tablet && "col-start-2 row-start-2 pr-1")}>
                  <p
                    className={cn(
                      "text-[17px] font-extrabold leading-tight tabular-nums",
                      item.atrasado ? "text-destructive" : "text-foreground"
                    )}
                  >
                    {item.horario || "--:--"}
                  </p>
                  {item.atrasado && (
                    <p className="text-[11px] font-semibold text-destructive leading-tight">Atrasado</p>
                  )}
                </div>

                {/* Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(event) => event.stopPropagation()}
                       className={cn("h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors", tablet && "col-start-3 row-start-1")}
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
                  </DropdownMenuContent>
                </DropdownMenu>
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
