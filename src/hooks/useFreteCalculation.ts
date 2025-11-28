// Hook para cálculo de custo de frete
// Implementa as fórmulas especificadas pelo usuário

export interface VeiculoConfig {
  manutencaoMensal: number;      // R$ - custo mensal de manutenção, pneus, óleo
  extrasMensais: number;         // R$ - seguro, depreciação, licenciamento etc
  salarioMotorista: number;      // R$ - salário mensal do motorista com encargos
  valorAjudanteDia: number;      // R$ - custo por dia do ajudante
  valorRefeicao: number;         // R$ - valor da refeição por pessoa
  valorCombustivel: number;      // R$ - preço do combustível por litro
  mediaConsumo: number;          // km/l - média de consumo do veículo
  pernoite: number;              // R$ - valor da pernoite por pessoa
  adicHoraExtraPerc: number;     // % - adicional de hora extra (ex: 50 = 50%)
  jornadaBaseDia: number;        // horas - jornada normal antes de hora extra
  horasMensais: number;          // horas mensais de trabalho (padrão 220h)
}

export interface ViagemInput {
  tempoViagem: number;           // horas - tempo total da viagem
  kmViagem: number;              // km - distância da viagem somente na ida
  consideraIdaVolta: boolean;    // true para ida+volta, false para só ida
  numAjudantes: number;          // quantidade de ajudantes
  pedagioTotal: number;          // R$ - valor total de pedágios
}

export interface FreteResult {
  kmTotal: number;
  custoCombustivel: number;
  custoFixosViagem: number;
  custoHorasNormais: number;
  custoHorasExtras: number;
  custoAjudantes: number;
  custoPernoite: number;
  custoRefeicao: number;
  custoPedagio: number;
  custoTotal: number;
  detalhes: {
    custoFixoMensal: number;
    custoFixoHora: number;
    custoHoraMotorista: number;
    horasNormais: number;
    horasExtras: number;
    fatorExtra: number;
    numFuncionarios: number;
    refeicoesPorPessoa: number;
  };
}

export function calculateFreteCost(
  config: VeiculoConfig,
  viagem: ViagemInput
): FreteResult {
  // 1. Km total
  const kmTotal = viagem.kmViagem * (viagem.consideraIdaVolta ? 2 : 1);

  // 2. Combustível
  const custoCombustivel = (kmTotal / config.mediaConsumo) * config.valorCombustivel;

  // 3. Custos fixos rateados por tempo
  const custoFixoMensal = config.manutencaoMensal + config.extrasMensais;
  const custoFixoHora = custoFixoMensal / config.horasMensais;
  const custoFixosViagem = viagem.tempoViagem * custoFixoHora;

  // 4. Custo de motorista (por hora)
  const custoHoraMotorista = config.salarioMotorista / config.horasMensais;

  // 5. Horas normais e extras
  const horasNormais = Math.min(viagem.tempoViagem, config.jornadaBaseDia);
  const horasExtras = Math.max(0, viagem.tempoViagem - config.jornadaBaseDia);
  const fatorExtra = 1 + (config.adicHoraExtraPerc / 100);

  // 6. Custo de horas trabalhadas
  const custoHorasNormais = horasNormais * custoHoraMotorista;
  const custoHorasExtras = horasExtras * custoHoraMotorista * fatorExtra;

  // 7. Custo de ajudantes (por dia)
  const custoAjudantes = config.valorAjudanteDia * viagem.numAjudantes;

  // 8. Pernoite (TempoViagem > 12h)
  const numFuncionarios = 1 + viagem.numAjudantes;
  const custoPernoite = viagem.tempoViagem > 12 
    ? config.pernoite * numFuncionarios 
    : 0;

  // 9. Refeição (1 refeição a cada 8h de viagem por pessoa)
  const refeicoesPorPessoa = Math.ceil(viagem.tempoViagem / 8);
  const custoRefeicao = numFuncionarios * refeicoesPorPessoa * config.valorRefeicao;

  // 10. Pedágio
  const custoPedagio = viagem.pedagioTotal;

  // 11. Custo total da viagem
  const custoTotal = 
    custoCombustivel +
    custoFixosViagem +
    custoHorasNormais +
    custoHorasExtras +
    custoAjudantes +
    custoPernoite +
    custoRefeicao +
    custoPedagio;

  return {
    kmTotal,
    custoCombustivel,
    custoFixosViagem,
    custoHorasNormais,
    custoHorasExtras,
    custoAjudantes,
    custoPernoite,
    custoRefeicao,
    custoPedagio,
    custoTotal,
    detalhes: {
      custoFixoMensal,
      custoFixoHora,
      custoHoraMotorista,
      horasNormais,
      horasExtras,
      fatorExtra,
      numFuncionarios,
      refeicoesPorPessoa,
    },
  };
}

// Fórmulas em formato legível para exibição
export const FORMULAS_FRETE = {
  kmTotal: {
    nome: "Km Total",
    formula: "KmViagem × (IdaVolta ? 2 : 1)",
    descricao: "Distância total considerando ida e volta"
  },
  combustivel: {
    nome: "Combustível",
    formula: "(KmTotal / MediaConsumo) × ValorCombustivel",
    descricao: "Custo do combustível baseado no consumo"
  },
  custosFixos: {
    nome: "Custos Fixos",
    formula: "TempoViagem × (ManutencaoMensal + Extras) / HorasMensais",
    descricao: "Custos fixos rateados pelo tempo da viagem"
  },
  horasNormais: {
    nome: "Horas Normais",
    formula: "min(TempoViagem, JornadaBase) × (Salario / HorasMensais)",
    descricao: "Custo das horas dentro da jornada normal"
  },
  horasExtras: {
    nome: "Horas Extras",
    formula: "max(0, TempoViagem - JornadaBase) × CustoHora × FatorExtra",
    descricao: "Custo das horas além da jornada normal"
  },
  ajudantes: {
    nome: "Ajudantes",
    formula: "ValorAjudante × NumAjudantes",
    descricao: "Custo dos ajudantes por dia"
  },
  pernoite: {
    nome: "Pernoite",
    formula: "TempoViagem > 12h ? Pernoite × NumFuncionarios : 0",
    descricao: "Custo de pernoite se viagem > 12h"
  },
  refeicao: {
    nome: "Refeição",
    formula: "NumFuncionarios × ceil(TempoViagem / 8) × ValorRefeicao",
    descricao: "1 refeição a cada 8h por pessoa"
  },
  pedagio: {
    nome: "Pedágio",
    formula: "PedagioTotal",
    descricao: "Valor total de pedágios"
  },
  total: {
    nome: "Custo Total",
    formula: "Soma de todos os custos",
    descricao: "Combustível + Fixos + Horas + Ajudantes + Pernoite + Refeição + Pedágio"
  }
};

// Função para calcular todos os valores intermediários para o FormulaBuilder
export function calculateFormulaValues(
  config: VeiculoConfig,
  viagem: ViagemInput
): Record<string, number> {
  // Valores da viagem
  const idaVolta = viagem.consideraIdaVolta ? 2 : 1;
  const kmTotal = viagem.kmViagem * idaVolta;
  
  // Valores calculados do veículo
  const custoFixoMensal = config.manutencaoMensal + config.extrasMensais;
  const custoFixoHora = custoFixoMensal / config.horasMensais;
  const custoHoraMotorista = config.salarioMotorista / config.horasMensais;
  
  // Horas
  const horasNormais = Math.min(viagem.tempoViagem, config.jornadaBaseDia);
  const horasExtras = Math.max(0, viagem.tempoViagem - config.jornadaBaseDia);
  const fatorExtra = 1 + (config.adicHoraExtraPerc / 100);
  
  // Funcionários
  const numFuncionarios = 1 + viagem.numAjudantes;
  const refeicoesPorPessoa = Math.ceil(viagem.tempoViagem / 8);
  
  // Custos individuais
  const custoCombustivel = (kmTotal / config.mediaConsumo) * config.valorCombustivel;
  const custoFixosViagem = viagem.tempoViagem * custoFixoHora;
  const custoHorasNormais = horasNormais * custoHoraMotorista;
  const custoHorasExtras = horasExtras * custoHoraMotorista * fatorExtra;
  const custoAjudantes = config.valorAjudanteDia * viagem.numAjudantes;
  const custoPernoite = viagem.tempoViagem > 12 ? config.pernoite * numFuncionarios : 0;
  const custoRefeicao = numFuncionarios * refeicoesPorPessoa * config.valorRefeicao;
  
  return {
    // Configuração do veículo
    manutencaoMensal: config.manutencaoMensal,
    extrasMensais: config.extrasMensais,
    salarioMotorista: config.salarioMotorista,
    valorAjudanteDia: config.valorAjudanteDia,
    valorRefeicao: config.valorRefeicao,
    valorCombustivel: config.valorCombustivel,
    mediaConsumo: config.mediaConsumo,
    pernoite: config.pernoite,
    adicHoraExtraPerc: config.adicHoraExtraPerc,
    jornadaBaseDia: config.jornadaBaseDia,
    horasMensais: config.horasMensais,
    // Variáveis da viagem
    tempoViagem: viagem.tempoViagem,
    kmViagem: viagem.kmViagem,
    numAjudantes: viagem.numAjudantes,
    pedagioTotal: viagem.pedagioTotal,
    idaVolta,
    // Variáveis calculadas
    kmTotal,
    custoFixoHora,
    custoHoraMotorista,
    horasNormais,
    horasExtras,
    fatorExtra,
    numFuncionarios,
    refeicoesPorPessoa,
    // Custos individuais
    custoCombustivel,
    custoFixosViagem,
    custoHorasNormais,
    custoHorasExtras,
    custoAjudantes,
    custoPernoite,
    custoRefeicao,
  };
}
