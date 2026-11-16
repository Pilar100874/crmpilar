# Roadmap — Atendimento
## Precisão do estoque
- [x] Revisar consultas genéricas e catálogo de voz; validar saldo fracionado nas rotas alternativas
- [x] Saldo decimal aditivo e consumidores de produtos atualizados sem recalcular históricos
- [x] Validar entradas fracionadas, saída/devolução e leitura pela tela
## Navegação em formulários por etapas
- [x] Revisar assistentes restantes e proteger trocas internas em Marketing, Listas, Configurações e Atendimento; cancelar/descarte/reinício validado no Marketing
- [x] Avisar antes de trocar de módulo com preenchimento pendente, inclusive navegação por botões
- [x] Limpar rascunhos de entrada/saída de veículos ao sair e revisar demais assistentes
- [x] Testar permanência, descarte e reinício em celular e desktop
## Produtos e produção
- [x] Prioridade por grupo com setas e promoção direta; testes de leitura/ordem/cálculo e troca no celular em blocos/tabela
- [ ] Validar gravação/reabertura da prioridade pela tela — produto produzido disponível sem tipo fiscal obrigatório; não inventar classificação fiscal
- [x] Alinhar edição de produtos aos contatos e conferir todas as abas em celular, tablet e desktop
- [x] Revisar seleção, previsão, duplicação, colagem, importações e validações salvas das matérias-primas
- [x] Corrigir a rejeição genérica de matéria-prima na gravação e ao colar uma ficha
- [x] Impedir matérias-primas repetidas e permitir copiar/colar dados entre produtos
- [x] Adicionar funcionários extras por serviço na ficha de produção e validar gravação/reabertura no celular
- [x] Adicionar ícones às abas, metas por matéria-prima e setup de reposição por máquina; validar cálculo e gravação
- [x] Substituir regras de largura por compatibilidade e produção simultânea por matéria-prima/máquina; validar gravação e cálculo
- [x] Configurar larguras, rendimento simultâneo e restrições de matéria-prima por máquina; validar cálculo e persistência no celular
- [x] Ficha de produção com quantidade-base, materiais e substitutos com consumo próprio
- [x] Etapas sequenciais com máquinas alternativas, capacidade e cálculo de consumo/tempo
- [x] Validar gravação e reabertura da ficha de produção
- [x] Classificações de matéria-prima, produzido e comercializável e abas condicionais de produção/máquinas
- [x] Cadastros de máquinas e conhecimento dos usuários
- [x] Filtrar e bloquear produtos não comercializáveis nos orçamentos e validar o fluxo

- [x] Corrigir avanço após respostas curtas no roteiro de orçamento e limitar repetição por silêncio
- [ ] Validar captura de respostas curtas em ligação real — depende de instalar novos aparelhos compilados e atender o teste
- [x] Padronizar cabeçalhos e organização visual dos painéis do Atendimento
- [x] Painel comparativo de produtividade no menu Chats com registros reais
- [x] Minha jornada no Atendimento com evolução diária/mensal e pendências
- [x] Validar indicadores, autoria, permissões e uso em computador/celular
- [x] Aplicar prioridade e alerta de recados também aos responsáveis assumidos
- [x] Simplificar encaminhamento de recados com seleção/cadastro central e alerta urgente nos Agendados
- [x] Atualizar menu radial com atalhos úteis à fila e ao cliente ativo, sem cortes ou ações sem contexto
- [x] Corrigir busca do cabeçalho em todas as visualizações e manter a pesquisa ao abrir a agenda central
- [x] Abrir cadastros na área central com os mesmos formulários de Empresas e Contatos do Listas
- [x] Preservar regras do módulo Empresas e vincular automaticamente cadastros ao criador
- [x] Ajustar janela de puxar/criar cadastro no Atendimento
- [x] Corrigir filtro por contato/empresa em todas as abas da fila
- [x] Colocar filtro e criação ao lado do título Contatos
- [x] Ocultar menu Visita nos cartões e cabeçalho até existir endereço na empresa vinculada
- [x] Bloquear novos orçamentos sem empresa e contato completos e abrir cadastro para correção
- [x] Copiloto de respostas (3 sugestões no chat)
- [x] Próximo cliente (botão + Alt+↓)
- [x] Próximo cliente e cliente anterior no topo da fila, ao lado do tour (Alt+↓ / Alt+↑)
- [x] Repetir último pedido
- [x] Urgência dos recebidos
- [x] Régua de follow-up de orçamentos (cria tarefas D+2/D+5)
- [x] Termômetro da carteira
- [x] Reconquista de orçamento perdido (15 dias)
- [x] Resumo pós-ligação (Pilar Fone com gravação)
- [x] Atalhos (Histórico, Tarefa, Agenda, Orçamentos) só aparecem quando o contato tem registro
- [x] Selo de crédito no cartão
- [ ] Robô IA diário ligando para Potenciais — aguarda decisão de horário/quantidade
- [ ] Plantão fora do horário no WhatsApp — aguarda definir horário e texto da resposta
- [ ] Tela de Orçamentos: recurso para repetir último pedido (removido do menu do cartão)
- [x] Pedidos em aberto diários nos Agendados + motivo obrigatório na perda

## Compras, Estoque, Fiscal e Faturamento
- [x] Necessidade de compra (mínimo, vendas, produção, data ideal) e cotações por fornecedor
- [x] Estoque: saldos, ajustes, movimentações e entrada de NF-e por XML/manual com de-para
- [x] Tributação via motor Systax (tela de token/licença, campos fiscais nos cadastros) e faturamento de pedidos finalizados com baixa de estoque
- [x] Emissão real via Focus NFe (homologação): emitir, consultar, DANFE, XML, cancelar
- [ ] Testar emissão — depende do token Focus NFe e do CNPJ da unidade cadastrado no Focus com certificado
- [ ] Baixar notas de entrada da Receita (manifestação) via Focus NFe
- [ ] Validar integração Systax — depende do endereço da API, token e licença contratados (formato do retorno a confirmar com a documentação Systax)
