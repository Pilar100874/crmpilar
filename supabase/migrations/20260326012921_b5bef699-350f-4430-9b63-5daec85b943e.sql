UPDATE public.chat_agents 
SET regras_busca_personalizada = '--- REGRAS DE BUSCA INTELIGENTE COM SUGESTÕES DE ALTERNATIVAS ---

O estoque contém dois tipos de produtos: **PAPÉIS GRÁFICOS FORMATADOS** (folhas cortadas com largura e comprimento definidos) e **BOBINAS** (rolos com largura definida, sem comprimento fixo — cortados sob demanda). Siga este fluxo OBRIGATÓRIO quando o usuário pedir um produto:

**ETAPA 1 - BUSCA EXATA NO FORMATO PEDIDO:**
Procure nos dados um produto que corresponda EXATAMENTE a todos os critérios (tipo, gramatura, largura, comprimento).
- Se encontrar: apresente e informe "✅ Encontrado exatamente o que você pediu!"

**ETAPA 2 - SEMPRE TRAZER ALTERNATIVAS PRÓXIMAS (MESMO QUE ENCONTRE EXATO):**
INDEPENDENTE de ter encontrado o produto exato ou não, SEMPRE apresente também o que existe de próximo, na seguinte ordem:

**2A - Alternativas em GRÁFICO (folhas prontas):**
- Busque papéis gráficos formatados com especificações próximas (±10% em gramatura, largura, comprimento)
- Priorize manter o tipo de material e variar as dimensões
- Para cada sugestão, indique a diferença vs. pedido original
- Se não encontrar nada próximo em gráfico, informe: "Sem alternativas em gráfico formatado."

**2B - Alternativas em BOBINA (conjugação de corte):**
- Busque bobinas do mesmo tipo e gramatura (ou gramatura ±10%)
- Verifique conjugação de corte — A largura da bobina permite cortar as medidas pedidas?
  - Ex: Pediu folha 50×70cm. Bobina de 70cm de largura → corta folhas de 70×50cm ✅
  - Ex: Pediu folha 50×70cm. Bobina de 100cm → corta 2 folhas de 50cm na largura ✅
  - Ex: Pediu folha 50×70cm. Bobina de 150cm → corta 2×70cm (140cm usados, 10cm perda) ou 3×50cm
- Calcule a PERDA de corte para cada opção:
  - Fórmula: Perda = (Largura bobina - (N × medida cortada)) / Largura bobina × 100%
- Apresente ordenado por menor perda
- Se não encontrar bobinas viáveis, informe: "Sem alternativas em bobina."

**ORDEM DE APRESENTAÇÃO OBRIGATÓRIA:**
Sempre apresente os resultados em SEÇÕES separadas nesta ordem:

📦 **RESULTADO EXATO** (se encontrou)
| Material | Formato | Gramatura | Largura | Comprimento | Diferença vs Pedido |

📋 **ALTERNATIVAS EM GRÁFICO** (próximos em folhas prontas)
| Material | Formato | Gramatura | Largura | Comprimento | Diferença vs Pedido |

🔄 **ALTERNATIVAS EM BOBINA** (conjugação de corte)
| Material | Formato | Gramatura | Largura Bobina | Corte | Qtd por largura | Perda | Diferença vs Pedido |

**IMPORTANTE:** Inclua TODAS as seções em uma ÚNICA tabela no bloco TABLE_DATA, usando a coluna "Seção" para separar:
- Seção: "Exato", "Gráfico Próximo" ou "Bobina→Corte"

**ETAPA 3 - BUSCA CRUZADA INVERSA (BOBINA → GRÁFICO):**
Se pediram uma bobina e não tem, verificar se há papéis gráficos formatados que atendam.

**ETAPA 4 - AMPLIAR TOLERÂNCIAS:**
Se nada foi encontrado com ±10%:
1. Amplie para ±20% e depois ±30%
2. Repita a busca em ambos os formatos (gráfico + bobina)
3. Informe: "📌 Os materiais mais próximos disponíveis são:" e liste-os

**ETAPA 5 - PERGUNTAR TOLERÂNCIA AO CLIENTE:**
Após apresentar as alternativas, SEMPRE pergunte:
- "📐 Você aceitaria medidas X% maiores ou menores? (ex: largura 5% maior, gramatura 10% menor)"
- "Posso buscar com uma tolerância diferente?"

**CÁLCULO DE "DIFERENÇA VS PEDIDO" — REGRA CRÍTICA:**
A coluna "Diferença vs Pedido" deve comparar as ESPECIFICAÇÕES RESULTANTES DO CORTE com o pedido original, NÃO a largura total da bobina.

- **Para produtos exatos:** "Exato"
- **Para Gráficos alternativos:** Mostrar a diferença real de cada dimensão. Ex: se pediu 220g e encontrou 230g → "Gramatura +10g (+4.5%)"
- **Para Bobina→Corte:** Mostrar a diferença do CORTE RESULTANTE vs pedido, NÃO a largura da bobina inteira.
  - Se o corte entrega exatamente a medida pedida → "Exato" (mesmo que a bobina seja maior)
  - Se o corte mais eficiente entrega medida diferente → mostrar a diferença do corte. Ex: pediu 600mm, melhor corte é 610mm → "Corte +10mm (+1.7%)"
  - NUNCA compare a largura total da bobina com a largura pedida. A bobina é a matéria-prima, não o produto final.

Exemplos corretos:
- Pediu 600mm. Bobina 1830mm cortando 3×600mm → Diferença: "Exato" (perda 1.64%)
- Pediu 600mm. Bobina 1830mm cortando 3×610mm → Diferença: "Corte +10mm (+1.7%)"

Exemplos ERRADOS (nunca faça isso):
- ❌ "Largura Bobina +205%" (comparar bobina 1830mm com pedido 600mm)

**LEGENDA:**
- Formato: "Gráfico" (folha pronta) ou "Bobina→Corte" (requer corte da bobina)
- Perda Corte: percentual de material desperdiçado no corte (só para bobinas)
- Diferença vs Pedido: variação das DIMENSÕES FINAIS ENTREGUES ao cliente comparadas com o pedido original

**REGRA FINAL:** Sempre pergunte: "Alguma dessas opções atende? Posso buscar com outros critérios ou tolerâncias diferentes?"

--- FIM DAS REGRAS DE BUSCA INTELIGENTE ---'
WHERE id = '25706f5c-d715-4338-a2db-a542e778e90e';