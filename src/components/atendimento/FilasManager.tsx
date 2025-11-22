import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings, Users, Trash2 } from "lucide-react";
import type { FilaAtendimento } from "@/types/atendimento";

interface FilasManagerProps {
  filas: FilaAtendimento[];
  onCreateFila?: () => void;
  onEditFila?: (fila: FilaAtendimento) => void;
  onDeleteFila?: (fila: FilaAtendimento) => void;
  onToggleAtiva?: (filaId: string, ativa: boolean) => void;
  onViewAtendentes?: (fila: FilaAtendimento) => void;
  onConfigureSkills?: (fila: FilaAtendimento) => void;
}

export const FilasManager = ({ filas, onCreateFila, onEditFila, onDeleteFila, onToggleAtiva, onViewAtendentes, onConfigureSkills }: FilasManagerProps) => {
  const getTipoRoteamentoLabel = (tipo: string) => {
    const labels = {
      round_robin: "Circular",
      por_skill: "Por Habilidade",
      por_disponibilidade: "Por Disponibilidade",
      por_prioridade: "Por Prioridade",
      por_carteira: "Por Carteira Fixa"
    };
    return labels[tipo as keyof typeof labels] || tipo;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gerenciamento de Filas</h2>
          <p className="text-muted-foreground">
            Configure e gerencie as filas de atendimento do seu estabelecimento
          </p>
        </div>
        <Button onClick={onCreateFila}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Fila
        </Button>
      </div>

      <div className="grid gap-4">
        {filas.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                Nenhuma fila configurada ainda
              </p>
              <Button onClick={onCreateFila} variant="outline" className="mt-4">
                Criar Primeira Fila
              </Button>
            </CardContent>
          </Card>
        ) : (
          filas.map((fila) => (
            <Card key={fila.id} className="hover:bg-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CardTitle>{fila.nome}</CardTitle>
                      <Badge variant={fila.ativa ? "default" : "secondary"}>
                        {fila.ativa ? "Ativa" : "Inativa"}
                      </Badge>
                    </div>
                    <CardDescription>{fila.descricao}</CardDescription>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => onEditFila?.(fila)}
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Tipo de Roteamento</p>
                    <p className="font-medium">{getTipoRoteamentoLabel(fila.tipo_roteamento)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Chats por Atendente</p>
                    <p className="font-medium">{fila.max_chats_por_atendente}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Prioridade</p>
                    <p className="font-medium">{fila.prioridade}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Tempo Resposta</p>
                    <p className="font-medium">{fila.tempo_resposta_esperado}s</p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onToggleAtiva?.(fila.id, !fila.ativa)}
                  >
                    {fila.ativa ? "Desativar" : "Ativar"}
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onViewAtendentes?.(fila)}
                  >
                    <Users className="h-4 w-4 mr-1" />
                    Ver Atendentes
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => onConfigureSkills?.(fila)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Configurar Skills
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => onDeleteFila?.(fila)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Excluir
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
