import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { EditorPopupProvider } from "@/lib/editores/editorPopup";
import AvisoCreditosIA from "@/components/ai/AvisoCreditosIA";
import BannerCreditosIA from "@/components/ai/BannerCreditosIA";


import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
const Index = React.lazy(() => import("./pages/Index"));
const Login = React.lazy(() => import("./pages/Login"));
const OAuthConsent = React.lazy(() => import("./pages/OAuthConsent"));
const DevLookupE2E = React.lazy(() => import("./pages/DevLookupE2E"));

const Dashboard = React.lazy(() => import("./pages/Dashboard"));
const Atendimento = React.lazy(() => import("./pages/Atendimento"));
const BotBuilder = React.lazy(() => import("./pages/BotBuilder"));
const BotTest = React.lazy(() => import("./pages/BotTest"));
const BotCreate = React.lazy(() => import("./pages/BotCreate"));
const Email = React.lazy(() => import("./pages/Email"));
const EmailPage = React.lazy(() => import("./pages/EmailPage"));
const Campanhas = React.lazy(() => import("./pages/Campanhas"));
const Calendario = React.lazy(() => import("./pages/Calendario"));
const CalendarioConfig = React.lazy(() => import("./pages/CalendarioConfig"));
const Funil = React.lazy(() => import("./pages/Funil"));
const Conteudos = React.lazy(() => import("./pages/Conteudos"));
const Contatos = React.lazy(() => import("./pages/Contatos"));
const Empresas = React.lazy(() => import("./pages/Empresas"));
const Notas = React.lazy(() => import("./pages/Notas"));
const IAPlatformLayout = React.lazy(() => import("./pages/ia-platform/IAPlatformLayout"));
const IAPlatformDashboard = React.lazy(() => import("./pages/ia-platform/IAPlatformDashboard"));
const AgentesPage = React.lazy(() => import("./pages/ia-platform/AgentesPage"));
const SkillsPage = React.lazy(() => import("./pages/ia-platform/SkillsPage"));
const AipSkillAssistentePage = React.lazy(() => import("./pages/ia-platform/SkillAssistentePage"));
const ToolsPage = React.lazy(() => import("./pages/ia-platform/ToolsPage"));
const McpsPage = React.lazy(() => import("./pages/ia-platform/McpsPage"));
const RecursosPage = React.lazy(() => import("./pages/ia-platform/RecursosPage"));
const WizardsPage = React.lazy(() => import("./pages/ia-platform/WizardsPage"));
const WorkflowsPage = React.lazy(() => import("./pages/ia-platform/WorkflowsPage"));
const WorkflowBuilderPage = React.lazy(() => import("./pages/ia-platform/WorkflowBuilderPage"));
const AprovacoesPage = React.lazy(() => import("./pages/ia-platform/AprovacoesPage"));
const ExecucoesPage = React.lazy(() => import("./pages/ia-platform/ExecucoesPage"));
const AssetsPage = React.lazy(() => import("./pages/ia-platform/AssetsPage"));
const PlaygroundPage = React.lazy(() => import("./pages/ia-platform/PlaygroundPage"));
const HistoricoPage = React.lazy(() => import("./pages/ia-platform/HistoricoPage"));
const SegurancaPage = React.lazy(() => import("./pages/ia-platform/SegurancaPage"));
const AipCredenciaisPage = React.lazy(() => import("./pages/ia-platform/CredenciaisPage"));
const AipNotificacoesPage = React.lazy(() => import("./pages/ia-platform/NotificacoesPage"));
const AipRotinasPage = React.lazy(() => import("./pages/ia-platform/RotinasPage"));
const AipMotorPage = React.lazy(() => import("./pages/ia-platform/MotorPage"));
const AipServidorMonitorPage = React.lazy(() => import("./pages/ia-platform/ServidorMonitorPage"));
const AipConfigServidorPage = React.lazy(() => import("./pages/ia-platform/ConfigServidorPage"));
const AipWizardInicialPage = React.lazy(() => import("./pages/ia-platform/WizardInicialPage"));
const AipManualPage = React.lazy(() => import("./pages/ia-platform/ManualPage"));
const AipCriarAssistidoPage = React.lazy(() => import("./pages/ia-platform/CriarAssistidoPage"));
import RequireAipRole from "./components/ia-platform/RequireAipRole";
import { ROLES_MONITOR } from "./lib/aip/rbac";


const BaseConhecimento = React.lazy(() => import("./pages/BaseConhecimento"));
const Todos = React.lazy(() => import("./pages/Todos"));
const VinculosEmpresas = React.lazy(() => import("./pages/VinculosEmpresas"));
const VinculosContatos = React.lazy(() => import("./pages/VinculosContatos"));
const ListasHub = React.lazy(() => import("./pages/ListasHub"));
const Config = React.lazy(() => import("./pages/Config"));
const SystemVisualConfig = React.lazy(() => import("./pages/SystemVisualConfig"));
import SystemThemeLoader from "./components/SystemThemeLoader";
import BackgroundLocationManager from "./components/BackgroundLocationManager";
import WhatsappSessionMonitor from "./components/WhatsappSessionMonitor";
const GlobalVariables = React.lazy(() => import("./pages/GlobalVariables"));
const Desenho = React.lazy(() => import("./pages/Desenho"));
const MarketingHub = React.lazy(() => import("./pages/MarketingHub"));
const AutoVideoWizardPage = React.lazy(() => import("./pages/AutoVideoWizardPage"));
const MarketingCanvas = React.lazy(() => import("./pages/MarketingCanvas"));
const MarketingAutomacoes = React.lazy(() => import("./pages/MarketingAutomacoes"));
const MarketingCampanhas = React.lazy(() => import("./pages/MarketingCampanhas"));
const BotResponseMonitor = React.lazy(() => import("./pages/BotResponseMonitor"));

const ChatWebhook = React.lazy(() => import("./pages/ChatWebhook"));
const MeusTextosProntos = React.lazy(() => import("./pages/MeusTextosProntos"));
const MeusAnexos = React.lazy(() => import("./pages/MeusAnexos"));
const Orcamentos = React.lazy(() => import("./pages/Orcamentos"));
const OrcamentoPublico = React.lazy(() => import("./pages/OrcamentoPublico"));
const NotFound = React.lazy(() => import("./pages/NotFound"));
import Layout from "./components/Layout";
const MenuHub = React.lazy(() => import("./pages/MenuHub"));
const MenuVisual = React.lazy(() => import("./pages/MenuVisual"));
const Relatorios = React.lazy(() => import("./pages/Relatorios"));
const ImportacaoProdutos = React.lazy(() => import("./pages/ImportacaoProdutos"));
const ImportacaoProdutosLista = React.lazy(() => import("./pages/ImportacaoProdutosLista"));
const Softphone = React.lazy(() => import("./pages/Softphone"));
const VideoCall = React.lazy(() => import("./pages/VideoCall"));
const StimulsoftViewer = React.lazy(() => import("./pages/StimulsoftViewer"));
const ReportBroViewerPage = React.lazy(() => import("./pages/ReportBroViewerPage"));
const WebChat = React.lazy(() => import("./pages/WebChat"));
const PontoLayout = React.lazy(() => import("./pages/ponto/PontoLayout"));
const PontoDashboard = React.lazy(() => import("./pages/ponto/PontoDashboard"));
const PontoEmpresas = React.lazy(() => import("./pages/ponto/PontoEmpresas"));
const PontoDepartamentos = React.lazy(() => import("./pages/ponto/PontoDepartamentos"));
const PontoCargos = React.lazy(() => import("./pages/ponto/PontoCargos"));
const PontoEquipes = React.lazy(() => import("./pages/ponto/PontoEquipes"));
const PontoFuncionarios = React.lazy(() => import("./pages/ponto/PontoFuncionarios"));
const PontoFuncionarioMetodos = React.lazy(() => import("./pages/ponto/PontoFuncionarioMetodos"));
const PontoEscalas = React.lazy(() => import("./pages/ponto/PontoEscalas"));
const PontoRegistro = React.lazy(() => import("./pages/ponto/PontoRegistro"));
const PontoTratamento = React.lazy(() => import("./pages/ponto/PontoTratamento"));
const PontoAjustes = React.lazy(() => import("./pages/ponto/PontoAjustes"));
const PontoEspelho = React.lazy(() => import("./pages/ponto/PontoEspelho"));
const PontoEquipamentos = React.lazy(() => import("./pages/ponto/PontoEquipamentos"));
const PontoExportacao = React.lazy(() => import("./pages/ponto/PontoExportacao"));
const PontoLayoutsExportacao = React.lazy(() => import("./pages/ponto/PontoLayoutsExportacao"));
const PontoAlertas = React.lazy(() => import("./pages/ponto/PontoAlertas"));
const PontoAuditoria = React.lazy(() => import("./pages/ponto/PontoAuditoria"));
const PontoColetorDownload = React.lazy(() => import("./pages/ponto/PontoColetorDownload"));
const AdminApps = React.lazy(() => import("./pages/AdminApps"));
const PoliticasInternas = React.lazy(() => import("./pages/PoliticasInternas"));
const AssistenteVozConfig = React.lazy(() => import("./pages/AssistenteVozConfig"));
const RelatoriosVozConfig = React.lazy(() => import("./pages/RelatoriosVozConfig"));
const RelatoriosVozSnapshots = React.lazy(() => import("./pages/RelatoriosVozSnapshots"));
const MenuCustomizacao = React.lazy(() => import("./pages/MenuCustomizacao"));
const TelasCustomizadas = React.lazy(() => import("./pages/TelasCustomizadas"));
const TelaCustomizadaView = React.lazy(() => import("./pages/TelaCustomizadaView"));
const ConfigNotificacoesPush = React.lazy(() => import("./pages/ConfigNotificacoesPush"));
const PontoConfig = React.lazy(() => import("./pages/ponto/PontoConfig"));
const PontoConfigWizard = React.lazy(() => import("./pages/ponto/PontoConfigWizard"));

const PontoAntifraudeConfig = React.lazy(() => import("./pages/ponto/PontoAntifraudeConfig"));
const PontoAssistente = React.lazy(() => import("./pages/ponto/PontoAssistente"));
const PontoPortalFuncionario = React.lazy(() => import("./pages/ponto/PontoPortalFuncionario"));
const PontoPredicoes = React.lazy(() => import("./pages/ponto/PontoPredicoes"));
const PontoSimulador = React.lazy(() => import("./pages/ponto/PontoSimulador"));
const PontoMapaEquipes = React.lazy(() => import("./pages/ponto/PontoMapaEquipes"));
const PontoForaGeofence = React.lazy(() => import("./pages/ponto/PontoForaGeofence"));
const PontoQrCodeTotem = React.lazy(() => import("./pages/ponto/PontoQrCodeTotem"));
const PontoAtestadosAdmin = React.lazy(() => import("./pages/ponto/PontoAtestadosAdmin"));
const PontoFechamento = React.lazy(() => import("./pages/ponto/PontoFechamento"));
const PontoPreFechamento = React.lazy(() => import("./pages/ponto/PontoPreFechamento"));
const PontoBancoHoras = React.lazy(() => import("./pages/ponto/PontoBancoHoras"));
const PontoFerias = React.lazy(() => import("./pages/ponto/PontoFerias"));
const PontoAFD = React.lazy(() => import("./pages/ponto/PontoAFD"));
const EspelhoFuncionario = React.lazy(() => import("./pages/ponto/EspelhoFuncionario"));
const PontoTotem = React.lazy(() => import("./pages/ponto/PontoTotem"));
const PilarSipJanela = React.lazy(() => import("./pages/PilarSipJanela"));
const PontoEsocial = React.lazy(() => import("./pages/ponto/PontoEsocial"));
const PontoImportacao = React.lazy(() => import("./pages/ponto/PontoImportacao"));
const PontoImportarAFD = React.lazy(() => import("./pages/ponto/PontoImportarAFD"));
const PontoFaceEnroll = React.lazy(() => import("./pages/ponto/PontoFaceEnroll"));
const PontoSugerirEscala = React.lazy(() => import("./pages/ponto/PontoSugerirEscala"));
const PontoDashboardExecutivo = React.lazy(() => import("./pages/ponto/PontoDashboardExecutivo"));
const PontoAprovacoes = React.lazy(() => import("./pages/ponto/PontoAprovacoes"));
const PontoWebhookCatracas = React.lazy(() => import("./pages/ponto/PontoWebhookCatracas"));
const PontoCltConfig = React.lazy(() => import("./pages/ponto/PontoCltConfig"));
const PontoAnomalias = React.lazy(() => import("./pages/ponto/PontoAnomalias"));
const PontoCompliance = React.lazy(() => import("./pages/ponto/PontoCompliance"));
const PontoAprovacaoRegras = React.lazy(() => import("./pages/ponto/PontoAprovacaoRegras"));
const PontoSobreaviso = React.lazy(() => import("./pages/ponto/PontoSobreaviso"));
const PontoDSR = React.lazy(() => import("./pages/ponto/PontoDSR"));
const PontoLGPDPortal = React.lazy(() => import("./pages/ponto/PontoLGPDPortal"));
const PontoEsocialFila = React.lazy(() => import("./pages/ponto/PontoEsocialFila"));
const PontoAcordosColetivos = React.lazy(() => import("./pages/ponto/PontoAcordosColetivos"));
const PontoCompensacao = React.lazy(() => import("./pages/ponto/PontoCompensacao"));
const PontoCompensacaoVotacao = React.lazy(() => import("./pages/ponto/PontoCompensacaoVotacao"));
const PontoBancoHorasExpirar = React.lazy(() => import("./pages/ponto/PontoBancoHorasExpirar"));
const PontoNotificacoes = React.lazy(() => import("./pages/ponto/PontoNotificacoes"));
const PontoNotificacaoBuilder = React.lazy(() => import("./pages/ponto/PontoNotificacaoBuilder"));
const PontoNotificacoesEntregabilidade = React.lazy(() => import("./pages/ponto/PontoNotificacoesEntregabilidade"));
const PontoManual = React.lazy(() => import("./pages/ponto/PontoManual"));
const CVLayout = React.lazy(() => import("./pages/controle-veiculos/CVLayout"));
const ManutencaoLayout = React.lazy(() => import("./pages/manutencao/ManutencaoLayout"));
const TranspLayout = React.lazy(() => import("./pages/transportadoras/TranspLayout"));
const TranspEntrada = React.lazy(() => import("./pages/transportadoras/TranspEntrada"));
const TranspSaida = React.lazy(() => import("./pages/transportadoras/TranspSaida"));
const TranspMovimentos = React.lazy(() => import("./pages/transportadoras/TranspMovimentos"));
const TranspVeiculos = React.lazy(() => import("./pages/transportadoras/TranspVeiculos"));
const TranspMotoristas = React.lazy(() => import("./pages/transportadoras/TranspMotoristas"));
const TranspSetores = React.lazy(() => import("./pages/transportadoras/TranspSetores"));
const TranspLiberacao = React.lazy(() => import("./pages/transportadoras/TranspLiberacao"));
const TranspInspectionConfig = React.lazy(() => import("./pages/transportadoras/TranspInspectionConfig"));
const CVDashboard = React.lazy(() => import("./pages/controle-veiculos/CVDashboard"));
const CVVehicles = React.lazy(() => import("./pages/controle-veiculos/CVVehicles"));
const CVDrivers = React.lazy(() => import("./pages/controle-veiculos/CVDrivers"));
const CVVehicleExit = React.lazy(() => import("./pages/controle-veiculos/CVVehicleExit"));
const CVVehicleEntry = React.lazy(() => import("./pages/controle-veiculos/CVVehicleEntry"));
const CVMovements = React.lazy(() => import("./pages/controle-veiculos/CVMovements"));
const CVDefectTypes = React.lazy(() => import("./pages/controle-veiculos/CVDefectTypes"));
const CVMaintenance = React.lazy(() => import("./pages/controle-veiculos/CVMaintenance"));
const CVMaintenanceCatalog = React.lazy(() => import("./pages/controle-veiculos/CVMaintenanceCatalog"));
const CVParadas = React.lazy(() => import("./pages/controle-veiculos/CVParadas"));

const CVInspectionConfig = React.lazy(() => import("./pages/controle-veiculos/CVInspectionConfig"));
const CVHelpers = React.lazy(() => import("./pages/controle-veiculos/CVHelpers"));
const CVCameras = React.lazy(() => import("./pages/controle-veiculos/CVCameras"));
const CVVehicleHistory = React.lazy(() => import("./pages/controle-veiculos/CVVehicleHistory"));
const OpLayout = React.lazy(() => import("./pages/operacional-hub/OpLayout"));
const OpTasks = React.lazy(() => import("./pages/operacional-hub/Tasks"));
const OpTaskExecution = React.lazy(() => import("./pages/operacional-hub/TaskExecution"));
const OpTemplates = React.lazy(() => import("./pages/operacional-hub/Templates"));
const OpTemplateForm = React.lazy(() => import("./pages/operacional-hub/TemplateForm"));
const OpTemplateReport = React.lazy(() => import("./pages/operacional-hub/TemplateReport"));
const OpSectors = React.lazy(() => import("./pages/operacional-hub/Sectors"));
const OpFunctions = React.lazy(() => import("./pages/operacional-hub/Functions"));
const OpShifts = React.lazy(() => import("./pages/operacional-hub/Shifts"));
const OpMaterials = React.lazy(() => import("./pages/operacional-hub/Materials"));
const OpTools = React.lazy(() => import("./pages/operacional-hub/Tools"));
const OpUsers = React.lazy(() => import("./pages/operacional-hub/Users"));
const OpAlerts = React.lazy(() => import("./pages/operacional-hub/Alerts"));
const OpSettings = React.lazy(() => import("./pages/operacional-hub/Settings"));
const OpHistory = React.lazy(() => import("./pages/operacional-hub/History"));
const OpIncidents = React.lazy(() => import("./pages/operacional-hub/Incidents"));
const OpIrregularities = React.lazy(() => import("./pages/operacional-hub/Irregularities"));
const OpConditions = React.lazy(() => import("./pages/operacional-hub/Conditions"));
const OpProductivity = React.lazy(() => import("./pages/operacional-hub/Productivity"));
const OpAbsences = React.lazy(() => import("./pages/operacional-hub/Absences"));
const OpReportIrregularity = React.lazy(() => import("./pages/operacional-hub/ReportIrregularity"));
const OpScheduleSimulation = React.lazy(() => import("./pages/operacional-hub/ScheduleSimulation"));
const OpPlannedVsActual = React.lazy(() => import("./pages/operacional-hub/PlannedVsActual"));
const OpFrequencies = React.lazy(() => import("./pages/operacional-hub/Frequencies"));
const OpApprovals = React.lazy(() => import("./pages/operacional-hub/Approvals"));
const OpIdleTimeAnalysis = React.lazy(() => import("./pages/operacional-hub/IdleTimeAnalysis"));
const OpEstablishments = React.lazy(() => import("./pages/operacional-hub/Establishments"));
const OpAccessLevels = React.lazy(() => import("./pages/operacional-hub/AccessLevels"));
const OpTVMode = React.lazy(() => import("./pages/operacional-hub/TVMode"));
const OpTVTaskTracker = React.lazy(() => import("./pages/operacional-hub/TVTaskTracker"));
const FerrLayout = React.lazy(() => import("./pages/ferramentas/FerrLayout"));
const FerrDashboard = React.lazy(() => import("./pages/ferramentas/Dashboard"));
const FerrTools = React.lazy(() => import("./pages/ferramentas/Tools"));
const FerrLoans = React.lazy(() => import("./pages/ferramentas/Loans"));
const FerrToolForm = React.lazy(() => import("./pages/ferramentas/ToolForm"));
const FerrReturnLoan = React.lazy(() => import("./pages/ferramentas/ReturnLoan"));
const FerrRelend = React.lazy(() => import("./pages/ferramentas/Relend"));
const FerrLoanRenewals = React.lazy(() => import("./pages/ferramentas/LoanRenewals"));
const FerrRequestTools = React.lazy(() => import("./pages/ferramentas/RequestTools"));
const FerrProcessRequests = React.lazy(() => import("./pages/ferramentas/ProcessRequests"));
const FerrUsers = React.lazy(() => import("./pages/ferramentas/Users"));
const FerrWarehouses = React.lazy(() => import("./pages/ferramentas/Warehouses"));
const FerrKits = React.lazy(() => import("./pages/ferramentas/Kits"));
const FerrNotifications = React.lazy(() => import("./pages/ferramentas/Notifications"));
const FerrReports = React.lazy(() => import("./pages/ferramentas/Reports"));
const FerrSettings = React.lazy(() => import("./pages/ferramentas/Settings"));
const FerrTracking = React.lazy(() => import("./pages/ferramentas/Tracking"));
const FerrPermissions = React.lazy(() => import("./pages/ferramentas/Permissions"));
const FerrReturnIssues = React.lazy(() => import("./pages/ferramentas/ReturnIssues"));
const FerrToolAssistant = React.lazy(() => import("./pages/ferramentas/ToolAssistant"));
const FerrSupplies = React.lazy(() => import("./pages/ferramentas/Supplies"));
const CVisLayout = React.lazy(() => import("./pages/controle-visitantes/CVisLayout"));
const CVisDashboard = React.lazy(() => import("./pages/controle-visitantes/CVisDashboard"));
const CVisEntrada = React.lazy(() => import("./pages/controle-visitantes/CVisEntrada"));
const CVisPresentes = React.lazy(() => import("./pages/controle-visitantes/CVisPresentes"));
const CVisAutorizacoes = React.lazy(() => import("./pages/controle-visitantes/CVisAutorizacoes"));
const CVisRelatorios = React.lazy(() => import("./pages/controle-visitantes/CVisRelatorios"));
const CVisVisitantes = React.lazy(() => import("./pages/controle-visitantes/CVisVisitantes"));
const CVisContatos = React.lazy(() => import("./pages/controle-visitantes/CVisContatos"));
const LivroLayout = React.lazy(() => import("./pages/livro-ocorrencia/LivroLayout"));
const LivroDashboard = React.lazy(() => import("./pages/livro-ocorrencia/LivroDashboard"));
const LivroOcorrencias = React.lazy(() => import("./pages/livro-ocorrencia/LivroOcorrencias"));
const LivroEncomendas = React.lazy(() => import("./pages/livro-ocorrencia/LivroEncomendas"));
const LivroPalavrasChave = React.lazy(() => import("./pages/livro-ocorrencia/LivroPalavrasChave"));
const PortariaLayout = React.lazy(() => import("./pages/portaria/PortariaLayout"));
const AutomacaoLayout = React.lazy(() => import("./pages/automacao/AutomacaoLayout"));
const AutomacaoPainel = React.lazy(() => import("./pages/automacao/AutomacaoPainel"));
const AutomacaoPaineis = React.lazy(() => import("./pages/automacao/AutomacaoPaineis"));
const AutomacaoEstado = React.lazy(() => import("./pages/automacao/AutomacaoEstado"));
const AutomacaoRegras = React.lazy(() => import("./pages/automacao/AutomacaoRegras"));
const AutomacaoTela = React.lazy(() => import("./pages/automacao/AutomacaoTela"));

const PortariaDashboard = React.lazy(() => import("./pages/portaria/PortariaDashboard"));
const PortariaAcessos = React.lazy(() => import("./pages/portaria/PortariaAcessos"));
const PortariaPessoas = React.lazy(() => import("./pages/portaria/PortariaPessoas"));
const PortariaVisitantes = React.lazy(() => import("./pages/portaria/PortariaVisitantes"));
const PortariaHistorico = React.lazy(() => import("./pages/portaria/PortariaHistorico"));
const PortariaPainel = React.lazy(() => import("./pages/portaria/PortariaPainel"));
const PortariaPendencias = React.lazy(() => import("./pages/portaria/PortariaPendencias"));
const PortariaRelatorioUnidades = React.lazy(() => import("./pages/portaria/PortariaRelatorioUnidades"));
const PortariaDispositivos = React.lazy(() => import("./pages/portaria/PortariaDispositivos"));
const PortariaConfiguracoes = React.lazy(() => import("./pages/portaria/PortariaConfiguracoes"));
const PortariaInterfone = React.lazy(() => import("./pages/portaria/PortariaInterfone"));
const PortariaPermissoes = React.lazy(() => import("./pages/portaria/PortariaPermissoes"));
const PortariaAtendimentoMobile = React.lazy(() => import("./pages/portaria/PortariaAtendimentoMobile"));

const CamerasLayout = React.lazy(() => import("./pages/cameras/CamerasLayout"));
const CamerasDashboard = React.lazy(() => import("./pages/cameras/CamerasDashboard"));
const CamerasGrupos = React.lazy(() => import("./pages/cameras/CamerasGrupos"));
const CamerasCameras = React.lazy(() => import("./pages/cameras/CamerasCameras"));
const CamerasAoVivo = React.lazy(() => import("./pages/cameras/CamerasAoVivo"));
const EditoresLayout = React.lazy(() => import("./pages/editores/EditoresLayout"));
const EditoresHub = React.lazy(() => import("./pages/editores/EditoresHub"));
const ModeloEditor = React.lazy(() => import("./pages/editores/ModeloEditor"));

const ModelosLista = React.lazy(() => import("./pages/editores/ModelosLista"));
const DocumentosGerados = React.lazy(() => import("./pages/editores/DocumentosGerados"));
const GerarDocumento = React.lazy(() => import("./pages/editores/GerarDocumento"));


const ChatInterno = React.lazy(() => import("./pages/ChatInterno"));
const ConfigSkills = React.lazy(() => import("./pages/ConfigSkills"));
const MonitorarFilas = React.lazy(() => import("./pages/MonitorarFilas"));
const MonitorFuncionarios = React.lazy(() => import("./pages/MonitorFuncionarios"));
const DashboardAtendentePage = React.lazy(() => import("./pages/DashboardAtendente"));
const DashboardSupervisorPage = React.lazy(() => import("./pages/DashboardSupervisor"));
const OmnichannelBuilder = React.lazy(() => import("./pages/OmnichannelBuilder"));
const GerenciarAtalhos = React.lazy(() => import("./pages/GerenciarAtalhos"));
const Perfil = React.lazy(() => import("./pages/Perfil"));
const CompartilharTela = React.lazy(() => import("./pages/CompartilharTela"));
const TestRoteamento = React.lazy(() => import("./pages/TestRoteamento"));
const SLADashboardPage = React.lazy(() => import("./pages/SLADashboard"));
const ConfigSLAPage = React.lazy(() => import("./pages/ConfigSLA"));
const AdvancedAnalyticsPage = React.lazy(() => import("./pages/AdvancedAnalytics"));
const PesquisasSatisfacaoPage = React.lazy(() => import("./pages/PesquisasSatisfacao"));
const DashboardPesquisasSatisfacao = React.lazy(() => import("./pages/DashboardPesquisasSatisfacao"));
const SupportTickets = React.lazy(() => import("./pages/SupportTickets"));
const MeusTickets = React.lazy(() => import("./pages/MeusTickets"));


const QualityAssurance = React.lazy(() => import("./pages/QualityAssurance"));
const EditorRegras = React.lazy(() => import("./pages/EditorRegras"));
const AutomacoesVendas = React.lazy(() => import("./pages/AutomacoesVendas"));
const RoteirizadorVisitas = React.lazy(() => import("./pages/RoteirizadorVisitas"));
const ProgramacaoVisitas = React.lazy(() => import("./pages/ProgramacaoVisitas"));
const AcompanhamentoVisitas = React.lazy(() => import("./pages/AcompanhamentoVisitas"));
const FormulariosVisita = React.lazy(() => import("./pages/FormulariosVisita"));
const RegrasFormularioVisita = React.lazy(() => import("./pages/RegrasFormularioVisita"));
const ConfigRegrasMonitoramentoVisita = React.lazy(() => import("./pages/ConfigRegrasMonitoramentoVisita"));
const VendasConfig = React.lazy(() => import("./pages/VendasConfig"));
const MeusConjuntos = React.lazy(() => import("./pages/MeusConjuntos"));
const LogisticaHub = React.lazy(() => import("./pages/LogisticaHub"));
const LogisticaDashboard = React.lazy(() => import("./pages/LogisticaDashboard"));
const LogisticaMonitoramento = React.lazy(() => import("./pages/LogisticaMonitoramento"));
const LogisticaVeiculos = React.lazy(() => import("./pages/LogisticaVeiculos"));
const LogisticaHistorico = React.lazy(() => import("./pages/LogisticaHistorico"));
const LogisticaRoteirizacao = React.lazy(() => import("./pages/LogisticaRoteirizacao"));
const LogisticaRotas = React.lazy(() => import("./pages/LogisticaRotas"));
const LogisticaConfig = React.lazy(() => import("./pages/LogisticaConfig"));
const LogisticaAutomacoes = React.lazy(() => import("./pages/LogisticaAutomacoes"));
const PedidosRecebidos = React.lazy(() => import("./pages/PedidosRecebidos"));
const WhatsAppCatalogo = React.lazy(() => import("./pages/WhatsAppCatalogo"));
const MarketplacesHubPage = React.lazy(() => import("./pages/MarketplacesHubPage"));
const AdsDashboard = React.lazy(() => import("./pages/ads/AdsDashboard"));
const AdsCredentials = React.lazy(() => import("./pages/ads/AdsCredentials"));
const AdsLogs = React.lazy(() => import("./pages/ads/AdsLogs"));
const AdsAutomation = React.lazy(() => import("./pages/ads/AdsAutomation"));
const AdsSchedulerConfig = React.lazy(() => import("./pages/ads/AdsSchedulerConfig"));
const AdsPlatformApps = React.lazy(() => import("./pages/ads/AdsPlatformApps"));
const AdsSetupWizard = React.lazy(() => import("./pages/ads/AdsSetupWizard"));
const AdsPlatformDashboard = React.lazy(() => import("./pages/ads/AdsPlatformDashboard"));
const AdsCampaigns = React.lazy(() => import("./pages/ads/AdsCampaigns"));
const AdsReports = React.lazy(() => import("./pages/ads/AdsReports"));
const AdsAlerts = React.lazy(() => import("./pages/ads/AdsAlerts"));
const AdsHub = React.lazy(() => import("./pages/AdsHub"));
const RoboPrecos = React.lazy(() => import("./pages/RoboPrecos"));
const AtendimentoConfig = React.lazy(() => import("./pages/AtendimentoConfig"));
const RailwayEnvVariables = React.lazy(() => import("./pages/RailwayEnvVariables"));
const LandingPage = React.lazy(() => import("./pages/LandingPage"));
const Splash = React.lazy(() => import("./pages/Splash"));
const Avisos = React.lazy(() => import("./pages/Avisos"));
const EmailConfig = React.lazy(() => import("./pages/EmailConfig"));
const OrcamentoReportConfig = React.lazy(() => import("./pages/OrcamentoReportConfig"));
const Macros = React.lazy(() => import("./pages/Macros"));
const AgentChat = React.lazy(() => import("./pages/AgentChat"));
const ContagemDashboard = React.lazy(() => import("./pages/contagem/ContagemDashboard"));
const NovaContagem = React.lazy(() => import("./pages/contagem/NovaContagem"));
const ResultadoContagem = React.lazy(() => import("./pages/contagem/ResultadoContagem"));

const WatchDashboard = React.lazy(() => import("./pages/WatchDashboard"));
const WatchDashboardHome = React.lazy(() => import("./pages/watch/WatchDashboardHome"));
const WatchAgenda = React.lazy(() => import("./pages/watch/WatchAgenda"));
const WatchVendas = React.lazy(() => import("./pages/watch/WatchVendas"));
const WatchChats = React.lazy(() => import("./pages/watch/WatchChats"));
const WatchLogisticaMenu = React.lazy(() => import("./pages/watch/WatchLogisticaMenu"));
const WatchLogisticaVeiculos = React.lazy(() => import("./pages/watch/WatchLogisticaVeiculos"));
const WatchLogisticaMapa = React.lazy(() => import("./pages/watch/WatchLogisticaMapa"));
const WatchLogisticaRota = React.lazy(() => import("./pages/watch/WatchLogisticaRota"));
const WatchLogisticaHistorico = React.lazy(() => import("./pages/watch/WatchLogisticaHistorico"));
const TvDashboardVendas = React.lazy(() => import("./pages/TvDashboardVendas"));
const TvDashboardVeiculos = React.lazy(() => import("./pages/TvDashboardVeiculos"));
const TvPortaria = React.lazy(() => import("./pages/TvPortaria"));
const TvApresentacaoEmpresa = React.lazy(() => import("./pages/TvApresentacaoEmpresa"));
const TvSignageLayout = React.lazy(() => import("./pages/tv-signage/TvSignageLayout"));
const TvSignageDashboard = React.lazy(() => import("./pages/tv-signage/TvSignageDashboard"));
const TvSignageDispositivos = React.lazy(() => import("./pages/tv-signage/TvSignageDispositivos"));
const TvSignageDashboards = React.lazy(() => import("./pages/tv-signage/TvSignageDashboards"));
const TvSignagePlaylists = React.lazy(() => import("./pages/tv-signage/TvSignagePlaylists"));
const TvSignageGrupos = React.lazy(() => import("./pages/tv-signage/TvSignageGrupos"));
const TvSignageComandos = React.lazy(() => import("./pages/tv-signage/TvSignageComandos"));
const TvSignageEventos = React.lazy(() => import("./pages/tv-signage/TvSignageEventos"));
const TvSignageWorkflows = React.lazy(() => import("./pages/tv-signage/TvSignageWorkflows"));
const TvWorkflowBuilder = React.lazy(() => import("./pages/tv-signage/TvWorkflowBuilder"));
const TvSignageApi = React.lazy(() => import("./pages/tv-signage/TvSignageApi"));
const TvSignageConfigVeiculos = React.lazy(() => import("./pages/tv-signage/TvSignageConfigVeiculos"));
const TvSignageMurais = React.lazy(() => import("./pages/tv-signage/TvSignageMurais"));
const TvMural = React.lazy(() => import("./pages/TvMural"));
const TvSignageSimulador = React.lazy(() => import("./pages/tv-signage/TvSignageSimulador"));
const TvPair = React.lazy(() => import("./pages/TvPair"));
const TvCameras = React.lazy(() => import("./pages/TvCameras"));
const PublicPage = React.lazy(() => import("./pages/PublicPage"));
import EcommerceLayout from "./components/ecommerce/EcommerceLayout";
const EcommerceHome = React.lazy(() => import("./pages/ecommerce/EcommerceHome"));
const EcommerceCatalog = React.lazy(() => import("./pages/ecommerce/EcommerceCatalog"));
const EcommerceProduct = React.lazy(() => import("./pages/ecommerce/EcommerceProduct"));
const EcommerceCart = React.lazy(() => import("./pages/ecommerce/EcommerceCart"));
const EcommerceQuoteRequest = React.lazy(() => import("./pages/ecommerce/EcommerceQuoteRequest"));
const EcommerceCheckout = React.lazy(() => import("./pages/ecommerce/EcommerceCheckout"));
const EcommerceB2B = React.lazy(() => import("./pages/ecommerce/EcommerceB2B"));
const EcommerceAccount = React.lazy(() => import("./pages/ecommerce/EcommerceAccount"));
const EcommerceInstitutional = React.lazy(() => import("./pages/ecommerce/EcommerceInstitutional"));
const EcommerceDenunciasConfig = React.lazy(() => import("./pages/ecommerce/EcommerceDenunciasConfig"));
const EcommerceLGPDConfig = React.lazy(() => import("./pages/ecommerce/EcommerceLGPDConfig"));
const EcommerceDenuncias = React.lazy(() => import("./pages/ecommerce/EcommerceDenuncias"));
const EcommerceLGPD = React.lazy(() => import("./pages/ecommerce/EcommerceLGPD"));
const EcommerceWishlist = React.lazy(() => import("./pages/ecommerce/EcommerceWishlist"));
import { CartProvider } from "./contexts/CartContext";
import { WishlistProvider } from "./contexts/WishlistContext";
import { QuoteRequestProvider } from "./contexts/QuoteRequestContext";
const PaymentGatewaysConfig = React.lazy(() => import("./pages/PaymentGatewaysConfig"));
const EcommerceRulesPage = React.lazy(() => import("./pages/EcommerceRulesPage"));
const EcommerceRulesEditor = React.lazy(() => import("./pages/EcommerceRulesEditor"));
const PedidoTracking = React.lazy(() => import("./pages/PedidoTracking"));
const RastreioPedido = React.lazy(() => import("./pages/RastreioPedido"));
const EcommerceConfigHub = React.lazy(() => import("./pages/ecommerce/EcommerceConfigHub"));
const EcommerceBrandingConfig = React.lazy(() => import("./pages/ecommerce/EcommerceBrandingConfig"));
const EcommerceContentEditor = React.lazy(() => import("./pages/ecommerce/EcommerceContentEditor"));
const EcommerceAdsManager = React.lazy(() => import("./pages/ecommerce/EcommerceAdsManager"));
const EcommerceFooterEditor = React.lazy(() => import("./pages/ecommerce/EcommerceFooterEditor"));
const EcommerceHomeEditor = React.lazy(() => import("./pages/ecommerce/EcommerceHomeEditor"));
const EcommerceFeaturesEditor = React.lazy(() => import("./pages/ecommerce/EcommerceFeaturesEditor"));
const EcommerceVolumePricing = React.lazy(() => import("./pages/ecommerce/EcommerceVolumePricing"));
const EcommerceCuponsPage = React.lazy(() => import("./pages/ecommerce/EcommerceCuponsPage"));
const EcommerceB2BEditor = React.lazy(() => import("./pages/ecommerce/EcommerceB2BEditor"));
const EcommerceNewsletterPage = React.lazy(() => import("./pages/ecommerce/EcommerceNewsletterPage"));
const EcommerceMapaCalor = React.lazy(() => import("./pages/ecommerce/EcommerceMapaCalor"));
const MapaCalorSistema = React.lazy(() => import("./pages/MapaCalorSistema"));
import { MacroProvider } from "./contexts/MacroContext";
import { UnsavedChangesProvider } from "./contexts/UnsavedChangesContext";
import WatchRedirectWrapper from "./components/WatchRedirectWrapper";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import PWAUpdateNotifier from "./components/PWAUpdateNotifier";
import StudioBackgroundIndicator from "./components/marketing/StudioBackgroundIndicator";

import WakeLockManager from "./components/WakeLockManager";
import GlobalOpenInNewTabButton from "./components/GlobalOpenInNewTabButton";
import GlobalBackToTelaButton from "./components/GlobalBackToTelaButton";

const queryClient = new QueryClient();

// Layout wrapper component
const LayoutWrapper = () => (
  <ProtectedRoute>
    <Layout>
      <Outlet />
    </Layout>
  </ProtectedRoute>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <MacroProvider>
      <TooltipProvider>
        
        <Toaster />
        <Sonner />
        <EditorPopupProvider />
        
        
        <BrowserRouter>
          <ScrollToTop />
          <UnsavedChangesProvider>
          <SystemThemeLoader />
          <BackgroundLocationManager />
          <WhatsappSessionMonitor />
          <WatchRedirectWrapper />
          <PWAInstallPrompt />
          <PWAUpdateNotifier />
          <StudioBackgroundIndicator />
          <AvisoCreditosIA />
          <BannerCreditosIA />


          <WakeLockManager />
          <GlobalOpenInNewTabButton />
          <GlobalBackToTelaButton />
          <React.Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>}><Routes>
            <Route path="/" element={<Splash />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dev/lookup-e2e" element={<DevLookupE2E />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/espelho-funcionario/:token" element={<EspelhoFuncionario />} />
            <Route path="/ponto/totem" element={<PontoTotem />} />
            <Route path="/pilar-sip" element={<PilarSipJanela />} />
            <Route element={<LayoutWrapper />}>
            <Route path="/dashboard" element={<Dashboard />} />
              
              <Route path="/menu" element={<MenuHub />} />
              <Route path="/menu-visual" element={<MenuVisual />} />
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
              <Route path="/notas" element={<Notas />} />
              <Route path="/ia-platform" element={<IAPlatformLayout />}>
                <Route index element={<IAPlatformDashboard />} />
                <Route path="agentes" element={<AgentesPage />} />
                <Route path="skills" element={<SkillsPage />} />
                <Route path="skills/assistente" element={<AipSkillAssistentePage />} />
                <Route path="tools" element={<ToolsPage />} />
                <Route path="mcps" element={<McpsPage />} />
                <Route path="recursos" element={<RecursosPage />} />
                <Route path="wizards" element={<WizardsPage />} />
                <Route path="workflows" element={<WorkflowsPage />} />
                <Route path="workflows/:id" element={<WorkflowBuilderPage />} />
                <Route path="aprovacoes" element={<AprovacoesPage />} />
                <Route path="execucoes" element={<ExecucoesPage />} />
                <Route path="assets" element={<AssetsPage />} />
                <Route path="playground" element={<PlaygroundPage />} />
                <Route path="historico" element={<HistoricoPage />} />
                <Route path="seguranca" element={<SegurancaPage />} />
                <Route path="credenciais" element={<AipCredenciaisPage />} />
                <Route path="notificacoes" element={<AipNotificacoesPage />} />
                <Route path="rotinas" element={<AipRotinasPage />} />
                <Route path="motor" element={<AipMotorPage />} />
                <Route path="criar" element={<AipCriarAssistidoPage />} />
                <Route path="wizard-inicial" element={<AipWizardInicialPage />} />
                <Route path="manual" element={<AipManualPage />} />
                <Route
                  path="config-servidor"
                  element={
                    <RequireAipRole roles={ROLES_MONITOR}>
                      <AipConfigServidorPage />
                    </RequireAipRole>
                  }
                />
                <Route
                  path="monitor-servidor"
                  element={
                    <RequireAipRole roles={ROLES_MONITOR}>
                      <AipServidorMonitorPage />
                    </RequireAipRole>
                  }
                />



              </Route>
              <Route path="/base-conhecimento" element={<BaseConhecimento />} />
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
              <Route path="/marketing/monitor-respostas" element={<BotResponseMonitor />} />

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
              <Route path="/ads/scheduler" element={<AdsSchedulerConfig />} />
              <Route path="/ads/platform-apps" element={<AdsPlatformApps />} />
              <Route path="/ads/wizard" element={<AdsSetupWizard />} />
              <Route path="/railway-env" element={<RailwayEnvVariables />} />
              <Route path="/admin/support-tickets" element={<SupportTickets />} />
              <Route path="/admin/apps" element={<AdminApps />} />
              <Route path="/admin/telas-customizadas" element={<TelasCustomizadas />} />
              <Route path="/politicas-internas" element={<PoliticasInternas />} />
              <Route path="/admin/assistente-voz" element={<AssistenteVozConfig />} />
              <Route path="/admin/relatorios-voz" element={<RelatoriosVozConfig />} />
              <Route path="/admin/relatorios-voz/snapshots" element={<RelatoriosVozSnapshots />} />
              <Route path="/admin/menu-customizacao" element={<MenuCustomizacao />} />
              <Route path="/tela-customizada/:id" element={<TelaCustomizadaView />} />
              <Route path="/config/push" element={<ConfigNotificacoesPush />} />
              <Route path="/meus-tickets" element={<MeusTickets />} />
              <Route path="/ponto" element={<PontoLayout />}>
                <Route index element={<PontoDashboard />} />
                <Route path="empresas" element={<PontoEmpresas />} />
                <Route path="filiais" element={<Navigate to="/config?secao=cadastro-unidades" replace />} />
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
                <Route path="defeitos" element={<Navigate to="/manutencao" replace />} />
                <Route path="tipos-defeito" element={<Navigate to="/manutencao/tipos-defeito" replace />} />
                <Route path="manutencao" element={<Navigate to="/manutencao/analise" replace />} />
                <Route path="paradas" element={<Navigate to="/manutencao" replace />} />
                <Route path="biblioteca-manutencao" element={<Navigate to="/manutencao/biblioteca" replace />} />

                <Route path="vistoria-config" element={<CVInspectionConfig />} />
                <Route path="ajudantes" element={<CVHelpers />} />
              <Route path="cameras" element={<CVCameras />} />
              <Route path="historico-imagens" element={<CVVehicleHistory />} />
              </Route>
              <Route path="/manutencao" element={<ManutencaoLayout />}>
                <Route index element={<CVParadas />} />
                <Route path="analise" element={<CVMaintenance />} />
                <Route path="biblioteca" element={<CVMaintenanceCatalog />} />
                <Route path="tipos-defeito" element={<CVDefectTypes />} />
              </Route>

              <Route path="/transportadoras" element={<TranspLayout />}>
                <Route index element={<TranspEntrada />} />
                <Route path="saida" element={<TranspSaida />} />
                <Route path="movimentos" element={<TranspMovimentos />} />
                <Route path="veiculos" element={<TranspVeiculos />} />
                <Route path="motoristas" element={<TranspMotoristas />} />
                <Route path="setores" element={<TranspSetores />} />
                <Route path="liberacao" element={<TranspLiberacao />} />
                <Route path="config-vistoria" element={<TranspInspectionConfig />} />
              </Route>



              <Route path="/operacional" element={<OpLayout />}>
                <Route index element={<OpTasks />} />
                <Route path="tasks/:id" element={<OpTaskExecution />} />
                <Route path="templates" element={<OpTemplates />} />
                <Route path="templates/new" element={<OpTemplateForm />} />
                <Route path="templates/:id" element={<OpTemplateForm />} />
                <Route path="templates-report" element={<OpTemplateReport />} />
                <Route path="sectors" element={<OpSectors />} />
                <Route path="functions" element={<OpFunctions />} />
                <Route path="shifts" element={<OpShifts />} />
                <Route path="materials" element={<OpMaterials />} />
                <Route path="tools" element={<OpTools />} />
                <Route path="users" element={<OpUsers />} />
                <Route path="alerts" element={<OpAlerts />} />
                <Route path="settings" element={<OpSettings />} />
                <Route path="history" element={<OpHistory />} />
                <Route path="incidents" element={<OpIncidents />} />
                <Route path="irregularities" element={<OpIrregularities />} />
                <Route path="conditions" element={<OpConditions />} />
                <Route path="productivity" element={<OpProductivity />} />
                <Route path="absences" element={<OpAbsences />} />
                <Route path="report-irregularity" element={<OpReportIrregularity />} />
                <Route path="schedule-simulation" element={<OpScheduleSimulation />} />
                <Route path="planned-vs-actual" element={<OpPlannedVsActual />} />
                <Route path="frequencies" element={<OpFrequencies />} />
                <Route path="approvals" element={<OpApprovals />} />
                <Route path="idle-time" element={<OpIdleTimeAnalysis />} />
                <Route path="establishments" element={<OpEstablishments />} />
                <Route path="access-levels" element={<OpAccessLevels />} />
                <Route path="tv" element={<OpTVMode />} />
                <Route path="tv-tasks" element={<OpTVTaskTracker />} />
              </Route>
              <Route path="/ferramentas" element={<FerrLayout />}>
                <Route index element={<FerrDashboard />} />
                <Route path="tools" element={<FerrTools />} />
                <Route path="loans" element={<FerrLoans />} />
                <Route path="tools/new" element={<FerrToolForm />} />
                <Route path="tools/:id/edit" element={<FerrToolForm />} />
                <Route path="loan/return" element={<FerrReturnLoan />} />
                <Route path="loan/relend" element={<FerrRelend />} />
                <Route path="loan/renewals" element={<FerrLoanRenewals />} />
                <Route path="request-tools" element={<FerrRequestTools />} />
                <Route path="process-requests" element={<FerrProcessRequests />} />
                <Route path="users" element={<FerrUsers />} />
                <Route path="warehouses" element={<FerrWarehouses />} />
                <Route path="kits" element={<FerrKits />} />
                <Route path="notifications" element={<FerrNotifications />} />
                <Route path="reports" element={<FerrReports />} />
                <Route path="settings" element={<FerrSettings />} />
                <Route path="tracking" element={<FerrTracking />} />
                <Route path="permissions" element={<FerrPermissions />} />
                <Route path="return-issues" element={<FerrReturnIssues />} />
                <Route path="tool-assistant" element={<FerrToolAssistant />} />
                <Route path="supplies" element={<FerrSupplies />} />
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
              <Route path="/livro-ocorrencia" element={<LivroLayout />}>
                <Route index element={<LivroDashboard />} />
                <Route path="ocorrencias" element={<LivroOcorrencias />} />
                <Route path="encomendas" element={<LivroEncomendas />} />
                <Route path="palavras-chave" element={<LivroPalavrasChave />} />
              </Route>
              <Route path="/app/interfone" element={<PortariaAtendimentoMobile />} />
              <Route path="/automacao/tela" element={<AutomacaoTela />} />
              <Route path="/automacao" element={<AutomacaoLayout />}>
                <Route index element={<AutomacaoPaineis />} />
                <Route path="painel" element={<AutomacaoPainel />} />
                <Route path="painel/:id" element={<AutomacaoPainel />} />
                <Route path="regras" element={<AutomacaoRegras />} />
                <Route path="estado" element={<AutomacaoEstado />} />
                <Route path="dispositivos" element={<PortariaDispositivos />} />
              </Route>

              <Route path="/portaria" element={<PortariaLayout />}>
                <Route index element={<PortariaInterfone />} />
                <Route path="inicio" element={<PortariaDashboard />} />
                <Route path="acessos" element={<PortariaAcessos />} />
                <Route path="pessoas" element={<PortariaPessoas />} />
                <Route path="visitantes" element={<PortariaVisitantes />} />
                <Route path="historico" element={<PortariaHistorico />} />
                <Route path="painel" element={<PortariaPainel />} />
                <Route path="pendencias" element={<PortariaPendencias />} />
                <Route path="relatorio-unidades" element={<PortariaRelatorioUnidades />} />
                <Route path="dispositivos" element={<Navigate to="/automacao/dispositivos" replace />} />
                <Route path="interfone" element={<PortariaInterfone />} />
                <Route path="permissoes" element={<PortariaPermissoes />} />
                <Route path="configuracoes" element={<PortariaConfiguracoes />} />

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
                
                <Route path="gerar" element={<GerarDocumento />} />
                
              </Route>
              <Route path="/tv-signage" element={<TvSignageLayout />}>
                <Route index element={<TvSignageDashboard />} />
                <Route path="dispositivos" element={<TvSignageDispositivos />} />
                <Route path="dashboards" element={<TvSignageDashboards />} />
                <Route path="playlists" element={<TvSignagePlaylists />} />
                <Route path="murais" element={<TvSignageMurais />} />
                <Route path="grupos" element={<TvSignageGrupos />} />
                <Route path="comandos" element={<TvSignageComandos />} />
                <Route path="eventos" element={<TvSignageEventos />} />
                <Route path="workflows" element={<TvSignageWorkflows />} />
                <Route path="workflows/:id/builder" element={<TvWorkflowBuilder />} />
                <Route path="workflows/new/builder" element={<TvWorkflowBuilder />} />
                <Route path="config-veiculos" element={<TvSignageConfigVeiculos />} />
                <Route path="api" element={<TvSignageApi />} />
              </Route>
            </Route>
            {/* Public routes (no layout) */}
            <Route path="/tv-signage/simular/:deviceId" element={<TvSignageSimulador />} />
            <Route path="/tv-signage/simular" element={<TvSignageSimulador />} />
            <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
            <Route path="/rastreio" element={<RastreioPedido />} />
            <Route path="/rastreio/:token" element={<RastreioPedido />} />
            <Route path="/webchat" element={<WebChat />} />
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
            <Route path="/tv/portaria" element={<TvPortaria />} />
            <Route path="/tv/cameras" element={<TvCameras />} />
            <Route path="/tv/apresentacao" element={<TvApresentacaoEmpresa />} />
            <Route path="/tv/mural" element={<TvMural />} />
            <Route path="/tv/automacao" element={<AutomacaoTela />} />
            <Route path="/tv-pair" element={<TvPair />} />
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
          </Routes></React.Suspense>
          </UnsavedChangesProvider>
        </BrowserRouter>
      </TooltipProvider>
    </MacroProvider>
  </QueryClientProvider>
);

export default App;
