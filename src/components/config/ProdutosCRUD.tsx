import { useState, useEffect } from "react";
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
import { Trash2, Pencil, Plus, Image, Upload, Package, Truck, Barcode, Check, ChevronsUpDown, Search } from "lucide-react";
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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <h3 className="text-base sm:text-lg font-semibold">Produtos</h3>
        <Button onClick={openNewDialog} size="sm" className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Mobile: Card layout */}
      <div className="block lg:hidden space-y-3">
        {produtos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhum produto cadastrado
          </div>
        ) : (
          produtos.map((produto) => (
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
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Foto</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Grupo</TableHead>
              <TableHead>NCM</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {produtos.map((produto) => (
              <TableRow key={produto.id}>
                <TableCell>
                  {produto.foto_url ? (
                    <img src={produto.foto_url} alt={produto.nome} className="w-12 h-12 object-cover rounded" />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                      <Image className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm">{(produto as any).codigo || "-"}</TableCell>
                <TableCell className="font-medium">{produto.nome}</TableCell>
                <TableCell>{produto.categoria?.nome || "-"}</TableCell>
                <TableCell>{produto.grupo?.nome || "-"}</TableCell>
                <TableCell className="font-mono text-xs">{(produto as any).ncm_ref?.codigo || (produto as any).ncm || "-"}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded-full text-xs ${produto.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                    {produto.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(produto)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(produto.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {produtos.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Nenhum produto cadastrado
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingProduto ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="basico" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Dados Básicos</span>
                <span className="sm:hidden">Básicos</span>
              </TabsTrigger>
              <TabsTrigger value="frete" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Dados para Frete</span>
                <span className="sm:hidden">Frete</span>
              </TabsTrigger>
              <TabsTrigger value="embalagem" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Barcode className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Embalagem</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="basico" className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs sm:text-sm">Código *</Label>
                  <Input
                    value={formData.codigo}
                    onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                    placeholder="Código do produto"
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Nome *</Label>
                  <Input
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Nome do produto"
                    className="text-sm"
                  />
                </div>

                <div>
                  <Label className="text-xs sm:text-sm">Categoria *</Label>
                  <Select
                    value={formData.categoria_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="text-sm">
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

                <div>
                  <Label className="text-xs sm:text-sm">Grupo *</Label>
                  <Select
                    value={formData.grupo_id || "none"}
                    onValueChange={(value) => setFormData({ ...formData, grupo_id: value === "none" ? "" : value })}
                  >
                    <SelectTrigger className="text-sm">
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

                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm">NCM *</Label>
                  <Popover open={ncmOpen} onOpenChange={setNcmOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={ncmOpen}
                        className="w-full justify-between font-normal text-sm"
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

                {/* Campos Customizados do Grupo */}
                {camposCustomizados.length > 0 && (
                  <div className="sm:col-span-2">
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
                  <div className="sm:col-span-2 text-xs sm:text-sm text-muted-foreground p-3 sm:p-4 border rounded-lg bg-muted/30">
                    Nenhum campo customizado configurado para este grupo. 
                    Configure os campos em "Campos Customizados por Grupo".
                  </div>
                )}

                <div className="sm:col-span-2">
                  <Label className="text-xs sm:text-sm">Foto do Produto</Label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-upload')?.click()}
                      disabled={uploading}
                      className="w-full sm:w-auto"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {selectedFile ? 'Trocar foto' : 'Selecionar foto'}
                    </Button>
                    {(formData.foto_url || selectedFile) && (
                      <img 
                        src={formData.foto_url} 
                        alt="Preview" 
                        className="w-16 h-16 object-cover rounded border"
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

                <div className="sm:col-span-2 flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label className="text-xs sm:text-sm">Produto ativo</Label>
                </div>
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

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading} size="sm" className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={uploading} size="sm" className="w-full sm:w-auto">
              {uploading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
