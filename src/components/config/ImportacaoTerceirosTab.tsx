import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Pencil, Trash2, FileSpreadsheet } from "lucide-react";
import { ImportWizardStep0 } from "@/components/importacao/ImportWizardStep0";
import { ImportWizardStep1 } from "@/components/importacao/ImportWizardStep1";
import { ImportWizardStep2 } from "@/components/importacao/ImportWizardStep2";
import { ImportWizardStep3 } from "@/components/importacao/ImportWizardStep3";
import { ImportWizardStep4 } from "@/components/importacao/ImportWizardStep4";
import { ImportWizardStep5 } from "@/components/importacao/ImportWizardStep5";
import { ImportWizardStep6 } from "@/components/importacao/ImportWizardStep6";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  created_at: string;
}

interface ImportacaoTerceirosTabProps {
  estabelecimentoId: string;
}

export function ImportacaoTerceirosTab({ estabelecimentoId }: ImportacaoTerceirosTabProps) {
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, FieldMappingConfig>>({});
  const [finalData, setFinalData] = useState<any[]>([]);
  const [apiEndpoint, setApiEndpoint] = useState<string>("");
  const [relatorioId, setRelatorioId] = useState<string | null>(null);

  const totalSteps = 7;
  const progress = ((currentStep + 1) / totalSteps) * 100;

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

  const loadRelatorio = async (id: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setReportName(data.nome);
        setReportDate(data.data_criacao);
        setApiEndpoint(data.api_endpoint || "");
        setRelatorioId(data.id);
        
        const config = data.configuracao as any;
        if (config) {
          setExcelData(config.excelData || []);
          setExcelHeaders(config.excelHeaders || []);
          setSelectedFields(config.selectedFields || []);
          setFilters(config.filters || []);
          setFieldMapping(config.fieldMapping || {});
          setFinalData(config.finalData || []);
        }
        
        setView('wizard');
        setEditingId(id);
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("relatorios_importacao")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Relatório excluído com sucesso!");
      loadRelatorios();
    } catch (error) {
      console.error("Erro ao excluir relatório:", error);
      toast.error("Erro ao excluir relatório");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setReportName("");
    setReportDate(new Date().toISOString().split('T')[0]);
    setExcelData([]);
    setExcelHeaders([]);
    setSelectedFields([]);
    setFilters([]);
    setFieldMapping({});
    setFinalData([]);
    setApiEndpoint("");
    setRelatorioId(null);
    setEditingId(null);
  };

  const handleNewReport = () => {
    resetWizard();
    setView('wizard');
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      
      const configuracao = {
        excelData,
        excelHeaders,
        selectedFields,
        filters,
        fieldMapping,
        finalData
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
      setView('list');
      loadRelatorios();
    } catch (error: any) {
      console.error("Erro ao salvar relatório:", error);
      toast.error(`Erro ao salvar relatório: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    resetWizard();
    setView('list');
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return reportName.trim() !== "" && reportDate !== "";
      case 1:
        return excelData.length > 0;
      case 2:
        return selectedFields.length > 0;
      case 3:
        return true;
      case 4:
        return Object.keys(fieldMapping).length > 0;
      case 5:
        return finalData.length > 0;
      case 6:
        return apiEndpoint !== "";
      default:
        return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 5 && !relatorioId) {
      try {
        setLoading(true);
        
        const configuracao = {
          excelData,
          excelHeaders,
          selectedFields,
          filters,
          fieldMapping,
          finalData
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
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ImportWizardStep0
            reportName={reportName}
            reportDate={reportDate}
            onReportNameChange={setReportName}
            onReportDateChange={setReportDate}
          />
        );
      case 1:
        return (
          <ImportWizardStep1
            onFileUpload={(data, headers) => {
              setExcelData(data);
              setExcelHeaders(headers);
            }}
            excelData={excelData}
            excelHeaders={excelHeaders}
          />
        );
      case 2:
        return (
          <ImportWizardStep2
            headers={excelHeaders}
            selectedFields={selectedFields}
            onSelectFields={setSelectedFields}
            data={excelData}
          />
        );
      case 3:
        return (
          <ImportWizardStep3
            data={excelData}
            selectedFields={selectedFields}
            filters={filters}
            onFiltersChange={setFilters}
          />
        );
      case 4:
        return (
          <ImportWizardStep4
            selectedFields={selectedFields}
            fieldMapping={fieldMapping}
            onMappingChange={setFieldMapping}
          />
        );
      case 5:
        return (
          <ImportWizardStep5
            data={excelData}
            selectedFields={selectedFields}
            filters={filters}
            fieldMapping={fieldMapping}
            onFinalDataChange={setFinalData}
          />
        );
      case 6:
        return (
          <ImportWizardStep6
            finalData={finalData}
            onApiCreated={setApiEndpoint}
            apiEndpoint={apiEndpoint}
            relatorioId={relatorioId}
          />
        );
      default:
        return null;
    }
  };

  if (view === 'wizard') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-muted-foreground">
              Etapa {currentStep + 1} de {totalSteps} - {Math.round(progress)}% concluído
            </span>
          </div>
        </div>
        
        <Progress value={progress} className="h-2" />
        
        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              variant="ghost"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
          </div>

          {currentStep < totalSteps - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed() || loading}
            >
              Próxima
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canProceed() || loading}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {loading ? "Salvando..." : "Concluir"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleNewReport}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Carregando...
        </div>
      ) : relatorios.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Nenhum relatório de importação encontrado
          </p>
          <Button onClick={handleNewReport}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Relatório
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>API Endpoint</TableHead>
              <TableHead className="w-[100px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relatorios.map((relatorio) => (
              <TableRow key={relatorio.id}>
                <TableCell className="font-medium">{relatorio.nome}</TableCell>
                <TableCell>{new Date(relatorio.data_criacao).toLocaleDateString('pt-BR')}</TableCell>
                <TableCell className="max-w-[200px] truncate">
                  {relatorio.api_endpoint || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => loadRelatorio(relatorio.id)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir Relatório</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o relatório "{relatorio.nome}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(relatorio.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
