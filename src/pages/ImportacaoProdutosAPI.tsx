import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2, Globe } from "lucide-react";
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

export interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

export default function ImportacaoProdutosAPI() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  
  // API Data
  const [selectedApiId, setSelectedApiId] = useState("");
  const [customUrl, setCustomUrl] = useState("");
  const [apiData, setApiData] = useState<any[]>([]);
  const [apiHeaders, setApiHeaders] = useState<string[]>([]);
  
  // Fields and Mapping
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState("");
  const [fieldMapping, setFieldMapping] = useState<Record<string, FieldMappingConfig>>({});
  const [finalData, setFinalData] = useState<any[]>([]);
  
  // Output
  const [apiEndpoint, setApiEndpoint] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [relatorioId, setRelatorioId] = useState<string | null>(id || null);

  const totalSteps = 8;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const stepLabels = [
    "Configuração",
    "Selecionar API",
    "Campos da API",
    "Filtros",
    "Grupo de Produtos",
    "Mapeamento",
    "Prévia",
    "Importar"
  ];

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

        if (error) {
          console.error("Erro ao atualizar:", error);
          throw error;
        }
        toast.success("Relatório salvo com sucesso!");
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
        return apiData.length > 0;
      case 2:
        return selectedFields.length > 0;
      case 3:
        return true; // Filtros são opcionais
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
    // Se está indo para a etapa 7 e ainda não tem relatório criado, criar agora
    if (currentStep === 6 && !relatorioId) {
      try {
        setLoading(true);
        const estabelecimentoId = await getEstabelecimentoId();
        
        if (!estabelecimentoId) {
          toast.error("Estabelecimento não encontrado");
          return;
        }

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

        if (error) {
          console.error("Erro ao criar relatório:", error);
          throw error;
        }
        
        if (data) {
          setRelatorioId(data.id);
          console.log("✅ Relatório criado com ID:", data.id);
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
    // Limpar seleções anteriores quando novos dados são carregados
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
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Globe className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Importação de Produtos via API</h1>
            <p className="text-muted-foreground mt-1">
              Importe produtos a partir de uma API externa e mapeie para o cadastro de produtos
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Etapa {currentStep + 1} de {totalSteps}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{stepLabels[currentStep]}</p>
            </div>
            <span className="text-sm text-muted-foreground">{Math.round(progress)}% concluído</span>
          </div>
          <Progress value={progress} className="mt-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4 overflow-x-auto">
            {stepLabels.map((label, index) => (
              <div
                key={index}
                className={`flex flex-col items-center min-w-[80px] ${
                  index === currentStep
                    ? "text-primary"
                    : index < currentStep
                    ? "text-green-600"
                    : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index === currentStep
                      ? "bg-primary text-primary-foreground"
                      : index < currentStep
                      ? "bg-green-600 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {index < currentStep ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                </div>
                <span className="text-xs mt-1 text-center hidden sm:block">{label}</span>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
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
                onClick={() => navigate("/importacao-produtos")}
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
        </CardContent>
      </Card>
    </div>
  );
}
