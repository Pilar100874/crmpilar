/**
 * Engine de Automação baseado em Flow Visual
 * 
 * Executa regras visuais criadas no editor de automações aos orçamentos
 */

import { AutomacaoVendasFlowData } from "@/types/automacaoVendas";

export interface DadosOrcamento {
  valor_total: number;
  quantidade_produtos: number;
  data_compra: Date;
  cliente?: {
    id: string;
    mes_aniversario?: number;
  };
  empresa_id?: string;
  vendedor_id?: string;
}

export interface ResultadoAutomacao {
  regrasAplicadas: string[];
  descontos: Array<{ tipo: string; valor: number; percentual?: number; regra: string }>;
  valorOriginal: number;
  valorFinal: number;
  detalhes: string[];
}

export interface AutomacaoVendas {
  id: string;
  nome: string;
  ativo: boolean;
  prioridade: number;
  flow_data: AutomacaoVendasFlowData;
}

/**
 * Aplica regras de automação visual ao orçamento
 */
export async function aplicarRegrasAutomacao(
  orcamento: DadosOrcamento,
  regras: AutomacaoVendas[],
  config?: { nao_acumular_descontos?: boolean }
): Promise<ResultadoAutomacao> {
  const resultado: ResultadoAutomacao = {
    regrasAplicadas: [],
    descontos: [],
    valorOriginal: orcamento.valor_total,
    valorFinal: orcamento.valor_total,
    detalhes: []
  };

  // Ordenar por prioridade (maior primeiro)
  const regrasOrdenadas = regras
    .filter(r => r.ativo)
    .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));

  // Se configurado para não acumular, coletar todos os descontos e aplicar apenas o maior
  if (config?.nao_acumular_descontos) {
    let maiorDesconto = { valor: 0, regra: '', percentual: 0, detalhes: '' };
    
    for (const regra of regrasOrdenadas) {
      try {
        const resultadoRegra = await executarRegra(orcamento, regra, resultado.valorOriginal);
        
        if (resultadoRegra.aplicada && resultadoRegra.descontos.length > 0) {
          const descontoRegra = resultadoRegra.descontos[0];
          if (descontoRegra.valor > maiorDesconto.valor) {
            maiorDesconto = {
              valor: descontoRegra.valor,
              regra: regra.nome,
              percentual: descontoRegra.percentual || 0,
              detalhes: resultadoRegra.detalhes[0] || ''
            };
          }
        }
      } catch (error) {
        console.error(`Erro ao avaliar regra ${regra.nome}:`, error);
      }
    }
    
    if (maiorDesconto.valor > 0) {
      resultado.regrasAplicadas.push(maiorDesconto.regra);
      resultado.descontos.push({
        tipo: 'percentual',
        valor: maiorDesconto.valor,
        percentual: maiorDesconto.percentual,
        regra: maiorDesconto.regra
      });
      resultado.valorFinal = resultado.valorOriginal - maiorDesconto.valor;
      resultado.detalhes.push(maiorDesconto.detalhes);
      resultado.detalhes.push(`⚠️ Modo "não acumular" ativado: aplicado apenas o maior desconto`);
    }
  } else {
    // Aplicar cada regra acumulando os descontos
    for (const regra of regrasOrdenadas) {
      try {
        const resultadoRegra = await executarRegra(orcamento, regra, resultado.valorFinal);
        
        if (resultadoRegra.aplicada) {
          resultado.regrasAplicadas.push(regra.nome);
          resultado.descontos.push(...resultadoRegra.descontos);
          resultado.valorFinal = resultadoRegra.valorFinal;
          resultado.detalhes.push(...resultadoRegra.detalhes);
        }
      } catch (error) {
        console.error(`Erro ao aplicar regra ${regra.nome}:`, error);
        resultado.detalhes.push(`ERRO na regra ${regra.nome}: ${error}`);
      }
    }
  }

  return resultado;
}

/**
 * Executa uma regra específica
 */
async function executarRegra(
  orcamento: DadosOrcamento,
  regra: AutomacaoVendas,
  valorAtual: number
): Promise<{
  aplicada: boolean;
  descontos: Array<{ tipo: string; valor: number; percentual?: number; regra: string }>;
  valorFinal: number;
  detalhes: string[];
}> {
  const resultado = {
    aplicada: false,
    descontos: [] as Array<{ tipo: string; valor: number; percentual?: number; regra: string }>,
    valorFinal: valorAtual,
    detalhes: [] as string[]
  };

  const { nodes, edges } = regra.flow_data;

  // Encontrar o bloco inicial
  const blocoInicial = nodes.find(n => (n.data as any).type === 'iniciar_validacao');
  if (!blocoInicial) {
    console.warn(`Regra ${regra.nome} não tem bloco inicial`);
    return resultado;
  }

  // Processar o fluxo a partir do bloco inicial
  let blocoAtual = blocoInicial;
  let continuar = true;

  while (continuar && blocoAtual) {
    const tipoBlo = (blocoAtual.data as any).type;
    const configBloco = (blocoAtual.data as any).config || {};

    // Executar ação do bloco
    switch (tipoBlo) {
      case 'iniciar_validacao':
        // Bloco inicial, apenas continua
        resultado.aplicada = true;
        break;

      case 'desconto_valor_compra':
        // Desconto no valor total
        const percentual = configBloco.percentual || 5;
        const valorDesconto = (resultado.valorFinal * percentual) / 100;
        
        resultado.descontos.push({
          tipo: 'percentual',
          valor: valorDesconto,
          percentual: percentual,
          regra: regra.nome
        });
        
        resultado.valorFinal -= valorDesconto;
        resultado.detalhes.push(
          `${regra.nome}: Desconto de ${percentual}% aplicado - R$ ${valorDesconto.toFixed(2)}`
        );
        break;

      case 'validar_empresa':
        // Validar se é uma empresa específica
        if (configBloco.empresaId && orcamento.empresa_id !== configBloco.empresaId) {
          // Se não é a empresa correta, parar execução
          continuar = false;
          resultado.aplicada = false;
          return resultado;
        }
        break;

      case 'validar_usuario':
        // Validar se é um usuário específico
        if (configBloco.usuarioId && orcamento.vendedor_id !== configBloco.usuarioId) {
          // Se não é o vendedor correto, parar execução
          continuar = false;
          resultado.aplicada = false;
          return resultado;
        }
        break;

      case 'valida_faixa_faturamento':
        // Validar faixa de faturamento
        const faixas = configBloco.faixas || [];
        const valorTotal = orcamento.valor_total;
        
        // Encontrar a faixa correspondente
        let faixaEncontrada = -1;
        for (let i = 0; i < faixas.length; i++) {
          const faixa = faixas[i];
          const dentroDoMin = valorTotal >= faixa.min;
          const dentroDoMax = faixa.max === null || valorTotal <= faixa.max;
          
          if (dentroDoMin && dentroDoMax) {
            faixaEncontrada = i;
            resultado.detalhes.push(
              `${regra.nome}: Valor R$ ${valorTotal.toFixed(2)} está na faixa "${faixa.label}"`
            );
            break;
          }
        }
        
        if (faixaEncontrada >= 0) {
          // Encontrar próximo bloco conectado a essa faixa específica
          const proximaConexao = edges.find(
            e => e.source === blocoAtual.id && e.sourceHandle === `faixa-${faixaEncontrada}`
          );
          
          if (proximaConexao) {
            blocoAtual = nodes.find(n => n.id === proximaConexao.target) || null;
            continue; // Pular a lógica padrão de encontrar próximo bloco
          } else {
            // Nenhuma conexão para essa faixa, parar execução
            resultado.detalhes.push(
              `${regra.nome}: Nenhuma ação configurada para a faixa "${faixas[faixaEncontrada].label}"`
            );
            continuar = false;
          }
        } else {
          // Valor não se encaixa em nenhuma faixa
          resultado.detalhes.push(
            `${regra.nome}: Valor R$ ${valorTotal.toFixed(2)} não se encaixa em nenhuma faixa configurada`
          );
          continuar = false;
          resultado.aplicada = false;
          return resultado;
        }
        break;

      case 'fim':
        // Fim do fluxo
        continuar = false;
        break;

      case 'disparar_push':
        // Dispara push notification (fire-and-forget para não travar o cálculo do orçamento)
        try {
          const { executarBlocoPush } = await import('@/lib/pushExecutor');
          executarBlocoPush(configBloco as any, {
            variaveis: { orcamento, cliente: orcamento.cliente, regra: regra.nome },
            workflow_id: regra.id,
            workflow_tipo: 'vendas',
            origem: 'automacao_vendas',
          }).catch((e) => console.error('[vendas] push falhou:', e));
          resultado.detalhes.push(`${regra.nome}: push disparado`);
        } catch (e) {
          console.error('[vendas] push erro', e);
        }
        break;

      default:
        console.warn(`Tipo de bloco não implementado: ${tipoBlo}`);
    }

    if (!continuar) break;

    // Encontrar próximo bloco
    const proximaConexao = edges.find(e => e.source === blocoAtual.id);
    if (proximaConexao) {
      blocoAtual = nodes.find(n => n.id === proximaConexao.target) || null;
    } else {
      // Não há mais conexões, terminar
      continuar = false;
    }
  }

  return resultado;
}

/**
 * Formata o resultado da automação para exibição
 */
export function formatarResultado(resultado: ResultadoAutomacao): string {
  if (resultado.regrasAplicadas.length === 0) {
    return 'Nenhuma regra aplicada';
  }

  const linhas = [
    `Regras aplicadas: ${resultado.regrasAplicadas.join(', ')}`,
    `Valor original: R$ ${resultado.valorOriginal.toFixed(2)}`,
    `Valor final: R$ ${resultado.valorFinal.toFixed(2)}`,
    `Desconto total: R$ ${(resultado.valorOriginal - resultado.valorFinal).toFixed(2)}`
  ];

  if (resultado.detalhes.length > 0) {
    linhas.push('\nDetalhes:');
    linhas.push(...resultado.detalhes.map(d => `  - ${d}`));
  }

  return linhas.join('\n');
}
