import { useState, useEffect } from 'react';
import { ArrowLeft, DollarSign, TrendingUp, Package, Clock, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WatchVendas = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    totalHoje: 'R$ 15.8K',
    pedidosHoje: 23,
    ticketMedio: 'R$ 689',
    pendentes: 5,
  };

  const recentSales = [
    { id: 1, cliente: 'João Silva', valor: 'R$ 1.250', status: 'aprovado', time: '5m' },
    { id: 2, cliente: 'Maria Santos', valor: 'R$ 890', status: 'pendente', time: '12m' },
    { id: 3, cliente: 'Pedro Costa', valor: 'R$ 2.100', status: 'aprovado', time: '25m' },
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

        {/* Main Stat */}
        <div className="main-stat">
          <DollarSign className="w-5 h-5 text-green-500" />
          <div className="main-stat-value">{stats.totalHoje}</div>
          <div className="main-stat-trend">
            <TrendingUp className="w-3 h-3" />
            <span>+18% vs ontem</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="stats-row">
          <div className="stat-box">
            <Package className="w-3 h-3 text-blue-500" />
            <span className="stat-value">{stats.pedidosHoje}</span>
            <span className="stat-label">Pedidos</span>
          </div>
          <div className="stat-box">
            <DollarSign className="w-3 h-3 text-purple-500" />
            <span className="stat-value">{stats.ticketMedio}</span>
            <span className="stat-label">Ticket</span>
          </div>
          <div className="stat-box">
            <Clock className="w-3 h-3 text-yellow-500" />
            <span className="stat-value">{stats.pendentes}</span>
            <span className="stat-label">Pend.</span>
          </div>
        </div>

        {/* Recent Sales */}
        <div className="sales-list">
          {recentSales.map((sale) => (
            <div key={sale.id} className="sale-item">
              <div className="sale-info">
                <span className="sale-cliente">{sale.cliente}</span>
                <span className="sale-time">{sale.time}</span>
              </div>
              <div className="sale-right">
                <span className="sale-valor">{sale.valor}</span>
                <span className={`sale-status ${sale.status}`}>
                  {sale.status === 'aprovado' ? '✓' : '⏳'}
                </span>
              </div>
            </div>
          ))}
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

        .main-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 4%;
        }

        .main-stat-value {
          font-size: clamp(20px, 7vw, 32px);
          font-weight: 700;
          color: white;
          margin: 4px 0;
        }

        .main-stat-trend {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: clamp(8px, 2.5vw, 11px);
          color: #22c55e;
        }

        .stats-row {
          display: flex;
          gap: clamp(8px, 3vw, 14px);
          margin-bottom: 4%;
        }

        .stat-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(10px, 3vw, 16px);
          padding: clamp(8px, 2.5vw, 14px);
          min-width: clamp(50px, 16vw, 70px);
        }

        .stat-value {
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 700;
          color: white;
        }

        .stat-label {
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.4);
        }

        .sales-list {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1.5vw, 8px);
          width: 65%;
        }

        .sale-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(8px, 2.5vw, 12px);
          padding: clamp(8px, 2.5vw, 12px);
        }

        .sale-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .sale-cliente {
          font-size: clamp(9px, 2.8vw, 12px);
          font-weight: 500;
          color: white;
        }

        .sale-time {
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.4);
        }

        .sale-right {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .sale-valor {
          font-size: clamp(9px, 2.8vw, 12px);
          font-weight: 700;
          color: white;
        }

        .sale-status {
          font-size: clamp(10px, 3vw, 14px);
        }

        .sale-status.aprovado {
          color: #22c55e;
        }

        .sale-status.pendente {
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
};

export default WatchVendas;
