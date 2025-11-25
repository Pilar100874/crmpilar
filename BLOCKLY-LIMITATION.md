# ⚠️ Limitação Importante: Google Blockly

## Problema
O Google Blockly oficial **NÃO FUNCIONA** neste projeto devido a um erro fatal de compilação:

```
runtime: goroutine stack exceeds 1000000000-byte limit
fatal error: stack overflow
```

## Bibliotecas Testadas que NÃO Funcionam
- ❌ `blockly` (oficial)
- ❌ `react-blockly` (wrapper que depende do blockly oficial)
- ❌ `blockly-react` (mesmo problema)

## Causa
O compilador TypeScript do Lovable entra em loop infinito ao processar os tipos complexos do Blockly, causando stack overflow.

## Soluções Alternativas

### 1. Sistema Custom com React Flow ✅
- Usar `@xyflow/react` (já instalado)
- Criar blocos visuais customizados
- Total controle sobre aparência e comportamento
- **Recomendado** para este projeto

### 2. Biblioteca Alternativa: Scratch Blocks
```bash
# Ainda não testado, mas pode funcionar
npm install scratch-blocks
```

### 3. Solução 100% Custom em React
- Implementar drag-and-drop com `react-dnd`
- Controle total sobre lógica
- Sem dependências externas problemáticas

## Decisão Recomendada
Manter/melhorar o sistema atual com React Flow, que:
- ✅ Já está funcionando
- ✅ Visual customizável
- ✅ Performance superior
- ✅ Sem problemas de compilação
- ✅ Total controle sobre funcionalidades
