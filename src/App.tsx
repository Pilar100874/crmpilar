import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import ScrollToTop from "./components/ScrollToTop";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Atendimento from "./pages/Atendimento";
import BotBuilder from "./pages/BotBuilder";
import BotTest from "./pages/BotTest";
import BotCreate from "./pages/BotCreate";
import Email from "./pages/Email";
import EmailPage from "./pages/EmailPage";
import Campanhas from "./pages/Campanhas";
import Calendario from "./pages/Calendario";
import CalendarioConfig from "./pages/CalendarioConfig";
import Funil from "./pages/Funil";
import Conteudos from "./pages/Conteudos";
import Contatos from "./pages/Contatos";
import Empresas from "./pages/Empresas";
import Todos from "./pages/Todos";
import VinculosEmpresas from "./pages/VinculosEmpresas";
import VinculosContatos from "./pages/VinculosContatos";
import ListasHub from "./pages/ListasHub";
import Config from "./pages/Config";
import SystemVisualConfig from "./pages/SystemVisualConfig";
import SystemThemeLoader from "./components/SystemThemeLoader";
import BackgroundLocationManager from "./components/BackgroundLocationManager";
import GlobalVariables from "./pages/GlobalVariables";
import Desenho from "./pages/Desenho";
import MarketingHub from "./pages/MarketingHub";
import AutoVideoWizardPage from "./pages/AutoVideoWizardPage";
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
import PontoLayout from "./pages/ponto/PontoLayout";
import PontoDashboard from "./pages/ponto/PontoDashboard";
import PontoEmpresas from "./pages/ponto/PontoEmpresas";
import PontoFiliais from "./pages/ponto/PontoFiliais";
import PontoDepartamentos from "./pages/ponto/PontoDepartamentos";
import PontoCargos from "./pages/ponto/PontoCargos";
import PontoEquipes from "./pages/ponto/PontoEquipes";
import PontoFuncionarios from "./pages/ponto/PontoFuncionarios";
import PontoFuncionarioMetodos from "./pages/ponto/PontoFuncionarioMetodos";
import PontoEscalas from "./pages/ponto/PontoEscalas";
import PontoRegistro from "./pages/ponto/PontoRegistro";
import PontoTratamento from "./pages/ponto/PontoTratamento";
import PontoAjustes from "./pages/ponto/PontoAjustes";
import PontoEspelho from "./pages/ponto/PontoEspelho";
import PontoEquipamentos from "./pages/ponto/PontoEquipamentos";
import PontoExportacao from "./pages/ponto/PontoExportacao";
import PontoLayoutsExportacao from "./pages/ponto/PontoLayoutsExportacao";
import PontoAlertas from "./pages/ponto/PontoAlertas";
import PontoAuditoria from "./pages/ponto/PontoAuditoria";
import PontoColetorDownload from "./pages/ponto/PontoColetorDownload";
import AdminApps from "./pages/AdminApps";
import ConfigNotificacoesPush from "./pages/ConfigNotificacoesPush";
import PontoConfig from "./pages/ponto/PontoConfig";
import PontoConfigWizard from "./pages/ponto/PontoConfigWizard";

import PontoAntifraudeConfig from "./pages/ponto/PontoAntifraudeConfig";
import PontoAssistente from "./pages/ponto/PontoAssistente";
import PontoPortalFuncionario from "./pages/ponto/PontoPortalFuncionario";
import PontoPredicoes from "./pages/ponto/PontoPredicoes";
import PontoSimulador from "./pages/ponto/PontoSimulador";
import PontoMapaEquipes from "./pages/ponto/PontoMapaEquipes";
import PontoForaGeofence from "./pages/ponto/PontoForaGeofence";
import PontoQrCodeTotem from "./pages/ponto/PontoQrCodeTotem";
import PontoAtestadosAdmin from "./pages/ponto/PontoAtestadosAdmin";
import PontoFechamento from "./pages/ponto/PontoFechamento";
import PontoPreFechamento from "./pages/ponto/PontoPreFechamento";
import PontoBancoHoras from "./pages/ponto/PontoBancoHoras";
import PontoFerias from "./pages/ponto/PontoFerias";
import PontoAFD from "./pages/ponto/PontoAFD";
import EspelhoFuncionario from "./pages/ponto/EspelhoFuncionario";
import PontoTotem from "./pages/ponto/PontoTotem";
import PontoEsocial from "./pages/ponto/PontoEsocial";
import PontoImportacao from "./pages/ponto/PontoImportacao";
import PontoImportarAFD from "./pages/ponto/PontoImportarAFD";
import PontoFaceEnroll from "./pages/ponto/PontoFaceEnroll";
import PontoSugerirEscala from "./pages/ponto/PontoSugerirEscala";
import PontoDashboardExecutivo from "./pages/ponto/PontoDashboardExecutivo";
import PontoAprovacoes from "./pages/ponto/PontoAprovacoes";
import PontoWebhookCatracas from "./pages/ponto/PontoWebhookCatracas";
import PontoCltConfig from "./pages/ponto/PontoCltConfig";
import PontoAnomalias from "./pages/ponto/PontoAnomalias";
import PontoCompliance from "./pages/ponto/PontoCompliance";
import PontoAprovacaoRegras from "./pages/ponto/PontoAprovacaoRegras";
import PontoSobreaviso from "./pages/ponto/PontoSobreaviso";
import PontoDSR from "./pages/ponto/PontoDSR";
import PontoLGPDPortal from "./pages/ponto/PontoLGPDPortal";
import PontoEsocialFila from "./pages/ponto/PontoEsocialFila";
import PontoAcordosColetivos from "./pages/ponto/PontoAcordosColetivos";
import PontoCompensacao from "./pages/ponto/PontoCompensacao";
import PontoCompensacaoVotacao from "./pages/ponto/PontoCompensacaoVotacao";
import PontoBancoHorasExpirar from "./pages/ponto/PontoBancoHorasExpirar";
import PontoNotificacoes from "./pages/ponto/PontoNotificacoes";
import PontoNotificacaoBuilder from "./pages/ponto/PontoNotificacaoBuilder";
import PontoNotificacoesEntregabilidade from "./pages/ponto/PontoNotificacoesEntregabilidade";
import PontoManual from "./pages/ponto/PontoManual";
import CVLayout from "./pages/controle-veiculos/CVLayout";
import CVDashboard from "./pages/controle-veiculos/CVDashboard";
import CVVehicles from "./pages/controle-veiculos/CVVehicles";
import CVDrivers from "./pages/controle-veiculos/CVDrivers";
import CVVehicleExit from "./pages/controle-veiculos/CVVehicleExit";
import CVVehicleEntry from "./pages/controle-veiculos/CVVehicleEntry";
import CVMovements from "./pages/controle-veiculos/CVMovements";
import CVDefects from "./pages/controle-veiculos/CVDefects";
import CVDefectTypes from "./pages/controle-veiculos/CVDefectTypes";
import CVMaintenance from "./pages/controle-veiculos/CVMaintenance";
import CVInspectionConfig from "./pages/controle-veiculos/CVInspectionConfig";
import CVHelpers from "./pages/controle-veiculos/CVHelpers";
import CVCameras from "./pages/controle-veiculos/CVCameras";
import CVVehicleHistory from "./pages/controle-veiculos/CVVehicleHistory";
import CVisLayout from "./pages/controle-visitantes/CVisLayout";
import CVisDashboard from "./pages/controle-visitantes/CVisDashboard";
import CVisEntrada from "./pages/controle-visitantes/CVisEntrada";
import CVisPresentes from "./pages/controle-visitantes/CVisPresentes";
import CVisAutorizacoes from "./pages/controle-visitantes/CVisAutorizacoes";
import CVisRelatorios from "./pages/controle-visitantes/CVisRelatorios";
import CVisVisitantes from "./pages/controle-visitantes/CVisVisitantes";
import CVisContatos from "./pages/controle-visitantes/CVisContatos";
import CamerasLayout from "./pages/cameras/CamerasLayout";
import CamerasDashboard from "./pages/cameras/CamerasDashboard";
import CamerasGrupos from "./pages/cameras/CamerasGrupos";
import CamerasCameras from "./pages/cameras/CamerasCameras";
import CamerasAoVivo from "./pages/cameras/CamerasAoVivo";
import EditoresLayout from "./pages/editores/EditoresLayout";
import EditoresHub from "./pages/editores/EditoresHub";
import ModeloEditor from "./pages/editores/ModeloEditor";
import DocumentoEditor from "./pages/editores/DocumentoEditor";
import ModelosLista from "./pages/editores/ModelosLista";
import DocumentosGerados from "./pages/editores/DocumentosGerados";
import GerarDocumento from "./pages/editores/GerarDocumento";


import ChatInterno from "./pages/ChatInterno";
import ConfigSkills from "./pages/ConfigSkills";
import MonitorarFilas from "./pages/MonitorarFilas";
import MonitorFuncionarios from "./pages/MonitorFuncionarios";
import DashboardAtendentePage from "./pages/DashboardAtendente";
import DashboardSupervisorPage from "./pages/DashboardSupervisor";
import OmnichannelBuilder from "./pages/OmnichannelBuilder";
import GerenciarAtalhos from "./pages/GerenciarAtalhos";
import Perfil from "./pages/Perfil";
import CompartilharTela from "./pages/CompartilharTela";
import TestRoteamento from "./pages/TestRoteamento";
import SLADashboardPage from "./pages/SLADashboard";
import ConfigSLAPage from "./pages/ConfigSLA";
import AdvancedAnalyticsPage from "./pages/AdvancedAnalytics";
import PesquisasSatisfacaoPage from "./pages/PesquisasSatisfacao";
import DashboardPesquisasSatisfacao from "./pages/DashboardPesquisasSatisfacao";
import SupportTickets from "./pages/SupportTickets";
import MeusTickets from "./pages/MeusTickets";


import QualityAssurance from "./pages/QualityAssurance";
import EditorRegras from "./pages/EditorRegras";
import AutomacoesVendas from "./pages/AutomacoesVendas";
import RoteirizadorVisitas from "./pages/RoteirizadorVisitas";
import ProgramacaoVisitas from "./pages/ProgramacaoVisitas";
import AcompanhamentoVisitas from "./pages/AcompanhamentoVisitas";
import FormulariosVisita from "./pages/FormulariosVisita";
import RegrasFormularioVisita from "./pages/RegrasFormularioVisita";
import ConfigRegrasMonitoramentoVisita from "./pages/ConfigRegrasMonitoramentoVisita";
import VendasConfig from "./pages/VendasConfig";
import MeusConjuntos from "./pages/MeusConjuntos";
import LogisticaHub from "./pages/LogisticaHub";
import LogisticaDashboard from "./pages/LogisticaDashboard";
import LogisticaMonitoramento from "./pages/LogisticaMonitoramento";
import LogisticaVeiculos from "./pages/LogisticaVeiculos";
import LogisticaHistorico from "./pages/LogisticaHistorico";
import LogisticaRoteirizacao from "./pages/LogisticaRoteirizacao";
import LogisticaRotas from "./pages/LogisticaRotas";
import LogisticaConfig from "./pages/LogisticaConfig";
import LogisticaAutomacoes from "./pages/LogisticaAutomacoes";
import PilarRastreador from "./pages/PilarRastreador";
import PedidosRecebidos from "./pages/PedidosRecebidos";
import PilarRastreadorNativo from "./pages/PilarRastreadorNativo";
import WhatsAppCatalogo from "./pages/WhatsAppCatalogo";
import MarketplacesHubPage from "./pages/MarketplacesHubPage";
import AdsDashboard from "./pages/ads/AdsDashboard";
import AdsCredentials from "./pages/ads/AdsCredentials";
import AdsLogs from "./pages/ads/AdsLogs";
import AdsAutomation from "./pages/ads/AdsAutomation";
import AdsPlatformDashboard from "./pages/ads/AdsPlatformDashboard";
import AdsCampaigns from "./pages/ads/AdsCampaigns";
import AdsReports from "./pages/ads/AdsReports";
import AdsAlerts from "./pages/ads/AdsAlerts";
import AdsHub from "./pages/AdsHub";
import RoboPrecos from "./pages/RoboPrecos";
import AtendimentoConfig from "./pages/AtendimentoConfig";
import RailwayEnvVariables from "./pages/RailwayEnvVariables";
import LandingPage from "./pages/LandingPage";
import Splash from "./pages/Splash";
import Avisos from "./pages/Avisos";
import EmailConfig from "./pages/EmailConfig";
import OrcamentoReportConfig from "./pages/OrcamentoReportConfig";
import Macros from "./pages/Macros";
import AgentChat from "./pages/AgentChat";
import ContagemDashboard from "./pages/contagem/ContagemDashboard";
import NovaContagem from "./pages/contagem/NovaContagem";
import ResultadoContagem from "./pages/contagem/ResultadoContagem";

import WatchDashboard from "./pages/WatchDashboard";
import WatchDashboardHome from "./pages/watch/WatchDashboardHome";
import WatchAgenda from "./pages/watch/WatchAgenda";
import WatchVendas from "./pages/watch/WatchVendas";
import WatchChats from "./pages/watch/WatchChats";
import WatchLogisticaMenu from "./pages/watch/WatchLogisticaMenu";
import WatchLogisticaVeiculos from "./pages/watch/WatchLogisticaVeiculos";
import WatchLogisticaMapa from "./pages/watch/WatchLogisticaMapa";
import WatchLogisticaRota from "./pages/watch/WatchLogisticaRota";
import WatchLogisticaHistorico from "./pages/watch/WatchLogisticaHistorico";
import TvDashboardVendas from "./pages/TvDashboardVendas";
import TvDashboardVeiculos from "./pages/TvDashboardVeiculos";
import PublicPage from "./pages/PublicPage";
import EcommerceLayout from "./components/ecommerce/EcommerceLayout";
import EcommerceHome from "./pages/ecommerce/EcommerceHome";
import EcommerceCatalog from "./pages/ecommerce/EcommerceCatalog";
import EcommerceProduct from "./pages/ecommerce/EcommerceProduct";
import EcommerceCart from "./pages/ecommerce/EcommerceCart";
import EcommerceQuoteRequest from "./pages/ecommerce/EcommerceQuoteRequest";
import EcommerceCheckout from "./pages/ecommerce/EcommerceCheckout";
import EcommerceB2B from "./pages/ecommerce/EcommerceB2B";
import EcommerceAccount from "./pages/ecommerce/EcommerceAccount";
import EcommerceInstitutional from "./pages/ecommerce/EcommerceInstitutional";
import EcommerceDenunciasConfig from "./pages/ecommerce/EcommerceDenunciasConfig";
import EcommerceLGPDConfig from "./pages/ecommerce/EcommerceLGPDConfig";
import EcommerceDenuncias from "./pages/ecommerce/EcommerceDenuncias";
import EcommerceLGPD from "./pages/ecommerce/EcommerceLGPD";
import EcommerceWishlist from "./pages/ecommerce/EcommerceWishlist";
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { QuoteRequestProvider } from "./contexts/QuoteRequestContext";
import PaymentGatewaysConfig from "./pages/PaymentGatewaysConfig";
import EcommerceRulesPage from "./pages/EcommerceRulesPage";
import EcommerceRulesEditor from "./pages/EcommerceRulesEditor";
import PedidoTracking from "./pages/PedidoTracking";
import RastreioPedido from "./pages/RastreioPedido";
import EcommerceConfigHub from "./pages/ecommerce/EcommerceConfigHub";
import EcommerceBrandingConfig from "./pages/ecommerce/EcommerceBrandingConfig";
import EcommerceContentEditor from "./pages/ecommerce/EcommerceContentEditor";
import EcommerceAdsManager from "./pages/ecommerce/EcommerceAdsManager";
import EcommerceFooterEditor from "./pages/ecommerce/EcommerceFooterEditor";
import EcommerceHomeEditor from "./pages/ecommerce/EcommerceHomeEditor";
import EcommerceFeaturesEditor from "./pages/ecommerce/EcommerceFeaturesEditor";
import EcommerceVolumePricing from "./pages/ecommerce/EcommerceVolumePricing";
import EcommerceCuponsPage from "./pages/ecommerce/EcommerceCuponsPage";
import EcommerceB2BEditor from "./pages/ecommerce/EcommerceB2BEditor";
import EcommerceNewsletterPage from "./pages/ecommerce/EcommerceNewsletterPage";
import EcommerceMapaCalor from "./pages/ecommerce/EcommerceMapaCalor";
import MapaCalorSistema from "./pages/MapaCalorSistema";
import { MacroProvider } from "./contexts/MacroContext";
import { UnsavedChangesProvider } from "./contexts/UnsavedChangesContext";
import WatchRedirectWrapper from "./components/WatchRedirectWrapper";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotifier from "./components/PWAUpdateNotifier";
import StudioBackgroundIndicator from "./components/marketing/StudioBackgroundIndicator";

import WakeLockManager from "./components/WakeLockManager";
import GlobalOpenInNewTabButton from "./components/GlobalOpenInNewTabButton";

const queryClient = new QueryClient();

// Layout wrapper component
const LayoutWrapper = () => (
  <Layout>
    <Outlet />
  </Layout>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MacroProvider>
      <TooltipProvider>
        
        <Toaster />
        <Sonner />
        
        <BrowserRouter>
          <ScrollToTop />
          <UnsavedChangesProvider>
          <SystemThemeLoader />
          <BackgroundLocationManager />
          <WatchRedirectWrapper />
          <PWAInstallPrompt />
          <PWAUpdateNotifier />
          <StudioBackgroundIndicator />
          <WakeLockManager />
          <GlobalOpenInNewTabButton />
          <Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/espelho-funcionario/:token" element={<EspelhoFuncionario />} />
            <Route path="/ponto/totem" element={<PontoTotem />} />
            <Route element={<LayoutWrapper />}>
            <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/atendimento" element={<Atendimento />} />
              <Route path="/email" element={<EmailPage />} />
              <Route path="/email-config" element={<EmailConfig />} />
              <Route path="/listas" element={<ListasHub />} />
              <Route path="/bot-builder" element={<BotBuilder />} />
              <Route path="/bot-test" element={<BotTest />} />
              <Route path="/bot-create" element={<BotCreate />} />
              <Route path="/campanhas" element={<Campanhas />} />
              <Route path="/calendario" element={<Calendario />} />
              <Route path="/calendario/configuracoes" element={<CalendarioConfig />} />
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
              <Route path="/config/pagamentos" element={<PaymentGatewaysConfig />} />
              <Route path="/config/visual" element={<SystemVisualConfig />} />
              <Route path="/ecommerce-rules" element={<EcommerceRulesPage />} />
              <Route path="/ecommerce-rules-editor" element={<EcommerceRulesEditor />} />
              <Route path="/pedido-tracking" element={<PedidoTracking />} />
              <Route path="/ecommerce-config" element={<EcommerceConfigHub />} />
              <Route path="/ecommerce-config/branding" element={<EcommerceBrandingConfig />} />
              <Route path="/ecommerce-config/conteudos" element={<EcommerceContentEditor />} />
              <Route path="/ecommerce-config/anuncios" element={<EcommerceAdsManager />} />
              <Route path="/ecommerce-config/rodape" element={<EcommerceFooterEditor />} />
              <Route path="/ecommerce-config/homepage" element={<EcommerceHomeEditor />} />
              <Route path="/ecommerce-config/funcionalidades" element={<EcommerceFeaturesEditor />} />
              <Route path="/ecommerce-config/volume-pricing" element={<EcommerceVolumePricing />} />
              <Route path="/ecommerce-config/cupons" element={<EcommerceCuponsPage />} />
              <Route path="/ecommerce-config/b2b" element={<EcommerceB2BEditor />} />
              <Route path="/ecommerce-config/newsletter" element={<EcommerceNewsletterPage />} />
              <Route path="/ecommerce-config/mapa-calor" element={<EcommerceMapaCalor />} />
              <Route path="/ecommerce-config/denuncias" element={<EcommerceDenunciasConfig />} />
              <Route path="/ecommerce-config/lgpd" element={<EcommerceLGPDConfig />} />
              <Route path="/mapa-calor-sistema" element={<MapaCalorSistema />} />
              <Route path="/global-variables" element={<GlobalVariables />} />
              <Route path="/desenho" element={<Desenho />} />
              <Route path="/marketing" element={<MarketingHub />} />
              <Route path="/marketing/auto-video-wizard" element={<AutoVideoWizardPage />} />
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
              <Route path="/monitor-funcionarios" element={<MonitorFuncionarios />} />
              <Route path="/omnichannel-builder" element={<OmnichannelBuilder />} />
              <Route path="/omnichannel-builder/:id" element={<OmnichannelBuilder />} />
              <Route path="/dashboard-atendente" element={<DashboardAtendentePage />} />
              <Route path="/dashboard-supervisor" element={<DashboardSupervisorPage />} />
              <Route path="/test-roteamento" element={<TestRoteamento />} />
              <Route path="/sla-dashboard" element={<SLADashboardPage />} />
              <Route path="/config/sla" element={<ConfigSLAPage />} />
              <Route path="/advanced-analytics" element={<AdvancedAnalyticsPage />} />
              <Route path="/dashboard-pesquisas-satisfacao" element={<DashboardPesquisasSatisfacao />} />
              
              <Route path="/pesquisas-satisfacao" element={<PesquisasSatisfacaoPage />} />
              
              <Route path="/quality-assurance" element={<QualityAssurance />} />
              <Route path="/automacoes-vendas" element={<AutomacoesVendas />} />
              <Route path="/roteirizador-visitas" element={<RoteirizadorVisitas />} />
              <Route path="/vendas/programacao-visitas" element={<ProgramacaoVisitas />} />
              <Route path="/vendas/acompanhamento-visitas" element={<AcompanhamentoVisitas />} />
              <Route path="/config/regras-monitoramento-visita" element={<ConfigRegrasMonitoramentoVisita />} />
              <Route path="/config/formularios-visita" element={<FormulariosVisita />} />
              <Route path="/config/regras-formulario-visita" element={<RegrasFormularioVisita />} />
              <Route path="/editor-regras" element={<EditorRegras />} />
              <Route path="/editor-regras/:id" element={<EditorRegras />} />
              <Route path="/vendas-config" element={<VendasConfig />} />
              <Route path="/orcamento-report-config" element={<OrcamentoReportConfig />} />
              <Route path="/atendimento-config" element={<AtendimentoConfig />} />
              <Route path="/chat-interno" element={<ChatInterno />} />
              <Route path="/agentes-chat" element={<AgentChat />} />
              {/* Contagem Inteligente */}
              <Route path="/contagem" element={<ContagemDashboard />} />
              <Route path="/contagem/nova" element={<NovaContagem />} />
              <Route path="/contagem/resultado/:id" element={<ResultadoContagem />} />
              <Route path="/contagem/detalhe/:id" element={<ResultadoContagem />} />
              
              <Route path="/avisos" element={<Avisos />} />
              <Route path="/meus-conjuntos" element={<MeusConjuntos />} />
              <Route path="/gerenciar-atalhos" element={<GerenciarAtalhos />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/compartilhar-tela" element={<CompartilharTela />} />
              <Route path="/logistica" element={<LogisticaHub />} />
              <Route path="/logistica/monitoramento" element={<LogisticaMonitoramento />} />
              <Route path="/logistica/veiculos" element={<LogisticaVeiculos />} />
              <Route path="/logistica/historico" element={<LogisticaHistorico />} />
              <Route path="/logistica/historico/:veiculoId" element={<LogisticaHistorico />} />
              <Route path="/logistica/roteirizacao" element={<LogisticaRoteirizacao />} />
              <Route path="/logistica/rotas" element={<LogisticaRotas />} />
              <Route path="/logistica/automacoes" element={<LogisticaAutomacoes />} />
              <Route path="/logistica/config" element={<LogisticaConfig />} />
              <Route path="/marketplaces" element={<MarketplacesHubPage />} />
              <Route path="/pedidos-recebidos" element={<PedidosRecebidos />} />
              <Route path="/robo-precos" element={<RoboPrecos />} />
              <Route path="/whatsapp-catalogo" element={<WhatsAppCatalogo />} />
              <Route path="/macros" element={<Macros />} />
              {/* Ads Routes */}
              <Route path="/ads" element={<AdsHub />} />
              <Route path="/ads/:platform" element={<AdsPlatformDashboard />} />
              <Route path="/ads/campaigns" element={<AdsCampaigns />} />
              <Route path="/ads/reports" element={<AdsReports />} />
              <Route path="/ads/alerts" element={<AdsAlerts />} />
              <Route path="/ads/credentials" element={<AdsCredentials />} />
              <Route path="/ads/logs" element={<AdsLogs />} />
              <Route path="/ads/automation" element={<AdsAutomation />} />
              <Route path="/ads/automation/:id" element={<AdsAutomation />} />
              <Route path="/railway-env" element={<RailwayEnvVariables />} />
              <Route path="/admin/support-tickets" element={<SupportTickets />} />
              <Route path="/admin/apps" element={<AdminApps />} />
              <Route path="/config/push" element={<ConfigNotificacoesPush />} />
              <Route path="/meus-tickets" element={<MeusTickets />} />
              <Route path="/ponto" element={<PontoLayout />}>
                <Route index element={<PontoDashboard />} />
                <Route path="empresas" element={<PontoEmpresas />} />
                <Route path="filiais" element={<PontoFiliais />} />
                <Route path="departamentos" element={<PontoDepartamentos />} />
                <Route path="cargos" element={<PontoCargos />} />
                <Route path="equipes" element={<PontoEquipes />} />
                <Route path="escalas" element={<PontoEscalas />} />
                <Route path="funcionarios" element={<PontoFuncionarios />} />
                <Route path="registro" element={<PontoRegistro />} />
                <Route path="tratamento" element={<PontoTratamento />} />
                <Route path="ajustes" element={<PontoAjustes />} />
                <Route path="espelho" element={<PontoEspelho />} />
                <Route path="equipamentos" element={<PontoEquipamentos />} />
                <Route path="exportacao" element={<PontoExportacao />} />
                <Route path="layouts-exportacao" element={<PontoLayoutsExportacao />} />
                <Route path="alertas" element={<PontoAlertas />} />
                <Route path="auditoria" element={<PontoAuditoria />} />
                <Route path="coletor" element={<PontoColetorDownload />} />
                <Route path="config" element={<PontoConfig />} />
                <Route path="config/wizard" element={<PontoConfigWizard />} />

                <Route path="antifraude" element={<PontoAntifraudeConfig />} />
                <Route path="funcionarios/metodos" element={<PontoFuncionarioMetodos />} />
                <Route path="assistente" element={<PontoAssistente />} />
                <Route path="portal" element={<PontoPortalFuncionario />} />
                <Route path="predicoes" element={<PontoPredicoes />} />
                <Route path="simulador" element={<PontoSimulador />} />
                <Route path="mapa" element={<PontoMapaEquipes />} />
                <Route path="fora-geofence" element={<PontoForaGeofence />} />
                <Route path="qrcode" element={<PontoQrCodeTotem />} />
                <Route path="atestados-admin" element={<PontoAtestadosAdmin />} />
                <Route path="fechamento" element={<PontoFechamento />} />
                <Route path="pre-fechamento" element={<PontoPreFechamento />} />
                <Route path="banco-horas" element={<PontoBancoHoras />} />
                <Route path="ferias" element={<PontoFerias />} />
                <Route path="afd" element={<PontoAFD />} />
                <Route path="esocial" element={<PontoEsocial />} />
                <Route path="importacao" element={<PontoImportacao />} />
                <Route path="importar-afd" element={<PontoImportarAFD />} />
                <Route path="face-enroll" element={<PontoFaceEnroll />} />
                <Route path="sugerir-escala" element={<PontoSugerirEscala />} />
                <Route path="dashboard-executivo" element={<PontoDashboardExecutivo />} />
                <Route path="aprovacoes" element={<PontoAprovacoes />} />
                <Route path="webhook-catracas" element={<PontoWebhookCatracas />} />
                <Route path="clt-config" element={<PontoCltConfig />} />
                <Route path="anomalias" element={<PontoAnomalias />} />
                <Route path="compliance" element={<PontoCompliance />} />
                <Route path="banco-horas-expirar" element={<PontoBancoHorasExpirar />} />
                <Route path="aprovacao-regras" element={<PontoAprovacaoRegras />} />
                <Route path="sobreaviso" element={<PontoSobreaviso />} />
                <Route path="dsr" element={<PontoDSR />} />
                <Route path="lgpd" element={<PontoLGPDPortal />} />
                <Route path="esocial-fila" element={<PontoEsocialFila />} />
                <Route path="acordos-coletivos" element={<PontoAcordosColetivos />} />
                <Route path="compensacao" element={<PontoCompensacao />} />
                <Route path="compensacao-votacao" element={<PontoCompensacaoVotacao />} />
                <Route path="notificacoes" element={<PontoNotificacoes />} />
                <Route path="notificacoes/entregabilidade" element={<PontoNotificacoesEntregabilidade />} />
                <Route path="notificacoes/:id" element={<PontoNotificacaoBuilder />} />
                <Route path="manual" element={<PontoManual />} />
              </Route>
              <Route path="/controle-veiculos" element={<CVLayout />}>
                <Route index element={<CVDashboard />} />
                <Route path="veiculos" element={<CVVehicles />} />
                <Route path="motoristas" element={<CVDrivers />} />
                <Route path="saida" element={<CVVehicleExit />} />
                <Route path="entrada" element={<CVVehicleEntry />} />
                <Route path="movimentacoes" element={<CVMovements />} />
                <Route path="defeitos" element={<CVDefects />} />
                <Route path="tipos-defeito" element={<CVDefectTypes />} />
                <Route path="manutencao" element={<CVMaintenance />} />
                <Route path="vistoria-config" element={<CVInspectionConfig />} />
                <Route path="ajudantes" element={<CVHelpers />} />
              <Route path="cameras" element={<CVCameras />} />
              <Route path="historico-imagens" element={<CVVehicleHistory />} />
              </Route>
              <Route path="/controle-visitantes" element={<CVisLayout />}>
                <Route index element={<CVisDashboard />} />
                <Route path="entrada" element={<CVisEntrada />} />
                <Route path="presentes" element={<CVisPresentes />} />
                <Route path="autorizacoes" element={<CVisAutorizacoes />} />
                <Route path="relatorios" element={<CVisRelatorios />} />
                <Route path="visitantes" element={<CVisVisitantes />} />
                <Route path="contatos" element={<CVisContatos />} />
              </Route>
              <Route path="/cameras" element={<CamerasLayout />}>
                <Route index element={<CamerasAoVivo />} />
                <Route path="ao-vivo" element={<CamerasAoVivo />} />
                <Route path="grupos" element={<CamerasGrupos />} />
                <Route path="cameras" element={<CamerasCameras />} />
              </Route>
              <Route path="/editores" element={<EditoresLayout />}>
                <Route index element={<EditoresHub />} />
                <Route path="modelos" element={<ModelosLista />} />
                <Route path="documentos" element={<DocumentosGerados />} />
                <Route path="modelos/:id" element={<ModeloEditor />} />
                <Route path="documento/:id" element={<DocumentoEditor />} />
                <Route path="gerar" element={<GerarDocumento />} />
                
              </Route>
            </Route>
            {/* Public routes (no layout) */}
            <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
            <Route path="/rastreio" element={<RastreioPedido />} />
            <Route path="/rastreio/:token" element={<RastreioPedido />} />
            <Route path="/webchat" element={<WebChat />} />
            <Route path="/pilar-rastreador" element={<PilarRastreador />} />
            <Route path="/pilar-rastreador-nativo" element={<PilarRastreadorNativo />} />
            <Route path="/watch" element={<WatchDashboard />} />
            <Route path="/watch/dashboard" element={<WatchDashboardHome />} />
            <Route path="/watch/agenda" element={<WatchAgenda />} />
            <Route path="/watch/vendas" element={<WatchVendas />} />
            <Route path="/watch/chats" element={<WatchChats />} />
            <Route path="/watch/logistica" element={<WatchLogisticaMenu />} />
            <Route path="/watch/logistica/veiculos" element={<WatchLogisticaVeiculos />} />
            <Route path="/watch/logistica/mapa" element={<WatchLogisticaMapa />} />
            <Route path="/watch/logistica/rota" element={<WatchLogisticaRota />} />
            <Route path="/watch/logistica/historico" element={<WatchLogisticaHistorico />} />
            <Route path="/tv/vendas" element={<TvDashboardVendas />} />
            <Route path="/tv/veiculos" element={<TvDashboardVeiculos />} />
            <Route path="/p/:slug" element={<PublicPage />} />
            {/* E-commerce routes */}
            <Route path="/ecommerce" element={<WishlistProvider><CartProvider><QuoteRequestProvider><EcommerceLayout /></QuoteRequestProvider></CartProvider></WishlistProvider>}>
              <Route index element={<EcommerceHome />} />
              <Route path="catalogo" element={<EcommerceCatalog />} />
              <Route path="produto/:id" element={<EcommerceProduct />} />
              <Route path="carrinho" element={<EcommerceCart />} />
              <Route path="orcamento" element={<EcommerceQuoteRequest />} />
              <Route path="wishlist" element={<EcommerceWishlist />} />
              <Route path="checkout" element={<EcommerceCheckout />} />
              <Route path="b2b" element={<EcommerceB2B />} />
              <Route path="conta" element={<EcommerceAccount />} />
              <Route path="sobre" element={<EcommerceInstitutional page="sobre" />} />
              <Route path="contato" element={<EcommerceInstitutional page="contato" />} />
              <Route path="faq" element={<EcommerceInstitutional page="faq" />} />
              <Route path="politica-entrega" element={<EcommerceInstitutional page="entrega" />} />
              <Route path="trocas-devolucoes" element={<EcommerceInstitutional page="trocas" />} />
              <Route path="politica-privacidade" element={<EcommerceInstitutional page="privacidade" />} />
              <Route path="termos-uso" element={<EcommerceInstitutional page="termos" />} />
              <Route path="denuncias" element={<EcommerceDenuncias />} />
              <Route path="lgpd" element={<EcommerceLGPD />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </UnsavedChangesProvider>
        </BrowserRouter>
      </TooltipProvider>
    </MacroProvider>
  </QueryClientProvider>
);

export default App;
