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

  const sliceAngle = 360 / menuItems.length;

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Pizza slices */}
        <div className="pizza-container">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            const startAngle = index * sliceAngle - 90;
            const midAngle = startAngle + sliceAngle / 2;
            const iconRadius = 38;
            const iconX = 50 + iconRadius * Math.cos(midAngle * Math.PI / 180);
            const iconY = 50 + iconRadius * Math.sin(midAngle * Math.PI / 180);
            
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="pizza-slice"
                style={{ 
                  '--start-angle': `${startAngle}deg`,
                  '--slice-angle': `${sliceAngle}deg`,
                  '--item-color': item.color,
                  '--item-gradient': item.gradient,
                  clipPath: `polygon(50% 50%, ${50 + 50 * Math.cos((startAngle) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + sliceAngle * 0.25) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + sliceAngle * 0.25) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + sliceAngle * 0.5) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + sliceAngle * 0.5) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + sliceAngle * 0.75) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + sliceAngle * 0.75) * Math.PI / 180)}%, ${50 + 50 * Math.cos((startAngle + sliceAngle) * Math.PI / 180)}% ${50 + 50 * Math.sin((startAngle + sliceAngle) * Math.PI / 180)}%)`,
                } as React.CSSProperties}
              >
                <div 
                  className="slice-content"
                  style={{
                    left: `${iconX}%`,
                    top: `${iconY}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="slice-icon">
                    <Icon className="icon-size" />
                  </div>
                  <span className="slice-label">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center circle with time */}
        <div className="center-circle">
          <span className="time-main">{formatTime(currentTime)}</span>
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

        .pizza-container {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }

        .pizza-slice {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          background: var(--item-gradient);
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
          opacity: 0.85;
        }

        .pizza-slice::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: inherit;
          clip-path: inherit;
          border: 2px solid rgba(255, 255, 255, 0.15);
        }

        .pizza-slice:hover {
          opacity: 1;
          filter: brightness(1.2);
          z-index: 5;
        }

        .pizza-slice:active {
          filter: brightness(0.9);
          transform: scale(0.98);
        }

        .slice-content {
          position: absolute;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(4px, 1.5vw, 8px);
          pointer-events: none;
          z-index: 2;
        }

        .slice-icon {
          width: clamp(32px, 10vw, 48px);
          height: clamp(32px, 10vw, 48px);
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
        }

        .icon-size {
          width: clamp(16px, 5vw, 24px);
          height: clamp(16px, 5vw, 24px);
        }

        .slice-label {
          font-size: clamp(8px, 2.5vw, 12px);
          font-weight: 700;
          color: white;
          text-align: center;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
          white-space: nowrap;
        }

        .center-circle {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: clamp(70px, 22vw, 100px);
          height: clamp(70px, 22vw, 100px);
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #2a2a3e, #0a0a14);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(255, 255, 255, 0.2);
          box-shadow: 
            inset 0 0 30px rgba(0, 0, 0, 0.6),
            0 0 40px rgba(0, 0, 0, 0.5),
            0 0 0 2px rgba(255, 255, 255, 0.1);
          z-index: 10;
        }

        .time-main {
          font-size: clamp(16px, 5vw, 24px);
          font-weight: 700;
          color: white;
          letter-spacing: 1px;
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
