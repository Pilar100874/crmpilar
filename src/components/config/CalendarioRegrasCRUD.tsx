import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast as sonnerToast } from "@/lib/toast-config";
import { useToast } from "@/hooks/use-toast";
import { Calendar, RefreshCw, AlertCircle, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CalendarioRegra {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  ativa: boolean;
  configuracao: {
    dias_vermelho?: number;
    dias_laranja?: number;
    dias_amarelo?: number;
    dias_verde?: number;
  } | null;
  ordem: number;
}

interface CalendarioRegrasCRUDProps {
  estabelecimentoId: string;
}

export function CalendarioRegrasCRUD({ estabelecimentoId }: CalendarioRegrasCRUDProps) {
  const [regras, setRegras] = useState<CalendarioRegra[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedRegra, setSelectedRegra] = useState<CalendarioRegra | null>(null);
  const [configValues, setConfigValues] = useState({
    dias_vermelho: 7,
    dias_laranja: 5,
    dias_amarelo: 3,
    dias_verde: 0,
  });
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

  const openConfigDialog = (regra: CalendarioRegra) => {
    setSelectedRegra(regra);
    setConfigValues({
      dias_vermelho: regra.configuracao?.dias_vermelho ?? 7,
      dias_laranja: regra.configuracao?.dias_laranja ?? 5,
      dias_amarelo: regra.configuracao?.dias_amarelo ?? 3,
      dias_verde: regra.configuracao?.dias_verde ?? 0,
    });
    setConfigDialogOpen(true);
  };

  const saveConfig = async () => {
    if (!selectedRegra) return;

    try {
      const { error } = await (supabase as any)
        .from('calendario_regras')
        .update({ 
          configuracao: configValues,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedRegra.id);

      if (error) throw error;

      // Atualizar estado local
      setRegras(regras.map(r => 
        r.id === selectedRegra.id ? { ...r, configuracao: configValues } : r
      ));

      toast({
        title: "Sucesso",
        description: "Configuração salva com sucesso",
      });
      setConfigDialogOpen(false);
      setSelectedRegra(null);
    } catch (error: any) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configuração",
        variant: "destructive",
      });
    }
  };

  const getTipoLabel = (tipo: string) => {
    const tipos: Record<string, string> = {
      'horario_comercial': 'Horário Comercial',
      'bloqueio_finais_semana': 'Bloqueio Finais de Semana',
      'alerta_urgente': 'Alerta Tarefas Urgentes',
      'alerta_tarefas_urgentes': 'Alerta Tarefas Urgentes',
      'confirmacao_fim_semana': 'Confirmação em Finais de Semana',
      'bloquear_datas_passadas': 'Bloquear Datas Passadas',
      'bloquear_horarios_passados': 'Bloquear Horários Passados',
      'deteccao_conflitos': 'Detecção de Conflitos',
      'realocacao_diaria_tarefas': 'Realocação Diária de Tarefas',
      'validacao_dia_todo': 'Regra do dia todo',
    };
    return tipos[tipo] || tipo;
  };

  const getTipoColor = (tipo: string) => {
    const cores: Record<string, string> = {
      'horario_comercial': 'bg-blue-500',
      'bloqueio_finais_semana': 'bg-red-500',
      'alerta_urgente': 'bg-yellow-500',
      'alerta_tarefas_urgentes': 'bg-yellow-500',
      'confirmacao_fim_semana': 'bg-purple-500',
      'bloquear_datas_passadas': 'bg-orange-500',
      'bloquear_horarios_passados': 'bg-pink-500',
      'deteccao_conflitos': 'bg-cyan-500',
      'realocacao_diaria_tarefas': 'bg-green-500',
      'validacao_dia_todo': 'bg-indigo-500',
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
                    <TableHead className="w-24">Ações</TableHead>
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
                      <TableCell>
                        {(regra.tipo === 'alerta_tarefas_urgentes' || regra.tipo === 'alerta_urgente') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openConfigDialog(regra)}
                            title="Configurar níveis de alerta"
                          >
                            <Settings className="h-4 w-4 mr-1" />
                            Configurar
                          </Button>
                        )}
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

      {/* Dialog de Configuração */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Alerta de Tarefas Urgentes</DialogTitle>
            <DialogDescription>
              Defina o número de dias de atraso para cada nível de alerta. As tarefas serão coloridas automaticamente de acordo com esses critérios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dias_vermelho">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded" />
                  <span className="font-semibold">Vermelho (mais crítico)</span>
                </div>
              </Label>
              <Input
                id="dias_vermelho"
                type="number"
                min="0"
                value={configValues.dias_vermelho}
                onChange={(e) => setConfigValues({
                  ...configValues,
                  dias_vermelho: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Tarefas com mais de {configValues.dias_vermelho} dias de atraso
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_laranja">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-orange-500 rounded" />
                  <span className="font-semibold">Laranja</span>
                </div>
              </Label>
              <Input
                id="dias_laranja"
                type="number"
                min="0"
                value={configValues.dias_laranja}
                onChange={(e) => setConfigValues({
                  ...configValues,
                  dias_laranja: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Tarefas com mais de {configValues.dias_laranja} dias de atraso (e até {configValues.dias_vermelho} dias)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_amarelo">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-500 rounded" />
                  <span className="font-semibold">Amarelo</span>
                </div>
              </Label>
              <Input
                id="dias_amarelo"
                type="number"
                min="0"
                value={configValues.dias_amarelo}
                onChange={(e) => setConfigValues({
                  ...configValues,
                  dias_amarelo: parseInt(e.target.value) || 0
                })}
              />
              <p className="text-xs text-muted-foreground">
                Tarefas com mais de {configValues.dias_amarelo} dias de atraso (e até {configValues.dias_laranja} dias)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_verde">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded" />
                  <span className="font-semibold">Verde (em dia)</span>
                </div>
              </Label>
              <Input
                id="dias_verde"
                type="number"
                min="0"
                value={configValues.dias_verde}
                onChange={(e) => setConfigValues({
                  ...configValues,
                  dias_verde: parseInt(e.target.value) || 0
                })}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Tarefas em dia ou com até {configValues.dias_amarelo} dias de atraso
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveConfig}>
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
