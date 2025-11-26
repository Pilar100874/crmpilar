import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Edit, Package } from "lucide-react";
import { ConjuntoItensEditor } from "./ConjuntoItensEditor";

interface Conjunto {
  id: string;
  nome: string;
  descricao?: string;
  created_at: string;
  itens_count?: number;
}

export function ConjuntosItensManager() {
  const [conjuntos, setConjuntos] = useState<Conjunto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [editingConjunto, setEditingConjunto] = useState<Conjunto | null>(null);
  const [showItemsEditor, setShowItemsEditor] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    descricao: ""
  });

  useEffect(() => {
    loadConjuntos();
  }, []);

  const loadConjuntos = async () => {
    try {
      setLoading(true);
      
      // Buscar usuário autenticado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Buscar dados do usuário na tabela usuarios
      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      if (userError) throw userError;

      // Buscar conjuntos do usuário
      const { data, error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .select(`
          *,
          itens:orcamento_conjuntos_itens(count)
        `)
        .eq("usuario_id", userData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Formatar dados com contagem de itens
      const conjuntosFormatted = data?.map(c => ({
        ...c,
        itens_count: c.itens?.[0]?.count || 0
      })) || [];

      setConjuntos(conjuntosFormatted);
    } catch (error: any) {
      console.error("Erro ao carregar conjuntos:", error);
      toast.error("Erro ao carregar conjuntos");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error("Nome é obrigatório");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("id, estabelecimento_id")
        .eq("auth_user_id", user.id)
        .single();

      if (userError) throw userError;

      if (editingConjunto) {
        // Atualizar conjunto existente
        const { error } = await supabase
          .from("orcamento_conjuntos_usuario")
          .update({
            nome: formData.nome,
            descricao: formData.descricao
          })
          .eq("id", editingConjunto.id);

        if (error) throw error;
        toast.success("Conjunto atualizado com sucesso!");
      } else {
        // Criar novo conjunto
        const { error } = await supabase
          .from("orcamento_conjuntos_usuario")
          .insert({
            usuario_id: userData.id,
            estabelecimento_id: userData.estabelecimento_id,
            nome: formData.nome,
            descricao: formData.descricao
          });

        if (error) throw error;
        toast.success("Conjunto criado com sucesso!");
      }

      setShowNewDialog(false);
      setEditingConjunto(null);
      setFormData({ nome: "", descricao: "" });
      loadConjuntos();
    } catch (error: any) {
      console.error("Erro ao salvar conjunto:", error);
      toast.error("Erro ao salvar conjunto");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir este conjunto? Todos os itens associados também serão removidos.")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Conjunto excluído com sucesso!");
      loadConjuntos();
    } catch (error: any) {
      console.error("Erro ao excluir conjunto:", error);
      toast.error("Erro ao excluir conjunto");
    }
  };

  const handleEdit = (conjunto: Conjunto) => {
    setEditingConjunto(conjunto);
    setFormData({
      nome: conjunto.nome,
      descricao: conjunto.descricao || ""
    });
    setShowNewDialog(true);
  };

  const handleCloseDialog = () => {
    setShowNewDialog(false);
    setEditingConjunto(null);
    setFormData({ nome: "", descricao: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Package className="h-5 w-5" />
          Meus Conjuntos de Itens
        </h3>
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingConjunto(null)}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Conjunto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingConjunto ? "Editar Conjunto" : "Novo Conjunto"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Conjunto Produtos Alimentícios"
                />
              </div>
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Descrição opcional"
                  rows={3}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando conjuntos...
        </div>
      ) : conjuntos.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          Nenhum conjunto criado ainda. Crie seu primeiro conjunto!
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Itens</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {conjuntos.map((conjunto) => (
              <TableRow key={conjunto.id}>
                <TableCell className="font-medium">{conjunto.nome}</TableCell>
                <TableCell className="text-muted-foreground">
                  {conjunto.descricao || "-"}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="link"
                    onClick={() => setShowItemsEditor(conjunto.id)}
                  >
                    {conjunto.itens_count} item(ns)
                  </Button>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(conjunto)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(conjunto.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {showItemsEditor && (
        <ConjuntoItensEditor
          conjuntoId={showItemsEditor}
          onClose={() => {
            setShowItemsEditor(null);
            loadConjuntos();
          }}
        />
      )}
    </div>
  );
}
