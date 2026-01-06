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
    { icon: LayoutDashboard, path: '/watch/dashboard', color: '#3b82f6' },
    { icon: Truck, path: '/watch/logistica', color: '#22c55e' },
    { icon: Calendar, path: '/watch/agenda', color: '#a855f7' },
    { icon: ShoppingCart, path: '/watch/vendas', color: '#f97316' },
    { icon: MessageSquare, path: '/watch/chats', color: '#ec4899' },
  ];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Ring of icons */}
        <div className="icon-ring">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const angle = (index * (360 / menuItems.length)) - 90;
            const radius = 42;
            const x = 50 + radius * Math.cos(angle * Math.PI / 180);
            const y = 50 + radius * Math.sin(angle * Math.PI / 180);
            
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="ring-icon"
                style={{ 
                  '--icon-color': item.color,
                  left: `${x}%`,
                  top: `${y}%`,
                } as React.CSSProperties}
              >
                <Icon className="icon" />
              </button>
            );
          })}
        </div>

        {/* Center time display */}
        <div className="center-time">
          <span className="time">{formatTime(currentTime)}</span>
          <span className="date">{formatDate(currentTime)}</span>
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
          background: #0a0a0a;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 
            inset 0 0 100px rgba(255, 255, 255, 0.02),
            0 0 0 1px rgba(255, 255, 255, 0.05);
          overflow: hidden;
        }

        .icon-ring {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .ring-icon {
          position: absolute;
          transform: translate(-50%, -50%);
          width: clamp(44px, 14vw, 56px);
          height: clamp(44px, 14vw, 56px);
          border-radius: 50%;
          background: transparent;
          border: 1.5px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--icon-color);
        }

        .ring-icon:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: var(--icon-color);
          box-shadow: 0 0 20px color-mix(in srgb, var(--icon-color) 30%, transparent);
          transform: translate(-50%, -50%) scale(1.1);
        }

        .ring-icon:active {
          transform: translate(-50%, -50%) scale(0.95);
        }

        .icon {
          width: clamp(20px, 6vw, 26px);
          height: clamp(20px, 6vw, 26px);
          stroke-width: 1.5;
        }

        .center-time {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .time {
          font-size: clamp(36px, 12vw, 52px);
          font-weight: 200;
          color: white;
          letter-spacing: 2px;
          font-family: system-ui, -apple-system, sans-serif;
        }

        .date {
          font-size: clamp(11px, 3.5vw, 14px);
          font-weight: 400;
          color: rgba(255, 255, 255, 0.4);
          text-transform: capitalize;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
