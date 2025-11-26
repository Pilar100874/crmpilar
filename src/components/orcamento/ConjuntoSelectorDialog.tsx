import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Check } from "lucide-react";

interface ConjuntoItem {
  id: string;
  produto_id: string;
  quantidade_padrao: number;
  preco_padrao?: number;
  produto?: {
    id: string;
    nome: string;
  };
}

interface ConjuntoPreenchido extends ConjuntoItem {
  quantidade: number;
  preco: number;
}

interface ConjuntoSelectorDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Array<{ produto_id: string; quantidade: number; preco: number }>) => void;
}

export function ConjuntoSelectorDialog({ open, onClose, onConfirm }: ConjuntoSelectorDialogProps) {
  const [conjuntos, setConjuntos] = useState<Array<{ id: string; nome: string }>>([]);
  const [selectedConjunto, setSelectedConjunto] = useState<string | null>(null);
  const [items, setItems] = useState<ConjuntoPreenchido[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadConjuntos();
    }
  }, [open]);

  const loadConjuntos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: userData, error: userError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (userError || !userData) {
        throw new Error("Usuário não encontrado na base de dados");
      }

      const { data, error } = await supabase
        .from("orcamento_conjuntos_usuario")
        .select("id, nome")
        .eq("usuario_id", userData.id)
        .order("nome");

      if (error) throw error;
      setConjuntos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar conjuntos:", error);
      toast.error("Erro ao carregar conjuntos");
    }
  };

  const handleSelectConjunto = async (conjuntoId: string) => {
    try {
      setLoading(true);
      setSelectedConjunto(conjuntoId);

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

      setItems(itemsPreenchidos);
    } catch (error: any) {
      console.error("Erro ao carregar itens:", error);
      toast.error("Erro ao carregar itens do conjunto");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = (id: string, field: "quantidade" | "preco", value: number) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleConfirm = () => {
    // Filtrar apenas itens com quantidade > 0
    const itemsToAdd = items
      .filter(item => item.quantidade > 0)
      .map(item => ({
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco: item.preco
      }));

    if (itemsToAdd.length === 0) {
      toast.error("Adicione quantidade para pelo menos um item");
      return;
    }

    onConfirm(itemsToAdd);
    handleClose();
  };

  const handleClose = () => {
    setSelectedConjunto(null);
    setItems([]);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Selecionar Conjunto de Itens</DialogTitle>
        </DialogHeader>

        {!selectedConjunto ? (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground mb-4">
              Selecione um conjunto para carregar os itens:
            </p>
            {conjuntos.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum conjunto disponível. Crie um conjunto primeiro.
              </div>
            ) : (
              <div className="grid gap-2">
                {conjuntos.map((conjunto) => (
                  <Button
                    key={conjunto.id}
                    variant="outline"
                    className="justify-start h-auto py-4"
                    onClick={() => handleSelectConjunto(conjunto.id)}
                  >
                    {conjunto.nome}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando itens...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Preencha as quantidades e preços dos itens:
              </p>
              <Button variant="outline" size="sm" onClick={() => setSelectedConjunto(null)}>
                Voltar
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Este conjunto não possui itens cadastrados.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="w-32">Quantidade</TableHead>
                      <TableHead className="w-32">Preço Unit.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.produto?.nome}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) => handleUpdateItem(item.id, "quantidade", parseFloat(e.target.value) || 0)}
                            className="w-full"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.preco}
                            onChange={(e) => handleUpdateItem(item.id, "preco", parseFloat(e.target.value) || 0)}
                            className="w-full"
                            placeholder="0,00"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button onClick={handleConfirm}>
                    <Check className="h-4 w-4 mr-2" />
                    Adicionar ao Orçamento
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
