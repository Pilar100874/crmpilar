import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Produto, Orcamento, OrcamentoItem } from "@/types/orcamento";
import { aplicarRegrasAutomacao } from "@/services/automacaoFlowEngine";
import { usePedagioCalculation } from "@/hooks/usePedagioCalculation";
import { useRouteCalculation } from "@/hooks/useRouteCalculation";
import { useRouteAddresses } from "@/hooks/useRouteAddresses";
import { calculateFreteCost, VeiculoConfig, ViagemInput, FreteResult } from "@/hooks/useFreteCalculation";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  ShoppingCart, 
  User,
  DollarSign,
  X,
  Share2,
  Camera,
  Lightbulb,
  History,
  Tag,
  Filter,
  Grid,
  List,
  Check,
  ChevronsUpDown,
  ChevronRight,
  ChevronLeft,
  Package,
  Maximize2,
  Eye,
  Truck,
  Loader2,
  AlertCircle,
  PanelLeft
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import ImageItemExtractor from "./ImageItemExtractor";
import { ConjuntoSelectorDialog } from "./ConjuntoSelectorDialog";
import { PedagioDetailsDialog } from "./PedagioDetailsDialog";
import MobilePOSLayout from "./MobilePOSLayout";
import FreteDetailsPanel from "./FreteDetailsPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Info } from "lucide-react";

interface POSViewProps {
  estabelecimentoId: string;
  orcamentoId?: string | null;
  onClose?: () => void;
  showClientDetails?: boolean;
  onToggleClientDetails?: () => void;
  showPanelToggle?: boolean;
  onTogglePanel?: () => void;
  initialEmpresaId?: string | null;
}

export default function POSView({ 
  estabelecimentoId, 
  orcamentoId, 
  onClose,
  showClientDetails = false,
  onToggleClientDetails,
  showPanelToggle = false,
  onTogglePanel,
  initialEmpresaId
}: POSViewProps) {
  const isMobile = useIsMobile();
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const isCompact = isMobile || windowWidth < 1024;
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [grupos, setGrupos] = useState<any[]>([]);
  const [empresas, setEmpresas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmpresa, setSelectedEmpresa] = useState<string>(initialEmpresaId || "");
  const [selectedCliente, setSelectedCliente] = useState<string>("");
  const [openEmpresaCombobox, setOpenEmpresaCombobox] = useState(false);
  const [openClienteCombobox, setOpenClienteCombobox] = useState(false);
  const [cartItems, setCartItems] = useState<Map<string, { produto: Produto; quantity: number; preco: number }>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("cart");
  const [currentOrcamentoId, setCurrentOrcamentoId] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string>("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [regrasAplicadas, setRegrasAplicadas] = useState<Array<{ nome: string; detalhes: string; desconto?: number; percentual?: number }>>([]);
  const [valorComRegras, setValorComRegras] = useState<number>(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [usuarioResponsavel, setUsuarioResponsavel] = useState<{ id: string; nome: string } | null>(null);
  const [isClienteDeOutroUsuario, setIsClienteDeOutroUsuario] = useState(false);
  const [detalhesRegras, setDetalhesRegras] = useState<string>("");
  const [expandedRegraIndex, setExpandedRegraIndex] = useState<number | null>(null);
  const [showSuggestionsModal, setShowSuggestionsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showConjuntoDialog, setShowConjuntoDialog] = useState(false);
  const [conjuntoSelecionado, setConjuntoSelecionado] = useState<string | null>(null);
  const [conjuntoItens, setConjuntoItens] = useState<Array<{
    id: string;
    produto_id: string;
    quantidade_padrao: number;
    preco_padrao?: number;
    quantidade: number;
    preco: number;
    produto?: { id: string; nome: string };
  }>>([]);
  
  // Filtros avançados - Dynamic custom fields
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [camposCustomizados, setCamposCustomizados] = useState<Array<{
    id: string;
    campo_key: string;
    nome: string;
    tipo: string;
    unidade?: string;
    opcoes?: any;
    pesquisa_faixa?: boolean;
  }>>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<{
    range: Record<string, { min: string; max: string }>;
    text: Record<string, string>;
    select: Record<string, string>;
    checkbox: Record<string, boolean | null>;
    number: Record<string, string>;
  }>({
    range: {},
    text: {},
    select: {},
    checkbox: {},
    number: {}
  });
  
  const primeiroInputRef = useRef<HTMLInputElement>(null);
  const isLoadingOrcamentoRef = useRef(false);
  const [showCartDialog, setShowCartDialog] = useState(false);
  const [cartSearchQuery, setCartSearchQuery] = useState("");
  const [cartSortBy, setCartSortBy] = useState<"nome" | "quantidade" | "preco" | "subtotal">("nome");
  const [tempCartItems, setTempCartItems] = useState<Map<string, { produto: Produto; quantity: number; preco: number }>>(new Map());
  const [showRegrasDialog, setShowRegrasDialog] = useState(false);
  const [gruposQuantities, setGruposQuantities] = useState<Map<string, number>>(new Map());
  const [selectedProduto, setSelectedProduto] = useState<Produto | null>(null);
  const [showPedagioDetailsDialog, setShowPedagioDetailsDialog] = useState(false);
  const [pedagioDialogDefaultTab, setPedagioDialogDefaultTab] = useState("map");
  const [freteIdaEVolta, setFreteIdaEVolta] = useState(true);
  const [showRegrasInDetails, setShowRegrasInDetails] = useState(false);
  const [showFreteInDetails, setShowFreteInDetails] = useState(false);
  const [freteResult, setFreteResult] = useState<FreteResult | null>(null);
  const [numAjudantes, setNumAjudantes] = useState(0);
  const [veiculoConfig, setVeiculoConfig] = useState<VeiculoConfig | null>(null);
  const [showFreteDetailedInTab, setShowFreteDetailedInTab] = useState(false);

  // Load custom fields when group changes
  useEffect(() => {
    if (selectedGrupo && selectedGrupo !== "" && selectedGrupo !== "all") {
      loadCamposCustomizados(selectedGrupo);
    } else {
      setCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [selectedGrupo]);

  const loadCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setCamposCustomizados(data || []);
      
      const newFilters: typeof customFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };
      (data || []).forEach(campo => {
        if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
          newFilters.range[campo.campo_key] = { min: "", max: "" };
        } else if (campo.tipo === 'numero') {
          newFilters.number[campo.campo_key] = "";
        } else if (campo.tipo === 'texto') {
          newFilters.text[campo.campo_key] = "";
        } else if (campo.tipo === 'selecao') {
          newFilters.select[campo.campo_key] = "";
        } else if (campo.tipo === 'checkbox') {
          newFilters.checkbox[campo.campo_key] = null;
        }
      });
      setCustomFieldFilters(newFilters);
    } catch (error) {
      console.error('Erro ao carregar campos customizados:', error);
      setCamposCustomizados([]);
    }
  };

  const updateCustomFilter = (type: keyof typeof customFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      [type]: { ...prev[type], [campoKey]: value }
    }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: {
        ...prev.range,
        [campoKey]: { ...prev.range[campoKey], [field]: value }
      }
    }));
  };

  const clearAllFilters = () => {
    setSelectedGrupo("");
    setCamposCustomizados([]);
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  };

  const hasActiveFilters = selectedGrupo && selectedGrupo !== "all" || 
    Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v) ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

  // Resize handler for responsiveness
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hook para buscar endereços automaticamente quando empresa muda
  const routeAddresses = useRouteAddresses(selectedEmpresa || null);
  
  // Hook para cálculo automático de rota (km/tempo) - executa imediatamente
  const { routeInfo: autoRouteInfo, loading: routeLoading } = useRouteCalculation(
    routeAddresses.origemEndereco,
    routeAddresses.destinoEndereco,
    routeAddresses.origemCep,
    routeAddresses.destinoCep,
    freteIdaEVolta
  );
  
  // Hook para cálculo de pedágio (manual - só quando clicar no botão)
  const pedagioResult = usePedagioCalculation(estabelecimentoId, selectedEmpresa);

  // Reset pedágio e contato quando trocar empresa (exceto quando carregando orçamento)
  useEffect(() => {
    if (isLoadingOrcamentoRef.current) return;
    pedagioResult.reset();
    setSelectedCliente("");
    setClientes([]);
  }, [selectedEmpresa]);

  // Carregar contatos da empresa selecionada (exceto quando carregando orçamento)
  useEffect(() => {
    if (isLoadingOrcamentoRef.current) return;
    
    const loadClientesPorEmpresa = async () => {
      if (!selectedEmpresa) {
        setClientes([]);
        return;
      }
      
      try {
        const { data, error } = await supabase
          .from('customer_empresas')
          .select(`
            customer_id,
            customers:customer_id (
              id,
              nome,
              email,
              telefone
            )
          `)
          .eq('empresa_id', selectedEmpresa);

        if (error) throw error;
        
        const clientesFormatados = (data || [])
          .map(item => item.customers)
          .filter(Boolean);
        
        setClientes(clientesFormatados);
        
        // Se só tiver um contato, selecionar automaticamente
        if (clientesFormatados.length === 1) {
          setSelectedCliente(clientesFormatados[0].id);
        }
      } catch (error: any) {
        console.error('Erro ao carregar contatos da empresa:', error);
        setClientes([]);
      }
    };
    
    loadClientesPorEmpresa();
  }, [selectedEmpresa]);

  // Verificar se o contato selecionado pertence ao usuário logado
  useEffect(() => {
    const verificarResponsavel = async () => {
      setIsClienteDeOutroUsuario(false);
      setUsuarioResponsavel(null);
      
      if (!selectedCliente || !currentUserId) return;
      
      try {
        // Buscar usuário responsável pelo contato
        const { data: vinculoData, error } = await supabase
          .from('customer_vinculos')
          .select(`
            usuario_id,
            usuario:usuarios!customer_vinculos_usuario_id_fkey(id, nome)
          `)
          .eq('customer_id', selectedCliente)
          .not('usuario_id', 'is', null)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Erro ao verificar responsável:', error);
          return;
        }

        if (vinculoData && vinculoData.usuario_id && vinculoData.usuario_id !== currentUserId) {
          setIsClienteDeOutroUsuario(true);
          setUsuarioResponsavel(vinculoData.usuario as any);
        }
      } catch (error) {
        console.error('Erro ao verificar responsável:', error);
      }
    };

    verificarResponsavel();
  }, [selectedCliente, currentUserId]);

  // Carregar configuração de veículo para cálculo de frete
  useEffect(() => {
    const loadVeiculoConfig = async () => {
      try {
        // Buscar primeiro veículo configurado para o estabelecimento
        const { data: veiculoCusto, error } = await supabase
          .from('veiculos_custos')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .limit(1)
          .single();

        if (error || !veiculoCusto) {
          console.log('Nenhum veículo configurado para cálculo de frete');
          return;
        }

        // Buscar preço do combustível
        const { data: precosCombustivel } = await supabase
          .from('combustiveis_precos')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .single();

        // Determinar preço do combustível baseado no tipo
        let valorCombustivel = 6.0; // Valor padrão
        if (precosCombustivel) {
          switch (veiculoCusto.tipo_combustivel) {
            case 'diesel':
              valorCombustivel = precosCombustivel.preco_diesel || 6.0;
              break;
            case 'gasolina':
              valorCombustivel = precosCombustivel.preco_gasolina || 5.5;
              break;
            case 'etanol':
              valorCombustivel = precosCombustivel.preco_etanol || 4.0;
              break;
            case 'eletrico':
              valorCombustivel = precosCombustivel.preco_eletrico || 0.5;
              break;
          }
        }

        setVeiculoConfig({
          manutencaoMensal: veiculoCusto.custo_manutencao_mensal || 0,
          extrasMensais: veiculoCusto.extras || 0,
          salarioMotorista: veiculoCusto.custo_funcionario_mensal || 3000,
          valorAjudanteDia: veiculoCusto.valor_ajudante || 150,
          valorRefeicao: veiculoCusto.valor_refeicao || 30,
          valorCombustivel,
          mediaConsumo: veiculoCusto.consumo_estrada || 10,
          pernoite: veiculoCusto.pernoite || 100,
          adicHoraExtraPerc: veiculoCusto.adic_hora_extra_perc || 50,
          jornadaBaseDia: veiculoCusto.jornada_base_dia || 8,
          horasMensais: veiculoCusto.horas_mensais || 220,
        });
      } catch (error) {
        console.error('Erro ao carregar config de veículo:', error);
      }
    };

    loadVeiculoConfig();
  }, [estabelecimentoId]);

  // Calcular frete quando temos rota e veículo configurado
  useEffect(() => {
    if (!veiculoConfig || !autoRouteInfo) {
      setFreteResult(null);
      return;
    }

    const viagem: ViagemInput = {
      tempoViagem: autoRouteInfo.duration / 60, // Converter minutos para horas
      kmViagem: autoRouteInfo.distance / (freteIdaEVolta ? 2 : 1), // Km só ida
      consideraIdaVolta: freteIdaEVolta,
      numAjudantes: numAjudantes,
      pedagioTotal: pedagioResult.calculated ? pedagioResult.total : 0,
    };

    const result = calculateFreteCost(veiculoConfig, viagem);
    setFreteResult(result);
  }, [veiculoConfig, autoRouteInfo, freteIdaEVolta, numAjudantes, pedagioResult.total, pedagioResult.calculated]);

  // Carregar ID do usuário logado
  useEffect(() => {
    const loadCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: userData } = await supabase
          .from('usuarios')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
        if (userData) {
          setCurrentUserId(userData.id);
        }
      }
    };
    loadCurrentUser();
  }, []);

  useEffect(() => {
    loadProdutos();
    loadGrupos();
    loadEmpresas();
    if (orcamentoId) {
      loadOrcamento(orcamentoId);
    }
  }, [orcamentoId]);

  // Aplicar regras em tempo real
  useEffect(() => {
    const aplicarRegrasTempoReal = async () => {
      // Resetar se não houver itens ou empresa
      if (cartItems.size === 0 || !selectedEmpresa) {
        setRegrasAplicadas([]);
        setValorComRegras(getTotal());
        setDetalhesRegras("");
        return;
      }

      try {
        // Buscar empresa selecionada
        const { data: empresaData, error: empresaError } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', selectedEmpresa)
          .single();

        if (empresaError || !empresaData) {
          console.error("Erro ao buscar empresa:", empresaError);
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        // Buscar regras ativas
        // Buscar regras ativas de automação
        const { data: regras, error: regrasError } = await supabase
          .from('automacoes_vendas')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('ativo', true)
          .order('prioridade', { ascending: false });

        // Buscar configuração de automação
        const { data: estabelecimentoConfig } = await supabase
          .from('estabelecimentos')
          .select('automacao_vendas_config')
          .eq('id', estabelecimentoId)
          .single();

        if (regrasError) {
          console.error("Erro ao buscar regras:", regrasError);
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        if (!regras || regras.length === 0) {
          setRegrasAplicadas([]);
          setValorComRegras(getTotal());
          setDetalhesRegras("");
          return;
        }

        const valorInicial = getTotal();
        const customFields = empresaData?.custom_fields as any;
        const mesAniversario = customFields?.mes_aniversario;

        const resultado = await aplicarRegrasAutomacao(
          {
            valor_total: valorInicial,
            quantidade_produtos: cartItems.size,
            data_compra: new Date(),
            cliente: {
              id: empresaData?.id || '',
              mes_aniversario: mesAniversario
            },
            empresa_id: selectedEmpresa,
            vendedor_id: undefined
          },
          regras as any[],
          (estabelecimentoConfig?.automacao_vendas_config || { nao_acumular_descontos: false }) as { nao_acumular_descontos?: boolean }
        );

        setValorComRegras(resultado.valorFinal);
        
        // Converter para formato com detalhes
        const regrasComDetalhes = resultado.regrasAplicadas.map((nome, index) => {
          const desconto = resultado.descontos[index];
          const valorDesconto = desconto ? desconto.valor : 0;
          const percentualDesconto = desconto ? desconto.percentual : 0;
          const detalhe = resultado.detalhes[index] || '';
          
          return {
            nome,
            detalhes: detalhe || `Desconto: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorDesconto)}${percentualDesconto ? ` (${percentualDesconto}%)` : ''}`,
            desconto: valorDesconto,
            percentual: percentualDesconto
          };
        });
        setRegrasAplicadas(regrasComDetalhes);
        
        // Criar texto descritivo das regras
        let detalhes = "";
        if (resultado.descontos.length > 0) {
          resultado.descontos.forEach((desconto: any) => {
            const valorDesconto = valorInicial - resultado.valorFinal;
            detalhes += `${desconto.regra}: -${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(valorDesconto)}\n`;
          });
        }
        setDetalhesRegras(detalhes);
      } catch (error) {
        console.error("Erro ao aplicar regras:", error);
        // Em caso de erro, manter o valor sem regras
        setRegrasAplicadas([]);
        setValorComRegras(getTotal());
        setDetalhesRegras("");
      }
    };

    aplicarRegrasTempoReal();
  }, [cartItems, selectedEmpresa, estabelecimentoId]);

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          grupo:produto_grupos(id, nome)
        `)
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;
      setProdutos((data as any) || []);
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error('Erro ao carregar produtos');
    }
  };

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('id, nome')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, nome_fantasia, cnpj')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome_fantasia');

      if (error) throw error;
      setEmpresas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar empresas:', error);
    }
  };

  const loadOrcamento = async (id: string) => {
    try {
      setLoading(true);
      isLoadingOrcamentoRef.current = true;
      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          itens:orcamento_itens(
            *,
            produto:produtos(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Preencher empresa
        setSelectedEmpresa(data.empresa_id);
        
        // Carregar contatos da empresa antes de definir o cliente
        if (data.empresa_id) {
          try {
            const { data: clientesData } = await supabase
              .from('customer_empresas')
              .select(`
                customer_id,
                customers:customer_id (
                  id,
                  nome,
                  email,
                  telefone
                )
              `)
              .eq('empresa_id', data.empresa_id);
            
            const clientesFormatados = (clientesData || [])
              .map(item => item.customers)
              .filter(Boolean);
            
            setClientes(clientesFormatados);
            
            // Preencher cliente se existir
            if (data.cliente_id) {
              setSelectedCliente(data.cliente_id);
            }
          } catch (err) {
            console.error('Erro ao carregar contatos:', err);
          }
        }
        
        // Preencher carrinho com itens
        const newCart = new Map<string, { produto: Produto; quantity: number; preco: number }>();
        data.itens?.forEach((item: any) => {
          if (item.produto) {
            newCart.set(item.produto.id, {
              produto: item.produto,
              quantity: item.quantidade,
              preco: item.preco_unitario || 10
            });
          }
        });
        setCartItems(newCart);
        
        // Definir ID e link de compartilhamento se existir
        setCurrentOrcamentoId(data.id);
        if (data.token_compartilhamento) {
          const link = `${window.location.origin}/orcamento/${data.token_compartilhamento}`;
          setShareLink(link);
          setActiveTab("share");
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar orçamento:', error);
      toast.error('Erro ao carregar orçamento');
    } finally {
      setLoading(false);
      isLoadingOrcamentoRef.current = false;
    }
  };

  const filteredProdutos = produtos.filter(p => {
    // Filtro por nome, EAN ou código
    if (searchQuery) {
      const term = searchQuery.toLowerCase();
      const matchNome = p.nome?.toLowerCase().includes(term);
      const matchEan = p.ean_13?.toLowerCase().includes(term);
      const matchCodigo = p.codigo?.toLowerCase().includes(term);
      if (!matchNome && !matchEan && !matchCodigo) {
        return false;
      }
    }
    
    // Filtro de grupo
    if (selectedGrupo && selectedGrupo !== 'all' && selectedGrupo !== '' && p.grupo_id !== selectedGrupo) {
      return false;
    }
    
    // Filtros de campos customizados
    const produtoCustomFields = (p as any).campos_customizados || {};
    
    // Range filters
    for (const [key, range] of Object.entries(customFieldFilters.range)) {
      if (range?.min || range?.max) {
        const value = produtoCustomFields[key];
        if (value !== undefined && value !== null) {
          if (range.min && Number(value) < Number(range.min)) return false;
          if (range.max && Number(value) > Number(range.max)) return false;
        }
      }
    }
    
    // Number filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.number)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (value !== undefined && value !== null && Number(value) !== Number(filterValue)) {
          return false;
        }
      }
    }
    
    // Text filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.text)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (!value || !String(value).toLowerCase().includes(filterValue.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Select filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.select)) {
      if (filterValue) {
        const value = produtoCustomFields[key];
        if (value !== filterValue) return false;
      }
    }
    
    // Checkbox filters
    for (const [key, filterValue] of Object.entries(customFieldFilters.checkbox)) {
      if (filterValue !== null) {
        const value = produtoCustomFields[key];
        if (Boolean(value) !== filterValue) return false;
      }
    }
    
    return true;
  });

  const addToCart = (produto: Produto) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const existing = newCart.get(produto.id);
      
      if (existing) {
        newCart.set(produto.id, {
          produto,
          quantity: existing.quantity + 1,
          preco: existing.preco
        });
      } else {
        newCart.set(produto.id, { produto, quantity: 1, preco: 10 });
      }
      
      return newCart;
    });
  };

  const updateQuantity = (produtoId: string, delta: number) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(produtoId);
      
      if (item) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) {
          newCart.delete(produtoId);
        } else {
          newCart.set(produtoId, { ...item, quantity: newQty });
        }
      }
      
      return newCart;
    });
  };

  const removeFromCart = (produtoId: string) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      newCart.delete(produtoId);
      return newCart;
    });
  };

  const updatePrice = (produtoId: string, newPrice: number) => {
    setCartItems(prev => {
      const newCart = new Map(prev);
      const item = newCart.get(produtoId);
      
      if (item) {
        newCart.set(produtoId, { ...item, preco: newPrice });
      }
      
      return newCart;
    });
  };

  const getTotal = () => {
    return Array.from(cartItems.values()).reduce((sum, item) => {
      return sum + (item.quantity * item.preco);
    }, 0);
  };

  const handleFinalize = async () => {
    if (!selectedEmpresa) {
      toast.error('Selecione uma empresa');
      return;
    }

    if (cartItems.size === 0) {
      toast.error('Adicione itens ao carrinho');
      return;
    }

    setLoading(true);
    try {
      // Buscar empresa selecionada para obter dados do cliente
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', selectedEmpresa)
        .single();

      // Buscar regras ativas de automação
      const { data: regras } = await supabase
        .from('automacoes_vendas')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('ativo', true)
        .order('prioridade', { ascending: false });

      // Buscar configuração de automação
      const { data: estabelecimentoConfig } = await supabase
        .from('estabelecimentos')
        .select('automacao_vendas_config')
        .eq('id', estabelecimentoId)
        .single();

      // Calcular valor total inicial
      const valorInicial = getTotal();

      // Aplicar regras de automação
      let valorFinal = valorInicial;
      let descontosAplicados: any[] = [];
      let regrasAplicadas: string[] = [];

      if (regras && regras.length > 0) {
        const customFields = empresaData?.custom_fields as any;
        const mesAniversario = customFields?.mes_aniversario;

        const resultado = await aplicarRegrasAutomacao(
          {
            valor_total: valorInicial,
            quantidade_produtos: cartItems.size,
            data_compra: new Date(),
            cliente: {
              id: empresaData?.id || '',
              mes_aniversario: mesAniversario
            },
            empresa_id: selectedEmpresa,
            vendedor_id: undefined // Pode ser adicionado futuramente
          },
          regras as any[],
          (estabelecimentoConfig?.automacao_vendas_config || { nao_acumular_descontos: false }) as { nao_acumular_descontos?: boolean }
        );

        valorFinal = resultado.valorFinal;
        descontosAplicados = resultado.descontos;
        regrasAplicadas = resultado.regrasAplicadas;

        if (regrasAplicadas.length > 0) {
          toast.success(`${regrasAplicadas.length} regra(s) de automação aplicada(s)!`);
          console.log('Detalhes das regras:', resultado.detalhes);
        }
      }

      // Gerar token de compartilhamento no cliente para evitar dependência de funções no banco
      const token = crypto.randomUUID().replace(/-/g, '');
      // Criar orçamento já com o token e valor final após regras
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          estabelecimento_id: estabelecimentoId,
          empresa_id: selectedEmpresa,
          cliente_id: selectedCliente || null,
          etapa: 'orcamento',
          status: 'em_aberto',
          valor_total: valorFinal,
          valor_desconto: valorInicial - valorFinal,
          token_compartilhamento: token,
        })
        .select()
        .single();

      if (orcamentoError) throw orcamentoError;

      // Adicionar itens
      const items = Array.from(cartItems.values()).map(item => ({
        orcamento_id: orcamento.id,
        produto_id: item.produto.id,
        quantidade: item.quantity,
        preco_unitario: item.preco,
        preco_original: item.preco,
        desconto: 0,
        subtotal: item.quantity * item.preco,
      }));

      const { error: itensError } = await supabase
        .from('orcamento_itens')
        .insert(items);

      if (itensError) throw itensError;

      // Salvar log das regras aplicadas
      if (regrasAplicadas.length > 0 && descontosAplicados.length > 0) {
        const logsToInsert = descontosAplicados.map((desconto, idx) => ({
          automacao_id: regras![idx]?.id,
          orcamento_id: orcamento.id,
          regra_aplicada: desconto.regra,
          valor_desconto: desconto.valor,
          percentual_desconto: desconto.tipo === 'percentual' ? (desconto.valor / valorInicial) * 100 : null
        }));

        await supabase
          .from('automacoes_vendas_log')
          .insert(logsToInsert);
      }

      // Link de compartilhamento a partir do token gerado
      const link = `${window.location.origin}/orcamento/${token}`;
      setShareLink(link);

      setCurrentOrcamentoId(orcamento.id);
      toast.success('Orçamento criado com sucesso!');
      // Limpar carrinho
      setCartItems(new Map());
      setSelectedEmpresa("");
      setSelectedCliente("");
      setActiveTab("share");
    } catch (error: any) {
      console.error('Erro ao finalizar orçamento:', error);
      toast.error('Erro ao criar orçamento');
    } finally {
      setLoading(false);
    }
  };

  const cartArray = Array.from(cartItems.values());

  const handleCopyLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success("Link copiado!");
    }
  };

  const handleItemsExtracted = async (items: any[]) => {
    // Adicionar itens extraídos ao carrinho
    items.forEach(item => {
      // Buscar produto correspondente ou adicionar como genérico
      const produto: Produto = {
        id: crypto.randomUUID(),
        estabelecimento_id: estabelecimentoId,
        nome: item.material,
        ativo: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      
      for (let i = 0; i < item.quantidade; i++) {
        addToCart(produto);
      }
    });
    
    toast.success(`${items.length} item(ns) adicionado(s)!`);
    setActiveTab("cart");
  };

  const handleConjuntoConfirm = async (conjuntoId: string) => {
    try {
      const { data, error } = await supabase
        .from("orcamento_conjuntos_itens")
        .select(`
          *,
          produto:produtos(id, nome)
        `)
        .eq("conjunto_id", conjuntoId)
        .order("ordem");

      if (error) throw error;

      // Inicializar itens com valores padrão
      const itemsPreenchidos = data?.map(item => ({
        ...item,
        quantidade: item.quantidade_padrao || 0,
        preco: item.preco_padrao || 0
      })) || [];

      if (itemsPreenchidos.length === 0) {
        toast.error("Este conjunto não possui itens cadastrados.");
        setShowConjuntoDialog(false);
        return;
      }

      setConjuntoSelecionado(conjuntoId);
      setConjuntoItens(itemsPreenchidos);
      setShowConjuntoDialog(false);
      toast.success(`Conjunto carregado com ${itemsPreenchidos.length} itens!`);
      
      // Focar no primeiro input após um pequeno delay para garantir que o componente foi renderizado
      setTimeout(() => {
        primeiroInputRef.current?.focus();
      }, 100);
    } catch (error: any) {
      console.error("Erro ao carregar itens do conjunto:", error);
      toast.error("Erro ao carregar itens do conjunto");
    }
  };

  // Render mobile/tablet layout
  if (isCompact) {
    return (
      <>
        <MobilePOSLayout
          produtos={produtos}
          grupos={grupos}
          empresas={empresas}
          cartItems={cartItems}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedEmpresa={selectedEmpresa}
          setSelectedEmpresa={setSelectedEmpresa}
          clientes={clientes}
          selectedCliente={selectedCliente}
          setSelectedCliente={setSelectedCliente}
          selectedGrupo={selectedGrupo}
          setSelectedGrupo={setSelectedGrupo}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showFilters={showFilters}
          setShowFilters={setShowFilters}
          addToCart={addToCart}
          removeFromCart={removeFromCart}
          updateQuantity={updateQuantity}
          setCartItems={setCartItems}
          getTotal={getTotal}
          valorComRegras={valorComRegras}
          regrasAplicadas={regrasAplicadas}
          selectedProduto={selectedProduto}
          setSelectedProduto={setSelectedProduto}
          handleSaveOrcamento={handleFinalize}
          loading={loading}
          onClose={onClose}
          showPhotoModal={showPhotoModal}
          setShowPhotoModal={setShowPhotoModal}
          handleItemsExtracted={handleItemsExtracted}
          autoRouteInfo={autoRouteInfo}
          routeLoading={routeLoading}
          freteIdaEVolta={freteIdaEVolta}
          pedagioResult={pedagioResult}
          freteResult={freteResult}
          setShowConjuntoDialog={setShowConjuntoDialog}
          gruposQuantities={gruposQuantities}
          setGruposQuantities={setGruposQuantities}
          shareLink={shareLink}
          onCopyLink={handleCopyLink}
          conjuntoSelecionado={conjuntoSelecionado}
          conjuntoItens={conjuntoItens}
          setConjuntoSelecionado={setConjuntoSelecionado}
          setConjuntoItens={setConjuntoItens}
        />
        
        {/* Dialogs também para mobile */}
        <ConjuntoSelectorDialog
          open={showConjuntoDialog}
          onClose={() => setShowConjuntoDialog(false)}
          onConfirm={handleConjuntoConfirm}
        />
      </>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-100">
      <div className="flex flex-1 overflow-hidden">
        {/* Grade de Produtos - Lado Esquerdo */}
        <div className="flex-1 flex flex-col bg-gray-100 min-w-0">
        {/* Header de Busca e Filtros - Responsivo */}
        <div className={`${isCompact ? 'p-2' : 'p-4'} border-b border-border bg-white/80`}>
          {/* Primeira linha: Busca + Botões principais */}
          <div className={`flex items-center gap-2 ${isCompact ? 'flex-wrap' : ''}`}>
            {showPanelToggle && onTogglePanel && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onTogglePanel}
                className={`${isCompact ? 'h-10 w-10' : 'h-12 w-12'} p-0 rounded-full bg-white/90 shadow-md hover:bg-white border border-border/50 flex-shrink-0`}
                title="Abrir painel"
              >
                <PanelLeft className={`${isCompact ? 'h-4 w-4' : 'h-5 w-5'}`} />
              </Button>
            )}
            <div className={`relative ${isCompact ? 'flex-1 min-w-[150px]' : 'flex-1'}`}>
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isCompact ? 'w-4 h-4' : 'w-5 h-5'} text-muted-foreground`} />
              <Input
                placeholder="Buscar por nome, EAN ou código..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`pl-10 bg-background border-border placeholder:text-muted-foreground ${isCompact ? 'h-10 text-sm' : 'h-12 text-base'}`}
              />
            </div>
            
            {/* Botões de ação - compactados em mobile */}
            <div className={`flex gap-1.5 ${isCompact ? 'flex-shrink-0' : 'gap-2'}`}>
              <Button
                variant="outline"
                size="icon"
                className={`bg-background border-border hover:bg-muted ${isCompact ? 'h-10 w-10' : ''}`}
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              >
                {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`bg-background border-border hover:bg-muted ${isCompact ? 'h-10 w-10' : ''}`}
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className={`bg-background border-border hover:bg-muted ${isCompact ? 'h-10 w-10' : ''}`}
                onClick={() => setShowConjuntoDialog(true)}
              >
                <Package className="w-4 h-4" />
              </Button>
              {onClose && (
                <Button 
                  variant="outline" 
                  size="icon"
                  className={`bg-background border-border hover:bg-muted ${isCompact ? 'h-10 w-10' : ''}`}
                  onClick={onClose}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filtros Avançados */}
          {showFilters && (
            <div className="p-4 bg-muted rounded-lg border border-border space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Filtros</span>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="h-7 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Limpar filtros
                  </Button>
                )}
              </div>
              
              {/* Grupo */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Grupo</label>
                <Select value={selectedGrupo || "all"} onValueChange={(value) => setSelectedGrupo(value === "all" ? "" : value)}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Todos os grupos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os grupos</SelectItem>
                    {grupos.map((grupo) => (
                      <SelectItem key={grupo.id} value={grupo.id}>
                        {grupo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Campos Customizados Dinâmicos */}
              {camposCustomizados.length > 0 && (
                <div className="border-t pt-3 space-y-3">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Filtros de campos customizados
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {camposCustomizados.map(campo => {
                      const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
                      
                      // Range filter for numeric fields with pesquisa_faixa
                      if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <label className="text-xs font-medium mb-2 block">
                              {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                placeholder="De"
                                value={customFieldFilters.range[campo.campo_key]?.min || ""}
                                onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                                className="h-8 text-sm"
                              />
                              <span className="text-xs text-muted-foreground">até</span>
                              <Input
                                type="number"
                                placeholder="Até"
                                value={customFieldFilters.range[campo.campo_key]?.max || ""}
                                onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                                className="h-8 text-sm"
                              />
                            </div>
                          </div>
                        );
                      }
                      
                      // Simple number filter
                      if (campo.tipo === 'numero') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <label className="text-xs font-medium mb-2 block">
                              {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                            </label>
                            <Input
                              type="number"
                              placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                              value={customFieldFilters.number[campo.campo_key] || ""}
                              onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        );
                      }
                      
                      // Text filter
                      if (campo.tipo === 'texto') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <label className="text-xs font-medium mb-2 block">{campo.nome}</label>
                            <Input
                              type="text"
                              placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                              value={customFieldFilters.text[campo.campo_key] || ""}
                              onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                              className="h-8 text-sm"
                            />
                          </div>
                        );
                      }
                      
                      // Selection filter
                      if (campo.tipo === 'selecao' && opcoes.length > 0) {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <label className="text-xs font-medium mb-2 block">{campo.nome}</label>
                            <Select 
                              value={customFieldFilters.select[campo.campo_key] || "all"} 
                              onValueChange={(val) => updateCustomFilter('select', campo.campo_key, val === "all" ? "" : val)}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder={`Selecione ${campo.nome.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                {opcoes.map((opcao: string, idx: number) => (
                                  <SelectItem key={idx} value={opcao}>{opcao}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      // Checkbox filter
                      if (campo.tipo === 'checkbox') {
                        return (
                          <div key={campo.id} className="bg-background rounded-md p-3 border">
                            <label className="text-xs font-medium mb-2 block">{campo.nome}</label>
                            <Select 
                              value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"} 
                              onValueChange={(val) => updateCustomFilter('checkbox', campo.campo_key, val === "all" ? null : val === "true")}
                            >
                              <SelectTrigger className="h-8 text-sm">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="true">Sim</SelectItem>
                                <SelectItem value="false">Não</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </div>
              )}
              
              {/* Botão OK para fechar filtros */}
              <div className="flex justify-end pt-3 border-t">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => setShowFilters(false)}
                  className="h-8"
                >
                  <Check className="w-4 h-4 mr-1" />
                  OK
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Itens do Conjunto Selecionado */}
        {conjuntoSelecionado && conjuntoItens.length > 0 && (
          <div className="px-4 pb-4">
            <Card className="bg-card border-border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-foreground">Itens do Conjunto</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const itensComQuantidade = conjuntoItens.filter(item => item.quantidade > 0 && item.preco > 0);
                        if (itensComQuantidade.length === 0) {
                          toast.error("Nenhum item com quantidade e preço preenchidos");
                          return;
                        }
                        
                        itensComQuantidade.forEach(item => {
                          const produto = produtos.find(p => p.id === item.produto_id);
                          if (produto) {
                            for (let i = 0; i < item.quantidade; i++) {
                              addToCart(produto);
                            }
                          }
                        });
                        
                        toast.success(`${itensComQuantidade.length} item(ns) adicionado(s) ao carrinho`);
                        setConjuntoSelecionado(null);
                        setConjuntoItens([]);
                      }}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Adicionar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setConjuntoSelecionado(null);
                        setConjuntoItens([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Fechar
                    </Button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 px-2 text-sm font-medium text-foreground">Produto</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-32">Quantidade</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-32">Preço</th>
                        <th className="text-center py-2 px-2 text-sm font-medium text-foreground w-24">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conjuntoItens.map((item, index) => (
                        <tr key={item.id} className="border-b border-border/50">
                          <td className="py-2 px-2 text-sm text-foreground">{item.produto?.nome}</td>
                          <td className="py-2 px-2">
                            <Input
                              ref={index === 0 ? primeiroInputRef : null}
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.quantidade}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setConjuntoItens(conjuntoItens.map(i =>
                                  i.id === item.id ? { ...i, quantidade: newValue } : i
                                ));
                              }}
                              className="text-center h-8"
                            />
                          </td>
                          <td className="py-2 px-2">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.preco}
                              onChange={(e) => {
                                const newValue = parseFloat(e.target.value) || 0;
                                setConjuntoItens(conjuntoItens.map(i =>
                                  i.id === item.id ? { ...i, preco: newValue } : i
                                ));
                              }}
                              className="text-center h-8"
                              placeholder="0,00"
                            />
                          </td>
                          <td className="py-2 px-2 text-center">
                            <Button
                              size="sm"
                              tabIndex={-1}
                              onClick={() => {
                                if (item.quantidade > 0 && item.preco > 0) {
                                  const produto = produtos.find(p => p.id === item.produto_id);
                                  if (produto) {
                                    // Adicionar ao carrinho com preço customizado
                                    setCartItems(prev => {
                                      const newCart = new Map(prev);
                                      const existing = newCart.get(produto.id);
                                      
                                      if (existing) {
                                        newCart.set(produto.id, {
                                          produto,
                                          quantity: existing.quantity + item.quantidade,
                                          preco: item.preco
                                        });
                                      } else {
                                        newCart.set(produto.id, { 
                                          produto, 
                                          quantity: item.quantidade, 
                                          preco: item.preco 
                                        });
                                      }
                                      
                                      return newCart;
                                    });
                                    toast.success(`${item.produto?.nome} adicionado ao carrinho`);
                                  }
                                } else {
                                  toast.error("Preencha quantidade e preço");
                                }
                              }}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Grade/Lista de Produtos - Oculto quando conjunto está selecionado */}
        {conjuntoItens.length === 0 && (
        <ScrollArea className="flex-1 p-4">
          {viewMode === 'grid' ? (
            <div className={`grid gap-2 ${isCompact ? 'grid-cols-2' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3'}`}>
              {filteredProdutos.map((produto) => {
                const quantity = gruposQuantities.get(produto.id) || 1;
                return (
                  <Card
                    key={produto.id}
                    className="bg-background border-border hover:border-primary transition-all overflow-hidden group"
                  >
                    <div 
                      className="aspect-square bg-muted relative overflow-hidden cursor-pointer"
                      onClick={() => {
                        for (let i = 0; i < quantity; i++) {
                          addToCart(produto);
                        }
                        setGruposQuantities(prev => {
                          const next = new Map(prev);
                          next.set(produto.id, 1);
                          return next;
                        });
                      }}
                    >
                      {produto.foto_url ? (
                        <img 
                          src={produto.foto_url} 
                          alt={produto.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-4xl text-muted-foreground">{produto.nome[0]}</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                      
                      {cartItems.has(produto.id) && (
                        <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
                          {cartItems.get(produto.id)?.quantity}
                        </Badge>
                      )}
                      
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 left-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRegrasInDetails(false);
                          setShowFreteInDetails(false);
                          setSelectedProduto(produto);
                          setActiveTab("details");
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="p-3">
                      <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
                        {produto.nome}
                      </h3>
                      
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-base font-bold text-primary">
                          R$ 10,00
                        </span>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newQty = parseInt(e.target.value) || 1;
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, newQty);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-16 h-7 text-center text-xs p-1 bg-background border-border"
                        />
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProdutos.map((produto) => {
                const quantity = gruposQuantities.get(produto.id) || 1;
                return (
                  <Card
                    key={produto.id}
                    className="bg-card border-border hover:border-primary transition-all overflow-hidden"
                  >
                    <div className="flex items-center gap-4 p-3">
                      <div 
                        className="w-16 h-16 bg-muted rounded flex-shrink-0 overflow-hidden cursor-pointer"
                        onClick={() => {
                          for (let i = 0; i < quantity; i++) {
                            addToCart(produto);
                          }
                          setGruposQuantities(prev => {
                            const next = new Map(prev);
                            next.set(produto.id, 1);
                            return next;
                          });
                        }}
                      >
                        {produto.foto_url ? (
                          <img 
                            src={produto.foto_url} 
                            alt={produto.nome}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-2xl text-muted-foreground">{produto.nome[0]}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {produto.nome}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-base font-bold text-primary">
                            R$ 10,00
                          </span>
                          {cartItems.has(produto.id) && (
                            <Badge className="bg-primary text-primary-foreground text-xs">
                              {cartItems.get(produto.id)?.quantity} no carrinho
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-9 w-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowRegrasInDetails(false);
                            setShowFreteInDetails(false);
                            setSelectedProduto(produto);
                            setActiveTab("details");
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Input
                          type="number"
                          min="1"
                          value={quantity}
                          onChange={(e) => {
                            e.stopPropagation();
                            const newQty = parseInt(e.target.value) || 1;
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, newQty);
                              return next;
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-20 h-9 text-center text-sm p-1 bg-background border-border"
                        />
                        <Button
                          size="icon"
                          className="bg-primary hover:bg-primary/90 h-9 w-9"
                          onClick={(e) => {
                            e.stopPropagation();
                            for (let i = 0; i < quantity; i++) {
                              addToCart(produto);
                            }
                            setGruposQuantities(prev => {
                              const next = new Map(prev);
                              next.set(produto.id, 1);
                              return next;
                            });
                          }}
                        >
                          <Plus className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredProdutos.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          )}
        </ScrollArea>
        )}
        </div>

      {/* Painel Lateral - Lado Direito */}
      <div className="w-[300px] bg-card border-l border-border flex flex-col overflow-hidden">

        {/* Header com Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border flex items-center justify-between px-2 py-1">
            <TabsList className="bg-transparent h-10 rounded-none flex-1">
              <TabsTrigger value="details" className="data-[state=active]:bg-muted text-xs flex-1">
                <Tag className="w-3.5 h-3.5 mr-1.5" />
                Detalhes
              </TabsTrigger>
              <TabsTrigger value="frete" className="data-[state=active]:bg-muted text-xs flex-1">
                <Truck className="w-3.5 h-3.5 mr-1.5" />
                Frete
              </TabsTrigger>
              <TabsTrigger value="cart" className="data-[state=active]:bg-muted text-xs flex-1">
                <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                Carrinho
              </TabsTrigger>
            </TabsList>
            {onToggleClientDetails && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onToggleClientDetails}
                className="h-8 w-8 p-0 ml-1"
                title={showClientDetails ? "Ocultar detalhes" : "Mostrar detalhes"}
              >
                {showClientDetails ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            )}
          </div>

          {/* Conteúdo das Tabs */}
          <TabsContent value="cart" className="flex-1 m-0">
            <div className="px-2 py-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full mb-2"
                onClick={() => {
                  setTempCartItems(new Map(cartItems));
                  setShowCartDialog(true);
                }}
                disabled={cartArray.length === 0}
              >
                <Maximize2 className="w-4 h-4 mr-2" />
                Conferir Itens
              </Button>
            </div>
            <ScrollArea className="h-[calc(100vh-460px)] p-2">
              {cartArray.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <ShoppingCart className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-xs">Carrinho vazio</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {cartArray.map(({ produto, quantity, preco }) => (
                    <div key={produto.id} className="bg-muted/50 rounded p-2 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0 cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={() => {
                            setShowRegrasInDetails(false);
                            setShowFreteInDetails(false);
                            setSelectedProduto(produto);
                            setActiveTab("details");
                          }}
                          title="Ver detalhes do produto"
                        >
                          {produto.foto_url ? (
                            <img src={produto.foto_url} alt="" className="w-full h-full object-cover rounded" />
                          ) : (
                            <span className="text-muted-foreground text-xs">{produto.nome[0]}</span>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground text-xs font-medium truncate">{produto.nome}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(preco)}
                          </p>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
                          onClick={() => {
                            setShowRegrasInDetails(false);
                            setShowFreteInDetails(false);
                            setSelectedProduto(produto);
                            setActiveTab("details");
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => removeFromCart(produto.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => {
                              const newQty = parseInt(e.target.value) || 1;
                              setCartItems(prev => {
                                const newCart = new Map(prev);
                                const item = newCart.get(produto.id);
                                if (item) {
                                  newCart.set(produto.id, { ...item, quantity: newQty });
                                }
                                return newCart;
                              });
                            }}
                            className="w-20 h-6 text-center text-xs p-1 bg-background border-border"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-6 w-6 bg-background border-border hover:bg-muted"
                            onClick={() => updateQuantity(produto.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <span className="text-foreground text-xs font-bold">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(quantity * preco)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-280px)] p-2">
              {/* Navegação rápida quando há conteúdo selecionado */}
              {(showRegrasInDetails || selectedProduto) && (
                <div className="flex gap-1 mb-2 p-1 bg-muted/30 rounded-lg">
                  <Button
                    variant={showRegrasInDetails ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] px-2 flex-1"
                    onClick={() => {
                      if (regrasAplicadas.length > 0) {
                        setSelectedProduto(null);
                        setShowRegrasInDetails(true);
                      }
                    }}
                    disabled={regrasAplicadas.length === 0}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    Regras {regrasAplicadas.length > 0 && `(${regrasAplicadas.length})`}
                  </Button>
                  <Button
                    variant={selectedProduto ? "default" : "ghost"}
                    size="sm"
                    className="h-6 text-[10px] px-2 flex-1"
                    onClick={() => {
                      // Mantém o produto selecionado ou não faz nada
                    }}
                    disabled={!selectedProduto}
                  >
                    <Package className="w-3 h-3 mr-1" />
                    Produto
                  </Button>
                </div>
              )}

              {showRegrasInDetails && regrasAplicadas.length > 0 ? (
                <div className="space-y-2">
                  {/* Header das Regras */}
                  <div className="bg-orange-50 dark:bg-orange-950/30 rounded p-2.5 border border-orange-200 dark:border-orange-800">
                    <h4 className="text-xs font-medium text-orange-700 dark:text-orange-300 mb-1 flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5" />
                      Regras Aplicadas ({regrasAplicadas.length})
                    </h4>
                    <p className="text-[10px] text-orange-600 dark:text-orange-400">
                      Economia total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getTotal() - valorComRegras)}
                    </p>
                  </div>
                  
                  {/* Lista de Regras - Expandível */}
                  {regrasAplicadas.map((regra, index) => (
                    <div 
                      key={index} 
                      className="bg-muted/50 rounded border border-border/50 overflow-hidden cursor-pointer transition-colors hover:bg-muted/70"
                      onClick={() => setExpandedRegraIndex(expandedRegraIndex === index ? null : index)}
                    >
                      <div className="p-2.5 flex items-start gap-2">
                        <div className="p-1 rounded-full bg-orange-500/10 mt-0.5">
                          <Check className="w-3 h-3 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-foreground font-medium">{regra.nome}</p>
                          {expandedRegraIndex === index && (
                            <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                              <p className="text-xs text-muted-foreground">{regra.detalhes}</p>
                              {regra.desconto !== undefined && regra.desconto > 0 && (
                                <p className="text-xs text-orange-600 dark:text-orange-400">
                                  Desconto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(regra.desconto)}
                                  {regra.percentual ? ` (${regra.percentual}%)` : ''}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedRegraIndex === index ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedProduto ? (
                <div className="space-y-2">
                  {/* Imagem do Produto */}
                  {selectedProduto.foto_url && (
                    <div className="aspect-square bg-muted rounded overflow-hidden border border-border">
                      <img 
                        src={selectedProduto.foto_url} 
                        alt={selectedProduto.nome}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* Nome */}
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Nome</h4>
                    <p className="text-sm text-foreground font-semibold">{selectedProduto.nome}</p>
                  </div>
                  
                  {/* Categoria e Grupo */}
                  {(selectedProduto.categoria || selectedProduto.grupo) && (
                    <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Classificação</h4>
                      <div className="space-y-1.5 text-xs">
                        {selectedProduto.categoria && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Categoria:</span>
                            <span className="text-foreground font-medium">{selectedProduto.categoria.nome}</span>
                          </div>
                        )}
                        {selectedProduto.grupo && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Grupo:</span>
                            <span className="text-foreground font-medium">{selectedProduto.grupo.nome}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Dimensões */}
                  {(selectedProduto.largura || selectedProduto.comprimento || selectedProduto.gramatura || selectedProduto.peso_unitario) && (
                    <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">Especificações</h4>
                      <div className="space-y-1.5 text-xs">
                        {selectedProduto.largura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Largura:</span>
                            <span className="text-foreground font-medium">{selectedProduto.largura} cm</span>
                          </div>
                        )}
                        {selectedProduto.comprimento && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Comprimento:</span>
                            <span className="text-foreground font-medium">{selectedProduto.comprimento} cm</span>
                          </div>
                        )}
                        {selectedProduto.gramatura && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Gramatura:</span>
                            <span className="text-foreground font-medium">{selectedProduto.gramatura} g/m²</span>
                          </div>
                        )}
                        {selectedProduto.peso_unitario && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Peso:</span>
                            <span className="text-foreground font-medium">{selectedProduto.peso_unitario} kg</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Status */}
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">Status</h4>
                    <Badge variant={selectedProduto.ativo ? "default" : "secondary"}>
                      {selectedProduto.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-foreground mb-2">Status</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                        <span className="text-xs text-foreground">Em Orçamento</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-4">
                        Aguardando finalização
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/50 rounded p-2.5 border border-border/50">
                    <h4 className="text-xs font-medium text-foreground mb-2">Informações</h4>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Produtos:</span>
                        <span className="text-foreground">{cartArray.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground text-[10px]">Qtd. Total:</span>
                        <span className="text-foreground">{cartArray.reduce((sum, item) => sum + item.quantity, 0)}</span>
                      </div>
                      {selectedEmpresa && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-[10px]">Empresa:</span>
                          <span className="text-foreground text-[10px] truncate max-w-[140px]">
                            {empresas.find(e => e.id === selectedEmpresa)?.nome_fantasia}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Eye className="w-12 h-12 mb-3 opacity-20" />
                    <p className="text-xs text-center">Clique no ícone de olho em um produto</p>
                    <p className="text-xs text-center mt-1">para ver seus detalhes aqui</p>
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Aba Frete */}
          <TabsContent value="frete" className="flex-1 m-0 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-280px)] p-2">
              {showFreteDetailedInTab && freteResult ? (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs mb-2 -ml-1"
                    onClick={() => setShowFreteDetailedInTab(false)}
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Voltar
                  </Button>
                  <FreteDetailsPanel freteResult={freteResult} />
                </div>
              ) : selectedEmpresa ? (
                <div className="space-y-3">
                  {/* Opções de Frete */}
                  <div className="bg-muted/50 rounded-lg p-3 border border-border/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Configurações
                      </h4>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={freteIdaEVolta}
                        onChange={(e) => setFreteIdaEVolta(e.target.checked)}
                        className="w-4 h-4 rounded accent-primary"
                      />
                      <span className="text-xs text-foreground">Calcular ida e volta</span>
                    </label>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Ajudantes:</span>
                      <Input
                        type="number"
                        min="0"
                        max="10"
                        value={numAjudantes}
                        onChange={(e) => setNumAjudantes(parseInt(e.target.value) || 0)}
                        className="w-16 h-7 text-xs"
                      />
                    </div>
                  </div>

                  {/* Distância e Tempo */}
                  <div className="bg-gradient-to-br from-blue-50 to-slate-50 dark:from-blue-950/30 dark:to-slate-950/30 rounded-lg p-3 border border-blue-200/50 dark:border-blue-800/50">
                    <h4 className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">Rota</h4>
                    {(routeAddresses.loading || routeLoading) ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Calculando rota...</span>
                      </div>
                    ) : autoRouteInfo ? (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] text-muted-foreground">Distância</p>
                          <p className="text-lg font-bold text-foreground">{autoRouteInfo.distance.toFixed(0)} km</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">Tempo estimado</p>
                          <p className="text-lg font-bold text-foreground">
                            {Math.floor(autoRouteInfo.duration / 60)}h {Math.round(autoRouteInfo.duration % 60)}min
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">Selecione uma empresa para calcular a rota</p>
                    )}
                  </div>

                  {/* Pedágio */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/50">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2">Pedágio</h4>
                    {!pedagioResult.calculated ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => pedagioResult.calculate()}
                        disabled={pedagioResult.loading || !autoRouteInfo}
                      >
                        {pedagioResult.loading ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />
                            Calculando...
                          </>
                        ) : 'Calcular Pedágios'}
                      </Button>
                    ) : pedagioResult.error ? (
                      <p className="text-xs text-destructive">{pedagioResult.error}</p>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Total</span>
                          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pedagioResult.total)}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-7 text-xs text-primary"
                          onClick={() => {
                            setPedagioDialogDefaultTab("map");
                            setShowPedagioDetailsDialog(true);
                          }}
                        >
                          Ver detalhes
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Custo do Frete */}
                  {freteResult && (
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30 rounded-lg p-3 border border-orange-200/50 dark:border-orange-800/50">
                      <h4 className="text-xs font-semibold text-orange-700 dark:text-orange-300 mb-2">Custo do Frete</h4>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="text-xl font-bold text-orange-600 dark:text-orange-400">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(freteResult.custoTotal)}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full h-7 text-xs text-primary"
                        onClick={() => setShowFreteDetailedInTab(true)}
                      >
                        Ver composição detalhada
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                  <Truck className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-xs text-center">Selecione uma empresa</p>
                  <p className="text-xs text-center mt-1">para calcular o frete</p>
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* Empresa e Botões de Ação */}
        <div className="border-t border-border bg-card mt-auto">
          {/* Empresa */}
          <div className="p-2 border-b border-border">
            <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
              Empresa
            </label>
            <Popover open={openEmpresaCombobox} onOpenChange={setOpenEmpresaCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openEmpresaCombobox}
                  className="w-full justify-between bg-background border-border hover:bg-muted h-8 text-xs"
                >
                  {selectedEmpresa
                    ? empresas.find((empresa) => empresa.id === selectedEmpresa)?.nome_fantasia
                    : "Selecionar..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0 bg-card border-border z-50">
                <Command className="bg-card">
                  <CommandInput 
                    placeholder="Buscar empresa..." 
                    className="bg-card border-border text-xs h-8"
                  />
                  <CommandList>
                    <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
                      Nenhuma empresa encontrada.
                    </CommandEmpty>
                    <CommandGroup>
                      {empresas.map((empresa) => (
                        <CommandItem
                          key={empresa.id}
                          value={`${empresa.nome_fantasia} ${empresa.cnpj || ''}`}
                          onSelect={() => {
                            setSelectedEmpresa(empresa.id);
                            setOpenEmpresaCombobox(false);
                          }}
                          className="hover:bg-muted cursor-pointer"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedEmpresa === empresa.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{empresa.nome_fantasia}</span>
                            {empresa.cnpj && (
                              <span className="text-xs text-muted-foreground">{empresa.cnpj}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Seletor de Contato */}
          {selectedEmpresa && clientes.length > 0 && (
            <div className="px-2 py-1.5">
              <label className="text-[10px] font-medium text-muted-foreground mb-1 block">
                Contato
              </label>
              <Popover open={openClienteCombobox} onOpenChange={setOpenClienteCombobox}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={openClienteCombobox}
                    className="w-full justify-between bg-background border-border hover:bg-muted h-8 text-xs"
                  >
                    {selectedCliente
                      ? clientes.find((cliente) => cliente.id === selectedCliente)?.nome
                      : "Selecionar contato..."}
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0 bg-card border-border z-50">
                  <Command className="bg-card">
                    <CommandInput 
                      placeholder="Buscar contato..." 
                      className="bg-card border-border text-xs h-8"
                    />
                    <CommandList>
                      <CommandEmpty className="text-muted-foreground py-4 text-center text-xs">
                        Nenhum contato encontrado.
                      </CommandEmpty>
                      <CommandGroup>
                        {clientes.map((cliente) => (
                          <CommandItem
                            key={cliente.id}
                            value={`${cliente.nome} ${cliente.email || ''}`}
                            onSelect={() => {
                              setSelectedCliente(cliente.id);
                              setOpenClienteCombobox(false);
                            }}
                            className="hover:bg-muted cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedCliente === cliente.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span>{cliente.nome}</span>
                              {cliente.telefone && (
                                <span className="text-xs text-muted-foreground">{cliente.telefone}</span>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Aviso de cliente de outro usuário */}
              {isClienteDeOutroUsuario && usuarioResponsavel && (
                <div className="mt-2 p-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="text-[10px] text-amber-700 dark:text-amber-300">
                      <p className="font-medium">Contato de outro usuário</p>
                      <p className="mt-0.5">
                        Ao salvar, o orçamento será atribuído a <span className="font-semibold">{usuarioResponsavel.nome}</span>, responsável por este contato.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Botões de Ação */}
          <div className="p-2 grid grid-cols-4 gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-10 bg-muted/50 border-border/50 hover:bg-muted p-1"
              onClick={() => setShowPhotoModal(true)}
              title="Foto"
            >
              <Camera className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 bg-muted/50 border-border/50 hover:bg-muted p-1"
              onClick={() => setShowSuggestionsModal(true)}
              title="Sugestões"
            >
              <Lightbulb className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 bg-muted/50 border-border/50 hover:bg-muted p-1"
              onClick={() => setShowShareModal(true)}
              disabled={!shareLink}
              title="Compartilhar"
            >
              <Share2 className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 bg-muted/50 border-border/50 hover:bg-muted p-1"
              onClick={() => setActiveTab("details")}
              title="Status"
            >
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Modal de Foto */}
        {showPhotoModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md max-h-[80vh] overflow-auto border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Extrair Itens por Foto</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowPhotoModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <ImageItemExtractor onItemsExtracted={(items) => {
                handleItemsExtracted(items);
                setShowPhotoModal(false);
              }} />
            </div>
          </div>
        )}

        {/* Modal de Sugestões */}
        {showSuggestionsModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Sugestões de Produtos</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowSuggestionsModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Lightbulb className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm text-center">Sugestões de produtos</p>
                <p className="text-xs text-center mt-1">Baseadas no histórico do cliente</p>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Compartilhar */}
        {showShareModal && shareLink && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card rounded-lg p-6 w-[90%] max-w-md border border-border">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-foreground">Compartilhar Orçamento</h3>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShowShareModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4">
                  <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mb-3">
                    <Share2 className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Link de compartilhamento criado!
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4 border border-border">
                  <div className="flex gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="bg-background border-border text-sm"
                    />
                    <Button
                      onClick={() => {
                        handleCopyLink();
                        setShowShareModal(false);
                      }}
                      className="bg-primary hover:bg-primary/90"
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* Barra de Total Inferior - Simplificada */}
      <div className="bg-gradient-to-r from-card via-slate-50/80 to-card border-t border-border/50 px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
        {/* Total */}
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground text-xs uppercase tracking-wide font-medium">Total do Pedido</div>
          {regrasAplicadas.length > 0 ? (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground/60 font-medium text-base line-through">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getTotal())}
              </span>
              <span className="text-orange-600 font-bold text-2xl flex items-center gap-1.5">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valorComRegras)}
                <span 
                  className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white text-[11px] font-bold flex items-center justify-center cursor-pointer hover:scale-110 transition-transform"
                  onClick={() => setActiveTab("frete")}
                  title={`${regrasAplicadas.length} regra(s) aplicada(s)`}
                >
                  {regrasAplicadas.length}
                </span>
              </span>
            </div>
          ) : (
            <span className="text-foreground font-bold text-2xl">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(getTotal())}
            </span>
          )}
        </div>
        
        <Button 
          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary h-11 px-6 text-sm font-semibold shadow-lg shadow-primary/25 rounded-lg"
          onClick={handleFinalize}
          disabled={loading || cartArray.length === 0 || !selectedEmpresa}
        >
          {loading ? 'Processando...' : 'Finalizar Orçamento'}
          <span className="ml-2">→</span>
        </Button>
      </div>

      {/* Diálogo de Conjuntos de Itens */}
      <ConjuntoSelectorDialog
        open={showConjuntoDialog}
        onClose={() => setShowConjuntoDialog(false)}
        onConfirm={handleConjuntoConfirm}
      />

      {/* Diálogo de Conferência do Carrinho */}
      <Dialog open={showCartDialog} onOpenChange={(open) => {
        if (!open) {
          // Descartar alterações ao fechar sem salvar
          setTempCartItems(new Map());
          setCartSearchQuery("");
        }
        setShowCartDialog(open);
      }}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Conferir Itens do Carrinho</DialogTitle>
          </DialogHeader>
          
          {/* Pesquisa e Ordenação */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar no carrinho..."
                value={cartSearchQuery}
                onChange={(e) => setCartSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
            <Select value={cartSortBy} onValueChange={(value: any) => setCartSortBy(value)}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="nome">Nome</SelectItem>
                <SelectItem value="quantidade">Quantidade</SelectItem>
                <SelectItem value="preco">Preço</SelectItem>
                <SelectItem value="subtotal">Subtotal</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <ScrollArea className="flex-1 -mx-6 px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">Foto</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-center w-[120px]">Quantidade</TableHead>
                  <TableHead className="text-right w-[120px]">Preço Unit.</TableHead>
                  <TableHead className="text-right w-[120px]">Subtotal</TableHead>
                  <TableHead className="text-center w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from(tempCartItems.values())
                  .filter(({ produto }) => 
                    produto.nome.toLowerCase().includes(cartSearchQuery.toLowerCase())
                  )
                  .sort((a, b) => {
                    switch (cartSortBy) {
                      case "nome":
                        return a.produto.nome.localeCompare(b.produto.nome);
                      case "quantidade":
                        return b.quantity - a.quantity;
                      case "preco":
                        return b.preco - a.preco;
                      case "subtotal":
                        return (b.quantity * b.preco) - (a.quantity * a.preco);
                      default:
                        return 0;
                    }
                  })
                  .map(({ produto, quantity, preco }) => (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <div className="w-12 h-12 bg-muted rounded flex items-center justify-center overflow-hidden">
                        {produto.foto_url ? (
                          <img src={produto.foto_url} alt={produto.nome} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-muted-foreground text-lg">{produto.nome[0]}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => {
                          const newQty = parseInt(e.target.value) || 1;
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            const item = newCart.get(produto.id);
                            if (item) {
                              newCart.set(produto.id, { ...item, quantity: newQty });
                            }
                            return newCart;
                          });
                        }}
                        className="w-20 text-center"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={preco}
                        onChange={(e) => {
                          const newPrice = parseFloat(e.target.value) || 0;
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            const item = newCart.get(produto.id);
                            if (item) {
                              newCart.set(produto.id, { ...item, preco: newPrice });
                            }
                            return newCart;
                          });
                        }}
                        className="w-28 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(quantity * preco)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          setTempCartItems(prev => {
                            const newCart = new Map(prev);
                            newCart.delete(produto.id);
                            return newCart;
                          });
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {tempCartItems.size === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carrinho vazio
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
          
          {/* Rodapé fixo com totais e botão */}
          <div className="border-t pt-4 flex items-center justify-between bg-background">
            <div className="text-sm text-muted-foreground">
              {Array.from(tempCartItems.values()).filter(({ produto }) => 
                produto.nome.toLowerCase().includes(cartSearchQuery.toLowerCase())
              ).length} item(ns) no carrinho
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground mb-1">Total</div>
                <div className="text-2xl font-bold text-foreground">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(Array.from(tempCartItems.values()).reduce((sum, item) => sum + (item.quantity * item.preco), 0))}
                </div>
              </div>
              <Button 
                onClick={() => {
                  setCartItems(new Map(tempCartItems));
                  setShowCartDialog(false);
                  setCartSearchQuery("");
                  toast.success("Alterações salvas no carrinho!");
                }}
                className="bg-primary hover:bg-primary/90"
                size="lg"
              >
                Salvar Alterações
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Regras Aplicadas */}
      <Dialog open={showRegrasDialog} onOpenChange={setShowRegrasDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-orange-600" />
              Regras de Automação Aplicadas
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Resumo Financeiro */}
            <Card className="p-4 bg-muted/50 border-border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor Original</p>
                  <p className="text-2xl font-bold text-foreground">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(getTotal())}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Valor com Desconto</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(valorComRegras)}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Desconto Total</span>
                  <div className="text-right">
                    <span className="text-lg font-bold text-orange-600">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(getTotal() - valorComRegras)}
                    </span>
                    <span className="text-sm text-muted-foreground ml-2">
                      ({((1 - valorComRegras / getTotal()) * 100).toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Lista de Regras */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Regras Aplicadas ({regrasAplicadas.length})
              </h3>
              <div className="space-y-2">
                {regrasAplicadas.map((regra, index) => (
                  <Card key={index} className="p-3 border-border hover:border-primary/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-orange-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground mb-1">{regra.nome}</p>
                        <p className="text-sm text-muted-foreground">{regra.detalhes}</p>
                      </div>
                      <Badge variant="outline" className="bg-orange-500/5 text-orange-600 border-orange-500/20 flex-shrink-0">
                        Ativa
                      </Badge>
                    </div>
                  </Card>
                ))}
                {regrasAplicadas.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Nenhuma regra foi aplicada a este orçamento</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informações Adicionais */}
            {detalhesRegras && (
              <Card className="p-4 bg-blue-500/5 border-blue-500/20">
                <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-blue-600" />
                  Detalhes Completos
                </h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {detalhesRegras}
                </p>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Detalhes do Pedágio */}
      <PedagioDetailsDialog
        open={showPedagioDetailsDialog}
        onClose={() => {
          setShowPedagioDetailsDialog(false);
          setPedagioDialogDefaultTab("map");
        }}
        pedagioData={{
          ida: pedagioResult.ida,
          volta: pedagioResult.volta,
          total: pedagioResult.total,
          distanciaIdaKm: pedagioResult.distanciaIdaKm,
          distanciaVoltaKm: pedagioResult.distanciaVoltaKm,
          distanciaTotalKm: pedagioResult.distanciaTotalKm,
          tempoIdaMin: pedagioResult.tempoIdaMin,
          tempoVoltaMin: pedagioResult.tempoVoltaMin,
          tempoTotalMin: pedagioResult.tempoTotalMin,
          origemCep: pedagioResult.origemCep,
          destinoCep: pedagioResult.destinoCep,
          origemEndereco: pedagioResult.origemEndereco,
          destinoEndereco: pedagioResult.destinoEndereco,
          origemCoords: pedagioResult.origemCoords,
          destinoCoords: pedagioResult.destinoCoords,
          rawResponse: pedagioResult.rawResponse
        }}
        regrasAplicadas={regrasAplicadas}
        defaultTab={pedagioDialogDefaultTab}
      />

    </div>
  );
}
