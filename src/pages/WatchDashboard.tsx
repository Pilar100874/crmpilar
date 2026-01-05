import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard,
  Truck,
  Calendar,
  ShoppingCart,
  MessageSquare,
} from 'lucide-react';

const WatchDashboard = () => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/watch/dashboard', color: 'bg-blue-500/20 text-blue-500' },
    { icon: Truck, label: 'Logística', path: '/watch/logistica', color: 'bg-green-500/20 text-green-500' },
    { icon: Calendar, label: 'Agenda', path: '/watch/agenda', color: 'bg-purple-500/20 text-purple-500' },
    { icon: ShoppingCart, label: 'Vendas', path: '/watch/vendas', color: 'bg-orange-500/20 text-orange-500' },
    { icon: MessageSquare, label: 'Chats', path: '/watch/chats', color: 'bg-pink-500/20 text-pink-500' },
  ];

  const currentTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen bg-background p-3 flex flex-col max-w-[200px] mx-auto">
      {/* Time Display */}
      <div className="text-center mb-4">
        <div className="text-2xl font-bold">{currentTime}</div>
        <div className="text-[10px] text-muted-foreground capitalize">{currentDate}</div>
      </div>

      {/* Menu Grid */}
      <div className="flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-2">
          {menuItems.slice(0, 4).map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className={`${item.color} rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 hover:opacity-80 transition-opacity active:scale-95`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Last item centered */}
        <div className="mt-2 flex justify-center">
          {(() => {
            const LastIcon = menuItems[4].icon;
            return (
              <button
                onClick={() => navigate(menuItems[4].path)}
                className={`${menuItems[4].color} rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 hover:opacity-80 transition-opacity active:scale-95 w-[calc(50%-4px)]`}
              >
                <LastIcon className="w-5 h-5" />
                <span className="text-[9px] font-medium">{menuItems[4].label}</span>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Bottom indicator */}
      <div className="flex justify-center mt-4">
        <div className="w-8 h-1 rounded-full bg-muted" />
      </div>
    </div>
  );
};

export default WatchDashboard;
