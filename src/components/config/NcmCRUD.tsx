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
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { Trash2, Pencil, Plus, Download, Loader2, Search, FileCode } from "lucide-react";

interface NcmCodigo {
  id: string;
  codigo: string;
  descricao: string;
  created_at: string;
}

interface FormData {
  codigo: string;
  descricao: string;
}

const initialFormData: FormData = {
  codigo: "",
  descricao: "",
};

export function NcmCRUD() {
  const [ncmCodigos, setNcmCodigos] = useState<NcmCodigo[]>([]);
  const [filteredCodigos, setFilteredCodigos] = useState<NcmCodigo[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingNcm, setEditingNcm] = useState<NcmCodigo | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ncmToDelete, setNcmToDelete] = useState<NcmCodigo | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadNcmCodigos();
  }, []);

  useEffect(() => {
    const filtered = ncmCodigos.filter(
      (ncm) =>
        ncm.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ncm.descricao.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCodigos(filtered);
  }, [searchTerm, ncmCodigos]);

  const loadNcmCodigos = async () => {
    try {
      const { data, error } = await supabase
        .from("ncm_codigos")
        .select("*")
        .order("codigo");

      if (error) throw error;
      setNcmCodigos(data || []);
      setFilteredCodigos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar NCM:", error);
      toast.error("Erro ao carregar códigos NCM");
    } finally {
      setLoading(false);
    }
  };

  const importNcm = async () => {
    setImporting(true);
    try {
      const { data, error } = await supabase.functions.invoke("importar-ncm");

      if (error) throw error;

      if (data?.success) {
        toast.success(`NCM importado: ${data.inserted} códigos inseridos`);
        loadNcmCodigos();
      } else {
        throw new Error(data?.error || "Erro desconhecido");
      }
    } catch (error: any) {
      console.error("Erro ao importar NCM:", error);
      toast.error("Erro ao importar NCM: " + error.message);
    } finally {
      setImporting(false);
    }
  };

  const openNewDialog = () => {
    setEditingNcm(null);
    setFormData(initialFormData);
    setShowDialog(true);
  };

  const handleEdit = (ncm: NcmCodigo) => {
    setEditingNcm(ncm);
    setFormData({
      codigo: ncm.codigo,
      descricao: ncm.descricao,
    });
    setShowDialog(true);
  };

  const openDeleteDialog = (ncm: NcmCodigo) => {
    setNcmToDelete(ncm);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!ncmToDelete) return;

    setIsDeleting(true);
    try {
      // Check if NCM is in use
      const { data: produtos } = await supabase
        .from("produtos")
        .select("id")
        .eq("ncm_id", ncmToDelete.id)
        .limit(1);

      if (produtos && produtos.length > 0) {
        toast.error("Este NCM está vinculado a produtos e não pode ser excluído");
        setDeleteDialogOpen(false);
        setNcmToDelete(null);
        setIsDeleting(false);
        return;
      }

      const { error } = await supabase
        .from("ncm_codigos")
        .delete()
        .eq("id", ncmToDelete.id);

      if (error) throw error;
      toast.success("NCM excluído com sucesso");
      loadNcmCodigos();
      setDeleteDialogOpen(false);
      setNcmToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir NCM:", error);
      toast.error("Erro ao excluir NCM");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCodigo = (codigo: string) => {
    // Remove non-numeric characters
    const numbers = codigo.replace(/\D/g, "");
    // Format as XXXX.XX.XX
    if (numbers.length <= 4) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 4)}.${numbers.slice(4)}`;
    return `${numbers.slice(0, 4)}.${numbers.slice(4, 6)}.${numbers.slice(6, 8)}`;
  };

  const handleCodigoChange = (value: string) => {
    const formatted = formatCodigo(value);
    setFormData({ ...formData, codigo: formatted });
  };

  const handleSubmit = async () => {
    if (!formData.codigo || !formData.descricao) {
      toast.error("Preencha todos os campos");
      return;
    }

    // Validate format
    const codePattern = /^\d{4}\.\d{2}\.\d{2}$/;
    if (!codePattern.test(formData.codigo)) {
      toast.error("Código NCM deve estar no formato XXXX.XX.XX");
      return;
    }

    try {
      if (editingNcm) {
        const { error } = await supabase
          .from("ncm_codigos")
          .update({
            codigo: formData.codigo,
            descricao: formData.descricao,
          })
          .eq("id", editingNcm.id);

        if (error) throw error;
        toast.success("NCM atualizado com sucesso");
      } else {
        const { error } = await supabase.from("ncm_codigos").insert({
          codigo: formData.codigo,
          descricao: formData.descricao,
        });

        if (error) {
          if (error.code === "23505") {
            toast.error("Código NCM já cadastrado");
            return;
          }
          throw error;
        }
        toast.success("NCM criado com sucesso");
      }

      setShowDialog(false);
      loadNcmCodigos();
    } catch (error: any) {
      console.error("Erro ao salvar NCM:", error);
      toast.error(error.message || "Erro ao salvar NCM");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5" />
          <h3 className="text-lg font-semibold">Códigos NCM</h3>
          <span className="text-sm text-muted-foreground">
            ({ncmCodigos.length} cadastrados)
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={importNcm} disabled={importing}>
            {importing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {importing ? "Importando..." : "Importar NCM"}
          </Button>
          <Button onClick={openNewDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Novo NCM
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="border rounded-lg max-h-[400px] overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-[150px]">Código</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCodigos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                  {searchTerm
                    ? "Nenhum NCM encontrado com esse filtro"
                    : "Nenhum NCM cadastrado. Clique em 'Importar NCM' para importar da API oficial."}
                </TableCell>
              </TableRow>
            ) : (
              filteredCodigos.slice(0, 100).map((ncm) => (
                <TableRow key={ncm.id}>
                  <TableCell className="font-mono">{ncm.codigo}</TableCell>
                  <TableCell className="max-w-md truncate" title={ncm.descricao}>
                    {ncm.descricao}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(ncm)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(ncm)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {filteredCodigos.length > 100 && (
          <div className="text-center text-sm text-muted-foreground py-2 border-t">
            Mostrando 100 de {filteredCodigos.length} resultados. Use a busca para filtrar.
          </div>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingNcm ? "Editar NCM" : "Novo NCM"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div>
              <Label>Código NCM *</Label>
              <Input
                value={formData.codigo}
                onChange={(e) => handleCodigoChange(e.target.value)}
                placeholder="0000.00.00"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Formato: XXXX.XX.XX
              </p>
            </div>
            <div>
              <Label>Descrição *</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descrição do produto/serviço"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              {editingNcm ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        itemName={ncmToDelete?.codigo}
        isLoading={isDeleting}
      />
    </div>
  );
}
