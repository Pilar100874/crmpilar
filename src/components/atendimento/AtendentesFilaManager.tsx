import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";
import { toast as sonnerToast } from "sonner";

interface AtendenteFilaManagerProps {
  filaId: string;
  estabelecimentoId: string;
}

interface AtendenteVinculado {
  id: string;
  atendente_id: string;
  prioridade: number;
  usuario: {
    nome: string;
    email: string;
  };
}

interface AtendenteDisponivel {
  id: string;
  usuario_id: string;
  usuario: {
    nome: string;
    email: string;
  };
}

export const AtendentesFilaManager = ({ filaId, estabelecimentoId }: AtendenteFilaManagerProps) => {
  const [atendentesVinculados, setAtendentesVinculados] = useState<AtendenteVinculado[]>([]);
  const [atendentesDisponiveis, setAtendentesDisponiveis] = useState<AtendenteDisponivel[]>([]);
  const [selectedAtendente, setSelectedAtendente] = useState<string>("");
  const [prioridade, setPrioridade] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [filaId, estabelecimentoId]);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      loadAtendentesVinculados(),
      loadAtendentesDisponiveis()
    ]);
    setLoading(false);
  };

  const loadAtendentesVinculados = async () => {
    const { data, error } = await supabase
      .from("atendente_filas")
      .select(`
        id,
        atendente_id,
        prioridade,
        atendentes!inner(
          usuario_id,
          usuarios!inner(
            nome,
            email
          )
        )
      `)
      .eq("fila_id", filaId);

    if (error) {
      console.error("Erro ao carregar atendentes vinculados:", error);
      sonnerToast.error("Erro ao carregar atendentes vinculados");
      return;
    }

    const formatted = data?.map((item: any) => ({
      id: item.id,
      atendente_id: item.atendente_id,
      prioridade: item.prioridade,
      usuario: {
        nome: item.atendentes.usuarios.nome,
        email: item.atendentes.usuarios.email
      }
    })) || [];

    setAtendentesVinculados(formatted);
  };

  const loadAtendentesDisponiveis = async () => {
    // Buscar atendentes do estabelecimento
    const { data, error } = await supabase
      .from("atendentes")
      .select(`
        id,
        usuario_id,
        usuarios!inner(
          nome,
          email
        )
      `)
      .eq("estabelecimento_id", estabelecimentoId);

    if (error) {
      console.error("Erro ao carregar atendentes disponíveis:", error);
      sonnerToast.error("Erro ao carregar atendentes disponíveis");
      return;
    }

    const formatted = data?.map((item: any) => ({
      id: item.id,
      usuario_id: item.usuario_id,
      usuario: {
        nome: item.usuarios.nome,
        email: item.usuarios.email
      }
    })) || [];

    setAtendentesDisponiveis(formatted);
  };

  const handleAddAtendente = async () => {
    if (!selectedAtendente) {
      sonnerToast.error("Selecione um atendente");
      return;
    }

    const { error } = await supabase
      .from("atendente_filas")
      .insert({
        atendente_id: selectedAtendente,
        fila_id: filaId,
        prioridade: prioridade
      });

    if (error) {
      console.error("Erro ao adicionar atendente:", error);
      sonnerToast.error("Erro ao adicionar atendente");
      return;
    }

    sonnerToast.success("Atendente adicionado com sucesso");
    setSelectedAtendente("");
    setPrioridade(0);
    loadData();
  };

  const handleRemoveAtendente = async (vinculoId: string) => {
    const { error } = await supabase
      .from("atendente_filas")
      .delete()
      .eq("id", vinculoId);

    if (error) {
      console.error("Erro ao remover atendente:", error);
      sonnerToast.error("Erro ao remover atendente");
      return;
    }

    sonnerToast.success("Atendente removido com sucesso");
    loadData();
  };

  const handleUpdatePrioridade = async (vinculoId: string, novaPrioridade: number) => {
    const { error } = await supabase
      .from("atendente_filas")
      .update({ prioridade: novaPrioridade })
      .eq("id", vinculoId);

    if (error) {
      console.error("Erro ao atualizar prioridade:", error);
      sonnerToast.error("Erro ao atualizar prioridade");
      return;
    }

    sonnerToast.success("Prioridade atualizada");
    loadData();
  };

  const atendentesNaoVinculados = atendentesDisponiveis.filter(
    disponivel => !atendentesVinculados.some(vinculado => vinculado.atendente_id === disponivel.id)
  );

  if (loading) {
    return <div className="text-center py-4">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <Label>Adicionar Atendente</Label>
              <Select value={selectedAtendente} onValueChange={setSelectedAtendente}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um atendente" />
                </SelectTrigger>
                <SelectContent>
                  {atendentesNaoVinculados.map((atendente) => (
                    <SelectItem key={atendente.id} value={atendente.id}>
                      {atendente.usuario.nome} ({atendente.usuario.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade na Fila</Label>
              <Input
                type="number"
                min="0"
                value={prioridade}
                onChange={(e) => setPrioridade(Number(e.target.value))}
                placeholder="0 = maior prioridade"
              />
            </div>

            <Button onClick={handleAddAtendente} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Atendente
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Atendentes Vinculados ({atendentesVinculados.length})</h3>
        
        {atendentesVinculados.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mb-2 opacity-50" />
              <p>Nenhum atendente vinculado a esta fila</p>
            </CardContent>
          </Card>
        ) : (
          atendentesVinculados.map((vinculo) => (
            <Card key={vinculo.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex-1">
                  <p className="font-medium">{vinculo.usuario.nome}</p>
                  <p className="text-sm text-muted-foreground">{vinculo.usuario.email}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">Prioridade:</Label>
                    <Input
                      type="number"
                      min="0"
                      value={vinculo.prioridade}
                      onChange={(e) => handleUpdatePrioridade(vinculo.id, Number(e.target.value))}
                      className="w-20"
                    />
                  </div>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveAtendente(vinculo.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
