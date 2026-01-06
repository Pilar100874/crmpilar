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
    { icon: LayoutDashboard, label: 'Dashboard', path: '/watch/dashboard', gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
    { icon: Truck, label: 'Logística', path: '/watch/logistica', gradient: 'linear-gradient(135deg, #22c55e, #15803d)' },
    { icon: Calendar, label: 'Agenda', path: '/watch/agenda', gradient: 'linear-gradient(135deg, #a855f7, #7c3aed)' },
    { icon: ShoppingCart, label: 'Vendas', path: '/watch/vendas', gradient: 'linear-gradient(135deg, #f97316, #ea580c)' },
    { icon: MessageSquare, label: 'Chats', path: '/watch/chats', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' },
  ];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Header with time */}
        <div className="watch-header">
          <span className="time-display">{formatTime(currentTime)}</span>
        </div>

        {/* Cards grid */}
        <div className="cards-grid">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(item.path)}
                className="menu-card"
                style={{ background: item.gradient }}
              >
                <Icon className="card-icon" strokeWidth={1.5} />
                <span className="card-label">{item.label}</span>
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
          background: radial-gradient(circle at 30% 30%, #1a1a2e, #0a0a14);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          box-shadow: 
            inset 0 0 60px rgba(0, 0, 0, 0.5),
            0 0 0 3px rgba(255, 255, 255, 0.08),
            0 0 0 5px #1a1a2e;
          overflow: hidden;
          padding: 12%;
        }

        .watch-header {
          width: 100%;
          text-align: center;
          margin-bottom: 8%;
        }

        .time-display {
          font-size: clamp(24px, 8vw, 36px);
          font-weight: 200;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 2px;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(8px, 2.5vw, 14px);
          width: 100%;
          max-width: 280px;
        }

        .menu-card {
          aspect-ratio: 1;
          border-radius: clamp(12px, 4vw, 20px);
          border: none;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: clamp(4px, 1.5vw, 8px);
          transition: all 0.2s ease;
          box-shadow: 
            0 4px 20px rgba(0, 0, 0, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.2);
        }

        .menu-card:hover {
          transform: scale(1.05);
          box-shadow: 
            0 8px 30px rgba(0, 0, 0, 0.4),
            inset 0 1px 0 rgba(255, 255, 255, 0.3);
        }

        .menu-card:active {
          transform: scale(0.95);
        }

        .menu-card:nth-child(5) {
          grid-column: 1 / -1;
          max-width: 50%;
          justify-self: center;
          aspect-ratio: 2 / 1;
          flex-direction: row;
          gap: clamp(8px, 2vw, 12px);
        }

        .card-icon {
          width: clamp(20px, 6vw, 28px);
          height: clamp(20px, 6vw, 28px);
          color: white;
        }

        .card-label {
          font-size: clamp(9px, 2.8vw, 12px);
          font-weight: 600;
          color: white;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
