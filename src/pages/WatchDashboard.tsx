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
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time Display */}
        <div className="time-display">
          <span className="time-main">{formatTime(currentTime)}</span>
          <span className="time-date">{formatDate(currentTime)}</span>
        </div>

        {/* Menu Grid */}
        <div className="menu-grid">
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

        .time-display {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 8%;
        }

        .time-main {
          font-size: clamp(24px, 8vw, 36px);
          font-weight: 300;
          color: white;
          letter-spacing: 2px;
        }

        .time-date {
          font-size: clamp(9px, 3vw, 12px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        .menu-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(8px, 3vw, 14px);
          width: 65%;
        }

        .menu-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(4px, 1.5vw, 8px);
          padding: clamp(8px, 3vw, 14px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(12px, 4vw, 20px);
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }

        .menu-item:active {
          transform: scale(0.92);
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-icon {
          width: clamp(28px, 9vw, 40px);
          height: clamp(28px, 9vw, 40px);
          border-radius: 50%;
          background: color-mix(in srgb, var(--item-color) 20%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--item-color);
        }

        .menu-label {
          font-size: clamp(8px, 2.5vw, 11px);
          font-weight: 500;
          color: rgba(255, 255, 255, 0.8);
        }

        /* Make last 2 items span nicely */
        .menu-item:nth-child(4) {
          grid-column: 1 / 2;
          margin-left: 50%;
        }

        .menu-item:nth-child(5) {
          grid-column: 3 / 4;
          margin-right: 50%;
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
