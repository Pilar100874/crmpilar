# Tornar a Central de Atualizações confiável

## Objetivo
Garantir que a Central mostre somente capacidades reais, atualize cada aplicativo suportado e preserve chave, login, ambiente, módulos e demais configurações após a troca de versão.

## Situação encontrada
- Funcionam hoje, com mecanismos separados: Pilar Remotas, Pilar SMS, Pilar Controle e Coletor Windows/Linux.
- Pilar Automação tem atualização manual, mas não recebe comando da Central e nem aparece como equipamento.
- Pilar Fone não possui agente de atualização remota neste projeto; hoje aparece apenas como opção de filtro, sem equipamento ou comando correspondente.
- Há 6 telas Remotas, 1 celular e 1 Coletor cadastrados. Existem confirmações reais das Remotas e do Coletor, mas ainda nenhum comando de celular registrado.
- Atualizações Android preservam os dados quando substituem o mesmo aplicativo assinado pela mesma chave. O Coletor já mantém cópias da configuração fora da pasta de instalação.
- O fluxo não deve desinstalar, limpar dados nem redefinir módulos. Uma opção desabilitada deve continuar desabilitada.

## Implementação
1. **Inventário fiel na Central**
   - Incluir o Pilar Automação como equipamento vinculado à sua chave e dispositivo.
   - Remover Pilar Fone da lista de envio remoto enquanto não houver aplicativo/agente instalável compatível; apresentar seu estado real sem sugerir atualização inexistente.
   - Mostrar para cada sistema: versão instalada, versão disponível, último contato, etapa e mensagem de erro.

2. **Atualização remota do Pilar Automação**
   - Vincular cada chave de Automação a um dispositivo próprio, sem reutilizar aparelho de outra empresa.
   - Adicionar consulta periódica da fila, confirmação de recebimento/instalação/erro e confirmação final pela versão iniciada.
   - Usar o manifesto já publicado do Pilar Automação.

3. **Fortalecer SMS e Pilar Controle**
   - Manter a consulta periódica no SMS.
   - Fazer o Controle consultar a fila periodicamente, não somente ao abrir.
   - Registrar as etapas e erros; após reiniciar, confirmar a versão instalada.

4. **Fortalecer Remotas e Coletor**
   - Preservar o rollback existente do Remotas e seus dados de pareamento.
   - Autenticar também heartbeat e confirmação do Coletor pela chave do estabelecimento.
   - Evitar comandos presos indefinidamente, com prazo e estado de falha visível.
   - Preservar os arquivos externos do Coletor em Windows, Linux e ISO, incluindo valores `false` de módulos desabilitados.

5. **Garantia de configurações**
   - Antes de instalar, registrar um resumo não sensível da configuração esperada.
   - Após a nova versão abrir, conferir que chave, vínculo, ambiente e módulos mantiveram seus valores.
   - Nunca restaurar padrões sobre valores existentes; `false` deve continuar `false`.
   - Bloquear atualização se o pacote Android tiver identificador ou assinatura incompatível.

6. **Validação real**
   - Testar fila, consulta, confirmação, erro e expiração por tipo de aplicativo.
   - Testar atualização sobre uma instalação configurada com módulos mistos, verificando antes/depois.
   - Validar isolamento com dois estabelecimentos.
   - Só marcar cada aplicativo como funcional após compilação assinada e atualização instalada em equipamento de homologação.

## Resultado esperado
A Central ficará funcional para Remotas, SMS, Controle, Automação e Coletor Windows/Linux/ISO. Pilar Fone ficará identificado corretamente como sem atualização remota até existir um agente instalável próprio, sem promessa falsa na tela.
