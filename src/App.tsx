import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Atendimento from "./pages/Atendimento";
import BotBuilder from "./pages/BotBuilder";
import BotTest from "./pages/BotTest";
import BotCreate from "./pages/BotCreate";
import Email from "./pages/Email";
import Campanhas from "./pages/Campanhas";
import Calendario from "./pages/Calendario";
import Funil from "./pages/Funil";
import Conteudos from "./pages/Conteudos";
import Contatos from "./pages/Contatos";
import Empresas from "./pages/Empresas";
import Todos from "./pages/Todos";
import VinculosEmpresas from "./pages/VinculosEmpresas";
import VinculosContatos from "./pages/VinculosContatos";
import Config from "./pages/Config";
import GlobalVariables from "./pages/GlobalVariables";
import Desenho from "./pages/Desenho";
import MarketingCanvas from "./pages/MarketingCanvas";
import MarketingAutomacoes from "./pages/MarketingAutomacoes";
import MarketingCampanhas from "./pages/MarketingCampanhas";
import ChatWebhook from "./pages/ChatWebhook";
import MeusTextosProntos from "./pages/MeusTextosProntos";
import MeusAnexos from "./pages/MeusAnexos";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoPublico from "./pages/OrcamentoPublico";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import Relatorios from "./pages/Relatorios";
import ImportacaoProdutos from "./pages/ImportacaoProdutos";
import ImportacaoProdutosLista from "./pages/ImportacaoProdutosLista";
import Softphone from "./pages/Softphone";
import VideoCall from "./pages/VideoCall";
import StimulsoftViewer from "./pages/StimulsoftViewer";
import ReportBroViewerPage from "./pages/ReportBroViewerPage";
import WebChat from "./pages/WebChat";
import ConfigSkills from "./pages/ConfigSkills";
import MonitorarFilas from "./pages/MonitorarFilas";
import DashboardAtendentePage from "./pages/DashboardAtendente";
import DashboardSupervisorPage from "./pages/DashboardSupervisor";
import OmnichannelBuilder from "./pages/OmnichannelBuilder";
import GerenciarAtalhos from "./pages/GerenciarAtalhos";
import Perfil from "./pages/Perfil";
import TestRoteamento from "./pages/TestRoteamento";
import SLADashboardPage from "./pages/SLADashboard";
import ConfigSLAPage from "./pages/ConfigSLA";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalytics";
import PesquisasSatisfacaoPage from "./pages/PesquisasSatisfacao";
import DashboardPesquisasSatisfacao from "./pages/DashboardPesquisasSatisfacao";
import DashboardGastosIA from "./pages/DashboardGastosIA";
import BaseConhecimento from "./pages/BaseConhecimento";
import QualityAssurance from "./pages/QualityAssurance";
import EditorRegras from "./pages/EditorRegras";
import AutomacoesVendas from "./pages/AutomacoesVendas";
import VendasConfig from "./pages/VendasConfig";
import MeusConjuntos from "./pages/MeusConjuntos";
import LogisticaDashboard from "./pages/LogisticaDashboard";
import LogisticaMonitoramento from "./pages/LogisticaMonitoramento";
import LogisticaVeiculos from "./pages/LogisticaVeiculos";
import LogisticaHistorico from "./pages/LogisticaHistorico";
import LogisticaRoteirizacao from "./pages/LogisticaRoteirizacao";
import LogisticaRotas from "./pages/LogisticaRotas";
import LogisticaConfig from "./pages/LogisticaConfig";
import LogisticaAutomacoes from "./pages/LogisticaAutomacoes";
import WhatsAppCatalogo from "./pages/WhatsAppCatalogo";
import MarketplaceHub from "./pages/MarketplaceHub";
import MarketplaceProdutos from "./pages/MarketplaceProdutos";
import MarketplacePedidos from "./pages/MarketplacePedidos";
import AdsDashboard from "./pages/ads/AdsDashboard";
import AdsCredentials from "./pages/ads/AdsCredentials";
import AdsLogs from "./pages/ads/AdsLogs";
import AdsAutomation from "./pages/ads/AdsAutomation";
import AdsPlatformDashboard from "./pages/ads/AdsPlatformDashboard";
import AdsCampaigns from "./pages/ads/AdsCampaigns";
import AdsReports from "./pages/ads/AdsReports";
import AdsAlerts from "./pages/ads/AdsAlerts";
import RoboPrecos from "./pages/RoboPrecos";
import AtendimentoConfig from "./pages/AtendimentoConfig";

const queryClient = new QueryClient();

// Layout wrapper component
const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route element={<LayoutWrapper />}>
          <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/atendimento" element={<Atendimento />} />
            <Route path="/email" element={<Email />} />
            <Route path="/email/:folder" element={<Email />} />
            <Route path="/bot-builder" element={<BotBuilder />} />
            <Route path="/bot-test" element={<BotTest />} />
            <Route path="/bot-create" element={<BotCreate />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/calendario" element={<Calendario />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/orcamentos" element={<Orcamentos />} />
            <Route path="/conteudos" element={<Conteudos />} />
            <Route path="/contatos" element={<Contatos />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/todos" element={<Todos />} />
            <Route path="/vinculos-empresas" element={<VinculosEmpresas />} />
            <Route path="/vinculos-contatos" element={<VinculosContatos />} />
            <Route path="/config" element={<Config />} />
            <Route path="/config/webhooks" element={<ChatWebhook />} />
            <Route path="/config/variaveis" element={<GlobalVariables />} />
            <Route path="/config/campanhas" element={<Campanhas />} />
            <Route path="/global-variables" element={<GlobalVariables />} />
            <Route path="/desenho" element={<Desenho />} />
            <Route path="/marketing/canvas" element={<MarketingCanvas />} />
            <Route path="/marketing/automacoes" element={<MarketingAutomacoes />} />
            <Route path="/marketing/campanhas" element={<MarketingCampanhas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/relatorios/viewer" element={<ReportBroViewerPage />} />
            <Route path="/importacao-produtos" element={<ImportacaoProdutosLista />} />
            <Route path="/importacao-produtos/novo" element={<ImportacaoProdutos />} />
            <Route path="/importacao-produtos/editar/:id" element={<ImportacaoProdutos />} />
            <Route path="/softphone" element={<Softphone />} />
            <Route path="/videocall" element={<VideoCall />} />
            <Route path="/chat-webhook" element={<ChatWebhook />} />
            <Route path="/meus-textos-prontos" element={<MeusTextosProntos />} />
            <Route path="/meus-anexos" element={<MeusAnexos />} />
            <Route path="/stimulsoft-viewer" element={<StimulsoftViewer />} />
            <Route path="/config/skills" element={<ConfigSkills />} />
            <Route path="/monitor-filas" element={<MonitorarFilas />} />
            <Route path="/omnichannel-builder" element={<OmnichannelBuilder />} />
            <Route path="/omnichannel-builder/:id" element={<OmnichannelBuilder />} />
            <Route path="/dashboard-atendente" element={<DashboardAtendentePage />} />
            <Route path="/dashboard-supervisor" element={<DashboardSupervisorPage />} />
            <Route path="/test-roteamento" element={<TestRoteamento />} />
            <Route path="/sla-dashboard" element={<SLADashboardPage />} />
            <Route path="/config/sla" element={<ConfigSLAPage />} />
            <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
            <Route path="/dashboard-pesquisas-satisfacao" element={<DashboardPesquisasSatisfacao />} />
            <Route path="/dashboard-gastos-ia" element={<DashboardGastosIA />} />
            <Route path="/pesquisas-satisfacao" element={<PesquisasSatisfacaoPage />} />
            <Route path="/base-conhecimento" element={<BaseConhecimento />} />
            <Route path="/quality-assurance" element={<QualityAssurance />} />
            <Route path="/automacoes-vendas" element={<AutomacoesVendas />} />
            <Route path="/editor-regras" element={<EditorRegras />} />
            <Route path="/editor-regras/:id" element={<EditorRegras />} />
            <Route path="/vendas-config" element={<VendasConfig />} />
            <Route path="/atendimento-config" element={<AtendimentoConfig />} />
            <Route path="/meus-conjuntos" element={<MeusConjuntos />} />
            <Route path="/gerenciar-atalhos" element={<GerenciarAtalhos />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route path="/logistica" element={<LogisticaDashboard />} />
            <Route path="/logistica/monitoramento" element={<LogisticaMonitoramento />} />
            <Route path="/logistica/veiculos" element={<LogisticaVeiculos />} />
            <Route path="/logistica/historico" element={<LogisticaHistorico />} />
            <Route path="/logistica/historico/:veiculoId" element={<LogisticaHistorico />} />
            <Route path="/logistica/roteirizacao" element={<LogisticaRoteirizacao />} />
            <Route path="/logistica/rotas" element={<LogisticaRotas />} />
            <Route path="/logistica/automacoes" element={<LogisticaAutomacoes />} />
            <Route path="/logistica/config" element={<LogisticaConfig />} />
            <Route path="/marketplaces" element={<MarketplaceHub />} />
            <Route path="/marketplaces/produtos" element={<MarketplaceProdutos />} />
            <Route path="/marketplaces/pedidos" element={<MarketplacePedidos />} />
            <Route path="/robo-precos" element={<RoboPrecos />} />
            <Route path="/whatsapp-catalogo" element={<WhatsAppCatalogo />} />
            {/* Ads Routes */}
            <Route path="/ads" element={<AdsDashboard />} />
            <Route path="/ads/campaigns" element={<AdsCampaigns />} />
            <Route path="/ads/reports" element={<AdsReports />} />
            <Route path="/ads/alerts" element={<AdsAlerts />} />
            <Route path="/ads/google" element={<AdsPlatformDashboard />} />
            <Route path="/ads/meta" element={<AdsPlatformDashboard />} />
            <Route path="/ads/tiktok" element={<AdsPlatformDashboard />} />
            <Route path="/ads/mercadolivre" element={<AdsPlatformDashboard />} />
            <Route path="/ads/amazon" element={<AdsPlatformDashboard />} />
            <Route path="/ads/credentials" element={<AdsCredentials />} />
            <Route path="/ads/logs" element={<AdsLogs />} />
            <Route path="/ads/automation" element={<AdsAutomation />} />
            <Route path="/ads/automation/:id" element={<AdsAutomation />} />
          </Route>
          {/* Public routes (no layout) */}
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
          <Route path="/webchat" element={<WebChat />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
