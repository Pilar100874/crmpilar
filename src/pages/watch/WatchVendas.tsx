import { ArrowLeft, DollarSign, TrendingUp, Package, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const WatchVendas = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const stats = {
    totalHoje: 'R$ 15.847',
    pedidosHoje: 23,
    ticketMedio: 'R$ 689',
    pendentes: 5,
  };

  const recentSales = [
    { id: 1, cliente: 'João Silva', valor: 'R$ 1.250', status: 'aprovado', time: '5 min' },
    { id: 2, cliente: 'Maria Santos', valor: 'R$ 890', status: 'pendente', time: '12 min' },
    { id: 3, cliente: 'Pedro Costa', valor: 'R$ 2.100', status: 'aprovado', time: '25 min' },
    { id: 4, cliente: 'Ana Lima', valor: 'R$ 560', status: 'aprovado', time: '1h' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprovado': return 'text-green-500 bg-green-500/10';
      case 'pendente': return 'text-yellow-500 bg-yellow-500/10';
      default: return 'text-muted-foreground bg-muted';
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
        <span className="text-[10px] font-medium">Vendas</span>
        <button 
          onClick={handleRefresh}
          className={`p-1 rounded-full bg-muted/50 hover:bg-muted ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Main Stat */}
      <div className="bg-primary/10 rounded-lg p-2 mb-2 text-center">
        <div className="flex items-center justify-center gap-1 mb-0.5">
          <DollarSign className="w-4 h-4 text-primary" />
          <span className="text-[8px] text-muted-foreground">Total Hoje</span>
        </div>
        <div className="text-lg font-bold">{stats.totalHoje}</div>
        <div className="flex items-center justify-center gap-0.5 text-[8px] text-green-500">
          <TrendingUp className="w-2 h-2" />
          +18% vs ontem
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-1 mb-2">
        <div className="bg-card rounded-lg p-1.5 border border-border/50 text-center">
          <Package className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <div className="text-sm font-bold">{stats.pedidosHoje}</div>
          <div className="text-[7px] text-muted-foreground">Pedidos</div>
        </div>
        <div className="bg-card rounded-lg p-1.5 border border-border/50 text-center">
          <DollarSign className="w-3 h-3 mx-auto text-primary mb-0.5" />
          <div className="text-[10px] font-bold">{stats.ticketMedio}</div>
          <div className="text-[7px] text-muted-foreground">Ticket</div>
        </div>
        <div className="bg-card rounded-lg p-1.5 border border-border/50 text-center">
          <Clock className="w-3 h-3 mx-auto text-yellow-500 mb-0.5" />
          <div className="text-sm font-bold">{stats.pendentes}</div>
          <div className="text-[7px] text-muted-foreground">Pendentes</div>
        </div>
      </div>

      {/* Recent Sales */}
      <div className="text-[9px] font-medium mb-1">Vendas Recentes</div>
      <div className="space-y-1 max-h-[80px] overflow-y-auto">
        {recentSales.map((sale) => (
          <div 
            key={sale.id}
            className="bg-card rounded-lg p-1.5 border border-border/50 flex items-center justify-between"
          >
            <div className="min-w-0">
              <div className="text-[9px] font-medium truncate">{sale.cliente}</div>
              <div className="text-[7px] text-muted-foreground">{sale.time} atrás</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] font-bold">{sale.valor}</div>
              <div className={`text-[7px] px-1 rounded ${getStatusColor(sale.status)}`}>
                {sale.status}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WatchVendas;
