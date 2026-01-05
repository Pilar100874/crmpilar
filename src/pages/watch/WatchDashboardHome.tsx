import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, MessageSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const WatchDashboardHome = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const metrics = [
    { label: 'Vendas Hoje', value: 'R$ 12.5K', trend: '+12%', up: true, icon: DollarSign },
    { label: 'Pedidos', value: '47', trend: '+8%', up: true, icon: ShoppingCart },
    { label: 'Clientes', value: '1.2K', trend: '+5%', up: true, icon: Users },
    { label: 'Chats', value: '23', trend: '-3%', up: false, icon: MessageSquare },
  ];

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
        <span className="text-[10px] font-medium">Dashboard</span>
        <button 
          onClick={handleRefresh}
          className={`p-1 rounded-full bg-muted/50 hover:bg-muted ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw className="w-3 h-3" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-1.5">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div 
              key={index}
              className="bg-card rounded-lg p-2 border border-border/50"
            >
              <div className="flex items-center gap-1 mb-1">
                <Icon className="w-3 h-3 text-primary" />
                <span className="text-[8px] text-muted-foreground truncate">{metric.label}</span>
              </div>
              <div className="text-sm font-bold">{metric.value}</div>
              <div className={`flex items-center gap-0.5 text-[8px] ${metric.up ? 'text-green-500' : 'text-red-500'}`}>
                {metric.up ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                {metric.trend}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-2 bg-card rounded-lg p-2 border border-border/50">
        <div className="text-[9px] font-medium mb-1.5">Resumo do Dia</div>
        <div className="space-y-1">
          <div className="flex justify-between text-[8px]">
            <span className="text-muted-foreground">Meta diária</span>
            <span className="font-medium">78%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <div className="bg-primary h-1 rounded-full" style={{ width: '78%' }} />
          </div>
          <div className="flex justify-between text-[8px]">
            <span className="text-muted-foreground">Ticket médio</span>
            <span className="font-medium">R$ 267</span>
          </div>
          <div className="flex justify-between text-[8px]">
            <span className="text-muted-foreground">Conversão</span>
            <span className="font-medium">34%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchDashboardHome;
