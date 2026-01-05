import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  Calendar,
  FileText,
  Mail,
  Target,
  Settings,
  Truck,
  Store,
  Megaphone,
  Bot,
  FileBarChart,
  Activity,
  Star,
  Brain,
  Clock,
  TrendingUp,
  Phone,
  ChevronLeft,
  ChevronRight,
  Home,
  Grid3X3,
} from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  url: string;
  badge?: string;
}

interface MetricItem {
  id: string;
  label: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

type ViewMode = 'grid' | 'carousel' | 'metrics';

const WatchDashboard = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [gridPage, setGridPage] = useState(0);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // All available menus
  const menus: MenuItem[] = [
    { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard />, color: 'from-blue-500 to-blue-600', url: '/dashboard' },
    { id: 'chats', label: 'Chats', icon: <MessageSquare />, color: 'from-green-500 to-green-600', url: '/atendimento', badge: '5' },
    { id: 'funil', label: 'Funil', icon: <Users />, color: 'from-purple-500 to-purple-600', url: '/funil' },
    { id: 'calendario', label: 'Calendário', icon: <Calendar />, color: 'from-amber-500 to-amber-600', url: '/calendario', badge: '3' },
    { id: 'vendas', label: 'Vendas', icon: <FileBarChart />, color: 'from-emerald-500 to-emerald-600', url: '/orcamentos' },
    { id: 'listas', label: 'Listas', icon: <FileText />, color: 'from-cyan-500 to-cyan-600', url: '/listas' },
    { id: 'email', label: 'E-mail', icon: <Mail />, color: 'from-red-500 to-red-600', url: '/email', badge: '12' },
    { id: 'marketing', label: 'Marketing', icon: <Target />, color: 'from-pink-500 to-pink-600', url: '/marketing' },
    { id: 'relatorios', label: 'Relatórios', icon: <FileText />, color: 'from-indigo-500 to-indigo-600', url: '/relatorios' },
    { id: 'logistica', label: 'Logística', icon: <Truck />, color: 'from-orange-500 to-orange-600', url: '/logistica' },
    { id: 'marketplaces', label: 'Lojas', icon: <Store />, color: 'from-teal-500 to-teal-600', url: '/marketplaces' },
    { id: 'ads', label: 'Ads', icon: <Megaphone />, color: 'from-violet-500 to-violet-600', url: '/ads' },
    { id: 'robo', label: 'Robô', icon: <Bot />, color: 'from-slate-500 to-slate-600', url: '/robo-precos' },
    { id: 'supervisor', label: 'Supervisor', icon: <Activity />, color: 'from-rose-500 to-rose-600', url: '/dashboard-supervisor' },
    { id: 'sla', label: 'SLA', icon: <Clock />, color: 'from-yellow-500 to-yellow-600', url: '/sla-dashboard' },
    { id: 'satisfacao', label: 'CSAT', icon: <Star />, color: 'from-lime-500 to-lime-600', url: '/dashboard-pesquisas-satisfacao' },
    { id: 'ia', label: 'IA', icon: <Brain />, color: 'from-fuchsia-500 to-fuchsia-600', url: '/dashboard-gastos-ia' },
    { id: 'config', label: 'Config', icon: <Settings />, color: 'from-gray-500 to-gray-600', url: '/config' },
  ];

  // Metrics for carousel view
  const metrics: MetricItem[] = [
    { id: 'conversas', label: 'Conversas', value: '24', icon: <MessageSquare className="w-6 h-6" />, color: 'from-blue-500 to-blue-600' },
    { id: 'clientes', label: 'Clientes', value: '156', icon: <Users className="w-6 h-6" />, color: 'from-green-500 to-green-600' },
    { id: 'tempo', label: 'Tempo Médio', value: '3m', icon: <Clock className="w-6 h-6" />, color: 'from-amber-500 to-amber-600' },
    { id: 'taxa', label: 'Resolução', value: '89%', icon: <TrendingUp className="w-6 h-6" />, color: 'from-purple-500 to-purple-600' },
    { id: 'chamadas', label: 'Chamadas', value: '12', icon: <Phone className="w-6 h-6" />, color: 'from-rose-500 to-rose-600' },
    { id: 'vendas', label: 'Vendas', value: 'R$5k', icon: <FileBarChart className="w-6 h-6" />, color: 'from-emerald-500 to-emerald-600' },
    { id: 'emails', label: 'E-mails', value: '47', icon: <Mail className="w-6 h-6" />, color: 'from-red-500 to-red-600' },
    { id: 'tarefas', label: 'Tarefas', value: '8', icon: <Calendar className="w-6 h-6" />, color: 'from-cyan-500 to-cyan-600' },
  ];

  const itemsPerPage = 9; // 3x3 grid
  const totalPages = Math.ceil(menus.length / itemsPerPage);
  const currentMenus = menus.slice(gridPage * itemsPerPage, (gridPage + 1) * itemsPerPage);

  const nextMetric = () => setCurrentIndex((prev) => (prev + 1) % metrics.length);
  const prevMetric = () => setCurrentIndex((prev) => (prev - 1 + metrics.length) % metrics.length);
  const nextPage = () => setGridPage((prev) => (prev + 1) % totalPages);
  const prevPage = () => setGridPage((prev) => (prev - 1 + totalPages) % totalPages);

  const currentMetric = metrics[currentIndex];

  const formatTime = (date: Date) => date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) => date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' });

  const handleMenuClick = (url: string) => {
    // For logistica, redirect to watch version
    if (url === '/logistica') {
      navigate('/watch/logistica/veiculos');
    } else {
      navigate(url);
    }
  };

  const cycleViewMode = () => {
    const modes: ViewMode[] = ['grid', 'carousel', 'metrics'];
    const currentIdx = modes.indexOf(viewMode);
    setViewMode(modes[(currentIdx + 1) % modes.length]);
  };

  return (
    <div className="watch-container">
      <div className="watch-frame">
        {/* Time display at top */}
        <div className="watch-time">
          <span className="time-main">{formatTime(currentTime)}</span>
          <span className="time-date">{formatDate(currentTime)}</span>
        </div>

        {/* Grid View - Maximum menus visible */}
        {viewMode === 'grid' && (
          <div className="watch-grid">
            {currentMenus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => handleMenuClick(menu.url)}
                className={`grid-item bg-gradient-to-br ${menu.color}`}
              >
                <div className="grid-icon">{menu.icon}</div>
                <span className="grid-label">{menu.label}</span>
                {menu.badge && <span className="grid-badge">{menu.badge}</span>}
              </button>
            ))}
          </div>
        )}

        {/* Carousel View - One metric at a time */}
        {viewMode === 'carousel' && (
          <div className="watch-metric">
            <div className={`metric-icon bg-gradient-to-br ${currentMetric.color}`}>
              {currentMetric.icon}
            </div>
            <div className="metric-value">{currentMetric.value}</div>
            <div className="metric-label">{currentMetric.label}</div>
          </div>
        )}

        {/* Metrics Grid View - Compact metrics */}
        {viewMode === 'metrics' && (
          <div className="metrics-grid">
            {metrics.slice(0, 6).map((metric) => (
              <div key={metric.id} className={`metrics-item bg-gradient-to-br ${metric.color}`}>
                <div className="metrics-icon">{metric.icon}</div>
                <div className="metrics-value">{metric.value}</div>
                <div className="metrics-label">{metric.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation dots / page indicator */}
        <div className="watch-dots">
          {viewMode === 'grid' && Array.from({ length: totalPages }).map((_, index) => (
            <button
              key={index}
              onClick={() => setGridPage(index)}
              className={`dot ${index === gridPage ? 'active' : ''}`}
            />
          ))}
          {viewMode === 'carousel' && metrics.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`dot ${index === currentIndex ? 'active' : ''}`}
            />
          ))}
          {viewMode === 'metrics' && (
            <span className="view-label">Métricas</span>
          )}
        </div>

        {/* Navigation areas */}
        {viewMode === 'carousel' && (
          <>
            <button onClick={prevMetric} className="nav-area nav-left" aria-label="Anterior">
              <ChevronLeft className="w-4 h-4 opacity-30" />
            </button>
            <button onClick={nextMetric} className="nav-area nav-right" aria-label="Próximo">
              <ChevronRight className="w-4 h-4 opacity-30" />
            </button>
          </>
        )}
        {viewMode === 'grid' && totalPages > 1 && (
          <>
            <button onClick={prevPage} className="nav-area nav-left" aria-label="Página anterior">
              <ChevronLeft className="w-4 h-4 opacity-30" />
            </button>
            <button onClick={nextPage} className="nav-area nav-right" aria-label="Próxima página">
              <ChevronRight className="w-4 h-4 opacity-30" />
            </button>
          </>
        )}

        {/* Mode toggle button */}
        <button onClick={cycleViewMode} className="mode-toggle">
          {viewMode === 'grid' && <Home className="w-4 h-4" />}
          {viewMode === 'carousel' && <Grid3X3 className="w-4 h-4" />}
          {viewMode === 'metrics' && <Activity className="w-4 h-4" />}
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
          top: 8%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1px;
          z-index: 10;
        }

        .time-main {
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 1px;
        }

        .time-date {
          font-size: clamp(8px, 2.5vw, 10px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: capitalize;
        }

        /* Grid View Styles */
        .watch-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(4px, 1.5vw, 8px);
          padding: clamp(4px, 2vw, 12px);
          width: 75%;
          margin-top: 8%;
        }

        .grid-item {
          aspect-ratio: 1;
          border-radius: clamp(8px, 3vw, 14px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          border: none;
          cursor: pointer;
          position: relative;
          transition: transform 0.2s, box-shadow 0.2s;
          padding: clamp(2px, 1vw, 6px);
        }

        .grid-item:active {
          transform: scale(0.95);
        }

        .grid-icon {
          color: white;
          opacity: 0.95;
        }

        .grid-icon svg {
          width: clamp(14px, 4.5vw, 22px);
          height: clamp(14px, 4.5vw, 22px);
        }

        .grid-label {
          font-size: clamp(6px, 2vw, 9px);
          color: white;
          font-weight: 500;
          text-align: center;
          line-height: 1.1;
          opacity: 0.9;
        }

        .grid-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          font-size: clamp(6px, 1.8vw, 8px);
          font-weight: 600;
          padding: 1px 4px;
          border-radius: 999px;
          min-width: 14px;
          text-align: center;
        }

        /* Metrics Grid View */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          grid-template-rows: repeat(2, 1fr);
          gap: clamp(6px, 2vw, 10px);
          width: 80%;
          margin-top: 8%;
        }

        .metrics-item {
          border-radius: clamp(8px, 3vw, 12px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: clamp(6px, 2vw, 12px);
        }

        .metrics-icon {
          color: white;
          opacity: 0.9;
        }

        .metrics-icon svg {
          width: clamp(12px, 4vw, 18px);
          height: clamp(12px, 4vw, 18px);
        }

        .metrics-value {
          font-size: clamp(12px, 4vw, 18px);
          font-weight: 600;
          color: white;
          line-height: 1;
        }

        .metrics-label {
          font-size: clamp(6px, 2vw, 8px);
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
        }

        /* Carousel View (original single metric) */
        .watch-metric {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: clamp(8px, 3vw, 16px);
          z-index: 1;
          margin-top: 5%;
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

        /* Navigation */
        .watch-dots {
          position: absolute;
          bottom: 12%;
          display: flex;
          gap: clamp(4px, 1.5vw, 8px);
          align-items: center;
        }

        .dot {
          width: clamp(5px, 1.5vw, 7px);
          height: clamp(5px, 1.5vw, 7px);
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

        .view-label {
          font-size: clamp(8px, 2.5vw, 10px);
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .nav-area {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 15%;
          height: 35%;
          background: transparent;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          -webkit-tap-highlight-color: transparent;
        }

        .nav-left { left: 3%; }
        .nav-right { right: 3%; }

        .nav-area:active {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 50%;
        }

        .mode-toggle {
          position: absolute;
          bottom: 5%;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          width: clamp(28px, 8vw, 36px);
          height: clamp(28px, 8vw, 36px);
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
          transition: all 0.2s;
        }

        .mode-toggle:active {
          background: rgba(255, 255, 255, 0.2);
          transform: scale(0.95);
        }

        .mode-toggle svg {
          width: clamp(14px, 4vw, 18px);
          height: clamp(14px, 4vw, 18px);
        }

        /* Touch support */
        @media (hover: none) {
          .nav-area svg { opacity: 0 !important; }
        }

        /* Galaxy Watch / small circular displays */
        @media screen and (max-width: 450px) and (max-height: 450px) {
          .watch-frame {
            width: 100vw;
            height: 100vh;
            max-width: none;
            max-height: none;
          }
        }

        @media screen and (max-width: 350px) {
          .watch-time { top: 6%; }
          .watch-dots { bottom: 10%; }
          .mode-toggle { bottom: 3%; }
        }
      `}</style>
    </div>
  );
};

export default WatchDashboard;
