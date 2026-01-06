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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/watch/dashboard', color: '#3b82f6' },
    { icon: Truck, label: 'Logística', path: '/watch/logistica', color: '#22c55e' },
    { icon: Calendar, label: 'Agenda', path: '/watch/agenda', color: '#a855f7' },
    { icon: ShoppingCart, label: 'Vendas', path: '/watch/vendas', color: '#f97316' },
    { icon: MessageSquare, label: 'Chats', path: '/watch/chats', color: '#ec4899' },
  ];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Menu Items */}
        <div className="menu-list">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="menu-item"
                style={{ '--item-color': item.color } as React.CSSProperties}
              >
                <div className="menu-icon">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        .watch-container {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #000;
          padding: 0;
          margin: 0;
          overflow: hidden;
        }

        .watch-frame {
          width: min(100vw, 100vh);
          height: min(100vw, 100vh);
          max-width: 450px;
          max-height: 450px;
          border-radius: 50%;
          background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 0 0 4px #2a2a3e,
            0 0 0 6px #1a1a2e;
          overflow: hidden;
        }

        .watch-time {
          position: absolute;
          top: 8%;
          z-index: 1000;
        }

        .time-main {
          font-size: clamp(18px, 6vw, 28px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 2px;
        }

        .menu-list {
          display: flex;
          flex-direction: column;
          gap: clamp(6px, 2vw, 10px);
          width: 65%;
          max-height: 65%;
          overflow-y: auto;
          scrollbar-width: none;
          padding-top: 5%;
        }

        .menu-list::-webkit-scrollbar {
          display: none;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: clamp(10px, 3vw, 14px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(10px, 3vw, 16px);
          padding: clamp(10px, 3vw, 14px);
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }

        .menu-item:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-icon {
          width: clamp(36px, 11vw, 48px);
          height: clamp(36px, 11vw, 48px);
          border-radius: 50%;
          background: color-mix(in srgb, var(--item-color) 20%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--item-color);
          flex-shrink: 0;
        }

        .menu-label {
          font-size: clamp(12px, 4vw, 16px);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
