import { useState, useEffect } from 'react';
import { MessageSquare, Users, Clock, TrendingUp, Phone, ChevronLeft, ChevronRight } from 'lucide-react';

interface MetricCard {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

const WatchDashboard = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const metrics: MetricCard[] = [
    {
      id: 'conversas',
      label: 'Conversas',
      value: '24',
      icon: <MessageSquare className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 'clientes',
      label: 'Clientes',
      value: '156',
      icon: <Users className="w-6 h-6" />,
      color: 'from-green-500 to-green-600',
    },
    {
      id: 'tempo',
      label: 'Tempo Médio',
      value: '3m',
      icon: <Clock className="w-6 h-6" />,
      color: 'from-amber-500 to-amber-600',
    },
    {
      id: 'taxa',
      label: 'Taxa Resolução',
      value: '89%',
      icon: <TrendingUp className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      id: 'chamadas',
      label: 'Chamadas',
      value: '12',
      icon: <Phone className="w-6 h-6" />,
      color: 'from-rose-500 to-rose-600',
    },
  ];

  const nextMetric = () => {
    setCurrentIndex((prev) => (prev + 1) % metrics.length);
  };

  const prevMetric = () => {
    setCurrentIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
  };

  const currentMetric = metrics[currentIndex];

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });
  };

  return (
    <div className="watch-container">
      {/* Circular frame */}
      <div className="watch-frame">
        {/* Time display at top */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
          <span className="time-date">{formatDate(currentTime)}</span>
        </div>

        {/* Main metric display */}
        <div className="watch-metric">
          <div className={`metric-icon bg-gradient-to-br ${currentMetric.color}`}>
            {currentMetric.icon}
          </div>
          <div className="metric-value">{currentMetric.value}</div>
          <div className="metric-label">{currentMetric.label}</div>
        </div>

        {/* Navigation dots */}
        <div className="watch-dots">
          {metrics.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
        </div>

        {/* Touch areas for navigation */}
        <button
          onClick={prevMetric}
          className="nav-area nav-left"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-4 h-4 opacity-30" />
        </button>
        <button
          onClick={nextMetric}
          className="nav-area nav-right"
          aria-label="Próximo"
        >
          <ChevronRight className="w-4 h-4 opacity-30" />
        </button>
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
          top: 15%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
        }

        .time-main {
          font-size: clamp(14px, 5vw, 24px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 2px;
        }

        .time-date {
          font-size: clamp(10px, 3vw, 12px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        .watch-metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(8px, 3vw, 16px);
          z-index: 1;
        }

        .metric-icon {
          width: clamp(48px, 15vw, 72px);
          height: clamp(48px, 15vw, 72px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .metric-icon svg {
          width: clamp(24px, 8vw, 36px);
          height: clamp(24px, 8vw, 36px);
        }

        .metric-value {
          font-size: clamp(32px, 12vw, 56px);
          font-weight: 200;
          color: white;
          line-height: 1;
        }

        .metric-label {
          font-size: clamp(12px, 4vw, 16px);
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 2px;
        }

        .watch-dots {
          position: absolute;
          bottom: 18%;
          display: flex;
          gap: clamp(6px, 2vw, 10px);
        }

        .dot {
          width: clamp(6px, 2vw, 8px);
          height: clamp(6px, 2vw, 8px);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .dot.active {
          background: white;
          transform: scale(1.3);
        }

        .nav-area {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 20%;
          height: 40%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-left {
          left: 5%;
        }

        .nav-right {
          right: 5%;
        }

        .nav-area:active {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }

        /* Swipe support via touch */
        @media (hover: none) {
          .nav-area svg {
            opacity: 0 !important;
          }
        }

        /* Galaxy Watch specific adjustments */
        @media screen and (max-width: 450px) and (max-height: 450px) {
          .watch-frame {
            width: 100vw;
            height: 100vh;
            max-width: none;
            max-height: none;
            border-radius: 50%;
          }
        }

        /* For very small circular displays */
        @media screen and (max-width: 400px) {
          .watch-time {
            top: 12%;
          }
          
          .watch-dots {
            bottom: 15%;
          }
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
