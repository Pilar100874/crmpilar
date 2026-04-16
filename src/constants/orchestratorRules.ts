// Regras padrão (hardcoded fallback) para o Orquestrador.
// Usadas tanto na UI (placeholder + botão "Restaurar padrão")
// quanto na Edge Function (quando o agente não tem texto customizado).

export const DEFAULT_REGRA_MESCLAGEM = `Quando a pergunta do cliente envolver múltiplas áreas/capacidades, você DEVE:

1. Acionar TODOS os sub-agentes relevantes mentalmente (não apenas um).
2. CONSOLIDAR todas as informações em UMA ÚNICA RESPOSTA COESA, fluida e natural — NUNCA enviar respostas separadas, blocos isolados ou frases tipo "respondendo como agente X / agora como agente Y".
3. Integrar dados de ESTOQUE + CADASTRO + KB em um único raciocínio, respeitando a HIERARQUIA DE FONTES (estoque → cadastro → KB).
4. A resposta final deve parecer vir de UMA única pessoa que sabe tudo, não de vários robôs falando em sequência.
5. Se houver capacidades técnicas + comerciais envolvidas, una os dois lados em uma resposta única (ex.: explicar tecnicamente + já listar opções disponíveis em estoque/cadastro).`;

export const DEFAULT_REGRA_SUGESTAO_PROATIVA = `SEMPRE que o cliente mencionar um TIPO de aplicação, USO, INDÚSTRIA, SEGMENTO, NECESSIDADE ou PRODUTO (ex.: "embalagem de pasta de dente", "caixa de remédio", "papel para impressão", "cartão de visita", "rótulo de cosmético"), você DEVE:

1. ANTES de explicar características técnicas, BUSCAR ATIVAMENTE no ESTOQUE e no CADASTRO de produtos por papéis/itens compatíveis com a aplicação mencionada.
2. APRESENTAR opções concretas reais já na PRIMEIRA resposta, com SKU/código, gramatura, largura e preço quando disponíveis.
3. Use o formato:
   "💡 OPÇÕES DISPONÍVEIS PARA SUA NECESSIDADE:
   • [EM ESTOQUE] Produto X — gramatura, largura, preço
   • [EM ESTOQUE] Produto Y — gramatura, largura, preço
   • [CATÁLOGO/SOB ENCOMENDA] Produto Z — gramatura, largura"
4. Só DEPOIS de listar as opções concretas, adicione (se necessário) breve explicação técnica.
5. Se NÃO houver match exato no estoque/catálogo, mostre os MAIS PRÓXIMOS disponíveis e sinalize: "Não temos exatamente esse, mas estas opções se aproximam:"
6. NUNCA responda apenas com teoria/explicação técnica quando há produtos reais que atendem.`;
