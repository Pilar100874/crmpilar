import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe, Plus, Trash2, Edit, MoreVertical, RefreshCw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ApiImportWizardStep0 } from "@/components/importacao-api/ApiImportWizardStep0";
import { ApiImportWizardStep1 } from "@/components/importacao-api/ApiImportWizardStep1";
import { ApiImportWizardStep2 } from "@/components/importacao-api/ApiImportWizardStep2";
import { ApiImportWizardStep3 } from "@/components/importacao-api/ApiImportWizardStep3";
import { ApiImportWizardStep4 } from "@/components/importacao-api/ApiImportWizardStep4";
import { ApiImportWizardStep5 } from "@/components/importacao-api/ApiImportWizardStep5";
import { ApiImportWizardStep6 } from "@/components/importacao-api/ApiImportWizardStep6";
import { ApiImportWizardStep7 } from "@/components/importacao-api/ApiImportWizardStep7";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

interface Relatorio {
  id: string;
  nome: string;
  data_criacao: string;
  api_endpoint: string | null;
  ativo: boolean;
  created_at: string;
  configuracao: any;
}

interface ImportacaoApiTabProps {
  estabelecimentoId: string;
}

export function ImportacaoApiTab({ estabelecimentoId }: ImportacaoApiTabProps) {
  const [mode, setMode] = useState<"list" | "wizard">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatorioToDelete, setRelatorioToDelete] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<"full" | "stock_only">("full");
  
  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedApiId, setSelectedApiId] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [apiData, setApiData] = useState<any[]>([]);
  const [apiHeaders, setApiHeaders] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, FieldMappingConfig>>({});
  const [finalData, setFinalData] = useState<any[]>([]);
  const [apiEndpoint, setApiEndpoint] = useState<string>("");
  const [relatorioId, setRelatorioId] = useState<string | null>(null);

  const totalSteps = 8;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const stepLabels = [
    "Configuração",
    "Selecionar",
    "Campos",
    "Filtros",
    "Grupo de Produtos",
    "Mapeamento",
    "Prévia",
    "Importar"
  ];

  useEffect(() => {
    loadRelatorios();
  }, [estabelecimentoId]);

  const loadRelatorios = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .not("configuracao->tipo", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Filtrar apenas relatórios do tipo API
      const apiRelatorios = (data || []).filter(r => {
        const config = r.configuracao as any;
        return config?.tipo === "api";
      });
      
      setRelatorios(apiRelatorios);
    } catch (error) {
      console.error("Erro ao carregar relatórios:", error);
      toast.error("Erro ao carregar relatórios");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setReportName("");
    setReportDate(new Date().toISOString().split('T')[0]);
    setSelectedApiId("");
    setCustomUrl("");
    setApiData([]);
    setApiHeaders([]);
    setSelectedFields([]);
    setFilters([]);
    setSelectedGrupoId("");
    setFieldMapping({});
    setFinalData([]);
    setApiEndpoint("");
    setRelatorioId(null);
    setEditingId(null);
    setImportMode("full");
  };

  const handleNewImport = () => {
    resetWizard();
    setMode("wizard");
  };

  const handleEdit = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingId(id);
        setRelatorioId(id);
        setReportName(data.nome);
        setReportDate(data.data_criacao);
        setApiEndpoint(data.api_endpoint || "");
        
        const config = data.configuracao as any;
        if (config) {
          setSelectedApiId(config.selectedApiId || "");
          setCustomUrl(config.customUrl || "");
          setApiData(config.apiData || []);
          setApiHeaders(config.apiHeaders || []);
          setSelectedFields(config.selectedFields || []);
          setFilters(config.filters || []);
          setSelectedGrupoId(config.selectedGrupoId || "");
          setFieldMapping(config.fieldMapping || {});
          setFinalData(config.finalData || []);
        }
        
        setCurrentStep(0);
        setMode("wizard");
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setEditingId(id);
        setRelatorioId(id);
        setReportName(data.nome);
        setReportDate(data.data_criacao);
        setApiEndpoint(data.api_endpoint || "");
        setImportMode("stock_only");
        
        const config = data.configuracao as any;
        if (config) {
          setSelectedApiId(config.selectedApiId || "");
          setCustomUrl(config.customUrl || "");
          setApiHeaders(config.apiHeaders || []);
          setSelectedFields(config.selectedFields || []);
          setFilters(config.filters || []);
          setSelectedGrupoId(config.selectedGrupoId || "");
          setFieldMapping(config.fieldMapping || {});
          // Limpar dados para forçar re-fetch
          setApiData([]);
          setFinalData([]);
        }
        
        // Ir direto para step 1 (buscar dados) pois a config já existe
        setCurrentStep(1);
        setMode("wizard");
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
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
      await loadRelatorios();
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      toast.error("Erro ao excluir relatório");
    } finally {
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

  const handleFinish = async () => {
    try {
      setLoading(true);

      const configuracao = {
        selectedApiId,
        customUrl,
        apiData,
        apiHeaders,
        selectedFields,
        filters,
        selectedGrupoId,
        fieldMapping,
        finalData,
        tipo: "api"
      } as any;

      if (relatorioId) {
        const { error } = await supabase
          .from("relatorios_importacao")
          .update({
            nome: reportName,
            data_criacao: reportDate,
            api_endpoint: apiEndpoint || null,
            configuracao
          })
          .eq("id", relatorioId);

        if (error) throw error;
        toast.success("Relatório salvo com sucesso!");
      }

      resetWizard();
      setMode("list");
      loadRelatorios();
    } catch (error: any) {
      console.error("Erro ao salvar relatório:", error);
      toast.error(`Erro ao salvar relatório: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return reportName.trim() !== "" && reportDate !== "";
      case 1:
        return apiData.length > 0;
      case 2:
        return selectedFields.length > 0;
      case 3:
        return true;
      case 4:
        return selectedGrupoId !== "";
      case 5:
        return Object.keys(fieldMapping).filter(k => fieldMapping[k]?.value && fieldMapping[k]?.value !== "none").length > 0;
      case 6:
        return finalData.length > 0;
      case 7:
        return apiEndpoint !== "";
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 6 && !relatorioId) {
      try {
        setLoading(true);

        const configuracao = {
          selectedApiId,
          customUrl,
          apiData,
          apiHeaders,
          selectedFields,
          filters,
          selectedGrupoId,
          fieldMapping,
          finalData,
          tipo: "api"
        } as any;

        const { data, error } = await supabase
          .from("relatorios_importacao")
          .insert([{
            estabelecimento_id: estabelecimentoId,
            nome: reportName,
            data_criacao: reportDate,
            configuracao
          }])
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setRelatorioId(data.id);
        }
      } catch (error: any) {
        console.error("Erro ao criar relatório:", error);
        toast.error(`Erro ao criar relatório: ${error.message || "Erro desconhecido"}`);
        return;
      } finally {
        setLoading(false);
      }
    }
    
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleApiSelect = (apiId: string, url: string) => {
    setSelectedApiId(apiId);
    setCustomUrl(url);
  };

  const handleDataFetch = (data: any[], headers: string[]) => {
    setApiData(data);
    setApiHeaders(headers);
    setSelectedFields([]);
    setFilters([]);
    setFieldMapping({});
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ApiImportWizardStep0
            reportName={reportName}
            reportDate={reportDate}
            onReportNameChange={setReportName}
            onReportDateChange={setReportDate}
          />
        );
      case 1:
        return (
          <ApiImportWizardStep1
            selectedApiId={selectedApiId}
            customUrl={customUrl}
            onApiSelect={handleApiSelect}
            onDataFetch={handleDataFetch}
            apiData={apiData}
            apiHeaders={apiHeaders}
          />
        );
      case 2:
        return (
          <ApiImportWizardStep2
            headers={apiHeaders}
            selectedFields={selectedFields}
            onSelectFields={setSelectedFields}
            data={apiData}
          />
        );
      case 3:
        return (
          <ApiImportWizardStep3
            data={apiData}
            selectedFields={selectedFields}
            filters={filters}
            onFiltersChange={setFilters}
          />
        );
      case 4:
        return (
          <ApiImportWizardStep4
            selectedGrupoId={selectedGrupoId}
            onGrupoChange={setSelectedGrupoId}
            apiData={apiData}
            selectedFields={selectedFields}
          />
        );
      case 5:
        return (
          <ApiImportWizardStep5
            selectedFields={selectedFields}
            selectedGrupoId={selectedGrupoId}
            fieldMapping={fieldMapping}
            onMappingChange={setFieldMapping}
          />
        );
      case 6:
        return (
          <ApiImportWizardStep6
            data={apiData}
            selectedFields={selectedFields}
            filters={filters}
            fieldMapping={fieldMapping}
            onFinalDataChange={setFinalData}
          />
        );
      case 7:
        return (
          <ApiImportWizardStep7
            finalData={finalData}
            selectedGrupoId={selectedGrupoId}
            onApiCreated={setApiEndpoint}
            apiEndpoint={apiEndpoint}
            relatorioId={relatorioId}
            importMode={importMode}
          />
        );
      default:
        return null;
    }
  };

  if (mode === "wizard") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-semibold">
                {editingId ? "Editar Importação de Produtos" : "Nova Importação de Produtos"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Importe produtos a partir de uma API externa ou planilha Excel
              </p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3 px-3 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm sm:text-base">Etapa {currentStep + 1} de {totalSteps}</CardTitle>
                <p className="text-xs sm:text-sm text-muted-foreground">{stepLabels[currentStep]}</p>
              </div>
              <span className="text-xs sm:text-sm text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="mt-2" />
            
            {/* Step indicators - horizontal scroll on mobile */}
            <div className="flex justify-between mt-3 overflow-x-auto gap-1 pb-2 -mx-1 px-1">
              {stepLabels.map((label, index) => (
                <div
                  key={index}
                  className={`flex flex-col items-center min-w-[40px] sm:min-w-[60px] flex-shrink-0 ${
                    index === currentStep
                      ? "text-primary"
                      : index < currentStep
                      ? "text-green-600"
                      : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-medium ${
                      index === currentStep
                        ? "bg-primary text-primary-foreground"
                        : index < currentStep
                        ? "bg-green-600 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {index < currentStep ? <CheckCircle2 className="h-3 w-3" /> : index + 1}
                  </div>
                  <span className="text-[8px] sm:text-[10px] mt-1 text-center hidden sm:block">{label}</span>
                </div>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-4 px-3 sm:px-6">
            <div className="min-h-[300px] sm:min-h-[350px]">
              {renderStep()}
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3 pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Voltar
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    resetWizard();
                    setMode("list");
                  }}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Cancelar
                </Button>
              </div>

              {currentStep < totalSteps - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || loading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  Próxima
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinish}
                  disabled={!canProceed() || loading}
                  size="sm"
                  className="w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  {loading ? "Salvando..." : "Concluir"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p className="text-xs sm:text-sm text-muted-foreground">
          Configure importações de produtos a partir de APIs externas
        </p>
        <Button onClick={handleNewImport} size="sm" className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-1" />
          Nova Importação
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : relatorios.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <h3 className="font-semibold mb-1">Nenhuma importação de produtos</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie sua primeira importação de produtos
            </p>
            <Button onClick={handleNewImport}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Importação
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {relatorios.map((relatorio) => (
                  <TableRow key={relatorio.id}>
                    <TableCell className="font-medium">{relatorio.nome}</TableCell>
                    <TableCell>
                      {format(new Date(relatorio.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={relatorio.ativo ? "default" : "secondary"}>
                        {relatorio.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(relatorio.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStock(relatorio.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Atualizar Estoque
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleAtivo(relatorio.id, relatorio.ativo)}>
                            {relatorio.ativo ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setRelatorioToDelete(relatorio.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card List */}
          <div className="sm:hidden divide-y">
            {relatorios.map((relatorio) => (
              <div key={relatorio.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{relatorio.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(relatorio.data_criacao), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={relatorio.ativo ? "default" : "secondary"} className="text-xs">
                      {relatorio.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(relatorio.id)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleAtivo(relatorio.id, relatorio.ativo)}>
                          {relatorio.ativo ? "Desativar" : "Ativar"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
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
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este relatório de importação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
