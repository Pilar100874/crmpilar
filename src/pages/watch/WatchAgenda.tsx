import { ArrowLeft, Calendar, Clock, User, CheckCircle, Circle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WatchAgenda = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const today = new Date();

  const tasks = [
    { id: 1, title: 'Reunião cliente', time: '09:00', contact: 'João Silva', done: true },
    { id: 2, title: 'Follow-up vendas', time: '10:30', contact: 'Maria Santos', done: true },
    { id: 3, title: 'Ligação prospect', time: '14:00', contact: 'Pedro Costa', done: false },
    { id: 4, title: 'Enviar proposta', time: '15:30', contact: 'Ana Lima', done: false },
    { id: 5, title: 'Visita técnica', time: '17:00', contact: 'Carlos Souza', done: false },
  ];

  const completedCount = tasks.filter(t => t.done).length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="min-h-screen bg-background p-2 max-w-[200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button 
          onClick={() => navigate('/watch')}
          className="p-1 rounded-full bg-muted/50 hover:bg-muted"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>
        <span className="text-[10px] font-medium">Agenda</span>
        <button 
          onClick={handleRefresh}
          className={`p-1 rounded-full bg-muted/50 hover:bg-muted ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Date Header */}
      <div className="bg-primary/10 rounded-lg p-2 mb-2 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-primary" />
        <div>
          <div className="text-[10px] font-medium">
            {format(today, "EEEE", { locale: ptBR })}
          </div>
          <div className="text-[8px] text-muted-foreground">
            {format(today, "dd 'de' MMMM", { locale: ptBR })}
          </div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-sm font-bold">{completedCount}/{tasks.length}</div>
          <div className="text-[8px] text-muted-foreground">tarefas</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
        {tasks.map((task) => (
          <div 
            key={task.id}
            className={`bg-card rounded-lg p-1.5 border border-border/50 flex items-center gap-1.5 ${task.done ? 'opacity-60' : ''}`}
          >
            {task.done ? (
              <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-[9px] font-medium truncate ${task.done ? 'line-through' : ''}`}>
                {task.title}
              </div>
              <div className="flex items-center gap-1 text-[7px] text-muted-foreground">
                <Clock className="w-2 h-2" />
                {task.time}
                <User className="w-2 h-2 ml-1" />
                <span className="truncate">{task.contact}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mt-2 bg-card rounded-lg p-2 border border-border/50">
        <div className="flex justify-between text-[8px] mb-1">
          <span className="text-muted-foreground">Progresso</span>
          <span className="font-medium">{Math.round((completedCount / tasks.length) * 100)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-1.5">
          <div 
            className="bg-green-500 h-1.5 rounded-full transition-all" 
            style={{ width: `${(completedCount / tasks.length) * 100}%` }} 
          />
        </div>
      </div>
    </div>
  );
};

export default WatchAgenda;
