# Revisão da elegibilidade das matérias-primas

Regra: uma ficha deve usar matérias-primas cadastradas na mesma empresa e não pode usar o próprio produto como insumo.

| Local | Verificação e resultado |
| --- | --- |
| Cadastro de produto: criar e editar, celular e computador | Ambos usam `handleSave`; consulta a classificação e empresa atuais de cada insumo e substituto antes de gravar. Conforme. |
| Aba Produção: seleção principal e substitutos | O catálogo é restrito à empresa, flag de matéria-prima e exclusão do próprio produto. Incluída restrição explícita da empresa para proteger também estados desatualizados da lista. |
| Aba Produção: previsão de consumo e etapas | Antes podia mostrar cálculo com referência inválida. Agora interrompe a previsão e mostra o motivo da inelegibilidade sem remover dados da ficha. |
| Duplicar: cartão no celular e tabela no computador | Ambas as ações usam `handleDuplicate`, criam um novo destino e passam pela mesma validação de gravação. Conforme. |
| Copiar e colar: aba Básicos | Antes a colagem verificava somente a lista carregada. Agora consulta os cadastros atuais antes de colar; mantém a validação contra autorreferência e não altera o destino se houver erro. |
| Leitura da ficha e cálculo compartilhado | `lerFicha` conserva referências e alternativas; `calcularProducao` valida estrutura e repetição. A elegibilidade é resolvida no consumidor com o catálogo da empresa. Conforme após correção da previsão. |
| Importação por API: cadastro completo e atualização de estoque | `ApiImportWizardStep7` não importa ficha de produção e atualiza apenas estoque no modo correspondente. Não introduz referências de insumos. Conforme. |
| Atualizações de fotos em lote | `AjusteImagemLote` atualiza foto, não ficha nem classificação de matéria-prima. Conforme. |
| API de consulta de produtos | `api-produtos` apenas lê produtos da empresa autorizada e não escreve fichas. Conforme. |
| Função salva `validar_ficha_producao` | Exige existência, mesma empresa, classificação e exclusão do próprio produto para todos os grupos e substitutos. Já conforme à regra; nenhuma alteração. |
| Função salva `salvar_maquinas_produto` | Restringe produto e máquinas à empresa; não grava referências de materiais. Conforme. |
| Funções salvas `validar_larguras_ficha_producao` e `validar_regras_materia_prima_maquina` | Validam a estrutura e as referências de regras às opções da própria ficha; a elegibilidade dos produtos é conferida pelo validador anterior. Conforme. |
| Processos em segundo plano | Nenhum escritor adicional de `ficha_producao` encontrado em scripts ou funções do projeto, nem outra função pública que referencie esse campo. |

Verificação: 46 testes de produção, elegibilidade e cópia passaram; navegador autenticado confirmou bloqueio ao colar no próprio insumo e colagem válida em um novo destino. Sem alteração de cadastros existentes, registros encerrados, permissões ou configurações.