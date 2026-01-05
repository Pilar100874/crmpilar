import { useState, useEffect } from 'react';
import { ArrowLeft, MessageSquare, Clock, User, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WatchChats = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const stats = {
    ativos: 12,
    aguardando: 5,
    resolvidos: 34,
  };

  const chats = [
    { id: 1, cliente: 'João Silva', mensagem: 'Preciso de ajuda...', time: '2m', unread: 3, status: 'aguardando' },
    { id: 2, cliente: 'Maria Santos', mensagem: 'Qual o prazo?', time: '5m', unread: 1, status: 'ativo' },
    { id: 3, cliente: 'Pedro Costa', mensagem: 'Obrigado!', time: '15m', unread: 0, status: 'ativo' },
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
        <div className="watch-title">
          <MessageSquare className="w-5 h-5 text-pink-500" />
          <span>Chats</span>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-box green">
            <span className="stat-value">{stats.ativos}</span>
            <span className="stat-label">Ativos</span>
          </div>
          <div className="stat-box yellow">
            <span className="stat-value">{stats.aguardando}</span>
            <span className="stat-label">Aguard.</span>
          </div>
          <div className="stat-box blue">
            <span className="stat-value">{stats.resolvidos}</span>
            <span className="stat-label">Resolv.</span>
          </div>
        </div>

        {/* Chats List */}
        <div className="chats-list">
          {chats.map((chat) => (
            <div key={chat.id} className="chat-item">
              <div className="chat-avatar">
                <User className="w-3 h-3" />
                <div className={`chat-status ${chat.status}`} />
              </div>
              <div className="chat-info">
                <div className="chat-header">
                  <span className="chat-cliente">{chat.cliente}</span>
                  <span className="chat-time">
                    <Clock className="w-2 h-2" />
                    {chat.time}
                  </span>
                </div>
                <span className="chat-mensagem">{chat.mensagem}</span>
              </div>
              {chat.unread > 0 && (
                <div className="chat-unread">{chat.unread}</div>
              )}
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

        .watch-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 600;
          color: white;
          margin-bottom: 4%;
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
          padding: clamp(8px, 2.5vw, 14px);
          border-radius: clamp(10px, 3vw, 16px);
          min-width: clamp(50px, 16vw, 70px);
        }

        .stat-box.green {
          background: rgba(34, 197, 94, 0.15);
        }

        .stat-box.green .stat-value {
          color: #22c55e;
        }

        .stat-box.yellow {
          background: rgba(251, 191, 36, 0.15);
        }

        .stat-box.yellow .stat-value {
          color: #fbbf24;
        }

        .stat-box.blue {
          background: rgba(59, 130, 246, 0.15);
        }

        .stat-box.blue .stat-value {
          color: #3b82f6;
        }

        .stat-value {
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 700;
        }

        .stat-label {
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.4);
        }

        .chats-list {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1.5vw, 8px);
          width: 65%;
        }

        .chat-item {
          display: flex;
          align-items: center;
          gap: clamp(8px, 2.5vw, 12px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(8px, 2.5vw, 12px);
          padding: clamp(8px, 2.5vw, 12px);
        }

        .chat-avatar {
          position: relative;
          width: clamp(24px, 8vw, 32px);
          height: clamp(24px, 8vw, 32px);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.6);
          flex-shrink: 0;
        }

        .chat-status {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: clamp(8px, 2.5vw, 10px);
          height: clamp(8px, 2.5vw, 10px);
          border-radius: 50%;
          border: 2px solid #1a1a2e;
        }

        .chat-status.aguardando {
          background: #fbbf24;
        }

        .chat-status.ativo {
          background: #22c55e;
        }

        .chat-info {
          flex: 1;
          min-width: 0;
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2px;
        }

        .chat-cliente {
          font-size: clamp(9px, 2.8vw, 12px);
          font-weight: 500;
          color: white;
        }

        .chat-time {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.4);
        }

        .chat-mensagem {
          font-size: clamp(8px, 2.2vw, 10px);
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          display: block;
        }

        .chat-unread {
          flex-shrink: 0;
          width: clamp(16px, 5vw, 22px);
          height: clamp(16px, 5vw, 22px);
          border-radius: 50%;
          background: #ec4899;
          color: white;
          font-size: clamp(8px, 2.2vw, 10px);
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};

export default WatchChats;
