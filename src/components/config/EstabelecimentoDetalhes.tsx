import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useModulosPermitidos } from "@/components/permissoes/ContextoPermissao";
import { 
  ArrowLeft, ChevronRight,
  Users, Building2, Tag, FolderTree, UserCog, Share2, MessageSquare, 
  Globe, Webhook, Key, Bell, Shield, Mail, Package, FolderOpen, Layers, 
  CreditCard, DollarSign, Wallet, Calendar, Phone, Workflow, 
  Star, Clock, ClipboardCheck, Brain, Zap, BookOpen, 
  Navigation, Fuel, Truck, FileCode, Settings
} from "lucide-react";

// Import all CRUD components
import { UnidadesCRUD } from "./UnidadesCRUD";
import { SegmentosCRUD } from "./SegmentosCRUD";
import { GruposAcessoCRUD } from "./GruposAcessoCRUD";
import { UsuariosCRUD } from "./UsuariosCRUD";
import { RedesSociaisCRUD } from "./RedesSociaisCRUD";
import QuickRepliesCRUD from "./QuickRepliesCRUD";
import QuickAttachmentsCRUD from "./QuickAttachmentsCRUD";
import { APIGeneratorCRUD } from "./APIGeneratorCRUD";
import { WebhooksCRUD } from "./WebhooksCRUD";
import { WebhooksEntradaCRUD } from "./WebhooksEntradaCRUD";
// import removido: CanaisAtendimentoCRUD é gerenciado em Chat → Configuração
import { NotificacoesCRUD } from "./NotificacoesCRUD";
import { SegurancaCRUD } from "./SegurancaCRUD";
import { ProdutosCRUD } from "./ProdutosCRUD";
import { ProdutoCategoriasCRUD } from "./ProdutoCategoriasCRUD";
import { ProdutoGruposCRUD } from "./ProdutoGruposCRUD";
import { ProdutoCamposCustomizadosCRUD } from "./ProdutoCamposCustomizadosCRUD";
import { NcmCRUD } from "./NcmCRUD";
import { CondicoesPagamentoCRUD } from "./CondicoesPagamentoCRUD";
import { TabelasPrecoCRUD } from "./TabelasPrecoCRUD";
import { TiposPagamentoCRUD } from "./TiposPagamentoCRUD";
import QualityAssuranceCRUD from "./QualityAssuranceCRUD";
import SentimentAnalysisCRUD from "./SentimentAnalysisCRUD";
import { CalendarioRegrasCRUD } from "./CalendarioRegrasCRUD";
import { UCMConfigCRUD } from "./UCMConfigCRUD";
import { OmnichannelFlowsCRUD } from "./OmnichannelFlowsCRUD";
import SLAConfigCRUD from "./SLAConfigCRUD";
import { AutomacaoVendasCRUD } from "./AutomacaoVendasCRUD";
import PedagioAPIConfigCRUD from "./PedagioAPIConfigCRUD";
import { CustosVeiculosCRUD } from "./CustosVeiculosCRUD";
import PesquisasSatisfacaoCRUD from "@/components/atendimento/PesquisasSatisfacaoCRUD";

import IAConfigCRUD from "./IAConfigCRUD";
import { ResendConfigSection } from "./ResendConfigSection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface EstabelecimentoDetalhesProps {
  estabelecimentoId: string;
  estabelecimentoNome: string;
  /** Abre direto em uma categoria (comunicacao, integrações, sistema, usuarios-acessos) */
  categoriaInicial?: string | null;
  /** Ação ao voltar da lista de categorias (quando aberto via submenu) */
  onVoltar?: () => void;
}

interface ConfigCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: ConfigItem[];
  abrirDireto?: boolean;
}

interface ConfigItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component?: React.ComponentType<{ estabelecimentoId: string }>;
  navigateTo?: string;
  helpContent?: React.ReactNode;
}

const getConfigCategories = (): ConfigCategory[] => [
  {
    id: "comunicacao",
    title: "Comunicação",
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    items: [
      {
        id: "email-config",
        title: "Email Config",
        description: "Configure servidor externo e OAuth",
        icon: Mail,
        navigateTo: "/email-config",
      },
      {
        id: "resend-config",
        title: "Email (Resend)",
        description: "Configure envio de emails",
        icon: Mail,
        component: ResendConfigSection,
      },
      {
        id: "redes-sociais",
        title: "Redes Sociais",
        description: "Conexões com redes sociais",
        icon: Share2,
        component: RedesSociaisCRUD,
      },
      // "Canais de Atendimento" removido daqui — gerenciado em Chat → Configuração → Canais

      {
        id: "notificacoes",
        title: "Notificações",
        description: "Alertas e avisos em tempo real",
        icon: Bell,
        component: NotificacoesCRUD,
      },
    ],
  },
  {
    id: "cadastro-unidades",
    title: "Unidades",
    icon: Building2,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    abrirDireto: true,
    items: [
      {
        id: "cadastro-unidades",
        title: "Unidades",
        description: "Filiais e departamentos",
        icon: Building2,
        component: UnidadesCRUD,
      },
    ],
  },
  {
    id: "grupos-acesso",
    title: "Grupos de Acesso",
    icon: FolderTree,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    abrirDireto: true,
    items: [
      {
        id: "grupos-acesso",
        title: "Grupos de Acesso",
        description: "Perfis de permissão",
        icon: FolderTree,
        component: GruposAcessoCRUD,
      },
    ],
  },
  {
    id: "cadastro-usuarios",
    title: "Usuários",
    icon: UserCog,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    abrirDireto: true,
    items: [
      {
        id: "cadastro-usuarios",
        title: "Usuários",
        description: "Gerenciar usuários",
        icon: UserCog,
        component: UsuariosCRUD,
      },
    ],
  },
  {
    id: "segmentos",
    title: "Segmentos",
    icon: Tag,
    color: "text-teal-500",
    bgColor: "bg-teal-500/10",
    abrirDireto: true,
    items: [
      {
        id: "segmentos",
        title: "Segmentos",
        description: "Agrupamento de clientes",
        icon: Tag,
        component: SegmentosCRUD,
      },
    ],
  },
  {
    id: "integrações",
    title: "Integrações",
    icon: Webhook,
    color: "text-indigo-500",
    bgColor: "bg-indigo-500/10",
    items: [
      {
        id: "api-generator",
        title: "Gerador de APIs",
        description: "Endpoints personalizados",
        icon: Key,
        component: APIGeneratorCRUD,
      },
      {
        id: "webhooks-saida",
        title: "Webhooks de Saída",
        description: "Notificações para sistemas",
        icon: Webhook,
        component: WebhooksCRUD,
      },
      {
        id: "webhooks-entrada",
        title: "Webhooks de Entrada",
        description: "Receber dados externos",
        icon: Webhook,
        component: WebhooksEntradaCRUD,
      },
      {
        id: "ucm-config",
        title: "PABX (UCM)",
        description: "Telefonia IP",
        icon: Phone,
        component: UCMConfigCRUD,
      },
      {
        id: "painel-telefonia-sip",
        title: "Painel de Telefonia SIP",
        description: "Ramais, linhas e ligações em andamento",
        icon: Phone,
        navigateTo: "/telefonia-sip",
      },
      {
        id: "ia-config",
        title: "Configurações de IA",
        description: "Provedores e modelos",
        icon: Brain,
        component: IAConfigCRUD,
      },
    ],
  },
  {
    id: "sistema",
    title: "Sistema",
    icon: Settings,
    color: "text-gray-500",
    bgColor: "bg-gray-500/10",
    items: [
      {
        id: "seguranca",
        title: "Segurança e LGPD",
        description: "Políticas e conformidade",
        icon: Shield,
        component: SegurancaCRUD,
      },
    ],
  },
  {
    id: "recuperar-senha",
    title: "Recuperação de Senha",
    icon: Shield,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    abrirDireto: true,
    items: [{
      id: "recuperar-senha",
      title: "Recuperação de Senha",
      description: "Configure envio de códigos via WhatsApp",
      icon: Shield,
      navigateTo: "/config?secao=recuperar-senha",
    }],
  },
  {
    id: "email-config",
    title: "Email Config",
    icon: Mail,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    abrirDireto: true,
    items: [{
      id: "email-config",
      title: "Email Config",
      description: "Configure servidor externo e OAuth",
      icon: Mail,
      navigateTo: "/config?secao=email-config",
    }],
  },
  {
    id: "notificacoes-sistema",
    title: "Notificações do Sistema",
    icon: Bell,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    abrirDireto: true,
    items: [{
      id: "notificacoes-sistema",
      title: "Notificações do Sistema",
      description: "Configure mensagens de confirmação e alertas",
      icon: Bell,
      navigateTo: "/config?secao=notificacoes-sistema",
    }],
  },
  {
    id: "visual-sistema",
    title: "Visual do Sistema",
    icon: Settings,
    color: "text-pink-500",
    bgColor: "bg-pink-500/10",
    abrirDireto: true,
    items: [{
      id: "visual-sistema",
      title: "Visual do Sistema",
      description: "Tela de entrada, vídeo de fundo e aparência",
      icon: Settings,
      navigateTo: "/config?secao=visual-sistema",
    }],
  },
];

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome, categoriaInicial, onVoltar }: EstabelecimentoDetalhesProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoriaInicial ?? null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [userEstabId, setUserEstabId] = useState<string | null>(null);

  const categories = getConfigCategories();
  const { itensPermitidos: categoriasPermitidas } = useModulosPermitidos("Config Geral", categories);

  // Handle URL params
  useEffect(() => {
    const subsecao = searchParams.get('subsecao');
    const subsubsecao = searchParams.get('subsubsecao');
    
    if (subsecao) {
      // Find category containing this item
      for (const cat of categories) {
        const item = cat.items.find(i => i.id === subsecao);
        if (item) {
          setSelectedCategory(cat.id);
          setSelectedItem(subsecao);
          break;
        }
      }
    }
    if (subsubsecao) {
      setSelectedItem(subsubsecao);
    }
  }, [searchParams]);

  useEffect(() => {
    (async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user) {
          const { data, error } = await supabase.rpc('get_user_estabelecimento_id', { _user_id: user.id });
          if (!error) setUserEstabId(data);
        }
      } catch (e) {
        console.error('Erro ao obter estabelecimento do usuário:', e);
      }
    })();
  }, [estabelecimentoId]);

  // Abre direto na categoria indicada pelo submenu
  useEffect(() => {
    if (categoriaInicial) {
      setSelectedCategory(categoriaInicial);
      if (!searchParams.get('subsecao')) setSelectedItem(null);
    }
  }, [categoriaInicial]);

  /** Mantém secao/estab da URL e ajusta apenas subsecao/subsubsecao */
  const atualizarParams = (extras: Record<string, string>) => {
    const base: Record<string, string> = {};
    const secao = searchParams.get('secao');
    const estab = searchParams.get('estab');
    if (secao) base.secao = secao;
    if (estab) base.estab = estab;
    setSearchParams({ ...base, ...extras });
  };

  const handleCategoryClick = (categoryId: string) => {
    const category = categories.find((item) => item.id === categoryId);
    if (category?.abrirDireto && category.items[0]) {
      setSelectedCategory(categoryId);
      handleItemClick(category.items[0]);
      return;
    }
    setSelectedCategory(categoryId);
    setSelectedItem(null);
  };

  const handleItemClick = (item: ConfigItem) => {
    if (item.navigateTo) {
      navigate(item.navigateTo);
      return;
    }
    setSelectedItem(item.id);
    atualizarParams({ subsecao: item.id });
  };

  const handleBackToCategories = () => {
    if (categoriaInicial && onVoltar) {
      onVoltar();
      return;
    }
    setSelectedCategory(null);
    setSelectedItem(null);
    atualizarParams({});
  };

  const handleBackToItems = () => {
    setSelectedItem(null);
    atualizarParams({});
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const currentItem = currentCategory?.items.find(i => i.id === selectedItem);

  // Render item content
  if (selectedItem && currentItem && currentCategory && currentItem.component) {
    const ItemComponent = currentItem.component;
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToItems}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", currentCategory.bgColor)}>
            <currentItem.icon className={cn("w-5 h-5", currentCategory.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{currentItem.title}</h3>
            <p className="text-xs text-muted-foreground truncate">{currentItem.description}</p>
          </div>
        </div>

        {/* Permission warning */}
        {userEstabId && userEstabId !== estabelecimentoId && (
          <Alert variant="destructive">
            <AlertDescription>
              Você não tem permissão para salvar neste estabelecimento.
            </AlertDescription>
          </Alert>
        )}

        {/* Content */}
        <ItemComponent estabelecimentoId={estabelecimentoId} />
      </div>
    );
  }

  // Render items list for selected category
  if (selectedCategory && currentCategory) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleBackToCategories}
            className="shrink-0 -ml-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", currentCategory.bgColor)}>
            <currentCategory.icon className={cn("w-5 h-5", currentCategory.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base truncate">{currentCategory.title}</h3>
            <p className="text-xs text-muted-foreground">{currentCategory.items.length} opções</p>
          </div>
        </div>

        {/* Items list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentCategory.items.map((item) => (
            <Card 
              key={item.id}
              className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all group"
              onClick={() => handleItemClick(item)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                  currentCategory.bgColor
                )}>
                  <item.icon className={cn("w-7 h-7", currentCategory.color)} />
                </div>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render categories list
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {categoriasPermitidas.map((category) => (
        <Card 
          key={category.id}
          className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all group"
          onClick={() => handleCategoryClick(category.id)}
        >
          <CardContent className="p-4 flex flex-col items-center text-center gap-3">
            <div className={cn(
              "w-16 h-16 rounded-2xl flex items-center justify-center shrink-0",
              category.bgColor
            )}>
              <category.icon className={cn("w-8 h-8", category.color)} />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base">{category.title}</h3>
              <p className="text-xs text-muted-foreground">
                {category.abrirDireto ? category.items[0]?.description : `${category.items.length} configurações`}
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
