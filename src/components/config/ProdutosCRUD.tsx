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
import { Trash2, Pencil, Plus, Image as ImageIcon, Upload, Package, Truck, Barcode, Check, ChevronsUpDown, Search, DollarSign, ArrowUpDown, ArrowUp, ArrowDown, Filter, X, Store, Sparkles, Loader2, Camera } from "lucide-react";
import { Produto, ProdutoCategoria, ProdutoGrupo } from "@/types/orcamento";
import { EmbalagemTab } from "./EmbalagemTab";
import { ProductPhotoTab, type ProductImage } from "./ProductPhotoTab";
import { normalizeImageToSquare } from "@/lib/imageNormalize";
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

interface CustomFieldFilters {
  range: Record<string, RangeFilter>;  // For numeric fields with pesquisa_faixa
  text: Record<string, string>;         // For text fields
  select: Record<string, string>;       // For selection fields
  checkbox: Record<string, boolean | null>; // For checkbox fields (null = any)
  number: Record<string, string>;       // For numeric fields without pesquisa_faixa
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
  // Campos para Marketplace
  descricao: string;
  marca: string;
  estoque: string;
  garantia: string;
  origem: string;
  condicao: string;
  foto_url_2: string;
  foto_url_3: string;
  // Campos extras para Marketplace
  mpn: string;
  gtin: string;
  cor: string;
  tamanho: string;
  material: string;
  genero: string;
  faixa_etaria: string;
  categoria_google: string;
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
  // Campos para Marketplace
  descricao: "",
  marca: "",
  estoque: "0",
  garantia: "",
  origem: "nacional",
  condicao: "novo",
  foto_url_2: "",
  foto_url_3: "",
  // Campos extras para Marketplace
  mpn: "",
  gtin: "",
  cor: "",
  tamanho: "",
  material: "",
  genero: "",
  faixa_etaria: "",
  categoria_google: "",
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
  const [productImages, setProductImages] = useState<ProductImage[]>([]);
  const [camposCustomizados, setCamposCustomizados] = useState<CampoCustomizado[]>([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategoria, setFilterCategoria] = useState<string>("all");
  const [filterGrupo, setFilterGrupo] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  // Custom field filter states
  const [filterCamposCustomizados, setFilterCamposCustomizados] = useState<CampoCustomizado[]>([]);
  const [customFieldFilters, setCustomFieldFilters] = useState<CustomFieldFilters>({
    range: {},
    text: {},
    select: {},
    checkbox: {},
    number: {}
  });
  
  // Sort states
  const [sortField, setSortField] = useState<string>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Load filter campos customizados when filterGrupo changes
  useEffect(() => {
    if (filterGrupo && filterGrupo !== "all") {
      loadFilterCamposCustomizados(filterGrupo);
    } else {
      setFilterCamposCustomizados([]);
      setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
    }
  }, [filterGrupo]);

  const loadFilterCamposCustomizados = async (grupoId: string) => {
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', grupoId)
        .eq('ativo', true)
        .order('ordem');

      if (error) throw error;
      setFilterCamposCustomizados(data || []);
      
      // Initialize filters for each campo based on type
      const newFilters: CustomFieldFilters = { range: {}, text: {}, select: {}, checkbox: {}, number: {} };
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
      console.error('Erro ao carregar campos para filtro:', error);
      setFilterCamposCustomizados([]);
    }
  };

  const updateCustomFilter = (type: keyof CustomFieldFilters, campoKey: string, value: any) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [campoKey]: value
      }
    }));
  };

  const updateRangeFilter = (campoKey: string, field: "min" | "max", value: string) => {
    setCustomFieldFilters(prev => ({
      ...prev,
      range: {
        ...prev.range,
        [campoKey]: {
          ...prev.range[campoKey],
          [field]: value
        }
      }
    }));
  };

  // Check if any custom filter has values
  const hasCustomFilters = 
    Object.values(customFieldFilters.range).some(rf => rf?.min || rf?.max) ||
    Object.values(customFieldFilters.text).some(v => v) ||
    Object.values(customFieldFilters.select).some(v => v) ||
    Object.values(customFieldFilters.checkbox).some(v => v !== null) ||
    Object.values(customFieldFilters.number).some(v => v);

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
    
    // Apply custom field filters
    filterCamposCustomizados.forEach(campo => {
      const camposCustom = (p: any) => (p as any).campos_customizados || {};
      
      // Range filter (numeric with pesquisa_faixa)
      if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
        const range = customFieldFilters.range[campo.campo_key];
        if (range && (range.min || range.max)) {
          const minVal = range.min ? parseFloat(range.min) : 0;
          const maxVal = range.max ? parseFloat(range.max) : 99999;
          result = result.filter(p => {
            const fieldValue = parseFloat(camposCustom(p)[campo.campo_key]) || 0;
            return fieldValue >= minVal && fieldValue <= maxVal;
          });
        }
      }
      
      // Simple number filter
      else if (campo.tipo === 'numero') {
        const filterVal = customFieldFilters.number[campo.campo_key];
        if (filterVal) {
          result = result.filter(p => {
            const fieldValue = String(camposCustom(p)[campo.campo_key] || "");
            return fieldValue.includes(filterVal);
          });
        }
      }
      
      // Text filter
      else if (campo.tipo === 'texto') {
        const filterVal = customFieldFilters.text[campo.campo_key];
        if (filterVal) {
          const term = filterVal.toLowerCase();
          result = result.filter(p => {
            const fieldValue = String(camposCustom(p)[campo.campo_key] || "").toLowerCase();
            return fieldValue.includes(term);
          });
        }
      }
      
      // Selection filter
      else if (campo.tipo === 'selecao') {
        const filterVal = customFieldFilters.select[campo.campo_key];
        if (filterVal) {
          result = result.filter(p => {
            const fieldValue = camposCustom(p)[campo.campo_key];
            return fieldValue === filterVal;
          });
        }
      }
      
      // Checkbox filter
      else if (campo.tipo === 'checkbox') {
        const filterVal = customFieldFilters.checkbox[campo.campo_key];
        if (filterVal !== null) {
          result = result.filter(p => {
            const fieldValue = Boolean(camposCustom(p)[campo.campo_key]);
            return fieldValue === filterVal;
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
  }, [produtos, searchTerm, filterCategoria, filterGrupo, filterStatus, sortField, sortDirection, customFieldFilters, filterCamposCustomizados]);

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
    setCustomFieldFilters({ range: {}, text: {}, select: {}, checkbox: {}, number: {} });
  };

  const hasActiveFilters = searchTerm || filterCategoria !== "all" || filterGrupo !== "all" || filterStatus !== "all" || hasCustomFilters;

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
          toast.error("Já existe um produto com este SKU");
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
      toast.error("SKU do produto é obrigatório");
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

      // === Galeria: faz upload das imagens novas, mantém as existentes,
      //     calcula a principal e deduz a foto_url a salvar no produto.
      const uploadedImages: ProductImage[] = [];
      for (let i = 0; i < productImages.length; i++) {
        const img = productImages[i];
        if (img.file) {
          // garante quadrado 1024x1024
          const normalized = await normalizeImageToSquare(img.file, 1024);
          const fileName = `${estabelecimentoId}/${Date.now()}-${i}.jpg`;
          const { error: upErr } = await supabase.storage
            .from('produtos')
            .upload(fileName, normalized, { contentType: 'image/jpeg' });
          if (upErr) {
            console.error('Erro upload galeria:', upErr);
            toast.error("Erro ao enviar uma das fotos");
            return;
          }
          const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(fileName);
          uploadedImages.push({ url: publicUrl, storage_path: fileName, is_principal: img.is_principal, ordem: i, id: undefined });
        } else {
          uploadedImages.push({ ...img, ordem: i });
        }
      }
      // garante que exista uma principal
      if (uploadedImages.length > 0 && !uploadedImages.some((i) => i.is_principal)) {
        uploadedImages[0].is_principal = true;
      }
      const principal = uploadedImages.find((i) => i.is_principal);
      const fotoUrl = principal?.url || null;


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
        // Campos para Marketplace
        descricao: formData.descricao || null,
        marca: formData.marca || null,
        estoque: formData.estoque ? parseInt(formData.estoque) : 0,
        garantia: formData.garantia || null,
        origem: formData.origem || "nacional",
        condicao: formData.condicao || "novo",
        foto_url_2: formData.foto_url_2 || null,
        foto_url_3: formData.foto_url_3 || null,
        // Campos extras para Marketplace
        mpn: formData.mpn || null,
        gtin: formData.gtin || null,
        cor: formData.cor || null,
        tamanho: formData.tamanho || null,
        material: formData.material || null,
        genero: formData.genero || null,
        faixa_etaria: formData.faixa_etaria || null,
        categoria_google: formData.categoria_google || null,
      };

      let produtoId: string | null = editingProduto?.id || null;

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
            toast.error("Já existe um produto com este SKU");
          } else {
            toast.error(`Erro: ${error.message}`);
          }
          return;
        }
        toast.success("Produto atualizado!");
      } else {
        const { data: inserted, error } = await supabase
          .from('produtos')
          .insert(produtoData)
          .select('id')
          .single();

        if (error) {
          console.error('Erro ao inserir:', error);
          if (error.message.includes('idx_produtos_nome_estabelecimento')) {
            toast.error("Já existe um produto com este nome");
          } else if (error.message.includes('idx_produtos_codigo_estabelecimento')) {
            toast.error("Já existe um produto com este SKU");
          } else {
            toast.error(`Erro: ${error.message}`);
          }
          return;
        }
        produtoId = inserted?.id || null;
        toast.success("Produto criado!");
      }

      // === Sincroniza galeria produto_imagens ===
      if (produtoId) {
        // 1. Remove os ids que não estão mais na galeria
        const keepIds = uploadedImages.map((i) => i.id).filter(Boolean) as string[];
        const { data: existing } = await supabase
          .from('produto_imagens')
          .select('id, storage_path')
          .eq('produto_id', produtoId);
        const toDelete = (existing || []).filter((e: any) => !keepIds.includes(e.id));
        if (toDelete.length > 0) {
          await supabase.from('produto_imagens').delete().in('id', toDelete.map((d: any) => d.id));
          const paths = toDelete.map((d: any) => d.storage_path).filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from('produtos').remove(paths);
          }
        }
        // 2. Limpa is_principal para evitar conflito de índice único, depois atualiza/insere
        await supabase
          .from('produto_imagens')
          .update({ is_principal: false })
          .eq('produto_id', produtoId);

        for (const img of uploadedImages) {
          if (img.id) {
            await supabase.from('produto_imagens').update({
              is_principal: img.is_principal,
              ordem: img.ordem,
            }).eq('id', img.id);
          } else {
            await supabase.from('produto_imagens').insert({
              produto_id: produtoId,
              estabelecimento_id: estabelecimentoId,
              url: img.url,
              storage_path: img.storage_path || null,
              is_principal: img.is_principal,
              ordem: img.ordem,
            });
          }
        }

      }

      setShowDialog(false);
      setEditingProduto(null);
      setSelectedFile(null);
      setProductImages([]);
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

  const handleEdit = async (produto: Produto) => {
    setEditingProduto(produto);
    setSelectedFile(null);
    // carrega galeria do produto
    try {
      const { data: imgs } = await supabase
        .from('produto_imagens')
        .select('*')
        .eq('produto_id', produto.id)
        .order('ordem', { ascending: true });
      if (imgs && imgs.length > 0) {
        setProductImages(imgs.map((i: any) => ({
          id: i.id,
          url: i.url,
          storage_path: i.storage_path,
          is_principal: i.is_principal,
          ordem: i.ordem,
        })));
      } else if (produto.foto_url) {
        // fallback: produto antigo sem registros em produto_imagens
        setProductImages([{ url: produto.foto_url, is_principal: true, ordem: 0 }]);
      } else {
        setProductImages([]);
      }
    } catch (err) {
      console.error('Erro ao carregar imagens:', err);
      setProductImages([]);
    }
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
      // Campos para Marketplace
      descricao: p.descricao || "",
      marca: p.marca || "",
      estoque: p.estoque?.toString() || "0",
      garantia: p.garantia || "",
      origem: p.origem || "nacional",
      condicao: p.condicao || "novo",
      foto_url_2: p.foto_url_2 || "",
      foto_url_3: p.foto_url_3 || "",
      // Campos extras para Marketplace
      mpn: p.mpn || "",
      gtin: p.gtin || "",
      cor: p.cor || "",
      tamanho: p.tamanho || "",
      material: p.material || "",
      genero: p.genero || "",
      faixa_etaria: p.faixa_etaria || "",
      categoria_google: p.categoria_google || "",
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
    setProductImages([]);
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
                placeholder="Buscar por nome, SKU ou NCM..."
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
          
          {/* Custom field filters */}
          {filterCamposCustomizados.length > 0 && (
            <div className="border-t pt-3 mt-3">
              <span className="text-xs font-medium text-muted-foreground mb-2 block">
                Filtros de campos customizados
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filterCamposCustomizados.map(campo => {
                  // Range filter for numeric fields with pesquisa_faixa
                  if (campo.tipo === 'numero' && campo.pesquisa_faixa) {
                    return (
                      <div key={campo.id} className="bg-background rounded-md p-3 border">
                        <Label className="text-xs font-medium mb-2 block">
                          {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                        </Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            placeholder="De"
                            value={customFieldFilters.range[campo.campo_key]?.min || ""}
                            onChange={(e) => updateRangeFilter(campo.campo_key, "min", e.target.value)}
                            className="text-sm h-8"
                          />
                          <span className="text-xs text-muted-foreground">até</span>
                          <Input
                            type="number"
                            placeholder="Até"
                            value={customFieldFilters.range[campo.campo_key]?.max || ""}
                            onChange={(e) => updateRangeFilter(campo.campo_key, "max", e.target.value)}
                            className="text-sm h-8"
                          />
                        </div>
                      </div>
                    );
                  }
                  
                  // Simple number filter
                  if (campo.tipo === 'numero') {
                    return (
                      <div key={campo.id} className="bg-background rounded-md p-3 border">
                        <Label className="text-xs font-medium mb-2 block">
                          {campo.nome} {campo.unidade && <span className="text-muted-foreground">({campo.unidade})</span>}
                        </Label>
                        <Input
                          type="number"
                          placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                          value={customFieldFilters.number[campo.campo_key] || ""}
                          onChange={(e) => updateCustomFilter('number', campo.campo_key, e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                    );
                  }
                  
                  // Text filter
                  if (campo.tipo === 'texto') {
                    return (
                      <div key={campo.id} className="bg-background rounded-md p-3 border">
                        <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                        <Input
                          type="text"
                          placeholder={`Filtrar ${campo.nome.toLowerCase()}...`}
                          value={customFieldFilters.text[campo.campo_key] || ""}
                          onChange={(e) => updateCustomFilter('text', campo.campo_key, e.target.value)}
                          className="text-sm h-8"
                        />
                      </div>
                    );
                  }
                  
                  // Selection filter
                  if (campo.tipo === 'selecao') {
                    const opcoes = Array.isArray(campo.opcoes) ? campo.opcoes : [];
                    return (
                      <div key={campo.id} className="bg-background rounded-md p-3 border">
                        <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                        <Select 
                          value={customFieldFilters.select[campo.campo_key] || ""} 
                          onValueChange={(val) => updateCustomFilter('select', campo.campo_key, val === "all" ? "" : val)}
                        >
                          <SelectTrigger className="text-sm h-8">
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
                        <Label className="text-xs font-medium mb-2 block">{campo.nome}</Label>
                        <Select 
                          value={customFieldFilters.checkbox[campo.campo_key] === null ? "all" : customFieldFilters.checkbox[campo.campo_key] ? "true" : "false"} 
                          onValueChange={(val) => updateCustomFilter('checkbox', campo.campo_key, val === "all" ? null : val === "true")}
                        >
                          <SelectTrigger className="text-sm h-8">
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
                    <ImageIcon className="w-5 h-5 text-muted-foreground" />
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
                  SKU
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
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
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
        <DialogContent className="w-[98vw] sm:w-[95vw] max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden p-0 flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-3 sm:px-6 py-3 sm:py-4 pr-12 sm:pr-14 border-b flex-shrink-0">
            <DialogHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-3">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-semibold flex items-center gap-2 pr-2">
                    <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0">
                      <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    </div>
                    <span className="truncate">{editingProduto ? "Editar Produto" : "Novo Produto"}</span>
                  </DialogTitle>
                  {editingProduto && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                      SKU: <span className="font-mono">{(editingProduto as any).codigo}</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border bg-background/80 backdrop-blur shrink-0 self-start">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label className="text-xs sm:text-sm cursor-pointer">
                    {formData.ativo ? "Ativo" : "Inativo"}
                  </Label>
                </div>
              </div>
            </DialogHeader>
          </div>


          <div className="overflow-y-auto flex-1 min-h-0 px-3 sm:px-6 py-3 sm:py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-6 h-auto bg-muted/50 p-0.5 sm:p-1 rounded-lg gap-0.5 sm:gap-1">
                <TabsTrigger 
                  value="basico" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">Dados Básicos</span>
                  <span className="md:hidden">Básicos</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="foto" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Foto</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="preco" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span>Preço</span>
                </TabsTrigger>

                <TabsTrigger 
                  value="frete" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden md:inline">Dados Frete</span>
                  <span className="md:hidden">Frete</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="embalagem" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Barcode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Embalagem</span>
                  <span className="sm:hidden">EAN</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="marketplace" 
                  className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-sm py-1.5 sm:py-2.5 px-1 sm:px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Marketplace</span>
                  <span className="sm:hidden">MKT</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basico" className="mt-4 sm:mt-6">
                <div className="space-y-4 sm:space-y-6">
                  {/* Identificação */}
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Identificação</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">SKU *</Label>
                        <Input
                          value={formData.codigo}
                          onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          placeholder="SKU do produto"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">Nome *</Label>
                        <Input
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          placeholder="Nome do produto"
                          className="h-9 sm:h-10 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classificação */}
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Classificação</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">Categoria *</Label>
                        <Select
                          value={formData.categoria_id || "none"}
                          onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                      <div className="space-y-1.5 sm:space-y-2">
                        <Label className="text-xs sm:text-sm font-medium">Grupo *</Label>
                        <Select
                          value={formData.grupo_id || "none"}
                          onValueChange={(value) => setFormData({ ...formData, grupo_id: value === "none" ? "" : value })}
                        >
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
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
                  <div className="space-y-3 sm:space-y-4">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Classificação Fiscal</h4>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">NCM *</Label>
                      <Popover open={ncmOpen} onOpenChange={setNcmOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={ncmOpen}
                            className="w-full justify-between font-normal h-9 sm:h-10 text-xs sm:text-sm"
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

                </div>
              </TabsContent>

              <TabsContent value="foto" className="mt-4 sm:mt-6">
                <ProductPhotoTab
                  productName={formData.nome}
                  images={productImages}
                  onChange={setProductImages}
                />
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
                productData={formData}
                onEan13Change={(value) => setFormData(prev => ({ ...prev, ean_13: value }))}
                onEan14_1Change={(value) => setFormData(prev => ({ ...prev, ean_14_1: value }))}
                onEan14_2Change={(value) => setFormData(prev => ({ ...prev, ean_14_2: value }))}
                onImgEan13Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean13: url }))}
                onImgEan14_1Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean14_1: url }))}
                onImgEan14_2Change={(url) => setFormData(prev => ({ ...prev, embalagem_img_ean14_2: url }))}
              />
            </TabsContent>

            <TabsContent value="marketplace" className="mt-4 sm:mt-6">
              <div className="space-y-4 sm:space-y-6">
                {/* Identificação Marketplace */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Informações para Marketplaces</h4>
                  
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm font-medium">Descrição do Produto</Label>
                    <Textarea
                      value={formData.descricao}
                      onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                      placeholder="Descrição detalhada do produto para anúncios em marketplaces"
                      className="min-h-[100px] text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Descrição que aparecerá nos anúncios dos marketplaces</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Marca</Label>
                      <Input
                        value={formData.marca}
                        onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                        placeholder="Ex: Samsung, Apple, Nike..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Estoque</Label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.estoque}
                        onChange={(e) => setFormData({ ...formData, estoque: e.target.value })}
                        placeholder="Quantidade em estoque"
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Detalhes do Produto</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Condição</Label>
                      <Select
                        value={formData.condicao || "novo"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, condicao: value }))}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione a condição" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                          <SelectItem value="novo">Novo</SelectItem>
                          <SelectItem value="usado">Usado</SelectItem>
                          <SelectItem value="recondicionado">Recondicionado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Origem</Label>
                      <Select
                        value={formData.origem || "nacional"}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, origem: value }))}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione a origem" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                          <SelectItem value="nacional">Nacional</SelectItem>
                          <SelectItem value="importado">Importado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Garantia</Label>
                      <Input
                        value={formData.garantia}
                        onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                        placeholder="Ex: 12 meses, 1 ano..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Códigos de Identificação */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Códigos de Identificação</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">MPN (Part Number do Fabricante)</Label>
                      <Input
                        value={formData.mpn}
                        onChange={(e) => setFormData({ ...formData, mpn: e.target.value })}
                        placeholder="Código do fabricante"
                        className="h-9 sm:h-10 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Código único atribuído pelo fabricante</p>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">GTIN</Label>
                      <Input
                        value={formData.gtin}
                        onChange={(e) => setFormData({ ...formData, gtin: e.target.value })}
                        placeholder="Global Trade Item Number"
                        className="h-9 sm:h-10 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Código global (alternativo ao EAN)</p>
                    </div>
                  </div>
                </div>

                {/* Características do Produto */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Características do Produto</h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Cor</Label>
                      <Input
                        value={formData.cor}
                        onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                        placeholder="Ex: Azul, Preto, Vermelho..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Tamanho</Label>
                      <Input
                        value={formData.tamanho}
                        onChange={(e) => setFormData({ ...formData, tamanho: e.target.value })}
                        placeholder="Ex: P, M, G, 42, 100ml..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Material</Label>
                      <Input
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                        placeholder="Ex: Algodão, Couro, Plástico..."
                        className="h-9 sm:h-10 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Gênero</Label>
                      <Select
                        value={formData.genero || ""}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, genero: value }))}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione o gênero" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                          <SelectItem value="unissex">Unissex</SelectItem>
                          <SelectItem value="masculino">Masculino</SelectItem>
                          <SelectItem value="feminino">Feminino</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Faixa Etária</Label>
                      <Select
                        value={formData.faixa_etaria || ""}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, faixa_etaria: value }))}
                      >
                        <SelectTrigger className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Selecione a faixa etária" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="z-[9999]" sideOffset={4}>
                          <SelectItem value="adulto">Adulto</SelectItem>
                          <SelectItem value="infantil">Infantil</SelectItem>
                          <SelectItem value="bebe">Bebê</SelectItem>
                          <SelectItem value="adolescente">Adolescente</SelectItem>
                          <SelectItem value="todas">Todas as Idades</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Categoria Google Shopping</Label>
                      <Input
                        value={formData.categoria_google}
                        onChange={(e) => setFormData({ ...formData, categoria_google: e.target.value })}
                        placeholder="ID da categoria Google"
                        className="h-9 sm:h-10 text-sm"
                      />
                      <p className="text-xs text-muted-foreground">ID numérico da taxonomia Google</p>
                    </div>
                  </div>
                </div>

                {/* Fotos Adicionais */}
                <div className="space-y-3 sm:space-y-4">
                  <h4 className="text-xs sm:text-sm font-medium text-muted-foreground border-b pb-2">Fotos Adicionais</h4>
                  <p className="text-xs text-muted-foreground">Adicione fotos extras do produto para exibição nos marketplaces (a foto principal está na aba Básicos)</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Foto 2</Label>
                      <Input
                        value={formData.foto_url_2}
                        onChange={(e) => setFormData({ ...formData, foto_url_2: e.target.value })}
                        placeholder="URL da segunda foto"
                        className="h-9 sm:h-10 text-sm"
                      />
                      {formData.foto_url_2 && (
                        <div className="mt-2 border rounded-md overflow-hidden w-20 h-20">
                          <img src={formData.foto_url_2} alt="Foto 2" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5 sm:space-y-2">
                      <Label className="text-xs sm:text-sm font-medium">Foto 3</Label>
                      <Input
                        value={formData.foto_url_3}
                        onChange={(e) => setFormData({ ...formData, foto_url_3: e.target.value })}
                        placeholder="URL da terceira foto"
                        className="h-9 sm:h-10 text-sm"
                      />
                      {formData.foto_url_3 && (
                        <div className="mt-2 border rounded-md overflow-hidden w-20 h-20">
                          <img src={formData.foto_url_3} alt="Foto 3" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="bg-muted/50 rounded-lg p-3 sm:p-4 border">
                  <div className="flex items-start gap-2">
                    <Store className="w-4 h-4 text-primary mt-0.5" />
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">Campos usados pelos Marketplaces</p>
                      <p>• <strong>SKU:</strong> Identificador único do produto (aba Básicos)</p>
                      <p>• <strong>EAN-13:</strong> Código de barras para identificação (aba Embalagem)</p>
                      <p>• <strong>Fotos:</strong> Imagens do produto e embalagens</p>
                      <p>• <strong>Dimensões/Peso:</strong> Para cálculo de frete (aba Frete)</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <div className="border-t px-3 sm:px-6 py-3 sm:py-4 bg-muted/20 flex-shrink-0">
            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
              <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={uploading} className="w-full sm:w-auto h-9 sm:h-10 text-sm">
                {uploading ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
