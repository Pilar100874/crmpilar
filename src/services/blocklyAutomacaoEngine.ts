/**
 * Engine de Automação baseado em Blockly
 * 
 * Aplica regras visuais criadas no editor Blockly aos orçamentos
 */

export interface RegraBlockly {
  id?: string;
  name: string;
  trigger: string;
  xml: string;
  code: string;
  ativo?: boolean;
  prioridade?: number;
}

export interface DadosOrcamento {
  valor_total: number;
  quantidade_produtos: number;
  mes_compra: number;
  cliente: {
    mes_aniversario?: number;
  };
}

export interface ResultadoAutomacao {
  regrasAplicadas: string[];
  descontos: Array<{ tipo: string; valor: number; regra: string }>;
  valorOriginal: number;
  valorFinal: number;
  detalhes: string[];
}

/**
 * Aplica regras de automação ao orçamento
 */
export async function aplicarRegrasBlockly(
  orcamento: DadosOrcamento,
  regras: RegraBlockly[]
): Promise<ResultadoAutomacao> {
  const resultado: ResultadoAutomacao = {
    regrasAplicadas: [],
    descontos: [],
    valorOriginal: orcamento.valor_total,
    valorFinal: orcamento.valor_total,
    detalhes: []
  };

  // Ordenar por prioridade
  const regrasOrdenadas = regras
    .filter(r => r.ativo !== false)
    .sort((a, b) => (b.prioridade || 0) - (a.prioridade || 0));

  // Contexto para execução do código gerado
  const contexto = {
    orcamento,
    cliente: orcamento.cliente,
    descontos: resultado.descontos,
    detalhes: resultado.detalhes,
    
    // Funções que os blocos podem chamar
    aplicarDescontoPercentual: (percentual: number) => {
      const valorDesconto = (resultado.valorFinal * percentual) / 100;
      resultado.descontos.push({
        tipo: 'percentual',
        valor: valorDesconto,
        regra: 'Desconto Percentual'
      });
      resultado.valorFinal -= valorDesconto;
      resultado.detalhes.push(`Desconto de ${percentual}% aplicado: R$ ${valorDesconto.toFixed(2)}`);
    },
    
    aplicarDescontoFixo: (valor: number) => {
      resultado.descontos.push({
        tipo: 'fixo',
        valor: valor,
        regra: 'Desconto Fixo'
      });
      resultado.valorFinal -= valor;
      resultado.detalhes.push(`Desconto fixo aplicado: R$ ${valor.toFixed(2)}`);
    },
    
    adicionarFrete: (valor: number) => {
      resultado.valorFinal += valor;
      resultado.detalhes.push(`Frete adicionado: R$ ${valor.toFixed(2)}`);
    },
    
    enviarAlerta: (mensagem: string) => {
      resultado.detalhes.push(`ALERTA: ${mensagem}`);
    },

    dispararPush: (titulo: string, corpo?: string, url?: string, destinatarioTipo: string = 'todos_usuarios') => {
      import('@/lib/pushExecutor').then(({ executarBlocoPush }) => {
        executarBlocoPush(
          { destinatario_tipo: destinatarioTipo as any, titulo, corpo, url },
          { variaveis: { orcamento, cliente: orcamento.cliente }, workflow_tipo: 'vendas', origem: 'blockly' },
        ).catch((e) => console.error('[blockly] push falhou:', e));
      });
      resultado.detalhes.push(`Push disparado: ${titulo}`);
    }
  };

  // Aplicar cada regra
  for (const regra of regrasOrdenadas) {
    try {
      // Executar código gerado pelo Blockly
      const funcao = new Function(
        'orcamento',
        'cliente',
        'aplicarDescontoPercentual',
        'aplicarDescontoFixo',
        'adicionarFrete',
        'enviarAlerta',
        'dispararPush',
        regra.code
      );

      funcao(
        contexto.orcamento,
        contexto.cliente,
        contexto.aplicarDescontoPercentual,
        contexto.aplicarDescontoFixo,
        contexto.adicionarFrete,
        contexto.enviarAlerta,
        contexto.dispararPush
      );

      resultado.regrasAplicadas.push(regra.name);
    } catch (error) {
      console.error(`Erro ao aplicar regra ${regra.name}:`, error);
      resultado.detalhes.push(`ERRO na regra ${regra.name}: ${error}`);
    }
  }

  return resultado;
}

/**
 * Gera descrição em texto da regra
 */
export function gerarDescricaoRegra(regra: RegraBlockly): string {
  // Analisar XML para gerar descrição legível
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(regra.xml, "text/xml");
  
  const descricoes: string[] = [];
  const blocos = xmlDoc.getElementsByTagName("block");
  
  for (let i = 0; i < blocos.length; i++) {
    const bloco = blocos[i];
    const tipo = bloco.getAttribute("type");
    
    switch (tipo) {
      case "desconto_percentual":
        descricoes.push("Aplicar desconto percentual");
        break;
      case "desconto_fixo":
        descricoes.push("Aplicar desconto fixo");
        break;
      case "adicionar_frete":
        descricoes.push("Adicionar valor de frete");
        break;
      case "logic_compare":
        descricoes.push("Verificar condição");
        break;
      case "controls_if":
        descricoes.push("Se condição então executar ação");
        break;
    }
  }
  
  return descricoes.length > 0 
    ? descricoes.join(" → ") 
    : "Regra sem descrição";
}
