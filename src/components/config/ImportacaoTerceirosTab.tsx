import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  ArrowLeft, ArrowRight, CheckCircle2, Plus, Pencil, Trash2, FileSpreadsheet,
  Calendar, Globe, MoreVertical, Edit, CheckCircle, XCircle, FileText, Type
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ImportWizardStep0 } from "@/components/importacao/ImportWizardStep0";
import { ImportWizardStep1 } from "@/components/importacao/ImportWizardStep1";
import { ImportWizardStep2 } from "@/components/importacao/ImportWizardStep2";
import { ImportWizardStep3 } from "@/components/importacao/ImportWizardStep3";
import { ImportWizardStep4 } from "@/components/importacao/ImportWizardStep4";
import { ImportWizardStep5 } from "@/components/importacao/ImportWizardStep5";
import { ImportWizardStep6 } from "@/components/importacao/ImportWizardStep6";
import { supabase } from "@/integrations/supabase/client";
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
  data_validade: string | null;
}

interface ImportacaoTerceirosTabProps {
  estabelecimentoId: string;
}

export function ImportacaoTerceirosTab({ estabelecimentoId }: ImportacaoTerceirosTabProps) {
  const [view, setView] = useState<'list' | 'wizard'>('list');
  const [relatorios, setRelatorios] = useState<Relatorio[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [relatorioToDelete, setRelatorioToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [relatorioToRename, setRelatorioToRename] = useState<Relatorio | null>(null);
  const [newName, setNewName] = useState("");

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

  // Check and deactivate expired reports
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

  const handleCopyApiUrl = (apiEndpoint: string | null) => {
    if (!apiEndpoint) {
      toast.error("API ainda não foi gerada");
      return;
    }

    navigator.clipboard.writeText(apiEndpoint);
    toast.success("URL da API copiada!");
  };

  const handleRename = async () => {
    if (!relatorioToRename || !newName.trim()) return;

    try {
      const { error } = await supabase
        .from("relatorios_importacao")
        .update({ nome: newName.trim() })
        .eq("id", relatorioToRename.id);

      if (error) throw error;

      toast.success("Relatório renomeado com sucesso!");
      setRenameDialogOpen(false);
      setRelatorioToRename(null);
      setNewName("");
      loadRelatorios();
    } catch (error: any) {
      console.error("Erro ao renomear relatório:", error);
      toast.error("Erro ao renomear relatório");
    }
  };

  const handleDuplicate = async (relatorioId: string) => {
    try {
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

  const handleGenerateExcel = async (apiEndpoint: string, relatorioId: string) => {
    try {
      toast.info("Gerando Excel...");
      
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

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${relatorioId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        toast.error("API retornou dados vazios");
        return;
      }

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

      if (columnNames.length === 0) {
        const firstRecord = records[0];
        if (firstRecord) {
          columnNames.push(...Object.keys(firstRecord));
        }
      }

      const filteredRecords = records.map(record => {
        const filtered: any = {};
        columnNames.forEach((col: string) => {
          if (col in record) {
            const value = record[col];
            if (value !== null && typeof value === 'object') {
              filtered[col] = JSON.stringify(value);
            } else {
              filtered[col] = value;
            }
          }
        });
        return filtered;
      });

      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(filteredRecords);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos Importados");
      XLSX.writeFile(workbook, `produtos-importados-${new Date().toISOString().split('T')[0]}.xlsx`);
      
      toast.success(`Excel gerado com ${filteredRecords.length} registro(s)!`);
    } catch (error: any) {
      console.error("Erro ao gerar Excel:", error);
      toast.error("Erro ao gerar Excel: " + (error.message || "desconhecido"));
    }
  };

  const handleGeneratePDF = async (apiEndpoint: string, relatorioId: string) => {
    try {
      toast.info("Gerando PDF...");
      
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

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-produtos-importados?estabelecimento_id=${estabelecimentoId}&relatorio_id=${relatorioId}`;
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        throw new Error(`Erro ao buscar dados: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data) {
        toast.error("API retornou dados vazios");
        return;
      }

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

      // Gerar PDF usando jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
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

      if (columnNames.length === 0) {
        const firstRecord = records[0];
        if (firstRecord) {
          columnNames.push(...Object.keys(firstRecord));
        }
      }

      // Configurar PDF
      doc.setFontSize(16);
      doc.text("Produtos Importados", 14, 20);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 28);
      
      let yPosition = 40;
      const lineHeight = 7;
      const pageHeight = 280;
      const margin = 14;
      
      // Cabeçalho da tabela
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      let xPosition = margin;
      const colWidth = Math.min(40, (190 - margin) / Math.min(columnNames.length, 5));
      
      columnNames.slice(0, 5).forEach((col) => {
        doc.text(col.substring(0, 15), xPosition, yPosition);
        xPosition += colWidth;
      });
      
      yPosition += lineHeight;
      doc.setFont(undefined, 'normal');
      
      // Dados
      records.forEach((record: any) => {
        if (yPosition > pageHeight) {
          doc.addPage();
          yPosition = 20;
        }
        
        xPosition = margin;
        columnNames.slice(0, 5).forEach((col) => {
          let value = record[col];
          if (value !== null && typeof value === 'object') {
            value = JSON.stringify(value);
          }
          const text = String(value || '').substring(0, 20);
          doc.text(text, xPosition, yPosition);
          xPosition += colWidth;
        });
        
        yPosition += lineHeight;
      });
      
      doc.save(`produtos-importados-${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success(`PDF gerado com ${records.length} registro(s)!`);
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF: " + (error.message || "desconhecido"));
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
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando...
        </div>
      ) : relatorios.length === 0 ? (
        <div className="text-center py-12">
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum relatório encontrado</h3>
          <p className="text-muted-foreground mb-4">
            Crie seu primeiro relatório de importação para começar
          </p>
          <Button onClick={handleNewReport}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Relatório
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Card de Criação */}
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 border-dashed border-primary/30 h-full flex flex-col"
            onClick={handleNewReport}
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
                      loadRelatorio(relatorio.id);
                    }}>
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                      e.stopPropagation();
                      setRelatorioToRename(relatorio);
                      setNewName(relatorio.nome);
                      setRenameDialogOpen(true);
                    }}>
                      <Type className="h-4 w-4 mr-2" />
                      Renomear
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
                          handleGenerateExcel(relatorio.api_endpoint!, relatorio.id);
                        }}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          Gerar Excel
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation();
                          handleGeneratePDF(relatorio.api_endpoint!, relatorio.id);
                        }}>
                          <FileText className="h-4 w-4 mr-2" />
                          Gerar PDF
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
                <div className="flex items-center gap-2 flex-wrap mb-2">
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
                      loadRelatorio(relatorio.id);
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

      <Dialog open={renameDialogOpen} onOpenChange={(open) => {
        setRenameDialogOpen(open);
        if (!open) {
          setRelatorioToRename(null);
          setNewName("");
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear Relatório</DialogTitle>
            <DialogDescription>
              Digite o novo nome para o relatório.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome do relatório"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Renomear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
