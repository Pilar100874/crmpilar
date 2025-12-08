import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
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
import { CanaisAtendimentoCRUD } from "./CanaisAtendimentoCRUD";
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
import KnowledgeBaseCRUD from "./KnowledgeBaseCRUD";
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
}

interface ConfigCategory {
  id: string;
  title: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  items: ConfigItem[];
}

interface ConfigItem {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  component: React.ComponentType<{ estabelecimentoId: string }>;
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
      {
        id: "canais-atendimento",
        title: "Canais de Atendimento",
        description: "WhatsApp, Telegram, WebChat",
        icon: Globe,
        component: CanaisAtendimentoCRUD,
      },
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
    id: "usuarios-acessos",
    title: "Usuários e Acessos",
    icon: Users,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    items: [
      {
        id: "cadastro-unidades",
        title: "Unidades",
        description: "Filiais e departamentos",
        icon: Building2,
        component: UnidadesCRUD,
      },
      {
        id: "grupos-acesso",
        title: "Grupos de Acesso",
        description: "Perfis de permissão",
        icon: FolderTree,
        component: GruposAcessoCRUD,
      },
      {
        id: "cadastro-usuarios",
        title: "Usuários",
        description: "Gerenciar usuários",
        icon: UserCog,
        component: UsuariosCRUD,
      },
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
    id: "atendimento",
    title: "Atendimento",
    icon: MessageSquare,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    items: [
      {
        id: "respostas-rapidas",
        title: "Respostas Rápidas",
        description: "Textos prontos para atendimento",
        icon: MessageSquare,
        component: QuickRepliesCRUD,
      },
      {
        id: "anexos-rapidos",
        title: "Anexos Rápidos",
        description: "Arquivos frequentes",
        icon: FileCode,
        component: QuickAttachmentsCRUD,
      },
      {
        id: "sla-config",
        title: "SLA de Atendimento",
        description: "Tempos de resposta",
        icon: Clock,
        component: SLAConfigCRUD,
      },
      {
        id: "omnichannel-workflows",
        title: "Workflows Omnichannel",
        description: "Fluxos de roteamento",
        icon: Workflow,
        component: OmnichannelFlowsCRUD,
      },
      {
        id: "pesquisas-satisfacao",
        title: "Pesquisas de Satisfação",
        description: "CSAT e NPS",
        icon: Star,
        component: PesquisasSatisfacaoCRUD,
      },
      {
        id: "quality-assurance",
        title: "Quality Assurance",
        description: "Avaliação de qualidade",
        icon: ClipboardCheck,
        component: QualityAssuranceCRUD,
      },
      {
        id: "analise-sentimento",
        title: "Análise de Sentimento",
        description: "Detecção de emoções",
        icon: Brain,
        component: SentimentAnalysisCRUD,
      },
      {
        id: "base-conhecimento",
        title: "Base de Conhecimento",
        description: "Artigos e documentos",
        icon: BookOpen,
        component: KnowledgeBaseCRUD,
      },
    ],
  },
  {
    id: "vendas",
    title: "Vendas e Produtos",
    icon: Package,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    items: [
      {
        id: "produtos",
        title: "Produtos",
        description: "Catálogo de produtos",
        icon: Package,
        component: ProdutosCRUD,
      },
      {
        id: "categorias-produtos",
        title: "Categorias",
        description: "Organização de produtos",
        icon: FolderOpen,
        component: ProdutoCategoriasCRUD,
      },
      {
        id: "grupos-produtos",
        title: "Grupos de Produtos",
        description: "Campos customizados por grupo",
        icon: Layers,
        component: ProdutoGruposCRUD,
      },
      {
        id: "campos-customizados",
        title: "Campos Customizados",
        description: "Atributos personalizados",
        icon: Settings,
        component: ProdutoCamposCustomizadosCRUD,
      },
      {
        id: "ncm",
        title: "NCM",
        description: "Classificação fiscal",
        icon: FileCode,
        component: NcmCRUD,
      },
      {
        id: "tabelas-preco",
        title: "Tabelas de Preço",
        description: "Precificação por canal",
        icon: DollarSign,
        component: TabelasPrecoCRUD,
      },
      {
        id: "tipos-pagamento",
        title: "Tipos de Pagamento",
        description: "Formas de pagamento",
        icon: CreditCard,
        component: TiposPagamentoCRUD,
      },
      {
        id: "condicoes-pagamento",
        title: "Condições de Pagamento",
        description: "Parcelamento e prazos",
        icon: Wallet,
        component: CondicoesPagamentoCRUD,
      },
      {
        id: "automacao-vendas",
        title: "Regras para Orçamento",
        description: "Automação de descontos",
        icon: Zap,
        component: AutomacaoVendasCRUD,
      },
    ],
  },
  {
    id: "logistica",
    title: "Logística e Frete",
    icon: Truck,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    items: [
      {
        id: "pedagio-api",
        title: "API de Pedágio",
        description: "Cálculo de custos de pedágio",
        icon: Navigation,
        component: PedagioAPIConfigCRUD,
      },
      {
        id: "custos-veiculos",
        title: "Custos de Veículos",
        description: "Combustível e operação",
        icon: Fuel,
        component: CustosVeiculosCRUD,
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
        id: "calendario-regras",
        title: "Regras do Calendário",
        description: "Automação de tarefas",
        icon: Calendar,
        component: CalendarioRegrasCRUD,
      },
      {
        id: "seguranca",
        title: "Segurança e LGPD",
        description: "Políticas e conformidade",
        icon: Shield,
        component: SegurancaCRUD,
      },
    ],
  },
];

export function EstabelecimentoDetalhes({ estabelecimentoId, estabelecimentoNome }: EstabelecimentoDetalhesProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [userEstabId, setUserEstabId] = useState<string | null>(null);

  const categories = getConfigCategories();

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

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedItem(null);
  };

  const handleItemClick = (itemId: string) => {
    setSelectedItem(itemId);
    setSearchParams({ subsecao: itemId });
  };

  const handleBackToCategories = () => {
    setSelectedCategory(null);
    setSelectedItem(null);
    setSearchParams({});
  };

  const handleBackToItems = () => {
    setSelectedItem(null);
    setSearchParams({});
  };

  const currentCategory = categories.find(c => c.id === selectedCategory);
  const currentItem = currentCategory?.items.find(i => i.id === selectedItem);

  // Render item content
  if (selectedItem && currentItem && currentCategory) {
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
        <div className="space-y-2">
          {currentCategory.items.map((item) => (
            <Card 
              key={item.id}
              className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
              onClick={() => handleItemClick(item.id)}
            >
              <CardContent className="p-0">
                <div className="flex items-center gap-3 p-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                    currentCategory.bgColor
                  )}>
                    <item.icon className={cn("w-5 h-5", currentCategory.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Render categories list
  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <Card 
          key={category.id}
          className="overflow-hidden cursor-pointer hover:shadow-md active:scale-[0.99] transition-all"
          onClick={() => handleCategoryClick(category.id)}
        >
          <CardContent className="p-0">
            <div className="flex items-center gap-4 p-4">
              <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                category.bgColor
              )}>
                <category.icon className={cn("w-6 h-6", category.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">{category.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {category.items.length} configurações
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
