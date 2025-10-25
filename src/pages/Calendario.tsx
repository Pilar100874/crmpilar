import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableColumnsConfig, type TableColumn } from "@/components/config/TableColumnsConfig";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Filter, RefreshCw, GripVertical, Search, ArrowUpDown, ArrowUp, ArrowDown, Check, Pencil, Trash2 } from "lucide-react";
import { format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, isTomorrow, parseISO, differenceInDays, addWeeks, isWeekend, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
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
function DraggableTask({ task, onClick }: { task: Task; onClick?: (e?: any) => void }) {
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
      className={`group text-xs px-2 py-1 rounded flex items-center gap-1 cursor-move ${
        task.status === "completed"
          ? "bg-muted text-muted-foreground line-through"
          : "bg-primary/10 text-primary hover:bg-primary/20"
      }`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
      <span className="truncate flex-1">
        {task.time && `${task.time} `}{task.title}
      </span>
    </div>
  );
}

// Componente de card de tarefa arrastável (para lista)
function DraggableTaskCard({ task, onToggle }: { task: Task; onToggle: () => void }) {
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
    <Card ref={setNodeRef} style={style} className="mb-2 cursor-move">
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
  const [taskForm, setTaskForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    assignedTo: "",
    type: "other" as Task["type"]
  });
  const [filterBy, setFilterBy] = useState<"all" | "my">("my");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCell, setEditingCell] = useState<{ taskId: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState("");
  
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

  // Adicionar tarefa
  const handleAddTask = () => {
    if (!taskForm.title.trim()) {
      toast.error("Digite um título para a tarefa");
      return;
    }

    if (!taskForm.date) {
      toast.error("Selecione uma data para a tarefa");
      return;
    }

    // Validar se a data/hora não é anterior ao momento atual
    const now = new Date();
    const taskDate = parseISO(taskForm.date);
    
    if (taskForm.time) {
      const [hours, minutes] = taskForm.time.split(':').map(Number);
      taskDate.setHours(hours, minutes, 0, 0);
    } else {
      taskDate.setHours(23, 59, 59, 999);
    }

    if (taskDate < now) {
      toast.error("Não é possível adicionar tarefas com data/hora anterior ao momento atual");
      return;
    }

    const newTask: Task = {
      id: `task_${Date.now()}`,
      title: taskForm.title,
      description: taskForm.description,
      date: parseISO(taskForm.date),
      time: taskForm.time,
      assignedTo: taskForm.assignedTo,
      status: "pending",
      type: taskForm.type,
      createdAt: new Date(),
    };

    setTasks([...tasks, newTask]);
    setShowTaskDialog(false);
    setTaskForm({ title: "", description: "", date: "", time: "", assignedTo: "", type: "other" });
    toast.success("Tarefa adicionada com sucesso");
  };

  const handleOpenNewTask = (date?: Date) => {
    setSelectedDate(date || null);
    if (date) {
      setTaskForm({ ...taskForm, date: format(date, "yyyy-MM-dd") });
    }
    setShowTaskDialog(true);
  };

  const handleToggleTaskStatus = (taskId: string) => {
    setTasks(tasks.map(task =>
      task.id === taskId ? { ...task, status: task.status === "pending" ? "completed" : "pending" } : task
    ));
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
      
      // Verificar se a nova data é anterior à data atual
      if (newDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
        toast.error("Não é possível mover tarefa para data passada");
        return;
      }
      
      // Se a tarefa tem horário e a nova data é hoje, verificar se o horário já passou
      if (task.time && isSameDay(newDate, now)) {
        const [hours, minutes] = task.time.split(':').map(Number);
        const taskDateTime = new Date(newDate);
        taskDateTime.setHours(hours, minutes, 0, 0);
        
        if (taskDateTime < now) {
          toast.error("Não é possível mover tarefa para horário passado");
          return;
        }
      }
      
      setTasks(tasks.map(t =>
        t.id === taskId ? { ...t, date: newDate } : t
      ));
      toast.success("Tarefa movida com sucesso");
    }
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
    setEditingCell(null);
    setEditingValue("");
    toast.success("Tarefa atualizada");
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditingValue("");
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm("Tem certeza que deseja excluir esta tarefa?")) {
      setTasks(tasks.filter(t => t.id !== taskId));
      toast.success("Tarefa excluída");
    }
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
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="w-5 h-5" />
            </Button>
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
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Tarefa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Título *</label>
              <Input
                placeholder="Digite o título da tarefa"
                value={taskForm.title}
                onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Descrição</label>
              <Textarea
                placeholder="Adicione uma descrição (opcional)"
                value={taskForm.description}
                onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Data *</label>
                <Input
                  type="date"
                  value={taskForm.date}
                  onChange={(e) => setTaskForm({ ...taskForm, date: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Hora</label>
                <Input
                  type="time"
                  value={taskForm.time}
                  onChange={(e) => setTaskForm({ ...taskForm, time: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={taskForm.type} onValueChange={(value) => setTaskForm({ ...taskForm, type: value as Task["type"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accompany">Acompanhar</SelectItem>
                  <SelectItem value="call">Ligar</SelectItem>
                  <SelectItem value="meeting">Reunião</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Atribuir para</label>
              <Input
                placeholder="Nome do responsável"
                value={taskForm.assignedTo}
                onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddTask}>
              Adicionar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
