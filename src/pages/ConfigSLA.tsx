import { useState, useEffect } from "react";
import SLAConfigCRUD from "@/components/config/SLAConfigCRUD";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";

export default function ConfigSLA() {
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadEstabelecimento = async () => {
      try {
        const id = await getEstabelecimentoId();
        if (id) {
          setEstabelecimentoId(id);
        } else {
          toast.error("Nenhum estabelecimento selecionado");
        }
      } catch (error) {
        console.error("Erro ao carregar estabelecimento:", error);
        toast.error("Erro ao carregar estabelecimento");
      } finally {
        setIsLoading(false);
      }
    };

    loadEstabelecimento();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!estabelecimentoId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">
          Nenhum estabelecimento encontrado
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground">Service Level Agreement (SLA)</h1>
        <p className="text-muted-foreground mt-2">
          Configure tempos de resposta e alertas para atendimento
        </p>
      </div>
      <SLAConfigCRUD estabelecimentoId={estabelecimentoId} />
    </div>
  );
}
