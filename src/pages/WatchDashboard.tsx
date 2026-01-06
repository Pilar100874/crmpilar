import { useState, useEffect } from 'react';
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
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/watch/dashboard' },
    { icon: Truck, label: 'Logística', path: '/watch/logistica' },
    { icon: Calendar, label: 'Agenda', path: '/watch/agenda' },
    { icon: ShoppingCart, label: 'Vendas', path: '/watch/vendas' },
    { icon: MessageSquare, label: 'Chats', path: '/watch/chats' },
  ];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="min-h-screen min-h-dvh flex items-center justify-center bg-sidebar p-0 m-0 overflow-hidden">
      <div 
        className="relative flex flex-col items-center justify-start overflow-hidden rounded-full"
        style={{ 
          width: 'min(100vw, 100vh)',
          height: 'min(100vw, 100vh)',
          maxWidth: '450px',
          maxHeight: '450px',
          background: 'radial-gradient(circle at 30% 30%, hsl(220 18% 22%), hsl(220 18% 16%))',
          boxShadow: 'inset 0 0 60px rgba(0, 0, 0, 0.4), 0 0 0 3px hsl(25 95% 53% / 0.3), 0 0 0 6px hsl(220 15% 18%)',
          padding: '10%',
        }}
      >
        {/* Header with time */}
        <div className="w-full text-center mb-2">
          <span 
            className="text-primary font-light tracking-widest"
            style={{ fontSize: 'clamp(28px, 9vw, 42px)' }}
          >
            {formatTime(currentTime)}
          </span>
          <p 
            className="text-sidebar-foreground/60 capitalize"
            style={{ fontSize: 'clamp(10px, 3vw, 14px)' }}
          >
            {formatDate(currentTime)}
          </p>
        </div>

        {/* Cards grid */}
        <div 
          className="grid grid-cols-2 w-full"
          style={{ 
            gap: 'clamp(6px, 2vw, 12px)',
            maxWidth: '260px',
          }}
        >
          {menuItems.slice(0, 4).map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="aspect-square rounded-xl border border-sidebar-border/50 flex flex-col items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
                style={{
                  background: 'linear-gradient(145deg, hsl(220 18% 24%), hsl(220 18% 18%))',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  gap: 'clamp(4px, 1.5vw, 8px)',
                }}
              >
                <div 
                  className="rounded-full bg-primary/20 flex items-center justify-center"
                  style={{
                    width: 'clamp(32px, 10vw, 44px)',
                    height: 'clamp(32px, 10vw, 44px)',
                  }}
                >
                  <Icon 
                    className="text-primary" 
                    style={{ width: 'clamp(16px, 5vw, 22px)', height: 'clamp(16px, 5vw, 22px)' }}
                    strokeWidth={1.5} 
                  />
                </div>
                <span 
                  className="text-sidebar-foreground/90 font-medium"
                  style={{ fontSize: 'clamp(9px, 2.8vw, 12px)' }}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom card - Chats */}
        <button
          onClick={() => navigate(menuItems[4].path)}
          className="mt-2 rounded-xl border border-sidebar-border/50 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 bg-gradient-primary"
          style={{
            width: 'clamp(100px, 35vw, 140px)',
            height: 'clamp(36px, 10vw, 48px)',
            boxShadow: '0 4px 16px hsl(25 95% 53% / 0.3)',
            gap: 'clamp(6px, 2vw, 10px)',
          }}
        >
          <MessageSquare 
            className="text-white" 
            style={{ width: 'clamp(14px, 4vw, 18px)', height: 'clamp(14px, 4vw, 18px)' }}
            strokeWidth={1.5} 
          />
          <span 
            className="text-white font-semibold"
            style={{ fontSize: 'clamp(10px, 3vw, 13px)' }}
          >
            Chats
          </span>
        </button>
      </div>
    </div>
  );
};

export default WatchDashboard;
