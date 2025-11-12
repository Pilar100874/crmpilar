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
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Plus, Image, Upload } from "lucide-react";
import { Produto, ProdutoCategoria, ProdutoGrupo } from "@/types/orcamento";
import { createThumbnail } from "@/lib/imageUtils";

interface ProdutosCRUDProps {
  estabelecimentoId: string;
}

export function ProdutosCRUD({ estabelecimentoId }: ProdutosCRUDProps) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<ProdutoCategoria[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProduto, setEditingProduto] = useState<Produto | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    largura: "",
    gramatura: "",
    comprimento: "",
    peso_unitario: "",
    numero_folhas: "",
    foto_url: "",
    categoria_id: "",
    grupo_id: "",
    ativo: true,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [produtosRes, categoriasRes, gruposRes] = await Promise.all([
        supabase
          .from('produtos')
          .select('*, categoria:produto_categorias(id, nome), grupo:produto_grupos(id, nome)')
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
      ]);

      if (produtosRes.error) throw produtosRes.error;
      if (categoriasRes.error) throw categoriasRes.error;
      if (gruposRes.error) throw gruposRes.error;

      setProdutos((produtosRes.data as any) || []);
      setCategorias(categoriasRes.data || []);
      setGrupos(gruposRes.data || []);
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

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do produto é obrigatório");
      return;
    }

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

      const produtoData = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        largura: formData.largura ? parseFloat(formData.largura) : null,
        gramatura: formData.gramatura ? parseFloat(formData.gramatura) : null,
        comprimento: formData.comprimento ? parseFloat(formData.comprimento) : null,
        peso_unitario: formData.peso_unitario ? parseFloat(formData.peso_unitario) : null,
        numero_folhas: formData.numero_folhas ? parseInt(formData.numero_folhas) : null,
        foto_url: fotoUrl || null,
        categoria_id: formData.categoria_id || null,
        grupo_id: formData.grupo_id || null,
        ativo: formData.ativo,
      };

      if (editingProduto) {
        const { error } = await supabase
          .from('produtos')
          .update(produtoData)
          .eq('id', editingProduto.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Produto atualizado!");
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert(produtoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Produto criado!");
      }

      setShowDialog(false);
      setEditingProduto(null);
      setSelectedFile(null);
      setFormData({
        nome: "",
        largura: "",
        gramatura: "",
        comprimento: "",
        peso_unitario: "",
        numero_folhas: "",
        foto_url: "",
        categoria_id: "",
        grupo_id: "",
        ativo: true,
      });
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
    setFormData({
      nome: produto.nome,
      largura: produto.largura?.toString() || "",
      gramatura: produto.gramatura?.toString() || "",
      comprimento: produto.comprimento?.toString() || "",
      peso_unitario: produto.peso_unitario?.toString() || "",
      numero_folhas: (produto as any).numero_folhas?.toString() || "",
      foto_url: produto.foto_url || "",
      categoria_id: produto.categoria_id || "",
      grupo_id: produto.grupo_id || "",
      ativo: produto.ativo,
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

  if (loading) {
    return <div>Carregando produtos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Produtos</h3>
        <Button onClick={() => {
          setEditingProduto(null);
          setSelectedFile(null);
          setFormData({
            nome: "",
            largura: "",
            gramatura: "",
            comprimento: "",
            peso_unitario: "",
            numero_folhas: "",
            foto_url: "",
            categoria_id: "",
            grupo_id: "",
            ativo: true,
          });
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Foto</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Grupo</TableHead>
            <TableHead>Nº Folhas</TableHead>
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
              <TableCell className="font-medium">{produto.nome}</TableCell>
              <TableCell>{produto.categoria?.nome || "-"}</TableCell>
              <TableCell>{produto.grupo?.nome || "-"}</TableCell>
              <TableCell>{(produto as any).numero_folhas || "-"}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded-full text-xs ${produto.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                  {produto.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(produto)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(produto.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {produtos.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                Nenhum produto cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduto ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do produto"
              />
            </div>

            <div>
              <Label>Largura (cm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.largura}
                onChange={(e) => setFormData({ ...formData, largura: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Gramatura (g/m²)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.gramatura}
                onChange={(e) => setFormData({ ...formData, gramatura: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Comprimento (cm)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.comprimento}
                onChange={(e) => setFormData({ ...formData, comprimento: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Peso Unitário (kg)</Label>
              <Input
                type="number"
                step="0.001"
                value={formData.peso_unitario}
                onChange={(e) => setFormData({ ...formData, peso_unitario: e.target.value })}
                placeholder="0.000"
              />
            </div>

            <div>
              <Label>Número de Folhas</Label>
              <Input
                type="number"
                value={formData.numero_folhas}
                onChange={(e) => setFormData({ ...formData, numero_folhas: e.target.value })}
                placeholder="0"
              />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select
                value={formData.categoria_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, categoria_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo</Label>
              <Select
                value={formData.grupo_id || "none"}
                onValueChange={(value) => setFormData({ ...formData, grupo_id: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {grupos.map((grupo) => (
                    <SelectItem key={grupo.id} value={grupo.id}>
                      {grupo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label>Foto do Produto</Label>
              <div className="flex items-center gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('file-upload')?.click()}
                  disabled={uploading}
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

            <div className="col-span-2 flex items-center gap-2">
              <Switch
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
              <Label>Produto ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={uploading}>
              {uploading ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
