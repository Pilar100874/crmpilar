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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/watch/dashboard', color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    { icon: Truck, label: 'Logística', path: '/watch/logistica', color: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
    { icon: Calendar, label: 'Agenda', path: '/watch/agenda', color: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
    { icon: ShoppingCart, label: 'Vendas', path: '/watch/vendas', color: '#f97316', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { icon: MessageSquare, label: 'Chats', path: '/watch/chats', color: '#ec4899', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
  ];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time Display at top */}
        <div className="time-display">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Full circular menu grid */}
        <div className="menu-circle">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const angle = (index * 72) - 90; // 360/5 = 72 degrees apart, starting from top
            const radius = 32; // percentage from center
            const x = 50 + radius * Math.cos(angle * Math.PI / 180);
            const y = 50 + radius * Math.sin(angle * Math.PI / 180);
            
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="menu-item-circle"
                style={{ 
                  '--item-color': item.color,
                  '--item-gradient': item.gradient,
                  left: `${x}%`,
                  top: `${y}%`,
                } as React.CSSProperties}
              >
                <div className="menu-icon-circle">
                  <Icon className="icon-size" />
                </div>
                <span className="menu-label-circle">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Center logo/brand */}
        <div className="center-brand">
          <div className="brand-ring"></div>
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
          background: radial-gradient(circle at 30% 30%, #1e1e32, #0a0a14);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 
            inset 0 0 80px rgba(0, 0, 0, 0.6),
            0 0 0 3px rgba(255, 255, 255, 0.1),
            0 0 0 5px #1a1a2e,
            0 0 30px rgba(0, 0, 0, 0.5);
          overflow: hidden;
        }

        .time-display {
          position: absolute;
          top: 8%;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          z-index: 10;
        }

        .time-main {
          font-size: clamp(14px, 4vw, 20px);
          font-weight: 600;
          color: white;
          letter-spacing: 1px;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(10px);
          padding: 4px 14px;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.15);
        }

        .menu-circle {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .menu-item-circle {
          position: absolute;
          transform: translate(-50%, -50%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(4px, 1.5vw, 8px);
          padding: clamp(10px, 3.5vw, 16px);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          color: white;
          width: clamp(60px, 20vw, 85px);
          height: clamp(60px, 20vw, 85px);
          justify-content: center;
          backdrop-filter: blur(8px);
        }

        .menu-item-circle:hover {
          background: rgba(255, 255, 255, 0.12);
          border-color: var(--item-color);
          box-shadow: 0 0 20px color-mix(in srgb, var(--item-color) 40%, transparent);
        }

        .menu-item-circle:active {
          transform: translate(-50%, -50%) scale(0.9);
          background: var(--item-gradient);
        }

        .menu-icon-circle {
          width: clamp(26px, 8vw, 36px);
          height: clamp(26px, 8vw, 36px);
          border-radius: 50%;
          background: var(--item-gradient);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px color-mix(in srgb, var(--item-color) 50%, transparent);
        }

        .icon-size {
          width: clamp(14px, 4vw, 18px);
          height: clamp(14px, 4vw, 18px);
        }

        .menu-label-circle {
          font-size: clamp(7px, 2.2vw, 10px);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
          white-space: nowrap;
        }

        .center-brand {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(50px, 16vw, 70px);
          height: clamp(50px, 16vw, 70px);
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #2a2a3e, #15152a);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid rgba(255, 255, 255, 0.1);
          box-shadow: 
            inset 0 0 20px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(0, 0, 0, 0.3);
        }

        .brand-ring {
          width: 60%;
          height: 60%;
          border-radius: 50%;
          border: 2px solid rgba(255, 255, 255, 0.2);
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(168, 85, 247, 0.3));
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
