import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Clock, CheckCircle, Circle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const WatchAgenda = () => {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const tasks = [
    { id: 1, title: 'Reunião cliente', time: '09:00', done: true },
    { id: 2, title: 'Follow-up vendas', time: '10:30', done: true },
    { id: 3, title: 'Ligação prospect', time: '14:00', done: false },
    { id: 4, title: 'Enviar proposta', time: '15:30', done: false },
    { id: 5, title: 'Visita técnica', time: '17:00', done: false },
  ];

  const completedCount = tasks.filter(t => t.done).length;

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

        {/* Header */}
        <div className="watch-header">
          <Calendar className="w-5 h-5 text-purple-500" />
          <div className="header-text">
            <span className="header-title">{format(new Date(), "EEEE", { locale: ptBR })}</span>
            <span className="header-date">{format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</span>
          </div>
          <div className="header-count">
            <span className="count-value">{completedCount}/{tasks.length}</span>
          </div>
        </div>

        {/* Tasks List */}
        <div className="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className={`task-item ${task.done ? 'done' : ''}`}>
              {task.done ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <Circle className="w-3 h-3 text-gray-500" />
              )}
              <div className="task-info">
                <span className="task-title">{task.title}</span>
                <span className="task-time">
                  <Clock className="w-2 h-2" />
                  {task.time}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div className="progress-section">
          <div className="progress-header">
            <span>Progresso</span>
            <span>{Math.round((completedCount / tasks.length) * 100)}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${(completedCount / tasks.length) * 100}%` }} />
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

        .watch-header {
          display: flex;
          align-items: center;
          gap: clamp(8px, 3vw, 14px);
          margin-bottom: 4%;
        }

        .header-text {
          display: flex;
          flex-direction: column;
        }

        .header-title {
          font-size: clamp(11px, 3.5vw, 15px);
          font-weight: 600;
          color: white;
          text-transform: capitalize;
        }

        .header-date {
          font-size: clamp(8px, 2.5vw, 11px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        .header-count {
          background: rgba(168, 85, 247, 0.2);
          padding: 4px 10px;
          border-radius: 12px;
        }

        .count-value {
          font-size: clamp(10px, 3vw, 14px);
          font-weight: 700;
          color: #a855f7;
        }

        .tasks-list {
          display: flex;
          flex-direction: column;
          gap: clamp(4px, 1.5vw, 8px);
          width: 65%;
          max-height: 45%;
          overflow-y: auto;
          scrollbar-width: none;
        }

        .tasks-list::-webkit-scrollbar {
          display: none;
        }

        .task-item {
          display: flex;
          align-items: center;
          gap: clamp(6px, 2vw, 10px);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: clamp(8px, 2.5vw, 12px);
          padding: clamp(8px, 2.5vw, 12px);
        }

        .task-item.done {
          opacity: 0.5;
        }

        .task-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .task-title {
          font-size: clamp(9px, 2.8vw, 12px);
          font-weight: 500;
          color: white;
        }

        .task-item.done .task-title {
          text-decoration: line-through;
        }

        .task-time {
          display: flex;
          align-items: center;
          gap: 3px;
          font-size: clamp(7px, 2vw, 9px);
          color: rgba(255, 255, 255, 0.4);
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
          background: #22c55e;
          border-radius: 10px;
          transition: width 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default WatchAgenda;
