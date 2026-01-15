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
import { Trash2, Pencil, Plus, Upload, X, Image } from "lucide-react";

interface ProdutoGrupo {
  id: string;
  nome: string;
  percentual_comissao?: number;
  imagem_referencia?: string | null;
  imagem_catalogo?: string | null;
  estabelecimento_id: string;
}

interface ProdutoGruposCRUDProps {
  estabelecimentoId: string;
}

export function ProdutoGruposCRUD({ estabelecimentoId }: ProdutoGruposCRUDProps) {
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingGrupo, setEditingGrupo] = useState<ProdutoGrupo | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    percentual_comissao: "",
    imagem_referencia: "",
    imagem_catalogo: "",
  });
  
  // Estados para arquivos selecionados (igual ProdutosCRUD)
  const [selectedFileReferencia, setSelectedFileReferencia] = useState<File | null>(null);
  const [selectedFileCatalogo, setSelectedFileCatalogo] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (estabelecimentoId) {
      loadGrupos();
    }
  }, [estabelecimentoId]);

  const loadGrupos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  // Upload para Supabase Storage (igual ProdutosCRUD)
  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${estabelecimentoId}/${folder}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Erro no upload:', error);
      toast.error("Erro ao fazer upload da imagem");
      return null;
    }
  };

  // Handler EXATAMENTE igual ProdutosCRUD
  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imagem_referencia' | 'imagem_catalogo'
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error("Por favor selecione um arquivo de imagem");
        return;
      }
      
      if (field === 'imagem_referencia') {
        setSelectedFileReferencia(file);
      } else {
        setSelectedFileCatalogo(file);
      }
      
      const previewUrl = URL.createObjectURL(file);
      setFormData({ ...formData, [field]: previewUrl });
    }
  };

  const clearImage = (field: 'imagem_referencia' | 'imagem_catalogo') => {
    setFormData(prev => ({ ...prev, [field]: "" }));
    if (field === 'imagem_referencia') {
      setSelectedFileReferencia(null);
    } else {
      setSelectedFileCatalogo(null);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    try {
      setUploading(true);
      
      let imagemReferenciaUrl = formData.imagem_referencia;
      let imagemCatalogoUrl = formData.imagem_catalogo;

      // Upload dos arquivos selecionados para Storage
      if (selectedFileReferencia) {
        const url = await uploadFile(selectedFileReferencia, 'grupos-referencia');
        if (url) imagemReferenciaUrl = url;
      }
      
      if (selectedFileCatalogo) {
        const url = await uploadFile(selectedFileCatalogo, 'grupos-catalogo');
        if (url) imagemCatalogoUrl = url;
      }

      // Se a URL é blob:// mas não tem arquivo selecionado, manter a URL existente do banco
      if (imagemReferenciaUrl?.startsWith('blob:') && !selectedFileReferencia) {
        imagemReferenciaUrl = editingGrupo?.imagem_referencia || null;
      }
      if (imagemCatalogoUrl?.startsWith('blob:') && !selectedFileCatalogo) {
        imagemCatalogoUrl = editingGrupo?.imagem_catalogo || null;
      }

      const grupoData: any = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        percentual_comissao: formData.percentual_comissao ? parseFloat(formData.percentual_comissao) : 0,
        imagem_referencia: imagemReferenciaUrl || null,
        imagem_catalogo: imagemCatalogoUrl || null,
      };

      if (editingGrupo) {
        const { error } = await supabase
          .from('produto_grupos')
          .update(grupoData)
          .eq('id', editingGrupo.id);

        if (error) {
          console.error('Erro ao atualizar:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Grupo atualizado!");
      } else {
        const { error } = await supabase
          .from('produto_grupos')
          .insert(grupoData);

        if (error) {
          console.error('Erro ao inserir:', error);
          toast.error(`Erro: ${error.message}`);
          return;
        }
        toast.success("Grupo criado!");
      }

      setShowDialog(false);
      setEditingGrupo(null);
      setSelectedFileReferencia(null);
      setSelectedFileCatalogo(null);
      setFormData({ nome: "", percentual_comissao: "", imagem_referencia: "", imagem_catalogo: "" });
      loadGrupos();
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error);
      toast.error("Erro ao salvar grupo");
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (grupo: any) => {
    setEditingGrupo(grupo);
    setFormData({
      nome: grupo.nome,
      percentual_comissao: grupo.percentual_comissao?.toString() || "0",
      imagem_referencia: grupo.imagem_referencia || "",
      imagem_catalogo: grupo.imagem_catalogo || "",
    });
    setSelectedFileReferencia(null);
    setSelectedFileCatalogo(null);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este grupo?")) return;

    try {
      const { error } = await supabase
        .from('produto_grupos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Grupo excluído!");
      loadGrupos();
    } catch (error: any) {
      console.error('Erro ao excluir grupo:', error);
      toast.error("Erro ao excluir grupo");
    }
  };

  if (loading) {
    return <div>Carregando grupos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Grupos de Produtos</h3>
        <Button onClick={() => {
          setEditingGrupo(null);
          setFormData({ nome: "", percentual_comissao: "", imagem_referencia: "", imagem_catalogo: "" });
          setSelectedFileReferencia(null);
          setSelectedFileCatalogo(null);
          setShowDialog(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Grupo
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>% Comissão</TableHead>
            <TableHead>Img Referência</TableHead>
            <TableHead>Img Catálogo</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {grupos.map((grupo: any) => (
            <TableRow key={grupo.id}>
              <TableCell className="font-medium">{grupo.nome}</TableCell>
              <TableCell>{grupo.percentual_comissao}%</TableCell>
              <TableCell>
                {grupo.imagem_referencia ? (
                  <img src={grupo.imagem_referencia} alt="Referência" className="h-10 w-10 object-cover rounded" />
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {grupo.imagem_catalogo ? (
                  <img src={grupo.imagem_catalogo} alt="Catálogo" className="h-10 w-10 object-cover rounded" />
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(grupo)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(grupo.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {grupos.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum grupo cadastrado
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingGrupo ? "Editar Grupo" : "Novo Grupo"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome *</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do grupo"
              />
            </div>

            <div>
              <Label>Percentual de Comissão (%)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentual_comissao}
                onChange={(e) => setFormData({ ...formData, percentual_comissao: e.target.value })}
                placeholder="0.00"
              />
            </div>

            {/* Imagem de Referência */}
            <div>
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Imagem de Referência do Produto
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Imagem ilustrativa para identificar o tipo de produto do grupo
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('grupo-imagem-referencia-upload')?.click()}
                  disabled={uploading}
                  className="text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFileReferencia ? 'Trocar' : 'Selecionar'}
                </Button>
                {(formData.imagem_referencia || selectedFileReferencia) && (
                  <img 
                    src={formData.imagem_referencia} 
                    alt="Preview" 
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border"
                  />
                )}
              </div>
              <input
                id="grupo-imagem-referencia-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'imagem_referencia')}
                className="hidden"
              />
            </div>

            {/* Imagem para Catálogo */}
            <div>
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" />
                Imagem para Catálogo de Produtos
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Imagem que será exibida no catálogo de produtos para este grupo
              </p>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('grupo-imagem-catalogo-upload')?.click()}
                  disabled={uploading}
                  className="text-sm"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {selectedFileCatalogo ? 'Trocar' : 'Selecionar'}
                </Button>
                {(formData.imagem_catalogo || selectedFileCatalogo) && (
                  <img 
                    src={formData.imagem_catalogo} 
                    alt="Preview" 
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded border"
                  />
                )}
              </div>
              <input
                id="grupo-imagem-catalogo-upload"
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, 'imagem_catalogo')}
                className="hidden"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
