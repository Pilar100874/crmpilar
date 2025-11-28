import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calculator, Truck, Clock, Users, Fuel, Hotel, Utensils, Route, DollarSign, Info } from "lucide-react";
import { calculateFreteCost, VeiculoConfig, ViagemInput, FreteResult, FORMULAS_FRETE } from "@/hooks/useFreteCalculation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface FreteSimulatorProps {
  veiculoConfig: Partial<VeiculoConfig>;
  valorCombustivel: number;
}

export function FreteSimulator({ veiculoConfig, valorCombustivel }: FreteSimulatorProps) {
  // Valores de configuração do veículo (preenchidos da tela de configuração)
  const [config, setConfig] = useState<VeiculoConfig>({
    manutencaoMensal: veiculoConfig.manutencaoMensal || 0,
    extrasMensais: veiculoConfig.extrasMensais || 0,
    salarioMotorista: veiculoConfig.salarioMotorista || 0,
    valorAjudanteDia: veiculoConfig.valorAjudanteDia || 0,
    valorRefeicao: veiculoConfig.valorRefeicao || 0,
    valorCombustivel: valorCombustivel || 0,
    mediaConsumo: veiculoConfig.mediaConsumo || 1,
    pernoite: veiculoConfig.pernoite || 0,
    adicHoraExtraPerc: veiculoConfig.adicHoraExtraPerc || 50,
    jornadaBaseDia: veiculoConfig.jornadaBaseDia || 8,
    horasMensais: veiculoConfig.horasMensais || 220,
  });

  // Valores da viagem (inputs manuais para simulação)
  const [viagem, setViagem] = useState<ViagemInput>({
    tempoViagem: 0,
    kmViagem: 0,
    consideraIdaVolta: true,
    numAjudantes: 0,
    pedagioTotal: 0,
  });

  // Atualiza config quando props mudam
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      manutencaoMensal: veiculoConfig.manutencaoMensal || prev.manutencaoMensal,
      extrasMensais: veiculoConfig.extrasMensais || prev.extrasMensais,
      salarioMotorista: veiculoConfig.salarioMotorista || prev.salarioMotorista,
      valorAjudanteDia: veiculoConfig.valorAjudanteDia || prev.valorAjudanteDia,
      valorRefeicao: veiculoConfig.valorRefeicao || prev.valorRefeicao,
      valorCombustivel: valorCombustivel || prev.valorCombustivel,
      mediaConsumo: veiculoConfig.mediaConsumo || prev.mediaConsumo || 1,
      pernoite: veiculoConfig.pernoite || prev.pernoite,
      adicHoraExtraPerc: veiculoConfig.adicHoraExtraPerc ?? prev.adicHoraExtraPerc,
      jornadaBaseDia: veiculoConfig.jornadaBaseDia || prev.jornadaBaseDia,
      horasMensais: veiculoConfig.horasMensais || prev.horasMensais,
    }));
  }, [veiculoConfig, valorCombustivel]);

  // Calcula resultado
  const result: FreteResult | null = useMemo(() => {
    if (config.mediaConsumo <= 0) return null;
    return calculateFreteCost(config, viagem);
  }, [config, viagem]);

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const FormulaTooltip = ({ formulaKey }: { formulaKey: keyof typeof FORMULAS_FRETE }) => {
    const formula = FORMULAS_FRETE[formulaKey];
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-3 w-3 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p className="font-medium">{formula.nome}</p>
            <p className="text-xs text-muted-foreground font-mono">{formula.formula}</p>
            <p className="text-xs mt-1">{formula.descricao}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Simulador de Custo de Frete
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna de Inputs */}
          <div className="space-y-4">
            {/* Dados da Viagem */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Dados da Viagem
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Km (só ida)</Label>
                  <Input
                    type="number"
                    step="1"
                    value={viagem.kmViagem}
                    onChange={e => setViagem(prev => ({ ...prev, kmViagem: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tempo (horas)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={viagem.tempoViagem}
                    onChange={e => setViagem(prev => ({ ...prev, tempoViagem: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nº Ajudantes</Label>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    value={viagem.numAjudantes}
                    onChange={e => setViagem(prev => ({ ...prev, numAjudantes: Number(e.target.value) }))}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Pedágio Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={viagem.pedagioTotal}
                    onChange={e => setViagem(prev => ({ ...prev, pedagioTotal: Number(e.target.value) }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Switch
                  checked={viagem.consideraIdaVolta}
                  onCheckedChange={v => setViagem(prev => ({ ...prev, consideraIdaVolta: v }))}
                />
                <Label className="text-xs">Ida e Volta</Label>
              </div>
            </div>

            <Separator />

            {/* Configuração do Veículo (editável) */}
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Configuração (ajuste se necessário)
              </h4>
              <ScrollArea className="h-[280px] pr-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Manutenção Mensal (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.manutencaoMensal}
                      onChange={e => setConfig(prev => ({ ...prev, manutencaoMensal: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Extras Mensais (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.extrasMensais}
                      onChange={e => setConfig(prev => ({ ...prev, extrasMensais: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Salário Motorista (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.salarioMotorista}
                      onChange={e => setConfig(prev => ({ ...prev, salarioMotorista: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ajudante/Dia (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.valorAjudanteDia}
                      onChange={e => setConfig(prev => ({ ...prev, valorAjudanteDia: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Refeição (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.valorRefeicao}
                      onChange={e => setConfig(prev => ({ ...prev, valorRefeicao: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Combustível (R$/L)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.valorCombustivel}
                      onChange={e => setConfig(prev => ({ ...prev, valorCombustivel: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Consumo Médio (km/l)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={config.mediaConsumo}
                      onChange={e => setConfig(prev => ({ ...prev, mediaConsumo: Number(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Pernoite (R$/pessoa)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={config.pernoite}
                      onChange={e => setConfig(prev => ({ ...prev, pernoite: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Adicional H.E. (%)</Label>
                    <Input
                      type="number"
                      step="1"
                      value={config.adicHoraExtraPerc}
                      onChange={e => setConfig(prev => ({ ...prev, adicHoraExtraPerc: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Jornada Base (h/dia)</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={config.jornadaBaseDia}
                      onChange={e => setConfig(prev => ({ ...prev, jornadaBaseDia: Number(e.target.value) }))}
                    />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label className="text-xs">Horas Mensais</Label>
                    <Input
                      type="number"
                      step="1"
                      value={config.horasMensais}
                      onChange={e => setConfig(prev => ({ ...prev, horasMensais: Number(e.target.value) || 220 }))}
                    />
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Coluna de Resultados */}
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Resultado da Simulação
              </h4>
              
              {result ? (
                <div className="space-y-2">
                  {/* Km Total */}
                  <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Route className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Km Total</span>
                      <FormulaTooltip formulaKey="kmTotal" />
                    </div>
                    <Badge variant="outline">{result.kmTotal.toFixed(1)} km</Badge>
                  </div>

                  <Separator />

                  {/* Combustível */}
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Fuel className="h-4 w-4 text-amber-500" />
                      <span className="text-sm">Combustível</span>
                      <FormulaTooltip formulaKey="combustivel" />
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(result.custoCombustivel)}</span>
                  </div>

                  {/* Custos Fixos */}
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Custos Fixos</span>
                      <FormulaTooltip formulaKey="custosFixos" />
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(result.custoFixosViagem)}</span>
                  </div>

                  {/* Horas Normais */}
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Horas Normais ({result.detalhes.horasNormais.toFixed(1)}h)</span>
                      <FormulaTooltip formulaKey="horasNormais" />
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(result.custoHorasNormais)}</span>
                  </div>

                  {/* Horas Extras */}
                  {result.detalhes.horasExtras > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        <span className="text-sm">Horas Extras ({result.detalhes.horasExtras.toFixed(1)}h)</span>
                        <FormulaTooltip formulaKey="horasExtras" />
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(result.custoHorasExtras)}</span>
                    </div>
                  )}

                  {/* Ajudantes */}
                  {viagem.numAjudantes > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Ajudantes ({viagem.numAjudantes})</span>
                        <FormulaTooltip formulaKey="ajudantes" />
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(result.custoAjudantes)}</span>
                    </div>
                  )}

                  {/* Pernoite */}
                  {result.custoPernoite > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Hotel className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm">Pernoite ({result.detalhes.numFuncionarios} pessoas)</span>
                        <FormulaTooltip formulaKey="pernoite" />
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(result.custoPernoite)}</span>
                    </div>
                  )}

                  {/* Refeição */}
                  <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Utensils className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Refeição ({result.detalhes.refeicoesPorPessoa}x{result.detalhes.numFuncionarios})</span>
                      <FormulaTooltip formulaKey="refeicao" />
                    </div>
                    <span className="text-sm font-medium">{formatCurrency(result.custoRefeicao)}</span>
                  </div>

                  {/* Pedágio */}
                  {result.custoPedagio > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-2">
                        <Route className="h-4 w-4 text-cyan-500" />
                        <span className="text-sm">Pedágio</span>
                        <FormulaTooltip formulaKey="pedagio" />
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(result.custoPedagio)}</span>
                    </div>
                  )}

                  <Separator className="my-2" />

                  {/* Total */}
                  <div className="flex items-center justify-between p-3 rounded-md bg-primary/10 border border-primary/20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-primary" />
                      <span className="font-medium">CUSTO TOTAL</span>
                      <FormulaTooltip formulaKey="total" />
                    </div>
                    <span className="text-lg font-bold text-primary">{formatCurrency(result.custoTotal)}</span>
                  </div>

                  {/* Detalhes técnicos */}
                  <div className="mt-4 p-3 rounded-md bg-muted/30 text-xs text-muted-foreground space-y-1">
                    <p><strong>Custo Fixo/Hora:</strong> {formatCurrency(result.detalhes.custoFixoHora)}</p>
                    <p><strong>Custo Motorista/Hora:</strong> {formatCurrency(result.detalhes.custoHoraMotorista)}</p>
                    <p><strong>Fator H.E.:</strong> {result.detalhes.fatorExtra.toFixed(2)}x</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Configure o consumo médio para calcular</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
