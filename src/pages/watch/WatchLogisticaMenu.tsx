import { useState, useEffect } from 'react';
import { ArrowLeft, Truck, Map, Route } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WatchLogisticaMenu = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const menuItems = [
    { 
      icon: Truck, 
      label: 'Veículos', 
      path: '/watch/logistica/veiculos',
      color: '#22c55e'
    },
    { 
      icon: Map, 
      label: 'Mapa', 
      path: '/watch/logistica/mapa',
      color: '#3b82f6'
    },
    { 
      icon: Route, 
      label: 'Rotas', 
      path: '/watch/logistica/rota',
      color: '#a855f7'
    },
  ];

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
        </div>

        {/* Back button */}
        <button onClick={() => navigate('/watch')} className="watch-back">
          <ArrowLeft className="w-4 h-4" />
        </button>

        {/* Title */}
        <div className="watch-title">
          <Truck className="w-5 h-5" />
          <span>Logística</span>
        </div>

        {/* Menu Items */}
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

        .watch-time {
          position: absolute;
          top: 6%;
          z-index: 1000;
        }

        .time-main {
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.7);
        }

        .watch-back {
          position: absolute;
          top: 5%;
          left: 20%;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 50%;
          width: clamp(24px, 7vw, 32px);
          height: clamp(24px, 7vw, 32px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          cursor: pointer;
        }

        .watch-title {
          display: flex;
          align-items: center;
          gap: 8px;
          color: white;
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 600;
          margin-bottom: 5%;
        }

        .menu-grid {
          display: flex;
          flex-direction: column;
          gap: clamp(8px, 3vw, 14px);
          width: 60%;
        }

        .menu-item {
          display: flex;
          align-items: center;
          gap: clamp(8px, 3vw, 14px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(10px, 3vw, 16px);
          padding: clamp(10px, 3vw, 16px);
          cursor: pointer;
          transition: all 0.2s;
          color: white;
        }

        .menu-item:active {
          transform: scale(0.95);
          background: rgba(255, 255, 255, 0.1);
        }

        .menu-icon {
          width: clamp(32px, 10vw, 44px);
          height: clamp(32px, 10vw, 44px);
          border-radius: 50%;
          background: color-mix(in srgb, var(--item-color) 20%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--item-color);
        }

        .menu-label {
          font-size: clamp(11px, 3.5vw, 15px);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};

export default WatchLogisticaMenu;
