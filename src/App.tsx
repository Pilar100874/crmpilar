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
import Rel2 from "./pages/Rel2";
import StimulsoftViewer from "./pages/StimulsoftViewer";
import ReportBroViewerPage from "./pages/ReportBroViewerPage";

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
            <Route path="/rel2" element={<Rel2 />} />
            <Route path="/relatorios/viewer" element={<ReportBroViewerPage />} />
            <Route path="/chat-webhook" element={<ChatWebhook />} />
            <Route path="/meus-textos-prontos" element={<MeusTextosProntos />} />
            <Route path="/meus-anexos" element={<MeusAnexos />} />
            <Route path="/stimulsoft-viewer" element={<StimulsoftViewer />} />
          </Route>
          {/* Public routes (no layout) */}
          <Route path="/orcamento/:token" element={<OrcamentoPublico />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
