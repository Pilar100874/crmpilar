import { useState, useEffect } from "react";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PesquisasSatisfacaoCRUD from "@/components/atendimento/PesquisasSatisfacaoCRUD";
import PesquisasSatisfacaoDashboard from "@/components/atendimento/PesquisasSatisfacaoDashboard";
import { toast } from "@/lib/toast-config";

export default function PesquisasSatisfacaoPage() {
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
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="pesquisas">Pesquisas</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PesquisasSatisfacaoDashboard estabelecimentoId={estabelecimentoId} />
        </TabsContent>

        <TabsContent value="pesquisas">
          <PesquisasSatisfacaoCRUD estabelecimentoId={estabelecimentoId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
