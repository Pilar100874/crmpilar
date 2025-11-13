import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "@/lib/toast-config";
import { useToast } from "@/hooks/use-toast";
import { Calendar, RefreshCw, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CalendarioRegra {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativa: boolean;
  configuracao: any;
  ordem: number;
}

interface CalendarioRegrasCRUDProps {
  estabelecimentoId: string;
}

export function CalendarioRegrasCRUD({ estabelecimentoId }: CalendarioRegrasCRUDProps) {
  const [regras, setRegras] = useState<CalendarioRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadRegras();
  }, [estabelecimentoId]);

  const loadRegras = async () => {
    try {
      setLoading(true);
      const { data, error } = await (supabase as any)
        .from('calendario_regras')
        .select('*')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('ordem', { ascending: true });

      if (error) throw error;

      setRegras((data || []) as CalendarioRegra[]);
    } catch (error: any) {
      console.error('Erro ao carregar regras:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar regras do calendário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRegra = async (regraId: string, novoStatus: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('calendario_regras')
        .update({ 
          ativa: novoStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', regraId);

      if (error) throw error;

      setRegras(regras.map(r => 
        r.id === regraId ? { ...r, ativa: novoStatus } : r
      ));

      toast({
        title: "Sucesso",
        description: `Regra ${novoStatus ? 'ativada' : 'desativada'} com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar regra:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status da regra",
        variant: "destructive",
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'horario_comercial': 'Horário Comercial',
      'bloqueio_finais_semana': 'Bloqueio Finais de Semana',
      'alerta_urgente': 'Alerta Tarefas Urgentes',
      'confirmacao_fim_semana': 'Confirmação em Finais de Semana',
      'bloquear_datas_passadas': 'Bloquear Datas Passadas',
      'bloquear_horarios_passados': 'Bloquear Horários Passados',
      'deteccao_conflitos': 'Detecção de Conflitos',
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const cores: Record<string, string> = {
      'horario_comercial': 'bg-blue-500',
      'bloqueio_finais_semana': 'bg-red-500',
      'alerta_urgente': 'bg-yellow-500',
      'confirmacao_fim_semana': 'bg-purple-500',
      'bloquear_datas_passadas': 'bg-orange-500',
      'bloquear_horarios_passados': 'bg-pink-500',
      'deteccao_conflitos': 'bg-cyan-500',
    };
    return cores[tipo] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle>Regras do Calendário</CardTitle>
          </div>
          <CardDescription>
            Configure as regras que serão aplicadas ao calendário deste estabelecimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {regras.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma regra cadastrada ainda</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Ativa</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {regras.map((regra) => (
                    <TableRow key={regra.id}>
                      <TableCell>
                        <Switch
                          checked={regra.ativa}
                          onCheckedChange={(checked) => toggleRegra(regra.id, checked)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{regra.nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${getTipoColor(regra.tipo)} text-white`}>
                          {getTipoLabel(regra.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {regra.descricao || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={regra.ativa ? "default" : "secondary"}>
                          {regra.ativa ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          
          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={loadRegras}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}