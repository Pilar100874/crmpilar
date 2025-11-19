import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { ImportWizardStep1 } from "@/components/importacao/ImportWizardStep1";
import { ImportWizardStep2 } from "@/components/importacao/ImportWizardStep2";
import { ImportWizardStep3 } from "@/components/importacao/ImportWizardStep3";
import { ImportWizardStep4 } from "@/components/importacao/ImportWizardStep4";
import { ImportWizardStep5 } from "@/components/importacao/ImportWizardStep5";
import { ImportWizardStep6 } from "@/components/importacao/ImportWizardStep6";

export interface FieldMappingConfig {
  type: "field" | "fixed";
  value: string;
  format?: string;
}

export default function ImportacaoProdutos() {
  const [currentStep, setCurrentStep] = useState(1);
  const [excelData, setExcelData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [filters, setFilters] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<Record<string, FieldMappingConfig>>({});
  const [finalData, setFinalData] = useState<any[]>([]);
  const [apiEndpoint, setApiEndpoint] = useState<string>("");

  const totalSteps = 6;
  const progress = (currentStep / totalSteps) * 100;

  const canProceed = () => {
    switch (currentStep) {
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
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
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
            <CardTitle>Etapa {currentStep} de {totalSteps}</CardTitle>
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
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>

            {currentStep < totalSteps ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
              >
                Próxima
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  // Finalizar processo
                  console.log("Processo concluído!");
                }}
                disabled={!canProceed()}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Concluir
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
