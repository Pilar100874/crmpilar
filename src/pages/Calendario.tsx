import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, GripVertical, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, Pencil, Trash2, Edit, X, Users, User, Bot, Megaphone, Phone, MapPin, Mail, MailOpen, FileText, MessageSquare, Calendar, Instagram } from "lucide-react";
import { format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, isTomorrow, parseISO, differenceInDays, addWeeks, isWeekend, startOfDay, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import { NewTaskDialog } from "@/components/calendar/NewTaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  closestCenter,
  DragOverEvent,
  useDroppable,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { getEstabelecimentoId, isAnyAdmin } from "@/lib/estabelecimentoUtils";
import { CalendarioMobileHeader } from "./CalendarioMobileHeader";

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
  const { setNodeRef, isOver } = useDroppable({
    id: format(date, "yyyy-MM-dd"),
    data: { date },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${className} ${isOver ? "ring-2 ring-primary ring-inset bg-primary/10" : ""} relative`}
      onClick={onClick}
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

// Componente de tarefa arrastável
function DraggableTask({ 
  task, 
  onClick, 
  onEdit, 
  onDelete,
  userColor
}: { 
  task: Task; 
  onClick?: (e?: any) => void;
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
  
  // Debug: verificar se cor está chegando
  if (task.userId && !userColor) {
    console.log('[TASK_COLOR] Tarefa sem cor:', { 
      taskId: task.id.substring(0, 8), 
      userId: task.userId.substring(0, 8),
      userColor 
    });
  }

  const getOrigemIcon = (origem: Task['origem']) => getOrigemIconWithColor(origem, "sm");

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(userColor && task.status !== "completed" ? {
          backgroundColor: toAlpha(userColor, 0.22),
          borderLeft: `3px solid ${userColor}`,
          filter: 'brightness(1.02)'
        } : {})
      }}
      className={`group text-xs px-2 py-1 rounded flex items-center gap-1 ${
        task.status === "completed"
          ? "bg-muted text-muted-foreground line-through"
          : task.isAllDay
          ? "bg-secondary/30 text-secondary-foreground hover:bg-secondary/40"
          : !userColor ? "bg-primary/10 text-primary hover:bg-primary/20" : "hover:brightness-110"
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {task.isAllDay && (
        <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "hsl(0, 85%, 60%)" }} />
      )}
      {getOrigemIcon(task.origem)}
      <span 
        className="truncate flex-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {task.time && `${task.time} `}{task.title}
        {task.userName && (
          <span className="ml-1 text-[10px] opacity-60">
            ({task.userName})
          </span>
        )}
      </span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-background/50"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 hover:bg-destructive/20 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// Componente de card de tarefa arrastável (para lista)
function DraggableTaskCard({ 
  task, 
  onToggle,
  onEdit,
  onDelete,
  userColor
}: { 
  task: Task; 
  onToggle: () => void;
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

  const getOrigemIcon = (origem: Task['origem']) => getOrigemIconWithColor(origem, "md");

  return (
    <Card 
      ref={setNodeRef} 
      style={{
        ...style,
        ...(userColor && task.status !== "completed" ? {
          borderLeft: `4px solid ${userColor}`,
          backgroundColor: toAlpha(userColor, 0.12)
        } : {})
      }} 
      className="mb-2 sm:mb-3 hover:shadow-md transition-shadow"
    >
      <CardContent className="p-2 sm:p-3 md:p-4">
        <div className="flex items-start gap-2 sm:gap-3">
          <div {...attributes} {...listeners} className="mt-1 hidden sm:block">
            <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab" />
          </div>
          <div className="flex-1 space-y-1.5 sm:space-y-2">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs sm:text-sm">
              <span className="font-medium whitespace-nowrap">
                {format(task.date, "dd/MM", { locale: ptBR })}
              </span>
              {task.time && (
                <span className="text-muted-foreground whitespace-nowrap">{task.time}</span>
              )}
              {task.isAllDay && (
                <Badge variant="secondary" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1 sm:px-2">
                  <Calendar className="w-2.5 h-2.5 sm:w-3 sm:h-3" style={{ color: "hsl(0, 85%, 60%)" }} />
                  <span className="hidden sm:inline">Dia todo</span>
                </Badge>
              )}
              {getOrigemIcon(task.origem) && (
                <Badge variant="outline" className="text-[10px] sm:text-xs gap-0.5 sm:gap-1 px-1 sm:px-2">
                  {getOrigemIcon(task.origem)}
                  <span className="hidden md:inline">{task.origem}</span>
                </Badge>
              )}
            </div>
            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={task.status === "completed"}
                onChange={onToggle}
                className="cursor-pointer mt-0.5 sm:mt-1 flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <span className={`text-xs sm:text-sm ${task.status === "completed" ? "line-through text-muted-foreground" : "font-medium"}`}>
                  {task.title}
                </span>
                {task.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 line-clamp-2">{task.description}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex sm:flex-row flex-col items-center gap-0.5 sm:gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8"
                onClick={onEdit}
              >
                <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 sm:h-8 sm:w-8 hover:bg-destructive/20 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
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

export default function Calendario() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterBy, setFilterBy] = useState<"all" | "my">("my");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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
  
  const [isWeekendDialogOpen, setIsWeekendDialogOpen] = useState(false);
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
  const [isAllDayDialogOpen, setIsAllDayDialogOpen] = useState(false);
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
  } | null>(null);
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
  }>({
    bloquear_datas_passadas: true,
    bloquear_horarios_passados: true,
    deteccao_conflitos: true,
    bloqueio_finais_semana: false,
    horario_comercial: false,
    validacao_dia_todo: false,
    realocacao_diaria: false,
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
      console.log('[LOAD_TASKS] Iniciando carregamento - isAdmin:', isAdmin, 'selectedUserIds:', selectedUserIds);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) return;

      // Buscar o ID do usuário na tabela usuarios (a FK user_id referencia usuarios, não auth.users)
      const { data: currentUsuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      
      const currentUsuarioId = currentUsuario?.id;

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
        
        console.log("=== DEBUG TAREFAS CARREGADAS ===");
        console.log("Primeira tarefa raw do banco:", tarefas[0]);
        
        const tasksWithDates = tarefas.map((task: any) => {
          // Parse date in LOCAL timezone without relying on ISO parsing to avoid UTC shifts
          // Expected DB format: 'yyyy-MM-dd'
          const [year, month, day] = (task.date || "").split("-").map(Number);
          // Use noon to be extra safe against DST edges while remaining in local time
          const parsedDate = new Date(year, (month || 1) - 1, day || 1, 12, 0, 0, 0);
          console.log(`Tarefa ${task.id}: date do banco="${task.date}", parsed="${parsedDate.toString()}", localDate="${parsedDate.toLocaleDateString()}"`)
          
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
        console.log('[COLORS] Tarefas carregadas:', tasksWithDates.map(t => ({ 
          id: t.id.substring(0, 8), 
          userId: t.userId?.substring(0, 8),
          color: t.userId ? userColors[t.userId] : 'NO_COLOR'
        })));
        
        setTasks(tasksWithDates);
      }
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
      toast.error("Erro ao carregar tarefas");
    }
  }, [selectedUserIds, isAdmin, currentAdminId, userColors]);

  useEffect(() => {
    loadTasks();

    // Configurar realtime para atualizações automáticas
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
          loadTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadTasks]);

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

          setCalendarioRegras({
            bloquear_datas_passadas: regrasMap.bloquear_datas_passadas ?? true,
            bloquear_horarios_passados: regrasMap.bloquear_horarios_passados ?? true,
            deteccao_conflitos: regrasMap.deteccao_conflitos ?? true,
            bloqueio_finais_semana: regrasMap.bloqueio_finais_semana ?? false,
            horario_comercial: regrasMap.horario_comercial ?? false,
            validacao_dia_todo: regrasMap.validacao_dia_todo ?? false,
            realocacao_diaria: regrasMap.realocacao_diaria ?? false,
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
      if (updates.campaignId !== undefined) dbUpdates.campaign_id = updates.campaignId;

      const { error } = await (supabase as any)
        .from('calendario_tarefas')
        .update(dbUpdates)
        .eq('id', taskId);

      if (error) {
        console.error('Erro ao atualizar tarefa:', error);
        toast.error("Erro ao atualizar tarefa");
        return false;
      }

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

  // Verificar tarefas atrasadas ao carregar e a cada hora (com proteção de repetição diária)
  const processOverdueIfNeeded = async () => {
    console.log("=== DESABILITADO: Movimentação automática de tarefas atrasadas ===");
    // DESABILITADO TEMPORARIAMENTE - estava movendo tarefas automaticamente
    // const now = new Date();
    // const todayKey = format(now, 'yyyy-MM-dd');
    // const lastProcessed = sessionStorage.getItem('calendar_overdue_last_processed');
    // if (lastProcessed === todayKey) {
    //   return;
    // }
    // await moveOverdueTasks();
    // sessionStorage.setItem('calendar_overdue_last_processed', todayKey);
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
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, -1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, -7));
    } else {
      setCurrentDate(addMonths(currentDate, -1));
    }
  };

  const handleNext = () => {
    if (viewMode === "day") {
      setCurrentDate(addDays(currentDate, 1));
    } else if (viewMode === "week") {
      setCurrentDate(addDays(currentDate, 7));
    } else {
      setCurrentDate(addMonths(currentDate, 1));
    }
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
        targetUserId = user.id;
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

  // Adicionar tarefa
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
  }) => {
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
        setIsWeekendDialogOpen(true);
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

      // Se for dia todo, atualizar a tarefa se estiver editando; caso contrário, criar baseado na jornada
      if (taskData.isAllDay) {
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
    setSelectedDate(date || null);
    setShowTaskDialog(true);
  };

  const handleToggleTaskStatus = async (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    const newStatus = task.status === "pending" ? "completed" : "pending";
    const success = await updateTaskInDatabase(taskId, { status: newStatus }, 'toggle-status');
    
    if (success) {
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, status: newStatus as "pending" | "completed" } : t
      );
      setTasks(updatedTasks);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

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
      if (calendarioRegras.realocacao_diaria && !isSameDay(task.date, newDate)) {
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
        setIsWeekendDialogOpen(true);
        return;
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
              {dayTasks.length > 0 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground bg-muted px-1 sm:px-1.5 py-0.5 rounded">
                  {dayTasks.length}
                </span>
              )}
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
                      setCurrentDate(currentDay);
                      setViewMode("day");
                    }}
                  />
                ))}
                {dayTasks.length > 4 && (
                  <span className="text-[8px] text-muted-foreground">+{dayTasks.length - 4}</span>
                )}
              </div>
              {/* Desktop: lista de tarefas */}
              <div className="hidden sm:block space-y-1 max-h-[80px] md:max-h-[100px] overflow-y-auto">
                {dayTasks.slice(0, 3).map(task => (
                  <DraggableTask
                    key={task.id}
                    task={task}
                    onClick={(e) => {
                      e?.stopPropagation();
                      handleToggleTaskStatus(task.id);
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
      <div className="border-l border-t border-border overflow-x-auto">
        <div className="grid grid-cols-7 min-w-0">{weekDays}</div>
        {rows}
      </div>
    );
  };

  // Renderizar visualização de semana
  const renderWeekView = () => {
    const startDate = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = [];

    for (let i = 0; i < 7; i++) {
      const day = addDays(startDate, i);
      const dayTasks = getTasksForDay(day);
      const isTodayDate = isToday(day);

      days.push(
        <DroppableDay 
          key={i} 
          date={day}
          className="md:flex-1 md:min-w-0 border-b md:border-r border-border"
        >
          {/* Mobile/Tablet: Layout horizontal compacto */}
          <div className="md:hidden">
            <div 
              className={`p-3 flex items-center justify-between ${isTodayDate ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`flex flex-col items-center min-w-[40px] cursor-pointer`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(day);
                    setViewMode("day");
                  }}
                >
                  <span className="text-xs text-muted-foreground uppercase">
                    {format(day, "EEE", { locale: ptBR })}
                  </span>
                  <span className={`text-lg font-medium ${isTodayDate ? "text-primary" : ""}`}>
                    {format(day, "d")}
                  </span>
                </div>
                <div className="flex-1 flex flex-wrap gap-1">
                  {dayTasks.slice(0, 3).map(task => (
                    <Badge 
                      key={task.id}
                      variant={task.status === "completed" ? "secondary" : "default"}
                      className="text-[10px] px-1.5 py-0.5 cursor-pointer truncate max-w-[120px]"
                      style={task.userId && userColors[task.userId] && task.status !== "completed" ? {
                        backgroundColor: userColors[task.userId],
                        color: 'hsl(var(--primary-foreground))'
                      } : {}}
                      onClick={() => handleToggleTaskStatus(task.id)}
                    >
                      {task.time && `${task.time} `}{task.title}
                    </Badge>
                  ))}
                  {dayTasks.length > 3 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0.5">
                      +{dayTasks.length - 3}
                    </Badge>
                  )}
                </div>
              </div>
              {!isBefore(startOfDay(day), startOfDay(new Date())) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 hover:bg-primary/20 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenNewTask(day);
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Desktop: Layout vertical original */}
          <div className="hidden md:block">
            <div 
              className={`p-2 sm:p-3 border-b border-border flex flex-col items-center ${isTodayDate ? "bg-primary/5" : ""}`}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, "EEE", { locale: ptBR })}
              </div>
              <div className="flex items-center gap-1">
                <div 
                  className={`text-base sm:text-lg font-medium cursor-pointer hover:bg-primary/20 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 transition-colors ${isTodayDate ? "text-primary" : ""}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentDate(day);
                    setViewMode("day");
                  }}
                  title="Ver dia"
                >
                  {format(day, "d")}
                </div>
                {!isBefore(startOfDay(day), startOfDay(new Date())) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 sm:h-6 sm:w-6 hover:bg-primary/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenNewTask(day);
                    }}
                    title="Nova tarefa"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            <div className="p-1 sm:p-2 space-y-1 sm:space-y-2 min-h-[150px] sm:min-h-[300px] md:min-h-[400px]">
              {dayTasks.map(task => (
                <DraggableTask
                  key={task.id}
                  task={task}
                  onClick={() => handleToggleTaskStatus(task.id)}
                  onEdit={() => handleEditTask(task)}
                  onDelete={() => handleDeleteTask(task.id)}
                  userColor={task.userId ? userColors[task.userId] : undefined}
                />
              ))}
            </div>
          </div>
        </DroppableDay>
      );
    }

    return (
      <div className="border-l border-t border-border">
        {/* Mobile/Tablet: dias empilhados verticalmente */}
        <div className="md:hidden flex flex-col">{days}</div>
        {/* Desktop: dias lado a lado */}
        <div className="hidden md:flex">{days}</div>
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
            onClick={() => handleToggleTaskStatus(task.id)}
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
      <div className="border border-border rounded">
        <div className="p-3 sm:p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold text-sm sm:text-base">
            {format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
          </h3>
        </div>
        <div className="max-h-[calc(100vh-280px)] md:max-h-[600px] overflow-y-auto">
          {/* Seção: Tarefas Dia Todo */}
          {allDayTasks.length > 0 && (
            <div className="border-b-2 border-border bg-accent/5">
              <div className="flex">
                <div className="w-16 sm:w-20 p-2 text-xs sm:text-sm font-semibold text-foreground border-r border-border flex-shrink-0">
                  Dia Todo
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {allDayTasks.map(renderTaskCard)}
                </div>
              </div>
            </div>
          )}

          {/* Seção: Tarefas Sem Horário */}
          {noTimeTasks.length > 0 && (
            <div className="border-b-2 border-border bg-muted/10">
              <div className="flex">
                <div className="w-16 sm:w-20 p-2 text-xs sm:text-sm font-semibold text-foreground border-r border-border flex-shrink-0">
                  Sem Hora
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {noTimeTasks.map(renderTaskCard)}
                </div>
              </div>
            </div>
          )}

          {/* Seção: Tarefas com Horário */}
          {hours.map(hour => {
            const hourTasks = timedTasks.filter(task => task.time?.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex border-b border-border hover:bg-muted/30">
                <div className="w-16 sm:w-20 p-2 text-xs sm:text-sm text-muted-foreground border-r border-border flex-shrink-0">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 space-y-1 min-w-0">
                  {hourTasks.map(renderTaskCard)}
                </div>
              </div>
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

  const confirmDeleteTask = async () => {
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
    return (
      <div className="flex flex-col h-full">
        <div className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 max-w-md">
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
            
            <div className="ml-auto text-sm text-muted-foreground">
              {sortedTasks.length} tarefa{sortedTasks.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {sortedTasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {searchQuery ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa cadastrada"}
            </div>
          ) : (
            <table className="w-full">
              <thead className="border-b border-border sticky top-0 bg-background z-10">
                <tr>
                  {tableColumns.filter(col => col.visible).map((column, index) => (
                    <th
                      key={column.id}
                      className={`text-left p-3 font-medium text-sm text-muted-foreground relative ${
                        column.id === 'status' ? 'sticky left-0 bg-background border-r border-border z-20' : ''
                      }`}
                      style={{ width: column.width, minWidth: column.width }}
                    >
                      <div className="flex items-center justify-between gap-2 pr-4">
                        <span>{column.label.toUpperCase()}</span>
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
                    {tableColumns.filter(col => col.visible).map((column) => {
                      if (column.id === 'status') {
                        return (
                          <td key="status" className="p-3 sticky left-0 bg-background border-r border-border">
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
                          <td key="actions" className="p-3">
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditTask(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-destructive/20 hover:text-destructive"
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
                          className="p-3 group relative"
                          style={{ width: column.width, maxWidth: column.width }}
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
    const today = new Date();
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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3 sm:gap-4">
        <div>
          <div className="mb-3 sm:mb-4 pb-2 border-b border-border sticky top-0 bg-background z-10">
            <h3 className="font-semibold text-xs sm:text-sm uppercase">HOJE</h3>
            <p className="text-xs text-muted-foreground">{todayTasks.length} tarefa{todayTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {todayTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
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
            <h3 className="font-semibold text-xs sm:text-sm uppercase">AMANHÃ</h3>
            <p className="text-xs text-muted-foreground">{tomorrowTasks.length} tarefa{tomorrowTasks.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="space-y-2">
            {tomorrowTasks.map(task => 
              <DraggableTaskCard 
                key={task.id} 
                task={task} 
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-background">
      {/* Header Moderno e Minimalista */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border/40 sticky top-0 z-20">
        {/* Mobile Header (< lg) */}
        <div className="lg:hidden">
          <CalendarioMobileHeader
            currentDate={currentDate}
            viewMode={viewMode}
            onViewModeChange={(mode) => setViewMode(mode)}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToday={handleToday}
            onNewTask={() => {
              setSelectedDate(null);
              setShowTaskDialog(true);
            }}
            onShowFilter={() => setShowFilterDialog(true)}
          />
        </div>

        {/* Desktop Header (>= lg) */}
        <div className="hidden lg:block px-6 py-3">
          <div className="flex items-center justify-between gap-6">
            {/* Esquerda: Navegação e Visualização */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handlePrevious}
                  className="h-9 w-9 hover:bg-primary/10"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-base font-medium min-w-[180px] text-center">
                  {format(currentDate, viewMode === "month" ? "MMMM 'de' yyyy" : "d 'de' MMMM", { locale: ptBR })}
                </h2>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleNext}
                  className="h-9 w-9 hover:bg-primary/10"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleToday}
                className="h-9 px-4 font-medium"
              >
                Hoje
              </Button>

              <div className="h-6 w-px bg-border/40" />

              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)} className="w-auto">
                <TabsList className="bg-muted/50 h-9">
                  <TabsTrigger value="day" className="text-xs px-3">Dia</TabsTrigger>
                  <TabsTrigger value="week" className="text-xs px-3">Semana</TabsTrigger>
                  <TabsTrigger value="month" className="text-xs px-3">Mês</TabsTrigger>
                  <TabsTrigger value="list" className="text-xs px-3">Lista</TabsTrigger>
                  <TabsTrigger value="table" className="text-xs px-3">Tabela</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Direita: Filtros e Ações */}
            <div className="flex items-center gap-3">
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="pl-10 h-9 text-sm border-border/40"
                />
              </div>

              {/* Filtro de usuário para administradores */}
              {isAdmin && usuarios.length > 0 && (
                <Select
                  value={selectedUserIds.length === 1 ? selectedUserIds[0] : selectedUserIds.length > 1 ? "multiple" : "all"}
                  onValueChange={(value) => {
                    if (value === "all") {
                      setSelectedUserIds([]);
                    } else if (value !== "multiple") {
                      setSelectedUserIds([value]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      <SelectValue placeholder="Todos os usuários">
                        {selectedUserIds.length === 0 
                          ? "Todos os usuários"
                          : selectedUserIds.length === 1
                            ? usuarios.find(u => u.auth_user_id === selectedUserIds[0])?.nome || "Usuário"
                            : `${selectedUserIds.length} usuários`
                        }
                      </SelectValue>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Todos os usuários
                      </div>
                    </SelectItem>
                    {usuarios.filter(u => u.auth_user_id).map((usuario) => (
                      <SelectItem key={usuario.id} value={usuario.auth_user_id!}>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          {usuario.nome}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}


              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowFilterDialog(true)}
                className="h-9 px-4 gap-2 text-xs"
              >
                <Filter className="w-3.5 h-3.5" />
                Filtros {(selectedOrigens.length > 0 || selectedUserIds.length > 0) && (
                  <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-[10px]">
                    {selectedOrigens.length + selectedUserIds.length}
                  </Badge>
                )}
              </Button>

              <div className="h-6 w-px bg-border/40" />

              <Button
                onClick={() => {
                  setSelectedDate(null);
                  setShowTaskDialog(true);
                }}
                size="sm"
                className="h-9 px-4 gap-2 text-xs shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Tarefa
              </Button>
            </div>
          </div>
        </div>

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
          <div className="border-b border-border bg-muted/30 px-3 sm:px-6 py-2 sm:py-3">
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
      <div className="flex-1 overflow-auto px-2 sm:px-4 md:px-6 py-2 sm:py-4">
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
        {viewMode === "list" && renderListView()}
        {viewMode === "table" && renderTableView()}
      </div>

      {/* Dialog para adicionar/editar tarefa */}
      <NewTaskDialog
        open={showTaskDialog}
        onOpenChange={(open) => {
          setShowTaskDialog(open);
          if (!open) setEditingTask(null);
        }}
        onSave={handleSaveTask}
        initialDate={selectedDate || undefined}
        editingTask={editingTask ? {
          id: editingTask.id,
          contactId: editingTask.contactId,
          contactName: editingTask.contactName,
          date: editingTask.date,
          time: editingTask.time,
          origem: editingTask.origem,
          campaignId: editingTask.campaignId,
          description: editingTask.description,
          isAllDay: editingTask.isAllDay,
          userId: editingTask.userId,
          dataOriginal: editingTask.dataOriginal,
        } : undefined}
      />

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

      {/* Dialog de fim de semana */}
      <Dialog open={isWeekendDialogOpen} onOpenChange={setIsWeekendDialogOpen}>
        <DialogContent className="max-w-md sm:max-w-lg md:max-w-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl">Tarefa em Fim de Semana</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Esta tarefa está agendada para <span className="font-medium text-foreground">{format(weekendPendingTask?.targetDate || new Date(), "EEEE, dd/MM/yyyy", { locale: ptBR })}</span>.
              <br />
              <span className="block mt-2">O que você deseja fazer?</span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 mt-6">
            <Button
              variant="outline"
              className="w-full sm:basis-0 sm:flex-1 min-w-0 whitespace-normal text-center"
              onClick={() => {
                setIsWeekendDialogOpen(false);
                setWeekendPendingTask(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:basis-0 sm:flex-1 min-w-0 whitespace-normal text-center hover:bg-orange-500 hover:text-white transition-colors"
              onClick={async () => {
                if (weekendPendingTask) {
                  if (weekendPendingTask.isMove && weekendPendingTask.existingTask) {
                    // Mover tarefa existente para fim de semana com horário ajustado (se houver)
                    const adjustedTime = weekendPendingTask.adjustedTime ?? weekendPendingTask.existingTask.time;
                    const success = await updateTaskInDatabase(
                      weekendPendingTask.existingTask.id, 
                      { date: weekendPendingTask.targetDate, time: adjustedTime },
                      'drag'
                    );
                    if (success) {
                      const updatedTasks = tasks.map(t =>
                        t.id === weekendPendingTask.existingTask!.id 
                          ? { ...t, date: weekendPendingTask.targetDate, time: adjustedTime } 
                          : t
                      );
                      setTasks(updatedTasks);
                      toast.success("Tarefa movida para fim de semana");
                    }
                  } else if (weekendPendingTask.taskData) {
                    // Criar nova tarefa
                    await saveTaskInternal(weekendPendingTask.taskData);
                  }
                }
                setIsWeekendDialogOpen(false);
                setWeekendPendingTask(null);
              }}
            >
              Manter na Data
            </Button>
            <Button
              className="w-full sm:basis-0 sm:flex-1 min-w-0 whitespace-normal text-center bg-primary hover:bg-primary/90"
              onClick={async () => {
                if (weekendPendingTask) {
                  const nextBusinessDay = getNextBusinessDay(weekendPendingTask.targetDate);
                  
                  // Verificar se o próximo dia útil tem tarefa de dia todo (validar pelo usuário da tarefa)
                  if (calendarioRegras.validacao_dia_todo) {
                    const taskUserId = weekendPendingTask.existingTask?.userId;
                    const allDayCheck = await checkAllDayTasks(nextBusinessDay, taskUserId);
                    
                    if (allDayCheck.hasTask) {
                      // Calcular o próximo dia disponível (sem tarefa de dia todo para o usuário)
                      const nextAvailableDay = await getNextAvailableDay(weekendPendingTask.targetDate, taskUserId);
                      
                      // Mostrar dialog de confirmação
                      setAllDayPendingTask({
                        taskData: weekendPendingTask.taskData,
                        existingTask: weekendPendingTask.existingTask,
                        isMove: weekendPendingTask.isMove,
                        adjustedTime: weekendPendingTask.adjustedTime,
                        nextAvailableDate: nextAvailableDay,
                        allDayTaskTitle: allDayCheck.taskTitle,
                        targetDate: nextBusinessDay, // Data com tarefa de dia todo
                      });
                      setIsAllDayDialogOpen(true);
                      setIsWeekendDialogOpen(false);
                      return;
                    }
                  }
                  
                  // Se não tem tarefa de dia todo, move normalmente
                  if (weekendPendingTask.isMove && weekendPendingTask.existingTask) {
                    const adjustedTime = weekendPendingTask.adjustedTime ?? weekendPendingTask.existingTask.time;
                    const success = await updateTaskInDatabase(
                      weekendPendingTask.existingTask.id, 
                      { date: nextBusinessDay, time: adjustedTime },
                      'drag'
                    );
                    if (success) {
                      const updatedTasks = tasks.map(t =>
                        t.id === weekendPendingTask.existingTask!.id 
                          ? { ...t, date: nextBusinessDay, time: adjustedTime } 
                          : t
                      );
                      setTasks(updatedTasks);
                      toast.success(`Tarefa movida para ${format(nextBusinessDay, "dd/MM/yyyy", { locale: ptBR })}`);
                    }
                  } else if (weekendPendingTask.taskData) {
                    await saveTaskInternal({ ...weekendPendingTask.taskData, date: nextBusinessDay });
                  }
                }
                setIsWeekendDialogOpen(false);
                setWeekendPendingTask(null);
              }}
            >
              Mover para Próximo Dia Útil
            </Button>
          </div>
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

      {/* Dialog de tarefa dia todo */}
      <Dialog open={isAllDayDialogOpen} onOpenChange={setIsAllDayDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Dia já Ocupado com Tarefa de Dia Todo</DialogTitle>
            <DialogDescription>
              Já existe uma tarefa marcada como "dia todo" para {format(allDayPendingTask?.taskData?.date || new Date(), "dd/MM/yyyy", { locale: ptBR })}.
              {allDayPendingTask?.allDayTaskTitle && (
                <>
                  <br />
                  <br />
                  <strong>Tarefa existente:</strong> {allDayPendingTask.allDayTaskTitle}
                </>
              )}
              {allDayPendingTask?.nextAvailableDate && (
                <>
                  <br />
                  <br />
                  Próximo dia disponível: {format(allDayPendingTask.nextAvailableDate, "dd/MM/yyyy", { locale: ptBR })}
                </>
              )}
              <br />
              <br />
              O que você deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto order-1"
              onClick={() => {
                setIsAllDayDialogOpen(false);
                setAllDayPendingTask(null);
                // Restaurar dialog de fim de semana se foi cancelado
                if (allDayPendingTask?.isMove !== undefined) {
                  setWeekendPendingTask(null);
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto order-2 whitespace-normal h-auto py-2"
              onClick={async () => {
                // Permitir agendar no dia com tarefa de dia todo
                if (allDayPendingTask?.isMove && allDayPendingTask.existingTask) {
                  // Caso 1: Movendo uma tarefa existente
                  const targetDate = allDayPendingTask.targetDate || allDayPendingTask.taskData?.date || allDayPendingTask.existingTask.date;
                  const adjustedTime = allDayPendingTask.adjustedTime ?? allDayPendingTask.existingTask.time;
                  const success = await updateTaskInDatabase(
                    allDayPendingTask.existingTask.id,
                    { date: targetDate, time: adjustedTime },
                    'drag'
                  );
                  if (success) {
                    const updatedTasks = tasks.map(t =>
                      t.id === allDayPendingTask.existingTask!.id
                        ? { ...t, date: targetDate, time: adjustedTime }
                        : t
                    );
                    setTasks(updatedTasks);
                    toast.success(`Tarefa movida para ${format(targetDate, "dd/MM/yyyy", { locale: ptBR })}`);
                  }
                } else if (allDayPendingTask?.taskData) {
                  // Caso 2: Criando nova tarefa
                  await saveTaskInternal(allDayPendingTask.taskData);
                }
                setIsAllDayDialogOpen(false);
                setAllDayPendingTask(null);
              }}
            >
              Permitir Junto com Dia Todo
            </Button>
            {allDayPendingTask?.nextAvailableDate && (
              <Button
                className="w-full sm:w-auto order-3 bg-primary hover:bg-primary/90 whitespace-normal h-auto py-2"
                onClick={async () => {
                  if (allDayPendingTask?.nextAvailableDate) {
                    if (allDayPendingTask.isMove && allDayPendingTask.existingTask) {
                      const adjustedTime = allDayPendingTask.adjustedTime ?? allDayPendingTask.existingTask.time;
                      const success = await updateTaskInDatabase(
                        allDayPendingTask.existingTask.id,
                        { date: allDayPendingTask.nextAvailableDate, time: adjustedTime },
                        'drag'
                      );
                      if (success) {
                        const updatedTasks = tasks.map(t =>
                          t.id === allDayPendingTask.existingTask!.id
                            ? { ...t, date: allDayPendingTask.nextAvailableDate!, time: adjustedTime }
                            : t
                        );
                        setTasks(updatedTasks);
                        toast.success(`Tarefa movida para ${format(allDayPendingTask.nextAvailableDate, "dd/MM/yyyy", { locale: ptBR })}`);
                      }
                    } else if (allDayPendingTask.taskData) {
                      await saveTaskInternal({ ...allDayPendingTask.taskData, date: allDayPendingTask.nextAvailableDate });
                    }
                  }
                  setIsAllDayDialogOpen(false);
                  setAllDayPendingTask(null);
                }}
              >
                Mover para Próximo Dia Disponível
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
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
  );
}
