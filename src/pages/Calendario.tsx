import { TarefasDoDiaResumo } from "@/components/calendario/TarefasDoDiaResumo";
import { AnaliseDestinoResumo } from "@/components/calendario/AnaliseDestinoResumo";
import { analisarDestino, type AnaliseDestino } from "@/lib/calendario/analiseDestino";
import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { avisoMisturaDiaTodo, detectarDestinoCalendario, prepararMovimento, selecaoNaMesmaData } from "@/lib/calendario/movimentacao";
import { dataPrevistaAtraso, tarefaAtrasada } from "@/lib/calendario/atrasos";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Filter, RefreshCw, GripVertical, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, Pencil, Trash2, Edit, X, Users, User, Bot, Megaphone, Phone, MapPin, Mail, MailOpen, FileText, MessageSquare, Calendar, Instagram, Clock3, List as ListIcon, CalendarDays, CalendarRange, MoreVertical, CalendarPlus, UserX, Undo2, AlertTriangle } from "lucide-react";
import { format, addDays, addWeeks, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, isTomorrow, parseISO, differenceInDays, isWeekend, startOfDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import { TaskDetailsSidebar } from "@/components/calendar/TaskDetailsSidebar";
import { NewTaskDialog } from "@/components/calendar/NewTaskDialog";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getEstabelecimentoId, isAnyAdmin } from "@/lib/estabelecimentoUtils";
import { notificarTarefasAlteradas } from "@/lib/calendario/eventos";
import { montarPassos, TITULO_ACAO, type AcaoAgenda, type PassoPrevia, type AutomacaoAgenda } from "@/lib/calendario/previaRegras";
import { PreviaRegrasDialog } from "@/components/calendar/PreviaRegrasDialog";

// Utilitário para aplicar alpha em cores HSL, gerando hsla()
const toAlpha = (hslColor: string, alpha: number) => {
  try {
    if (!hslColor.startsWith("hsl(")) return hslColor;
    return hslColor.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  } catch {
    return hslColor;
  }
};

interface Task {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  assignedTo?: string;
  status: "pending" | "completed";
  origem: "bot" | "campanha" | "ligacao" | "visita" | "email_enviado" | "email_recebido" | "pedido_orcamento" | "pedido_negociacao" | "pedido_aprovacao" | "chat";
  campaignId?: string;
  campaignName?: string;
  createdAt: Date;
  contactId?: string;
  contactName?: string;
  isAllDay?: boolean;
  userId?: string;
  userName?: string;
  dataOriginal?: Date;
}

type ViewMode = "day" | "week" | "month" | "list" | "table";

const SelecaoMovimento = createContext<{
  ids: Set<string>;
  alternar: (id: string) => void;
  escolherData: (date: Date) => void;
}>({ ids: new Set(), alternar: () => {}, escolherData: () => {} });

function SelecionarTarefa({ task, compacto = false }: { task: Task; compacto?: boolean }) {
  const selecao = useContext(SelecaoMovimento);
  const atrasada = tarefaAtrasada(task);
  // Tarefas atrasadas nunca entram na seleção: o quadro fica desativado e o
  // motivo aparece escrito logo na frente dele.
  useEffect(() => {
    if (atrasada && selecao.ids.has(task.id)) selecao.alternar(task.id);
  }, [atrasada, task.id, selecao]);
  if (atrasada) {
    return (
      <span className="flex min-w-0 items-center gap-1" title="Tarefa atrasada não pode ser movida">
        <span className={cn("min-w-0 truncate font-medium leading-none text-destructive", compacto ? "text-[8px]" : "text-[10px]")}>
          Tarefa atrasada não pode ser movida
        </span>
        <Checkbox
          checked={false}
          disabled
          aria-label={`Selecionar tarefa: ${task.title}`}
          aria-disabled
          onClick={e => e.stopPropagation()}
          className="shrink-0 cursor-not-allowed"
        />
      </span>
    );
  }
  return <Checkbox checked={selecao.ids.has(task.id)} aria-label={`Selecionar tarefa: ${task.title}`} onCheckedChange={() => selecao.alternar(task.id)} onClick={e => e.stopPropagation()} className="shrink-0" />;
}

// Componente de dia com drop zone
function DroppableDay({ 
  date, 
  children, 
  className, 
  onClick 
}: { 
  date: Date; 
  children: React.ReactNode; 
  className?: string; 
  onClick?: () => void;
}) {
  const selecao = useContext(SelecaoMovimento);
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      data-calendar-date={format(date, "yyyy-MM-dd")}
      className={`${className} ${isOver ? "ring-2 ring-primary ring-inset bg-primary/10" : ""} relative`}
      onClick={() => { if (selecao.ids.size) selecao.escolherData(date); onClick?.(); }}
    >
      {isOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded text-sm font-medium shadow-lg">
            Soltar aqui
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// Faixa de horário (modo dia) que aceita tarefas soltas
function DroppableSlot({ date, slotTime, children, className }: { date: Date; slotTime: string; children: React.ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${format(date, "yyyy-MM-dd")}-${slotTime || "semhora"}`,
    data: { date, slotTime },
  });
  return (
    <div ref={setNodeRef} className={`${className || ""} ${isOver ? "ring-2 ring-primary ring-inset bg-primary/10" : ""}`}>
      {children}
    </div>
  );
}

// Componente de tarefa arrastável
// variant "full": card com horário, título completo e segunda linha (descrição/contato/responsável)
// variant "compact": etiqueta de uma linha (usada na visualização em mês)
function DraggableTask({
  task,
  onClick,
  onEdit,
  onDelete,
  userColor,
  variant = "full"
}: {
  task: Task;
  onClick?: (e?: any) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  userColor?: string;
  variant?: "compact" | "full";
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const concluida = task.status === "completed";
  const prazo = new Date(task.date);
  if (task.time) {
    const [hora, minuto] = task.time.split(":").map(Number);
    prazo.setHours(hora, minuto, 0, 0);
  } else prazo.setHours(23, 59, 59, 999);
  const atrasada = !concluida && prazo < new Date();
  const retorno = task.title.toLowerCase().startsWith("retorno");
  const tooltip = [task.time, task.title, task.contactName, task.description, task.userName ? `Responsável: ${task.userName}` : null].filter(Boolean).join("\n");
  const compacto = variant === "compact";

  return (
    <div
      ref={setNodeRef}
      style={style}
      title={tooltip}
      className={cn(
        "group relative min-w-0 rounded-md border border-l-4 text-foreground transition-shadow hover:shadow-sm",
        compacto ? "px-1.5 py-1" : "px-2 py-2",
        concluida ? "border-border bg-muted text-muted-foreground" : atrasada ? "border-destructive/20 border-l-destructive bg-destructive/5" : retorno ? "border-info/20 border-l-info bg-info/5" : "border-primary/20 border-l-primary bg-primary/5",
      )}
    >
      <div className="mb-1 flex items-center gap-1" onClick={e => e.stopPropagation()}><SelecionarTarefa task={task} compacto={compacto} /></div>
      <div className={cn("mb-1 min-w-0 items-center justify-between gap-1", compacto ? "hidden lg:flex" : "flex")}>
        <div {...attributes} {...listeners} className="flex min-w-0 cursor-grab items-center gap-1 touch-none active:cursor-grabbing" title="Mover tarefa">
          {getOrigemIconWithColor(task.origem, "sm") || <CalendarDays className="h-3 w-3 text-primary" />}
          {atrasada && !compacto && <span className="rounded-full bg-destructive px-1.5 py-0.5 text-[9px] font-semibold text-destructive-foreground">Atrasado</span>}
        </div>
        <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{task.time || (task.isAllDay ? "Dia todo" : "Sem hora")}</span>
        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" aria-label="Opções da tarefa" onClick={(e) => e.stopPropagation()}>
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-3.5 w-3.5" />Editar</DropdownMenuItem>}
              {onDelete && <DropdownMenuItem onClick={onDelete} className="text-destructive"><Trash2 className="mr-2 h-3.5 w-3.5" />Excluir</DropdownMenuItem>}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <div role="button" tabIndex={0} aria-label={`Abrir tarefa: ${task.title}`} className="cursor-pointer" onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); onClick?.(e); } }} onClick={(e) => { e.stopPropagation(); onClick?.(e); }}>
        <p className={cn("text-xs font-semibold leading-snug", concluida && "line-through", compacto ? "truncate text-[11px]" : "break-words")}>{task.title}</p>
        {!compacto && task.contactName && <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">{task.contactName}</p>}
        {!compacto && task.description && <p className="mt-0.5 break-words text-[11px] leading-snug text-muted-foreground">{task.description}</p>}
        {!compacto && task.userName && <p className="mt-1 truncate text-[10px] text-muted-foreground/80" title={`Responsável: ${task.userName}`}>{task.userName}</p>}
      </div>
    </div>
  );
}

// Componente de card de tarefa arrastável (para lista)
function DraggableTaskCard({ 
  task, 
  onToggle,
  onOpen,
  onEdit,
  onDelete,
  userColor
}: { 
  task: Task; 
  onToggle: () => void;
  onOpen: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  userColor?: string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };


  const concluida = task.status === "completed";
  const agora = new Date();
  const atrasada =
    !concluida &&
    (isBefore(task.date, startOfDay(agora)) ||
      (isSameDay(task.date, agora) && !!task.time && task.time < format(agora, "HH:mm")));
  const corBarra = userColor || getOrigemColor(task.origem);
  const nomeBase = task.contactName || task.title;
  const iniciais = nomeBase
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex items-center gap-3 border-b border-border/20 px-3 py-3 transition-colors hover:bg-muted/40",
        concluida && "opacity-60"
      )}
    >
      {/* Barra lateral de cor (usuário responsável ou origem) */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ backgroundColor: corBarra, opacity: concluida ? 0.4 : 1 }}
        aria-hidden
      />
      {userColor && !concluida && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: toAlpha(userColor, 0.06) }}
          aria-hidden
        />
      )}

      {/* Concluir tarefa */}
      <SelecionarTarefa task={task} />
      <input
        type="checkbox"
        checked={concluida}
        onChange={onToggle}
        aria-label={concluida ? "Reabrir tarefa" : "Concluir tarefa"}
        className="h-4 w-4 shrink-0 cursor-pointer accent-orange-500"
      />

      {/* Avatar com iniciais (também serve de alça para arrastar) */}
      <div
        {...attributes}
        {...listeners}
        title="Mover tarefa"
        className="shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center font-bold text-[13px] text-foreground/70 cursor-grab touch-none active:cursor-grabbing"
      >
        {iniciais}
      </div>

      {/* Título, descrição e origem */}
      <div role="button" tabIndex={0} aria-label={`Abrir tarefa: ${task.title}`} onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onOpen(); } }} className="min-w-0 flex-1 cursor-pointer">
        <p className={cn("text-[14px] font-semibold leading-tight truncate", concluida ? "line-through text-muted-foreground" : "text-foreground")}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-[11px] text-muted-foreground leading-tight truncate mt-0.5">{task.description}</p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          {getOrigemIconWithColor(task.origem, "sm") && (
            <span
              title={`Origem: ${task.origem}`}
              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted"
            >
              {getOrigemIconWithColor(task.origem, "sm")}
            </span>
          )}
          {task.userName && (
            <span className="text-[11px] text-muted-foreground truncate">{task.userName}</span>
          )}
        </div>
      </div>

      {/* Horário e data */}
      <div className="shrink-0 text-right">
        {task.time ? (
          <p className={cn("text-sm font-semibold tabular-nums leading-tight", atrasada ? "text-destructive" : "text-foreground")}>
            {task.time}
          </p>
        ) : (
          <p className="text-[11px] text-muted-foreground leading-tight">Dia todo</p>
        )}
        {atrasada && (
          <p className="text-[9px] font-semibold text-destructive leading-none">Atrasado</p>
        )}
        <p className="text-[10px] text-muted-foreground tabular-nums leading-tight">
          {format(task.date, "dd/MM", { locale: ptBR })}
        </p>
      </div>

      {/* Menu de opções */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="h-7 w-7 shrink-0 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Mais opções"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="h-3.5 w-3.5 mr-1.5" /> Editar
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Excluir
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// Função centralizada para obter cor de origem
const getOrigemColor = (origem: Task['origem'] | 'email' | 'pedido') => {
  switch (origem) {
    case "bot": return "hsl(210, 85%, 65%)";
    case "campanha": return "hsl(280, 70%, 60%)";
    case "ligacao": return "hsl(145, 65%, 50%)";
    case "visita": return "hsl(25, 85%, 60%)";
    case "email":
    case "email_enviado": return "hsl(200, 75%, 55%)";
    case "email_recebido": return "hsl(190, 70%, 50%)";
    case "pedido":
    case "pedido_orcamento": return "hsl(40, 90%, 55%)";
    case "pedido_negociacao": return "hsl(35, 85%, 58%)";
    case "pedido_aprovacao": return "hsl(155, 65%, 50%)";
    case "chat": return "hsl(260, 70%, 62%)";
    default: return "hsl(0, 0%, 50%)";
  }
};

// Função centralizada para obter ícone de origem com cor
const getOrigemIconWithColor = (origem: Task['origem'], size: "sm" | "md" = "sm") => {
  const color = getOrigemColor(origem);
  const iconClass = size === "sm" ? "w-3 h-3 flex-shrink-0" : "w-3.5 h-3.5 flex-shrink-0";
  const style = { color };
  
  switch (origem) {
    case "bot": return <Bot className={iconClass} style={style} />;
    case "campanha": return <Megaphone className={iconClass} style={style} />;
    case "ligacao": return <Phone className={iconClass} style={style} />;
    case "visita": return <MapPin className={iconClass} style={style} />;
    case "email_enviado": return <Mail className={iconClass} style={style} />;
    case "email_recebido": return <MailOpen className={iconClass} style={style} />;
    case "pedido_orcamento": return <FileText className={iconClass} style={style} />;
    case "pedido_negociacao": return <FileText className={iconClass} style={style} />;
    case "pedido_aprovacao": return <FileText className={iconClass} style={style} />;
    case "chat": return <MessageSquare className={iconClass} style={style} />;
    default: return null;
  }
};

export default function Calendario({ dataInicial, viewModeInicial, contatoSugerido, filtroAtrasadosInicial, tarefaInicialId, tarefaInicialNonce }: { dataInicial?: Date; viewModeInicial?: ViewMode; contatoSugerido?: { id: string; nome: string }; filtroAtrasadosInicial?: boolean; tarefaInicialId?: string | null; tarefaInicialNonce?: number }) {
  const agendaAreaRef = useRef<HTMLDivElement>(null);
  const [agendaWidth, setAgendaWidth] = useState(0);
  useEffect(() => {
    const area = agendaAreaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => setAgendaWidth(entry.contentRect.width));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);
  // Sempre o mesmo visual da agenda do Atendimento, em qualquer tela e largura.
  void agendaWidth;
  const agendaCompacta = true;
  const [filtroAtrasados, setFiltroAtrasados] = useState(false);
  const [currentDate, setCurrentDate] = useState<Date>(dataInicial ?? new Date());
  // Avisa o Atendimento quando a data muda, para a aba Agendados acompanhar
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("calendario:data-mudou", { detail: { data: currentDate.toISOString() } }));
  }, [currentDate]);
  const [viewMode, setViewMode] = useState<ViewMode>(viewModeInicial ?? "month");
  // Filtro de dia da Tabela (clique nas datas da barra superior)
  const [filtroDiaTabela, setFiltroDiaTabela] = useState<Date | null>(viewModeInicial === "table" && dataInicial && !filtroAtrasadosInicial ? dataInicial : null);
  useEffect(() => { if (filtroAtrasadosInicial) setFiltroAtrasados(true); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (viewMode !== "table") { setFiltroAtrasados(false); setFiltroDiaTabela(null); } }, [viewMode]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tarefasParaMover, setTarefasParaMover] = useState<Set<string>>(new Set());
  const [dataMovimento, setDataMovimento] = useState<Date | undefined>();
  const [movimentoAberto, setMovimentoAberto] = useState(false);
  const [mostrarCalendarioMovimento, setMostrarCalendarioMovimento] = useState(false);
  const [movendoSelecao, setMovendoSelecao] = useState(false);
  const [avisoMovimento, setAvisoMovimento] = useState<string[]>([]);
  const [outrasDiaTodoMov, setOutrasDiaTodoMov] = useState<any[]>([]);
  const alternarSelecaoMovimento = (id: string) => {
    const alvo = tasks.find(t => t.id === id);
    if (alvo && tarefaAtrasada(alvo) && !tarefasParaMover.has(id)) {
      toast.error("Tarefa atrasada não pode ser movida manualmente. Ela passa sozinha para a próxima data na virada da noite.");
      return;
    }
    setTarefasParaMover(ids => {
    const proximos = new Set(ids);
    if (proximos.has(id)) proximos.delete(id); else proximos.add(id);
    return proximos;
  });
  };
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const tarefaInicialAplicada = useRef<number>(0);
  // Abertura externa: mantém o corpo do calendário invisível até o painel da tarefa abrir,
  // para o calendário não aparecer antes do conteúdo (menu "Tarefa" do Atendimento)
  const [aguardandoTarefaInicial, setAguardandoTarefaInicial] = useState(() => !!tarefaInicialId);
  useEffect(() => {
    if (!aguardandoTarefaInicial) return;
    const t = setTimeout(() => setAguardandoTarefaInicial(false), 8000);
    return () => clearTimeout(t);
  }, [aguardandoTarefaInicial]);
  // Abertura programática não deve disparar a seleção do contato na fila do Atendimento
  const tarefaAbertaProgramaticaRef = useRef(false);
  useEffect(() => {
    if (!tarefaInicialId || !tarefaInicialNonce) return;
    if (tarefaInicialAplicada.current === tarefaInicialNonce) return;
    if (!tasks.some(t => t.id === tarefaInicialId)) return;
    tarefaInicialAplicada.current = tarefaInicialNonce;
    tarefaAbertaProgramaticaRef.current = true;
    setAguardandoTarefaInicial(false);
    setSelectedTaskId(tarefaInicialId);
  }, [tarefaInicialId, tarefaInicialNonce, tasks]);
  // Painéis centrais do atendimento (histórico, agenda do contato etc.) fecham o painel da tarefa.
  useEffect(() => {
    const fecharPainelTarefa = () => { setSelectedTaskId(null); setShowTaskDialog(false); setEditingTask(null); };
    window.addEventListener("calendario:fechar-tarefa-central", fecharPainelTarefa);
    return () => window.removeEventListener("calendario:fechar-tarefa-central", fecharPainelTarefa);
  }, []);
  // Clique numa tarefa: avisa o Atendimento para abrir a aba "Tudo" com o contato selecionado
  useEffect(() => {
    if (!selectedTaskId) return;
    if (tarefaAbertaProgramaticaRef.current) { tarefaAbertaProgramaticaRef.current = false; return; }
    const t = tasks.find((x) => x.id === selectedTaskId);
    if (t?.contactId) window.dispatchEvent(new CustomEvent("calendario:selecionar-contato", { detail: { contactId: t.contactId } }));
  }, [selectedTaskId]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterBy, setFilterBy] = useState<"all" | "my">("my");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [modoValidacao, setModoValidacao] = useState(() => localStorage.getItem("agenda_modo_validacao") === "1");
  const [previa, setPrevia] = useState<{ titulo: string; passos: PassoPrevia[]; executar: () => void } | null>(null);
  const [automacoesAgenda, setAutomacoesAgenda] = useState<AutomacaoAgenda[]>([]);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<Array<{ id: string; nome: string; auth_user_id: string | null }>>([]);
  const [selectedOrigens, setSelectedOrigens] = useState<string[]>([]);
  const [filterEmailTipo, setFilterEmailTipo] = useState<"enviado" | "recebido">("enviado");
  const [filterPedidoTipo, setFilterPedidoTipo] = useState<"orcamento" | "negociacao" | "aprovacao">("orcamento");
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Mapa de cores para cada usuário
  const [userColors, setUserColors] = useState<Record<string, string>>({});
  
  // Preencher cores faltantes a partir das tarefas visíveis (fallback)
  useEffect(() => {
    // IDs únicos de usuários presentes nas tarefas
    const ids = Array.from(new Set(tasks.map(t => t.userId).filter(Boolean))) as string[];
    if (ids.length === 0) return;

    // Verificar quais IDs ainda não possuem cor
    const missing = ids.filter(id => !userColors[id]);
    if (missing.length === 0) return;

    const palette = [
      'hsl(142, 45%, 82%)', // verde pastel
      'hsl(221, 65%, 85%)', // azul pastel
      'hsl(262, 50%, 88%)', // roxo pastel
      'hsl(346, 60%, 88%)', // rosa pastel
      'hsl(25, 75%, 86%)',  // laranja pastel
      'hsl(48, 85%, 84%)',  // amarelo pastel
      'hsl(173, 45%, 84%)', // teal pastel
      'hsl(300, 50%, 88%)', // magenta pastel
    ];

    setUserColors(prev => {
      const startIndex = Object.keys(prev).length % palette.length;
      const additions: Record<string, string> = {};
      missing.forEach((id, idx) => {
        additions[id] = palette[(startIndex + idx) % palette.length];
      });
      console.log('[COLORS] Cores preenchidas a partir das tarefas:', additions);
      return { ...prev, ...additions };
    });
  }, [tasks, userColors]);
  
  const [weekendPendingTask, setWeekendPendingTask] = useState<{ 
    taskData: {
      contactId: string;
      contactName: string;
      date: Date;
      time: string;
      origem: string;
      campaignId?: string;
      observation?: string;
      isAllDay?: boolean;
      userId?: string;
    } | null;
    existingTask: Task | null;
    targetDate: Date;
    isMove: boolean;
    adjustedTime?: string; // Para usar quando for drag com horário ajustado
  } | null>(null);
  const [isBusinessHoursDialogOpen, setIsBusinessHoursDialogOpen] = useState(false);
  const [businessHoursPendingTask, setBusinessHoursPendingTask] = useState<{ 
    taskData: {
      contactId: string;
      contactName: string;
      date: Date;
      time: string;
      origem: string;
      campaignId?: string;
      observation?: string;
      isAllDay?: boolean;
      userId?: string;
    } | null;
    suggestedTime: string;
  } | null>(null);
  // Fluxo em etapas (fim de semana / dia ocupado / resumo)
  const [etapasFluxo, setEtapasFluxo] = useState<("fimDeSemana" | "diaTodo" | "resumo")[]>([]);
  const [etapaAtual, setEtapaAtual] = useState(0);
  const [decisoesFluxo, setDecisoesFluxo] = useState<string[]>([]);
  const [resultadoFluxo, setResultadoFluxo] = useState<{ data: Date } | null>(null);
  const [analiseDestino, setAnaliseDestino] = useState<AnaliseDestino | null>(null);
  const [analisandoDestino, setAnalisandoDestino] = useState(false);
  const [diaTodoOutras, setDiaTodoOutras] = useState<{ taskData: any; outras: any[]; mover?: { taskId: string; updates: { date: Date; time: string | null }; userId?: string }; lote?: boolean } | null>(null);
  const [diaTodoOutrasAcao, setDiaTodoOutrasAcao] = useState(false);
  const [allDayPendingTask, setAllDayPendingTask] = useState<{ 
    taskData: {
      contactId: string;
      contactName: string;
      date: Date;
      time: string;
      origem: string;
      campaignId?: string;
      observation?: string;
      isAllDay?: boolean;
      userId?: string;
    } | null;
    existingTask?: Task | null;
    isMove?: boolean;
    adjustedTime?: string;
    nextAvailableDate?: Date;
    allDayTaskTitle?: string;
    targetDate?: Date;
    origem?: "fimDeSemana" | "escolhaData" | "movimento" | "criacao";
    dataOriginal?: Date;
  } | null>(null);
  const [allDayEscolherData, setAllDayEscolherData] = useState(false);
  const [allDayNovaData, setAllDayNovaData] = useState<Date | null>(null);
  const [weekendEscolherData, setWeekendEscolherData] = useState(false);
  const [weekendNovaData, setWeekendNovaData] = useState<Date | null>(null);

  const [datasDiaTodo, setDatasDiaTodo] = useState<Set<string>>(new Set());
  const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
  const [conflictingTasks, setConflictingTasks] = useState<Task[]>([]);
  const [pendingTask, setPendingTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Estado para regras do calendário
  const [calendarioRegras, setCalendarioRegras] = useState<{
    bloquear_datas_passadas: boolean;
    bloquear_horarios_passados: boolean;
    deteccao_conflitos: boolean;
    bloqueio_finais_semana: boolean;
    horario_comercial: boolean;
    validacao_dia_todo: boolean;
    realocacao_diaria: boolean;
    encaminhamento_obrigatorio_conclusao: boolean;
    pergunta_dia_todo: boolean;
  }>({
    bloquear_datas_passadas: true,
    bloquear_horarios_passados: true,
    deteccao_conflitos: true,
    bloqueio_finais_semana: false,
    horario_comercial: false,
    validacao_dia_todo: false,
    realocacao_diaria: false,
    encaminhamento_obrigatorio_conclusao: true,
    pergunta_dia_todo: true,
  });
  
  // Configuração de colunas da tabela
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(() => {
    const defaultColumns = [
      { id: "status", label: "Status", visible: true, width: 100, locked: true },
      { id: "title", label: "Título", visible: true, width: 250, locked: true },
      { id: "date", label: "Data", visible: true, width: 120 },
      { id: "time", label: "Hora", visible: true, width: 100 },
      { id: "origem", label: "Origem", visible: true, width: 180 },
      { id: "userName", label: "Usuário", visible: true, width: 180 },
      { id: "assignedTo", label: "Atribuído para", visible: true, width: 180 },
      { id: "description", label: "Descrição", visible: false, width: 300 },
      { id: "actions", label: "Ações", visible: true, width: 80, locked: true },
    ];

    const saved = localStorage.getItem("calendarTableColumns");
    if (saved) {
      try {
        const savedColumns = JSON.parse(saved);
        // Mesclar colunas salvas com as padrão, adicionando novas colunas que não existem
        const savedIds = new Set(savedColumns.map((c: TableColumn) => c.id));
        const newColumns = defaultColumns.filter(col => !savedIds.has(col.id));
        
        // Inserir novas colunas na posição correta (userName antes de assignedTo)
        if (newColumns.length > 0) {
          const merged = [...savedColumns];
          newColumns.forEach(newCol => {
            if (newCol.id === 'userName') {
              const assignedToIndex = merged.findIndex(c => c.id === 'assignedTo');
              if (assignedToIndex >= 0) {
                merged.splice(assignedToIndex, 0, newCol);
              } else {
                merged.push(newCol);
              }
            } else {
              merged.push(newCol);
            }
          });
          return merged;
        }
        return savedColumns;
      } catch {
        // Se houver erro ao parsear, usar valores padrão
      }
    }
    return defaultColumns;
  });

  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Salvar configurações de colunas no localStorage
  useEffect(() => {
    localStorage.setItem("calendarTableColumns", JSON.stringify(tableColumns));
  }, [tableColumns]);

  const handleColumnsChange = (newColumns: TableColumn[]) => {
    setTableColumns(newColumns);
  };

  const handleSort = (columnId: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    
    if (sortConfig && sortConfig.key === columnId) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else {
        // Remove sort
        setSortConfig(null);
        return;
      }
    }
    
    setSortConfig({ key: columnId, direction });
  };

  const getSortIcon = (columnId: string) => {
    if (!sortConfig || sortConfig.key !== columnId) {
      return <ArrowUpDown className="w-3 h-3 text-muted-foreground" />;
    }
    
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-primary" />
      : <ArrowDown className="w-3 h-3 text-primary" />;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Carregar tarefas do Supabase ao montar o componente
  useEffect(() => {
    checkAdminStatus();
    loadUsuarios(); // Carregar usuários sempre para gerar cores
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadUsuarios(); // Recarregar quando vira admin para garantir
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("Usuário não autenticado");
        return;
      }
      
      setCurrentAdminId(user.id);

      console.log("Verificando admin para usuário:", user.id, user.email);

      // Verifica se é administrador usando a função isAnyAdmin que checa user_roles
      const adminCheck = await isAnyAdmin();
      setIsAdmin(adminCheck);
      
      if (adminCheck) {
        console.log("Usuário é admin via user_roles");
      } else {
        console.log("Usuário não é admin");
      }
    } catch (error) {
      console.error("Erro ao verificar status de admin:", error);
    }
  };

  const loadUsuarios = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      console.log("Carregando usuários para estabelecimento:", estabelecimentoId);
      
      if (!estabelecimentoId) {
        console.log("Nenhum estabelecimento_id encontrado");
        return;
      }

      const { data, error } = await (supabase as any)
        .from('usuarios')
        .select('id, nome, auth_user_id')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      console.log("Usuários carregados:", data?.length || 0, "usuários");
      console.log("Usuários com auth_user_id:", data?.filter((u: any) => u.auth_user_id).length || 0);

      if (!error && data) {
        setUsuarios(data);
        
        // Gerar cores para cada usuário
        const colors = generateUserColors(data);
        setUserColors(colors);
        console.log('[COLORS] Estado userColors atualizado:', colors);
      }
    } catch (error) {
      console.error("Erro ao carregar usuários:", error);
    }
  };

  // Função para gerar cores únicas para cada usuário
  const generateUserColors = (users: Array<{ id: string; nome: string; auth_user_id: string | null }>) => {
    const colorPalette = [
      'hsl(142, 45%, 82%)', // verde pastel
      'hsl(221, 65%, 85%)', // azul pastel
      'hsl(262, 50%, 88%)', // roxo pastel
      'hsl(346, 60%, 88%)', // rosa pastel
      'hsl(25, 75%, 86%)',  // laranja pastel
      'hsl(48, 85%, 84%)',  // amarelo pastel
      'hsl(173, 45%, 84%)', // teal pastel
      'hsl(300, 50%, 88%)', // magenta pastel
    ];
    
    const colors: Record<string, string> = {};
    users.forEach((user, index) => {
      if (user.auth_user_id) {
        colors[user.auth_user_id] = colorPalette[index % colorPalette.length];
      }
    });
    
    console.log('[COLORS] Cores geradas para usuários:', colors);
    return colors;
  };

  const loadTasks = useCallback(async () => {
    try {
      const [{ data: sessionData }, estabelecimentoId] = await Promise.all([
        supabase.auth.getSession(),
        getEstabelecimentoId(),
      ]);
      const user = sessionData?.session?.user;
      if (!user) return;
      if (!estabelecimentoId) return;

      // Buscar o ID do usuário na tabela usuarios (a FK user_id referencia usuarios, não auth.users)
      let currentUsuarioId: string | undefined;
      if (!isAdmin) {
        const { data: currentUsuario } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        currentUsuarioId = currentUsuario?.id;
      }

      // Regra "Realocação Diária de Tarefas": tarefas atrasadas ficam sempre na data
      // atual — pendências com data anterior (ou remarcadas para outro dia) voltam
      // para hoje, preservando a data original ("Deveria ter contatado em").
      if (realocacaoRef.current) {
        const hojeStr = format(new Date(), 'yyyy-MM-dd');
        let alinhar = (supabase as any)
          .from('calendario_tarefas')
          .update({ date: hojeStr })
          .eq('estabelecimento_id', estabelecimentoId)
          .or(`date.lt.${hojeStr},and(data_original.lt.${hojeStr},date.neq.${hojeStr})`)
          .not('status', 'in', '("concluido","cancelado","completed")');
        if (isAdmin) {
          if (selectedUserIds.length > 0) alinhar = alinhar.in('user_id', selectedUserIds);
        } else if (currentUsuarioId) {
          alinhar = alinhar.eq('user_id', currentUsuarioId);
        }
        const { error: erroAlinhamento } = await alinhar;
        if (erroAlinhamento) console.error("Erro ao realocar tarefas atrasadas:", erroAlinhamento);
      }

      let query = (supabase as any)
        .from('calendario_tarefas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId);

      // Se admin e não selecionou usuários específicos, mostrar todas as tarefas do estabelecimento
      // Se admin selecionou usuários específicos, filtrar por esses usuários
      // Se não é admin, mostrar apenas suas tarefas
      console.log("Filtrando tarefas - isAdmin:", isAdmin, "selectedUserIds:", selectedUserIds, "currentAdminId:", currentAdminId);
      
      if (isAdmin) {
        if (selectedUserIds.length > 0) {
          console.log("Admin: Buscando tarefas para IDs selecionados:", selectedUserIds);
          query = query.in('user_id', selectedUserIds);
        } else {
          console.log("Admin: Buscando todas as tarefas do estabelecimento");
          // Não adiciona filtro de user_id, mostra todas do estabelecimento
        }
      } else {
        // Usar o ID da tabela usuarios, não o auth.uid()
        console.log("Usuário comum: Buscando tarefas apenas para usuário atual:", currentUsuarioId);
        if (currentUsuarioId) {
          query = query.eq('user_id', currentUsuarioId);
        }
      }

      const { data: tarefas, error } = await query.order('date', { ascending: true });

      if (error) {
        console.error("Erro ao carregar tarefas:", error);
        toast.error("Erro ao carregar tarefas");
        return;
      }

      if (tarefas) {
        // Buscar nomes dos usuários - user_id referencia a tabela usuarios.id
        const usuarioIds = [...new Set(tarefas.map((t: any) => t.user_id))];
        const { data: usuariosData } = await (supabase as any)
          .from('usuarios')
          .select('id, nome')
          .in('id', usuarioIds);
        
        const usuariosMap = new Map(
          usuariosData?.map((u: any) => [u.id, u.nome]) || []
        );
        
        // Buscar nomes de campanhas se houver campaign_ids
        const campaignIds = [...new Set(tarefas.filter((t: any) => t.campaign_id).map((t: any) => t.campaign_id))];
        let campanhasMap = new Map();
        if (campaignIds.length > 0) {
          const { data: campanhasData } = await (supabase as any)
            .from('campaigns')
            .select('id, nome')
            .in('id', campaignIds);
          campanhasMap = new Map(campanhasData?.map((c: any) => [c.id, c.nome]) || []);
        }
        
        const tasksWithDates = tarefas.map((task: any) => {
          // Parse date in LOCAL timezone without relying on ISO parsing to avoid UTC shifts
          // Expected DB format: 'yyyy-MM-dd'
          const [year, month, day] = (task.date || "").split("-").map(Number);
          // Use noon to be extra safe against DST edges while remaining in local time
          const parsedDate = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);

          
          return {
            id: task.id,
            title: task.title,
            description: task.description || '',
            date: parsedDate,
            time: task.time || '',
            assignedTo: task.contact_name,
            status: task.status as "pending" | "completed",
            origem: task.origem as Task["origem"],
            campaignId: task.campaign_id,
            campaignName: task.campaign_id ? campanhasMap.get(task.campaign_id) : undefined,
            createdAt: new Date(task.created_at),
            contactId: task.contact_id,
            contactName: task.contact_name,
            isAllDay: task.is_all_day || false,
            userId: task.user_id,
            userName: usuariosMap.get(task.user_id) || 'Usuário não identificado',
            dataOriginal: task.data_original ? (() => {
              const [y, mo, d] = (task.data_original || "").split("-").map(Number);
              return new Date(y, (mo || 1) - 1, d || 1, 12, 0, 0, 0);
            })() : undefined,
          };
        });
        
        console.log('[COLORS] userColors state:', userColors);
        setTasks(tasksWithDates);
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    }
  }, [selectedUserIds, isAdmin]);

  const loadTasksRef = useRef(loadTasks);
  loadTasksRef.current = loadTasks;
  // Ref da regra "Realocação Diária de Tarefas" — evita recarregar loadTasks quando a regra muda
  const realocacaoRef = useRef(true);

  useEffect(() => {
    (async () => {
      // Primeiro realoca as atrasadas para a data atual, depois conta os dias
      await loadTasks();
      void carregarDatasDiaTodo();
    })();
  }, [loadTasks]);

  // Realtime: assina apenas uma vez, sem recriar o canal a cada mudança de filtro
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const channel = supabase
      .channel('calendario_tarefas_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'calendario_tarefas'
        },
        () => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => loadTasksRef.current(), 300);
        }
      )
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, []);


  // Carregar regras do calendário do banco
  useEffect(() => {
    const loadRegras = async () => {
      try {
        const estabelecimentoId = await getEstabelecimentoId();
        if (!estabelecimentoId) return;

        // Buscar regras ativas do estabelecimento
        const { data: regras } = await (supabase as any)
          .from('calendario_regras')
          .select('tipo, ativa')
          .eq('estabelecimento_id', estabelecimentoId);

        if (regras) {
          const regrasMap: any = {};
          regras.forEach((regra: any) => {
            regrasMap[regra.tipo] = regra.ativa;
          });
          realocacaoRef.current = regrasMap.realocacao_diaria_tarefas ?? true;

          setCalendarioRegras({
            bloquear_datas_passadas: regrasMap.bloquear_datas_passadas ?? true,
            bloquear_horarios_passados: regrasMap.bloquear_horarios_passados ?? true,
            deteccao_conflitos: regrasMap.deteccao_conflitos ?? true,
            bloqueio_finais_semana: regrasMap.bloqueio_finais_semana ?? false,
            horario_comercial: regrasMap.horario_comercial ?? false,
            validacao_dia_todo: regrasMap.validacao_dia_todo ?? false,
            realocacao_diaria: regrasMap.realocacao_diaria ?? false,
            encaminhamento_obrigatorio_conclusao: regrasMap.encaminhamento_obrigatorio_conclusao ?? true,
            pergunta_dia_todo: regrasMap.pergunta_dia_todo ?? true,
          });
          
          console.log('[REGRAS] Regras do calendário carregadas:', {
            bloqueio_finais_semana: regrasMap.bloqueio_finais_semana ?? false,
            todas: regrasMap
          });
        }
      } catch (error) {
        console.error('Erro ao carregar regras do calendário:', error);
      }
    };

    loadRegras();
    (async () => {
      const est = await getEstabelecimentoId();
      if (!est) return;
      const { data } = await (supabase as any).from('calendario_regras_automacao').select('nome, gatilho, acao, ativa').eq('estabelecimento_id', est);
      if (Array.isArray(data)) setAutomacoesAgenda(data);
    })();
  }, []);

  const saveTaskToDatabase = async (task: Task): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return false;
      }

      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return false;
      }

      // Buscar o ID do usuário na tabela usuarios (a FK referencia usuarios, não auth.users)
      const { data: usuarioData, error: usuarioError } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      if (usuarioError || !usuarioData) {
        console.error("Erro ao buscar ID do usuário na tabela usuarios:", usuarioError);
        toast.error("Usuário não encontrado na base de dados");
        return false;
      }

      const { error } = await (supabase as any)
        .from('calendario_tarefas')
        .insert({
          user_id: usuarioData.id,
          estabelecimento_id: estabelecimentoId,
          contact_id: task.contactId,
          contact_name: task.contactName,
          title: task.title,
          description: task.description,
          date: format(task.date, 'yyyy-MM-dd'),
          time: task.time || null,
          origem: task.origem,
          campaign_id: task.campaignId,
          status: task.status,
          is_all_day: task.isAllDay || false,
        });

      if (error) {
        console.error('Erro ao salvar tarefa:', error);
        toast.error("Erro ao salvar tarefa");
        return false;
      }

      notificarTarefasAlteradas();
      return true;
    } catch (error) {
      console.error('Erro ao salvar tarefa:', error);
      toast.error("Erro ao salvar tarefa");
      return false;
    }
  };

  const updateTaskInDatabase = async (
    taskId: string, 
    updates: Partial<Task>,
    source: 'drag' | 'toggle-status' | 'explicit' = 'explicit'
  ): Promise<boolean> => {
    try {
      // Log detalhado de todas as atualizações
      console.log('[UPDATE_TASK]', { 
        taskId, 
        updates: { 
          date: updates.date ? format(updates.date, 'yyyy-MM-dd') : undefined,
          time: updates.time,
          status: updates.status 
        }, 
        source,
        timestamp: new Date().toISOString()
      });

      const dbUpdates: any = {};
      
      if (updates.date) dbUpdates.date = format(updates.date, 'yyyy-MM-dd');
      if (updates.time !== undefined) dbUpdates.time = updates.time || null; // Converter string vazia em null
      if (updates.status) dbUpdates.status = updates.status;
      if (updates.title) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.origem) dbUpdates.origem = updates.origem;
      if (updates.userId) dbUpdates.user_id = updates.userId;
      if (updates.campaignId !== undefined) dbUpdates.campaign_id = updates.campaignId;

      const { data: linhas, error } = await (supabase as any)
        .from('calendario_tarefas')
        .update(dbUpdates)
        .eq('id', taskId)
        .select('id');

      if (error) {
        console.error('Erro ao atualizar tarefa:', error);
        toast.error("Erro ao atualizar tarefa");
        return false;
      }

      // Se nenhuma linha foi alterada, a gravação não aconteceu (permissão)
      if (!linhas || linhas.length === 0) {
        console.error('Nenhuma tarefa atualizada', { taskId, dbUpdates });
        toast.error("Não foi possível salvar a alteração da tarefa");
        return false;
      }

      notificarTarefasAlteradas();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      toast.error("Erro ao atualizar tarefa");
      return false;
    }
  };

  const deleteTaskFromDatabase = async (taskId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as any)
        .from('calendario_tarefas')
        .delete()
        .eq('id', taskId);

      if (error) {
        console.error('Erro ao deletar tarefa:', error);
        toast.error("Erro ao deletar tarefa");
        return false;
      }

      notificarTarefasAlteradas();
      return true;
    } catch (error) {
      console.error('Erro ao deletar tarefa:', error);
      toast.error("Erro ao deletar tarefa");
      return false;
    }
  };

  // Função para obter o próximo dia útil
  const getNextBusinessDay = (date: Date): Date => {
    let nextDay = addDays(date, 1);
    
    // Se cair no fim de semana, avançar para segunda-feira
    while (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    
    return nextDay;
  };

  // Função para obter o próximo dia disponível considerando regra de dia todo (por usuário)
  const getNextAvailableDay = async (date: Date, userIdOverride?: string): Promise<Date> => {
    let nextDay = getNextBusinessDay(date);
    
    // Se a regra de dia todo estiver ativa, verificar se há tarefa de dia todo PARA O MESMO USUÁRIO
    if (calendarioRegras.validacao_dia_todo) {
      let allDayCheck = await checkAllDayTasks(nextDay, userIdOverride);
      
      // Enquanto houver tarefa de dia todo do mesmo usuário, avança para próximo dia útil
      while (allDayCheck.hasTask) {
        console.log(`[NEXT_DAY] Dia ${format(nextDay, 'dd/MM/yyyy')} tem tarefa de dia todo para o usuário alvo, avançando...`);
        nextDay = getNextBusinessDay(nextDay);
        allDayCheck = await checkAllDayTasks(nextDay, userIdOverride);
      }
      
      console.log(`[NEXT_DAY] Próximo dia disponível: ${format(nextDay, 'dd/MM/yyyy')}`);
    }
    
    return nextDay;
  };

  // Mover tarefas não realizadas para o próximo dia útil
  const moveOverdueTasks = async () => {
    console.log("=== VERIFICANDO TAREFAS ATRASADAS ===");
    const now = new Date();
    const today = startOfDay(now);
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const targetUserId = user.id; // Sempre usa o ID do usuário atual

    const { data: overdueTasks } = await (supabase as any)
      .from('calendario_tarefas')
      .select('id, date, title')
      .eq('user_id', targetUserId)
      .eq('status', 'pending')
      .lt('date', format(today, 'yyyy-MM-dd'));

    console.log(`Encontradas ${overdueTasks?.length || 0} tarefas atrasadas`);
    if (overdueTasks && overdueTasks.length > 0) {
      console.log("Tarefas atrasadas:", overdueTasks);
      const nextDay = await getNextAvailableDay(now, targetUserId);
      const taskIds = overdueTasks.map((t: any) => t.id);

      await (supabase as any)
        .from('calendario_tarefas')
        .update({ date: format(nextDay, 'yyyy-MM-dd') })
        .in('id', taskIds);

      console.log(`Tarefas movidas para: ${format(nextDay, 'yyyy-MM-dd')}`);
      toast.info(
        `${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} não realizada${overdueTasks.length > 1 ? 's' : ''} movida${overdueTasks.length > 1 ? 's' : ''} para ${format(nextDay, "dd/MM/yyyy", { locale: ptBR })}`
      );
    }
  };

  // Verificar tarefas atrasadas ao carregar e a cada hora.
  // A realocação para a data atual acontece dentro de loadTasks (regra "Realocação Diária de Tarefas").
  const processOverdueIfNeeded = async () => {
    await loadTasksRef.current();
  };

  useEffect(() => {
    processOverdueIfNeeded();

    const interval = setInterval(() => {
      processOverdueIfNeeded();
    }, 3600000); // 1 hora

    return () => clearInterval(interval);
  }, []);

  // Navegação
  const handlePrevious = () => {
    setCurrentDate(date => addDays(date, -1));
  };

  const handleNext = () => {
    setCurrentDate(date => addDays(date, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Verificar se é fim de semana
  const checkWeekend = (date: Date): boolean => {
    const dayOfWeek = date.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6; // 0 = domingo, 6 = sábado
  };

  // Verificar se o horário está dentro do horário comercial
  const isWithinBusinessHours = (time: string, horaInicial: string, horaFinal: string): boolean => {
    const [hour, minute] = time.split(':').map(Number);
    const [startHour, startMinute] = horaInicial.split(':').map(Number);
    const [endHour, endMinute] = horaFinal.split(':').map(Number);
    
    const timeInMinutes = hour * 60 + minute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    return timeInMinutes >= startTimeInMinutes && timeInMinutes < endTimeInMinutes;
  };

  // Ajustar horário para dentro do horário comercial
  const adjustToBusinessHours = (time: string, date: Date, horaInicial: string, horaFinal: string): { adjustedTime: string; adjustedDate: Date; message: string } => {
    const [hour, minute] = time.split(':').map(Number);
    const [startHour, startMinute] = horaInicial.split(':').map(Number);
    const [endHour, endMinute] = horaFinal.split(':').map(Number);
    
    const timeInMinutes = hour * 60 + minute;
    const startTimeInMinutes = startHour * 60 + startMinute;
    const endTimeInMinutes = endHour * 60 + endMinute;
    
    // Se for antes do horário inicial, ajusta para o horário inicial
    if (timeInMinutes < startTimeInMinutes) {
      return {
        adjustedTime: horaInicial.substring(0, 5), // Pega apenas HH:MM
        adjustedDate: date,
        message: `Horário ajustado de ${time} para ${horaInicial.substring(0, 5)} (início do expediente)`
      };
    }
    
    // Se for depois do horário final, agenda para o horário inicial do próximo dia útil
    if (timeInMinutes >= endTimeInMinutes) {
      const nextDay = getNextBusinessDay(addDays(date, 1));
      return {
        adjustedTime: horaInicial.substring(0, 5),
        adjustedDate: nextDay,
        message: `Horário ${time} está fora do expediente. Reagendado para ${format(nextDay, "dd/MM/yyyy")} às ${horaInicial.substring(0, 5)}`
      };
    }
    
    return { adjustedTime: time, adjustedDate: date, message: '' };
  };

  // Verificar se há tarefas de dia todo na data (por usuário)
  const checkAllDayTasks = async (date: Date, userIdOverride?: string): Promise<{ hasTask: boolean; taskTitle?: string }> => {
    try {
      let targetUserId = userIdOverride;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return { hasTask: false };
        // user_id referencia usuarios.id, não auth.users — resolver antes de consultar
        const { data: usuarioData } = await (supabase as any)
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        targetUserId = usuarioData?.id || user.id;
      }

      const { data: allDayTasks } = await (supabase as any)
        .from('calendario_tarefas')
        .select('id, title')
        .eq('user_id', targetUserId)
        .eq('date', format(date, 'yyyy-MM-dd'))
        .eq('is_all_day', true)
        .limit(1);

      if (Array.isArray(allDayTasks) && allDayTasks.length > 0) {
        return { hasTask: true, taskTitle: allDayTasks[0].title };
      }
      return { hasTask: false };
    } catch (error) {
      console.error('Erro ao verificar tarefas de dia todo:', error);
      return { hasTask: false };
    }
  };

  // Carregar as datas que possuem tarefa de dia todo (para destacar no seletor de data)
  useEffect(() => {
    const origem = movimentoAberto && avisoMovimento.length > 0 ? dataMovimento
      : etapasFluxo[etapaAtual] === "fimDeSemana" ? weekendPendingTask?.targetDate : undefined;
    let cancelado = false;
    setAnaliseDestino(null);
    if (!origem) { setAnalisandoDestino(false); return; }
    setAnalisandoDestino(true);
    const usuariosAlvo = movimentoAberto
      ? [...new Set(tasks.filter(t => tarefasParaMover.has(t.id)).map(t => t.userId))]
      : [weekendPendingTask?.existingTask?.userId ?? weekendPendingTask?.taskData?.userId];
    void analisarDestino(origem, async data => {
      const verificacoes = await Promise.all(usuariosAlvo.map(id => checkAllDayTasks(data, id)));
      return verificacoes.find(item => item.hasTask) ?? { hasTask: false };
    }).then(resultado => { if (!cancelado) setAnaliseDestino(resultado); })
      .catch(() => { if (!cancelado) toast.error("Não foi possível analisar as próximas datas. Tente novamente."); })
      .finally(() => { if (!cancelado) setAnalisandoDestino(false); });
    return () => { cancelado = true; };
  }, [movimentoAberto, dataMovimento, avisoMovimento, etapasFluxo, etapaAtual, weekendPendingTask, tarefasParaMover, tasks]);

  const carregarDatasDiaTodo = async (userIdOverride?: string) => {
    try {
      let targetUserId = userIdOverride;
      if (!targetUserId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        // user_id referencia usuarios.id, não auth.users — resolver antes de consultar
        const { data: usuarioData } = await (supabase as any)
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        targetUserId = usuarioData?.id || user.id;
      }
      const { data } = await (supabase as any)
        .from('calendario_tarefas')
        .select('date')
        .eq('user_id', targetUserId)
        .eq('is_all_day', true)
        .gte('date', format(new Date(), 'yyyy-MM-dd'))
        .limit(370);
      setDatasDiaTodo(new Set((data || []).map((r: any) => String(r.date))));
    } catch (e) {
      console.error('Erro ao carregar datas de dia todo:', e);
    }
  };

  // ===== Fluxo em etapas: fim de semana → dia ocupado → resumo =====
  const pendenteFluxo = allDayPendingTask ?? weekendPendingTask;

  const abrirFluxo = (etapaInicial: "fimDeSemana" | "diaTodo") => {
    setEtapasFluxo([etapaInicial]);
    setEtapaAtual(0);
    setDecisoesFluxo([]);
    setResultadoFluxo(null);
  };

  const fecharFluxo = () => {
    setEtapasFluxo([]);
    setEtapaAtual(0);
    setDecisoesFluxo([]);
    setResultadoFluxo(null);
    setWeekendPendingTask(null);
    setAllDayPendingTask(null);
    setWeekendEscolherData(false);
    setWeekendNovaData(null);
    setAllDayEscolherData(false);
    setAllDayNovaData(null);
  };

  // Avança para a etapa de resumo guardando a decisão e a data final
  const avancarParaResumo = (decisao: string, dataFinal: Date) => {
    setDecisoesFluxo(d => [...d, decisao]);
    setResultadoFluxo({ data: dataFinal });
    setEtapasFluxo(e => [...e, "resumo"]);
    setEtapaAtual(i => i + 1);
    setWeekendEscolherData(false);
    setWeekendNovaData(null);
    setAllDayEscolherData(false);
    setAllDayNovaData(null);
  };

  // Abre a etapa "dia ocupado" como interferência adicional do fluxo
  const abrirEtapaDiaTodo = (
    pendente: { taskData: any; existingTask?: Task | null; isMove?: boolean; adjustedTime?: string; targetDate?: Date },
    decisao: string,
    alvo: Date,
    tituloDiaTodo: string | undefined,
    proximoDisponivel: Date
  ) => {
    const veioDoFimDeSemana = etapasFluxo[0] === "fimDeSemana";
    setAllDayPendingTask({
      taskData: pendente.taskData ?? null,
      existingTask: pendente.existingTask ?? null,
      isMove: pendente.isMove,
      adjustedTime: pendente.adjustedTime,
      nextAvailableDate: proximoDisponivel,
      allDayTaskTitle: tituloDiaTodo,
      targetDate: alvo,
      origem: veioDoFimDeSemana ? "fimDeSemana" : "escolhaData",
      dataOriginal: veioDoFimDeSemana ? (pendente.targetDate ?? alvo) : alvo,
    });
    setDecisoesFluxo(d => [...d, decisao]);
    setEtapasFluxo(e => [...e, "diaTodo"]);
    setEtapaAtual(i => i + 1);
    setWeekendEscolherData(false);
    setWeekendNovaData(null);
    setAllDayEscolherData(false);
    setAllDayNovaData(null);
  };

  const voltarEtapa = () => {
    if (etapaAtual === 0) return;
    setEtapasFluxo(e => e.slice(0, -1));
    setDecisoesFluxo(d => d.slice(0, -1));
    setEtapaAtual(i => i - 1);
    setResultadoFluxo(null);
    setWeekendEscolherData(false);
    setWeekendNovaData(null);
    setAllDayEscolherData(false);
    setAllDayNovaData(null);
  };

  // Data alvo da etapa "dia ocupado"
  const dataAlvoDiaTodo = (): Date | null =>
    allDayPendingTask?.targetDate ?? allDayPendingTask?.taskData?.date ?? allDayPendingTask?.existingTask?.date ?? null;

  // Motivos explicados na etapa "dia ocupado" (formato "título|explicação")
  const motivosDiaTodo = (): string[] => {
    const pend = allDayPendingTask;
    if (!pend) return [];
    const alvo = dataAlvoDiaTodo();
    const dia = (d: Date | null | undefined) => (d ? format(d, "EEEE, dd/MM", { locale: ptBR }) : "outro dia");
    const motivos: string[] = [];
    if (pend.origem === "fimDeSemana" && pend.dataOriginal) {
      motivos.push(`Fim de semana|Você pediu para mover para ${dia(pend.dataOriginal)}, que é fim de semana, e escolheu o próximo dia útil. A tarefa iria para ${dia(alvo)}.`);
    }
    if (pend.allDayTaskTitle) {
      motivos.push(`Dia ocupado por tarefa de dia todo|${dia(alvo)} já está reservado pela tarefa de dia todo "${pend.allDayTaskTitle}". Se mantiver, sua tarefa ficará junto com ela.`);
    }
    if (pend.nextAvailableDate) {
      motivos.push(`Próximo dia disponível|${dia(pend.nextAvailableDate)} é o primeiro dia sem tarefa de dia todo.`);
    }
    return motivos;
  };

  // Próximo dia sem tarefa de dia todo para o usuário da tarefa
  const proximoDiaSemDiaTodo = async (aPartirDe: Date, userId?: string) => {
    let dia = getNextBusinessDay(aPartirDe);
    while ((await checkAllDayTasks(dia, userId)).hasTask) {
      dia = getNextBusinessDay(dia);
    }
    return dia;
  };

  // Etapa fim de semana: decisão "Mover para Próximo Dia Útil"
  const decidirProximoDiaUtil = async () => {
    const pendente = weekendPendingTask;
    if (!pendente) return;
    const nextBusinessDay = getNextBusinessDay(pendente.targetDate);
    const taskUserId = pendente.existingTask?.userId ?? pendente.taskData?.userId;
    if (calendarioRegras.validacao_dia_todo || calendarioRegras.pergunta_dia_todo) {
      const allDayCheck = await checkAllDayTasks(nextBusinessDay, taskUserId);
      if (allDayCheck.hasTask) {
        const nextAvailableDay = await getNextAvailableDay(pendente.targetDate, taskUserId);
        abrirEtapaDiaTodo(pendente, `Mover para o próximo dia útil (${format(nextBusinessDay, "dd/MM")})`, nextBusinessDay, allDayCheck.taskTitle, nextAvailableDay);
        return;
      }
    }
    avancarParaResumo(`Mover para o próximo dia útil (${format(nextBusinessDay, "dd/MM/yyyy")})`, nextBusinessDay);
  };

  // Etapa fim de semana: data escolhida no calendário (pode gerar nova etapa se também estiver ocupada)
  const aplicarDataFimDeSemana = async (novaData: Date) => {
    const pendente = weekendPendingTask;
    if (!pendente) return;
    const userIdDaTarefa = pendente.existingTask?.userId ?? pendente.taskData?.userId;
    if (calendarioRegras.validacao_dia_todo) {
      const allDayCheck = await checkAllDayTasks(novaData, userIdDaTarefa);
      if (allDayCheck.hasTask) {
        const nextAvailableDay = await proximoDiaSemDiaTodo(novaData, userIdDaTarefa);
        abrirEtapaDiaTodo(pendente, `Escolher outra data (${format(novaData, "dd/MM")}), que também está ocupada`, novaData, allDayCheck.taskTitle, nextAvailableDay);
        return;
      }
    }
    avancarParaResumo(`Escolher outra data (${format(novaData, "dd/MM/yyyy")})`, novaData);
  };

  // Etapa dia ocupado: data escolhida no calendário (pode gerar nova etapa se também estiver ocupada)
  const aplicarDataDiaTodo = async (novaData: Date) => {
    const pendente = allDayPendingTask;
    if (!pendente) return;
    const userIdDaTarefa = pendente.existingTask?.userId ?? pendente.taskData?.userId;
    if (calendarioRegras.validacao_dia_todo) {
      const allDayCheck = await checkAllDayTasks(novaData, userIdDaTarefa);
      if (allDayCheck.hasTask) {
        const nextAvailableDay = await proximoDiaSemDiaTodo(novaData, userIdDaTarefa);
        abrirEtapaDiaTodo(pendente, `Escolher outra data (${format(novaData, "dd/MM")}), que também está ocupada`, novaData, allDayCheck.taskTitle, nextAvailableDay);
        return;
      }
    }
    avancarParaResumo(`Escolher outra data (${format(novaData, "dd/MM/yyyy")})`, novaData);
  };

  // Etapa resumo: executa o que foi decidido
  const executarFluxo = async () => {
    const resultado = resultadoFluxo;
    const pendente = pendenteFluxo;
    if (!resultado || !pendente) return;
    if (pendente.isMove && pendente.existingTask) {
      const adjustedTime = pendente.adjustedTime ?? pendente.existingTask.time;
      const success = await updateTaskInDatabase(pendente.existingTask.id, { date: resultado.data, time: adjustedTime }, 'drag');
      if (success) {
        setTasks(tasks.map(t => t.id === pendente.existingTask!.id ? { ...t, date: resultado.data, time: adjustedTime } : t));
        toast.success(`Tarefa movida para ${format(resultado.data, "dd/MM/yyyy", { locale: ptBR })}`);
      }
    } else if (pendente.taskData) {
      await saveTaskInternal({ ...pendente.taskData, date: resultado.data });
    }
    fecharFluxo();
  };


  // Adicionar tarefa
  const validacaoAtiva = isAdmin && modoValidacao;
  const abrirPrevia = (acao: AcaoAgenda, ctx: Partial<Parameters<typeof montarPassos>[0]>, executar: () => void) => {
    setPrevia({ titulo: TITULO_ACAO[acao], passos: montarPassos({ acao, regras: calendarioRegras, automacoes: automacoesAgenda, ...ctx }), executar });
  };
  const contarConflitos = (userId: string | undefined, data: Date, hora: string | undefined, ignorarId?: string) =>
    hora ? tasks.filter((t) => t.id !== ignorarId && (!userId || t.userId === userId) && isSameDay(t.date, data) && t.time === hora).length : 0;

  const handleSaveTask = async (taskData: {
    id?: string;
    contactId: string;
    contactName: string;
    date: Date;
    time: string;
    origem: string;
    campaignId?: string;
    observation?: string;
    isAllDay?: boolean;
    userId?: string;
    isAutomatic?: boolean; // Flag para indicar se é inserção automática (rotinas) ou manual
  }, semPrevia = false, outrasResolvidas = false) => {
    if (validacaoAtiva && !semPrevia) {
      const dados = { ...taskData };
      abrirPrevia(taskData.id ? "editar" : "criar", { data: taskData.date, horario: taskData.isAllDay ? undefined : taskData.time, diaTodo: taskData.isAllDay, automatica: taskData.isAutomatic, conflitos: contarConflitos(taskData.userId, taskData.date, taskData.time, taskData.id) }, () => handleSaveTask(dados, true));
      return;
    }
    // Ao virar "dia todo" (antes sem horário/com horário), avisar sobre as outras tarefas do dia
    const anterior = taskData.id ? tasks.find(t => t.id === taskData.id) : undefined;
    if (taskData.isAllDay && !taskData.isAutomatic && !outrasResolvidas && (!anterior || !anterior.isAllDay || !isSameDay(anterior.date, taskData.date))) {
      let donoId: string | undefined = taskData.userId || anterior?.userId;
      if (!donoId) {
        const { data: meuId } = await (supabase as any).rpc("get_current_usuario_id");
        donoId = meuId || undefined;
      }
      let q = (supabase as any).from("calendario_tarefas")
        .select("id, title, time, is_all_day, contact_name")
        .eq("date", format(taskData.date, "yyyy-MM-dd")).not("status", "in", '("concluido","cancelado","completed")');
      if (donoId) q = q.eq("user_id", donoId);
      if (taskData.id) q = q.neq("id", taskData.id);
      const { data: outras } = await q;
      if (outras?.length) {
        setDiaTodoOutras({ taskData: { ...taskData }, outras });
        return;
      }
    }
    // Verificar regra "dia todo" - SOMENTE se a data for FUTURA e for inserção automática
    if (!taskData.isAllDay && calendarioRegras.validacao_dia_todo && taskData.isAutomatic) {
      // Só verificar se a data for diferente da data atual
      const today = startOfDay(new Date());
      const taskDate = startOfDay(taskData.date);
      
      if (taskDate > today) {
        // Validar pelo usuário da tarefa (não pelo admin que está criando)
        const allDayCheck = await checkAllDayTasks(taskData.date, taskData.userId);
        
        if (allDayCheck.hasTask) {
          // Realocar SOMENTE para inserções automáticas em datas futuras
          let nextDate = addDays(taskData.date, 1);
          let nextCheck = await checkAllDayTasks(nextDate, taskData.userId);
          
          // Procurar o próximo dia sem tarefa de dia todo para o usuário
          while (nextCheck.hasTask) {
            nextDate = addDays(nextDate, 1);
            nextCheck = await checkAllDayTasks(nextDate, taskData.userId);
          }
          
          taskData.date = nextDate;
          toast.info(`Tarefa automática realocada para ${format(nextDate, "dd/MM/yyyy")} devido a tarefa de dia todo`);
        }
      }
    }

    // Ao criar/editar manualmente em data que já tem tarefa de dia todo, perguntar o que fazer
    if (!taskData.isAllDay && !taskData.isAutomatic && calendarioRegras.pergunta_dia_todo) {
      const allDayCheck = await checkAllDayTasks(taskData.date, taskData.userId);
      if (allDayCheck.hasTask) {
        // Próximo dia útil sem tarefa de dia todo
        let nextAvailableDay = getNextBusinessDay(taskData.date);
        while ((await checkAllDayTasks(nextAvailableDay, taskData.userId)).hasTask) {
          nextAvailableDay = getNextBusinessDay(nextAvailableDay);
        }
        void carregarDatasDiaTodo(taskData.userId);
        setAllDayPendingTask({
          taskData: taskData,
          existingTask: null,
          isMove: false,
          adjustedTime: taskData.time,
          nextAvailableDate: nextAvailableDay,
          allDayTaskTitle: allDayCheck.taskTitle,
          targetDate: taskData.date,
          origem: "criacao",
          dataOriginal: taskData.date,
        });
        setAllDayEscolherData(false);
        setAllDayNovaData(null);
        abrirFluxo("diaTodo");
        return;
      }
    }

    // Para inserções MANUAIS (usuário criando), NUNCA bloquear ou realocar
    // O usuário tem controle total sobre suas tarefas manuais

    // Verificar se é fim de semana (regra: bloqueio_finais_semana)
    if (checkWeekend(taskData.date) && calendarioRegras.bloqueio_finais_semana) {
      // Se for inserção MANUAL: perguntar se realmente quer agendar
      if (!taskData.isAutomatic) {
        setWeekendPendingTask({
          taskData: taskData,
          existingTask: null,
          targetDate: taskData.date,
          isMove: false
        });
        abrirFluxo("fimDeSemana");
        return;
      } else {
        // Se for inserção AUTOMÁTICA (rotinas): realocar para próximo dia disponível
        const nextBusinessDay = await getNextAvailableDay(taskData.date, taskData.userId);
        toast.info(`Data realocada de ${format(taskData.date, "dd/MM/yyyy")} para ${format(nextBusinessDay, "dd/MM/yyyy")} (próximo dia útil)`);
        taskData.date = nextBusinessDay;
      }
    }

    // Verificar horário comercial (se não for dia todo)
    if (!taskData.isAllDay && calendarioRegras.horario_comercial && taskData.time) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from("usuarios")
            .select("hora_inicial, hora_final")
            .eq("id", user.id)
            .maybeSingle();
          
          if (userData) {
            // Extrair apenas HH:mm dos campos que podem vir como HH:mm:ss
            const horaInicial = (userData.hora_inicial || "08:00:00").substring(0, 5);
            const horaFinal = (userData.hora_final || "18:00:00").substring(0, 5);
            
            // Se não está dentro do horário comercial
            if (!isWithinBusinessHours(taskData.time, horaInicial, horaFinal)) {
              // Inserção MANUAL: perguntar se realmente deseja
              if (!taskData.isAutomatic) {
                const adjustment = adjustToBusinessHours(taskData.time, taskData.date, horaInicial, horaFinal);
                setBusinessHoursPendingTask({
                  taskData: taskData,
                  suggestedTime: adjustment.adjustedTime
                });
                setIsBusinessHoursDialogOpen(true);
                return;
              } else {
                // Inserção AUTOMÁTICA: ajustar automaticamente
                const adjustment = adjustToBusinessHours(taskData.time, taskData.date, horaInicial, horaFinal);
                taskData.time = adjustment.adjustedTime;
                taskData.date = adjustment.adjustedDate;
                if (adjustment.message) {
                  toast.info(adjustment.message);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Erro ao verificar horário comercial:", error);
      }
    }

    await saveTaskInternal(taskData);
  };

  const saveTaskInternal = async (taskData: {
    id?: string;
    contactId: string;
    contactName: string;
    date: Date;
    time: string;
    origem: string;
    campaignId?: string;
    observation?: string;
    isAllDay?: boolean;
    userId?: string;
  }) => {
    try {
      console.log("=== Iniciando saveTaskInternal ===");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error("Usuário não autenticado");
        toast.error("Usuário não autenticado");
        return;
      }

      console.log("Usuário autenticado:", user.id, user.email);
      console.log("isAdmin:", isAdmin);
      console.log("selectedUserIds:", selectedUserIds);

      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        console.error("Estabelecimento não encontrado");
        toast.error("Estabelecimento não encontrado");
        return;
      }

      console.log("Estabelecimento ID obtido:", estabelecimentoId);

      // O user_id na tabela calendario_tarefas referencia a tabela usuarios, não auth.users
      // Se taskData.userId já foi fornecido, ele já é o ID correto da tabela usuarios
      // Caso contrário, precisamos buscar o ID da tabela usuarios baseado no auth.uid()
      let targetUserId = taskData.userId;
      
      if (!targetUserId) {
        const { data: usuarioData, error: usuarioError } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .maybeSingle();
        
        if (usuarioError || !usuarioData) {
          console.error("Erro ao buscar ID do usuário na tabela usuarios:", usuarioError);
          toast.error("Usuário não encontrado na base de dados");
          return;
        }
        targetUserId = usuarioData.id;
      }
      
      console.log("=== TARGET USER DEBUG ===");
      console.log("taskData.userId (usuarios.id):", taskData.userId);
      console.log("user.id (current auth):", user.id);
      console.log("targetUserId (usuarios.id final):", targetUserId);
      console.log("========================");

      // Regra: só 1 tarefa em aberto por contato e usuário agendado (qualquer data/horário)
      if (taskData.contactId) {
        let q = (supabase as any)
          .from('calendario_tarefas')
          .select('id, date, time')
          .eq('contact_id', taskData.contactId)
          .eq('user_id', targetUserId)
          .eq('status', 'pending')
          .limit(1);
        if (taskData.id) q = q.neq('id', taskData.id);
        const { data: existente } = await q;
        if (existente && existente.length > 0) {
          const t = existente[0];
          const dataFmt = t.date ? format(new Date(`${t.date}T00:00:00`), 'dd/MM/yyyy') : '';
          toast.error(`Este contato já tem uma tarefa na agenda deste usuário${dataFmt ? ` (${dataFmt}${t.time ? ` às ${String(t.time).substring(0, 5)}` : ''})` : ''}. Altere a tarefa existente.`);
          return;
        }
      }

      // Dia todo: sempre uma única tarefa, sem repetições por horário
      if (taskData.isAllDay) {
        const { error } = await (supabase as any)
          .from('calendario_tarefas')
          .upsert({
            ...(taskData.id ? { id: taskData.id } : {}),
            user_id: targetUserId,
            estabelecimento_id: estabelecimentoId,
            contact_id: taskData.contactId,
            contact_name: taskData.contactName,
            title: `${taskData.origem === 'ligacao' ? 'Ligação' : taskData.origem === 'visita' ? 'Visita' : taskData.origem === 'campanha' ? 'Campanha' : 'Tarefa'} - ${taskData.contactName}`,
            description: taskData.observation,
            date: format(taskData.date, 'yyyy-MM-dd'),
            time: null,
            origem: taskData.origem,
            campaign_id: taskData.campaignId,
            status: 'pending',
            is_all_day: true,
          });
        if (error) {
          toast.error(`Erro ao salvar tarefa: ${error.message}`);
          return;
        }
        toast.success(taskData.id ? 'Tarefa atualizada para dia todo' : 'Tarefa de dia todo adicionada');
        await loadTasks();
        setShowTaskDialog(false);
        setEditingTask(null);
        return;
      }

      if (false as boolean) {
        // Atualização de tarefa existente para "dia todo"
        if (taskData.id) {
          const titleComputed = `${taskData.origem === 'ligacao' ? 'Ligação' : taskData.origem === 'visita' ? 'Visita' : taskData.origem === 'campanha' ? 'Campanha' : 'Tarefa'} - ${taskData.contactName}`;
          const { data, error } = await (supabase as any)
            .from('calendario_tarefas')
            .update({
              user_id: targetUserId,
              estabelecimento_id: estabelecimentoId,
              contact_id: taskData.contactId,
              contact_name: taskData.contactName,
              title: titleComputed,
              description: taskData.observation,
              date: format(taskData.date, 'yyyy-MM-dd'),
              time: null, // Dia todo não tem horário específico
              origem: taskData.origem,
              campaign_id: taskData.campaignId,
              status: 'pending',
              is_all_day: true,
            })
            .eq('id', taskData.id)
            .select();

          if (error) {
            console.error('Erro ao atualizar tarefa para dia todo:', error);
            toast.error('Erro ao atualizar tarefa');
            return;
          }

          console.log('Tarefa atualizada para dia todo:', data);
          toast.success('Tarefa atualizada para dia todo');
          await loadTasks();
          setShowTaskDialog(false);
          return;
        }

        console.log("=== Buscando jornada de trabalho ===");
        console.log("Target User ID para jornada:", targetUserId);
        console.log("User ID autenticado:", user.id);
        console.log("Estabelecimento ID:", estabelecimentoId);
        
        const { data: userData, error: userError } = await (supabase as any)
          .from("usuarios")
          .select("hora_inicial, hora_final, id, nome")
          .eq("id", targetUserId)
          .limit(1)
          .maybeSingle();
        
        console.log("Resposta completa da query:", { userData, userError });
        
        if (userError) {
          console.error("Erro na query de jornada:", userError);
          toast.error(`Erro ao buscar jornada: ${userError.message}`);
          return;
        }
        
        if (!userData) {
          console.error("userData é null - usuário não encontrado na tabela usuarios");
          console.log("Verificando se o problema é RLS ou dados realmente não existem");
          
          // Tarefa simples sem dia todo
          if (!sessionStorage.getItem('jornada_missing_warned')) {
            toast.error("Configuração de jornada não encontrada. Criando tarefa única sem divisão por horários.");
            sessionStorage.setItem('jornada_missing_warned', '1');
          }
          
          // Criar apenas uma tarefa ao invés de múltiplas
          const { error } = await (supabase as any)
            .from('calendario_tarefas')
            .insert({
              user_id: targetUserId,
              estabelecimento_id: estabelecimentoId,
              contact_id: taskData.contactId,
              contact_name: taskData.contactName,
              title: `${taskData.origem === 'ligacao' ? 'Ligação' : taskData.origem === 'visita' ? 'Visita' : taskData.origem === 'campanha' ? 'Campanha' : 'Tarefa'} - ${taskData.contactName}`,
              description: taskData.observation,
              date: format(taskData.date, 'yyyy-MM-dd'),
              time: '08:00',
              origem: taskData.origem,
              campaign_id: taskData.campaignId,
              status: "pending",
              is_all_day: true,
            })
            .select();

          if (error) {
            console.error("Erro ao criar tarefa única:", error);
            toast.error(`Erro ao criar tarefa: ${error.message}`);
            return;
          }

          toast.success("Tarefa de dia todo adicionada com sucesso");
          await loadTasks(); // Recarregar lista após criar
          setShowTaskDialog(false);
          return;
        }
        
        console.log("Usuário encontrado:", userData.nome);
        console.log("hora_inicial raw:", userData.hora_inicial);
        console.log("hora_final raw:", userData.hora_final);
        
        // Extrair apenas HH:mm dos campos que podem vir como HH:mm:ss
        const horaInicial = userData.hora_inicial 
          ? userData.hora_inicial.toString().substring(0, 5) 
          : "08:00";
        const horaFinal = userData.hora_final 
          ? userData.hora_final.toString().substring(0, 5) 
          : "18:00";
        
        console.log("hora_inicial processada:", horaInicial);
        console.log("hora_final processada:", horaFinal);
        
        const [startHour, startMinute] = horaInicial.split(':').map(Number);
        const [endHour, endMinute] = horaFinal.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        
        const tarefasParaInserir = [];
        
        for (let time = startTime; time < endTime; time += 15) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          tarefasParaInserir.push({
            user_id: targetUserId,
            estabelecimento_id: estabelecimentoId,
            contact_id: taskData.contactId,
            contact_name: taskData.contactName,
            title: `${taskData.origem === 'ligacao' ? 'Ligação' : taskData.origem === 'visita' ? 'Visita' : taskData.origem === 'campanha' ? 'Campanha' : 'Tarefa'} - ${taskData.contactName}`,
            description: taskData.observation,
            date: format(taskData.date, 'yyyy-MM-dd'),
            time: timeString,
            origem: taskData.origem,
            campaign_id: taskData.campaignId,
            status: "pending",
            is_all_day: true,
          });
        }
        
        const { error } = await (supabase as any)
          .from('calendario_tarefas')
          .insert(tarefasParaInserir);

        if (error) {
          console.error("Erro ao criar tarefas de dia todo:", error);
          toast.error("Erro ao criar tarefas de dia todo");
          return;
        }

        toast.success(`${tarefasParaInserir.length} tarefas adicionadas para o dia todo`);
        await loadTasks(); // Recarregar lista após criar
      } else {
        // Tarefa normal com horário específico
        console.log(taskData.id ? "Atualizando tarefa para user_id:" : "Criando tarefa para user_id:", targetUserId);
        console.log("Estabelecimento ID:", estabelecimentoId);
        console.log("Data da tarefa:", format(taskData.date, 'yyyy-MM-dd'));
        
        const tarefaPayload = {
          user_id: targetUserId,
          estabelecimento_id: estabelecimentoId,
          contact_id: taskData.contactId,
          contact_name: taskData.contactName,
          title: `${taskData.origem === 'ligacao' ? 'Ligação' : taskData.origem === 'visita' ? 'Visita' : taskData.origem === 'campanha' ? 'Campanha' : 'Tarefa'} - ${taskData.contactName}`,
          description: taskData.observation,
          date: format(taskData.date, 'yyyy-MM-dd'),
          time: taskData.time || null, // Converter string vazia em null
          origem: taskData.origem,
          campaign_id: taskData.campaignId,
          status: "pending",
          is_all_day: taskData.isAllDay || false,
        };
        
        console.log("Dados da tarefa:", tarefaPayload);
        
        // Se tem ID, é uma atualização
        if (taskData.id) {
          const { data, error } = await (supabase as any)
            .from('calendario_tarefas')
            .update(tarefaPayload)
            .eq('id', taskData.id)
            .select();

          if (error) {
            console.error("Erro ao atualizar tarefa:", error);
            console.error("Detalhes do erro:", JSON.stringify(error, null, 2));
            toast.error(`Erro ao atualizar tarefa: ${error.message || 'Erro desconhecido'}`);
            return;
          }

          console.log("Tarefa atualizada com sucesso:", data);
          toast.success("Tarefa atualizada com sucesso");
          await loadTasks(); // Recarregar lista após atualizar
        } else {
          // Senão, é uma criação
          const { data, error } = await (supabase as any)
            .from('calendario_tarefas')
            .insert(tarefaPayload)
            .select();

          if (error) {
            console.error("Erro ao criar tarefa:", error);
            console.error("Detalhes do erro:", JSON.stringify(error, null, 2));
            toast.error(`Erro ao criar tarefa: ${error.message || 'Erro desconhecido'}`);
            return;
          }

          console.log("Tarefa criada com sucesso:", data);
          toast.success("Tarefa adicionada com sucesso");
          await loadTasks(); // Recarregar lista após criar
        }
      }
      
      setShowTaskDialog(false);
    } catch (error) {
      console.error("Erro ao salvar tarefa:", error);
      toast.error("Erro ao salvar tarefa");
    }
  };

  const handleOpenNewTask = (date?: Date) => {
    setSelectedTaskId(null);
    setEditingTask(null);
    setContatoReprogramar(null);
    setSelectedDate(date || null);
    setShowTaskDialog(true);
    void carregarDatasDiaTodo();
  };

  useEffect(() => {
    const nova = (e: Event) => {
      const d = (e as CustomEvent).detail?.data;
      handleOpenNewTask(d ? new Date(d) : undefined);
    };
    window.addEventListener("calendario:nova-tarefa", nova);
    return () => window.removeEventListener("calendario:nova-tarefa", nova);
  });


  const [encerramentoPendente, setEncerramentoPendente] = useState<Task | null>(null);
  const [contatoReprogramar, setContatoReprogramar] = useState<{ id: string; nome: string } | null>(null);
  // Próxima tarefa pendente do mesmo contato com data futura (a partir de hoje)
  const tarefaFuturaDoContato = (task: Task | null) => {
    if (!task?.contactId) return undefined;
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    return tasks
      .filter(t => t.id !== task.id && t.contactId === task.contactId && t.status === "pending" && new Date(t.date) >= hoje)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  };

  const handleToggleTaskStatus = async (taskId: string, semPrevia = false, forcar = false) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (validacaoAtiva && !semPrevia) {
      abrirPrevia(task.status === "pending" ? "concluir" : "reabrir", {}, () => handleToggleTaskStatus(taskId, true));
       return;
    }
    // Regra: ao concluir, exigir reprogramação de nova tarefa ou inativação do cliente
    if (task.status === "pending" && !forcar && calendarioRegras.encaminhamento_obrigatorio_conclusao) {
      setEncerramentoPendente(task);
      return;
    }

    const newStatus = task.status === "pending" ? "completed" : "pending";
    const success = await updateTaskInDatabase(taskId, { status: newStatus }, 'toggle-status');
    
    if (success) {
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus as "pending" | "completed" } : t
      );
      setTasks(updatedTasks);
    }
  };

  // Conclui a tarefa exigindo encaminhamento: reprogramar nova tarefa ou inativar o cliente
  const confirmarEncerramento = async (modo: "reprogramar" | "inativar" | "manter" | "modificar") => {
    const task = encerramentoPendente;
    setEncerramentoPendente(null);
    if (!task) return;
    const futura = tarefaFuturaDoContato(task);
    if (modo === "inativar") {
      if (!task.contactId) { toast.error("Esta tarefa não tem cliente vinculado"); return; }
      try {
        const { error } = await supabase.rpc("inactivate_customer", { p_customer_id: task.contactId });
        if (error) throw error;
        toast.success("Cliente inativado");
      } catch (e) {
        console.error("Erro ao inativar cliente:", e);
        toast.error("Erro ao inativar cliente");
        return;
      }
    }
    await handleToggleTaskStatus(task.id, true, true);
    if (modo === "manter") {
      toast.success("Tarefa concluída — mantida a data já estabelecida");
    } else if (modo === "modificar" && futura) {
      setSelectedTaskId(futura.id);
      toast.info("Altere a data da tarefa já existente para a nova data");
    } else if (modo === "reprogramar") {
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      handleOpenNewTask(amanha);
      if (task.contactId) setContatoReprogramar({ id: task.contactId, nome: task.contactName || "Contato" });
      toast.info("Reprograme a nova tarefa para uma data futura");
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Após mover: se o mesmo contato já tem tarefa pendente no dia de destino, une as duas
  type DesfazerItem = { id: string; date: string; time: string | null; is_all_day: boolean; uniao?: { linha: any; alvoId: string; alvoAntes: any } };
  const [ultimoMovimento, setUltimoMovimento] = useState<DesfazerItem[] | null>(null);
  const [desfazendo, setDesfazendo] = useState(false);
  const snapshotMov = (t: Task): DesfazerItem => ({ id: t.id, date: format(t.date, "yyyy-MM-dd"), time: t.time || null, is_all_day: !!t.isAllDay });
  const desfazerUltimoMovimento = async () => {
    if (!ultimoMovimento?.length || desfazendo) return;
    setDesfazendo(true);
    try {
      let falhas = 0;
      for (const item of ultimoMovimento) {
        if (item.uniao) {
          const { error: e1 } = await (supabase as any).from("calendario_tarefas").update(item.uniao.alvoAntes).eq("id", item.uniao.alvoId);
          const { error: e2 } = await (supabase as any).from("calendario_tarefas").insert({ ...item.uniao.linha, date: item.date, time: item.time, is_all_day: item.is_all_day });
          if (e1 || e2) falhas++;
        } else {
          const { error } = await (supabase as any).from("calendario_tarefas").update({ date: item.date, time: item.time, is_all_day: item.is_all_day }).eq("id", item.id);
          if (error) falhas++;
        }
      }
      setUltimoMovimento(null);
      if (falhas) toast.error(`${falhas} tarefa(s) não puderam ser restauradas.`); else toast.success("Última movimentação desfeita");
      await loadTasks();
      void carregarDatasDiaTodo();
    } finally { setDesfazendo(false); }
  };

  const unirTarefaMesmoContato = async (task: Task, novaData: Date): Promise<DesfazerItem["uniao"] | null> => {
    if (!task.contactId) return null;
    const { data: existentes } = await (supabase as any).from("calendario_tarefas")
      .select("id, title, description, time, is_all_day")
      .eq("contact_id", task.contactId)
      .eq("date", format(novaData, "yyyy-MM-dd"))
      .not("status", "in", '("concluido","cancelado","completed")')
      .neq("id", task.id)
      .order("created_at", { ascending: true })
      .limit(1);
    const alvo = existentes?.[0];
    if (!alvo) return null;
    const extra = [task.title, task.description].filter(Boolean).join(" — ");
    const descricao = [alvo.description, extra && `Unida: ${extra}`].filter(Boolean).join("\n");
    const horarios = [alvo.time, task.time].filter(Boolean).sort() as string[];
    const { error: erroUp } = await (supabase as any).from("calendario_tarefas").update({
      description: descricao,
      is_all_day: !!(alvo.is_all_day || task.isAllDay),
      time: alvo.is_all_day || task.isAllDay ? null : (horarios[0] || null),
    }).eq("id", alvo.id);
    if (erroUp) return null;
    const { data: linha } = await (supabase as any).from("calendario_tarefas").select("*").eq("id", task.id).maybeSingle();
    const { error: erroDel } = await (supabase as any).from("calendario_tarefas").delete().eq("id", task.id);
    if (erroDel) return null;
    setTasks(atuais => atuais.filter(t => t.id !== task.id));
    toast.info(`Tarefa unida à tarefa já existente de ${task.contactName || "contato"} neste dia`);
    return { linha, alvoId: alvo.id, alvoAntes: { description: alvo.description, time: alvo.time, is_all_day: alvo.is_all_day } };
  };

  const moverSelecao = async (confirmado = false, semPrevia = false, diaTodoResolvido = false, ov?: { ids: Set<string>; data: Date }) => {
    const dataMov = ov?.data ?? dataMovimento; const idsMov = ov?.ids ?? tarefasParaMover;
    if (!dataMov || movendoSelecao) return;
    const selecionadas = tasks.filter(t => idsMov.has(t.id));
    if (!selecionadas.length) return;
    if (selecionadas.some(t => tarefaAtrasada(t))) { toast.error("Tarefas atrasadas não podem ser movidas manualmente."); return; }
    if (selecaoNaMesmaData(dataMov, selecionadas)) { toast.info("As tarefas já estão nesta data."); return; }
    const movimentos = selecionadas.map(task => ({ task, updates: prepararMovimento(task, dataMov, calendarioRegras) }));
    if (movimentos.some(m => !m.updates)) { toast.error("Não é possível mover tarefa para data passada"); return; }
    // Prévia de regras não abre outra janela: os conflitos aparecem no próprio popup de mover
    setMovendoSelecao(true);
    try {
      if (!confirmado) {
        const avisos: string[] = [];
        setOutrasDiaTodoMov([]);
        // Tarefa de dia todo indo para data com outras tarefas: prever no mesmo popup
        if (!diaTodoResolvido && calendarioRegras.pergunta_dia_todo) {
          const allDaySel = selecionadas.filter(t => t.isAllDay);
          if (allDaySel.length) {
            const selIds = new Set(selecionadas.map(t => t.id));
            const outrasMap = new Map<string, any>();
            for (const tSel of allDaySel) {
              let q = (supabase as any).from("calendario_tarefas")
                .select("id, title, time, is_all_day, contact_name, user_id")
                .eq("date", format(dataMov, "yyyy-MM-dd"))
                .not("status", "in", '("concluido","cancelado","completed")');
              if (tSel.userId) q = q.eq("user_id", tSel.userId);
              const { data: outrasData } = await q;
              (outrasData || []).forEach((o: any) => { if (!selIds.has(o.id)) outrasMap.set(o.id, o); });
            }
            if (outrasMap.size) {
              setOutrasDiaTodoMov([...outrasMap.values()]);
              avisos.push(`Dia já tem outras tarefas|A tarefa de dia todo ocupa o dia inteiro, mas este dia já tem ${outrasMap.size} outra(s) tarefa(s) (veja a lista abaixo). Escolha se elas ficam junto ou vão para o próximo dia disponível.`);
            }
          }
        }
        if (calendarioRegras.bloqueio_finais_semana && checkWeekend(dataMov)) avisos.push(`Fim de semana|${format(dataMov, "EEEE, dd/MM", { locale: ptBR })} é fim de semana e a regra da agenda pede confirmação para marcar nesses dias.`);
        const avisoMisto = avisoMisturaDiaTodo(selecionadas);
        if (avisoMisto) avisos.push(`Tarefa de dia todo perderá o "dia todo"|${avisoMisto}`);
        if (calendarioRegras.pergunta_dia_todo) {
          for (const userId of new Set(selecionadas.filter(t => !t.isAllDay).map(t => t.userId))) {
            if ((await checkAllDayTasks(dataMov, userId)).hasTask) { avisos.push("Dia ocupado por tarefa de dia todo|Este dia já está reservado por uma tarefa de dia todo. Se mantiver, sua tarefa ficará junto com ela."); break; }
          }
        }
        if (calendarioRegras.deteccao_conflitos && movimentos.some(m => m.updates?.time && (
          tasks.some(t => !idsMov.has(t.id) && t.userId === m.task.userId && isSameDay(t.date, dataMov) && t.time === m.updates?.time) ||
          movimentos.some(outro => outro.task.id !== m.task.id && outro.task.userId === m.task.userId && outro.updates?.time === m.updates?.time)
        ))) avisos.push("Horário já ocupado|Já existe tarefa no mesmo horário. Se mantiver, as duas ficam no mesmo horário.");
        if (avisos.length) { if (ov) { setTarefasParaMover(new Set(ov.ids)); setDataMovimento(ov.data); } setAvisoMovimento(avisos); setMovimentoAberto(true); return; }
      }
      const movidas = new Set<string>();
      const registro: DesfazerItem[] = [];
      for (const movimento of movimentos) {
        if (!movimento.updates) continue;
        if (await updateTaskInDatabase(movimento.task.id, movimento.updates, 'drag')) {
          movidas.add(movimento.task.id);
          const updates = movimento.updates;
          setTasks(atuais => atuais.map(t => t.id === movimento.task.id ? { ...t, ...updates } : t));
          const snap = snapshotMov(movimento.task);
          const uniao = await unirTarefaMesmoContato(movimento.task, dataMov);
          registro.push(uniao ? { ...snap, uniao } : snap);
        }
      }
      if (registro.length) setUltimoMovimento(registro);
      setTarefasParaMover(ids => new Set([...ids].filter(id => !movidas.has(id))));
      setAvisoMovimento([]);
      setMovimentoAberto(false);
      if (movidas.size) toast.success(`${movidas.size} tarefa(s) movida(s) para ${format(dataMov, "dd/MM/yyyy")}`);
      if (movidas.size !== selecionadas.length) toast.error("Algumas tarefas não foram movidas e continuam selecionadas.");
      await loadTasks();
      void carregarDatasDiaTodo();
    } finally { setMovendoSelecao(false); }
  };

  const proximaDataSelecao = async () => {
    if (!dataMovimento) return;
    let proxima = getNextBusinessDay(dataMovimento);
    const usuariosAlvo = [...new Set(tasks.filter(t => tarefasParaMover.has(t.id)).map(t => t.userId))];
    for (let i = 0; i < 366; i++) {
      const ocupado = (await Promise.all(usuariosAlvo.map(id => checkAllDayTasks(proxima, id)))).some(r => r.hasTask);
      if (!ocupado) { setDataMovimento(proxima); setAvisoMovimento([]); return; }
      proxima = getNextBusinessDay(proxima);
    }
    toast.error("Não foi encontrada uma data disponível no próximo ano. Escolha outra data.");
  };

  const handleDragEnd = async (event: DragEndEvent, semPrevia = false) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    if (tarefaAtrasada(task) && over.data.current?.date && !isSameDay(over.data.current.date as Date, task.date)) {
      toast.error("Tarefa atrasada não pode ser movida manualmente. Ela passa sozinha para a próxima data na virada da noite.");
      return;
    }
    if (validacaoAtiva && !semPrevia && over.data.current?.date && !(over.data.current.slotTime === undefined && !isSameDay(task.date, over.data.current.date as Date))) {
      const novaData = over.data.current.date as Date;
      abrirPrevia("mover", { data: novaData, dataOriginal: task.date, horario: task.time || undefined, conflitos: contarConflitos(task.userId, novaData, task.time, task.id) }, () => handleDragEnd(event, true));
      return;
    }

    // Se o over.id é uma data (formato ISO), atualiza a data da tarefa
    const overData = over.data.current;
    if (overData?.date) {
      const newDate = overData.date as Date;
      const now = new Date();
      
      // Verificar se a nova data é anterior à data atual (regra: bloquear_datas_passadas)
      if (calendarioRegras.bloquear_datas_passadas && newDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        toast.error("Não é possível mover tarefa para data passada");
        return;
      }
      
      // Se a tarefa tem horário e a nova data é hoje, ajustar horário se já passou (regra: bloquear_horarios_passados)
      let adjustedTime = task.time;
      if (calendarioRegras.bloquear_horarios_passados && task.time && isSameDay(newDate, now)) {
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskDateTime = new Date(newDate);
        taskDateTime.setHours(hours, minutes, 0, 0);
        
        if (taskDateTime < now) {
          // Ajustar para o horário atual ao invés de bloquear
          adjustedTime = format(now, 'HH:mm');
          toast.info(`Horário ajustado para ${adjustedTime} (horário atual)`);
        }
      }
      
      // Aplicar regra de realocação diária: ao mover para data diferente, remover horário (regra: realocacao_diaria)
      const slotTime = overData.slotTime as string | undefined;
      if (slotTime !== undefined) {
        adjustedTime = slotTime;
        if (isSameDay(task.date, newDate) && ((task.time || "") === slotTime || (slotTime && task.time?.slice(0, 2) === slotTime.slice(0, 2)))) return;
      } else if (calendarioRegras.realocacao_diaria && !isSameDay(task.date, newDate)) {
        adjustedTime = "";
        toast.info("Horário removido - tarefa definida como 'sem horário definido'");
      }
      
      // Verificar se é fim de semana (regra: bloqueio_finais_semana)
      console.log('[DRAG] Verificando fim de semana:', {
        isWeekend: checkWeekend(newDate),
        newDate: format(newDate, 'yyyy-MM-dd (EEEE)', { locale: ptBR }),
        dayOfWeek: newDate.getDay(),
        regraBloqueioAtiva: calendarioRegras.bloqueio_finais_semana
      });
      
      // Arraste para outro dia: usa o mesmo popup único de mover, que prevê todos os conflitos
      if (slotTime === undefined && !isSameDay(task.date, newDate)) {
        void carregarDatasDiaTodo(task.userId);
        await moverSelecao(false, true, false, { ids: new Set([task.id]), data: newDate });
        return;
      }
      if (checkWeekend(newDate) && calendarioRegras.bloqueio_finais_semana) {
        console.log('[DRAG] Fim de semana detectado - mostrando dialog de confirmação');
        // Drag é ação MANUAL, então deve perguntar ao usuário
        setWeekendPendingTask({
          taskData: null,
          existingTask: task,
          targetDate: newDate,
          isMove: true,
          adjustedTime: adjustedTime
        });
        abrirFluxo("fimDeSemana");
        return;
      }


      // Ao mover uma tarefa de dia todo para data que já tem outras tarefas, perguntar o que fazer
      if (task.isAllDay && !isSameDay(task.date, newDate) && calendarioRegras.pergunta_dia_todo) {
        let qDiaTodo = (supabase as any).from("calendario_tarefas")
          .select("id, title, time, is_all_day, contact_name")
          .eq("date", format(newDate, "yyyy-MM-dd"))
          .not("status", "in", '("concluido","cancelado","completed")')
          .neq("id", task.id);
        if (task.userId) qDiaTodo = qDiaTodo.eq("user_id", task.userId);
        const { data: outrasDiaTodo } = await qDiaTodo;
        if (outrasDiaTodo?.length) {
          void carregarDatasDiaTodo(task.userId);
          setDiaTodoOutras({ taskData: null, outras: outrasDiaTodo, mover: { taskId: task.id, updates: { date: newDate, time: adjustedTime ?? null }, userId: task.userId } });
          return;
        }
      }
      // Ao mover para data que já tem tarefa de dia todo, perguntar o que fazer
      if (!task.isAllDay && calendarioRegras.pergunta_dia_todo) {
        const allDayCheck = await checkAllDayTasks(newDate, task.userId);
        if (allDayCheck.hasTask) {
          let nextAvailableDay = getNextBusinessDay(newDate);
          while ((await checkAllDayTasks(nextAvailableDay, task.userId)).hasTask) {
            nextAvailableDay = getNextBusinessDay(nextAvailableDay);
          }
          void carregarDatasDiaTodo(task.userId);
          setAllDayPendingTask({
            taskData: null,
            existingTask: task,
            isMove: true,
            adjustedTime: adjustedTime,
            nextAvailableDate: nextAvailableDay,
            allDayTaskTitle: allDayCheck.taskTitle,
            targetDate: newDate,
            origem: "movimento",
            dataOriginal: newDate,
          });
          setAllDayEscolherData(false);
          setAllDayNovaData(null);
          abrirFluxo("diaTodo");
          return;
        }
      }

      // Verificar se já existem tarefas no mesmo horário (regra: deteccao_conflitos)
      // Admin validando: verificar conflitos apenas para o usuário vinculado à tarefa
      if (calendarioRegras.deteccao_conflitos && adjustedTime) {
        const existingTasks = tasks.filter(t => 
          t.id !== taskId &&
          t.userId === task.userId && // Conflito apenas com tarefas do mesmo usuário
          isSameDay(t.date, newDate) && 
          t.time === adjustedTime
        );

        if (existingTasks.length > 0) {
          setConflictingTasks(existingTasks);
          setPendingTask({ ...task, date: newDate, time: adjustedTime });
          setIsConflictDialogOpen(true);
          return;
        }
      }
      
      // Atualizar no banco de dados primeiro
      const success = await updateTaskInDatabase(taskId, { date: newDate, time: adjustedTime }, 'drag');
      
      if (success) {
        const updatedTask = { ...task, date: newDate, time: adjustedTime };
        const updatedTasks = tasks.map(t =>
          t.id === taskId ? updatedTask : t
        );
        setTasks(updatedTasks);
        toast.success("Tarefa movida com sucesso");
        const snap = snapshotMov(task);
        const uniao = await unirTarefaMesmoContato(task, newDate);
        setUltimoMovimento([uniao ? { ...snap, uniao } : snap]);
      } else {
        toast.error("Não foi possível mover a tarefa (regras/permissões).");
      }
    }
  };

  const handleReplaceConflicting = () => {
    if (!pendingTask) return;

    // Remove conflicting tasks and add the pending task
    const updatedTasks = tasks.filter(t => 
      !conflictingTasks.some(ct => ct.id === t.id)
    ).map(t => 
      t.id === pendingTask.id ? pendingTask : t
    );

    setTasks(updatedTasks);
    setIsConflictDialogOpen(false);
    setPendingTask(null);
    setConflictingTasks([]);
    toast.success("Tarefas substituídas");
  };

  const handleKeepAll = () => {
    if (!pendingTask) return;

    const updatedTasks = tasks.map(t =>
      t.id === pendingTask.id ? pendingTask : t
    );
    
    setTasks(updatedTasks);
    setIsConflictDialogOpen(false);
    setPendingTask(null);
    setConflictingTasks([]);
    toast.success("Tarefa adicionada");
  };

  // Obter tarefas do dia
  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      if (!isSameDay(task.date, date)) return false;
      
      // Aplicar filtro de origem
      if (selectedOrigens.length > 0) {
        const origemCompleta: string[] = [];
        selectedOrigens.forEach(origem => {
          if (origem === 'email') {
            origemCompleta.push(`email_${filterEmailTipo}`);
          } else if (origem === 'pedido') {
            origemCompleta.push(`pedido_${filterPedidoTipo}`);
          } else {
            origemCompleta.push(origem);
          }
        });
        
        if (!origemCompleta.includes(task.origem)) return false;
      }
      
      return true;
    });
  };

  // Renderizar calendário mensal
  const renderMonthView = () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    if (agendaCompacta) {
      const inicio = startOfWeek(monthStart, { weekStartsOn: 1 });
      const totalDias = differenceInDays(endOfWeek(monthEnd, { weekStartsOn: 1 }), inicio) + 1;
      const tarefasDoDia = getTasksForDay(currentDate);
      return (
        <div className="min-w-0 space-y-4" data-agenda-mes-compacto>
          <div className="overflow-hidden rounded-md border border-border">
            <div className="grid grid-cols-7 border-b border-border bg-muted/30">
              {Array.from({ length: 7 }, (_, i) => <span key={i} className="min-w-0 py-2 text-center text-xs font-medium text-muted-foreground">{format(addDays(inicio, i), "EEE", { locale: ptBR }).slice(0, 3)}</span>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: totalDias }, (_, i) => {
                const dia = addDays(inicio, i);
                const tarefasDia = getTasksForDay(dia);
                const quantidade = tarefasDia.length;
                const contatos = new Set(tarefasDia.map(t => t.contactId).filter(Boolean)).size;
                return <DroppableDay key={dia.toISOString()} date={dia} className="min-w-0 border-b border-r border-border/60">
                  <Button variant="ghost" onClick={() => setCurrentDate(dia)} aria-label={`Selecionar ${format(dia, 'dd/MM/yyyy')}`} aria-pressed={isSameDay(dia, currentDate)} className={cn("h-16 w-full flex-col gap-1 rounded-none px-0", !isSameMonth(dia, monthStart) && "text-muted-foreground/60", isToday(dia) && "text-primary", isSameDay(dia, currentDate) && "bg-primary/10 ring-1 ring-inset ring-primary")}>
                    <span className="text-sm font-semibold">{format(dia, "d")}</span>
                    {quantidade > 0 ? (
                      <span className={cn("inline-flex h-4 max-w-full items-center gap-0.5 rounded-full bg-primary/10 px-1.5 text-[9px] font-semibold leading-none tabular-nums", isToday(dia) ? "text-primary" : "text-primary/90")}>
                        {quantidade}<span className="hidden sm:inline">{quantidade === 1 ? " tarefa" : " tarefas"}</span>
                      </span>
                    ) : <span className="h-4" />}
                    {contatos > 0 && (
                      <span className="inline-flex h-3 max-w-full items-center gap-0.5 text-[8px] leading-none text-muted-foreground">
                        <User className="h-2 w-2 shrink-0" />{contatos}<span className="hidden sm:inline"> {contatos === 1 ? "contato" : "contatos"}</span>
                      </span>
                    )}
                  </Button>
                </DroppableDay>;
              })}
            </div>
          </div>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <h3 className="text-sm font-semibold capitalize">{format(currentDate, "EEEE, dd/MM", { locale: ptBR })}</h3>
              <span className="shrink-0 text-xs text-muted-foreground">{tarefasDoDia.length} tarefas</span>
            </div>
            {tarefasDoDia.map(task => <DraggableTask key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} onEdit={() => handleEditTask(task)} onDelete={() => handleDeleteTask(task.id)} />)}
            {!tarefasDoDia.length && <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma tarefa neste dia</p>}
          </section>
        </div>
      );
    }

    const dateFormat = "EEE";
    const days = [];
    let day = startDate;

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      weekDays.push(
        <div key={i} className="text-center py-2 sm:py-3 font-medium text-[10px] sm:text-sm text-muted-foreground uppercase border-b border-border">
          <span className="hidden sm:inline">{format(addDays(startDate, i), dateFormat, { locale: ptBR })}</span>
          <span className="sm:hidden">{format(addDays(startDate, i), "EEEEE", { locale: ptBR })}</span>
        </div>
      );
    }

    const rows = [];
    let cells = [];

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayTasks = getTasksForDay(currentDay);
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isTodayDate = isToday(day);

        cells.push(
          <DroppableDay
            key={day.toString()}
            date={currentDay}
            className={`min-h-[60px] sm:min-h-[100px] md:min-h-[140px] border-r border-b border-border hover:bg-muted/50 transition-colors flex flex-col ${
              !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
            } ${isTodayDate ? "bg-primary/5" : ""}`}
          >
            <div className="flex items-center justify-between px-1 sm:px-2 py-0.5 sm:py-1 border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-[5]">
              <div className="flex items-center gap-0.5 sm:gap-1">
                <span 
                  className={`inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full text-xs sm:text-sm cursor-pointer hover:bg-primary/20 transition-colors ${
                    isTodayDate ? "bg-primary text-primary-foreground font-bold" : ""
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(currentDay);
                    setViewMode("day");
                  }}
                  title="Ver dia"
                >
                  {format(day, "d")}
                </span>
                {!isBefore(startOfDay(currentDay), startOfDay(new Date())) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 sm:h-6 sm:w-6 hover:bg-primary/20 hidden sm:flex"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNewTask(currentDay);
                    }}
                    title="Nova tarefa"
                  >
                    <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  </Button>
                )}
              </div>
              {dayTasks.length > 0 && (() => {
                const contatos = new Set(dayTasks.map(t => t.contactId).filter(Boolean)).size;
                return (
                  <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary sm:text-xs">
                    {dayTasks.length} <span className="hidden md:inline">{dayTasks.length === 1 ? "tarefa" : "tarefas"}</span>
                    {contatos > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground sm:text-xs">
                        <User className="h-2.5 w-2.5" />{contatos}
                      </span>
                    )}
                  </span>
                );
              })()}
            </div>
            {/* Mobile: mostrar apenas indicadores coloridos */}
            <div className="flex-1 p-0.5 sm:p-2 overflow-hidden">
              {/* Mobile: pontos coloridos indicando tarefas */}
              <div className="sm:hidden flex flex-wrap gap-0.5 p-1">
                {dayTasks.slice(0, 4).map(task => (
                  <div
                    key={task.id}
                    className={`w-2 h-2 rounded-full ${
                      task.status === "completed" ? "bg-muted-foreground" : "bg-primary"
                    }`}
                    style={task.userId && userColors[task.userId] && task.status !== "completed" ? {
                      backgroundColor: userColors[task.userId]
                    } : {}}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedTaskId(task.id);
                    }}
                  />
                ))}
                {dayTasks.length > 4 && (
                  <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 4}</span>
                )}
              </div>
              {/* Desktop: lista de tarefas */}
              <div className="hidden sm:block space-y-1 overflow-hidden">
                {dayTasks.slice(0, 3).map(task => (
                  <DraggableTask
                    key={task.id}
                    variant="compact"
                    task={task}
                    onClick={(e) => {
                      e?.stopPropagation();
                      setSelectedTaskId(task.id);
                    }}
                    onEdit={() => handleEditTask(task)}
                    onDelete={() => handleDeleteTask(task.id)}
                    userColor={task.userId ? userColors[task.userId] : undefined}
                  />
                ))}
                {dayTasks.length > 3 && (
                  <div 
                    className="text-xs text-muted-foreground px-2 w-full text-left cursor-pointer hover:text-primary"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentDate(currentDay);
                      setViewMode("day");
                    }}
                  >
                    +{dayTasks.length - 3} mais
                  </div>
                )}
              </div>
            </div>
          </DroppableDay>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="grid grid-cols-7">
          {cells}
        </div>
      );
      cells = [];
    }

    return (
      <div className="border-l border-t border-border overflow-hidden">
        <div className="grid grid-cols-7 min-w-0">{weekDays}</div>
        {rows}
      </div>
    );
  };

  // Renderizar visualização de semana
  const renderWeekView = () => {
    const inicio = startOfWeek(currentDate, { weekStartsOn: 1 });
    const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
    const tarefasPorDia = dias.map(getTasksForDay);
    const renderTarefa = (task: Task) => (
      <DraggableTask key={task.id} task={task} onClick={() => setSelectedTaskId(task.id)} onEdit={() => handleEditTask(task)} onDelete={() => handleDeleteTask(task.id)} userColor={task.userId ? userColors[task.userId] : undefined} />
    );
    if (agendaCompacta) {
      const agora = new Date();
      return <div className="min-w-0 space-y-3" data-agenda-semana-compacta>
        {dias.map((dia, i) => {
          const tarefasDia = tarefasPorDia[i];
          const semHora = tarefasDia.filter(t => !t.time || t.isAllDay);
          const comHora = tarefasDia.filter(t => !t.isAllDay && !!t.time);
          const atrasadas = tarefasDia.filter(t => tarefaAtrasada(t)).length;
          const fimDeSemana = isWeekend(dia);
          const passou = isBefore(dia, startOfDay(agora)) && !isToday(dia);
          return <section key={dia.toISOString()} className={cn(
            "min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-colors",
            isToday(dia) ? "border-primary/40 ring-1 ring-primary/25" : "border-border/60"
          )}>
            <div className={cn(
              "flex items-center gap-3 border-b px-3 py-2.5",
              isToday(dia) ? "border-primary/20 bg-primary/10" : fimDeSemana ? "border-border/60 bg-muted/60" : "border-border/60 bg-muted/30"
            )}>
              <Button
                variant="ghost"
                title="Ver dia"
                onClick={() => { setCurrentDate(dia); setViewMode("day"); }}
                className={cn(
                  "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-full p-0 leading-none",
                  isToday(dia) ? "bg-primary text-primary-foreground hover:bg-primary/90" : passou ? "bg-muted text-muted-foreground hover:bg-muted" : "bg-background text-foreground hover:bg-accent"
                )}
              >
                <span className="text-sm font-bold tabular-nums">{format(dia, "d")}</span>
                <span className={cn("text-[9px] uppercase", isToday(dia) ? "text-primary-foreground/80" : "text-muted-foreground")}>{format(dia, "MMM", { locale: ptBR })}</span>
              </Button>
              <button onClick={() => { setCurrentDate(dia); setViewMode("day"); }} className="min-w-0 flex-1 text-left">
                <p className={cn("flex items-center gap-2 truncate text-sm font-semibold capitalize", passou ? "text-muted-foreground" : "text-foreground")}>
                  {format(dia, "EEEE", { locale: ptBR })}
                  {isToday(dia) && <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary-foreground">Hoje</span>}
                  {fimDeSemana && !isToday(dia) && <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">Fim de semana</span>}
                </p>
                <p className="text-[11px] text-muted-foreground">{format(dia, "dd/MM/yyyy", { locale: ptBR })}</p>
              </button>
              <div className="flex shrink-0 items-center gap-1.5">
                {atrasadas > 0 && <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-[10px] font-semibold text-destructive">{atrasadas} atrasada{atrasadas > 1 ? "s" : ""}</span>}
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", tarefasDia.length ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {tarefasDia.length ? `${tarefasDia.length} tarefa${tarefasDia.length > 1 ? "s" : ""}` : "Livre"}
                </span>
              </div>
            </div>
            <div className="space-y-2.5 px-3 py-3">
              {(semHora.length > 0) && (
                <DroppableSlot date={dia} slotTime="" className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-3 w-3" />Sem hora / Dia todo</p>
                  {semHora.map(renderTarefa)}
                </DroppableSlot>
              )}
              {comHora.map(t => t.time).filter((hora, idx, arr) => hora && arr.indexOf(hora) === idx).sort().map(hora => (
                <DroppableSlot key={hora} date={dia} slotTime={hora} className="flex items-start gap-2.5">
                  <span className="mt-1.5 w-11 shrink-0 rounded-md bg-muted px-1 py-0.5 text-center text-[10px] font-semibold tabular-nums text-muted-foreground">{hora.slice(0, 5)}</span>
                  <div className="min-w-0 flex-1 space-y-2">{comHora.filter(t => t.time === hora).map(renderTarefa)}</div>
                </DroppableSlot>
              ))}
              {!tarefasDia.length && (
                <p className="flex items-center justify-center gap-1.5 rounded-lg bg-muted/40 py-3 text-xs text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" />Nenhuma tarefa neste dia
                </p>
              )}
            </div>
          </section>;
        })}
      </div>;
    }
    return (
      <div className="overflow-y-auto overflow-x-hidden rounded-md border border-border/70 bg-background" data-agenda-semana>
        <div className="min-w-0 w-full">
          <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-border/70">
            <div className="border-r border-border/60" />
            {dias.map((dia, i) => (
              <div key={dia.toISOString()} className={cn("border-r border-border/60 py-2 text-center last:border-r-0", isToday(dia) && "bg-primary/5")}>
                <p className={cn("text-[10px] font-medium uppercase text-muted-foreground", isToday(dia) && "text-primary")}>{format(dia, "EEEE", { locale: ptBR })}</p>
                <Button variant="ghost" className={cn("mt-0.5 h-7 gap-2 px-2 text-lg font-semibold", isToday(dia) && "text-primary")} title="Ver dia" onClick={() => { setCurrentDate(dia); setViewMode("day"); }}>
                  {format(dia, "d")}
                  {isToday(dia) && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">Hoje</span>}
                </Button>
                <p className={cn("mt-0.5 text-[10px] text-muted-foreground", isToday(dia) && "text-primary")}>{tarefasPorDia[i].length} {tarefasPorDia[i].length === 1 ? "tarefa" : "tarefas"}</p>
              </div>
            ))}
          </div>
            {tarefasPorDia.some(lista => lista.some(t => !t.time || t.isAllDay)) && (
              <div className="grid grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-border/60">
                <span className="border-r border-border/60 px-1 py-2 text-[9px] text-muted-foreground">Sem hora / Dia todo</span>
                {dias.map((dia, i) => <DroppableSlot key={dia.toISOString()} date={dia} slotTime="" className="space-y-1 border-r border-border/60 p-1 last:border-r-0">{tarefasPorDia[i].filter(t => !t.time || t.isAllDay).map(renderTarefa)}</DroppableSlot>)}
              </div>
            )}
          <div className="max-h-[calc(100vh-420px)] min-h-[380px] overflow-y-auto" ref={(el) => { if (el && !el.dataset.iniciado) { el.scrollTop = 8 * 100; el.dataset.iniciado = "true"; } }}>
            {Array.from({ length: 24 }, (_, hora) => (
              <div key={hora} className="grid min-h-[100px] grid-cols-[48px_repeat(7,minmax(0,1fr))] border-b border-border/60">
                <span className="border-r border-border/60 px-1 py-2 text-center text-[11px] tabular-nums text-muted-foreground">{String(hora).padStart(2, "0")}:00</span>
                {dias.map((dia, i) => (
                  <DroppableSlot key={dia.toISOString()} date={dia} slotTime={`${String(hora).padStart(2, "0")}:00`} className="space-y-1 border-r border-border/60 p-1 last:border-r-0 hover:bg-muted/30">
                    {tarefasPorDia[i].filter(t => !t.isAllDay && t.time?.startsWith(String(hora).padStart(2, "0"))).map(renderTarefa)}
                  </DroppableSlot>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Renderizar visualização de dia
  const renderDayView = () => {
    const dayTasks = getTasksForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    // Separar tarefas em 3 grupos
    const allDayTasks = dayTasks.filter(task => task.isAllDay);
    const noTimeTasks = dayTasks.filter(task => !task.isAllDay && !task.time);
    const timedTasks = dayTasks.filter(task => !task.isAllDay && task.time);

    const renderTaskCard = (task: Task) => (
      <DraggableTask
        key={task.id}
        task={task}
        onClick={() => setSelectedTaskId(task.id)}
        onEdit={() => handleEditTask(task)}
        onDelete={() => handleDeleteTask(task.id)}
        userColor={task.userId ? userColors[task.userId] : undefined}
      />
    );
    const _renderTaskCardLegado = (task: Task) => (
      <div
        key={task.id}
        className={`group p-2 rounded border ${
          task.status === "completed"
            ? "bg-muted text-muted-foreground line-through border-muted"
            : "bg-primary/10 border-primary"
        }`}
        style={task.userId && userColors[task.userId] && task.status !== "completed" ? {
          borderLeft: `4px solid ${userColors[task.userId]}`,
          backgroundColor: toAlpha(userColors[task.userId], 0.12)
        } : {}}
      >
        <div className="flex items-center justify-between gap-2">
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setSelectedTaskId(task.id)}
          >
            <div className="font-medium text-sm truncate">{task.title}</div>
            {task.userName && (
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{task.userName}</span>
              </div>
            )}
            {task.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</div>}
          </div>
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleEditTask(task)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
              onClick={() => handleDeleteTask(task.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );

    return (
      <div className="min-w-0 overflow-hidden border border-border rounded">
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm sm:text-base">
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto overflow-x-hidden">
          {/* Seção: Tarefas Dia Todo */}
          {allDayTasks.length > 0 && (
            <div className="border-b-2 border-border bg-accent/5">
              <div className="flex">
                <div className="w-12 sm:w-16 p-1.5 text-xs font-semibold text-foreground border-r border-border flex-shrink-0">
                  Dia Todo
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {allDayTasks.map(renderTaskCard)}
                </div>
              </div>
            </div>
          )}

          {/* Seção: Tarefas Sem Horário */}
          {(
            <DroppableSlot date={currentDate} slotTime="" className="border-b-2 border-border bg-muted/10">
              <div className="flex">
                <div className="w-12 sm:w-16 p-1.5 text-xs font-semibold text-foreground border-r border-border flex-shrink-0">
                  Sem Hora
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {noTimeTasks.map(renderTaskCard)}
                </div>
              </div>
            </DroppableSlot>
          )}

          {/* Seção: Tarefas com Horário */}
          {hours.map(hour => {
            const hourTasks = timedTasks.filter(task => task.time?.startsWith(String(hour).padStart(2, '0')));
            return (
              <DroppableSlot key={hour} date={currentDate} slotTime={`${String(hour).padStart(2, '0')}:00`} className="flex min-h-12 border-b border-border hover:bg-muted/30">
                <div className="w-12 sm:w-16 p-1.5 text-xs text-muted-foreground border-r border-border flex-shrink-0">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {hourTasks.map(renderTaskCard)}
                </div>
              </DroppableSlot>
            );
          })}
        </div>
      </div>
    );
  };

  // Funções de edição inline
  const handleStartEdit = (taskId: string, field: string, value: any) => {
    setEditingCell({ taskId, field });
    setEditingValue(value || "");
  };

  const handleSaveInlineEdit = () => {
    if (!editingCell) return;

    const updatedTasks = tasks.map(task => {
      if (task.id === editingCell.taskId) {
        if (editingCell.field === 'title') return { ...task, title: editingValue };
        if (editingCell.field === 'description') return { ...task, description: editingValue };
        if (editingCell.field === 'assignedTo') return { ...task, assignedTo: editingValue };
        if (editingCell.field === 'time') return { ...task, time: editingValue };
      }
      return task;
    });

    setTasks(updatedTasks);
    setEditingCell(null);
    setEditingValue("");
    toast.success("Tarefa atualizada");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteTask = async (semPrevia = false) => {
    if (taskToDelete && validacaoAtiva && semPrevia !== true) {
      setDeleteConfirmOpen(false);
      abrirPrevia("excluir", {}, () => confirmDeleteTask(true));
      return;
    }
    if (taskToDelete) {
      const success = await deleteTaskFromDatabase(taskToDelete);
      if (success) {
        const updatedTasks = tasks.filter(t => t.id !== taskToDelete);
        setTasks(updatedTasks);
        toast.success("Tarefa excluída");
      }
      setTaskToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setSelectedTaskId(task.id);
    setEditingTask(task);
    setShowTaskDialog(true);
  };

  const getOrigemLabel = (origem: Task["origem"], campaignName?: string) => {
    const labels: Record<Task["origem"], string> = {
      bot: "BOT",
      campanha: campaignName || "Campanha",
      ligacao: "Ligação",
      visita: "Visita",
      email_enviado: "Email (Enviado)",
      email_recebido: "Email (Recebido)",
      pedido_orcamento: "Pedido - Orçamento",
      pedido_negociacao: "Pedido - Negociação",
      pedido_aprovacao: "Pedido - Aprovação",
      chat: "Chat",
    };
    return labels[origem] || origem;
  };

  // Filtrar e ordenar tarefas para a tabela
  const filteredTasks = tasks.filter(task => {
    if (filtroAtrasados && !tarefaAtrasada(task)) return false;
    if (!filtroAtrasados && filtroDiaTabela && !isSameDay(task.date, filtroDiaTabela)) return false;
    // Filtro de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        task.title.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.assignedTo?.toLowerCase().includes(query) ||
        task.userName?.toLowerCase().includes(query) ||
        format(task.date, "dd/MM/yyyy").includes(query)
      );
      if (!matchesSearch) return false;
    }
    
    // Filtro de origem - converter origens selecionadas para formato completo
    if (selectedOrigens.length > 0) {
      const origemCompleta: string[] = [];
      selectedOrigens.forEach(origem => {
        if (origem === 'email') {
          origemCompleta.push(`email_${filterEmailTipo}`);
        } else if (origem === 'pedido') {
          origemCompleta.push(`pedido_${filterPedidoTipo}`);
        } else {
          origemCompleta.push(origem);
        }
      });
      
      if (!origemCompleta.includes(task.origem)) {
        return false;
      }
    }
    
    return true;
  });

  const sortedTasks = sortConfig
    ? [...filteredTasks].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'title':
            aValue = a.title;
            bValue = b.title;
            break;
          case 'date':
            aValue = a.date.getTime();
            bValue = b.date.getTime();
            break;
          case 'time':
            aValue = a.time || '';
            bValue = b.time || '';
            break;
          case 'origem':
            aValue = getOrigemLabel(a.origem, a.campaignName);
            bValue = getOrigemLabel(b.origem, b.campaignName);
            break;
          case 'userName':
            aValue = a.userName || '';
            bValue = b.userName || '';
            break;
          case 'assignedTo':
            aValue = a.assignedTo || '';
            bValue = b.assignedTo || '';
            break;
          case 'status':
            aValue = a.status;
            bValue = b.status;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = String(bValue || '').toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      })
    : filteredTasks;

  // Renderizar visualização em tabela
  const renderTableView = () => {
    const visibleColumns = tableColumns.filter(col => col.visible);
    const totalColumnsWidth = visibleColumns.reduce((sum, col) => sum + col.width, 0) || 1;
    const colPercent = (width: number) => `${(width / totalColumnsWidth) * 100}%`;
    return (
      <div className="flex flex-col h-full min-w-0 max-w-full">

        <div className="border-b border-border bg-card px-2 py-3">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar tarefas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>
            </div>
            
            <div className="ml-auto shrink-0 text-xs text-muted-foreground">
              {!filtroAtrasados && filtroDiaTabela && <Badge variant="secondary" className="mr-2 cursor-pointer" onClick={() => setFiltroDiaTabela(null)} title="Mostrar todas">{format(filtroDiaTabela, "dd/MM/yyyy")} ✕</Badge>}
              {filtroAtrasados && <Badge variant="destructive" className="mr-2 cursor-pointer" onClick={() => setFiltroAtrasados(false)} title="Mostrar todas">Só atrasados ✕</Badge>}
              {sortedTasks.length} tarefa{sortedTasks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {sortedTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa cadastrada"}
            </div>
          ) : agendaCompacta ? (
            <div data-agenda-tabela-compacta className="space-y-3 py-3">
              <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2">
                <span className="shrink-0 text-xs font-medium text-muted-foreground">Ordenar por</span>
                <Select value={sortConfig?.key || "title"} onValueChange={handleSort}>
                  <SelectTrigger className="h-8 min-w-0 flex-1 border-border/60 bg-muted/30 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{visibleColumns.filter(col => col.id !== "actions" && col.id !== "status").map(col => <SelectItem key={col.id} value={col.id}>{col.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {sortedTasks.map(task => {
                const prevista = dataPrevistaAtraso(task);
                const atrasada = tarefaAtrasada(task);
                return <article key={task.id} className={cn("min-w-0 overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md", atrasada ? "border-destructive/30" : "border-border/60")}>
                <div className="p-2"><DraggableTask task={task} onClick={() => setSelectedTaskId(task.id)} onEdit={() => handleEditTask(task)} onDelete={() => handleDeleteTask(task.id)} /></div>
                {prevista && <div className="mx-3 mb-2 flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive"><Clock3 className="h-3.5 w-3.5 shrink-0" /><span>Deveria ter contatado em <strong>{format(prevista, "dd/MM/yyyy")}</strong></span></div>}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border/60 bg-muted/30 px-4 py-3 text-xs sm:grid-cols-4">
                  <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Data</dt><dd className="font-semibold">{format(task.date, "dd/MM/yyyy")}</dd></div>
                  <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Status</dt><dd><Badge variant={task.status === "completed" ? "secondary" : atrasada ? "destructive" : "outline"} className="px-1.5 py-0 text-[10px]">{task.status === "completed" ? "Concluída" : atrasada ? "Atrasada" : "Pendente"}</Badge></dd></div>
                  <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Origem</dt><dd className="truncate font-medium" title={getOrigemLabel(task.origem, task.campaignName)}>{getOrigemLabel(task.origem, task.campaignName)}</dd></div>
                  <div className="min-w-0"><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">Atribuído a</dt><dd className="truncate font-medium">{task.assignedTo || task.userName || "—"}</dd></div>
                </dl>
              </article>;
              })}
              </div>
            </div>
          ) : (
            <table className="w-full table-fixed">
              <thead className="border-b border-border sticky top-0 bg-background z-10">
                <tr>
                  {visibleColumns.map((column, index) => (
                    <th
                      key={column.id}
                      className={`text-left p-2 font-medium text-xs text-muted-foreground relative overflow-hidden ${
                        column.id === 'status' ? 'bg-background border-r border-border' : ''
                      }`}
                      style={{ width: colPercent(column.width) }}

                    >
                      <div className="flex min-w-0 items-center justify-between gap-1 pr-2">
                        <span className="truncate">{column.label.toUpperCase()}</span>

                        {column.id !== 'actions' && column.id !== 'status' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 hover:bg-transparent"
                            onClick={() => handleSort(column.id)}
                          >
                            {getSortIcon(column.id)}
                          </Button>
                        )}
                      </div>
                      <div
                        className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-primary bg-border/50 z-20"
                        style={{ touchAction: 'none' }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const startX = e.clientX;
                          const startWidth = column.width;

                          const handleMouseMove = (moveEvent: MouseEvent) => {
                            moveEvent.preventDefault();
                            const diff = moveEvent.clientX - startX;
                            const newWidth = Math.max(60, startWidth + diff);
                            setTableColumns(prev =>
                              prev.map(col =>
                                col.id === column.id ? { ...col, width: newWidth } : col
                              )
                            );
                          };

                          const handleMouseUp = () => {
                            document.removeEventListener('mousemove', handleMouseMove);
                            document.removeEventListener('mouseup', handleMouseUp);
                            document.body.style.cursor = '';
                            document.body.style.userSelect = '';
                          };

                          document.body.style.cursor = 'col-resize';
                          document.body.style.userSelect = 'none';
                          document.addEventListener('mousemove', handleMouseMove);
                          document.addEventListener('mouseup', handleMouseUp);
                        }}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map((task) => (
                  <tr 
                    key={task.id} 
                    className="border-b border-border hover:bg-muted/50 transition-colors"
                    style={task.userId && userColors[task.userId] && task.status !== "completed" ? {
                      borderLeft: `4px solid ${userColors[task.userId]}`,
                      backgroundColor: toAlpha(userColors[task.userId], 0.08)
                    } : {}}
                  >
                    {visibleColumns.map((column) => {
                      if (column.id === 'status') {
                        return (
                          <td key="status" className="p-2 bg-background border-r border-border" style={{ width: colPercent(column.width) }}>
                            <input
                              type="checkbox"
                              checked={task.status === "completed"}
                              onChange={() => handleToggleTaskStatus(task.id)}
                              className="cursor-pointer w-4 h-4"
                            />
                          </td>
                        );
                      }

                      if (column.id === 'actions') {
                        return (
                          <td key="actions" className="p-2" style={{ width: colPercent(column.width) }}>
                            <div className="flex items-center gap-0.5">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                                onClick={() => handleDeleteTask(task.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td 
                          key={column.id} 
                          onClick={column.id === 'title' ? () => setSelectedTaskId(task.id) : undefined}
                          className="p-2 group relative overflow-hidden text-sm"
                          style={{ width: colPercent(column.width) }}
                        >

                          {editingCell?.taskId === task.id && editingCell?.field === column.id ? (
                            <div className="flex items-center gap-2">
                              <Input
                                value={editingValue}
                                onChange={(e) => setEditingValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveInlineEdit();
                                  if (e.key === "Escape") handleCancelEdit();
                                }}
                                className="h-8"
                                autoFocus
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 flex-shrink-0"
                                onClick={handleSaveInlineEdit}
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between min-w-0">
                              <span className={`truncate ${
                                column.id === 'title' ? 'font-medium text-primary' : ''
                              } ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                                {column.id === 'title' && task.title}
                                {column.id === 'date' && format(task.date, "dd/MM/yyyy", { locale: ptBR })}
                                {column.id === 'time' && (task.time || "-")}
                                {column.id === 'origem' && getOrigemLabel(task.origem, task.campaignName)}
                                {column.id === 'userName' && (task.userName || "-")}
                                {column.id === 'assignedTo' && (task.assignedTo || "-")}
                                {column.id === 'description' && (task.description || "-")}
                              </span>
                              {column.id !== 'date' && column.id !== 'origem' && column.id !== 'userName' && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    let value = "";
                                    if (column.id === 'title') value = task.title;
                                    else if (column.id === 'time') value = task.time || "";
                                    else if (column.id === 'assignedTo') value = task.assignedTo || "";
                                    else if (column.id === 'description') value = task.description || "";
                                    handleStartEdit(task.id, column.id, value);
                                  }}
                                  title="Edição rápida"
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  // Renderizar visualização de lista
  const renderListView = () => {
    // A lista ancora na data selecionada (barra de dias), não necessariamente em hoje
    const today = currentDate;
    const tomorrow = addDays(today, 1);
    const nextWeekStart = addDays(today, 1);
    const nextWeekEnd = addWeeks(today, 1);

    const filterByOrigem = (task: Task) => {
      if (selectedOrigens.length > 0) {
        const origemCompleta: string[] = [];
        selectedOrigens.forEach(origem => {
          if (origem === 'email') {
            origemCompleta.push(`email_${filterEmailTipo}`);
          } else if (origem === 'pedido') {
            origemCompleta.push(`pedido_${filterPedidoTipo}`);
          } else {
            origemCompleta.push(origem);
          }
        });
        
        if (!origemCompleta.includes(task.origem)) {
          return false;
        }
      }
      return true;
    };

    const todayTasks = tasks.filter(task => isSameDay(task.date, today) && task.status === "pending" && filterByOrigem(task));
    const tomorrowTasks = tasks.filter(task => isSameDay(task.date, tomorrow) && task.status === "pending" && filterByOrigem(task));
    const nextWeekTasks = tasks.filter(task => {
      const diff = differenceInDays(task.date, format(today, 'yyyy-MM-dd'));
      return diff > 1 && diff <= 7 && task.status === "pending" && filterByOrigem(task);
    });
    const futureTasks = tasks.filter(task => {
      const diff = differenceInDays(task.date, format(today, 'yyyy-MM-dd'));
      return diff > 7 && task.status === "pending" && filterByOrigem(task);
    });

    return (
      <div className="grid w-full max-w-full grid-cols-1 gap-3 overflow-x-hidden sm:grid-cols-2 sm:gap-4 [&>div]:min-w-0">
        <div>
          <div className="mb-3 sm:mb-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="font-semibold text-xs sm:text-sm uppercase">{isSameDay(currentDate, new Date()) ? "HOJE" : format(currentDate, "EEE d 'de' MMM", { locale: ptBR })}</h3>
            <p className="text-xs text-muted-foreground">{todayTasks.length} tarefa{todayTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {todayTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onOpen={() => setSelectedTaskId(task.id)}
                onToggle={() => handleToggleTaskStatus(task.id)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                userColor={task.userId ? userColors[task.userId] : undefined}
              />
            )}
            {todayTasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 sm:mb-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="font-semibold text-xs sm:text-sm uppercase">{isSameDay(tomorrow, new Date()) ? "AMANHÃ" : format(tomorrow, "EEE d 'de' MMM", { locale: ptBR })}</h3>
            <p className="text-xs text-muted-foreground">{tomorrowTasks.length} tarefa{tomorrowTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {tomorrowTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onOpen={() => setSelectedTaskId(task.id)}
                onToggle={() => handleToggleTaskStatus(task.id)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                userColor={task.userId ? userColors[task.userId] : undefined}
              />
            )}
            {tomorrowTasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 sm:mb-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="font-semibold text-xs sm:text-sm uppercase">PRÓXIMA SEMANA</h3>
            <p className="text-xs text-muted-foreground">{nextWeekTasks.length} tarefa{nextWeekTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {nextWeekTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onOpen={() => setSelectedTaskId(task.id)}
                onToggle={() => handleToggleTaskStatus(task.id)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                userColor={task.userId ? userColors[task.userId] : undefined}
              />
            )}
            {nextWeekTasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
            )}
          </div>
        </div>

        <div>
          <div className="mb-3 sm:mb-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="font-semibold text-xs sm:text-sm uppercase">FUTURO</h3>
            <p className="text-xs text-muted-foreground">{futureTasks.length} tarefa{futureTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {futureTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
                onOpen={() => setSelectedTaskId(task.id)}
                onToggle={() => handleToggleTaskStatus(task.id)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
                userColor={task.userId ? userColors[task.userId] : undefined}
              />
            )}
            {futureTasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma tarefa</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getTotalTasks = () => tasks.filter(t => t.status === "pending").length;

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  const hoje = startOfDay(new Date());
  const tarefasPendentes = tasks.filter(task => task.status === "pending");
  const horaAgora = format(new Date(), "HH:mm");
  void horaAgora;
  const tarefasAtrasadas = tarefasPendentes.filter(task => tarefaAtrasada(task)).length;
  const resumoDias = Array.from({ length: 5 }, (_, index) => {
    const date = addDays(hoje, index);
    return {
      date,
      count: tarefasPendentes.filter(task =>
        isSameDay(task.date, date) &&
        !(index === 0 && !!task.time && task.time < horaAgora)
      ).length,
      label: index === 0 ? "Hoje" : format(date, "EEEE", { locale: ptBR }).split("-")[0],
    };
  });

  const barraSuperiorRef = useRef<HTMLDivElement | null>(null);
  const [barraAltura, setBarraAltura] = useState(0);
  const [menuLargura, setMenuLargura] = useState(0);
  // Recolher/expandir a faixa de dias da barra superior
  const [diasRecolhidos, setDiasRecolhidos] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("calendario_dias_recolhidos") === "true";
  });
  const alternarDias = () => {
    setDiasRecolhidos((v) => {
      const novo = !v;
      localStorage.setItem("calendario_dias_recolhidos", String(novo));
      return novo;
    });
  };

  useEffect(() => {
    const el = barraSuperiorRef.current;
    if (!el) return;
    const atualizar = () => setBarraAltura(el.offsetHeight);
    atualizar();
    const observer = new ResizeObserver(atualizar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Expõe a altura da barra fixa para telas que embutem o calendário (ex.: Atendimento)
  // Não zera ao remontar (troca de canal) para evitar "pulo"/pisca do layout.
  useEffect(() => {
    if (barraAltura > 0) document.documentElement.style.setProperty("--calendario-barra", `${barraAltura}px`);
  }, [barraAltura]);
  useEffect(() => {
    // Conta instâncias montadas: o calendário central do Atendimento desmonta ao trocar de canal,
    // mas a barra superior continua — só remove a variável quando não sobrar nenhuma instância.
    (window as any).__calendarioInstancias = ((window as any).__calendarioInstancias || 0) + 1;
    return () => {
      (window as any).__calendarioInstancias = Math.max(0, ((window as any).__calendarioInstancias || 1) - 1);
      window.setTimeout(() => {
        if (!(window as any).__calendarioInstancias) {
          document.documentElement.style.removeProperty("--calendario-barra");
        }
      }, 300);
    };
  }, []);

  // Largura do menu lateral quando travado (fixed) para a barra cobri-lo por cima
  useEffect(() => {
    const medirMenu = () => {
      const el = document.querySelector<HTMLElement>("[data-main-sidebar]");
      setMenuLargura(el && el.classList.contains("fixed") ? el.offsetWidth : 0);
    };
    medirMenu();
    window.addEventListener("resize", medirMenu);
    const intervalo = window.setInterval(medirMenu, 1000);
    return () => {
      window.removeEventListener("resize", medirMenu);
      window.clearInterval(intervalo);
    };
  }, []);

  return (
    <SelecaoMovimento.Provider value={{ ids: tarefasParaMover, alternar: alternarSelecaoMovimento, escolherData: setDataMovimento }}>
    <DndContext
      sensors={sensors}
      collisionDetection={detectarDestinoCalendario}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="calendario-raiz flex flex-col h-full bg-background font-cardBody" style={{ paddingTop: barraAltura || undefined }}>
      <div
        ref={barraSuperiorRef}
        data-barra-agenda-fixa
        className="fixed top-0 left-0 right-0 z-[600] border-b border-border/60 bg-background/95 backdrop-blur-sm"
      >
        <div
          className="border-b border-border/50 py-3 pl-3 pr-3 sm:pl-5 sm:pr-5 lg:pr-6"
          style={{ paddingLeft: menuLargura ? menuLargura + 20 : undefined }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <h1 className="font-cardTitle text-xl font-bold text-foreground sm:text-2xl">Minha agenda</h1>
              <div className="hidden h-7 w-px bg-border sm:block" />
              <p className="hidden text-sm font-medium text-foreground sm:block">
                {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
              <div className="relative min-w-0 flex-1 sm:w-72 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Buscar contatos ou tarefas..."
                  className="h-9 border-border/60 bg-muted/30 pl-9 text-xs sm:h-10 sm:text-sm"
                />
              </div>
              {/* Slot: ações da tela de Atendimento (Usar agenda, assumir contatos, adicionar, filtrar) */}
              <div id="barra-acoes-atendimento" className="flex items-center gap-2" />
              {isAdmin && (
                <Button
                  size="sm"
                  variant={modoValidacao ? "default" : "outline"}
                  className="h-9 shrink-0 text-xs"
                  title="Mostra todas as regras que serão executadas antes de cada ação na agenda"
                  onClick={() => { const v = !modoValidacao; setModoValidacao(v); localStorage.setItem("agenda_modo_validacao", v ? "1" : "0"); toast.info(v ? "Modo validação ligado: as regras aparecerão antes de cada ação" : "Modo validação desligado"); }}
                >
                  {modoValidacao ? "Validação: ligada" : "Validação"}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={alternarDias}
                title={diasRecolhidos ? "Mostrar dias" : "Ocultar dias"}
                aria-label={diasRecolhidos ? "Mostrar dias" : "Ocultar dias"}
                className="h-9 w-9"
              >
                {diasRecolhidos ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {!diasRecolhidos && (
        <div className="px-2 pb-2 sm:px-3" style={{ paddingLeft: menuLargura ? menuLargura + 12 : undefined }}>
          <div className="flex min-w-0 flex-wrap overflow-hidden rounded-lg border border-border/60 bg-card sm:flex-nowrap">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Abrir agenda de hoje"
              title="Abrir agenda de hoje"
              onClick={() => {
                setCurrentDate(hoje);
                setViewMode("day");
                window.dispatchEvent(new CustomEvent("calendario:abrir-data", { detail: { data: hoje.toISOString(), modo: "day" } }));
              }}
              className="h-auto w-9 shrink-0 rounded-none border-r border-border/60 text-muted-foreground sm:w-16"
            >
              <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            <div className="min-w-0 flex-1 basis-[calc(100%-2.5rem)] overflow-x-hidden sm:basis-auto">
              <div className="grid min-w-0 grid-cols-3 sm:grid-cols-[minmax(72px,120px)_repeat(5,minmax(0,1fr))]">
                <Button
                  variant="ghost"
                  onClick={() => { setFiltroDiaTabela(null); setFiltroAtrasados(true); setViewMode("table"); window.dispatchEvent(new CustomEvent("calendario:abrir-data", { detail: { data: new Date().toISOString(), modo: "table", atrasados: true } })); }}
                  className="flex h-auto min-w-0 min-h-[42px] items-center justify-start rounded-none border-r border-border/60 px-1.5 text-left hover:bg-muted/50 sm:min-h-[82px] sm:px-4"
                >
                  <span>
                    <span className="block text-[10px] font-medium text-foreground sm:text-xs">Atrasados</span>
                    <span className="mt-0.5 block font-cardTitle text-base font-bold text-destructive sm:mt-1 sm:text-2xl">{tarefasAtrasadas}</span>
                  </span>
                </Button>
                {resumoDias.map((resumo, index) => {
                  const selecionado = isSameDay(currentDate, resumo.date);
                  const ultimo = index === resumoDias.length - 1;
                  return (
                    <Button
                      variant="ghost"
                      key={resumo.date.toISOString()}
                      aria-pressed={selecionado}
                      onClick={() => {
                        setCurrentDate(resumo.date);
                        setFiltroAtrasados(false);
                        setFiltroDiaTabela(resumo.date);
                        setViewMode("table");
                        window.dispatchEvent(new CustomEvent("calendario:abrir-data", { detail: { data: resumo.date.toISOString(), modo: "table" } }));
                      }}
                      className={cn(
                        "flex h-auto min-w-0 min-h-[42px] items-center justify-between gap-1 rounded-none border-r border-border/60 px-1.5 text-left last:border-r-0 hover:bg-muted/50 sm:min-h-[82px] sm:gap-2 sm:px-4",
                        index === 0 && "bg-primary/5 hover:bg-primary/10",
                        selecionado && index !== 0 && "bg-accent"
                      )}
                    >
                      <span className="min-w-0">
                        <span className={cn("flex min-w-0 items-baseline gap-1 text-[10px] font-semibold capitalize sm:text-xs", index === 0 ? "text-primary" : "text-foreground")}>
                          <span className="min-w-0 truncate">
                            <span className="lg:hidden">{index === 0 ? "Hoje" : format(resumo.date, "EEE", { locale: ptBR }).slice(0, 3)}</span>
                            <span className="hidden lg:inline">{index === 0 ? "Hoje" : resumo.label}</span>
                          </span>
                          <span className="shrink-0 text-muted-foreground">· {format(resumo.date, "d")}</span>
                        </span>
                        <span className="mt-0.5 block font-cardTitle text-base font-bold text-foreground sm:mt-1 sm:text-2xl">{resumo.count}</span>
                      </span>
                      {!ultimo && <Calendar className={cn("hidden h-5 w-5 shrink-0 lg:block", index === 0 ? "text-primary" : "text-muted-foreground")} />}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        )}


        {/* Dialog de filtros (compartilhado) */}
        <Dialog open={showFilterDialog} onOpenChange={setShowFilterDialog}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Filtros</DialogTitle>
              <DialogDescription>
                Filtre as tarefas por origem e usuários
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Filtros básicos */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Exibir tarefas</h3>
                <RadioGroup
                  value={filterBy}
                  onValueChange={(v) => setFilterBy(v as "all" | "my")}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="my" id="my" />
                    <Label htmlFor="my" className="cursor-pointer">Minhas tarefas</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="cursor-pointer">Todas as tarefas</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Filtro por Origem */}
              {filterBy === "all" && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
                    <span>Por Origem</span>
                    {selectedOrigens.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => setSelectedOrigens([])}
                      >
                        Limpar
                      </Button>
                    )}
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-bot"
                        checked={selectedOrigens.includes("bot")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "bot"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "bot"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-bot" className="text-sm cursor-pointer flex items-center gap-2">
                        <Bot className="w-4 h-4" style={{ color: getOrigemColor("bot") }} />
                        Bot
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-campanha"
                        checked={selectedOrigens.includes("campanha")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "campanha"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "campanha"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-campanha" className="text-sm cursor-pointer flex items-center gap-2">
                        <Megaphone className="w-4 h-4" style={{ color: getOrigemColor("campanha") }} />
                        Campanha
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-ligacao"
                        checked={selectedOrigens.includes("ligacao")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "ligacao"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "ligacao"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-ligacao" className="text-sm cursor-pointer flex items-center gap-2">
                        <Phone className="w-4 h-4" style={{ color: getOrigemColor("ligacao") }} />
                        Ligação
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-visita"
                        checked={selectedOrigens.includes("visita")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "visita"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "visita"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-visita" className="text-sm cursor-pointer flex items-center gap-2">
                        <MapPin className="w-4 h-4" style={{ color: getOrigemColor("visita") }} />
                        Visita
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-email_enviado"
                        checked={selectedOrigens.includes("email_enviado")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "email_enviado"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "email_enviado"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-email_enviado" className="text-sm cursor-pointer flex items-center gap-2">
                        <Mail className="w-4 h-4" style={{ color: getOrigemColor("email_enviado") }} />
                        Email Enviado
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-email_recebido"
                        checked={selectedOrigens.includes("email_recebido")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "email_recebido"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "email_recebido"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-email_recebido" className="text-sm cursor-pointer flex items-center gap-2">
                        <MailOpen className="w-4 h-4" style={{ color: getOrigemColor("email_recebido") }} />
                        Email Recebido
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-chat"
                        checked={selectedOrigens.includes("chat")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "chat"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "chat"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-chat" className="text-sm cursor-pointer flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" style={{ color: getOrigemColor("chat") }} />
                        Chat
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-pedido_orcamento"
                        checked={selectedOrigens.includes("pedido_orcamento")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "pedido_orcamento"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "pedido_orcamento"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-pedido_orcamento" className="text-sm cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: getOrigemColor("pedido_orcamento") }} />
                        Pedido - Orçamento
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-pedido_negociacao"
                        checked={selectedOrigens.includes("pedido_negociacao")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "pedido_negociacao"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "pedido_negociacao"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-pedido_negociacao" className="text-sm cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: getOrigemColor("pedido_negociacao") }} />
                        Pedido - Negociação
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="origem-pedido_aprovacao"
                        checked={selectedOrigens.includes("pedido_aprovacao")}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrigens([...selectedOrigens, "pedido_aprovacao"]);
                          } else {
                            setSelectedOrigens(selectedOrigens.filter(o => o !== "pedido_aprovacao"));
                          }
                        }}
                        className="rounded border-border"
                      />
                      <label htmlFor="origem-pedido_aprovacao" className="text-sm cursor-pointer flex items-center gap-2">
                        <FileText className="w-4 h-4" style={{ color: getOrigemColor("pedido_aprovacao") }} />
                        Pedido - Aprovação
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Filtro por Usuários (apenas para admins) */}
              {isAdmin && (
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Por Usuários
                  </h3>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {usuarios.filter(u => u.auth_user_id).map((usuario) => (
                      <div key={usuario.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`user-${usuario.id}`}
                          checked={selectedUserIds.includes(usuario.auth_user_id!)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds([...selectedUserIds, usuario.auth_user_id!]);
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== usuario.auth_user_id));
                            }
                          }}
                          className="w-4 h-4 rounded border-input"
                        />
                        <label 
                          htmlFor={`user-${usuario.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {usuario.nome}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedOrigens([]);
                  setSelectedUserIds([]);
                }}
              >
                Limpar Tudo
              </Button>
              <Button onClick={() => setShowFilterDialog(false)}>
                Aplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Legenda de usuários - sempre visível quando há múltiplos usuários */}
      {(() => {
        // Calcular usuários únicos com tarefas visíveis
        const uniqueUserIds = new Set(tasks.map(t => t.userId).filter(Boolean));
        const shouldShowLegend = uniqueUserIds.size > 1;
        
        if (!shouldShowLegend) return null;
        
        return (
          <div className={cn("border-b border-border bg-muted/30 px-3 sm:px-6 py-2 sm:py-3", aguardandoTarefaInicial && "invisible")}>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground uppercase hidden sm:inline">Legenda:</span>
              {Array.from(uniqueUserIds).map(userId => {
                const usuario = usuarios.find(u => u.auth_user_id === userId);
                const isCurrentUser = userId === currentAdminId;
                const color = userColors[userId];
                
                if (!color) return null;
                
                return (
                  <div key={userId} className="flex items-center gap-1.5">
                    <div 
                      className="w-3 h-3 sm:w-4 sm:h-4 rounded border border-border"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-xs font-medium">
                      {isCurrentUser ? 'Você' : (usuario?.nome || 'Usuário')}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Content */}
      <div className="relative flex min-h-0 flex-1">
      <div ref={agendaAreaRef} className={cn("min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-2 sm:px-3 py-3", aguardandoTarefaInicial && "invisible", (selectedTaskId || showTaskDialog) && "hidden")}>
        {/* Navegação e filtros do calendário (dentro da área central) */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handlePrevious} aria-label="Dia anterior" title="Dia anterior" className="h-8 w-8 rounded-md border border-border/60 bg-card">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 rounded-md border border-border/60 bg-card px-3 text-xs">Hoje</Button>
            <Button variant="ghost" size="icon" onClick={handleNext} aria-label="Próximo dia" title="Próximo dia" className="h-8 w-8 rounded-md border border-border/60 bg-card">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="ml-1 min-w-0 text-xs font-semibold capitalize text-foreground">
              {format(currentDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>

          <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
            {isAdmin && usuarios.length > 0 && (
              <Select
                value={selectedUserIds.length === 1 ? selectedUserIds[0] : selectedUserIds.length > 1 ? "multiple" : "all"}
                onValueChange={(value) => {
                  if (value === "all") setSelectedUserIds([]);
                  else if (value !== "multiple") setSelectedUserIds([value]);
                }}
              >
                <SelectTrigger className="h-8 w-[150px] text-xs sm:w-[180px]">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" />
                    <SelectValue placeholder="Todos os usuários">
                      {selectedUserIds.length === 0
                        ? "Todos os usuários"
                        : selectedUserIds.length === 1
                          ? usuarios.find(usuario => usuario.auth_user_id === selectedUserIds[0])?.nome || "Usuário"
                          : `${selectedUserIds.length} usuários`}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  {usuarios.filter(usuario => usuario.auth_user_id).map(usuario => usuario.auth_user_id ? (
                    <SelectItem key={usuario.id} value={usuario.auth_user_id}>
                      <div className="flex items-center gap-2"><User className="h-4 w-4" />{usuario.nome}</div>
                    </SelectItem>
                  ) : null)}
                </SelectContent>
              </Select>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowFilterDialog(true)} className="h-8 gap-2 rounded-md border border-border/60 bg-card px-3 text-xs">
              <Filter className="h-3.5 w-3.5" />
              Filtros
              {(selectedOrigens.length > 0 || selectedUserIds.length > 0) && (
                <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px]">{selectedOrigens.length + selectedUserIds.length}</Badge>
              )}
            </Button>
            <Button
              onClick={() => handleOpenNewTask()}
              size="sm"
              className="h-8 gap-1.5 rounded-md px-3 text-xs font-semibold"
              aria-label="Nova tarefa"
            >
              <Plus className="h-3.5 w-3.5" />
              Tarefa
            </Button>
            <div className="flex w-full items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-9 shrink-0"
                aria-label="Período anterior"
                disabled={viewMode !== "day" && viewMode !== "week" && viewMode !== "month"}
                onClick={() => setCurrentDate((d) => (viewMode === "day" ? addDays(d, -1) : viewMode === "week" ? addWeeks(d, -1) : addMonths(d, -1)))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-full">
                <TabsList className="grid h-10 w-full grid-cols-4 bg-muted/60">
                  <TabsTrigger value="day" className="h-8 px-1 text-xs">Dia</TabsTrigger>
                  <TabsTrigger value="week" className="h-8 px-1 text-xs">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="h-8 px-1 text-xs">Mês</TabsTrigger>
                  <TabsTrigger value="table" className="h-8 px-1 text-xs">Tabela</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-9 shrink-0"
                aria-label="Próximo período"
                disabled={viewMode !== "day" && viewMode !== "week" && viewMode !== "month"}
                onClick={() => setCurrentDate((d) => (viewMode === "day" ? addDays(d, 1) : viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-10 w-9 shrink-0"
                aria-label="Desfazer última movimentação"
                title={ultimoMovimento?.length ? "Desfazer última movimentação" : "Nenhuma movimentação para desfazer"}
                disabled={!ultimoMovimento?.length || desfazendo}
                onClick={() => void desfazerUltimoMovimento()}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {tarefasParaMover.size > 0 && <div className="sticky top-0 z-20 mb-3 flex min-w-0 flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card px-3 py-2 shadow-md" role="toolbar" aria-label="Movimentar tarefas selecionadas">
          <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">{tarefasParaMover.size}</span>
          <div className="mr-auto min-w-0 leading-tight">
            <p className="text-sm font-medium">tarefa(s) selecionada(s)</p>
            <p className="truncate text-xs text-muted-foreground">Navegue pelo calendário e escolha o dia de destino</p>
          </div>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => { setMovimentoAberto(true); setAvisoMovimento([]); void carregarDatasDiaTodo(); }}><CalendarRange className="mr-2 h-4 w-4" />{dataMovimento ? format(dataMovimento, "dd/MM/yyyy") : "Escolher data"}</Button>
          <Button size="sm" className="rounded-full" disabled={!dataMovimento || movendoSelecao || tarefasParaMover.size === 0 || selecaoNaMesmaData(dataMovimento, tasks.filter(t => tarefasParaMover.has(t.id)))} title={selecaoNaMesmaData(dataMovimento, tasks.filter(t => tarefasParaMover.has(t.id))) ? "As tarefas já estão nesta data" : undefined} onClick={() => { void moverSelecao(); }}><CalendarDays className="mr-2 h-4 w-4" />Mover</Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full" aria-label="Cancelar seleção" title="Cancelar seleção" disabled={movendoSelecao} onClick={() => { setTarefasParaMover(new Set()); setDataMovimento(undefined); }}><X className="h-4 w-4" /></Button>
        </div>}
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
        {viewMode === "list" && renderListView()}
        {viewMode === "table" && renderTableView()}
      </div>

      {(() => {
        const selectedTask = tasks.find(task => task.id === selectedTaskId);
        const creating = showTaskDialog && !selectedTask && !editingTask;
        if (!selectedTask && !creating) return null;
        // Instância oculta (outras abas): leva o painel para o espaço central do atendimento,
        // posicionado abaixo da barra de menus do cliente como os demais painéis centrais.
        const quadro = typeof document !== "undefined" ? document.querySelector<HTMLElement>("[data-quadro-central]") : null;
        const hospedeOculto = !!quadro && !!agendaAreaRef.current && agendaAreaRef.current.getBoundingClientRect().width < 50;
        const topoPainelCentral = hospedeOculto && quadro ? (quadro.querySelector<HTMLElement>("[data-cabecalho-cliente]")?.offsetHeight ?? 0) : 0;
        const task = selectedTask || {
          id: "nova-tarefa", title: "Nova tarefa", date: selectedDate || new Date(),
          status: "pending" as const, contactId: (contatoReprogramar || contatoSugerido)?.id, contactName: (contatoReprogramar || contatoSugerido)?.nome,
          origem: "manual" as Task["origem"], createdAt: new Date(),
        };
        const painelTarefa = (
          <div
            data-painel-centro
            className="absolute inset-x-0 top-0 bottom-[var(--barra-proximo,0px)] z-[650] flex flex-col bg-card"
            style={hospedeOculto && topoPainelCentral ? { top: topoPainelCentral } : undefined}
            role="dialog"
            aria-label={creating ? "Nova tarefa" : "Detalhes da tarefa"}
          >
            <TaskDetailsSidebar key={task.id} task={task} creating={creating} readOnly={!creating && !editingTask} origem={getOrigemLabel(task.origem)} usuarios={usuarios}
              onClose={() => { setSelectedTaskId(null); setShowTaskDialog(false); setEditingTask(null); }}
              onEdit={() => { if (selectedTask) handleEditTask(selectedTask); }}
              onDelete={() => { if (selectedTask) handleDeleteTask(selectedTask.id); }}
              editor={<NewTaskDialog
                open={true}
                onOpenChange={(open) => { if (!open) { setShowTaskDialog(false); setSelectedTaskId(null); setEditingTask(null); } }}
                onSave={handleSaveTask}
                initialDate={creating ? selectedDate || undefined : undefined}
                suggestedContact={creating ? (contatoReprogramar || contatoSugerido) : undefined}
                pularDuplicata={creating && !!contatoReprogramar}
                datasDiaTodo={[...datasDiaTodo]}
                editingTask={selectedTask || undefined}
                somenteLeitura={!creating && !editingTask}
              />}
              onUpdate={async (updates) => {
                if (!selectedTask) return false;
                // Ao marcar como concluída, passar pelo fluxo de encerramento (reprogramar ou inativar)
                if (updates.status === "completed" && selectedTask.status === "pending") {
                  void handleToggleTaskStatus(selectedTask.id);
                  return true;
                }
                const success = await updateTaskInDatabase(selectedTask.id, updates, updates.status ? 'toggle-status' : 'explicit');
                if (success) setTasks(current => current.map(task => task.id === selectedTask.id ? { ...task, ...updates } : task));
                return success;
              }} />
          </div>
        );
        return hospedeOculto && quadro ? createPortal(painelTarefa, quadro) : painelTarefa;
      })()}
      </div>

      <Dialog open={movimentoAberto} onOpenChange={aberto => { if (!movendoSelecao) setMovimentoAberto(aberto); }}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          <DialogHeader className="space-y-1 border-b bg-primary/5 px-5 py-4 text-left">
            <DialogTitle className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><CalendarRange className="h-4 w-4" /></span>Mover {tarefasParaMover.size} tarefa(s)</DialogTitle>
            <DialogDescription>{avisoMovimento.length ? "Escolha uma sugestão ou mantenha a data selecionada." : "Escolha o novo dia. Os horários das tarefas são mantidos."}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
            {avisoMovimento.length > 0 && (
              <div className="space-y-3">
                {dataMovimento && <AnaliseDestinoResumo origem={dataMovimento} analise={analiseDestino} avisos={avisoMovimento} userIds={tasks.filter(t => tarefasParaMover.has(t.id)).map(t => t.userId)} disabled={movendoSelecao || analisandoDestino} onOutraData={() => setMostrarCalendarioMovimento(v => !v)} onSugestao={data => { setDataMovimento(data); setAvisoMovimento([]); setOutrasDiaTodoMov([]); setMostrarCalendarioMovimento(false); }} />}
                <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl py-3 text-left" disabled={!dataMovimento || movendoSelecao || tarefasParaMover.size === 0 || selecaoNaMesmaData(dataMovimento, tasks.filter(t => tarefasParaMover.has(t.id)))} onClick={() => void moverSelecao(true)}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><CalendarDays className="h-4 w-4" /></span>
                  <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Data escolhida</span><span className="block text-sm font-semibold text-foreground">Mover para esta data</span><span className="block text-xs text-muted-foreground"><span className="capitalize">{dataMovimento && format(dataMovimento, "EEEE, dd/MM", { locale: ptBR })}</span> · as outras tarefas ficam aqui</span></span>
                </Button>

                {outrasDiaTodoMov.length > 0 && (
                  <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl border-warning/40 py-3 text-left hover:border-warning" disabled={movendoSelecao} onClick={async () => {
                    if (!dataMovimento) return;
                    setMovendoSelecao(true);
                    let movidas = 0; let destino = dataMovimento;
                    try {
                      for (const o of outrasDiaTodoMov) {
                        let proxima = getNextBusinessDay(dataMovimento);
                        for (let i = 0; i < 366 && o.user_id && (await checkAllDayTasks(proxima, o.user_id)).hasTask; i++) proxima = getNextBusinessDay(proxima);
                        if (await updateTaskInDatabase(o.id, { date: proxima }, 'drag')) { movidas++; destino = proxima; }
                      }
                    } finally { setMovendoSelecao(false); }
                    if (movidas) toast.success(`${movidas} outra(s) tarefa(s) movida(s) para ${format(destino, "dd/MM/yyyy")}`);
                    setOutrasDiaTodoMov([]);
                    await moverSelecao(true, true, true);
                  }}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15"><CalendarRange className="h-4 w-4 text-warning" /></span>
                    <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-warning">Outras tarefas</span><span className="block text-sm font-semibold text-foreground">Mover as outras para o próximo dia</span><span className="block text-xs text-muted-foreground">Depois mover esta para a data escolhida</span></span>

                  </Button>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5">
              {tasks.filter(t => tarefasParaMover.has(t.id)).slice(0, 6).map(t => (
                <span key={t.id} className="max-w-full truncate rounded-full border bg-muted px-2.5 py-0.5 text-xs text-foreground" title={t.title}>{t.isAllDay ? "Dia todo · " : t.time ? `${t.time} · ` : ""}{t.contactName || t.title}</span>
              ))}
              {tarefasParaMover.size > 6 && <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">+{tarefasParaMover.size - 6}</span>}
            </div>
            {(avisoMovimento.length === 0 || mostrarCalendarioMovimento) && <div className="flex justify-center rounded-lg border bg-card"><CalendarPicker mode="single" defaultMonth={dataMovimento || currentDate} selected={dataMovimento} onSelect={date => { setDataMovimento(date); setAvisoMovimento([]); setOutrasDiaTodoMov([]); setMostrarCalendarioMovimento(false); }} disabled={calendarioRegras.bloquear_datas_passadas ? { before: startOfDay(new Date()) } : undefined} locale={ptBR} modifiers={{ diaTodo: day => datasDiaTodo.has(format(day, "yyyy-MM-dd")) }} modifiersClassNames={{ diaTodo: "bg-primary/20 text-primary font-bold" }} /></div>}
            <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-primary/20" />Dia com tarefa de dia todo</span>
              <span className="min-w-0 truncate font-medium capitalize text-foreground">{dataMovimento ? format(dataMovimento, "EEE, dd 'de' MMM", { locale: ptBR }) : "Nenhum dia escolhido"}</span>
            </div>
            {dataMovimento && avisoMovimento.length === 0 && <TarefasDoDiaResumo date={dataMovimento} userIds={tasks.filter(t => tarefasParaMover.has(t.id)).map(t => t.userId)} />}
          </div>
          <DialogFooter className="flex-wrap gap-2 border-t bg-muted/40 px-5 py-3"><Button variant="outline" disabled={movendoSelecao} onClick={() => setMovimentoAberto(false)}>Cancelar</Button>{avisoMovimento.length === 0 && <Button disabled={!dataMovimento || movendoSelecao || tarefasParaMover.size === 0 || selecaoNaMesmaData(dataMovimento, tasks.filter(t => tarefasParaMover.has(t.id)))} onClick={() => void moverSelecao()}><CalendarDays className="mr-2 h-4 w-4" />{movendoSelecao ? "Movendo…" : "Mover para este dia"}</Button>}</DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de conflito */}
      <Dialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarefas Existentes Nesta Data</DialogTitle>
            <DialogDescription>
              Já existem {conflictingTasks.length} tarefa(s) agendada(s) para este horário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {conflictingTasks.map(task => (
              <div key={task.id} className="p-2 border rounded">
                <div className="font-medium">{task.title}</div>
                <div className="text-sm text-muted-foreground">{task.time}</div>
              </div>
            ))}
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={() => setIsConflictDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleReplaceConflicting}>
              Substituir Existentes
            </Button>
            <Button onClick={handleKeepAll}>
              Manter Todos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviaRegrasDialog
        aberto={!!previa}
        titulo={previa?.titulo || ""}
        passos={previa?.passos || []}
        onCancelar={() => { setPrevia(null); setTaskToDelete(null); }}
onConfirmar={() => { const f = previa?.executar; setPrevia(null); f?.(); }}
        />

      {/* Encerramento de tarefa: exige reprogramar nova tarefa ou inativar o cliente */}
      <Dialog open={!!encerramentoPendente} onOpenChange={(open) => { if (!open) setEncerramentoPendente(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Concluir tarefa</DialogTitle>
            <DialogDescription>
              {tarefaFuturaDoContato(encerramentoPendente)
                ? `Este contato já tem uma tarefa para ${format(new Date(tarefaFuturaDoContato(encerramentoPendente)!.date), "dd/MM/yyyy")}. Escolha como seguir.`
                : "Para concluir esta tarefa, reprograme uma nova tarefa para o contato ou inative o cliente."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {tarefaFuturaDoContato(encerramentoPendente) ? (
              <>
                <Button className="w-full justify-start gap-2" onClick={() => void confirmarEncerramento("manter")}>
                  <CalendarDays className="h-4 w-4" /> Manter a data já estabelecida
                </Button>
                <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => void confirmarEncerramento("modificar")}>
                  <CalendarRange className="h-4 w-4" /> Modificar para a nova data
                </Button>
                <Button variant="secondary" className="w-full justify-start gap-2" onClick={() => void confirmarEncerramento("reprogramar")}>
                  <CalendarPlus className="h-4 w-4" /> Manter as duas tarefas
                </Button>
              </>
            ) : (
              <Button className="w-full justify-start gap-2" onClick={() => void confirmarEncerramento("reprogramar")}>
                <CalendarPlus className="h-4 w-4" /> Reprogramar nova tarefa
              </Button>
            )}
            {encerramentoPendente?.contactId && (
              <Button variant="destructive" className="w-full justify-start gap-2" onClick={() => void confirmarEncerramento("inativar")}>
                <UserX className="h-4 w-4" /> Inativar cliente
              </Button>
            )}
            <Button variant="outline" className="w-full" onClick={() => setEncerramentoPendente(null)}>
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Fluxo em etapas: fim de semana → dia ocupado → resumo */}
      <Dialog open={etapasFluxo.length > 0} onOpenChange={(open) => { if (!open) fecharFluxo(); }}>
        <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
          {etapasFluxo.length > 0 && (
            <>
              <DialogHeader className="space-y-2 border-b bg-primary/5 px-5 py-4 text-left">
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  {etapasFluxo.map((etapa, idx) => (
                    <span key={`${etapa}-${idx}`} className="flex items-center gap-1">
                      {idx > 0 && <ChevronRight className="h-3 w-3 opacity-50" />}
                      <span className={cn("flex items-center gap-1.5 rounded-full px-2 py-0.5", idx === etapaAtual ? "bg-primary text-primary-foreground" : idx < etapaAtual ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        {idx < etapaAtual ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                        <span className={cn("text-xs", idx === etapaAtual && "font-semibold")}>{etapa === "fimDeSemana" ? "Fim de semana" : etapa === "diaTodo" ? "Dia ocupado" : "Resumo"}</span>
                      </span>
                    </span>
                  ))}
                </div>
                <DialogTitle className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {etapasFluxo[etapaAtual] === "resumo" ? <Check className="h-4 w-4" /> : <CalendarRange className="h-4 w-4" />}
                  </span>
                  {etapasFluxo[etapaAtual] === "fimDeSemana" && "Tarefa em fim de semana"}
                  {etapasFluxo[etapaAtual] === "diaTodo" && "Dia já ocupado com tarefa de dia todo"}
                  {etapasFluxo[etapaAtual] === "resumo" && "Resumo do agendamento"}
                </DialogTitle>
                <DialogDescription>
                  {etapasFluxo[etapaAtual] === "fimDeSemana" && (
                    <>Esta tarefa está agendada para <span className="font-medium text-foreground">{format(weekendPendingTask?.targetDate || new Date(), "EEEE, dd/MM/yyyy", { locale: ptBR })}</span>, que é fim de semana. O que você deseja fazer?</>
                  )}
                  {etapasFluxo[etapaAtual] === "diaTodo" && (
                    <>{allDayPendingTask?.isMove ? "A tarefa ainda não foi movida" : "A tarefa ainda não foi salva"}: {motivosDiaTodo().length ? `encontramos ${motivosDiaTodo().length} motivo(s) para você decidir antes.` : "este dia já tem uma tarefa de dia todo."}</>
                  )}
                  {etapasFluxo[etapaAtual] === "resumo" && "Confira o que vai acontecer antes de finalizar."}
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-4">
                {/* Etapa: fim de semana */}
                {etapasFluxo[etapaAtual] === "fimDeSemana" && !weekendEscolherData && (
                  <div className="flex flex-col gap-2">
                    {weekendPendingTask && <AnaliseDestinoResumo origem={weekendPendingTask.targetDate} analise={analiseDestino} userIds={[weekendPendingTask.existingTask?.userId ?? weekendPendingTask.taskData?.userId]} disabled={analisandoDestino} onOutraData={() => { setWeekendEscolherData(true); setWeekendNovaData(null); }} onSugestao={data => avancarParaResumo(`Usar a data sugerida (${format(data, "dd/MM/yyyy")}), evitando o fim de semana e as tarefas de dia todo`, data)} />}
                    <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl py-3 text-left" onClick={() => weekendPendingTask && avancarParaResumo(`Manter na data (${format(weekendPendingTask.targetDate, "dd/MM/yyyy")}), mesmo sendo fim de semana`, weekendPendingTask.targetDate)}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><CalendarDays className="h-4 w-4" /></span>
                      <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Manter data</span><span className="block text-sm font-semibold text-foreground">Manter na data escolhida</span><span className="block text-xs text-muted-foreground"><span className="capitalize">{weekendPendingTask && format(weekendPendingTask.targetDate, "EEEE, dd/MM", { locale: ptBR })}</span> · mesmo sendo fim de semana</span></span>
                    </Button>

                    {(!analiseDestino?.sugerida || !isSameDay(analiseDestino.sugerida, analiseDestino.proximoDiaUtil)) && <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl py-3 text-left" onClick={() => void decidirProximoDiaUtil()}>
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><CalendarRange className="h-4 w-4" /></span>
                      <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Próximo dia útil</span><span className="block text-sm font-semibold text-foreground">Mover para o próximo dia útil</span><span className="block text-xs capitalize text-muted-foreground">{analiseDestino ? format(analiseDestino.proximoDiaUtil, "EEEE, dd/MM", { locale: ptBR }) : "calculando…"}</span></span>
                    </Button>}

                  </div>
                )}
                {etapasFluxo[etapaAtual] === "fimDeSemana" && weekendEscolherData && (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <CalendarPicker
                        mode="single"
                        selected={weekendNovaData || undefined}
                        onSelect={(d) => setWeekendNovaData(d || null)}
                        locale={ptBR}
                        modifiers={{ diaTodo: (day) => datasDiaTodo.has(format(day, "yyyy-MM-dd")) }}
                        modifiersClassNames={{ diaTodo: "bg-primary/20 text-primary font-bold" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Datas em destaque já possuem tarefa de dia todo.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setWeekendEscolherData(false); setWeekendNovaData(null); }}>
                        Voltar
                      </Button>
                      <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" disabled={!weekendNovaData} onClick={() => { if (weekendNovaData) void aplicarDataFimDeSemana(weekendNovaData); }}>
                        Usar esta data
                      </Button>
                    </div>
                  </div>
                )}
                {/* Etapa: dia ocupado */}
                {etapasFluxo[etapaAtual] === "diaTodo" && !allDayEscolherData && (
                  <>
                    {motivosDiaTodo().length > 0 && (
                      <details className="group rounded-md border border-border bg-background p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium [&::-webkit-details-marker]:hidden">Resumo da análise<ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" /></summary>
                        <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                          {motivosDiaTodo().map(motivo => (
                            <li key={motivo} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                              <span><strong className="block font-semibold">{motivo.split("|")[0]}</strong>{motivo.includes("|") && <span className="text-muted-foreground">{motivo.split("|").slice(1).join("|")}</span>}</span>
                            </li>
                          ))}
                        </ul>
                        <TarefasDoDiaResumo
                          date={dataAlvoDiaTodo()}
                          userIds={[allDayPendingTask?.existingTask?.userId, allDayPendingTask?.taskData?.userId, currentAdminId]}
                          className="mt-3 border-amber-500/40 bg-background/70"
                          collapsible
                        />
                      </details>
                    )}
                    {motivosDiaTodo().length === 0 && (
                      <TarefasDoDiaResumo
                        date={dataAlvoDiaTodo()}
                        userIds={[allDayPendingTask?.existingTask?.userId, allDayPendingTask?.taskData?.userId, currentAdminId]}
                      />
                    )}
                    <div className="flex flex-col gap-2">
                      <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl border-warning/40 py-3 text-left hover:border-warning" onClick={() => {
                        const alvo = dataAlvoDiaTodo();
                        if (alvo) avancarParaResumo(`Juntar com a tarefa de dia todo${allDayPendingTask?.allDayTaskTitle ? ` "${allDayPendingTask.allDayTaskTitle}"` : ""} em ${format(alvo, "dd/MM/yyyy")}`, alvo);
                      }}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15"><CalendarRange className="h-4 w-4 text-warning" /></span>
                        <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-warning">Juntar tarefas</span><span className="block text-sm font-semibold text-foreground">Juntar com a tarefa do dia todo</span><span className="block text-xs text-muted-foreground">{allDayPendingTask?.allDayTaskTitle ? `Mesma tarefa: ${allDayPendingTask.allDayTaskTitle}` : "As duas tarefas viram uma só"}</span></span>
                      </Button>
                      <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl py-3 text-left" aria-label="Escolher outra data" onClick={() => setAllDayEscolherData(true)}>
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted"><CalendarDays className="h-4 w-4" /></span>
                        <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Outra data</span><span className="block text-sm font-semibold text-foreground">Escolher outra data</span><span className="block text-xs text-muted-foreground">Abrir o calendário para marcar outro dia</span></span>
                      </Button>
                      {allDayPendingTask?.nextAvailableDate && (
                        <Button variant="outline" className="h-auto w-full min-w-0 justify-start gap-3 whitespace-normal rounded-xl border-primary/50 bg-primary/5 py-3 text-left hover:border-primary hover:bg-primary/10" onClick={() => { const data = allDayPendingTask?.nextAvailableDate; if (data) avancarParaResumo(`Mover para o próximo dia disponível (${format(data, "dd/MM/yyyy")})`, data); }}>
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Check className="h-4 w-4" /></span>
                          <span className="min-w-0 leading-tight"><span className="block text-[10px] font-semibold uppercase tracking-wider text-primary">Sugestão</span><span className="block text-sm font-semibold capitalize text-foreground">{format(allDayPendingTask.nextAvailableDate, "EEEE, dd/MM", { locale: ptBR })}</span><span className="block text-xs text-muted-foreground">Primeiro dia sem tarefa de dia todo</span></span>
                        </Button>
                      )}

                    </div>
                  </>
                )}
                {etapasFluxo[etapaAtual] === "diaTodo" && allDayEscolherData && (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <CalendarPicker
                        mode="single"
                        selected={allDayNovaData || undefined}
                        onSelect={(d) => setAllDayNovaData(d || null)}
                        locale={ptBR}
                        modifiers={{ diaTodo: (day) => datasDiaTodo.has(format(day, "yyyy-MM-dd")) }}
                        modifiersClassNames={{ diaTodo: "bg-primary/20 text-primary font-bold" }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">Datas em destaque já possuem tarefa de dia todo.</p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button variant="outline" className="w-full sm:w-auto" onClick={() => { setAllDayEscolherData(false); setAllDayNovaData(null); }}>
                        Voltar
                      </Button>
                      <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" disabled={!allDayNovaData} onClick={() => { if (allDayNovaData) void aplicarDataDiaTodo(allDayNovaData); }}>
                        Usar esta data
                      </Button>
                    </div>
                  </div>
                )}
                {/* Etapa: resumo */}
                {etapasFluxo[etapaAtual] === "resumo" && (
                  <div className="space-y-3">
                    <div className="rounded-lg border bg-muted/40 p-3.5">
                      <div className="text-sm font-semibold">Suas escolhas neste fluxo</div>
                      <ul className="mt-2 space-y-1.5 text-sm text-foreground">
                        {decisoesFluxo.map((decisao, idx) => (
                          <li key={`${decisao}-${idx}`} className="flex items-start gap-2">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{decisao}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {resultadoFluxo && (
                      <div className="rounded-lg border-2 border-primary/50 bg-primary/5 p-3.5 text-sm">
                        <div className="flex items-center gap-2 font-semibold text-primary">
                          <CalendarDays className="h-4 w-4" />
                          O que vai acontecer
                        </div>
                        <p className="mt-1.5">
                          {pendenteFluxo?.isMove ? "A tarefa" : "A nova tarefa"}
                          {pendenteFluxo?.taskData?.contactName ? ` de ${pendenteFluxo.taskData.contactName}` : pendenteFluxo?.existingTask?.contactName ? ` de ${pendenteFluxo.existingTask.contactName}` : ""}
                          {" "}será {pendenteFluxo?.isMove ? "movida" : "salva"} para <strong>{format(resultadoFluxo.data, "EEEE, dd/MM/yyyy", { locale: ptBR })}</strong>.
                        </p>
                        <TarefasDoDiaResumo
                          date={resultadoFluxo.data}
                          userIds={[pendenteFluxo?.existingTask?.userId, pendenteFluxo?.taskData?.userId, currentAdminId]}
                          className="mt-3"
                          collapsible
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
              <DialogFooter className="flex-wrap gap-2 border-t bg-muted/40 px-5 py-3">
                <Button variant="outline" className="w-full sm:w-auto" onClick={fecharFluxo}>
                  Cancelar
                </Button>
                {etapaAtual > 0 && !weekendEscolherData && !allDayEscolherData && (
                  <Button variant="outline" className="w-full sm:w-auto" onClick={voltarEtapa}>
                    Voltar
                  </Button>
                )}
                {etapasFluxo[etapaAtual] === "resumo" && (
                  <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90" disabled={!resultadoFluxo} onClick={() => void executarFluxo()}>
                    <Check className="mr-1 h-4 w-4" /> Finalizar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>


      {/* Dialog de horário comercial */}
      <Dialog open={isBusinessHoursDialogOpen} onOpenChange={setIsBusinessHoursDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fora do Horário Comercial</DialogTitle>
            <DialogDescription>
              O horário selecionado ({businessHoursPendingTask?.taskData?.time}) está fora do seu horário de trabalho.
              <br />
              Horário sugerido: {businessHoursPendingTask?.suggestedTime}
              <br />
              O que você deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsBusinessHoursDialogOpen(false);
                setBusinessHoursPendingTask(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (businessHoursPendingTask?.taskData) {
                  await saveTaskInternal(businessHoursPendingTask.taskData);
                }
                setIsBusinessHoursDialogOpen(false);
                setBusinessHoursPendingTask(null);
              }}
            >
              Manter Horário Original
            </Button>
            <Button
              onClick={async () => {
                if (businessHoursPendingTask?.taskData && businessHoursPendingTask.suggestedTime) {
                  await saveTaskInternal({
                    ...businessHoursPendingTask.taskData,
                    time: businessHoursPendingTask.suggestedTime
                  });
                }
                setIsBusinessHoursDialogOpen(false);
                setBusinessHoursPendingTask(null);
              }}
            >
              Usar Horário Sugerido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog open={!!diaTodoOutras} onOpenChange={(o) => { if (!o && !diaTodoOutrasAcao) setDiaTodoOutras(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Já existem tarefas neste dia</DialogTitle>
            <DialogDescription>
              {diaTodoOutras?.mover ? (
                <>A tarefa de dia todo será movida para {diaTodoOutras.mover.updates.date ? format(diaTodoOutras.mover.updates.date, "dd/MM/yyyy") : ""}. O que fazer com as outras {diaTodoOutras.outras.length} tarefa(s)?</>
              ) : diaTodoOutras?.lote ? (
                <>As tarefas de dia todo selecionadas serão movidas para {dataMovimento ? format(dataMovimento, "dd/MM/yyyy") : ""}. O que fazer com as outras {diaTodoOutras.outras.length} tarefa(s)?</>
              ) : (
                <>Esta tarefa passará a ser de dia todo em {diaTodoOutras && format(diaTodoOutras.taskData.date, "dd/MM/yyyy")}. O que fazer com as outras {diaTodoOutras?.outras.length} tarefa(s)?</>
              )}
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2 text-sm">
            {diaTodoOutras?.outras.map((t) => (
              <li key={t.id} className="flex gap-2">
                <span className="w-16 shrink-0 text-muted-foreground">{t.is_all_day ? "Dia todo" : t.time ? String(t.time).slice(0, 5) : "Sem hora"}</span>
                <span className="truncate text-foreground">{t.contact_name || t.title}</span>
              </li>
            ))}
          </ul>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button disabled={diaTodoOutrasAcao} onClick={async () => {
              if (!diaTodoOutras) return;
              const { taskData, outras, mover, lote } = diaTodoOutras;
              setDiaTodoOutrasAcao(true);
              try {
                const origem = mover ? mover.updates.date : (taskData?.date || dataMovimento);
                const donoId = mover?.userId || taskData?.userId;
                let proxima = getNextBusinessDay(origem);
                for (let i = 0; i < 366 && donoId && (await checkAllDayTasks(proxima, donoId)).hasTask; i++) proxima = getNextBusinessDay(proxima);
                let movidas = 0;
                for (const t of outras) if (await updateTaskInDatabase(t.id, { date: proxima }, 'drag')) movidas++;
                if (!movidas) return;
                toast.success(`${movidas} tarefa(s) movida(s) para ${format(proxima, "dd/MM/yyyy")}`);
                setDiaTodoOutras(null);
                if (mover) {
                  const ok = await updateTaskInDatabase(mover.taskId, mover.updates, 'drag');
                  if (ok) {
                    setTasks(atuais => atuais.map(t => t.id === mover.taskId ? { ...t, ...mover.updates } : t));
                    toast.success("Tarefa movida com sucesso");
                    await loadTasks();
                  } else toast.error("Não foi possível mover a tarefa");
                } else if (lote) {
                  await moverSelecao(true, true, true);
                } else {
                  await handleSaveTask(taskData, true, true);
                }
              } finally { setDiaTodoOutrasAcao(false); }
            }}>Mover as outras para o próximo dia disponível</Button>
            <Button variant="outline" disabled={diaTodoOutrasAcao} onClick={async () => {
              if (!diaTodoOutras) return;
              const { taskData, mover, lote } = diaTodoOutras;
              setDiaTodoOutras(null);
              if (mover) {
                const ok = await updateTaskInDatabase(mover.taskId, mover.updates, 'drag');
                if (ok) {
                  setTasks(atuais => atuais.map(t => t.id === mover.taskId ? { ...t, ...mover.updates } : t));
                  toast.success("Tarefa movida com sucesso");
                  await loadTasks();
                } else toast.error("Não foi possível mover a tarefa");
              } else if (lote) {
                await moverSelecao(true, true, true);
              } else {
                await handleSaveTask(taskData, true, true);
              }
            }}>Manter todas no mesmo dia</Button>
            <Button variant="ghost" disabled={diaTodoOutrasAcao} onClick={() => setDiaTodoOutras(null)}>Cancelar (não salvar)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <DeleteConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={confirmDeleteTask}
        title="Confirmar exclusão"
        description="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
      />

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask ? (
          <div className="bg-primary/20 text-primary px-3 py-2 rounded shadow-lg border border-primary">
            <div className="font-medium text-sm">{activeTask.title}</div>
            {activeTask.time && <div className="text-xs">{activeTask.time}</div>}
          </div>
        ) : null}
      </DragOverlay>
    </div>
    </DndContext>
    </SelecaoMovimento.Provider>
  );
}
