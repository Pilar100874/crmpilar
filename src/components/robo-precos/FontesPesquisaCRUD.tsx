import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Database, Globe, FileSpreadsheet, Info, Loader2, HelpCircle, ExternalLink, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getEstabelecimentoId } from "@/lib/estabelecimento";

interface FontePesquisa {
  id: string;
  nome_fonte: string;
  tipo: 'api' | 'scraping' | 'arquivo_importado';
  config_json: any;
  ativo: boolean;
  created_at: string;
}

const tipoConfig = {
  api: {
    label: "API",
    icon: Database,
    color: "bg-blue-500/20 text-blue-400",
    exemplo: ``,
    ajuda: ``
  },
  scraping: {
    label: "Scraping",
    icon: Globe,
    color: "bg-purple-500/20 text-purple-400",
    exemplo: `{
  "metodo": "fetch_html",
  "url_busca": "https://www.exemplo.com.br/busca?q={TERMO}",
  "seletores": {
    "container_produto": ".product-item",
    "nome": ".product-title",
    "preco": ".product-price",
    "link": ".product-link@href"
  },
  "regex_preco": "R\\\\$\\\\s*([\\\\d.,]+)",
  "headers": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
  },
  "timeout_ms": 10000,
  "limite_resultados": 20,
  "min_score_aceite": 0.45,
  "bonus_ean": 0.5
}`,
    ajuda: `Extraia preços diretamente de páginas web.
Use {TERMO} na URL para substituir pelo nome do produto.
Configure seletores CSS para localizar os elementos.
⚠️ IMPORTANTE: Use apenas em sites com permissão e respeite os termos de uso.`
  },
  arquivo_importado: {
    label: "Arquivo",
    icon: FileSpreadsheet,
    color: "bg-green-500/20 text-green-400",
    exemplo: `{
  "formato": "csv",
  "separador": ";",
  "encoding": "utf-8",
  "tem_cabecalho": true
}`,
    ajuda: `Importe planilhas de preços de concorrentes.
O sistema buscará produtos pelo NOME (similaridade Jaccard).
EAN/SKU são usados para bonus de validação.`
  }
};

// Guias de configuração detalhados para cada tipo de API
const apiHelpGuides: Record<string, {
  titulo: string;
  descricao: string;
  passos: string[];
  links: { label: string; url: string }[];
  custo: string;
  dificuldade: 'Fácil' | 'Médio' | 'Difícil';
  cor: string;
}> = {
  mercado_livre: {
    titulo: "Mercado Livre - API Pública",
    descricao: "API oficial do Mercado Livre para consulta de produtos. Funciona sem autenticação para buscas públicas.",
    passos: [
      "Não é necessário cadastro para buscas públicas",
      "Para uso avançado: Acesse developers.mercadolibre.com.br",
      "Crie uma aplicação para obter Client ID e Secret",
      "Configure as credenciais no formulário"
    ],
    links: [
      { label: "Portal do Desenvolvedor", url: "https://developers.mercadolibre.com.br" },
      { label: "Documentação da API", url: "https://developers.mercadolibre.com.br/es_ar/items-y-busquedas" }
    ],
    custo: "Gratuito (uso básico)",
    dificuldade: "Fácil",
    cor: "bg-yellow-500"
  },
  google_custom_search: {
    titulo: "Google Custom Search API",
    descricao: "Pesquisa em sites específicos usando a infraestrutura do Google. Ideal para comparar preços em múltiplos e-commerces.",
    passos: [
      "Acesse console.cloud.google.com e crie um projeto",
      "Ative a 'Custom Search API' em APIs & Services",
      "Vá em 'Credenciais' e crie uma API Key",
      "Acesse programmablesearchengine.google.com",
      "Crie um 'Mecanismo de Pesquisa Personalizado'",
      "Configure os sites que deseja pesquisar (ex: mercadolivre.com.br)",
      "Copie o ID do mecanismo (CX)",
      "Cole a API Key e o CX no formulário"
    ],
    links: [
      { label: "Google Cloud Console", url: "https://console.cloud.google.com/apis/credentials" },
      { label: "Programmable Search Engine", url: "https://programmablesearchengine.google.com/controlpanel/all" },
      { label: "Documentação", url: "https://developers.google.com/custom-search/v1/overview" }
    ],
    custo: "100 buscas/dia grátis. US$5 por 1000 buscas extras.",
    dificuldade: "Médio",
    cor: "bg-cyan-500"
  },
  firecrawl: {
    titulo: "Firecrawl - Web Scraping Inteligente",
    descricao: "Serviço de web scraping que extrai dados estruturados de páginas. Útil quando APIs não estão disponíveis.",
    passos: [
      "Acesse firecrawl.dev e crie uma conta",
      "Vá em Dashboard > API Keys",
      "Gere uma nova API Key",
      "Cole a API Key no formulário",
      "Configure os sites que deseja extrair dados"
    ],
    links: [
      { label: "Site Oficial", url: "https://firecrawl.dev" },
      { label: "Documentação", url: "https://docs.firecrawl.dev" },
      { label: "Dashboard", url: "https://firecrawl.dev/app" }
    ],
    custo: "500 créditos grátis/mês. Planos a partir de US$19/mês.",
    dificuldade: "Fácil",
    cor: "bg-red-500"
  },
  amazon: {
    titulo: "Amazon Product Advertising API",
    descricao: "API oficial da Amazon para consulta de produtos e preços. Requer conta no programa de afiliados.",
    passos: [
      "Cadastre-se no Amazon Associates (affiliate-program.amazon.com)",
      "Aguarde aprovação da conta (pode levar alguns dias)",
      "Acesse Product Advertising API",
      "Gere suas credenciais (Access Key e Secret Key)",
      "Crie uma Partner Tag",
      "Configure as credenciais no formulário"
    ],
    links: [
      { label: "Amazon Associates", url: "https://affiliate-program.amazon.com" },
      { label: "PA API Console", url: "https://webservices.amazon.com/paapi5/scratchpad" },
      { label: "Documentação", url: "https://webservices.amazon.com/paapi5/documentation" }
    ],
    custo: "Gratuito (requer vendas como afiliado para manter acesso)",
    dificuldade: "Difícil",
    cor: "bg-orange-500"
  },
  google_merchant: {
    titulo: "Google Merchant Center",
    descricao: "Acesse dados de produtos do Google Shopping via API. Requer conta de lojista no Merchant Center.",
    passos: [
      "Acesse console.cloud.google.com",
      "Crie um projeto e ative a Content API for Shopping",
      "Vá em IAM & Admin > Service Accounts",
      "Crie uma Service Account com permissão de leitura",
      "Gere uma chave JSON e extraia o email e private_key",
      "No Merchant Center, adicione a Service Account como usuário",
      "Cole as credenciais no formulário"
    ],
    links: [
      { label: "Google Cloud Console", url: "https://console.cloud.google.com" },
      { label: "Merchant Center", url: "https://merchants.google.com" },
      { label: "Documentação Content API", url: "https://developers.google.com/shopping-content/guides/quickstart" }
    ],
    custo: "Gratuito",
    dificuldade: "Difícil",
    cor: "bg-green-500"
  }
};

// Componente de guia de ajuda
const ApiHelpGuide = ({ tipoApi }: { tipoApi: string }) => {
  const guide = apiHelpGuides[tipoApi];
  if (!guide) return null;

  const getDifficultyColor = (dif: string) => {
    switch (dif) {
      case 'Fácil': return 'bg-green-500/20 text-green-400';
      case 'Médio': return 'bg-yellow-500/20 text-yellow-400';
      case 'Difícil': return 'bg-red-500/20 text-red-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${guide.cor}`} />
          <h3 className="font-semibold text-lg">{guide.titulo}</h3>
        </div>
        
        <p className="text-sm text-muted-foreground">{guide.descricao}</p>
        
        <div className="flex gap-2">
          <Badge variant="outline" className={getDifficultyColor(guide.dificuldade)}>
            {guide.dificuldade}
          </Badge>
          <Badge variant="outline" className="bg-muted">
            {guide.custo}
          </Badge>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">📋 Passo a Passo:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm">
            {guide.passos.map((passo, i) => (
              <li key={i} className="text-muted-foreground">{passo}</li>
            ))}
          </ol>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">🔗 Links Úteis:</h4>
          <div className="flex flex-col gap-1">
            {guide.links.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </ScrollArea>
  );
};

// Sites pré-configurados para scraping (fácil de usar)
const scrapingPresets: Record<string, {
  label: string;
  url_busca: string;
  seletores: {
    container_produto: string;
    nome: string;
    preco: string;
    link: string;
  };
  regex_preco: string;
  icon: string;
}> = {
  magazine_luiza: {
    label: "Magazine Luiza",
    url_busca: "https://www.magazineluiza.com.br/busca/{TERMO}/",
    seletores: {
      container_produto: "[data-testid='product-card']",
      nome: "[data-testid='product-title']",
      preco: "[data-testid='price-value']",
      link: "a[data-testid='product-card-container']@href"
    },
    regex_preco: "R\\$\\s*([\\d.,]+)",
    icon: "🏪"
  },
  americanas: {
    label: "Americanas",
    url_busca: "https://www.americanas.com.br/busca/{TERMO}",
    seletores: {
      container_produto: "[data-testid='product-card']",
      nome: "h3",
      preco: "[data-testid='price-current']",
      link: "a@href"
    },
    regex_preco: "R\\$\\s*([\\d.,]+)",
    icon: "🛒"
  },
  casas_bahia: {
    label: "Casas Bahia",
    url_busca: "https://www.casasbahia.com.br/busca/{TERMO}",
    seletores: {
      container_produto: ".product-card",
      nome: ".product-card__title",
      preco: ".product-card__price",
      link: "a@href"
    },
    regex_preco: "R\\$\\s*([\\d.,]+)",
    icon: "🏠"
  },
  ponto_frio: {
    label: "Ponto Frio",
    url_busca: "https://www.pontofrio.com.br/busca/{TERMO}",
    seletores: {
      container_produto: ".product-card",
      nome: ".product-card__title",
      preco: ".product-card__price",
      link: "a@href"
    },
    regex_preco: "R\\$\\s*([\\d.,]+)",
    icon: "❄️"
  },
  manual: {
    label: "Configuração Manual",
    url_busca: "",
    seletores: {
      container_produto: "",
      nome: "",
      preco: "",
      link: ""
    },
    regex_preco: "R\\$\\s*([\\d.,]+)",
    icon: "⚙️"
  }
};

export function FontesPesquisaCRUD() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editingFonte, setEditingFonte] = useState<FontePesquisa | null>(null);
  const [scrapingStep, setScrapingStep] = useState(1);
  const [formData, setFormData] = useState({
    nome_fonte: "",
    tipo: "api" as 'api' | 'scraping' | 'arquivo_importado',
    config_json: "",
    ativo: true,
    // Campos específicos para APIs
    tipo_api: "mercado_livre" as string,
    // Mercado Livre
    ml_client_id: "",
    ml_client_secret: "",
    ml_site_id: "MLB",
    // Amazon
    amazon_access_key: "",
    amazon_secret_key: "",
    amazon_partner_tag: "",
    amazon_region: "us-east-1",
    // Google Merchant
    google_merchant_id: "",
    google_client_email: "",
    google_private_key: "",
    // Google Custom Search
    google_cs_api_key: "",
    google_cs_cx: "",
    google_cs_sites: "mercadolivre.com.br,amazon.com.br,magazineluiza.com.br",
    // Firecrawl
    firecrawl_api_key: "",
    firecrawl_sites: "mercadolivre.com.br,amazon.com.br",
    // Comum
    limite_resultados: "20",
    min_score_aceite: "0.45",
    bonus_ean: "0.5",
    // Campos específicos para Scraping (simplificado)
    scraping_preset: "manual" as string,
    scraping_url_busca: "",
    scraping_seletor_container: "",
    scraping_seletor_nome: "",
    scraping_seletor_preco: "",
    scraping_seletor_link: "",
    scraping_regex_preco: "R\\$\\s*([\\d.,]+)",
    scraping_timeout: "10000",
    scraping_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  });

  const { data: fontes, isLoading } = useQuery({
    queryKey: ['fontes_pesquisa_precos'],
    queryFn: async () => {
      const estabelecimentoId = await getEstabelecimentoId();
      const { data, error } = await supabase
        .from('fontes_pesquisa_precos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as FontePesquisa[];
    }
  });

  // Função para construir config_json a partir dos campos do formulário
  const buildConfigJson = (data: typeof formData) => {
    // Para scraping - usar campos visuais
    if (data.tipo === 'scraping') {
      return {
        metodo: "fetch_html",
        url_busca: data.scraping_url_busca,
        seletores: {
          container_produto: data.scraping_seletor_container,
          nome: data.scraping_seletor_nome,
          preco: data.scraping_seletor_preco,
          link: data.scraping_seletor_link
        },
        regex_preco: data.scraping_regex_preco || "R\\$\\s*([\\d.,]+)",
        headers: {
          "User-Agent": data.scraping_user_agent || "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
        },
        timeout_ms: parseInt(data.scraping_timeout) || 10000,
        limite_resultados: parseInt(data.limite_resultados) || 20,
        min_score_aceite: parseFloat(data.min_score_aceite) || 0.45,
        bonus_ean: parseFloat(data.bonus_ean) || 0.5
      };
    }

    // Para arquivo importado - usar JSON manual
    if (data.tipo === 'arquivo_importado') {
      try {
        return data.config_json ? JSON.parse(data.config_json) : {};
      } catch {
        return {};
      }
    }

    const baseConfig: Record<string, any> = {
      tipo_api: data.tipo_api,
      limite_resultados: parseInt(data.limite_resultados) || 20,
      min_score_aceite: parseFloat(data.min_score_aceite) || 0.45,
      bonus_ean: parseFloat(data.bonus_ean) || 0.5,
    };

    switch (data.tipo_api) {
      case 'mercado_livre':
        return {
          ...baseConfig,
          site_id: data.ml_site_id || 'MLB',
          client_id: data.ml_client_id || '',
          client_secret: data.ml_client_secret || '',
        };
      case 'amazon':
        return {
          ...baseConfig,
          region: data.amazon_region || 'us-east-1',
          marketplace: 'www.amazon.com.br',
          access_key: data.amazon_access_key || '',
          secret_key: data.amazon_secret_key || '',
          partner_tag: data.amazon_partner_tag || '',
        };
      case 'google_merchant':
        return {
          ...baseConfig,
          merchant_id: data.google_merchant_id || '',
          client_email: data.google_client_email || '',
          private_key: data.google_private_key || '',
        };
      case 'google_custom_search':
        return {
          ...baseConfig,
          api_key: data.google_cs_api_key || '',
          cx: data.google_cs_cx || '',
          sites: (data.google_cs_sites || '').split(',').map(s => s.trim()).filter(Boolean),
        };
      case 'firecrawl':
        return {
          ...baseConfig,
          api_key: data.firecrawl_api_key || '',
          sites: (data.firecrawl_sites || '').split(',').map(s => s.trim()).filter(Boolean),
        };
      default:
        return baseConfig;
    }
  };

  // Função para extrair campos do config_json
  const parseConfigToFields = (config: any, tipo: string) => {
    const tipoApi = config?.tipo_api || 'mercado_livre';
    
    // Campos para scraping
    const scrapingFields = {
      scraping_preset: 'manual',
      scraping_url_busca: config?.url_busca || '',
      scraping_seletor_container: config?.seletores?.container_produto || '',
      scraping_seletor_nome: config?.seletores?.nome || '',
      scraping_seletor_preco: config?.seletores?.preco || '',
      scraping_seletor_link: config?.seletores?.link || '',
      scraping_regex_preco: config?.regex_preco || "R\\$\\s*([\\d.,]+)",
      scraping_timeout: String(config?.timeout_ms || 10000),
      scraping_user_agent: config?.headers?.["User-Agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    return {
      tipo_api: tipoApi,
      ml_client_id: config?.client_id || '',
      ml_client_secret: config?.client_secret || '',
      ml_site_id: config?.site_id || 'MLB',
      amazon_access_key: config?.access_key || '',
      amazon_secret_key: config?.secret_key || '',
      amazon_partner_tag: config?.partner_tag || '',
      amazon_region: config?.region || 'us-east-1',
      google_merchant_id: config?.merchant_id || '',
      google_client_email: config?.client_email || '',
      google_private_key: config?.private_key || '',
      google_cs_api_key: tipoApi === 'google_custom_search' ? (config?.api_key || '') : '',
      google_cs_cx: config?.cx || '',
      google_cs_sites: Array.isArray(config?.sites) ? config.sites.join(', ') : (config?.sites || 'mercadolivre.com.br,amazon.com.br,magazineluiza.com.br'),
      firecrawl_api_key: tipoApi === 'firecrawl' ? (config?.api_key || '') : '',
      firecrawl_sites: Array.isArray(config?.sites) ? config.sites.join(', ') : (config?.sites || 'mercadolivre.com.br,amazon.com.br'),
      limite_resultados: String(config?.limite_resultados || 20),
      min_score_aceite: String(config?.min_score_aceite || 0.45),
      bonus_ean: String(config?.bonus_ean || 0.5),
      ...scrapingFields,
    };
  };

  // Handler para aplicar preset de scraping
  const handleScrapingPresetChange = (presetKey: string) => {
    const preset = scrapingPresets[presetKey];
    if (preset) {
      setFormData(p => ({
        ...p,
        scraping_preset: presetKey,
        nome_fonte: presetKey === 'manual' ? p.nome_fonte : (p.nome_fonte || preset.label),
        scraping_url_busca: preset.url_busca,
        scraping_seletor_container: preset.seletores.container_produto,
        scraping_seletor_nome: preset.seletores.nome,
        scraping_seletor_preco: preset.seletores.preco,
        scraping_seletor_link: preset.seletores.link,
        scraping_regex_preco: preset.regex_preco,
      }));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const estabelecimentoId = await getEstabelecimentoId();
      const configJson = buildConfigJson(data);
      
      const { error } = await supabase.from('fontes_pesquisa_precos').insert({
        estabelecimento_id: estabelecimentoId,
        nome_fonte: data.nome_fonte,
        tipo: data.tipo,
        config_json: configJson,
        ativo: data.ativo
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      setShowDialog(false);
      resetForm();
      toast.success("Fonte criada com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const configJson = buildConfigJson(data);
      
      const { error } = await supabase.from('fontes_pesquisa_precos')
        .update({
          nome_fonte: data.nome_fonte,
          tipo: data.tipo,
          config_json: configJson,
          ativo: data.ativo
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      setShowDialog(false);
      setEditingFonte(null);
      resetForm();
      toast.success("Fonte atualizada");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('fontes_pesquisa_precos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fontes_pesquisa_precos'] });
      toast.success("Fonte excluída");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setFormData({
      nome_fonte: "",
      tipo: "api",
      config_json: "",
      ativo: true,
      tipo_api: "mercado_livre",
      ml_client_id: "",
      ml_client_secret: "",
      ml_site_id: "MLB",
      amazon_access_key: "",
      amazon_secret_key: "",
      amazon_partner_tag: "",
      amazon_region: "us-east-1",
      google_merchant_id: "",
      google_client_email: "",
      google_private_key: "",
      google_cs_api_key: "",
      google_cs_cx: "",
      google_cs_sites: "mercadolivre.com.br,amazon.com.br,magazineluiza.com.br",
      firecrawl_api_key: "",
      firecrawl_sites: "mercadolivre.com.br,amazon.com.br",
      limite_resultados: "20",
      min_score_aceite: "0.45",
      bonus_ean: "0.5",
      // Scraping fields
      scraping_preset: "manual",
      scraping_url_busca: "",
      scraping_seletor_container: "",
      scraping_seletor_nome: "",
      scraping_seletor_preco: "",
      scraping_seletor_link: "",
      scraping_regex_preco: "R\\$\\s*([\\d.,]+)",
      scraping_timeout: "10000",
      scraping_user_agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    });
    setScrapingStep(1);
  };

  const handleEdit = (fonte: FontePesquisa) => {
    setEditingFonte(fonte);
    const parsedFields = parseConfigToFields(fonte.config_json, fonte.tipo);
    setFormData({
      nome_fonte: fonte.nome_fonte,
      tipo: fonte.tipo,
      config_json: JSON.stringify(fonte.config_json, null, 2),
      ativo: fonte.ativo,
      ...parsedFields,
    });
    setScrapingStep(1);
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!formData.nome_fonte) {
      toast.error("Nome da fonte é obrigatório");
      return;
    }
    
    if (editingFonte) {
      updateMutation.mutate({ ...formData, id: editingFonte.id });
    } else {
      createMutation.mutate(formData);
    }
  };

  const TipoIcon = tipoConfig[formData.tipo].icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Fontes de Pesquisa</CardTitle>
          <CardDescription>Configure APIs, sites para scraping ou arquivos de preços</CardDescription>
        </div>
        <Dialog open={showDialog} onOpenChange={(open) => {
          setShowDialog(open);
          if (!open) {
            setEditingFonte(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Fonte
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFonte ? "Editar Fonte" : "Nova Fonte de Pesquisa"}</DialogTitle>
              <DialogDescription>Configure uma fonte para monitorar preços</DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome da Fonte *</Label>
                <Input
                  value={formData.nome_fonte}
                  onChange={(e) => setFormData(p => ({ ...p, nome_fonte: e.target.value }))}
                  placeholder="Ex: Mercado Livre, Amazon, Concorrente X"
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={formData.tipo} onValueChange={(v: any) => setFormData(p => ({ ...p, tipo: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        API
                      </div>
                    </SelectItem>
                    <SelectItem value="scraping">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Scraping
                      </div>
                    </SelectItem>
                    <SelectItem value="arquivo_importado">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Arquivo Importado
                      </div>
                    </SelectItem>
                  </SelectContent>
              </Select>
              </div>

              {/* Campos específicos para API */}
              {formData.tipo === 'api' && (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Tipo de API</Label>
                      {apiHelpGuides[formData.tipo_api] && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs text-muted-foreground">
                              <HelpCircle className="h-3 w-3" />
                              Como configurar
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96" align="end">
                            <ApiHelpGuide tipoApi={formData.tipo_api} />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <Select value={formData.tipo_api} onValueChange={(v) => setFormData(p => ({ ...p, tipo_api: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mercado_livre">Mercado Livre (API Pública)</SelectItem>
                        <SelectItem value="google_custom_search">Google Custom Search (Recomendado)</SelectItem>
                        <SelectItem value="firecrawl">Firecrawl (Web Scraping)</SelectItem>
                        <SelectItem value="amazon">Amazon Product Advertising</SelectItem>
                        <SelectItem value="google_merchant">Google Merchant Center</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Credenciais Mercado Livre */}
                  {formData.tipo_api === 'mercado_livre' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-blue-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-blue-500">
                        <Database className="h-4 w-4" />
                        Credenciais Mercado Livre
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Client ID</Label>
                          <Input
                            value={formData.ml_client_id}
                            onChange={(e) => setFormData(p => ({ ...p, ml_client_id: e.target.value }))}
                            placeholder="Ex: 1234567890123456"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Client Secret</Label>
                          <Input
                            type="password"
                            value={formData.ml_client_secret}
                            onChange={(e) => setFormData(p => ({ ...p, ml_client_secret: e.target.value }))}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Site ID</Label>
                        <Select value={formData.ml_site_id} onValueChange={(v) => setFormData(p => ({ ...p, ml_site_id: v }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MLB">MLB - Brasil</SelectItem>
                            <SelectItem value="MLA">MLA - Argentina</SelectItem>
                            <SelectItem value="MLM">MLM - México</SelectItem>
                            <SelectItem value="MLC">MLC - Chile</SelectItem>
                            <SelectItem value="MCO">MCO - Colômbia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Alert className="bg-blue-500/10 border-blue-500/20">
                        <Info className="h-4 w-4 text-blue-500" />
                        <AlertDescription className="text-xs">
                          Obtenha suas credenciais em <a href="https://developers.mercadolibre.com.br" target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">developers.mercadolibre.com.br</a>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Amazon */}
                  {formData.tipo_api === 'amazon' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-orange-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-orange-500">
                        <Database className="h-4 w-4" />
                        Credenciais Amazon Product Advertising API
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Access Key</Label>
                          <Input
                            value={formData.amazon_access_key}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_access_key: e.target.value }))}
                            placeholder="AKIAIOSFODNN7EXAMPLE"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Secret Key</Label>
                          <Input
                            type="password"
                            value={formData.amazon_secret_key}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_secret_key: e.target.value }))}
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Partner Tag</Label>
                          <Input
                            value={formData.amazon_partner_tag}
                            onChange={(e) => setFormData(p => ({ ...p, amazon_partner_tag: e.target.value }))}
                            placeholder="meutag-20"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Região</Label>
                          <Select value={formData.amazon_region} onValueChange={(v) => setFormData(p => ({ ...p, amazon_region: v }))}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="us-east-1">us-east-1 (Brasil)</SelectItem>
                              <SelectItem value="us-west-2">us-west-2</SelectItem>
                              <SelectItem value="eu-west-1">eu-west-1</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <Alert className="bg-orange-500/10 border-orange-500/20">
                        <Info className="h-4 w-4 text-orange-500" />
                        <AlertDescription className="text-xs">
                          Cadastre-se no <a href="https://affiliate-program.amazon.com" target="_blank" rel="noopener noreferrer" className="text-orange-500 underline">Amazon Associates</a> e acesse o Product Advertising API.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Google Merchant */}
                  {formData.tipo_api === 'google_merchant' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-green-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-green-500">
                        <Database className="h-4 w-4" />
                        Credenciais Google Merchant Center
                      </h4>
                      <div className="space-y-2">
                        <Label>Merchant ID</Label>
                        <Input
                          value={formData.google_merchant_id}
                          onChange={(e) => setFormData(p => ({ ...p, google_merchant_id: e.target.value }))}
                          placeholder="123456789"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Client Email (Service Account)</Label>
                        <Input
                          value={formData.google_client_email}
                          onChange={(e) => setFormData(p => ({ ...p, google_client_email: e.target.value }))}
                          placeholder="service@projeto.iam.gserviceaccount.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Private Key</Label>
                        <Textarea
                          value={formData.google_private_key}
                          onChange={(e) => setFormData(p => ({ ...p, google_private_key: e.target.value }))}
                          placeholder="-----BEGIN PRIVATE KEY-----&#10;...&#10;-----END PRIVATE KEY-----"
                          className="font-mono text-xs min-h-[100px]"
                        />
                      </div>
                      <Alert className="bg-green-500/10 border-green-500/20">
                        <Info className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-xs">
                          Configure uma Service Account no <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-green-500 underline">Google Cloud Console</a> com acesso ao Merchant Center.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Google Custom Search */}
                  {formData.tipo_api === 'google_custom_search' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-cyan-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-cyan-500">
                        <Globe className="h-4 w-4" />
                        Google Custom Search API
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>API Key *</Label>
                          <Input
                            type="password"
                            value={formData.google_cs_api_key}
                            onChange={(e) => setFormData(p => ({ ...p, google_cs_api_key: e.target.value }))}
                            placeholder="AIzaSy..."
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Search Engine ID (CX) *</Label>
                          <Input
                            value={formData.google_cs_cx}
                            onChange={(e) => setFormData(p => ({ ...p, google_cs_cx: e.target.value }))}
                            placeholder="a1b2c3d4e5f6g7h8i"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Sites para pesquisar (separados por vírgula)</Label>
                        <Input
                          value={formData.google_cs_sites}
                          onChange={(e) => setFormData(p => ({ ...p, google_cs_sites: e.target.value }))}
                          placeholder="mercadolivre.com.br, amazon.com.br, magazineluiza.com.br"
                        />
                      </div>
                      <Alert className="bg-cyan-500/10 border-cyan-500/20">
                        <Info className="h-4 w-4 text-cyan-500" />
                        <AlertDescription className="text-xs space-y-2">
                          <p><strong>Como configurar:</strong></p>
                          <ol className="list-decimal ml-4 space-y-1">
                            <li>Acesse <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-cyan-500 underline">Google Cloud Console</a></li>
                            <li>Crie um projeto e ative a "Custom Search API"</li>
                            <li>Crie uma API Key nas credenciais</li>
                            <li>Acesse <a href="https://programmablesearchengine.google.com/controlpanel/all" target="_blank" rel="noopener noreferrer" className="text-cyan-500 underline">Programmable Search Engine</a></li>
                            <li>Crie um mecanismo de pesquisa e copie o ID (CX)</li>
                          </ol>
                          <p className="text-muted-foreground mt-2">100 buscas/dia grátis. US$5 por 1000 buscas extras.</p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Credenciais Firecrawl */}
                  {formData.tipo_api === 'firecrawl' && (
                    <div className="space-y-4 p-4 border rounded-lg bg-red-500/5">
                      <h4 className="font-medium flex items-center gap-2 text-red-500">
                        <Globe className="h-4 w-4" />
                        Firecrawl (Web Scraping)
                      </h4>
                      <div className="space-y-2">
                        <Label>API Key *</Label>
                        <Input
                          type="password"
                          value={formData.firecrawl_api_key}
                          onChange={(e) => setFormData(p => ({ ...p, firecrawl_api_key: e.target.value }))}
                          placeholder="fc-..."
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Sites para pesquisar (separados por vírgula)</Label>
                        <Input
                          value={formData.firecrawl_sites}
                          onChange={(e) => setFormData(p => ({ ...p, firecrawl_sites: e.target.value }))}
                          placeholder="mercadolivre.com.br, amazon.com.br"
                        />
                      </div>
                      <Alert className="bg-red-500/10 border-red-500/20">
                        <Info className="h-4 w-4 text-red-500" />
                        <AlertDescription className="text-xs space-y-2">
                          <p><strong>Firecrawl</strong> é um serviço de web scraping que extrai dados estruturados de páginas.</p>
                          <p>Cadastre-se em <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="text-red-500 underline">firecrawl.dev</a> para obter sua API Key.</p>
                          <p className="text-muted-foreground">500 créditos grátis/mês. Planos pagos a partir de US$19/mês.</p>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

                  {/* Parâmetros comuns */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Parâmetros de Busca</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Limite de Resultados</Label>
                        <Input
                          type="number"
                          value={formData.limite_resultados}
                          onChange={(e) => setFormData(p => ({ ...p, limite_resultados: e.target.value }))}
                          min={1}
                          max={50}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Score Mínimo (0-1)</Label>
                        <Input
                          type="number"
                          step="0.05"
                          value={formData.min_score_aceite}
                          onChange={(e) => setFormData(p => ({ ...p, min_score_aceite: e.target.value }))}
                          min={0}
                          max={1}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Bônus EAN (0-1)</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={formData.bonus_ean}
                          onChange={(e) => setFormData(p => ({ ...p, bonus_ean: e.target.value }))}
                          min={0}
                          max={1}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Interface visual para Scraping */}
              {formData.tipo === 'scraping' && (
                <div className="space-y-4">
                  {/* Passo 1: Escolha do Site */}
                  <div className="space-y-4 p-4 border rounded-lg bg-purple-500/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">1</div>
                        <h4 className="font-semibold">Escolha o Site</h4>
                      </div>
                      <Badge variant="outline" className="bg-green-500/20 text-green-400">Fácil</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      Selecione um site pré-configurado ou configure manualmente
                    </p>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {Object.entries(scrapingPresets).map(([key, preset]) => (
                        <Button
                          key={key}
                          type="button"
                          variant={formData.scraping_preset === key ? "default" : "outline"}
                          className="h-auto py-3 flex flex-col gap-1"
                          onClick={() => handleScrapingPresetChange(key)}
                        >
                          <span className="text-lg">{preset.icon}</span>
                          <span className="text-xs">{preset.label}</span>
                        </Button>
                      ))}
                    </div>

                    {formData.scraping_preset !== 'manual' && formData.scraping_preset && (
                      <Alert className="bg-green-500/10 border-green-500/20">
                        <Info className="h-4 w-4 text-green-500" />
                        <AlertDescription className="text-xs">
                          ✅ Configuração automática aplicada! Os campos abaixo foram preenchidos para você.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>

                  {/* Passo 2: URL de Busca */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">2</div>
                      <h4 className="font-semibold">URL de Busca</h4>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>URL onde o sistema vai buscar os produtos</Label>
                      <Input
                        value={formData.scraping_url_busca}
                        onChange={(e) => setFormData(p => ({ ...p, scraping_url_busca: e.target.value }))}
                        placeholder="https://www.exemplo.com.br/busca/{TERMO}"
                      />
                      <p className="text-xs text-muted-foreground">
                        💡 Use <code className="bg-muted px-1 rounded">{"{TERMO}"}</code> no lugar do produto a ser buscado
                      </p>
                    </div>

                    <Alert className="bg-blue-500/10 border-blue-500/20">
                      <Search className="h-4 w-4 text-blue-500" />
                      <AlertDescription className="text-xs">
                        <strong>Como descobrir a URL:</strong><br/>
                        1. Vá ao site do concorrente<br/>
                        2. Busque por qualquer produto (ex: "celular")<br/>
                        3. Copie a URL da barra de endereço<br/>
                        4. Substitua "celular" por <code className="bg-muted px-1 rounded">{"{TERMO}"}</code>
                      </AlertDescription>
                    </Alert>
                  </div>

                  {/* Passo 3: Seletores (modo assistido) */}
                  <div className="space-y-4 p-4 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold">3</div>
                        <h4 className="font-semibold">Identificação dos Elementos</h4>
                      </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            Como encontrar?
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80">
                          <div className="space-y-2 text-sm">
                            <p className="font-medium">📋 Como encontrar os seletores:</p>
                            <ol className="list-decimal ml-4 space-y-1 text-xs text-muted-foreground">
                              <li>Abra o site no Chrome</li>
                              <li>Clique com botão direito no elemento</li>
                              <li>Escolha "Inspecionar"</li>
                              <li>Clique direito no código → "Copy" → "Copy selector"</li>
                            </ol>
                            <a 
                              href="https://www.youtube.com/watch?v=GVn4rH2R9O0" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Ver vídeo tutorial (YouTube)
                            </a>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {formData.scraping_preset !== 'manual' && (
                      <Alert className="bg-amber-500/10 border-amber-500/20">
                        <Info className="h-4 w-4 text-amber-500" />
                        <AlertDescription className="text-xs">
                          ⚠️ Estes seletores são exemplos e podem precisar de ajustes. Sites atualizam suas páginas frequentemente.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          📦 Container do Produto
                          <span className="text-xs text-muted-foreground">(obrigatório)</span>
                        </Label>
                        <Input
                          value={formData.scraping_seletor_container}
                          onChange={(e) => setFormData(p => ({ ...p, scraping_seletor_container: e.target.value }))}
                          placeholder="Ex: .product-card ou [data-testid='product']"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          A "caixa" que contém cada produto na lista
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          🏷️ Nome do Produto
                          <span className="text-xs text-muted-foreground">(obrigatório)</span>
                        </Label>
                        <Input
                          value={formData.scraping_seletor_nome}
                          onChange={(e) => setFormData(p => ({ ...p, scraping_seletor_nome: e.target.value }))}
                          placeholder="Ex: .product-title ou h2"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Onde aparece o nome/título do produto
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          💰 Preço
                          <span className="text-xs text-muted-foreground">(obrigatório)</span>
                        </Label>
                        <Input
                          value={formData.scraping_seletor_preco}
                          onChange={(e) => setFormData(p => ({ ...p, scraping_seletor_preco: e.target.value }))}
                          placeholder="Ex: .price ou [data-testid='price']"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Onde aparece o preço do produto
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          🔗 Link do Produto
                          <span className="text-xs text-muted-foreground">(opcional)</span>
                        </Label>
                        <Input
                          value={formData.scraping_seletor_link}
                          onChange={(e) => setFormData(p => ({ ...p, scraping_seletor_link: e.target.value }))}
                          placeholder="Ex: a@href ou .product-link@href"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Use @href para pegar o endereço do link
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Passo 4: Configurações Avançadas (colapsável) */}
                  <details className="border rounded-lg">
                    <summary className="p-4 cursor-pointer flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold">4</div>
                      <span className="font-medium">Configurações Avançadas</span>
                      <span className="text-xs text-muted-foreground ml-2">(opcional)</span>
                    </summary>
                    <div className="p-4 pt-0 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Limite de Resultados</Label>
                          <Input
                            type="number"
                            value={formData.limite_resultados}
                            onChange={(e) => setFormData(p => ({ ...p, limite_resultados: e.target.value }))}
                            min={1}
                            max={50}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Quantos produtos buscar por pesquisa
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Precisão Mínima (0-1)</Label>
                          <Input
                            type="number"
                            step="0.05"
                            value={formData.min_score_aceite}
                            onChange={(e) => setFormData(p => ({ ...p, min_score_aceite: e.target.value }))}
                            min={0}
                            max={1}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Menor = mais resultados, Maior = mais precisos
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Tempo Limite (ms)</Label>
                          <Input
                            type="number"
                            value={formData.scraping_timeout}
                            onChange={(e) => setFormData(p => ({ ...p, scraping_timeout: e.target.value }))}
                            min={5000}
                            max={30000}
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Quanto tempo esperar pela resposta (10000 = 10s)
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Regex de Preço</Label>
                          <Input
                            value={formData.scraping_regex_preco}
                            onChange={(e) => setFormData(p => ({ ...p, scraping_regex_preco: e.target.value }))}
                            placeholder="R\\$\\s*([\\d.,]+)"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Padrão para extrair valores numéricos
                          </p>
                        </div>
                      </div>
                    </div>
                  </details>

                  <Alert className="bg-amber-500/10 border-amber-500/20">
                    <Info className="h-4 w-4 text-amber-500" />
                    <AlertDescription className="text-xs">
                      <strong>⚠️ Importante:</strong> Web scraping deve ser usado respeitando os termos de uso dos sites.
                      Muitos sites atualizam suas páginas frequentemente, o que pode exigir ajustes nos seletores.
                    </AlertDescription>
                  </Alert>
                </div>
              )}

              {/* Para arquivo importado - mostrar JSON manual */}
              {formData.tipo === 'arquivo_importado' && (
                <>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <strong>Exemplo de configuração para {tipoConfig[formData.tipo].label}:</strong>
                      <pre className="mt-2 text-[10px] bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {tipoConfig[formData.tipo].exemplo}
                      </pre>
                      <p className="mt-2 text-muted-foreground">
                        {tipoConfig[formData.tipo].ajuda}
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <Label>Configuração (JSON)</Label>
                    <Textarea
                      value={formData.config_json}
                      onChange={(e) => setFormData(p => ({ ...p, config_json: e.target.value }))}
                      placeholder="Cole aqui o JSON de configuração..."
                      className="font-mono text-xs min-h-[200px]"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.ativo}
                  onCheckedChange={(checked) => setFormData(p => ({ ...p, ativo: checked }))}
                />
                <Label>Fonte ativa</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {editingFonte ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : fontes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma fonte cadastrada. Clique em "Nova Fonte" para começar.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fontes?.map((fonte) => {
                const config = tipoConfig[fonte.tipo];
                const Icon = config.icon;
                const tipoApi = fonte.config_json?.tipo_api;
                const hasHelp = tipoApi && apiHelpGuides[tipoApi];
                
                return (
                  <TableRow key={fonte.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {fonte.nome_fonte}
                        {tipoApi && (
                          <Badge variant="secondary" className="text-xs">
                            {tipoApi.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={config.color}>
                        <Icon className="h-3 w-3 mr-1" />
                        {config.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={fonte.ativo ? "default" : "secondary"}>
                        {fonte.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {hasHelp && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" title="Como configurar">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-96" align="end">
                            <ApiHelpGuide tipoApi={tipoApi} />
                          </PopoverContent>
                        </Popover>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(fonte)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir esta fonte?")) {
                            deleteMutation.mutate(fonte.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
