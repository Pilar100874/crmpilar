import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ImportWizardStep0 } from "@/components/importacao/ImportWizardStep0";
import { ImportWizardStep1 } from "@/components/importacao/ImportWizardStep1";
import { ImportWizardStep2 } from "@/components/importacao/ImportWizardStep2";
import { ImportWizardStep3 } from "@/components/importacao/ImportWizardStep3";
import { ImportWizardStep4 } from "@/components/importacao/ImportWizardStep4";
import { ImportWizardStep5 } from "@/components/importacao/ImportWizardStep5";
import { ImportWizardStep6 } from "@/components/importacao/ImportWizardStep6";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

export interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

export default function ImportacaoProdutos() {
  const { id } = useParams();
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(false);
  const [relatorioId, setRelatorioId] = useState<string | null>(id || null);

  const totalSteps = 7;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  useEffect(() => {
    if (id) {
      loadRelatorio(id);
    }
  }, [id]);

  const loadRelatorio = async (relatorioId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("relatorios_importacao")
        .select("*")
        .eq("id", relatorioId)
        .single();

      if (error) throw error;

      if (data) {
        setReportName(data.nome);
        setReportDate(data.data_criacao);
        setApiEndpoint(data.api_endpoint || "");
        
        const config = data.configuracao as any;
        if (config) {
          setExcelData(config.excelData || []);
          setExcelHeaders(config.excelHeaders || []);
          setSelectedFields(config.selectedFields || []);
          setFilters(config.filters || []);
          setFieldMapping(config.fieldMapping || {});
          setFinalData(config.finalData || []);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar relatório:", error);
      toast.error("Erro ao carregar relatório");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    try {
      setLoading(true);
      const estabelecimentoId = await getEstabelecimentoId();
      
      if (!estabelecimentoId) {
        toast.error("Estabelecimento não encontrado");
        return;
      }

      const configuracao = {
        excelData,
        excelHeaders,
        selectedFields,
        filters,
        fieldMapping,
        finalData
      } as any;

      if (relatorioId) {
        // Atualizar relatório existente
        const { error } = await supabase
          .from("relatorios_importacao")
          .update({
            nome: reportName,
            data_criacao: reportDate,
            api_endpoint: apiEndpoint || null,
            configuracao
          })
          .eq("id", relatorioId);

        if (error) {
          console.error("Erro ao atualizar:", error);
          throw error;
        }
        toast.success("Relatório atualizado com sucesso!");
      } else {
        // Criar novo relatório
        const { data, error } = await supabase
          .from("relatorios_importacao")
          .insert([{
            estabelecimento_id: estabelecimentoId,
            nome: reportName,
            data_criacao: reportDate,
            api_endpoint: apiEndpoint || null,
            configuracao
          }])
          .select()
          .single();

        if (error) {
          console.error("Erro ao inserir:", error);
          throw error;
        }
        if (data) {
          setRelatorioId(data.id);
        }
        toast.success("Relatório criado com sucesso!");
      }

      navigate("/importacao-produtos");
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
        return excelData.length > 0;
      case 2:
        return selectedFields.length > 0;
      case 3:
        return true; // Filtros são opcionais
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

  const handleNext = () => {
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Importação de Produtos de Terceiro</h1>
          <p className="text-muted-foreground mt-1">
            Importe produtos de arquivos Excel e crie uma API para uso em relatórios
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Etapa {currentStep + 1} de {totalSteps}</CardTitle>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="min-h-[400px]">
            {renderStep()}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

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
        </CardContent>
      </Card>
    </div>
  );
}
