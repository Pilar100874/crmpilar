# 🎯 Integração Blockly com Sistema de Orçamento

## ✅ Como Funciona

### 1. Criar Regras Visuais
- Acesse `/editor-regras`
- Monte blocos visuais com condições e ações
- Clique em **"Exportar Regra"** dentro do editor
- Preencha nome, prioridade e status (ativa/inativa)
- Clique em **"Salvar no Sistema"**

### 2. As Regras São Salvas no Banco
- Tabela: `automacoes_vendas`
- Campos principais:
  - `nome`: Nome da regra
  - `ativo`: Se está ativa ou não
  - `prioridade`: Ordem de execução (maior = primeiro)
  - `flow_data`: JSON com XML e código gerado pelo Blockly

### 3. Aplicar Regras aos Orçamentos

```typescript
import { aplicarRegrasBlockly } from "@/services/blocklyAutomacaoEngine";
import { supabase } from "@/integrations/supabase/client";

// 1. Buscar regras ativas do estabelecimento
const { data: regras } = await supabase
  .from("automacoes_vendas")
  .select("*")
  .eq("estabelecimento_id", estabelecimentoId)
  .eq("ativo", true)
  .order("prioridade", { ascending: false });

// 2. Preparar dados do orçamento
const dadosOrcamento = {
  valor_total: 5000,
  quantidade_produtos: 10,
  mes_compra: 11, // Novembro
  cliente: {
    mes_aniversario: 11 // Novembro também
  }
};

// 3. Aplicar regras
const resultado = await aplicarRegrasBlockly(
  dadosOrcamento,
  regras || []
);

// 4. Usar resultado
console.log("Valor original:", resultado.valorOriginal);
console.log("Valor final:", resultado.valorFinal);
console.log("Descontos aplicados:", resultado.descontos);
console.log("Regras que funcionaram:", resultado.regrasAplicadas);
console.log("Detalhes:", resultado.detalhes);
```

## 📦 Blocos Disponíveis

### Blocos de Orçamento (retornam valores)
- **valor_total**: Valor total do orçamento
- **mes_compra**: Mês da compra (1-12)
- **mes_aniversario**: Mês de aniversário do cliente (1-12)
- **quantidade_produtos**: Quantidade de produtos no orçamento

### Blocos de Ações (executam operações)
- **desconto_percentual**: Aplica desconto em %
- **desconto_fixo**: Aplica desconto em R$
- **adicionar_frete**: Adiciona valor de frete
- **enviar_alerta**: Registra um alerta/mensagem

### Blocos de Lógica (padrão Blockly)
- **controls_if**: Se/Então/Senão
- **logic_compare**: Comparações (=, >, <, >=, <=, !=)
- **logic_operation**: E / OU
- **math_number**: Números
- **math_arithmetic**: Operações (+, -, *, /)

## 🎨 Exemplo de Regra Visual

**Descrição**: "Se mês da compra = mês de aniversário do cliente, aplicar 10% de desconto"

**Blocos no Blockly**:
```
┌─ SE ─────────────────────────┐
│  mes_compra = mes_aniversario │
│  ENTÃO                         │
│  ┌─ aplicar desconto de 10% ─┐│
│  └────────────────────────────┘│
└────────────────────────────────┘
```

**Código gerado automaticamente**:
```javascript
if (orcamento.mes_compra == cliente.mes_aniversario) {
  aplicarDescontoPercentual(10);
}
```

## 🔄 Fluxo Completo

```
1. Usuário cria regra visual no editor
   ↓
2. Blockly gera XML + JavaScript automaticamente
   ↓
3. Regra é salva na tabela automacoes_vendas
   ↓
4. Na tela de orçamento, ao calcular:
   ↓
5. Sistema busca regras ativas
   ↓
6. Aplica cada regra ao orçamento
   ↓
7. Exibe valor final com descontos aplicados
```

## 🚀 Onde Integrar no Sistema de Orçamento

### Opção 1: No botão "Calcular Orçamento"
```typescript
const calcularOrcamento = async () => {
  // ... seu código atual de cálculo ...
  
  // ADICIONAR: Aplicar regras de automação
  const { data: regras } = await supabase
    .from("automacoes_vendas")
    .select("*")
    .eq("estabelecimento_id", estabelecimentoId)
    .eq("ativo", true)
    .order("prioridade", { ascending: false });

  if (regras && regras.length > 0) {
    const resultado = await aplicarRegrasBlockly(
      {
        valor_total: valorCalculado,
        quantidade_produtos: itens.length,
        mes_compra: new Date().getMonth() + 1,
        cliente: {
          mes_aniversario: clienteSelecionado?.mes_aniversario
        }
      },
      regras.map(r => ({
        ...r,
        ...r.flow_data as any
      }))
    );
    
    // Atualizar valor do orçamento
    setValorFinal(resultado.valorFinal);
    setDescontosAplicados(resultado.descontos);
    
    // Mostrar toast com regras aplicadas
    if (resultado.regrasAplicadas.length > 0) {
      toast.success(
        `${resultado.regrasAplicadas.length} regra(s) aplicada(s)!`
      );
    }
  }
};
```

### Opção 2: Hook useEffect automático
```typescript
useEffect(() => {
  if (valorTotal > 0) {
    aplicarAutomacoes();
  }
}, [valorTotal, itens, clienteSelecionado]);
```

## 📊 Visualizar Regras Aplicadas

```typescript
// No componente de orçamento, mostrar quais regras foram aplicadas:
{resultado?.regrasAplicadas.length > 0 && (
  <Card className="p-4 bg-green-50">
    <h3 className="font-semibold mb-2">Automações Aplicadas</h3>
    <ul className="space-y-1">
      {resultado.regrasAplicadas.map((regra, i) => (
        <li key={i} className="text-sm">✓ {regra}</li>
      ))}
    </ul>
    <div className="mt-3 pt-3 border-t">
      {resultado.descontos.map((desc, i) => (
        <div key={i} className="text-sm">
          {desc.regra}: -R$ {desc.valor.toFixed(2)}
        </div>
      ))}
    </div>
  </Card>
)}
```

## 🎯 Próximos Passos

1. ✅ **Criar regras** no `/editor-regras`
2. ✅ **Salvar no banco** (já implementado)
3. ⚙️ **Integrar na tela de orçamento** (adicione o código acima)
4. 📈 **Testar** com diferentes cenários
5. 🎨 **Criar mais blocos customizados** conforme necessidade

## 💡 Vantagens

- ✨ **Visual**: Não precisa programar
- 🔄 **Dinâmico**: Altere regras sem mexer no código
- 📊 **Rastreável**: Veja quais regras foram aplicadas
- 🎯 **Priorizado**: Controle ordem de execução
- 🔒 **Seguro**: Ativa/desativa sem deletar
