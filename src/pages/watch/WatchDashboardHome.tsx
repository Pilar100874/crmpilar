import { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, MessageSquare, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WatchDashboardHome = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const metrics = [
    { label: 'Vendas', value: 'R$ 12.5K', trend: '+12%', up: true, icon: DollarSign, color: '#22c55e' },
    { label: 'Pedidos', value: '47', trend: '+8%', up: true, icon: ShoppingCart, color: '#3b82f6' },
    { label: 'Clientes', value: '1.2K', trend: '+5%', up: true, icon: Users, color: '#a855f7' },
    { label: 'Chats', value: '23', trend: '-3%', up: false, icon: MessageSquare, color: '#ec4899' },
  ];

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

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

        {/* Refresh button */}
        <button onClick={handleRefresh} className="watch-refresh" disabled={isRefreshing}>
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>

        {/* Title */}
        <div className="watch-title">Dashboard</div>

        {/* Metrics Grid */}
        <div className="metrics-grid">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div 
                key={index}
                className="metric-card"
                style={{ '--metric-color': metric.color } as React.CSSProperties}
              >
                <div className="metric-header">
                  <Icon className="w-3 h-3" style={{ color: metric.color }} />
                  <span className="metric-label">{metric.label}</span>
                </div>
                <div className="metric-value">{metric.value}</div>
                <div className={`metric-trend ${metric.up ? 'up' : 'down'}`}>
                  {metric.up ? <TrendingUp className="w-2 h-2" /> : <TrendingDown className="w-2 h-2" />}
                  {metric.trend}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-header">
            <span>Meta diária</span>
            <span>78%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '78%' }} />
          </div>
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

        .watch-refresh {
          position: absolute;
          top: 5%;
          right: 20%;
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
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 600;
          color: white;
          margin-bottom: 4%;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: clamp(6px, 2vw, 10px);
          width: 65%;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(8px, 3vw, 14px);
          padding: clamp(8px, 2.5vw, 14px);
        }

        .metric-header {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 4px;
        }

        .metric-label {
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.5);
        }

        .metric-value {
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 700;
          color: white;
        }

        .metric-trend {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: clamp(7px, 2vw, 9px);
          font-weight: 500;
        }

        .metric-trend.up {
          color: #22c55e;
        }

        .metric-trend.down {
          color: #ef4444;
        }

        .progress-section {
          width: 65%;
          margin-top: 4%;
        }

        .progress-header {
          display: flex;
          justify-content: space-between;
          font-size: clamp(8px, 2.5vw, 10px);
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 4px;
        }

        .progress-bar {
          height: clamp(4px, 1.5vw, 6px);
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #3b82f6, #22c55e);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default WatchDashboardHome;
