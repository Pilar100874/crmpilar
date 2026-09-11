# Concluir validação F01–F16

## Objetivo
Fechar as lacunas ainda encontradas no relatório, preservar os dados existentes e deixar claramente separado o que foi implementado, testado e implantado.

## Etapa 1 — Segurança e isolamento
- Criar uma nova migração para restringir a leitura dos registros de SMS e push ao próprio estabelecimento, mantendo acesso global apenas para administradores do sistema.
- Auditar registros de automação sem estabelecimento e administradores legados, sem alterar dados ambíguos automaticamente.
- Confirmar por consultas de segurança que usuários anônimos e autenticados não executam as funções SQL livres.
- Validar acesso com as contas disponíveis de estabelecimentos distintos, sem enviar SMS ou push reais.

## Etapa 2 — Funil e orçamentos
- Tornar a gravação de etapas do funil transacional no banco, incluindo criação, reordenação, movimentação de negócios e exclusão.
- Completar os filtros de status dos orçamentos.
- Carregar itens detalhados do orçamento somente ao abrir a edição, reduzindo o volume da listagem.
- Trocar a confirmação nativa de exclusão pelo diálogo acessível padrão e melhorar rótulos dos botões.

## Etapa 3 — Dashboard e recuperação
- Adicionar seleção de período, estado vazio e mensagem visível de erro ao Dashboard.
- Adicionar uma tela de recuperação para falhas no carregamento de módulos, com opção de tentar novamente.
- Completar estados vazios nas colunas de orçamentos.

## Etapa 4 — Instalação, qualidade e evidências
- Incluir lint no fluxo automatizado de validação.
- Ajustar a configuração do lint para o código legado de forma explícita, sem ocultar erros de compilação ou segurança, e corrigir os problemas relevantes dos arquivos alterados.
- Executar instalação congelada, verificação de tipos, lint, testes e build.
- Validar recarga e nova sessão sem gravações destrutivas.
- Atualizar o roteiro F01–F16 com: alteração, arquivos/migrações, teste, implantação e pendências reais.

## Limites de segurança
- Não serão enviados SMS, push ou comandos pagos sem destinatários e ambiente de teste fornecidos.
- Não serão criados ou modificados registros comerciais reais apenas para teste.
- Testes que exijam uma combinação de perfis inexistente serão registrados como bloqueados, sem fabricar permissões.

## Detalhes técnicos
- Toda mudança estrutural será uma migração nova, com RLS e grants revisados.
- A operação transacional do funil validará o estabelecimento e o papel no banco antes de modificar qualquer etapa.
- O resultado final distinguirá “implementado”, “testado” e “implantado”; código alterado sozinho não será tratado como conclusão.
