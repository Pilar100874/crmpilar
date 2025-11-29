import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FileSpreadsheet, Calendar, Globe, Trash2, Edit, MoreVertical, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
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
  data_validade: string | null;
}

export default function ImportacaoProdutosLista() {
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatorioToDelete, setRelatorioToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadRelatorios();
  }, []);

  const loadRelatorios = async () => {
    try {
      const estabelecimentoId = await getEstabelecimentoId();
      console.log("🏢 Estabelecimento ID (ImportacaoProdutos):", estabelecimentoId);
      
      let query = supabase
        .from("relatorios_importacao")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (estabelecimentoId) {
        query = query.eq("estabelecimento_id", estabelecimentoId);
      }

      const { data, error } = await query;

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
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      toast.error("Erro ao excluir relatório");
    } finally {
      // Sempre resetar os estados e fechar o dialog, mesmo em caso de erro
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setRelatorioToDelete(null);
    }
  };

  const handleToggleAtivo = async (id: string, currentAtivo: boolean) => {
    try {
      const { error } = await supabase
        .from("relatorios_importacao")
        .update({ ativo: !currentAtivo })
        .eq("id", id);

      if (error) throw error;

      toast.success(`Relatório ${!currentAtivo ? 'ativado' : 'desativado'} com sucesso!`);
      loadRelatorios();
    } catch (error: any) {
      console.error("Erro ao atualizar status:", error);
      toast.error("Erro ao atualizar status do relatório");
    }
  };

  const handleUpdateValidade = async (id: string, dataValidade: Date | null) => {
    try {
      const dataFormatada = dataValidade ? format(dataValidade, 'yyyy-MM-dd') : null;
      
      const { error } = await supabase
        .from("relatorios_importacao")
        .update({ data_validade: dataFormatada })
        .eq("id", id);

      if (error) throw error;

      toast.success("Data de validade atualizada com sucesso!");
      setDatePopoverOpen(null);
      loadRelatorios();
    } catch (error: any) {
      console.error("Erro ao atualizar data de validade:", error);
      toast.error("Erro ao atualizar data de validade");
    }
  };

  // Verificar e desativar relatórios vencidos
  useEffect(() => {
    const checkExpiredReports = async () => {
      const hoje = new Date().toISOString().split('T')[0];
      
      const relatoriosVencidos = relatorios.filter(r => 
        r.ativo && 
        r.data_validade && 
        r.data_validade < hoje
      );

      for (const relatorio of relatoriosVencidos) {
        await handleToggleAtivo(relatorio.id, true);
      }
    };

    if (relatorios.length > 0) {
      checkExpiredReports();
    }
  }, [relatorios]);

  const handleCopyApiUrl = (apiEndpoint: string | null) => {
    if (!apiEndpoint) {
      toast.error("API ainda não foi gerada");
      return;
    }

    navigator.clipboard.writeText(apiEndpoint);
    toast.success("URL da API copiada!");
  };

  const handleGeneratePdf = async (apiEndpoint: string, relatorioId: string) => {
    try {
      toast.info("Gerando PDF...");
      
      // Buscar modelo para produtos importados
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const { data: modelo } = await supabase
        .from("relatorios")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();

      if (!modelo) {
        toast.error("Modelo para produtos importados não encontrado. Crie o modelo primeiro.");
        return;
      }

      // Extrair parâmetros da URL da API
      const urlParams = new URL(apiEndpoint).searchParams;
      const apiEstabelecimentoId = urlParams.get('estabelecimento_id');
      const apiRelatorioId = urlParams.get('relatorio_id');

      console.log("📋 Gerando PDF com parâmetros:", {
        estabelecimentoId: apiEstabelecimentoId,
        relatorioId: apiRelatorioId
      });

      // Gerar PDF usando a edge function com os parâmetros corretos
      const { data: resultData, error: fnError } = await supabase.functions.invoke('gerar-relatorio-pdf', {
        body: { 
          relatorioId: modelo.id,
          apiVariables: {
            estabelecimento_id: { value: apiEstabelecimentoId, type: "string" },
            relatorio_id: { value: apiRelatorioId, type: "string" }
          },
          reportVariables: {},
          outputType: 'pdf'
        }
      });

      console.log("🔎 Resposta da função gerar-relatorio-pdf:", resultData, fnError);

      if (fnError) {
        console.error("❌ Erro ao gerar PDF:", fnError);
        throw new Error(fnError.message || 'Falha ao gerar PDF');
      }

      // Verificar se foi gerado com sucesso e fazer download
      if (resultData?.pdfUrl || resultData?.fileUrl) {
        const pdfUrl = resultData.pdfUrl || resultData.fileUrl;
        console.log("✅ PDF gerado com sucesso:", pdfUrl);
        
        // Fazer download via fetch para garantir que funcione com CORS
        const response = await fetch(pdfUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `produtos-importados-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Limpar o blob URL após o download
        window.URL.revokeObjectURL(blobUrl);
        
        toast.success("PDF gerado e baixado com sucesso!");
      } else {
        console.error("❌ Resposta sem URL de arquivo:", resultData);
        throw new Error(resultData?.error || 'Falha ao gerar PDF - URL não retornada');
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF: " + (error.message || "desconhecido"));
    }
  };

  const handleGenerateExcel = async (apiEndpoint: string, relatorioId: string) => {
    try {
      toast.info("Gerando Excel...");
      
      const estabelecimentoId = await getEstabelecimentoId();
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      // Buscar modelo para produtos importados
      const { data: modelo } = await supabase
        .from("relatorios")
        .select("id, layout_json")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("nome", "Modelo para Produtos Importados")
        .maybeSingle();

      if (!modelo) {
        toast.error("Modelo para produtos importados não encontrado. Crie o modelo primeiro.");
        return;
      }

      // Construir a URL da API corretamente usando apenas o domínio do Supabase
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${relatorioId}`;
      console.log("📡 Chamando API:", apiUrl);

      // Buscar dados da API
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        toast.error("API retornou dados vazios");
        return;
      }

      // Tratar diferentes formatos de resposta
      let records = [];
      if (Array.isArray(data)) {
        records = data;
      } else if (data.data && Array.isArray(data.data)) {
        records = data.data;
      } else if (typeof data === 'object') {
        records = [data];
      }
      
      if (records.length === 0) {
        toast.error("Nenhum dado encontrado na API");
        return;
      }

      // Extrair colunas do relatório a partir do parâmetro api_data do ReportBro
      const layoutJsonObj = typeof modelo.layout_json === 'string' 
        ? JSON.parse(modelo.layout_json)
        : modelo.layout_json;

      const parameters = layoutJsonObj?.parameters || [];
      const apiParam = parameters.find((p: any) => p.name === 'api_data');
      const columnNames: string[] = [];

      if (apiParam && Array.isArray(apiParam.children)) {
        apiParam.children.forEach((child: any) => {
          if (child.name) {
            columnNames.push(child.name);
          }
        });
      }

      console.log("📋 Colunas extraídas do parâmetro api_data:", columnNames);

      // Se não encontrou colunas no layout, usar todas as colunas dos dados
      if (columnNames.length === 0) {
        console.warn("⚠️ Nenhuma coluna definida no relatório, usando todas as colunas dos dados");
        const firstRecord = records[0];
        if (firstRecord) {
          columnNames.push(...Object.keys(firstRecord));
        }
      }

      // Filtrar apenas as colunas do relatório
      const filteredRecords = records.map(record => {
        const filtered: any = {};
        columnNames.forEach((col: string) => {
          if (col in record) {
            const value = record[col];
            // Se o valor é um objeto, converter para string JSON
            if (value !== null && typeof value === 'object') {
              filtered[col] = JSON.stringify(value);
            } else {
              filtered[col] = value;
            }
          }
        });
        return filtered;
      });

      // Importar biblioteca XLSX dinamicamente
      const XLSX = await import('xlsx');
      
      // Criar worksheet a partir dos dados filtrados
      const worksheet = XLSX.utils.json_to_sheet(filteredRecords);
      
      // Criar workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos Importados");
      
      // Gerar arquivo Excel e fazer download
      XLSX.writeFile(workbook, `produtos-importados-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success(`Excel gerado com ${filteredRecords.length} registro(s)!`);
    } catch (error: any) {
      console.error("Erro ao gerar Excel:", error);
      toast.error("Erro ao gerar Excel: " + (error.message || "desconhecido"));
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
          {/* Card de Criação - Excel */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
            onClick={() => navigate("/importacao-produtos/novo")}
          >
            <CardHeader className="flex-1 p-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6 text-primary" />
              </div>
              <CardTitle className="text-base">Importação via Excel</CardTitle>
              <CardDescription>
                Importe produtos a partir de arquivos Excel (.xlsx, .xls)
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-4 pt-0">
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Nova Importação Excel
              </Button>
            </CardContent>
          </Card>

          {/* Card de Criação - API */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-green-500/30 h-full flex flex-col"
            onClick={() => navigate("/importacao-produtos/api/novo")}
          >
            <CardHeader className="flex-1 p-4">
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-green-600" />
              </div>
              <CardTitle className="text-base">Importação via API</CardTitle>
              <CardDescription>
                Importe produtos de APIs externas para o cadastro de produtos
              </CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-4 pt-0">
              <Button className="w-full" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Nova Importação API
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
                      handleToggleAtivo(relatorio.id, relatorio.ativo);
                    }}>
                      {relatorio.ativo ? (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Ativar
                        </>
                      )}
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
                          handleGeneratePdf(relatorio.api_endpoint, relatorio.id);
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Gerar PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateExcel(relatorio.api_endpoint, relatorio.id);
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
                  {relatorio.data_validade && (
                    <Badge variant={new Date(relatorio.data_validade) < new Date() ? "destructive" : "outline"} className="text-xs">
                      Validade: {new Date(relatorio.data_validade).toLocaleDateString('pt-BR')}
                    </Badge>
                  )}
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
              <CardContent className="mt-auto p-4 pt-0 space-y-2">
                <div className="flex gap-2">
                  <Button 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/importacao-produtos/editar/${relatorio.id}`);
                    }}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  
                  <Popover 
                    open={datePopoverOpen === relatorio.id} 
                    onOpenChange={(open) => setDatePopoverOpen(open ? relatorio.id : null)}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        onClick={(e) => e.stopPropagation()}
                        className={cn(
                          "flex-1",
                          relatorio.data_validade && new Date(relatorio.data_validade) < new Date() && "border-destructive"
                        )}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        {relatorio.data_validade 
                          ? format(new Date(relatorio.data_validade), "dd/MM/yy", { locale: ptBR })
                          : "Validade"
                        }
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end" onClick={(e) => e.stopPropagation()}>
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-medium">Definir data de validade</p>
                        <CalendarComponent
                          mode="single"
                          selected={relatorio.data_validade ? new Date(relatorio.data_validade) : undefined}
                          onSelect={(date) => handleUpdateValidade(relatorio.id, date || null)}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        />
                        {relatorio.data_validade && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUpdateValidade(relatorio.id, null);
                            }}
                          >
                            Remover Validade
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
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
