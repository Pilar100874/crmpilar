import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { VinculosWizardStep1Contatos } from "@/components/vinculos/VinculosWizardStep1Contatos";
import { VinculosWizardStep2 } from "@/components/vinculos/VinculosWizardStep2";
import { VinculosWizardStep3Contatos } from "@/components/vinculos/VinculosWizardStep3Contatos";
import { VinculosWizardStep4 } from "@/components/vinculos/VinculosWizardStep4";

interface Contato {
  id: string;
  nome: string;
  telefone: string;
  email: string;
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

interface ContatoComVinculo extends Contato {
  usuario_vinculado_id: string | null;
  segmento_vinculado_id: string | null;
  vinculo_id: string | null;
}

export default function VinculosContatos() {
  const [currentStep, setCurrentStep] = useState(1);
  const [contatos, setContatos] = useState<ContatoComVinculo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [segmentos, setSegmentos] = useState<Segmento[]>([]);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string>("");

  // Step 1 - Seleção de contatos
  const [selectedContatos, setSelectedContatos] = useState<string[]>([]);

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
      const { data: contatosData, error: contatosError } = await supabase
        .from("customers")
        .select("id, nome, telefone, email")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("nome");

      if (contatosError) throw contatosError;

      const { data: vinculosData, error: vinculosError } = await supabase
        .from("customer_vinculos")
        .select("id, customer_id, usuario_id, segmento_id")
        .eq("estabelecimento_id", estabelecimentoId);

      if (vinculosError) throw vinculosError;

      const contatosComVinculos: ContatoComVinculo[] = (contatosData || []).map((contato) => {
        const vinculo = vinculosData?.find((v) => v.customer_id === contato.id);
        return {
          ...contato,
          usuario_vinculado_id: vinculo?.usuario_id || null,
          segmento_vinculado_id: vinculo?.segmento_id || null,
          vinculo_id: vinculo?.id || null,
        };
      });

      setContatos(contatosComVinculos);

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
    if (currentStep === 1) return selectedContatos.length > 0;
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

    const contatosSelecionados = contatos.filter((c) => selectedContatos.includes(c.id));
    const errosTemp: string[] = [];

    for (let i = 0; i < contatosSelecionados.length; i++) {
      const contato = contatosSelecionados[i];
      
      try {
        // Remover vínculos existentes do contato
        await supabase
          .from("customer_vinculos")
          .delete()
          .eq("customer_id", contato.id);

        // Criar novos vínculos combinando usuários e segmentos selecionados
        const vinculos = [];
        
        if (alterarUsuario && novosUsuariosIds.length > 0 && alterarSegmento && novosSegmentosIds.length > 0) {
          // Criar vínculo para cada combinação usuário x segmento
          for (const usuarioId of novosUsuariosIds) {
            for (const segmentoId of novosSegmentosIds) {
              vinculos.push({
                customer_id: contato.id,
                usuario_id: usuarioId,
                segmento_id: segmentoId,
                estabelecimento_id: estabelecimentoId,
              });
            }
          }
        } else if (alterarUsuario && novosUsuariosIds.length > 0) {
          // Apenas usuários
          for (const usuarioId of novosUsuariosIds) {
            vinculos.push({
              customer_id: contato.id,
              usuario_id: usuarioId,
              segmento_id: null,
              estabelecimento_id: estabelecimentoId,
            });
          }
        } else if (alterarSegmento && novosSegmentosIds.length > 0) {
          // Apenas segmentos
          for (const segmentoId of novosSegmentosIds) {
            vinculos.push({
              customer_id: contato.id,
              usuario_id: null,
              segmento_id: segmentoId,
              estabelecimento_id: estabelecimentoId,
            });
          }
        }

        // Inserir novos vínculos
        if (vinculos.length > 0) {
          const { error } = await supabase
            .from("customer_vinculos")
            .insert(vinculos);

          if (error) throw error;
        }
      } catch (error: any) {
        errosTemp.push(
          `Erro ao processar ${contato.nome}: ${error.message}`
        );
      }

      setProcessedCount(i + 1);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    setErrors(errosTemp);
    setIsProcessing(false);
    setCompleted(true);

    if (errosTemp.length === 0) {
      toast.success("Processamento concluído com sucesso!");
    } else {
      toast.error("Processamento concluído com erros", {
        description: `${contatosSelecionados.length - errosTemp.length} sucesso, ${errosTemp.length} erro(s)`,
      });
    }

    await loadData();
  };

  const handleReset = () => {
    setCurrentStep(1);
    setSelectedContatos([]);
    setAlterarUsuario(false);
    setAlterarSegmento(false);
    setNovosUsuariosIds([]);
    setNovosSegmentosIds([]);
    setProcessedCount(0);
    setErrors([]);
    setCompleted(false);
  };

  const contatosSelecionados = contatos.filter((c) => selectedContatos.includes(c.id));

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vínculo Contatos X Usuário / Segmento</h1>
        <p className="text-muted-foreground mt-2">
          Assistente para vincular contatos a usuários e segmentos
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
          <VinculosWizardStep1Contatos
            contatos={contatos}
            usuarios={usuarios}
            segmentos={segmentos}
            selectedContatos={selectedContatos}
            onSelectContatos={setSelectedContatos}
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
            selectedCount={selectedContatos.length}
          />
        )}
        {currentStep === 3 && (
          <VinculosWizardStep3Contatos
            contatosSelecionados={contatosSelecionados}
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
            totalCount={contatosSelecionados.length}
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
