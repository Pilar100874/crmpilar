import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { VinculosWizardStep1 } from "@/components/vinculos/VinculosWizardStep1";
import { VinculosWizardStep2 } from "@/components/vinculos/VinculosWizardStep2";
import { VinculosWizardStep3 } from "@/components/vinculos/VinculosWizardStep3";
import { VinculosWizardStep4 } from "@/components/vinculos/VinculosWizardStep4";

interface Empresa {
  id: string;
  nome_fantasia: string;
  nome: string;
  cnpj: string;
  email: string;
  telefone: string;
  endereco: string;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

interface Segmento {
  id: string;
  nome: string;
}

interface EmpresaComVinculo extends Empresa {
  usuarios_vinculados: Array<{ id: string; nome: string }>;
  segmentos_vinculados: Array<{ id: string; nome: string }>;
}

export default function VinculosEmpresas() {
  const [currentStep, setCurrentStep] = useState(1);
  const [empresas, setEmpresas] = useState<EmpresaComVinculo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  // Step 1 - Seleção de empresas
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);

  // Step 2 - Definição de alterações
  const [alterarUsuario, setAlterarUsuario] = useState(false);
  const [alterarSegmento, setAlterarSegmento] = useState(false);
  const [novosUsuariosIds, setNovosUsuariosIds] = useState<string[]>([]);
  const [novosSegmentosIds, setNovosSegmentosIds] = useState<string[]>([]);

  // Step 4 - Processamento
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const init = async () => {
      const estabId = await getEstabelecimentoId();
      setEstabelecimentoId(estabId);
    };
    init();
  }, []);

  useEffect(() => {
    if (estabelecimentoId) {
      loadData();
    }
  }, [estabelecimentoId]);

  const loadData = async () => {
    try {
      const { data: empresasData, error: empresasError } = await supabase
        .from("empresas")
        .select("id, nome_fantasia, nome, cnpj, email, telefone, endereco")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome_fantasia");

      if (empresasError) throw empresasError;

      const { data: vinculosData, error: vinculosError } = await supabase
        .from("empresa_vinculos")
        .select("id, empresa_id, usuario_id, segmento_id")
        .eq("estabelecimento_id", estabelecimentoId);

      if (vinculosError) throw vinculosError;

      const { data: usuariosDataCompleta } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId);

      const { data: segmentosDataCompleta } = await supabase
        .from("segmentos")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId);

      const empresasComVinculos: EmpresaComVinculo[] = (empresasData || []).map((empresa) => {
        const vinculosEmpresa = vinculosData?.filter((v) => v.empresa_id === empresa.id) || [];
        
        const usuariosVinculados = vinculosEmpresa
          .filter(v => v.usuario_id)
          .map(v => {
            const user = usuariosDataCompleta?.find(u => u.id === v.usuario_id);
            return user ? { id: user.id, nome: user.nome } : null;
          })
          .filter(Boolean) as Array<{ id: string; nome: string }>;

        const segmentosVinculados = vinculosEmpresa
          .filter(v => v.segmento_id)
          .map(v => {
            const seg = segmentosDataCompleta?.find(s => s.id === v.segmento_id);
            return seg ? { id: seg.id, nome: seg.nome } : null;
          })
          .filter(Boolean) as Array<{ id: string; nome: string }>;

        return {
          ...empresa,
          usuarios_vinculados: usuariosVinculados,
          segmentos_vinculados: segmentosVinculados,
        };
      });

      setEmpresas(empresasComVinculos);
      setUsuarios(usuariosDataCompleta || []);
      setSegmentos(segmentosDataCompleta || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados", {
        description: error.message,
      });
    }
  };

  const canGoNext = () => {
    if (currentStep === 1) return selectedEmpresas.length > 0;
    if (currentStep === 2) return alterarUsuario || alterarSegmento;
    if (currentStep === 3) return true;
    return false;
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleProcess = async () => {
    setIsProcessing(true);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);

    const empresasParaProcessar = empresas.filter((e) => selectedEmpresas.includes(e.id));
    const errosTemp: string[] = [];

    for (let i = 0; i < empresasParaProcessar.length; i++) {
      const empresa = empresasParaProcessar[i];
      
      try {
        // Remover vínculos existentes da empresa
        await supabase
          .from("empresa_vinculos")
          .delete()
          .eq("empresa_id", empresa.id);

        // Criar novos vínculos independentes (usuário e segmento são separados)
        const vinculos = [];
        
        // Adicionar vínculos de usuário (independentes)
        if (alterarUsuario && novosUsuariosIds.length > 0) {
          for (const usuarioId of novosUsuariosIds) {
            vinculos.push({
              empresa_id: empresa.id,
              usuario_id: usuarioId,
              segmento_id: null,
              estabelecimento_id: estabelecimentoId,
            });
          }
        }
        
        // Adicionar vínculos de segmento (independentes)
        if (alterarSegmento && novosSegmentosIds.length > 0) {
          for (const segmentoId of novosSegmentosIds) {
            vinculos.push({
              empresa_id: empresa.id,
              usuario_id: null,
              segmento_id: segmentoId,
              estabelecimento_id: estabelecimentoId,
            });
          }
        }

        // Inserir novos vínculos
        if (vinculos.length > 0) {
          const { error } = await supabase
            .from("empresa_vinculos")
            .insert(vinculos);

          if (error) throw error;
        }
      } catch (error: any) {
        errosTemp.push(
          `Erro ao processar ${empresa.nome_fantasia || empresa.nome}: ${error.message}`
        );
      }

      setProcessedCount(i + 1);
      // Pequeno delay para visualização do progresso
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setErrors(errosTemp);
    setIsProcessing(false);
    setCompleted(true);

    if (errosTemp.length === 0) {
      toast.success("Processamento concluído com sucesso!");
    } else {
      toast.error("Processamento concluído com erros", {
        description: `${empresasSelecionadas.length - errosTemp.length} sucesso, ${errosTemp.length} erro(s)`,
      });
    }

    await loadData();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedEmpresas([]);
    setAlterarUsuario(false);
    setAlterarSegmento(false);
    setNovosUsuariosIds([]);
    setNovosSegmentosIds([]);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
  };

  const empresasSelecionadas = empresas.filter((e) => selectedEmpresas.includes(e.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo Empresas X Usuário / Segmento</h1>
        <p className="text-muted-foreground mt-2">
          Assistente para vincular empresas a usuários e segmentos
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-medium ${
                currentStep === step
                  ? "bg-primary text-primary-foreground"
                  : currentStep > step
                  ? "bg-green-500 text-white"
                  : "bg-secondary text-muted-foreground"
              }`}
            >
              {step}
            </div>
            {step < 4 && (
              <div
                className={`w-12 h-1 ${
                  currentStep > step ? "bg-green-500" : "bg-secondary"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div>
        {currentStep === 1 && (
          <VinculosWizardStep1
            empresas={empresas}
            usuarios={usuarios}
            segmentos={segmentos}
            selectedEmpresas={selectedEmpresas}
            onSelectEmpresas={setSelectedEmpresas}
          />
        )}
        {currentStep === 2 && (
          <VinculosWizardStep2
            usuarios={usuarios}
            segmentos={segmentos}
            alterarUsuario={alterarUsuario}
            alterarSegmento={alterarSegmento}
            novosUsuariosIds={novosUsuariosIds}
            novosSegmentosIds={novosSegmentosIds}
            onAlterarUsuarioChange={setAlterarUsuario}
            onAlterarSegmentoChange={setAlterarSegmento}
            onNovosUsuariosChange={setNovosUsuariosIds}
            onNovosSegmentosChange={setNovosSegmentosIds}
            selectedCount={selectedEmpresas.length}
          />
        )}
        {currentStep === 3 && (
          <VinculosWizardStep3
            empresasSelecionadas={empresasSelecionadas}
            usuarios={usuarios}
            segmentos={segmentos}
            alterarUsuario={alterarUsuario}
            alterarSegmento={alterarSegmento}
            novosUsuariosIds={novosUsuariosIds}
            novosSegmentosIds={novosSegmentosIds}
          />
        )}
        {currentStep === 4 && (
          <VinculosWizardStep4
            isProcessing={isProcessing}
            processedCount={processedCount}
            totalCount={empresasSelecionadas.length}
            errors={errors}
            completed={completed}
          />
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || (currentStep === 4 && isProcessing)}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        <div className="flex gap-2">
          {currentStep === 4 && completed && (
            <Button variant="outline" onClick={handleReset}>
              Nova Operação
            </Button>
          )}
          
          {currentStep < 3 && (
            <Button onClick={handleNext} disabled={!canGoNext()}>
              Próximo
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}

          {currentStep === 3 && (
            <Button onClick={() => { handleNext(); handleProcess(); }}>
              Processar Alterações
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
