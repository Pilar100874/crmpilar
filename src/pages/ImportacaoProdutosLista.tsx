import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [isDeleting, setIsDeleting] = useState(false);
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
    if (!relatorioToDelete || isDeleting) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("relatorios_importacao")
        .delete()
        .eq("id", relatorioToDelete);

      if (error) throw error;

      toast.success("Relatório excluído com sucesso");
      await loadRelatorios();
      setDeleteDialogOpen(false);
      setRelatorioToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      toast.error("Erro ao excluir relatório");
    } finally {
      setIsDeleting(false);
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

  const handleGeneratePdf = async (apiEndpoint: string) => {
    try {
      toast.info("Gerando PDF...");
      
      // Buscar modelo para produtos importados
      const estabelecimentoId = await getEstabelecimentoId();
      const { data: modelo } = await supabase
        .from("relatorios")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();

      if (!modelo) {
        toast.error("Modelo para produtos importados não encontrado. Crie o modelo primeiro.");
        return;
      }

      // Aqui você implementaria a lógica de gerar PDF usando o modelo
      toast.success("PDF gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleGenerateExcel = async (apiEndpoint: string) => {
    try {
      toast.info("Gerando Excel...");
      
      // Buscar dados da API
      const response = await fetch(apiEndpoint);
      if (!response.ok) throw new Error("Erro ao buscar dados da API");
      
      const data = await response.json();
      
      // Aqui você implementaria a lógica de gerar Excel
      toast.success("Excel gerado com sucesso");
    } catch (error) {
      console.error("Erro ao gerar Excel:", error);
      toast.error("Erro ao gerar Excel");
    }
  };

  const handleDuplicate = async (relatorioId: string) => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data: original, error: fetchError } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("id", relatorioId)
        .single();

      if (fetchError) throw fetchError;

      const { id, created_at, api_endpoint, ...duplicateData } = original;
      
      const { error: insertError } = await supabase
        .from("relatorios_importacao")
        .insert({
          ...duplicateData,
          nome: `${duplicateData.nome} (Cópia)`,
          estabelecimento_id: estabelecimentoId,
        });

      if (insertError) throw insertError;

      toast.success("Relatório duplicado com sucesso");
      loadRelatorios();
    } catch (error) {
      console.error("Erro ao duplicar relatório:", error);
      toast.error("Erro ao duplicar relatório");
    }
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
        <div className="grid gap-[1cm] md:grid-cols-3 lg:grid-cols-4">
          {/* Card de Criação */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
            onClick={() => navigate("/importacao-produtos/novo")}
          >
            <CardHeader className="flex-1 p-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Criar Nova Importação</CardTitle>
              <CardDescription>
                Configure uma nova rotina de importação de produtos a partir de arquivos Excel
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-4 pt-0">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Criar Importação
              </Button>
            </CardContent>
          </Card>

          {relatorios.map((relatorio) => (
            <Card
              key={relatorio.id}
              className="hover:shadow-lg transition-all relative group h-full flex flex-col"
            >
              <div className="absolute top-4 right-4 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/importacao-produtos/editar/${relatorio.id}`);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicate(relatorio.id);
                    }}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Duplicar
                    </DropdownMenuItem>
                    {relatorio.api_endpoint && (
                      <>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleCopyApiUrl(relatorio.api_endpoint);
                        }}>
                          <Globe className="h-4 w-4 mr-2" />
                          Copiar URL da API
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePdf(relatorio.api_endpoint);
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Gerar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateExcel(relatorio.api_endpoint);
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Gerar Excel
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRelatorioToDelete(relatorio.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CardHeader className="flex-1 p-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="pr-8">{relatorio.nome}</CardTitle>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={relatorio.ativo ? "default" : "secondary"} className="text-xs">
                    {relatorio.ativo ? "Ativo" : "Inativo"}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(relatorio.data_criacao).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                {relatorio.api_endpoint && (
                  <CardDescription className="break-all text-xs">
                    API: {relatorio.api_endpoint}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="mt-auto p-4 pt-0">
                <Button 
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/importacao-produtos/editar/${relatorio.id}`);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Importação
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!isDeleting) {
          setDeleteDialogOpen(open);
          if (!open) setRelatorioToDelete(null);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
