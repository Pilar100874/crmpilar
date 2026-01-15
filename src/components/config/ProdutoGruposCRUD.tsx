import { useState, useEffect, useRef } from "react";
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
import { ProdutoGrupo } from "@/types/orcamento";

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
  
  const imagemReferenciaRef = useRef<HTMLInputElement>(null);
  const imagemCatalogoRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'imagem_referencia' | 'imagem_catalogo'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem deve ter no máximo 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setFormData(prev => ({ ...prev, [field]: dataUrl }));
    };
    reader.readAsDataURL(file);
  };

  const clearImage = (field: 'imagem_referencia' | 'imagem_catalogo') => {
    setFormData(prev => ({ ...prev, [field]: "" }));
    if (field === 'imagem_referencia' && imagemReferenciaRef.current) {
      imagemReferenciaRef.current.value = "";
    } else if (field === 'imagem_catalogo' && imagemCatalogoRef.current) {
      imagemCatalogoRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome do grupo é obrigatório");
      return;
    }

    try {
      const grupoData: any = {
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        percentual_comissao: formData.percentual_comissao ? parseFloat(formData.percentual_comissao) : 0,
        imagem_referencia: formData.imagem_referencia || null,
        imagem_catalogo: formData.imagem_catalogo || null,
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
      setFormData({ nome: "", percentual_comissao: "", imagem_referencia: "", imagem_catalogo: "" });
      loadGrupos();
    } catch (error: any) {
      console.error('Erro ao salvar grupo:', error);
      toast.error("Erro ao salvar grupo");
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
        <DialogContent>
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
              <input
                ref={imagemReferenciaRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'imagem_referencia')}
                className="hidden"
                id="imagem-referencia-upload"
              />
              {formData.imagem_referencia ? (
                <div className="relative inline-block group">
                  <img
                    src={formData.imagem_referencia}
                    alt="Referência"
                    className="h-20 w-20 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => clearImage('imagem_referencia')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imagemReferenciaRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Imagem
                </Button>
              )}
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
              <input
                ref={imagemCatalogoRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'imagem_catalogo')}
                className="hidden"
                id="imagem-catalogo-upload"
              />
              {formData.imagem_catalogo ? (
                <div className="relative inline-block group">
                  <img
                    src={formData.imagem_catalogo}
                    alt="Catálogo"
                    className="h-20 w-20 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => clearImage('imagem_catalogo')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imagemCatalogoRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Carregar Imagem
                </Button>
              )}
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
