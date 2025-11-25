/**
 * Motor de execução das regras de automação
 * 
 * Este arquivo contém a lógica para avaliar e aplicar as regras
 * criadas no editor visual aos orçamentos
 */

import type { RegraAutomacao, DadosOrcamento, ResultadoAutomacao, Condicao } from "@/types/automacaoVendas";

/**
 * Avalia uma condição individual
 */
function avaliarCondicao(condicao: Condicao, orcamento: DadosOrcamento): boolean {
  // Obter o valor do campo a ser comparado
  const valorCampo = obterValorCampo(condicao.field, orcamento);
  
  // Obter o valor de comparação
  let valorComparacao: any;
  if (condicao.valueSource) {
    valorComparacao = obterValorCampo(condicao.valueSource, orcamento);
  } else {
    valorComparacao = condicao.value;
  }

  // Executar a comparação baseada no operador
  switch (condicao.operator) {
    case ">":
      return valorCampo > valorComparacao;
    case ">=":
      return valorCampo >= valorComparacao;
    case "=":
      return valorCampo == valorComparacao; // == proposital para comparação flexível
    case "<":
      return valorCampo < valorComparacao;
    case "<=":
      return valorCampo <= valorComparacao;
    case "!=":
      return valorCampo != valorComparacao;
    default:
      return false;
  }
}

/**
 * Obtém o valor de um campo usando notação de ponto (ex: "cliente.mes_aniversario")
 */
function obterValorCampo(caminho: string, orcamento: DadosOrcamento): any {
  const partes = caminho.split(".");
  let valor: any = orcamento;

  for (const parte of partes) {
    if (valor && typeof valor === "object" && parte in valor) {
      valor = valor[parte];
    } else {
      return undefined;
    }
  }

  // Tratamento especial para datas
  if (caminho.includes("data_compra.mes") && valor instanceof Date) {
    return valor.getMonth() + 1; // getMonth() retorna 0-11, queremos 1-12
  }

  return valor;
}

/**
 * Avalia todas as condições de uma regra
 */
function avaliarCondicoes(regra: RegraAutomacao, orcamento: DadosOrcamento): boolean {
  if (regra.conditions.length === 0) return true;

  const resultados = regra.conditions.map(cond => avaliarCondicao(cond, orcamento));

  if (regra.logic === "AND") {
    return resultados.every(r => r === true);
  } else {
    // OR
    return resultados.some(r => r === true);
  }
}

/**
 * Aplica as ações de uma regra ao orçamento
 */
function aplicarAcoes(
  regra: RegraAutomacao,
  orcamento: DadosOrcamento,
  resultado: ResultadoAutomacao
): void {
  for (const acao of regra.actions) {
    switch (acao.type) {
      case "applyPercentageDiscount":
        if (acao.value) {
          const desconto = (orcamento.valor_total * acao.value) / 100;
          resultado.desconto_total += desconto;
          resultado.regras_aplicadas.push(`${regra.name}: Desconto de ${acao.value}%`);
        }
        break;

      case "applyFixedDiscount":
        if (acao.value) {
          resultado.desconto_total += acao.value;
          resultado.regras_aplicadas.push(`${regra.name}: Desconto fixo de R$ ${acao.value}`);
        }
        break;

      case "addShipping":
        if (acao.value) {
          resultado.frete_adicional += acao.value;
          resultado.regras_aplicadas.push(`${regra.name}: Frete adicional de R$ ${acao.value}`);
        }
        break;

      case "sendAlert":
        if (acao.message) {
          resultado.alertas.push(acao.message);
          resultado.regras_aplicadas.push(`${regra.name}: Alerta enviado`);
        }
        break;
    }
  }
}

/**
 * Função principal: aplica todas as regras a um orçamento
 * 
 * @param orcamento - Dados do orçamento
 * @param regras - Lista de regras de automação
 * @returns Resultado com descontos, fretes e alertas aplicados
 */
export function aplicarRegrasAutomacao(
  orcamento: DadosOrcamento,
  regras: RegraAutomacao[]
): ResultadoAutomacao {
  const resultado: ResultadoAutomacao = {
    regras_aplicadas: [],
    desconto_total: 0,
    frete_adicional: 0,
    alertas: [],
    valor_final: orcamento.valor_total,
  };

  // Filtrar apenas regras ativas
  const regrasAtivas = regras.filter(r => r.active);

  // Processar cada regra
  for (const regra of regrasAtivas) {
    // Verificar se as condições são atendidas
    if (avaliarCondicoes(regra, orcamento)) {
      // Aplicar as ações
      aplicarAcoes(regra, orcamento, resultado);
    }
  }

  // Calcular valor final
  resultado.valor_final = orcamento.valor_total - resultado.desconto_total + resultado.frete_adicional;

  return resultado;
}

/**
 * Gera uma descrição em texto de uma regra
 * Útil para mostrar ao usuário o que a regra faz
 */
export function gerarDescricaoRegra(regra: RegraAutomacao): string {
  let descricao = "SE ";

  // Descrever condições
  const condicoesTexto = regra.conditions.map(cond => {
    const campo = cond.field.split(".").pop();
    const operador = cond.operator;
    const valor = cond.valueSource || cond.value;
    return `${campo} ${operador} ${valor}`;
  });

  descricao += condicoesTexto.join(` ${regra.logic} `);
  descricao += " ENTÃO ";

  // Descrever ações
  const acoesTexto = regra.actions.map(acao => {
    switch (acao.type) {
      case "applyPercentageDiscount":
        return `aplicar desconto de ${acao.value}%`;
      case "applyFixedDiscount":
        return `aplicar desconto fixo de R$ ${acao.value}`;
      case "addShipping":
        return `adicionar frete de R$ ${acao.value}`;
      case "sendAlert":
        return `enviar alerta: "${acao.message}"`;
      default:
        return "";
    }
  });

  descricao += acoesTexto.join(" E ");

  return descricao;
}
