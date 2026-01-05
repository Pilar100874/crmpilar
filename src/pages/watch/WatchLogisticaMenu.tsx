import { ArrowLeft, Truck, Map, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WatchLogisticaMenu = () => {
  const navigate = useNavigate();

  const menuItems = [
    { 
      icon: Truck, 
      label: 'Veículos Online', 
      description: 'Status em tempo real',
      path: '/watch/logistica/veiculos',
      color: 'bg-green-500/10 text-green-500'
    },
    { 
      icon: Map, 
      label: 'Mapa ao Vivo', 
      description: 'Localização atual',
      path: '/watch/logistica/mapa',
      color: 'bg-blue-500/10 text-blue-500'
    },
    { 
      icon: Route, 
      label: 'Rotas do Dia', 
      description: 'Trajetos realizados',
      path: '/watch/logistica/rota',
      color: 'bg-purple-500/10 text-purple-500'
    },
  ];

  return (
    <div className="min-h-screen bg-background p-2 max-w-[200px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button 
          onClick={() => navigate('/watch')}
          className="p-1 rounded-full bg-muted/50 hover:bg-muted"
        >
          <ArrowLeft className="w-3 h-3" />
        </button>
        <span className="text-[10px] font-medium">Logística</span>
        <div className="w-5" />
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className="w-full bg-card rounded-xl p-3 border border-border/50 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <div className={`p-2 rounded-lg ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[11px] font-medium">{item.label}</div>
                <div className="text-[9px] text-muted-foreground">{item.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 bg-muted/30 rounded-lg p-2">
        <div className="text-[9px] font-medium mb-2">Resumo</div>
        <div className="grid grid-cols-3 gap-1 text-center">
          <div>
            <div className="text-sm font-bold text-green-500">8</div>
            <div className="text-[7px] text-muted-foreground">Online</div>
          </div>
          <div>
            <div className="text-sm font-bold text-yellow-500">2</div>
            <div className="text-[7px] text-muted-foreground">Parados</div>
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground">3</div>
            <div className="text-[7px] text-muted-foreground">Offline</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchLogisticaMenu;
