import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Trash2, Pencil, Plus, Image, Upload, Package, Truck, Barcode, Check, ChevronsUpDown, Search, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Filter, X } from "lucide-react";
import { Produto, ProdutoCategoria, ProdutoGrupo } from "@/types/orcamento";
import { EmbalagemTab } from "./EmbalagemTab";
import { DynamicProductFields } from "./DynamicProductFields";
import { cn } from "@/lib/utils";

interface ProdutosCRUDProps {
  estabelecimentoId: string;
}

interface NcmCodigo {
  id: string;
  codigo: string;
  descricao: string;
}

interface CampoCustomizado {
  id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: any;
  obrigatorio: boolean;
  placeholder: string | null;
  unidade: string | null;
  ativo: boolean;
  pesquisa_faixa?: boolean;
}

interface RangeFilter {
  min: string;
  max: string;
}

interface FormData {
  nome: string;
  codigo: string;
  largura: string;
  altura: string;
  gramatura: string;
  comprimento: string;
  peso_unitario: string;
  numero_folhas: string;
  foto_url: string;
  categoria_id: string;
  grupo_id: string;
  ativo: boolean;
  // Campos de frete
  embalagem_largura: string;
  embalagem_altura: string;
  embalagem_comprimento: string;
  embalagem_peso: string;
  ncm_id: string;
  ncm: string;
  cubagem: string;
  fragil: boolean;
  empilhamento_maximo: string;
  valor_seguro: string;
  observacoes_frete: string;
  peso_frete_tipo: string;
  // Campos de EAN/Embalagem
  ean_13: string;
  ean_14_1: string;
  ean_14_2: string;
  embalagem_img_ean13: string;
  embalagem_img_ean14_1: string;
  embalagem_img_ean14_2: string;
  // Campos customizados
  campos_customizados: Record<string, any>;
  // Campos de preço do produto
  tipo_preco: string;
  preco_minimo: string;
  preco_tabela: string;
  preco_ativo: boolean;
}

const initialFormData: FormData = {
  nome: "",
  codigo: "",
  largura: "",
  altura: "",
  gramatura: "",
  comprimento: "",
  peso_unitario: "",
  numero_folhas: "",
  foto_url: "",
  categoria_id: "",
  grupo_id: "",
  ativo: true,
  // Campos de frete
  embalagem_largura: "",
  embalagem_altura: "",
  embalagem_comprimento: "",
  embalagem_peso: "",
  ncm_id: "",
  ncm: "",
  cubagem: "",
  fragil: false,
  empilhamento_maximo: "1",
  valor_seguro: "",
  observacoes_frete: "",
  peso_frete_tipo: "fixo",
  // Campos de EAN/Embalagem
  ean_13: "",
  ean_14_1: "",
  ean_14_2: "",
  embalagem_img_ean13: "",
  embalagem_img_ean14_1: "",
  embalagem_img_ean14_2: "",
  // Campos customizados
  campos_customizados: {},
  // Campos de preço do produto
  tipo_preco: "categoria",
  preco_minimo: "",
  preco_tabela: "",
  preco_ativo: true,
};

export function ProdutosCRUD({ estabelecimentoId }: ProdutosCRUDProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [ncmCodigos, setNcmCodigos] = useState<NcmCodigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("basico");
  const [ncmOpen, setNcmOpen] = useState(false);
  const [ncmSearch, setNcmSearch] = useState("");
  const [camposCustomizados, setCamposCustomizados] = useState<CampoCustomizado[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Range filter states for custom fields
  const [filterCamposCustomizados, setFilterCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [rangeFilters, setRangeFilters] = useState<Record<string, RangeFilter>>({});
  
  // Sort states
  const [sortField, setSortField] = useState<string>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load filter campos customizados when filterGrupo changes
  useEffect(() => {
    if (filterGrupo && filterGrupo !== "all") {
      loadFilterCamposCustomizados(filterGrupo);
    } else {
      setFilterCamposCustomizados([]);
      setRangeFilters({});
    }
  }, [filterGrupo]);

  const loadFilterCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .eq('tipo', 'numero')
        .eq('pesquisa_faixa', true)
        .order('ordem');

      if (error) throw error;
      setFilterCamposCustomizados(data || []);
      
      // Initialize range filters for new campos
      const newRangeFilters: Record<string, RangeFilter> = {};
      (data || []).forEach(campo => {
        newRangeFilters[campo.campo_key] = { min: "", max: "" };
      });
      setRangeFilters(newRangeFilters);
    } catch (error) {
      console.error('Erro ao carregar campos para filtro:', error);
      setFilterCamposCustomizados([]);
    }
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setRangeFilters(prev => ({
      ...prev,
      [campoKey]: {
        ...prev[campoKey],
        [field]: value
      }
    }));
  };

  // Check if any range filter has values
  const hasRangeFilters = Object.values(rangeFilters).some(rf => rf.min || rf.max);

  // Filtered and sorted products
  const filteredAndSortedProdutos = useMemo(() => {
    let result = [...produtos];
    
    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(p => 
        p.nome.toLowerCase().includes(term) ||
        (p as any).codigo?.toLowerCase().includes(term) ||
        (p as any).ncm?.toLowerCase().includes(term)
      );
    }
    
    if (filterCategoria !== "all") {
      result = result.filter(p => p.categoria_id === filterCategoria);
    }
    
    if (filterGrupo !== "all") {
      result = result.filter(p => p.grupo_id === filterGrupo);
    }
    
    if (filterStatus !== "all") {
      result = result.filter(p => filterStatus === "ativo" ? p.ativo : !p.ativo);
    }
    
    // Apply range filters for custom fields
    filterCamposCustomizados.forEach(campo => {
      const range = rangeFilters[campo.campo_key];
      if (range) {
        const minVal = range.min ? parseFloat(range.min) : 0;
        const maxVal = range.max ? parseFloat(range.max) : 99999;
        
        // Only apply filter if at least one value is set
        if (range.min || range.max) {
          result = result.filter(p => {
            const camposCustom = (p as any).campos_customizados;
            if (!camposCustom) return false;
            
            const fieldValue = parseFloat(camposCustom[campo.campo_key]) || 0;
            return fieldValue >= minVal && fieldValue <= maxVal;
          });
        }
      }
    });
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal: any, bVal: any;
      
      switch (sortField) {
        case "codigo":
          aVal = (a as any).codigo || "";
          bVal = (b as any).codigo || "";
          break;
        case "nome":
          aVal = a.nome;
          bVal = b.nome;
          break;
        case "categoria":
          aVal = a.categoria?.nome || "";
          bVal = b.categoria?.nome || "";
          break;
        case "grupo":
          aVal = a.grupo?.nome || "";
          bVal = b.grupo?.nome || "";
          break;
        default:
          aVal = a.nome;
          bVal = b.nome;
      }
      
      if (typeof aVal === "string") {
        const comparison = aVal.localeCompare(bVal, 'pt-BR', { sensitivity: 'base' });
        return sortDirection === "asc" ? comparison : -comparison;
      }
      
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
    
    return result;
  }, [produtos, searchTerm, filterCategoria, filterGrupo, filterStatus, sortField, sortDirection, rangeFilters, filterCamposCustomizados]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 ml-1 opacity-50" />;
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3.5 h-3.5 ml-1" /> 
      : <ArrowDown className="w-3.5 h-3.5 ml-1" />;
  };

  const clearFilters = () => {
    setSearchTerm("");
    setFilterCategoria("all");
    setFilterGrupo("all");
    setFilterStatus("all");
    setRangeFilters({});
  };

  const hasActiveFilters = searchTerm || filterCategoria !== "all" || filterGrupo !== "all" || filterStatus !== "all" || hasRangeFilters;

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  // Load campos customizados when grupo changes
  useEffect(() => {
    if (formData.grupo_id) {
      loadCamposCustomizados(formData.grupo_id);
    } else {
      setCamposCustomizados([]);
    }
  }, [formData.grupo_id]);

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
    } catch (error) {
      console.error('Erro ao carregar campos customizados:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [produtosRes, categoriasRes, gruposRes, ncmRes] = await Promise.all([
        supabase
          .from('produtos')
          .select('*, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome), ncm_ref:ncm_codigos(id, codigo, descricao)')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
        supabase
          .from('produto_categorias')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
        supabase
          .from('produto_grupos')
          .select('*')
          .eq('estabelecimento_id', estabelecimentoId)
          .order('nome'),
        supabase
          .from('ncm_codigos')
          .select('*')
          .order('codigo'),
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (gruposRes.error) throw gruposRes.error;
      if (ncmRes.error) throw ncmRes.error;

      setProdutos((produtosRes.data as any) || []);
      setCategorias(categoriasRes.data || []);
      setGrupos(gruposRes.data || []);
      setNcmCodigos(ncmRes.data || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor selecione um arquivo de imagem");
        return;
      }
      setSelectedFile(file);
      const previewUrl = URL.createObjectURL(file);
      setFormData({ ...formData, foto_url: previewUrl });
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${estabelecimentoId}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('produtos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error("Erro ao fazer upload da foto");
      return null;
    }
  };

  // Calcula cubagem automaticamente
  const calcularCubagem = (largura: string, altura: string, comprimento: string): string => {
    const l = parseFloat(largura) || 0;
    const a = parseFloat(altura) || 0;
    const c = parseFloat(comprimento) || 0;
    if (l > 0 && a > 0 && c > 0) {
      // Converte de cm³ para m³
      const cubagem = (l * a * c) / 1000000;
      return cubagem.toFixed(6);
    }
    return "";
  };

  const handleEmbalagemChange = (field: string, value: string) => {
    const newFormData = { ...formData, [field]: value };
    
    // Recalcula cubagem quando dimensões da embalagem mudam
    if (field === 'embalagem_largura' || field === 'embalagem_altura' || field === 'embalagem_comprimento') {
      newFormData.cubagem = calcularCubagem(
        field === 'embalagem_largura' ? value : newFormData.embalagem_largura,
        field === 'embalagem_altura' ? value : newFormData.embalagem_altura,
        field === 'embalagem_comprimento' ? value : newFormData.embalagem_comprimento
      );
    }
    
    setFormData(newFormData);
  };

  // Valida unicidade de nome e código
  const validateUniqueness = async (): Promise<boolean> => {
    try {
      // Validar nome único
      const { data: existingByNome } = await supabase
        .from('produtos')
        .select('id')
        .eq('estabelecimento_id', estabelecimentoId)
        .eq('nome', formData.nome.trim())
        .maybeSingle();

      if (existingByNome && existingByNome.id !== editingProduto?.id) {
        toast.error("Já existe um produto com este nome");
        return false;
      }

      // Validar código único (se preenchido)
      if (formData.codigo.trim()) {
        const { data: existingByCodigo } = await supabase
          .from('produtos')
          .select('id')
          .eq('estabelecimento_id', estabelecimentoId)
          .eq('codigo', formData.codigo.trim())
          .maybeSingle();

        if (existingByCodigo && existingByCodigo.id !== editingProduto?.id) {
          toast.error("Já existe um produto com este código");
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Erro na validação:', error);
      return true; // Em caso de erro, continua o salvamento
    }
  };

  const handleSave = async () => {
    // Validações obrigatórias
    if (!formData.nome.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

    if (!formData.codigo.trim()) {
      toast.error("Código do produto é obrigatório");
      return;
    }

    if (!formData.categoria_id) {
      toast.error("Categoria é obrigatória");
      return;
    }

    if (!formData.grupo_id) {
      toast.error("Grupo é obrigatório");
      return;
    }

    if (!formData.ncm_id) {
      toast.error("NCM é obrigatório");
      return;
    }

    // Validar unicidade
    const isUnique = await validateUniqueness();
    if (!isUnique) return;

    try {
      setUploading(true);
      let fotoUrl = formData.foto_url;

      // Upload new file if selected
      if (selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile);
        if (uploadedUrl) {
          fotoUrl = uploadedUrl;
        }
      }

      // Buscar o código NCM selecionado para preencher o campo ncm (texto)
      const selectedNcm = ncmCodigos.find(n => n.id === formData.ncm_id);

      const produtoData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome.trim(),
        codigo: formData.codigo.trim(),
        largura: formData.largura ? parseFloat(formData.largura) : null,
        altura: formData.altura ? parseFloat(formData.altura) : null,
        gramatura: formData.gramatura ? parseFloat(formData.gramatura) : null,
        comprimento: formData.comprimento ? parseFloat(formData.comprimento) : null,
        peso_unitario: formData.peso_unitario ? parseFloat(formData.peso_unitario) : null,
        numero_folhas: formData.numero_folhas ? parseInt(formData.numero_folhas) : null,
        foto_url: fotoUrl || null,
        categoria_id: formData.categoria_id || null,
        grupo_id: formData.grupo_id || null,
        ativo: formData.ativo,
        // Campos de frete
        embalagem_largura: formData.embalagem_largura ? parseFloat(formData.embalagem_largura) : null,
        embalagem_altura: formData.embalagem_altura ? parseFloat(formData.embalagem_altura) : null,
        embalagem_comprimento: formData.embalagem_comprimento ? parseFloat(formData.embalagem_comprimento) : null,
        embalagem_peso: formData.embalagem_peso ? parseFloat(formData.embalagem_peso) : null,
        ncm_id: formData.ncm_id || null,
        ncm: selectedNcm?.codigo || formData.ncm || null,
        cubagem: formData.cubagem ? parseFloat(formData.cubagem) : null,
        fragil: formData.fragil,
        empilhamento_maximo: formData.empilhamento_maximo ? parseInt(formData.empilhamento_maximo) : 1,
        valor_seguro: formData.valor_seguro ? parseFloat(formData.valor_seguro) : null,
        observacoes_frete: formData.observacoes_frete || null,
        peso_frete_tipo: formData.peso_frete_tipo || "fixo",
        // Campos de EAN/Embalagem
        ean_13: formData.ean_13 || null,
        ean_14_1: formData.ean_14_1 || null,
        ean_14_2: formData.ean_14_2 || null,
        embalagem_img_ean13: formData.embalagem_img_ean13 || null,
        embalagem_img_ean14_1: formData.embalagem_img_ean14_1 || null,
        embalagem_img_ean14_2: formData.embalagem_img_ean14_2 || null,
        // Campos customizados do grupo
        campos_customizados: formData.campos_customizados || {},
        // Campos de preço do produto
        tipo_preco: formData.tipo_preco || "categoria",
        preco_minimo: formData.preco_minimo ? parseFloat(formData.preco_minimo) : null,
        preco_tabela: formData.preco_tabela ? parseFloat(formData.preco_tabela) : null,
        preco_ativo: formData.preco_ativo,
      };

      if (editingProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(produtoData)
          .eq('id', editingProduto.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          if (error.message.includes('idx_produtos_nome_estabelecimento')) {
            toast.error("Já existe um produto com este nome");
          } else if (error.message.includes('idx_produtos_codigo_estabelecimento')) {
            toast.error("Já existe um produto com este código");
          } else {
            toast.error(`Erro: ${error.message}`);
          }
          return;
        }
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert(produtoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          if (error.message.includes('idx_produtos_nome_estabelecimento')) {
            toast.error("Já existe um produto com este nome");
          } else if (error.message.includes('idx_produtos_codigo_estabelecimento')) {
            toast.error("Já existe um produto com este código");
          } else {
            toast.error(`Erro: ${error.message}`);
          }
          return;
        }
        toast.success("Produto criado!");
      }

      setShowDialog(false);
      setEditingProduto(null);
      setSelectedFile(null);
      setFormData(initialFormData);
      setActiveTab("basico");
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error("Erro ao salvar produto");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (produto: Produto) => {
    setEditingProduto(produto);
    setSelectedFile(null);
    const p = produto as any;
    setFormData({
      nome: produto.nome,
      codigo: p.codigo || "",
      largura: produto.largura?.toString() || "",
      altura: p.altura?.toString() || "",
      gramatura: produto.gramatura?.toString() || "",
      comprimento: produto.comprimento?.toString() || "",
      peso_unitario: produto.peso_unitario?.toString() || "",
      numero_folhas: p.numero_folhas?.toString() || "",
      foto_url: produto.foto_url || "",
      categoria_id: produto.categoria_id || "",
      grupo_id: produto.grupo_id || "",
      ativo: produto.ativo,
      // Campos de frete
      embalagem_largura: p.embalagem_largura?.toString() || "",
      embalagem_altura: p.embalagem_altura?.toString() || "",
      embalagem_comprimento: p.embalagem_comprimento?.toString() || "",
      embalagem_peso: p.embalagem_peso?.toString() || "",
      ncm_id: p.ncm_id || "",
      ncm: p.ncm || "",
      cubagem: p.cubagem?.toString() || "",
      fragil: p.fragil || false,
      empilhamento_maximo: p.empilhamento_maximo?.toString() || "1",
      valor_seguro: p.valor_seguro?.toString() || "",
      observacoes_frete: p.observacoes_frete || "",
      peso_frete_tipo: p.peso_frete_tipo || "fixo",
      // Campos de EAN/Embalagem
      ean_13: p.ean_13 || "",
      ean_14_1: p.ean_14_1 || "",
      ean_14_2: p.ean_14_2 || "",
      embalagem_img_ean13: p.embalagem_img_ean13 || "",
      embalagem_img_ean14_1: p.embalagem_img_ean14_1 || "",
      embalagem_img_ean14_2: p.embalagem_img_ean14_2 || "",
      // Campos customizados
      campos_customizados: p.campos_customizados || {},
      // Campos de preço do produto
      tipo_preco: p.tipo_preco || "categoria",
      preco_minimo: p.preco_minimo?.toString() || "",
      preco_tabela: p.preco_tabela?.toString() || "",
      preco_ativo: p.preco_ativo ?? true,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Produto excluído!");
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error("Erro ao excluir produto");
    }
  };

  const openNewDialog = () => {
    setEditingProduto(null);
    setSelectedFile(null);
    setFormData(initialFormData);
    setActiveTab("basico");
    setShowDialog(true);
  };

  // Filtra NCMs pela busca
  const filteredNcm = ncmCodigos.filter(ncm => 
    ncm.codigo.toLowerCase().includes(ncmSearch.toLowerCase()) ||
    ncm.descricao.toLowerCase().includes(ncmSearch.toLowerCase())
  );

  const selectedNcmDisplay = ncmCodigos.find(n => n.id === formData.ncm_id);

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando produtos...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base sm:text-lg font-semibold">Produtos</h3>
          {hasActiveFilters && (
            <Badge variant="secondary" className="text-xs">
              {filteredAndSortedProdutos.length} de {produtos.length}
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(hasActiveFilters && "border-primary text-primary")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
            {hasActiveFilters && <span className="ml-1 text-xs">•</span>}
          </Button>
          <Button onClick={openNewDialog} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border rounded-lg p-4 bg-muted/30 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Filtros</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs">
                <X className="w-3 h-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, código ou NCM..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterGrupo} onValueChange={setFilterGrupo}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Grupo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos grupos</SelectItem>
                {grupos.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Range filters for custom fields */}
          {filterCamposCustomizados.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <span className="text-xs font-medium text-muted-foreground mb-2 block">
                Filtros por faixa de valores
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filterCamposCustomizados.map(campo => (
                  <div key={campo.id} className="bg-background rounded-md p-3 border">
                    <Label className="text-xs font-medium mb-2 block">
                      {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder="De"
                        value={rangeFilters[campo.campo_key]?.min || ""}
                        onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                        className="text-sm h-8"
                      />
                      <span className="text-xs text-muted-foreground">até</span>
                      <Input
                        type="number"
                        placeholder="Até"
                        value={rangeFilters[campo.campo_key]?.max || ""}
                        onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                        className="text-sm h-8"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile: Card layout */}
      <div className="block lg:hidden space-y-3">
        {filteredAndSortedProdutos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {hasActiveFilters ? "Nenhum produto encontrado com os filtros aplicados" : "Nenhum produto cadastrado"}
          </div>
        ) : (
          filteredAndSortedProdutos.map((produto) => (
            <div key={produto.id} className="border rounded-lg p-3 bg-card">
              <div className="flex items-start gap-3">
                {produto.foto_url ? (
                  <img src={produto.foto_url} alt={produto.nome} className="w-14 h-14 object-cover rounded flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 bg-muted rounded flex items-center justify-center flex-shrink-0">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">{produto.nome}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${produto.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                      {produto.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">{(produto as any).codigo || "-"}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                    <span>{produto.categoria?.nome || "-"}</span>
                    <span>•</span>
                    <span>{produto.grupo?.nome || "-"}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                <Button variant="ghost" size="sm" onClick={() => handleEdit(produto)}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Editar
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(produto.id)} className="text-destructive">
                  <Trash2 className="w-4 h-4 mr-1" />
                  Excluir
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Desktop: Table layout */}
      <div className="hidden lg:block overflow-x-auto border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-16">Foto</TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("codigo")}
              >
                <div className="flex items-center">
                  Código
                  <SortIcon field="codigo" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("nome")}
              >
                <div className="flex items-center">
                  Nome
                  <SortIcon field="nome" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("categoria")}
              >
                <div className="flex items-center">
                  Categoria
                  <SortIcon field="categoria" />
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => handleSort("grupo")}
              >
                <div className="flex items-center">
                  Grupo
                  <SortIcon field="grupo" />
                </div>
              </TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedProdutos.map((produto) => (
              <TableRow key={produto.id} className="hover:bg-muted/30">
                <TableCell>
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.nome} className="w-10 h-10 object-cover rounded" />
                  ) : (
                    <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                      <Image className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{(produto as any).codigo || "-"}</TableCell>
                <TableCell className="font-medium">{produto.nome}</TableCell>
                <TableCell>
                  {produto.categoria?.nome && (
                    <Badge variant="outline" className="font-normal">{produto.categoria.nome}</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {produto.grupo?.nome && (
                    <Badge variant="secondary" className="font-normal">{produto.grupo.nome}</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs">{(produto as any).ncm_ref?.codigo || (produto as any).ncm || "-"}</TableCell>
                <TableCell>
                  <Badge variant={produto.ativo ? "default" : "secondary"} className={cn(
                    "font-normal",
                    produto.ativo ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400" : ""
                  )}>
                    {produto.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)} className="h-8 w-8">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(produto.id)} className="h-8 w-8 text-destructive hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredAndSortedProdutos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  {hasActiveFilters ? "Nenhum produto encontrado com os filtros aplicados" : "Nenhum produto cadastrado"}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-hidden p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-4 border-b">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                {editingProduto ? "Editar Produto" : "Novo Produto"}
              </DialogTitle>
              {editingProduto && (
                <p className="text-sm text-muted-foreground mt-1">
                  Código: <span className="font-mono">{(editingProduto as any).codigo}</span>
                </p>
              )}
            </DialogHeader>
          </div>

          <div className="overflow-y-auto max-h-[calc(90vh-140px)] px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-auto bg-muted/50 p-1 rounded-lg">
                <TabsTrigger 
                  value="basico" 
                  className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Dados Básicos</span>
                  <span className="sm:hidden">Básicos</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="preco" 
                  className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Preço</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="frete" 
                  className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Truck className="w-4 h-4" />
                  <span className="hidden sm:inline">Dados para Frete</span>
                  <span className="sm:hidden">Frete</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="embalagem" 
                  className="flex items-center gap-1.5 text-xs sm:text-sm py-2.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Barcode className="w-4 h-4" />
                  <span>Embalagem</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="mt-6">
                <div className="space-y-6">
                  {/* Identificação */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Identificação</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Código *</Label>
                        <Input
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          placeholder="Código do produto"
                          className="h-10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Nome *</Label>
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          placeholder="Nome do produto"
                          className="h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classificação */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Classificação</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Categoria *</Label>
                        <Select
                          value={formData.categoria_id || "none"}
                          onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione...</SelectItem>
                            {categorias.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Grupo *</Label>
                        <Select
                          value={formData.grupo_id || "none"}
                          onValueChange={(value) => setFormData({ ...formData, grupo_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione...</SelectItem>
                            {grupos.map((grupo) => (
                              <SelectItem key={grupo.id} value={grupo.id}>
                                {grupo.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* NCM */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Classificação Fiscal</h4>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">NCM *</Label>
                      <Popover open={ncmOpen} onOpenChange={setNcmOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ncmOpen}
                            className="w-full justify-between font-normal h-10"
                          >
                            {selectedNcmDisplay 
                              ? `${selectedNcmDisplay.codigo} - ${selectedNcmDisplay.descricao.substring(0, 30)}${selectedNcmDisplay.descricao.length > 30 ? '...' : ''}`
                              : "Selecione o NCM..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[500px] p-0" align="start">
                          <Command>
                            <CommandInput 
                              placeholder="Buscar NCM..." 
                              value={ncmSearch}
                              onValueChange={setNcmSearch}
                            />
                            <CommandList>
                              <CommandEmpty>
                                {ncmCodigos.length === 0 
                                  ? "Nenhum NCM cadastrado. Configure os códigos NCM em 'Códigos NCM'."
                                  : "Nenhum NCM encontrado."}
                              </CommandEmpty>
                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                {filteredNcm.slice(0, 50).map((ncm) => (
                                  <CommandItem
                                    key={ncm.id}
                                    value={ncm.id}
                                    onSelect={() => {
                                      setFormData({ ...formData, ncm_id: ncm.id, ncm: ncm.codigo });
                                      setNcmOpen(false);
                                      setNcmSearch("");
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.ncm_id === ncm.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-mono font-medium">{ncm.codigo}</span>
                                      <span className="text-xs text-muted-foreground">{ncm.descricao}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Campos Customizados do Grupo */}
                  {camposCustomizados.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Campos do Grupo</h4>
                      <DynamicProductFields
                        campos={camposCustomizados}
                        values={formData.campos_customizados}
                        onChange={(key, value) => setFormData({
                          ...formData,
                          campos_customizados: {
                            ...formData.campos_customizados,
                            [key]: value,
                          },
                        })}
                      />
                    </div>
                  )}

                  {camposCustomizados.length === 0 && formData.grupo_id && (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg bg-muted/30">
                      Nenhum campo customizado configurado para este grupo. 
                      Configure os campos em "Campos Customizados por Grupo".
                    </div>
                  )}

                  {/* Foto e Status */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground border-b pb-2">Foto e Status</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Foto do Produto</Label>
                        <div className="flex items-center gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => document.getElementById('file-upload')?.click()}
                            disabled={uploading}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {selectedFile ? 'Trocar' : 'Selecionar'}
                          </Button>
                          {(formData.foto_url || selectedFile) && (
                            <img 
                              src={formData.foto_url} 
                              alt="Preview" 
                              className="w-12 h-12 object-cover rounded border"
                            />
                          )}
                        </div>
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />
                      </div>
                      <div className="flex items-center gap-3 h-10 mt-7">
                        <Switch
                          checked={formData.ativo}
                          onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                        />
                        <Label className="text-sm">Produto ativo</Label>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

            <TabsContent value="preco" className="mt-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-xs sm:text-sm font-medium mb-3 block">Tipo de Precificação</Label>
                  <RadioGroup
                    value={formData.tipo_preco}
                    onValueChange={(value) => setFormData({ ...formData, tipo_preco: value })}
                    className="flex flex-col sm:flex-row gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="categoria" id="preco-categoria" />
                      <Label htmlFor="preco-categoria" className="text-xs sm:text-sm cursor-pointer">
                        Usar preço da categoria
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="produto" id="preco-produto" />
                      <Label htmlFor="preco-produto" className="text-xs sm:text-sm cursor-pointer">
                        Usar preço próprio do produto
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {formData.tipo_preco === "produto" && (
                  <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                    <h4 className="font-medium text-xs sm:text-sm text-muted-foreground">Configuração de Preço do Produto</h4>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <Label className="text-xs sm:text-sm">Preço Mínimo (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.preco_minimo}
                          onChange={(e) => setFormData({ ...formData, preco_minimo: e.target.value })}
                          placeholder="0.00"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-xs sm:text-sm">Preço de Tabela (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.preco_tabela}
                          onChange={(e) => setFormData({ ...formData, preco_tabela: e.target.value })}
                          placeholder="0.00"
                          className="text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={formData.preco_ativo}
                        onCheckedChange={(checked) => setFormData({ ...formData, preco_ativo: checked })}
                      />
                      <Label className="text-xs sm:text-sm">Preço ativo</Label>
                    </div>
                  </div>
                )}

                {formData.tipo_preco === "categoria" && (
                  <div className="border rounded-lg p-4 bg-muted/30">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      O preço deste produto será definido pela tabela de preço da categoria selecionada.
                      Configure os preços por categoria em "Preço por Categoria" no menu de configurações de vendas.
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="frete" className="mt-4">
              <div className="space-y-6">
                {/* Dimensões da Embalagem */}
                <div>
                  <h4 className="font-medium mb-3 text-xs sm:text-sm text-muted-foreground">Dimensões da Embalagem</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Largura (cm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.embalagem_largura}
                        onChange={(e) => handleEmbalagemChange('embalagem_largura', e.target.value)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Altura (cm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.embalagem_altura}
                        onChange={(e) => handleEmbalagemChange('embalagem_altura', e.target.value)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Comprimento (cm)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.embalagem_comprimento}
                        onChange={(e) => handleEmbalagemChange('embalagem_comprimento', e.target.value)}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Tipo de Cálculo de Peso */}
                <div>
                  <h4 className="font-medium mb-3 text-xs sm:text-sm text-muted-foreground">Cálculo do Peso para Frete</h4>
                  <div className="p-3 sm:p-4 border rounded-md bg-muted/30">
                    <RadioGroup
                      value={formData.peso_frete_tipo}
                      onValueChange={(value) => setFormData({ ...formData, peso_frete_tipo: value })}
                      className="space-y-3"
                    >
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="fixo" id="peso_fixo" className="mt-1" />
                        <div>
                          <Label htmlFor="peso_fixo" className="cursor-pointer font-medium text-xs sm:text-sm">
                            Peso Fixo (Embalagem)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Usa o peso com embalagem informado abaixo
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <RadioGroupItem value="calculado" id="peso_calculado" className="mt-1" />
                        <div>
                          <Label htmlFor="peso_calculado" className="cursor-pointer font-medium text-xs sm:text-sm">
                            Peso Calculado (Qtd × Peso)
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            Calcula o peso total multiplicando quantidade pelo peso unitário
                          </p>
                        </div>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                {/* Peso e Cubagem */}
                <div>
                  <h4 className="font-medium mb-3 text-xs sm:text-sm text-muted-foreground">Peso e Volume</h4>
                  <div className={`grid gap-3 sm:gap-4 ${formData.peso_frete_tipo === 'fixo' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                    {formData.peso_frete_tipo === 'fixo' && (
                      <div>
                        <Label className="text-xs sm:text-sm">Peso com Embalagem (kg)</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={formData.embalagem_peso}
                          onChange={(e) => setFormData({ ...formData, embalagem_peso: e.target.value })}
                          placeholder="0.000"
                          className="text-sm"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs sm:text-sm">Cubagem (m³)</Label>
                      <Input
                        type="number"
                        step="0.000001"
                        value={formData.cubagem}
                        onChange={(e) => setFormData({ ...formData, cubagem: e.target.value })}
                        placeholder="Calculado automaticamente"
                        className="bg-muted/50 text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Calculado automaticamente pelas dimensões</p>
                    </div>
                  </div>
                </div>

                {/* Informações Fiscais */}
                <div>
                  <h4 className="font-medium mb-3 text-xs sm:text-sm text-muted-foreground">Informações Adicionais</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div>
                      <Label className="text-xs sm:text-sm">Valor para Seguro (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={formData.valor_seguro}
                        onChange={(e) => setFormData({ ...formData, valor_seguro: e.target.value })}
                        placeholder="0.00"
                        className="text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs sm:text-sm">Empilhamento Máximo</Label>
                      <Input
                        type="number"
                        min="1"
                        value={formData.empilhamento_maximo}
                        onChange={(e) => setFormData({ ...formData, empilhamento_maximo: e.target.value })}
                        placeholder="1"
                        className="text-sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Quantidade máxima de caixas empilhadas</p>
                    </div>
                  </div>
                </div>

                {/* Características de Transporte */}
                <div>
                  <h4 className="font-medium mb-3 text-xs sm:text-sm text-muted-foreground">Características de Transporte</h4>
                  <div className="flex items-center gap-3 p-3 border rounded-md">
                    <Switch
                      checked={formData.fragil}
                      onCheckedChange={(checked) => setFormData({ ...formData, fragil: checked })}
                    />
                    <div>
                      <Label className="cursor-pointer text-xs sm:text-sm">Produto Frágil</Label>
                      <p className="text-xs text-muted-foreground">Requer cuidados especiais no transporte</p>
                    </div>
                  </div>
                </div>

                {/* Observações */}
                <div>
                  <Label className="text-xs sm:text-sm">Observações para Transporte</Label>
                  <Textarea
                    value={formData.observacoes_frete}
                    onChange={(e) => setFormData({ ...formData, observacoes_frete: e.target.value })}
                    placeholder="Informações adicionais para a transportadora..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="embalagem" className="mt-4">
              <EmbalagemTab
                ean13={formData.ean_13}
                ean14_1={formData.ean_14_1}
                ean14_2={formData.ean_14_2}
                imgEan13={formData.embalagem_img_ean13}
                imgEan14_1={formData.embalagem_img_ean14_1}
                imgEan14_2={formData.embalagem_img_ean14_2}
                estabelecimentoId={estabelecimentoId}
                onEan13Change={(value) => setFormData(prev => ({ ...prev, ean_13: value }))}
                onEan14_1Change={(value) => setFormData(prev => ({ ...prev, ean_14_1: value }))}
                onEan14_2Change={(value) => setFormData(prev => ({ ...prev, ean_14_2: value }))}
                onImgEan13Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean13: url }))}
                onImgEan14_1Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean14_1: url }))}
                onImgEan14_2Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean14_2: url }))}
              />
            </TabsContent>
          </Tabs>
          </div>

          <div className="border-t px-6 py-4 bg-muted/20">
            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={uploading} className="w-full sm:w-auto">
                {uploading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
