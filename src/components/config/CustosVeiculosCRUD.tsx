import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/lib/toast-config";
import { Fuel, Truck, Save, Plus, Pencil, Trash2, X, Calculator, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { FreteSimulator } from "./FreteSimulator";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SavedFormula, createDefaultFormula } from "./FormulaBuilder";

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
  formula_frete?: SavedFormula | null;
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
  const [combustiveisOpen, setCombustiveisOpen] = useState(true);
  
  // Fórmulas salvas globalmente
  const [savedFormulas, setSavedFormulas] = useState<SavedFormula[]>(() => [createDefaultFormula()]);

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
    formula_frete: null,
  };

  useEffect(() => {
    if (estabelecimentoId) {
      fetchData();
    }
  }, [estabelecimentoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
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

      const { data: veicData } = await supabase
        .from("veiculos_custos")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .order("tipo_veiculo");

      if (veicData) {
        const formattedVeiculos = veicData.map(v => ({
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
          formula_frete: (v as any).formula_frete as SavedFormula | null,
        }));
        setVeiculos(formattedVeiculos);
        
        // Coletar fórmulas únicas dos veículos
        const formulasFromVehicles = formattedVeiculos
          .filter(v => v.formula_frete && v.formula_frete.id !== "default_frete_completo")
          .map(v => v.formula_frete!)
          .filter((f, i, arr) => arr.findIndex(x => x.id === f.id) === i);
        
        if (formulasFromVehicles.length > 0) {
          setSavedFormulas(prev => {
            const existingIds = prev.map(p => p.id);
            const newFormulas = formulasFromVehicles.filter(f => !existingIds.includes(f.id));
            return [...prev, ...newFormulas];
          });
        }
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
      toast.success("Preços salvos!");
    } catch (error) {
      toast.error("Erro ao salvar preços");
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
        formula_frete: editingVeiculo.formula_frete as any,
      };

      if (editingVeiculo.id) {
        await supabase
          .from("veiculos_custos")
          .update(veiculoData as any)
          .eq("id", editingVeiculo.id);
        toast.success("Veículo atualizado!");
      } else {
        await supabase.from("veiculos_custos").insert({
          estabelecimento_id: estabelecimentoId,
          tipo_veiculo: editingVeiculo.tipo_veiculo,
          ...veiculoData,
        } as any);
        toast.success("Veículo adicionado!");
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
      toast.success("Veículo removido!");
      setDeleteVeiculoId(null);
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover veículo");
    }
  };

  const getTipoVeiculoLabel = (value: string) => TIPOS_VEICULO.find(t => t.value === value)?.label || value;
  const getTipoCombustivelLabel = (value: string) => TIPOS_COMBUSTIVEL.find(t => t.value === value)?.label || value;

  const availableVehicleTypes = TIPOS_VEICULO.filter(
    t => !veiculos.some(v => v.tipo_veiculo === t.value) || editingVeiculo?.tipo_veiculo === t.value
  );

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (loading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Preços de Combustíveis - Collapsible */}
      <Collapsible open={combustiveisOpen} onOpenChange={setCombustiveisOpen}>
        <Card className="border-l-4 border-l-amber-500">
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Fuel className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Preços de Combustíveis</CardTitle>
                    <CardDescription className="text-xs">Valores por litro (R$/L)</CardDescription>
                  </div>
                </div>
                {combustiveisOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { key: "preco_diesel", label: "Diesel", color: "bg-yellow-500" },
                  { key: "preco_etanol", label: "Etanol", color: "bg-green-500" },
                  { key: "preco_gasolina", label: "Gasolina", color: "bg-red-500" },
                  { key: "preco_eletrico", label: "Elétrico (kWh)", color: "bg-blue-500" },
                ].map(item => (
                  <div key={item.key} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <Label className="text-xs font-medium">{item.label}</Label>
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      value={combustiveis[item.key as keyof CombustiveisPrecos] || 0}
                      onChange={e => setCombustiveis(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="h-10"
                    />
                  </div>
                ))}
              </div>
              <Button onClick={saveCombustiveis} disabled={savingCombustiveis} className="mt-4" size="sm">
                <Save className="h-4 w-4 mr-2" />
                Salvar Preços
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Custos por Veículo */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Truck className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base">Custos por Tipo de Veículo</CardTitle>
                <CardDescription className="text-xs">{veiculos.length} veículo(s) cadastrado(s)</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => { setIsAddingVeiculo(true); setEditingVeiculo({ ...emptyVeiculo }); }}
              disabled={isAddingVeiculo || availableVehicleTypes.length === 0}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Veículo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Form de edição/adição */}
          {(isAddingVeiculo || editingVeiculo) && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  {editingVeiculo?.id ? "Editar Veículo" : "Novo Veículo"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Linha 1: Tipo e Combustível */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tipo de Veículo *</Label>
                    <Select
                      value={editingVeiculo?.tipo_veiculo || ""}
                      onValueChange={v => setEditingVeiculo(prev => prev ? { ...prev, tipo_veiculo: v } : null)}
                      disabled={!!editingVeiculo?.id}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVehicleTypes.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Combustível</Label>
                    <Select
                      value={editingVeiculo?.tipo_combustivel || "diesel"}
                      onValueChange={v => setEditingVeiculo(prev => prev ? { ...prev, tipo_combustivel: v } : null)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_COMBUSTIVEL.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Consumo (km/l)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={editingVeiculo?.consumo_medio || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, consumo_medio: Number(e.target.value) } : null)}
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Peso Máx. (kg)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={editingVeiculo?.peso_maximo_kg || 0}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, peso_maximo_kg: Number(e.target.value) } : null)}
                      className="h-10"
                    />
                  </div>
                </div>

                <Separator />

                {/* Linha 2: Custos Mensais */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Custos Mensais (R$)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Manutenção</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.custo_manutencao_mensal || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, custo_manutencao_mensal: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Funcionário</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.custo_funcionario_mensal || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, custo_funcionario_mensal: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Extras</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.extras || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, extras: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Horas/Mês</Label>
                      <Input type="number" step="1" value={editingVeiculo?.horas_mensais || 220}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, horas_mensais: Number(e.target.value) || 220 } : null)} className="h-10" />
                    </div>
                  </div>
                </div>

                {/* Linha 3: Custos por Dia/Viagem */}
                <div>
                  <Label className="text-xs text-muted-foreground mb-2 block">Custos por Dia/Viagem (R$)</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ajudante/Dia</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.valor_ajudante || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, valor_ajudante: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Refeição</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.valor_refeicao || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, valor_refeicao: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Pernoite/Pessoa</Label>
                      <Input type="number" step="0.01" value={editingVeiculo?.pernoite || 0}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, pernoite: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Jornada Base (h)</Label>
                      <Input type="number" step="0.5" value={editingVeiculo?.jornada_base_dia || 8}
                        onChange={e => setEditingVeiculo(prev => prev ? { ...prev, jornada_base_dia: Number(e.target.value) } : null)} className="h-10" />
                    </div>
                  </div>
                </div>

                {/* Linha 4: Hora Extra */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Adicional H.E. (%)</Label>
                    <Input type="number" step="1" value={editingVeiculo?.adic_hora_extra_perc ?? 50}
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, adic_hora_extra_perc: Number(e.target.value) } : null)} className="h-10" />
                  </div>
                  <div className="space-y-1.5 col-span-2 md:col-span-3">
                    <Label className="text-xs">Observações</Label>
                    <Input value={editingVeiculo?.observacoes || ""} 
                      onChange={e => setEditingVeiculo(prev => prev ? { ...prev, observacoes: e.target.value } : null)} 
                      placeholder="Observações adicionais" className="h-10" />
                  </div>
                </div>

                <Separator />

                {/* Fórmula de Frete */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Fórmula de Cálculo de Frete</Label>
                  <Select
                    value={editingVeiculo?.formula_frete?.id || "default_frete_completo"}
                    onValueChange={v => {
                      const formula = savedFormulas.find(f => f.id === v) || null;
                      setEditingVeiculo(prev => prev ? { ...prev, formula_frete: formula } : null);
                    }}
                  >
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Selecione uma fórmula" />
                    </SelectTrigger>
                    <SelectContent>
                      {savedFormulas.map(f => (
                        <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Crie novas fórmulas no simulador de frete clicando no ícone de calculadora
                  </p>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={saveVeiculo}>
                    <Save className="h-4 w-4 mr-1" />
                    Salvar Veículo
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditingVeiculo(null); setIsAddingVeiculo(false); }}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Lista de veículos em cards */}
          {veiculos.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {veiculos.map(v => (
                <Card 
                  key={v.id} 
                  className={`transition-all hover:shadow-md ${selectedVeiculoForSimulation === v.id ? "ring-2 ring-primary" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-sm">{getTipoVeiculoLabel(v.tipo_veiculo)}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {getTipoCombustivelLabel(v.tipo_combustivel)}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {v.consumo_medio} km/l
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant={selectedVeiculoForSimulation === v.id ? "default" : "outline"}
                          className="h-8 w-8"
                          onClick={() => setSelectedVeiculoForSimulation(selectedVeiculoForSimulation === v.id ? "" : v.id!)}
                          title="Simular Frete"
                        >
                          <Calculator className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8"
                          onClick={() => { setEditingVeiculo(v); setIsAddingVeiculo(false); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteVeiculoId(v.id!)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">Manutenção</span>
                        <span className="font-medium">{formatCurrency(v.custo_manutencao_mensal)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">Motorista</span>
                        <span className="font-medium">{formatCurrency(v.custo_funcionario_mensal)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">Extras</span>
                        <span className="font-medium">{formatCurrency(v.extras)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">Ajudante</span>
                        <span className="font-medium">{formatCurrency(v.valor_ajudante)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">Pernoite</span>
                        <span className="font-medium">{formatCurrency(v.pernoite)}</span>
                      </div>
                      <div className="bg-muted/50 rounded p-2">
                        <span className="text-muted-foreground block">H.E.</span>
                        <span className="font-medium">{v.adic_hora_extra_perc}%</span>
                      </div>
                    </div>

                    {v.formula_frete && (
                      <div className="mt-2 pt-2 border-t">
                        <span className="text-xs text-muted-foreground">Fórmula: </span>
                        <Badge variant="outline" className="text-xs">{v.formula_frete.nome}</Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
              <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum veículo cadastrado</p>
              <p className="text-xs">Clique em "Adicionar Veículo" para começar</p>
            </div>
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
        description="Tem certeza que deseja remover este veículo?"
      />
    </div>
  );
}
