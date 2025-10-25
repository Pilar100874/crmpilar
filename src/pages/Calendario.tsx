import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Filter, RefreshCw, GripVertical } from "lucide-react";
import { format, addDays, addMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameMonth, isSameDay, isToday, isTomorrow, parseISO, differenceInDays, addWeeks } from "date-fns";
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

type ViewMode = "day" | "week" | "month" | "list";

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
        {viewMode !== "list" && (
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
