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
import WhatsAppConfig from "./pages/WhatsAppConfig";
import Campanhas from "./pages/Campanhas";
import Funil from "./pages/Funil";
import Conteudos from "./pages/Conteudos";
import Config from "./pages/Config";
import GlobalVariables from "./pages/GlobalVariables";
import Desenho from "./pages/Desenho";
import ChatWebhook from "./pages/ChatWebhook";
import MeusTextosProntos from "./pages/MeusTextosProntos";
import MeusAnexos from "./pages/MeusAnexos";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";

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
            <Route path="/whatsapp-config" element={<WhatsAppConfig />} />
            <Route path="/campanhas" element={<Campanhas />} />
            <Route path="/funil" element={<Funil />} />
            <Route path="/conteudos" element={<Conteudos />} />
            <Route path="/config" element={<Config />} />
            <Route path="/global-variables" element={<GlobalVariables />} />
            <Route path="/desenho" element={<Desenho />} />
            <Route path="/chat-webhook" element={<ChatWebhook />} />
            <Route path="/meus-textos-prontos" element={<MeusTextosProntos />} />
            <Route path="/meus-anexos" element={<MeusAnexos />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
