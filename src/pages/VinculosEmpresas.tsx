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
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
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
  const [novoUsuarioId, setNovoUsuarioId] = useState("");
  const [novoSegmentoId, setNovoSegmentoId] = useState("");

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

      const empresasComVinculos: EmpresaComVinculo[] = (empresasData || []).map((empresa) => {
        const vinculo = vinculosData?.find((v) => v.empresa_id === empresa.id);
        return {
          ...empresa,
          usuario_vinculado_id: vinculo?.usuario_id || null,
          segmento_vinculado_id: vinculo?.segmento_id || null,
          vinculo_id: vinculo?.id || null,
        };
      });

      setEmpresas(empresasComVinculos);

      const { data: usuariosData, error: usuariosError } = await supabase
        .from("usuarios")
        .select("id, nome, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (usuariosError) throw usuariosError;
      setUsuarios(usuariosData || []);

      const { data: segmentosData, error: segmentosError } = await supabase
        .from("segmentos")
        .select("id, nome")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (segmentosError) throw segmentosError;
      setSegmentos(segmentosData || []);
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

    const empresasSelecionadas = empresas.filter((e) => selectedEmpresas.includes(e.id));
    const errosTemp: string[] = [];

    for (let i = 0; i < empresasSelecionadas.length; i++) {
      const empresa = empresasSelecionadas[i];
      
      try {
        if (empresa.vinculo_id) {
          // Atualizar vínculo existente
          const updates: any = {};
          if (alterarUsuario) updates.usuario_id = novoUsuarioId || null;
          if (alterarSegmento) updates.segmento_id = novoSegmentoId || null;

          const { error } = await supabase
            .from("empresa_vinculos")
            .update(updates)
            .eq("id", empresa.vinculo_id);

          if (error) throw error;
        } else {
          // Criar novo vínculo
          const { error } = await supabase.from("empresa_vinculos").insert({
            empresa_id: empresa.id,
            usuario_id: alterarUsuario ? (novoUsuarioId || null) : null,
            segmento_id: alterarSegmento ? (novoSegmentoId || null) : null,
            estabelecimento_id: estabelecimentoId,
          });

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
    setNovoUsuarioId("");
    setNovoSegmentoId("");
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
  };

  const empresasSelecionadas = empresas.filter((e) => selectedEmpresas.includes(e.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo X Usuário / Segmento</h1>
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
            novoUsuarioId={novoUsuarioId}
            novoSegmentoId={novoSegmentoId}
            onAlterarUsuarioChange={setAlterarUsuario}
            onAlterarSegmentoChange={setAlterarSegmento}
            onNovoUsuarioChange={setNovoUsuarioId}
            onNovoSegmentoChange={setNovoSegmentoId}
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
            novoUsuarioId={novoUsuarioId}
            novoSegmentoId={novoSegmentoId}
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
