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
import { Trash2, Pencil, Plus, GripVertical, Settings } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ProdutoGrupo } from "@/types/orcamento";

interface ProdutoCamposCustomizadosCRUDProps {
  estabelecimentoId: string;
}

interface CampoCustomizado {
  id: string;
  grupo_id: string;
  estabelecimento_id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: any; // JSONB from database
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
  placeholder: string | null;
  unidade: string | null;
}

interface FormData {
  grupo_id: string;
  nome: string;
  campo_key: string;
  tipo: string;
  opcoes: string;
  obrigatorio: boolean;
  ordem: number;
  ativo: boolean;
  placeholder: string;
  unidade: string;
}

const tiposCampo = [
  { value: "texto", label: "Texto" },
  { value: "numero", label: "Número" },
  { value: "selecao", label: "Seleção" },
  { value: "checkbox", label: "Checkbox" },
  { value: "textarea", label: "Texto Longo" },
  { value: "data", label: "Data" },
];

const initialFormData: FormData = {
  grupo_id: "",
  nome: "",
  campo_key: "",
  tipo: "texto",
  opcoes: "",
  obrigatorio: false,
  ordem: 0,
  ativo: true,
  placeholder: "",
  unidade: "",
};

export function ProdutoCamposCustomizadosCRUD({ estabelecimentoId }: ProdutoCamposCustomizadosCRUDProps) {
  const [campos, setCampos] = useState<CampoCustomizado[]>([]);
  const [grupos, setGrupos] = useState<ProdutoGrupo[]>([]);
  const [selectedGrupo, setSelectedGrupo] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCampo, setEditingCampo] = useState<CampoCustomizado | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campoToDelete, setCampoToDelete] = useState<CampoCustomizado | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (estabelecimentoId) {
      loadGrupos();
    }
  }, [estabelecimentoId]);

  useEffect(() => {
    if (selectedGrupo) {
      loadCampos();
    }
  }, [selectedGrupo]);

  const loadGrupos = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_grupos')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');

      if (error) throw error;
      setGrupos(data || []);
      
      // Se não tiver grupos, criar o grupo Industrial
      if (!data || data.length === 0) {
        await createIndustrialGroup();
      } else {
        // Verificar se existe grupo Industrial
        const industrialGrupo = data.find(g => g.nome.toLowerCase() === 'industrial');
        if (industrialGrupo) {
          setSelectedGrupo(industrialGrupo.id);
          // Verificar e criar campos padrão se necessário
          await ensureDefaultFields(industrialGrupo.id);
        } else if (data.length > 0) {
          setSelectedGrupo(data[0].id);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar grupos:', error);
      toast.error("Erro ao carregar grupos");
    } finally {
      setLoading(false);
    }
  };

  const createIndustrialGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('produto_grupos')
        .insert({
          nome: 'Industrial',
          estabelecimento_id: estabelecimentoId,
        })
        .select()
        .single();

      if (error) throw error;
      
      setGrupos([data]);
      setSelectedGrupo(data.id);
      
      // Criar campos padrão
      await createDefaultIndustrialFields(data.id);
    } catch (error: any) {
      console.error('Erro ao criar grupo Industrial:', error);
    }
  };

  const ensureDefaultFields = async (grupoId: string) => {
    try {
      const { data: existingCampos } = await supabase
        .from('produto_campos_customizados')
        .select('campo_key')
        .eq('grupo_id', grupoId);

      const existingKeys = new Set(existingCampos?.map(c => c.campo_key) || []);
      const defaultFields = ['largura', 'altura', 'comprimento', 'gramatura', 'numero_folhas'];
      
      const missingFields = defaultFields.filter(key => !existingKeys.has(key));
      
      if (missingFields.length > 0) {
        await createDefaultIndustrialFields(grupoId, missingFields);
      }
    } catch (error) {
      console.error('Erro ao verificar campos padrão:', error);
    }
  };

  const createDefaultIndustrialFields = async (grupoId: string, onlyFields?: string[]) => {
    const defaultFields = [
      { campo_key: 'largura', nome: 'Largura', tipo: 'numero', unidade: 'cm', ordem: 1 },
      { campo_key: 'altura', nome: 'Altura', tipo: 'numero', unidade: 'cm', ordem: 2 },
      { campo_key: 'comprimento', nome: 'Comprimento', tipo: 'numero', unidade: 'cm', ordem: 3 },
      { campo_key: 'gramatura', nome: 'Gramatura', tipo: 'numero', unidade: 'g/m²', ordem: 4 },
      { campo_key: 'numero_folhas', nome: 'Número de Folhas', tipo: 'numero', unidade: 'un', ordem: 5 },
    ];

    const fieldsToCreate = onlyFields 
      ? defaultFields.filter(f => onlyFields.includes(f.campo_key))
      : defaultFields;

    try {
      const { error } = await supabase
        .from('produto_campos_customizados')
        .insert(
          fieldsToCreate.map(field => ({
            ...field,
            grupo_id: grupoId,
            estabelecimento_id: estabelecimentoId,
            ativo: true,
            obrigatorio: false,
          }))
        );

      if (error) throw error;
      loadCampos();
    } catch (error: any) {
      console.error('Erro ao criar campos padrão:', error);
    }
  };

  const loadCampos = async () => {
    if (!selectedGrupo) return;
    
    try {
      const { data, error } = await supabase
        .from('produto_campos_customizados')
        .select('*')
        .eq('grupo_id', selectedGrupo)
        .order('ordem');

      if (error) throw error;
      setCampos(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar campos:', error);
      toast.error("Erro ao carregar campos");
    }
  };

  const generateKey = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleNomeChange = (nome: string) => {
    const newFormData = { ...formData, nome };
    if (!editingCampo) {
      newFormData.campo_key = generateKey(nome);
    }
    setFormData(newFormData);
  };

  const openNewDialog = () => {
    setEditingCampo(null);
    setFormData({ ...initialFormData, grupo_id: selectedGrupo, ordem: campos.length });
    setShowDialog(true);
  };

  const handleEdit = (campo: CampoCustomizado) => {
    setEditingCampo(campo);
    setFormData({
      grupo_id: campo.grupo_id,
      nome: campo.nome,
      campo_key: campo.campo_key,
      tipo: campo.tipo,
      opcoes: campo.opcoes ? campo.opcoes.join(', ') : '',
      obrigatorio: campo.obrigatorio,
      ordem: campo.ordem,
      ativo: campo.ativo,
      placeholder: campo.placeholder || '',
      unidade: campo.unidade || '',
    });
    setShowDialog(true);
  };

  const openDeleteDialog = (campo: CampoCustomizado) => {
    setCampoToDelete(campo);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!campoToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('produto_campos_customizados')
        .delete()
        .eq('id', campoToDelete.id);

      if (error) throw error;
      toast.success("Campo excluído com sucesso");
      loadCampos();
      setDeleteDialogOpen(false);
      setCampoToDelete(null);
    } catch (error: any) {
      console.error('Erro ao excluir campo:', error);
      toast.error("Erro ao excluir campo");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome || !formData.campo_key || !formData.tipo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    try {
      const campoData = {
        grupo_id: selectedGrupo,
        estabelecimento_id: estabelecimentoId,
        nome: formData.nome,
        campo_key: formData.campo_key,
        tipo: formData.tipo,
        opcoes: formData.tipo === 'selecao' && formData.opcoes 
          ? formData.opcoes.split(',').map(o => o.trim()).filter(Boolean)
          : null,
        obrigatorio: formData.obrigatorio,
        ordem: formData.ordem,
        ativo: formData.ativo,
        placeholder: formData.placeholder || null,
        unidade: formData.unidade || null,
      };

      if (editingCampo) {
        const { error } = await supabase
          .from('produto_campos_customizados')
          .update(campoData)
          .eq('id', editingCampo.id);

        if (error) throw error;
        toast.success("Campo atualizado com sucesso");
      } else {
        const { error } = await supabase
          .from('produto_campos_customizados')
          .insert(campoData);

        if (error) throw error;
        toast.success("Campo criado com sucesso");
      }

      setShowDialog(false);
      loadCampos();
    } catch (error: any) {
      console.error('Erro ao salvar campo:', error);
      toast.error(error.message || "Erro ao salvar campo");
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-base sm:text-lg font-semibold flex items-center gap-2">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" />
            Campos Customizados
          </h3>
          <Button onClick={openNewDialog} disabled={!selectedGrupo} size="sm" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>
        <Select value={selectedGrupo} onValueChange={setSelectedGrupo}>
          <SelectTrigger className="w-full sm:w-[200px] text-sm">
            <SelectValue placeholder="Selecione o grupo" />
          </SelectTrigger>
          <SelectContent>
            {grupos.map((grupo) => (
              <SelectItem key={grupo.id} value={grupo.id}>
                {grupo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedGrupo ? (
        <div className="text-center text-muted-foreground py-8 text-sm">
          Selecione um grupo para gerenciar seus campos customizados
        </div>
      ) : (
        <>
          {/* Mobile: Card layout */}
          <div className="block lg:hidden space-y-3">
            {campos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum campo customizado para este grupo
              </div>
            ) : (
              campos.map((campo, index) => (
                <div key={campo.id} className="border rounded-lg p-3 bg-card">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <p className="font-medium text-sm truncate">{campo.nome}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs flex-shrink-0 ${campo.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                          {campo.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-1">{campo.campo_key}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-muted-foreground">
                        <span>{tiposCampo.find(t => t.value === campo.tipo)?.label || campo.tipo}</span>
                        {campo.unidade && <span>• {campo.unidade}</span>}
                        {campo.obrigatorio && <span className="text-orange-600">• Obrigatório</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(campo)}>
                      <Pencil className="w-4 h-4 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(campo)} className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-1" /> Excluir
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
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Chave</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campos.map((campo, index) => (
                  <TableRow key={campo.id}>
                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="font-medium">{campo.nome}</TableCell>
                    <TableCell className="font-mono text-xs">{campo.campo_key}</TableCell>
                    <TableCell>
                      {tiposCampo.find(t => t.value === campo.tipo)?.label || campo.tipo}
                    </TableCell>
                    <TableCell>{campo.unidade || "-"}</TableCell>
                    <TableCell>
                      {campo.obrigatorio ? (
                        <span className="text-orange-600 dark:text-orange-400">Sim</span>
                      ) : (
                        <span className="text-muted-foreground">Não</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${campo.ativo ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'}`}>
                        {campo.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(campo)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(campo)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {campos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      Nenhum campo customizado para este grupo
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="w-[95vw] max-w-lg p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingCampo ? "Editar Campo" : "Novo Campo"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3 sm:gap-4 py-2 sm:py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Nome do Campo *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  placeholder="Ex: Largura, Gramatura"
                  className="text-sm"
                />
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Chave (identificador) *</Label>
                <Input
                  value={formData.campo_key}
                  onChange={(e) => setFormData({ ...formData, campo_key: e.target.value })}
                  placeholder="Ex: largura, gramatura"
                  disabled={!!editingCampo}
                  className="text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Tipo de Campo *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCampo.map((tipo) => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs sm:text-sm">Unidade</Label>
                <Input
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  placeholder="Ex: cm, kg, mm"
                  className="text-sm"
                />
              </div>
            </div>

            {formData.tipo === 'selecao' && (
              <div>
                <Label className="text-xs sm:text-sm">Opções (separadas por vírgula)</Label>
                <Input
                  value={formData.opcoes}
                  onChange={(e) => setFormData({ ...formData, opcoes: e.target.value })}
                  placeholder="Ex: Opção 1, Opção 2, Opção 3"
                  className="text-sm"
                />
              </div>
            )}

            <div>
              <Label className="text-xs sm:text-sm">Placeholder</Label>
              <Input
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="Texto de ajuda no campo"
                className="text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm">Ordem</Label>
                <Input
                  type="number"
                  value={formData.ordem}
                  onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
                  className="text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.obrigatorio}
                    onCheckedChange={(checked) => setFormData({ ...formData, obrigatorio: checked })}
                  />
                  <Label className="text-xs sm:text-sm">Obrigatório</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={formData.ativo}
                    onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                  />
                  <Label className="text-xs sm:text-sm">Ativo</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowDialog(false)} size="sm" className="w-full sm:w-auto">
              Cancelar
            </Button>
            <Button onClick={handleSubmit} size="sm" className="w-full sm:w-auto">
              {editingCampo ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={campoToDelete?.nome}
        isLoading={isDeleting}
      />
    </div>
  );
}
