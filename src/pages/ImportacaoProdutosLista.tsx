import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Calendar, Globe, Trash2, Edit, MoreVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";

interface Relatorio {
  id: string;
  nome: string;
  data_criacao: string;
  api_endpoint: string | null;
  ativo: boolean;
  created_at: string;
}

export default function ImportacaoProdutosLista() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatorioToDelete, setRelatorioToDelete] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRelatorios();
  }, []);

  const loadRelatorios = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRelatorios(data || []);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!relatorioToDelete) return;

    try {
      const { error } = await supabase
        .from("relatorios_importacao")
        .delete()
        .eq("id", relatorioToDelete);

      if (error) throw error;

      toast.success("Relatório excluído com sucesso");
      loadRelatorios();
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      toast.error("Erro ao excluir relatório");
    } finally {
      setDeleteDialogOpen(false);
      setRelatorioToDelete(null);
    }
  };

  const handleCopyApiUrl = (apiEndpoint: string | null) => {
    if (!apiEndpoint) {
      toast.error("API ainda não foi gerada");
      return;
    }

    navigator.clipboard.writeText(apiEndpoint);
    toast.success("URL da API copiada!");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importação de Produtos</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas rotinas de importação de produtos
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando relatórios...</p>
        </div>
      ) : relatorios.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro relatório de importação para começar
            </p>
            <Button onClick={() => navigate("/importacao-produtos/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Relatório
            </Button>
          </CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card de Criação */}
        <Card 
          className="cursor-pointer hover:shadow-lg transition-shadow border-dashed border-2 flex items-center justify-center min-h-[200px]"
          onClick={() => navigate("/importacao-produtos/novo")}
        >
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Criar Nova Importação</h3>
            <p className="text-sm text-muted-foreground text-center mt-2">
              Importe produtos de arquivos Excel
            </p>
          </CardContent>
        </Card>

        {relatorios.map((relatorio) => (
            <Card key={relatorio.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{relatorio.nome}</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(relatorio.data_criacao).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <Badge variant={relatorio.ativo ? "default" : "secondary"}>
                    {relatorio.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {relatorio.api_endpoint && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">URL da API</span>
                    </div>
                    <p className="text-xs font-mono break-all text-muted-foreground">
                      {relatorio.api_endpoint}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => handleCopyApiUrl(relatorio.api_endpoint)}
                    >
                      Copiar URL
                    </Button>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => navigate(`/importacao-produtos/editar/${relatorio.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      setRelatorioToDelete(relatorio.id);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
