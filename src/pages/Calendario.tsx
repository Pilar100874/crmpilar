import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { ChevronLeft, ChevronRight, Plus, Filter, RefreshCw, GripVertical, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, Pencil, Trash2, Edit, X } from "lucide-react";
import { format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, isTomorrow, parseISO, differenceInDays, addWeeks, isWeekend, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/lib/toast-config";
import { NewTaskDialog } from "@/components/calendar/NewTaskDialog";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
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

interface Task {
  id: string;
  title: string;
  description?: string;
  date: Date;
  time?: string;
  assignedTo?: string;
  status: "pending" | "completed";
  type: "accompany" | "call" | "meeting" | "other";
  createdAt: Date;
  contactId?: string;
  contactName?: string;
  isAllDay?: boolean;
  userId?: string;
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
      className={`${className} ${isOver ? "ring-2 ring-primary ring-inset" : ""}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// Componente de tarefa arrastável
function DraggableTask({ 
  task, 
  onClick, 
  onEdit, 
  onDelete 
}: { 
  task: Task; 
  onClick?: (e?: any) => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group text-xs px-2 py-1 rounded flex items-center gap-1 ${
        task.status === "completed"
          ? "bg-muted text-muted-foreground line-through"
          : task.isAllDay
          ? "bg-secondary/30 text-secondary-foreground hover:bg-secondary/40"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      }`}
    >
      <div {...attributes} {...listeners} className="cursor-move">
        <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <span 
        className="truncate flex-1 cursor-pointer"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.(e);
        }}
      >
        {task.time && `${task.time} `}{task.title}
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
  onDelete 
}: { 
  task: Task; 
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
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

  return (
    <Card ref={setNodeRef} style={style} className="mb-2">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div {...attributes} {...listeners}>
                <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-grab" />
              </div>
              <span className="text-sm font-medium">
                {format(task.date, "dd/MM/yyyy", { locale: ptBR })}
              </span>
              {task.time && (
                <span className="text-xs text-muted-foreground">{task.time}</span>
              )}
              {task.assignedTo && (
                <Badge variant="outline" className="text-xs">
                  para {task.assignedTo}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.status === "completed"}
                onChange={onToggle}
                className="cursor-pointer"
              />
              <span className={task.status === "completed" ? "line-through text-muted-foreground" : ""}>
                {task.title}
              </span>
            </div>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={onEdit}
              >
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/20 hover:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
  const [isWeekendDialogOpen, setIsWeekendDialogOpen] = useState(false);
  const [weekendPendingTask, setWeekendPendingTask] = useState<{ 
    taskData: {
      contactId: string;
      contactName: string;
      date: Date;
      time: string;
      type: string;
      observation?: string;
      isAllDay?: boolean;
      userId?: string;
    } | null;
    existingTask: Task | null;
    targetDate: Date;
    isMove: boolean;
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
    confirmacao_fim_semana: boolean;
    deteccao_conflitos: boolean;
    bloqueio_finais_semana: boolean;
  }>({
    bloquear_datas_passadas: true,
    bloquear_horarios_passados: true,
    confirmacao_fim_semana: true,
    deteccao_conflitos: true,
    bloqueio_finais_semana: false,
  });
  
  // Configuração de colunas da tabela
  const [tableColumns, setTableColumns] = useState<TableColumn[]>(() => {
    const saved = localStorage.getItem("calendarTableColumns");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Se houver erro ao parsear, usar valores padrão
      }
    }
    return [
      { id: "status", label: "Status", visible: true, width: 100, locked: true },
      { id: "title", label: "Título", visible: true, width: 250, locked: true },
      { id: "date", label: "Data", visible: true, width: 120 },
      { id: "time", label: "Hora", visible: true, width: 100 },
      { id: "type", label: "Tipo", visible: true, width: 150 },
      { id: "assignedTo", label: "Atribuído para", visible: true, width: 180 },
      { id: "description", label: "Descrição", visible: false, width: 300 },
      { id: "actions", label: "Ações", visible: true, width: 80, locked: true },
    ];
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

  // Carregar tarefas do localStorage ao montar o componente
  useEffect(() => {
    const savedTasks = localStorage.getItem("calendar_tasks");
    if (savedTasks) {
      try {
        const parsedTasks = JSON.parse(savedTasks);
        // Converter strings de data para objetos Date e garantir tipos corretos
        const tasksWithDates = parsedTasks.map((task: any) => ({
          ...task,
          date: new Date(task.date),
          createdAt: new Date(task.createdAt),
          status: (task.status === "completed" ? "completed" : "pending") as "pending" | "completed",
        }));
        setTasks(tasksWithDates);
      } catch (error) {
        console.error("Erro ao carregar tarefas:", error);
        toast.error("Erro ao carregar tarefas salvas");
      }
    }
  }, []);

  // Carregar regras do calendário do banco
  useEffect(() => {
    const loadRegras = async () => {
      try {
        // Buscar estabelecimento_id do usuário atual
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

        const { data: usuarioData } = await supabase
          .from('usuarios')
          .select('estabelecimento_id')
          .eq('id', userData.user.id)
          .single();

        if (!usuarioData?.estabelecimento_id) return;

        // Buscar regras ativas do estabelecimento
        const { data: regras } = await (supabase as any)
          .from('calendario_regras')
          .select('tipo, ativa')
          .eq('estabelecimento_id', usuarioData.estabelecimento_id);

        if (regras) {
          const regrasMap: any = {};
          regras.forEach((regra: any) => {
            regrasMap[regra.tipo] = regra.ativa;
          });

          setCalendarioRegras({
            bloquear_datas_passadas: regrasMap.bloquear_datas_passadas ?? true,
            bloquear_horarios_passados: regrasMap.bloquear_horarios_passados ?? true,
            confirmacao_fim_semana: regrasMap.confirmacao_fim_semana ?? true,
            deteccao_conflitos: regrasMap.deteccao_conflitos ?? true,
            bloqueio_finais_semana: regrasMap.bloqueio_finais_semana ?? false,
          });
        }
      } catch (error) {
        console.error('Erro ao carregar regras do calendário:', error);
      }
    };

    loadRegras();
  }, []);

  // Função para obter o próximo dia útil
  const getNextBusinessDay = (date: Date): Date => {
    let nextDay = addDays(date, 1);
    
    // Se cair no fim de semana, avançar para segunda-feira
    while (isWeekend(nextDay)) {
      nextDay = addDays(nextDay, 1);
    }
    
    return nextDay;
  };

  // Mover tarefas não realizadas para o próximo dia útil
  const moveOverdueTasks = () => {
    const now = new Date();
    const today = startOfDay(now);
    let movedCount = 0;

    const updatedTasks = tasks.map(task => {
      // Verificar se a tarefa está pendente e a data já passou
      if (task.status === "pending" && startOfDay(task.date) < today) {
        movedCount++;
        return {
          ...task,
          date: getNextBusinessDay(now),
        };
      }
      return task;
    });

    if (movedCount > 0) {
      setTasks(updatedTasks);
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      const nextDay = getNextBusinessDay(now);
      toast.info(
        `${movedCount} tarefa${movedCount > 1 ? 's' : ''} não realizada${movedCount > 1 ? 's' : ''} movida${movedCount > 1 ? 's' : ''} para ${format(nextDay, "dd/MM/yyyy", { locale: ptBR })}`
      );
    }
  };

  // Verificar tarefas atrasadas ao carregar e a cada hora
  useEffect(() => {
    moveOverdueTasks();
    
    // Verificar a cada hora
    const interval = setInterval(() => {
      moveOverdueTasks();
    }, 3600000); // 1 hora

    return () => clearInterval(interval);
  }, [tasks]);

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

  // Adicionar tarefa
  const handleSaveTask = async (taskData: {
    contactId: string;
    contactName: string;
    date: Date;
    time: string;
    type: string;
    observation?: string;
    isAllDay?: boolean;
    userId?: string;
  }) => {
    // Verificar se é fim de semana (regra: confirmacao_fim_semana ou bloqueio_finais_semana)
    if (checkWeekend(taskData.date)) {
      if (calendarioRegras.bloqueio_finais_semana) {
        toast.error("Agendamentos bloqueados para finais de semana");
        return;
      }
      
      if (calendarioRegras.confirmacao_fim_semana) {
        setWeekendPendingTask({
          taskData: taskData,
          existingTask: null,
          targetDate: taskData.date,
          isMove: false
        });
        setIsWeekendDialogOpen(true);
        return;
      }
    }

    await saveTaskInternal(taskData);
  };

  const saveTaskInternal = async (taskData: {
    contactId: string;
    contactName: string;
    date: Date;
    time: string;
    type: string;
    observation?: string;
    isAllDay?: boolean;
    userId?: string;
  }) => {
    // Se for dia todo, criar múltiplas tarefas baseadas na jornada do usuário
    if (taskData.isAllDay) {
      try {
        // Buscar jornada de trabalho do usuário atual do Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error("Usuário não autenticado");
          return;
        }
        
        const { data: userData, error } = await supabase
          .from("usuarios")
          .select("hora_inicial, hora_final")
          .eq("id", user.id)
          .single();
        
        if (error || !userData) {
          toast.error("Erro ao buscar jornada de trabalho do usuário");
          return;
        }
        
        const horaInicial = userData.hora_inicial || "08:00";
        const horaFinal = userData.hora_final || "18:00";
        
        // Gerar slots de 15 minutos entre hora inicial e final
        const [startHour, startMinute] = horaInicial.split(':').map(Number);
        const [endHour, endMinute] = horaFinal.split(':').map(Number);
        
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;
        
        const newTasks: Task[] = [];
        
        for (let time = startTime; time < endTime; time += 15) {
          const hour = Math.floor(time / 60);
          const minute = time % 60;
          const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          
          newTasks.push({
            id: `task_${Date.now()}_${time}`,
            title: `${taskData.type === 'call' ? 'Ligação' : taskData.type === 'meeting' ? 'Reunião' : taskData.type === 'accompany' ? 'Acompanhamento' : 'Tarefa'} - ${taskData.contactName}`,
            description: taskData.observation,
            date: taskData.date,
            time: timeString,
            assignedTo: taskData.contactName,
            status: "pending",
            type: taskData.type as Task["type"],
            createdAt: new Date(),
            contactId: taskData.contactId,
            contactName: taskData.contactName,
            isAllDay: true,
            userId: user.id,
          });
        }
        
        const updatedTasks = [...tasks, ...newTasks];
        setTasks(updatedTasks);
        localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
        toast.success(`${newTasks.length} tarefas adicionadas para o dia todo`);
      } catch (error) {
        console.error("Erro ao criar tarefas de dia todo:", error);
        toast.error("Erro ao criar tarefas de dia todo");
      }
    } else {
      // Tarefa normal com horário específico
      const newTask: Task = {
        id: `task_${Date.now()}`,
        title: `${taskData.type === 'call' ? 'Ligação' : taskData.type === 'meeting' ? 'Reunião' : taskData.type === 'accompany' ? 'Acompanhamento' : 'Tarefa'} - ${taskData.contactName}`,
        description: taskData.observation,
        date: taskData.date,
        time: taskData.time,
        assignedTo: taskData.contactName,
        status: "pending",
        type: taskData.type as Task["type"],
        createdAt: new Date(),
        contactId: taskData.contactId,
        contactName: taskData.contactName,
        isAllDay: false,
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      toast.success("Tarefa adicionada com sucesso");
    }
    
    setShowTaskDialog(false);
  };

  const handleOpenNewTask = (date?: Date) => {
    setSelectedDate(date || null);
    setShowTaskDialog(true);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, status: task.status === "pending" ? "completed" as const : "pending" as const } : task
    );
    setTasks(updatedTasks);
    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
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
      
      // Se a tarefa tem horário e a nova data é hoje, verificar se o horário já passou (regra: bloquear_horarios_passados)
      if (calendarioRegras.bloquear_horarios_passados && task.time && isSameDay(newDate, now)) {
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskDateTime = new Date(newDate);
        taskDateTime.setHours(hours, minutes, 0, 0);
        
        if (taskDateTime < now) {
          toast.error("Não é possível mover tarefa para horário passado");
          return;
        }
      }
      
      // Verificar se é fim de semana (regra: confirmacao_fim_semana ou bloqueio_finais_semana)
      if (checkWeekend(newDate)) {
        if (calendarioRegras.bloqueio_finais_semana) {
          toast.error("Agendamentos bloqueados para finais de semana");
          return;
        }
        
        if (calendarioRegras.confirmacao_fim_semana) {
          setWeekendPendingTask({
            taskData: null,
            existingTask: task,
            targetDate: newDate,
            isMove: true
          });
          setIsWeekendDialogOpen(true);
          return;
        }
      }

      // Verificar se já existem tarefas no mesmo horário (regra: deteccao_conflitos)
      if (calendarioRegras.deteccao_conflitos && task.time) {
        const existingTasks = tasks.filter(t => 
          t.id !== taskId &&
          isSameDay(t.date, newDate) && 
          t.time === task.time
        );

        if (existingTasks.length > 0) {
          setConflictingTasks(existingTasks);
          setPendingTask({ ...task, date: newDate });
          setIsConflictDialogOpen(true);
          return;
        }
      }
      
      const updatedTasks = tasks.map(t =>
        t.id === taskId ? { ...t, date: newDate } : t
      );
      setTasks(updatedTasks);
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      toast.success("Tarefa movida com sucesso");
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
    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
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
    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
    setIsConflictDialogOpen(false);
    setPendingTask(null);
    setConflictingTasks([]);
    toast.success("Tarefa adicionada");
  };

  // Obter tarefas do dia
  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => isSameDay(task.date, date));
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
        <div key={i} className="text-center py-3 font-medium text-sm text-muted-foreground uppercase border-b border-border">
          {format(addDays(startDate, i), dateFormat, { locale: ptBR })}
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
            className={`min-h-[120px] border-r border-b border-border p-2 cursor-pointer hover:bg-muted/50 transition-colors ${
              !isCurrentMonth ? "bg-muted/20 text-muted-foreground" : ""
            } ${isTodayDate ? "bg-primary/5" : ""}`}
            onClick={() => handleOpenNewTask(currentDay)}
          >
            <div className="text-right mb-1">
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${
                isTodayDate ? "bg-primary text-primary-foreground font-bold" : ""
              }`}>
                {format(day, "d")}
              </span>
            </div>
            <div className="space-y-1">
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
                />
              ))}
              {dayTasks.length > 3 && (
                <div className="text-xs text-muted-foreground px-2">
                  +{dayTasks.length - 3} mais
                </div>
              )}
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
      <div className="border-l border-t border-border">
        <div className="grid grid-cols-7">{weekDays}</div>
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
          className="flex-1 border-r border-b border-border"
        >
          <div className={`p-3 border-b border-border text-center ${isTodayDate ? "bg-primary/5" : ""}`}>
            <div className="text-xs text-muted-foreground uppercase">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className={`text-lg font-medium ${isTodayDate ? "text-primary" : ""}`}>
              {format(day, "d")}
            </div>
          </div>
          <div className="p-2 space-y-2 min-h-[400px]">
            {dayTasks.map(task => (
              <DraggableTask
                key={task.id}
                task={task}
                onClick={() => handleToggleTaskStatus(task.id)}
                onEdit={() => handleEditTask(task)}
                onDelete={() => handleDeleteTask(task.id)}
              />
            ))}
          </div>
        </DroppableDay>
      );
    }

    return (
      <div className="border-l border-t border-border">
        <div className="flex">{days}</div>
      </div>
    );
  };

  // Renderizar visualização de dia
  const renderDayView = () => {
    const dayTasks = getTasksForDay(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="border border-border rounded">
        <div className="p-4 border-b border-border bg-muted/30">
          <h3 className="font-semibold">
            {format(currentDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </h3>
        </div>
        <div className="max-h-[600px] overflow-y-auto">
          {hours.map(hour => {
            const hourTasks = dayTasks.filter(task => task.time?.startsWith(String(hour).padStart(2, '0')));
            return (
              <div key={hour} className="flex border-b border-border hover:bg-muted/30">
                <div className="w-20 p-2 text-sm text-muted-foreground border-r border-border">
                  {String(hour).padStart(2, '0')}:00
                </div>
                <div className="flex-1 p-2 space-y-1">
                  {hourTasks.map(task => (
                    <div
                      key={task.id}
                      className={`p-2 rounded border cursor-pointer ${
                        task.status === "completed"
                          ? "bg-muted text-muted-foreground line-through border-muted"
                          : "bg-primary/10 border-primary"
                      }`}
                      onClick={() => handleToggleTaskStatus(task.id)}
                    >
                      <div className="font-medium text-sm">{task.title}</div>
                      {task.description && <div className="text-xs text-muted-foreground mt-1">{task.description}</div>}
                    </div>
                  ))}
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
    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
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

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      const updatedTasks = tasks.filter(t => t.id !== taskToDelete);
      setTasks(updatedTasks);
      localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
      toast.success("Tarefa excluída");
      setTaskToDelete(null);
    }
    setDeleteConfirmOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsEditDialogOpen(true);
  };

  const getTypeLabel = (type: Task["type"]) => {
    const labels = {
      accompany: "Acompanhar",
      call: "Ligar",
      meeting: "Reunião",
      other: "Outro"
    };
    return labels[type] || type;
  };

  // Filtrar e ordenar tarefas para a tabela
  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      task.title.toLowerCase().includes(query) ||
      task.description?.toLowerCase().includes(query) ||
      task.assignedTo?.toLowerCase().includes(query) ||
      format(task.date, "dd/MM/yyyy").includes(query)
    );
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
          case 'type':
            aValue = getTypeLabel(a.type);
            bValue = getTypeLabel(b.type);
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
            <TableColumnsConfig 
              columns={tableColumns} 
              onColumnsChange={handleColumnsChange}
            />
            
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
                  <tr key={task.id} className="border-b border-border hover:bg-muted/50 transition-colors">
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
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDeleteTask(task.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
                                {column.id === 'type' && getTypeLabel(task.type)}
                                {column.id === 'assignedTo' && (task.assignedTo || "-")}
                                {column.id === 'description' && (task.description || "-")}
                              </span>
                              {column.id !== 'date' && column.id !== 'type' && (
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

    const todayTasks = tasks.filter(task => isSameDay(task.date, today) && task.status === "pending");
    const tomorrowTasks = tasks.filter(task => isSameDay(task.date, tomorrow) && task.status === "pending");
    const nextWeekTasks = tasks.filter(task => {
      const diff = differenceInDays(task.date, today);
      return diff > 1 && diff <= 7 && task.status === "pending";
    });
    const futureTasks = tasks.filter(task => {
      const diff = differenceInDays(task.date, today);
      return diff > 7 && task.status === "pending";
    });

    return (
      <div className="grid grid-cols-4 gap-4 p-4">
        <div>
          <div className="mb-4 pb-2 border-b border-border">
            <h3 className="font-semibold text-sm uppercase">TAREFAS DE HOJE</h3>
            <p className="text-xs text-muted-foreground">{todayTasks.length} tarefas</p>
          </div>
          {todayTasks.map(task => 
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleTaskStatus(task.id)}
              onEdit={() => handleEditTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          )}
        </div>

        <div>
          <div className="mb-4 pb-2 border-b border-border">
            <h3 className="font-semibold text-sm uppercase">TAREFAS DE AMANHÃ</h3>
            <p className="text-xs text-muted-foreground">{tomorrowTasks.length} tarefas</p>
          </div>
          {tomorrowTasks.map(task => 
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleTaskStatus(task.id)}
              onEdit={() => handleEditTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          )}
        </div>

        <div>
          <div className="mb-4 pb-2 border-b border-border">
            <h3 className="font-semibold text-sm uppercase">TAREFAS DA PRÓXIMA SEMANA</h3>
            <p className="text-xs text-muted-foreground">{nextWeekTasks.length} tarefa{nextWeekTasks.length !== 1 ? 's' : ''}</p>
          </div>
          {nextWeekTasks.map(task => 
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleTaskStatus(task.id)}
              onEdit={() => handleEditTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          )}
        </div>

        <div>
          <div className="mb-4 pb-2 border-b border-border">
            <h3 className="font-semibold text-sm uppercase">TAREFAS PARA O FUTURO</h3>
            <p className="text-xs text-muted-foreground">{futureTasks.length} tarefa{futureTasks.length !== 1 ? 's' : ''}</p>
          </div>
          {futureTasks.map(task => 
            <DraggableTaskCard 
              key={task.id} 
              task={task} 
              onToggle={() => handleToggleTaskStatus(task.id)}
              onEdit={() => handleEditTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
            />
          )}
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
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground">CALENDÁRIO</h1>

            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="day">DIA</TabsTrigger>
                <TabsTrigger value="week">SEMANA</TabsTrigger>
                <TabsTrigger value="month">MÊS</TabsTrigger>
                <TabsTrigger value="list">LISTA</TabsTrigger>
                <TabsTrigger value="table">TABELA</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <Button
                variant={filterBy === "my" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterBy("my")}
              >
                Minhas tarefas
              </Button>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Novo filtro
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {getTotalTasks()} tarefa{getTotalTasks() !== 1 ? 's' : ''}
            </span>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              SINCRONIZAR
            </Button>
            <Button onClick={() => handleOpenNewTask()} className="gap-2">
              <Plus className="w-4 h-4" />
              NOVA TAREFA
            </Button>
          </div>
        </div>

        {/* Navegação de data */}
        {viewMode !== "list" && viewMode !== "table" && (
          <div className="px-6 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handlePrevious}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNext}>
                <ChevronRight className="w-5 h-5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Hoje
              </Button>
              <h2 className="text-lg font-semibold ml-4">
                {format(currentDate, viewMode === "month" ? "MMMM 'de' yyyy" : "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const tabs = document.querySelector<HTMLElement>('[role="tablist"]');
                if (tabs) {
                  const listButton = Array.from(tabs.querySelectorAll('button')).find(b => !b.getAttribute('data-state'));
                  if (listButton) listButton.click();
                }
              }}
            >
              Ver lista
            </Button>
          </div>
        )}

        {viewMode === "list" && (
          <div className="px-6 pb-4 flex items-center justify-end">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="month">Ver calendário</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {viewMode === "month" && renderMonthView()}
        {viewMode === "week" && renderWeekView()}
        {viewMode === "day" && renderDayView()}
        {viewMode === "list" && renderListView()}
        {viewMode === "table" && renderTableView()}
      </div>

      {/* Dialog para adicionar tarefa */}
      <NewTaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        onSave={handleSaveTask}
        initialDate={selectedDate || undefined}
      />

      {/* Dialog para editar tarefa */}
      {editingTask && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Editar Tarefa</DialogTitle>
              <DialogDescription>
                Edite as informações da tarefa abaixo.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Data</label>
                <Input
                  type="date"
                  defaultValue={format(editingTask.date, "yyyy-MM-dd")}
                  onChange={(e) => {
                    const newDate = new Date(e.target.value);
                    setEditingTask({ ...editingTask, date: newDate });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Horário</label>
                <Input
                  type="time"
                  defaultValue={editingTask.time}
                  onChange={(e) => {
                    setEditingTask({ ...editingTask, time: e.target.value });
                  }}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tipo</label>
                <select
                  className="w-full p-2 border rounded"
                  defaultValue={editingTask.type}
                  onChange={(e) => {
                    setEditingTask({ ...editingTask, type: e.target.value as any });
                  }}
                >
                  <option value="accompany">Acompanhamento</option>
                  <option value="call">Ligação</option>
                  <option value="meeting">Reunião</option>
                  <option value="other">Outro</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Observação</label>
                <Textarea
                  defaultValue={editingTask.description}
                  onChange={(e) => {
                    setEditingTask({ ...editingTask, description: e.target.value });
                  }}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingTask(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (!editingTask) return;
                  
                  // Verificar se é fim de semana (regra: confirmacao_fim_semana ou bloqueio_finais_semana)
                  if (checkWeekend(editingTask.date)) {
                    if (calendarioRegras.bloqueio_finais_semana) {
                      toast.error("Agendamentos bloqueados para finais de semana");
                      return;
                    }
                    
                    if (calendarioRegras.confirmacao_fim_semana) {
                      setWeekendPendingTask({
                        taskData: null,
                        existingTask: editingTask,
                        targetDate: editingTask.date,
                        isMove: true
                      });
                      setIsWeekendDialogOpen(true);
                      setIsEditDialogOpen(false);
                      return;
                    }
                  }

                  const updatedTasks = tasks.map(t => 
                    t.id === editingTask.id ? editingTask : t
                  );
                  setTasks(updatedTasks);
                  localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
                  toast.success("Tarefa atualizada com sucesso");
                  setIsEditDialogOpen(false);
                  setEditingTask(null);
                }}
              >
                Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tarefa em Fim de Semana</DialogTitle>
            <DialogDescription>
              Esta tarefa está agendada para {format(weekendPendingTask?.targetDate || new Date(), "EEEE, dd/MM/yyyy", { locale: ptBR })}.
              <br />O que você deseja fazer?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              onClick={() => {
                setIsWeekendDialogOpen(false);
                setWeekendPendingTask(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={async () => {
                if (weekendPendingTask) {
                  if (weekendPendingTask.isMove && weekendPendingTask.existingTask) {
                    // Mover tarefa existente
                    const updatedTasks = tasks.map(t =>
                      t.id === weekendPendingTask.existingTask!.id 
                        ? { ...t, date: weekendPendingTask.targetDate } 
                        : t
                    );
                    setTasks(updatedTasks);
                    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
                    toast.success("Tarefa movida para fim de semana");
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
              onClick={async () => {
                if (weekendPendingTask) {
                  const nextBusinessDay = getNextBusinessDay(weekendPendingTask.targetDate);
                  
                  if (weekendPendingTask.isMove && weekendPendingTask.existingTask) {
                    // Mover tarefa existente
                    const updatedTasks = tasks.map(t =>
                      t.id === weekendPendingTask.existingTask!.id 
                        ? { ...t, date: nextBusinessDay } 
                        : t
                    );
                    setTasks(updatedTasks);
                    localStorage.setItem("calendar_tasks", JSON.stringify(updatedTasks));
                    toast.success(`Tarefa movida para ${format(nextBusinessDay, "dd/MM/yyyy", { locale: ptBR })}`);
                  } else if (weekendPendingTask.taskData) {
                    // Criar nova tarefa
                    await saveTaskInternal({ ...weekendPendingTask.taskData, date: nextBusinessDay });
                  }
                }
                setIsWeekendDialogOpen(false);
                setWeekendPendingTask(null);
              }}
            >
              Mover para Próximo Dia Útil
            </Button>
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
