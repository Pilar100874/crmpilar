import { ArrowLeft, MessageSquare, Clock, User, Circle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const WatchChats = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = {
    ativos: 12,
    aguardando: 5,
    resolvidos: 34,
  };

  const chats = [
    { id: 1, cliente: 'João Silva', mensagem: 'Preciso de ajuda com meu pedido', time: '2 min', unread: 3, status: 'aguardando' },
    { id: 2, cliente: 'Maria Santos', mensagem: 'Qual o prazo de entrega?', time: '5 min', unread: 1, status: 'ativo' },
    { id: 3, cliente: 'Pedro Costa', mensagem: 'Obrigado pelo atendimento!', time: '15 min', unread: 0, status: 'ativo' },
    { id: 4, cliente: 'Ana Lima', mensagem: 'Gostaria de fazer um orçamento', time: '22 min', unread: 2, status: 'aguardando' },
    { id: 5, cliente: 'Carlos Souza', mensagem: 'Vocês trabalham aos sábados?', time: '45 min', unread: 0, status: 'ativo' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aguardando': return 'bg-yellow-500';
      case 'ativo': return 'bg-green-500';
      default: return 'bg-muted';
    }
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
        <span className="text-[10px] font-medium">Chats</span>
        <button 
          onClick={handleRefresh}
          className={`p-1 rounded-full bg-muted/50 hover:bg-muted ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="bg-green-500/10 rounded-lg p-1.5 text-center">
          <div className="text-sm font-bold text-green-500">{stats.ativos}</div>
          <div className="text-[7px] text-muted-foreground">Ativos</div>
        </div>
        <div className="bg-yellow-500/10 rounded-lg p-1.5 text-center">
          <div className="text-sm font-bold text-yellow-500">{stats.aguardando}</div>
          <div className="text-[7px] text-muted-foreground">Aguardando</div>
        </div>
        <div className="bg-primary/10 rounded-lg p-1.5 text-center">
          <div className="text-sm font-bold text-primary">{stats.resolvidos}</div>
          <div className="text-[7px] text-muted-foreground">Resolvidos</div>
        </div>
      </div>

      {/* Chats List */}
      <div className="text-[9px] font-medium mb-1 flex items-center gap-1">
        <MessageSquare className="w-3 h-3" />
        Conversas Ativas
      </div>
      <div className="space-y-1 max-h-[120px] overflow-y-auto">
        {chats.map((chat) => (
          <div 
            key={chat.id}
            className="bg-card rounded-lg p-1.5 border border-border/50 flex items-start gap-1.5"
          >
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                <User className="w-3 h-3" />
              </div>
              <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-background ${getStatusColor(chat.status)}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-medium truncate">{chat.cliente}</span>
                <span className="text-[7px] text-muted-foreground flex items-center gap-0.5">
                  <Clock className="w-2 h-2" />
                  {chat.time}
                </span>
              </div>
              <div className="text-[8px] text-muted-foreground truncate">{chat.mensagem}</div>
            </div>
            {chat.unread > 0 && (
              <div className="flex-shrink-0 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-medium">
                {chat.unread}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mt-2 grid grid-cols-2 gap-1">
        <button className="bg-primary text-primary-foreground rounded-lg p-1.5 text-[8px] font-medium">
          Ver Todos
        </button>
        <button className="bg-muted text-muted-foreground rounded-lg p-1.5 text-[8px] font-medium">
          Aguardando ({stats.aguardando})
        </button>
      </div>
    </div>
  );
};

export default WatchChats;
