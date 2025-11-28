import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast-config";
import { Fuel, Truck, Save, Plus, Pencil, Trash2, X, Calculator } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FreteSimulator } from "./FreteSimulator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CustosVeiculosCRUDProps {
  estabelecimentoId: string;
}

interface CombustiveisPrecos {
  id?: string;
  preco_diesel: number;
  preco_etanol: number;
  preco_gasolina: number;
  preco_eletrico: number;
}

interface VeiculoCusto {
  id?: string;
  tipo_veiculo: string;
  tipo_combustivel: string;
  consumo_medio: number;
  custo_manutencao_mensal: number;
  custo_funcionario_mensal: number;
  valor_ajudante: number;
  valor_refeicao: number;
  extras: number;
  peso_maximo_kg: number;
  pernoite: number;
  adic_hora_extra_perc: number;
  jornada_base_dia: number;
  horas_mensais: number;
  observacoes?: string;
}

const TIPOS_VEICULO = [
  { value: "2AxlesAuto", label: "Automóvel 2 Eixos" },
  { value: "3AxlesAuto", label: "Automóvel 3 Eixos" },
  { value: "2AxlesTruck", label: "Caminhão 2 Eixos" },
  { value: "3AxlesTruck", label: "Caminhão 3 Eixos" },
  { value: "4AxlesTruck", label: "Caminhão 4 Eixos" },
  { value: "5AxlesTruck", label: "Caminhão 5 Eixos" },
  { value: "6AxlesTruck", label: "Caminhão 6 Eixos" },
  { value: "2AxlesBus", label: "Ônibus 2 Eixos" },
  { value: "3AxlesBus", label: "Ônibus 3 Eixos" },
  { value: "Motorcycle", label: "Motocicleta" },
];

const TIPOS_COMBUSTIVEL = [
  { value: "diesel", label: "Diesel" },
  { value: "etanol", label: "Etanol" },
  { value: "gasolina", label: "Gasolina" },
  { value: "eletrico", label: "Elétrico" },
];

export function CustosVeiculosCRUD({ estabelecimentoId }: CustosVeiculosCRUDProps) {
  const [combustiveis, setCombustiveis] = useState<CombustiveisPrecos>({
    preco_diesel: 0,
    preco_etanol: 0,
    preco_gasolina: 0,
    preco_eletrico: 0,
  });
  const [veiculos, setVeiculos] = useState<VeiculoCusto[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCombustiveis, setSavingCombustiveis] = useState(false);
  const [editingVeiculo, setEditingVeiculo] = useState<VeiculoCusto | null>(null);
  const [isAddingVeiculo, setIsAddingVeiculo] = useState(false);
  const [deleteVeiculoId, setDeleteVeiculoId] = useState<string | null>(null);
  const [selectedVeiculoForSimulation, setSelectedVeiculoForSimulation] = useState<string>("");

  const emptyVeiculo: VeiculoCusto = {
    tipo_veiculo: "",
    tipo_combustivel: "diesel",
    consumo_medio: 0,
    custo_manutencao_mensal: 0,
    custo_funcionario_mensal: 0,
    valor_ajudante: 0,
    valor_refeicao: 0,
    extras: 0,
    peso_maximo_kg: 0,
    pernoite: 0,
    adic_hora_extra_perc: 50,
    jornada_base_dia: 8,
    horas_mensais: 220,
    observacoes: "",
  };

  useEffect(() => {
    if (estabelecimentoId) {
      fetchData();
    }
  }, [estabelecimentoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch combustíveis
      const { data: combData } = await supabase
        .from("combustiveis_precos")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .single();

      if (combData) {
        setCombustiveis({
          id: combData.id,
          preco_diesel: Number(combData.preco_diesel) || 0,
          preco_etanol: Number(combData.preco_etanol) || 0,
          preco_gasolina: Number(combData.preco_gasolina) || 0,
          preco_eletrico: Number(combData.preco_eletrico) || 0,
        });
      }

      // Fetch veículos
      const { data: veicData } = await supabase
        .from("veiculos_custos")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("tipo_veiculo");

      if (veicData) {
        setVeiculos(veicData.map(v => ({
          id: v.id,
          tipo_veiculo: v.tipo_veiculo,
          tipo_combustivel: v.tipo_combustivel,
          consumo_medio: Number(v.consumo_cidade) || 0,
          custo_manutencao_mensal: Number(v.custo_manutencao_mensal) || 0,
          custo_funcionario_mensal: Number(v.custo_funcionario_mensal) || 0,
          valor_ajudante: Number(v.valor_ajudante) || 0,
          valor_refeicao: Number(v.valor_refeicao) || 0,
          extras: Number(v.extras) || 0,
          peso_maximo_kg: Number(v.peso_maximo_kg) || 0,
          pernoite: Number((v as any).pernoite) || 0,
          adic_hora_extra_perc: Number((v as any).adic_hora_extra_perc) ?? 50,
          jornada_base_dia: Number((v as any).jornada_base_dia) || 8,
          horas_mensais: Number((v as any).horas_mensais) || 220,
          observacoes: v.observacoes || "",
        })));
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveCombustiveis = async () => {
    setSavingCombustiveis(true);
    try {
      if (combustiveis.id) {
        await supabase
          .from("combustiveis_precos")
          .update({
            preco_diesel: combustiveis.preco_diesel,
            preco_etanol: combustiveis.preco_etanol,
            preco_gasolina: combustiveis.preco_gasolina,
            preco_eletrico: combustiveis.preco_eletrico,
          })
          .eq("id", combustiveis.id);
      } else {
        const { data } = await supabase
          .from("combustiveis_precos")
          .insert({
            estabelecimento_id: estabelecimentoId,
            preco_diesel: combustiveis.preco_diesel,
            preco_etanol: combustiveis.preco_etanol,
            preco_gasolina: combustiveis.preco_gasolina,
            preco_eletrico: combustiveis.preco_eletrico,
          })
          .select()
          .single();
        if (data) {
          setCombustiveis(prev => ({ ...prev, id: data.id }));
        }
      }
      toast.success("Preços de combustíveis salvos com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar preços de combustíveis");
    } finally {
      setSavingCombustiveis(false);
    }
  };

  const saveVeiculo = async () => {
    if (!editingVeiculo?.tipo_veiculo) {
      toast.error("Selecione um tipo de veículo");
      return;
    }

    try {
      const veiculoData = {
        tipo_combustivel: editingVeiculo.tipo_combustivel,
        consumo_cidade: editingVeiculo.consumo_medio,
        custo_manutencao_mensal: editingVeiculo.custo_manutencao_mensal,
        custo_funcionario_mensal: editingVeiculo.custo_funcionario_mensal,
        valor_ajudante: editingVeiculo.valor_ajudante,
        valor_refeicao: editingVeiculo.valor_refeicao,
        extras: editingVeiculo.extras,
        peso_maximo_kg: editingVeiculo.peso_maximo_kg,
        pernoite: editingVeiculo.pernoite,
        adic_hora_extra_perc: editingVeiculo.adic_hora_extra_perc,
        jornada_base_dia: editingVeiculo.jornada_base_dia,
        horas_mensais: editingVeiculo.horas_mensais,
        observacoes: editingVeiculo.observacoes,
      };

      if (editingVeiculo.id) {
        await supabase
          .from("veiculos_custos")
          .update(veiculoData)
          .eq("id", editingVeiculo.id);
        toast.success("Veículo atualizado com sucesso!");
      } else {
        await supabase.from("veiculos_custos").insert({
          estabelecimento_id: estabelecimentoId,
          tipo_veiculo: editingVeiculo.tipo_veiculo,
          ...veiculoData,
        });
        toast.success("Veículo adicionado com sucesso!");
      }
      setEditingVeiculo(null);
      setIsAddingVeiculo(false);
      fetchData();
    } catch (error: any) {
      if (error.code === "23505") {
        toast.error("Este tipo de veículo já está cadastrado");
      } else {
        toast.error("Erro ao salvar veículo");
      }
    }
  };

  const deleteVeiculo = async () => {
    if (!deleteVeiculoId) return;
    try {
      await supabase.from("veiculos_custos").delete().eq("id", deleteVeiculoId);
      toast.success("Veículo removido com sucesso!");
      setDeleteVeiculoId(null);
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover veículo");
    }
  };

  const getTipoVeiculoLabel = (value: string) => {
    return TIPOS_VEICULO.find(t => t.value === value)?.label || value;
  };

  const getTipoCombustivelLabel = (value: string) => {
    return TIPOS_COMBUSTIVEL.find(t => t.value === value)?.label || value;
  };

  const availableVehicleTypes = TIPOS_VEICULO.filter(
    t => !veiculos.some(v => v.tipo_veiculo === t.value) || editingVeiculo?.tipo_veiculo === t.value
  );

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Preços de Combustíveis */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Fuel className="h-4 w-4" />
            Preços de Combustíveis (R$/Litro)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Diesel</Label>
              <Input
                type="number"
                step="0.01"
                value={combustiveis.preco_diesel}
                onChange={e => setCombustiveis(prev => ({ ...prev, preco_diesel: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Etanol</Label>
              <Input
                type="number"
                step="0.01"
                value={combustiveis.preco_etanol}
                onChange={e => setCombustiveis(prev => ({ ...prev, preco_etanol: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Gasolina</Label>
              <Input
                type="number"
                step="0.01"
                value={combustiveis.preco_gasolina}
                onChange={e => setCombustiveis(prev => ({ ...prev, preco_gasolina: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Elétrico (R$/kWh)</Label>
              <Input
                type="number"
                step="0.01"
                value={combustiveis.preco_eletrico}
                onChange={e => setCombustiveis(prev => ({ ...prev, preco_eletrico: Number(e.target.value) }))}
                placeholder="0.00"
              />
            </div>
          </div>
          <Button onClick={saveCombustiveis} disabled={savingCombustiveis} className="mt-4" size="sm">
            <Save className="h-4 w-4 mr-2" />
            Salvar Preços
          </Button>
        </CardContent>
      </Card>

      {/* Custos por Veículo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Custos por Tipo de Veículo
            </CardTitle>
            <Button
              size="sm"
              onClick={() => {
                setIsAddingVeiculo(true);
                setEditingVeiculo({ ...emptyVeiculo });
              }}
              disabled={isAddingVeiculo || availableVehicleTypes.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Form de edição/adição */}
          {(isAddingVeiculo || editingVeiculo) && (
            <Card className="mb-4 border-primary/50">
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Veículo</Label>
                    <Select
                      value={editingVeiculo?.tipo_veiculo || ""}
                      onValueChange={v => setEditingVeiculo(prev => prev ? { ...prev, tipo_veiculo: v } : null)}
                      disabled={!!editingVeiculo?.id}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicleTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Combustível</Label>
                    <Select
                      value={editingVeiculo?.tipo_combustivel || "diesel"}
                      onValueChange={v => setEditingVeiculo(prev => prev ? { ...prev, tipo_combustivel: v } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_COMBUSTIVEL.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Média de Consumo (km/l)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingVeiculo?.consumo_medio || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, consumo_medio: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Manutenção Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.custo_manutencao_mensal || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, custo_manutencao_mensal: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Funcionário Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.custo_funcionario_mensal || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, custo_funcionario_mensal: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Ajudante (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.valor_ajudante || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, valor_ajudante: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Valor Refeição (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.valor_refeicao || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, valor_refeicao: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Extras Mensais (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.extras || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, extras: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Peso Máximo (kg)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingVeiculo?.peso_maximo_kg || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, peso_maximo_kg: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pernoite (R$/pessoa)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={editingVeiculo?.pernoite || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, pernoite: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Adicional H.E. (%)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingVeiculo?.adic_hora_extra_perc ?? 50}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, adic_hora_extra_perc: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jornada Base (h/dia)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={editingVeiculo?.jornada_base_dia || 8}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, jornada_base_dia: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Horas Mensais</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingVeiculo?.horas_mensais || 220}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, horas_mensais: Number(e.target.value) } : null)}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Observações</Label>
                    <Input
                      value={editingVeiculo?.observacoes || ""}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, observacoes: e.target.value } : null)}
                      placeholder="Observações adicionais"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" onClick={saveVeiculo}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingVeiculo(null); setIsAddingVeiculo(false); }}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabela de veículos */}
          {veiculos.length > 0 ? (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Veículo</TableHead>
                    <TableHead className="text-xs">Combustível</TableHead>
                    <TableHead className="text-xs text-right">Consumo</TableHead>
                    <TableHead className="text-xs text-right">Manutenção</TableHead>
                    <TableHead className="text-xs text-right">Motorista</TableHead>
                    <TableHead className="text-xs text-right">Ajudante</TableHead>
                    <TableHead className="text-xs text-right">Pernoite</TableHead>
                    <TableHead className="text-xs text-right">H.E. %</TableHead>
                    <TableHead className="text-xs w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {veiculos.map(v => (
                    <TableRow key={v.id} className={selectedVeiculoForSimulation === v.id ? "bg-primary/10" : ""}>
                      <TableCell className="text-xs font-medium">{getTipoVeiculoLabel(v.tipo_veiculo)}</TableCell>
                      <TableCell className="text-xs">{getTipoCombustivelLabel(v.tipo_combustivel)}</TableCell>
                      <TableCell className="text-xs text-right">{v.consumo_medio} km/l</TableCell>
                      <TableCell className="text-xs text-right">{v.custo_manutencao_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-xs text-right">{v.custo_funcionario_mensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-xs text-right">{v.valor_ajudante.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-xs text-right">{v.pernoite.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                      <TableCell className="text-xs text-right">{v.adic_hora_extra_perc}%</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant={selectedVeiculoForSimulation === v.id ? "default" : "ghost"}
                            className="h-7 w-7"
                            onClick={() => setSelectedVeiculoForSimulation(selectedVeiculoForSimulation === v.id ? "" : v.id!)}
                            title="Simular Frete"
                          >
                            <Calculator className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => { setEditingVeiculo(v); setIsAddingVeiculo(false); }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => setDeleteVeiculoId(v.id!)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum veículo cadastrado. Clique em "Adicionar" para começar.
            </p>
          )}

          {/* Simulador de Frete */}
          {selectedVeiculoForSimulation && (() => {
            const veiculo = veiculos.find(v => v.id === selectedVeiculoForSimulation);
            if (!veiculo) return null;
            
            const valorCombustivel = 
              veiculo.tipo_combustivel === 'diesel' ? combustiveis.preco_diesel :
              veiculo.tipo_combustivel === 'etanol' ? combustiveis.preco_etanol :
              veiculo.tipo_combustivel === 'gasolina' ? combustiveis.preco_gasolina :
              combustiveis.preco_eletrico;

            return (
              <FreteSimulator 
                veiculoConfig={{
                  manutencaoMensal: veiculo.custo_manutencao_mensal,
                  extrasMensais: veiculo.extras,
                  salarioMotorista: veiculo.custo_funcionario_mensal,
                  valorAjudanteDia: veiculo.valor_ajudante,
                  valorRefeicao: veiculo.valor_refeicao,
                  mediaConsumo: veiculo.consumo_medio,
                  pernoite: veiculo.pernoite,
                  adicHoraExtraPerc: veiculo.adic_hora_extra_perc,
                  jornadaBaseDia: veiculo.jornada_base_dia,
                  horasMensais: veiculo.horas_mensais,
                }}
                valorCombustivel={valorCombustivel}
              />
            );
          })()}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!deleteVeiculoId}
        onOpenChange={open => !open && setDeleteVeiculoId(null)}
        onConfirm={deleteVeiculo}
        title="Remover Veículo"
        description="Tem certeza que deseja remover este veículo? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
