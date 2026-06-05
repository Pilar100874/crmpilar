/**
 * Registro central de ajuda e exemplos para os blocos dos workflows.
 * Cada bloco recebe descrição, "como usar", pelo menos 2 exemplos
 * práticos e dicas opcionais. Quando o tipo não está mapeado,
 * `buildGenericHelp` gera 2 exemplos plausíveis com base na descrição/label.
 */

export interface BlockHelpEntry {
  comoUsar?: string;
  exemplos: string[];
  dicas?: string[];
}

// ──────────────────────────────────────────────────────────────
// E-COMMERCE RULES
// ──────────────────────────────────────────────────────────────
const ECOMMERCE_HELP: Record<string, BlockHelpEntry> = {
  inicio_regra: {
    comoUsar: "Bloco obrigatório. Toda regra começa aqui — conecte a saída deste bloco à primeira condição ou ação.",
    exemplos: [
      "Conecte ‘Início’ → ‘SE valor do carrinho > 200’ → ‘Liberar frete grátis’ para uma promoção simples.",
      "Conecte ‘Início’ → ‘Gatilho: intenção de saída’ → ‘Oferecer cupom na hora’ para reter visitantes prestes a sair.",
    ],
  },
  condicao_valor_carrinho: {
    exemplos: [
      "Carrinho ≥ R$ 300 → aplicar 10% de desconto (incentivo para aumentar ticket médio).",
      "Carrinho entre R$ 100 e R$ 500 → liberar parcelamento sem juros em até 6x.",
    ],
    dicas: ["Combine com ‘E (todas verdadeiras)’ para exigir também um tipo de cliente específico."],
  },
  condicao_quantidade_itens: {
    exemplos: [
      "Quantidade ≥ 3 → 5% de desconto no total (gatilho de volume).",
      "Quantidade ≥ 10 → adicionar brinde automaticamente.",
    ],
  },
  condicao_produto_especifico: {
    exemplos: [
      "Se contém o produto ‘Cafeteira X’ → oferecer pacote de cápsulas com 20% de desconto.",
      "Se contém ‘Kit Solar’ → liberar frete grátis para todo o Sudeste.",
    ],
  },
  condicao_categoria_produto: {
    exemplos: [
      "Categoria ‘Vinhos’ com 2 itens → desconto progressivo na 3ª unidade.",
      "Categoria ‘Suplementos’ → desconto de 10% no Pix.",
    ],
  },
  condicao_grupo_produto: {
    exemplos: [
      "Grupo ‘Linha Premium’ → liberar frete grátis nacional.",
      "Grupo ‘Black Friday’ → mostrar banner com countdown no topo.",
    ],
  },
  condicao_tipo_cliente: {
    exemplos: [
      "Cliente B2B → habilitar tabela de preços de atacado e desconto por volume.",
      "Cliente B2C → mostrar parcelamento em 12x sem juros no checkout.",
    ],
  },
  condicao_cliente_especifico: {
    exemplos: [
      "Cliente ‘Padaria Central’ → aplicar tabela negociada com 8% off.",
      "Cliente ‘João VIP’ → liberar frete grátis em todas as compras.",
    ],
  },
  condicao_primeira_compra: {
    exemplos: [
      "Primeira compra → cupom de 10% (BEMVINDO10) automático no carrinho.",
      "Primeira compra → enviar brinde de boas-vindas junto ao pedido.",
    ],
  },
  condicao_cliente_recorrente: {
    exemplos: [
      "Cliente com 5+ compras → 12% de desconto e selo VIP no checkout.",
      "Cliente com 3+ compras no mês → frete grátis automático.",
    ],
  },
  condicao_regiao_entrega: {
    exemplos: [
      "UF = SP, RJ, MG → frete fixo de R$ 9,90.",
      "CEP entre 01000-000 e 05999-999 → entrega expressa no mesmo dia.",
    ],
  },
  condicao_periodo: {
    exemplos: [
      "De 20/11 a 30/11 → Black Friday com 25% off em toda a loja.",
      "De 01/12 a 24/12 → frete grátis para presentes acima de R$ 150.",
    ],
  },
  condicao_dia_semana: {
    exemplos: [
      "Sábado e domingo → Combo família com 15% off.",
      "Segunda-feira → ‘Monday Sale’ com 8% em todo o site.",
    ],
  },
  condicao_horario: {
    exemplos: [
      "Das 18h às 23h → Happy Hour com frete grátis.",
      "Das 00h às 06h → ‘Madrugada Premiada’ com 5% extra no Pix.",
    ],
  },
  condicao_cupom: {
    exemplos: [
      "Cupom ‘FRETE10’ aplicado → reduz o frete em 10%.",
      "Cupom ‘VIP20’ aplicado → aplica 20% no total e libera brinde.",
    ],
  },
  logica_e: {
    comoUsar: "Avança para a próxima etapa apenas quando TODAS as condições conectadas forem verdadeiras.",
    exemplos: [
      "Cliente B2B E carrinho > R$ 1.000 → liberar 15% de desconto atacadista.",
      "Categoria ‘Vinhos’ E sábado → 10% off + frete fixo.",
    ],
  },
  logica_ou: {
    comoUsar: "Avança se pelo menos UMA das condições conectadas for verdadeira.",
    exemplos: [
      "Primeira compra OU cupom ‘BEMVINDO’ → liberar brinde.",
      "Carrinho > R$ 500 OU cliente VIP → frete grátis nacional.",
    ],
  },
  acao_desconto_percentual: {
    exemplos: [
      "Aplica 10% no carrinho inteiro quando o gatilho dispara.",
      "Aplica 20% apenas nos itens da categoria ‘Calçados’.",
    ],
  },
  acao_desconto_fixo: {
    exemplos: [
      "Desconta R$ 50 do total quando o pedido passar de R$ 500.",
      "Desconta R$ 20 para clientes B2C em primeira compra.",
    ],
  },
  acao_desconto_progressivo: {
    exemplos: [
      "1 un = 5%, 3 un = 10%, 5 un = 15% no mesmo produto.",
      "Carrinho com 2 categorias = 5%, 3+ categorias = 12%.",
    ],
  },
  acao_compre_x_leve_y: {
    exemplos: [
      "Compre 2, leve 3 camisetas básicas (a mais barata sai grátis).",
      "Compre 3, leve 4 cervejas artesanais.",
    ],
  },
  acao_frete_gratis: {
    exemplos: [
      "Zerar frete em todo o Brasil para pedidos acima de R$ 250.",
      "Frete grátis apenas para SP/RJ em compras de assinantes.",
    ],
  },
  acao_desconto_frete: {
    exemplos: [
      "50% de desconto no frete em finais de semana.",
      "30% no frete para clientes recorrentes (3+ compras).",
    ],
  },
  acao_frete_fixo: {
    exemplos: [
      "Frete fixo de R$ 9,90 para toda a região Sudeste.",
      "Frete fixo de R$ 19,90 para CEPs do interior do RS.",
    ],
  },
  acao_banner_promocional: {
    exemplos: [
      "Banner topo: ‘Black Friday — 25% off até domingo!’ com link para landing.",
      "Banner rodapé: ‘Frete grátis acima de R$ 199’ na home.",
    ],
  },
  acao_popup_promocional: {
    exemplos: [
      "Popup de boas-vindas com cupom ‘BEMVINDO10’ após 3s.",
      "Popup de aniversário da loja com 15% off automático.",
    ],
  },
  acao_destaque_vitrine: {
    exemplos: [
      "Destacar 6 produtos da nova coleção na home por 7 dias.",
      "Destacar kit Dia das Mães na vitrine principal em maio.",
    ],
  },
  acao_mensagem_carrinho: {
    exemplos: [
      "‘Falta apenas R$ 30 para frete grátis!’ — incentivo ao upsell.",
      "‘Adicione mais 1 item e ganhe 5% de desconto.’",
    ],
  },
  acao_brinde: {
    exemplos: [
      "Brinde ‘Eco bag’ em pedidos acima de R$ 200.",
      "Amostra grátis de perfume em compras na categoria ‘Beleza’.",
    ],
  },
  acao_parcelas_extras: {
    exemplos: [
      "Liberar 12x sem juros para pedidos acima de R$ 600.",
      "Liberar 6x sem juros em todo o site na Black Friday.",
    ],
  },
  acao_desconto_pix: {
    exemplos: [
      "5% off no total ao escolher Pix.",
      "8% off no Pix apenas para clientes B2B.",
    ],
  },
  acao_desconto_boleto: {
    exemplos: [
      "3% off no total ao escolher boleto.",
      "5% off no boleto somente em compras acima de R$ 300.",
    ],
  },
  condicao_valor_pedido: {
    comoUsar: "Cria várias saídas, uma para cada faixa de valor. Conecte cada saída a uma ação diferente.",
    exemplos: [
      "Até R$ 200 → frete fixo · R$ 200–500 → frete grátis · acima de R$ 500 → frete grátis + brinde.",
      "Até R$ 100 → 0% · R$ 100–300 → 5% · acima de R$ 300 → 10% de desconto.",
    ],
  },
  gatilho_tempo_em_tela: {
    exemplos: [
      "Visitante 5 min na página ‘/checkout’ → enviar lembrete para finalizar.",
      "Atendente 10 min na tela ‘Conversas’ → exibir alerta de produtividade.",
    ],
  },
  gatilho_carrinho_abandonado: {
    exemplos: [
      "Carrinho com R$ 200+ parado por 30 min → enviar lembrete por e-mail.",
      "Carrinho parado por 2h → cupom de 10% via WhatsApp.",
    ],
  },
  acao_enviar_lembrete_carrinho: {
    exemplos: [
      "E-mail: ‘Você esqueceu algo!’ com link direto para o carrinho.",
      "WhatsApp: ‘Seu kit ainda está esperando, conclua com 5% off’.",
    ],
  },
  gatilho_visitou_pagina: {
    exemplos: [
      "Visitou /produtos/cafeteira-x → mostrar popup com cápsulas relacionadas.",
      "Visitou /promo/black-friday → abrir chat proativo oferecendo cupom.",
    ],
  },
  gatilho_tempo_na_pagina: {
    exemplos: [
      "60s na página do produto → mostrar avaliação destacada.",
      "120s na página de frete → abrir chat oferecendo simulação.",
    ],
  },
  gatilho_intencao_saida: {
    exemplos: [
      "Mouse sai pelo topo → popup ‘Não vá embora! 10% off por 10 min’.",
      "Intenção de saída no checkout → oferecer Pix com 5% extra.",
    ],
  },
  gatilho_scroll_profundo: {
    exemplos: [
      "Scroll > 70% na landing → mostrar CTA fixo ‘Comprar agora’.",
      "Scroll > 90% no blog post → sugerir produto relacionado.",
    ],
  },
  gatilho_inatividade: {
    exemplos: [
      "30s sem interação → mostrar chat proativo ‘Posso te ajudar?’.",
      "60s parado no checkout → destacar botão ‘Finalizar pedido’.",
    ],
  },
  gatilho_rage_click: {
    exemplos: [
      "4 cliques em 2s no botão ‘Adicionar’ → exibir mensagem de erro amigável.",
      "Rage click no menu → abrir chat com mensagem ‘Não está encontrando algo?’.",
    ],
  },
  gatilho_dead_click: {
    exemplos: [
      "Clique em área sem ação no carrinho → mostrar tooltip explicando.",
      "Dead click no checkout → registrar evento e abrir chat proativo.",
    ],
  },
  gatilho_clique_elemento: {
    exemplos: [
      "Clique em #botao-comprar → enviar evento para o pixel de conversão.",
      "Clique em .cupom-banner → aplicar cupom automaticamente.",
    ],
  },
  gatilho_visualizou_produto_vezes: {
    exemplos: [
      "Viu o mesmo produto 3 vezes na sessão → oferecer cupom de 10%.",
      "Viu produto premium 5 vezes → abrir chat com vendedor especializado.",
    ],
  },
  gatilho_retorno_visitante: {
    exemplos: [
      "Visitante volta após 3 dias → banner ‘Bem-vindo de volta, 5% off’.",
      "Volta após 15 dias → popup com novidades desde a última visita.",
    ],
  },
  acao_popup_personalizado: {
    exemplos: [
      "‘Espera! Ganhe 10% extra por 10 minutos’ ao tentar sair.",
      "‘Frete grátis liberado para você’ após 60s na página.",
    ],
  },
  acao_oferecer_cupom_instantaneo: {
    exemplos: [
      "Cupom VOLTA10 (10%) válido por 15 min na sessão atual.",
      "Cupom RAGECLICK5 (5%) após detectar frustração, válido por 5 min.",
    ],
  },
  acao_chat_proativo: {
    exemplos: [
      "‘Posso te ajudar a finalizar a compra?’ após 90s no checkout.",
      "‘Tem dúvida sobre o produto?’ ao visitar a ficha técnica 3x.",
    ],
  },
  acao_notificacao_navegador: {
    exemplos: [
      "Push: ‘Seu cupom expira em 5 minutos!’.",
      "Push: ‘O produto que você viu voltou ao estoque’.",
    ],
  },
  acao_destacar_elemento: {
    exemplos: [
      "Piscar #botao-finalizar-compra por 5s quando o cliente travar no checkout.",
      "Destacar .campo-cupom ao oferecer um cupom instantâneo.",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// AUTOMAÇÃO DE VENDAS (orçamento)
// ──────────────────────────────────────────────────────────────
const AUTOMACAO_VENDAS_HELP: Record<string, BlockHelpEntry> = {
  iniciar_validacao: {
    comoUsar: "Ponto de partida da automação de orçamento. Conecte daqui as condições/ações.",
    exemplos: [
      "Início → ‘Validar empresa’ → ‘Aplicar desconto %’.",
      "Início → ‘Aniversário do cliente’ → ‘Aplicar desconto fixo’.",
    ],
  },
  condicao_se: {
    exemplos: [
      "SE valor_total > 500 → aplicar 5% de desconto.",
      "SE quantidade > 10 itens → liberar frete grátis.",
    ],
  },
  logica_e: {
    exemplos: [
      "Empresa = ‘ACME’ E mês = dezembro → desconto sazonal de 8%.",
      "Cliente recorrente E ticket > R$ 1.000 → liberar parcelamento.",
    ],
  },
  logica_ou: {
    exemplos: [
      "Aniversário do cliente OU aniversário da empresa → desconto comemorativo.",
      "Black Friday OU Cyber Monday → desconto único de 15%.",
    ],
  },
  desconto_valor_compra: {
    exemplos: [
      "5% direto no total do orçamento, sem validação adicional.",
      "10% padrão aplicado em todo cliente B2B do segmento varejo.",
    ],
  },
  desconto_aniversario_cliente: {
    exemplos: [
      "Cliente faz aniversário em maio → 10% off em todo o mês.",
      "Cliente aniversariante do dia → 15% off válido somente hoje.",
    ],
  },
  desconto_aniversario_empresa: {
    exemplos: [
      "Mês de aniversário da empresa → 8% off para todos os clientes.",
      "Semana do aniversário → brinde + 5% de desconto.",
    ],
  },
  desconto_data_especial: {
    exemplos: [
      "Black Friday → 15% off em todo o orçamento.",
      "Natal → 10% off + brinde para pedidos acima de R$ 500.",
    ],
  },
  validar_empresa: {
    exemplos: [
      "Aplica regra apenas para a empresa ‘Padaria Central’.",
      "Bloqueia desconto para empresas inadimplentes.",
    ],
  },
  validar_usuario: {
    exemplos: [
      "Regra disponível só para o vendedor ‘Carlos’.",
      "Permitir desconto extra apenas para gerentes.",
    ],
  },
  validar_produto: {
    exemplos: [
      "Aplica desconto só quando o orçamento contém ‘Vinho Reserva’.",
      "Aplica frete grátis quando há ‘Geladeira Inverter’ no pedido.",
    ],
  },
  valida_faixa_faturamento: {
    exemplos: [
      "Até R$ 500 → sem desconto · R$ 500–2.000 → 5% · acima de R$ 2.000 → 10%.",
      "Faixa A → frete grátis · Faixa B → brinde · Faixa C → ambos.",
    ],
  },
  aplicar_desconto: {
    exemplos: [
      "Aplica automaticamente os descontos calculados pelas regras anteriores.",
      "Aplica desconto manualmente confirmando antes pelo vendedor.",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// OMNICHANNEL (roteamento de atendimento)
// ──────────────────────────────────────────────────────────────
const OMNICHANNEL_HELP: Record<string, BlockHelpEntry> = {
  inicio: {
    exemplos: [
      "Início → ‘Horário comercial’ → ‘Fila de atendimento’.",
      "Início → ‘Regra de roteamento por skill’ → ‘Atendente especializado’.",
    ],
  },
  fila: {
    exemplos: [
      "Encaminhar todos os tickets de SAC para a fila ‘Suporte Nível 1’.",
      "Direcionar leads de Marketing para a fila ‘Pré-vendas’.",
    ],
  },
  atendente: {
    exemplos: [
      "Atribuir conversa direto para o atendente ‘Maria (sênior)’.",
      "Direcionar VIPs para o atendente dedicado da carteira.",
    ],
  },
  skill: {
    exemplos: [
      "Roteamento por skill ‘Inglês’ para clientes estrangeiros.",
      "Roteamento por skill ‘Financeiro’ para dúvidas de boleto.",
    ],
  },
  regra_roteamento: {
    exemplos: [
      "Distribuir conversas de forma round-robin entre os atendentes online.",
      "Priorizar atendente que já atendeu o cliente nos últimos 30 dias.",
    ],
  },
  horario: {
    exemplos: [
      "Seg–Sex 08h–18h → fila humana · fora do horário → mensagem automática.",
      "Sábado 09h–13h → atendimento reduzido na fila ‘Plantão’.",
    ],
  },
  webhook: {
    exemplos: [
      "Disparar POST para o CRM externo informando nova conversa.",
      "Notificar sistema de helpdesk a cada transferência de chat.",
    ],
  },
  aguardar: {
    exemplos: [
      "Aguardar 5 minutos antes de escalar o ticket para o Nível 2.",
      "Aguardar 30s entre tentativas de roteamento automático.",
    ],
  },
  analytics: {
    exemplos: [
      "Registrar evento ‘conversa_roteada’ para o painel de BI.",
      "Marcar etapa ‘chat_iniciado’ para análise de funil de atendimento.",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// ADS AUTOMATION (anúncios)
// ──────────────────────────────────────────────────────────────
const ADS_HELP: Record<string, BlockHelpEntry> = {
  trigger_roas: {
    exemplos: [
      "ROAS abaixo de 1.5 por 3 dias → pausar campanha automaticamente.",
      "ROAS abaixo de 2.0 → reduzir orçamento em 30%.",
    ],
  },
  trigger_spend: {
    exemplos: [
      "Gasto acima de R$ 5.000 no dia → pausar e notificar gestor.",
      "Gasto > 80% do orçamento mensal → reduzir lances em 20%.",
    ],
  },
  trigger_cpc: {
    exemplos: [
      "CPC acima de R$ 3,00 → diminuir lance em 15%.",
      "CPC acima do benchmark da categoria → notificar via Slack.",
    ],
  },
  trigger_ctr: {
    exemplos: [
      "CTR abaixo de 1% por 5 dias → pausar grupo de anúncios.",
      "CTR abaixo de 0,5% → arquivar criativos com baixo desempenho.",
    ],
  },
  trigger_conversions: {
    exemplos: [
      "Sem conversão em 48h → pausar campanha.",
      "Mais de 50 conversões/dia → aumentar orçamento em 25%.",
    ],
  },
  trigger_impressions: {
    exemplos: [
      "Impressões caíram 40% em 24h → notificar equipe de mídia.",
      "Sem impressões há 6h → revisar orçamento e segmentação.",
    ],
  },
  trigger_schedule: {
    exemplos: [
      "Toda segunda 09h → gerar relatório semanal de performance.",
      "Todo dia 1º → resetar orçamento mensal das campanhas.",
    ],
  },
  trigger_frequency: {
    exemplos: [
      "Frequência > 4 → rotacionar criativos automaticamente.",
      "Frequência > 6 → pausar anúncio para evitar saturação.",
    ],
  },
  trigger_quality_score: {
    exemplos: [
      "Quality Score < 5 → revisar palavras-chave do grupo.",
      "Quality Score < 3 → pausar palavra-chave automaticamente.",
    ],
  },
  trigger_budget_depleted: {
    exemplos: [
      "Orçamento esgotado → enviar alerta para o financeiro.",
      "Orçamento 100% consumido antes das 15h → aumentar limite diário.",
    ],
  },
  trigger_position: {
    exemplos: [
      "Posição média pior que 3 → aumentar lance em 10%.",
      "Posição 1 mantida → reduzir lance para economizar.",
    ],
  },
  condition_platform: {
    exemplos: [
      "Se plataforma = Google Ads → aplicar regra de lance específica.",
      "Se plataforma = Meta Ads → priorizar otimização por conversões.",
    ],
  },
  condition_campaign: {
    exemplos: [
      "Se campanha = ‘Black Friday’ → aplicar regra somente nessa.",
      "Excluir campanha de branding das automações de pausa.",
    ],
  },
  condition_time: {
    exemplos: [
      "Apenas entre 18h e 23h → aumentar lance em 20%.",
      "Madrugada (00h–06h) → reduzir lance em 30%.",
    ],
  },
  condition_metric: {
    exemplos: [
      "Se CPA > R$ 50 E ROAS < 2 → pausar.",
      "Se CTR > 3% → aumentar orçamento em 15%.",
    ],
  },
  condition_day_of_week: {
    exemplos: [
      "Sábado e domingo → reduzir orçamento (menor conversão B2B).",
      "Segunda a sexta → manter orçamento total.",
    ],
  },
  condition_budget_remaining: {
    exemplos: [
      "Restando < 20% do orçamento → pausar campanha não prioritária.",
      "Restando > 50% até dia 25 → liberar lance mais agressivo.",
    ],
  },
  condition_device: {
    exemplos: [
      "Se dispositivo = mobile → aumentar lance em 15%.",
      "Se dispositivo = desktop → priorizar criativos com mais texto.",
    ],
  },
  condition_location: {
    exemplos: [
      "Apenas SP/RJ → aumentar lance em 20%.",
      "Excluir regiões com CPA acima de R$ 80.",
    ],
  },
  action_pause: {
    exemplos: [
      "Pausar campanha ‘Promo Verão’ quando ROAS < 1.",
      "Pausar grupos de anúncios sem conversão em 72h.",
    ],
  },
  action_resume: {
    exemplos: [
      "Reativar campanha quando ROAS subir acima de 2.",
      "Reativar palavras-chave após melhoria do Quality Score.",
    ],
  },
  action_budget_decrease: {
    exemplos: [
      "Reduzir orçamento em 25% quando o gasto atingir 80% antes do meio do mês.",
      "Reduzir 10% por dia em campanhas com CPA crescente.",
    ],
  },
  action_budget_increase: {
    exemplos: [
      "Aumentar orçamento 20% quando ROAS > 4.",
      "Aumentar 30% durante datas comemorativas selecionadas.",
    ],
  },
  action_notify: {
    exemplos: [
      "Notificar gestor por e-mail quando campanha for pausada.",
      "Enviar aviso interno ao detectar queda brusca de impressões.",
    ],
  },
  action_webhook: {
    exemplos: [
      "Disparar webhook para Zapier criando uma tarefa.",
      "Notificar Make/n8n para sincronizar com a planilha de mídia.",
    ],
  },
  action_email: {
    exemplos: [
      "Enviar e-mail diário com KPIs para o cliente.",
      "Enviar e-mail de alerta quando ROAS < 1,5.",
    ],
  },
  action_bid_adjust: {
    exemplos: [
      "Aumentar lance em 10% nas palavras-chave top 5.",
      "Reduzir lance em 20% para termos com CPA alto.",
    ],
  },
  action_duplicate: {
    exemplos: [
      "Duplicar campanha vencedora para nova região geográfica.",
      "Duplicar criativo de alto CTR em outro grupo de anúncios.",
    ],
  },
  action_archive: {
    exemplos: [
      "Arquivar campanhas paradas há mais de 30 dias.",
      "Arquivar criativos com baixíssimo desempenho histórico.",
    ],
  },
  action_activate: {
    exemplos: [
      "Reativar campanha sazonal automaticamente em data específica.",
      "Ativar grupo de anúncios após aprovação do criativo.",
    ],
  },
  action_bid_device: {
    exemplos: [
      "+20% no lance para mobile na campanha de e-commerce.",
      "-15% no lance para tablet (baixa conversão).",
    ],
  },
  action_schedule_change: {
    exemplos: [
      "Mudar agendamento para rodar apenas 09h–22h.",
      "Pausar campanha aos domingos automaticamente.",
    ],
  },
  action_slack: {
    exemplos: [
      "Enviar mensagem no canal #ads-alertas quando regra disparar.",
      "Notificar #financeiro ao atingir 90% do orçamento mensal.",
    ],
  },
  action_create_report: {
    exemplos: [
      "Gerar relatório semanal automático em PDF.",
      "Gerar snapshot diário das principais campanhas.",
    ],
  },
  action_aviso_sistema: {
    exemplos: [
      "Criar aviso interno ‘Campanha X pausada por baixo ROAS’.",
      "Aviso ‘Orçamento esgotado’ no painel da equipe.",
    ],
  },
  action_mensagem_interna: {
    exemplos: [
      "Mensagem no chat interno para o gestor responsável.",
      "Mensagem para o grupo ‘Mídia paga’ ao detectar anomalia.",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// BOT FLOW (conversational)
// ──────────────────────────────────────────────────────────────
const BOT_FLOW_HELP: Record<string, BlockHelpEntry> = {
  start: {
    comoUsar: "Bloco inicial obrigatório. Cada fluxo começa por aqui.",
    exemplos: [
      "Início → ‘Boas-vindas’ → Menu de opções.",
      "Início → ‘Identificar cliente’ → Roteamento por perfil.",
    ],
  },
  send_message: {
    exemplos: [
      "Enviar ‘Olá {{nome}}! Em que posso ajudar?’.",
      "Enviar instruções com formatação em negrito e emojis.",
    ],
  },
  ai_agent: {
    exemplos: [
      "Agente de IA respondendo dúvidas sobre produtos.",
      "Agente de IA para triagem inicial antes de transferir para humano.",
    ],
  },
  media: {
    exemplos: [
      "Enviar PDF do catálogo após o cliente pedir tabela de preços.",
      "Enviar vídeo curto explicando o pós-venda.",
    ],
  },
  goodbye: {
    exemplos: [
      "Mensagem de encerramento com pesquisa de satisfação.",
      "Despedida com link para newsletter ou catálogo.",
    ],
  },
  reply_buttons: {
    exemplos: [
      "Botões: ‘Comprar’, ‘Suporte’, ‘Falar com vendedor’.",
      "Botões: ‘Sim’ / ‘Não’ para confirmação rápida.",
    ],
  },
  list_buttons: {
    exemplos: [
      "Lista de categorias do catálogo para o cliente escolher.",
      "Lista de horários disponíveis para agendamento.",
    ],
  },
  keyword_options: {
    exemplos: [
      "Reconhecer ‘1’, ‘2’, ‘3’ ou ‘sair’ digitados pelo cliente.",
      "Reconhecer ‘nota fiscal’, ‘boleto’, ‘entrega’ por palavra-chave.",
    ],
  },
  product_search_query: {
    exemplos: [
      "Cliente digita ‘cafeteira’ → bot busca no catálogo e devolve os 5 melhores.",
      "Cliente busca ‘tênis preto 42’ → resultado filtrado por estoque.",
    ],
  },
  product_search_select: {
    exemplos: [
      "Cliente escolhe um dos produtos buscados → adiciona ao carrinho.",
      "Cliente escolhe produto → bot envia ficha técnica.",
    ],
  },
  ai_media_select: {
    exemplos: [
      "Bot oferece imagem ou vídeo gerado por IA para o cliente.",
      "Bot escolhe automaticamente o melhor formato pela conversa.",
    ],
  },
  ai_media_image_ref: {
    exemplos: [
      "Cliente envia foto de referência → bot gera variação com IA.",
      "Imagem de moodboard → IA cria peça publicitária.",
    ],
  },
  ai_media_prompt: {
    exemplos: [
      "Prompt: ‘banner promocional verão azul tropical’.",
      "Prompt: ‘ilustração do produto em uso na cozinha’.",
    ],
  },
  publish_social_done: {
    exemplos: [
      "Confirma publicação no Instagram e responde com link.",
      "Confirma agendamento da publicação para a data escolhida.",
    ],
  },
  text_content_options_pick: {
    exemplos: [
      "Cliente escolhe entre 3 sugestões de copy geradas por IA.",
      "Bot mostra 5 títulos e o cliente seleciona um.",
    ],
  },
  text_content_yesno: {
    exemplos: [
      "‘Gostou desta copy? (Sim/Não)’ — se não, gera nova versão.",
      "‘Posso publicar agora?’ — confirmação simples antes de agir.",
    ],
  },
};

// ──────────────────────────────────────────────────────────────
// Workflow → Map
// ──────────────────────────────────────────────────────────────
const REGISTRIES: Record<string, Record<string, BlockHelpEntry>> = {
  ecommerce: ECOMMERCE_HELP,
  "automacao-vendas": AUTOMACAO_VENDAS_HELP,
  omnichannel: OMNICHANNEL_HELP,
  ads: ADS_HELP,
  bot: BOT_FLOW_HELP,
};

export type WorkflowKey = keyof typeof REGISTRIES;

/**
 * Gera ajuda padrão para blocos que ainda não têm exemplos específicos.
 * Garante o mínimo de 2 exemplos por bloco exigido pela UI.
 */
function buildGenericHelp(label: string, description: string): BlockHelpEntry {
  const baseLabel = label || "este bloco";
  return {
    exemplos: [
      `Use “${baseLabel}” quando precisar disparar a etapa descrita: “${description}”. Conecte-o após o bloco que atende à condição desejada.`,
      `Combine “${baseLabel}” com outras condições (E/OU) e ações para personalizar o comportamento do fluxo de acordo com o cenário do seu negócio.`,
    ],
    dicas: [
      "Use o painel de propriedades para ajustar os parâmetros deste bloco antes de salvar o fluxo.",
    ],
  };
}

export function getBlockHelp(
  workflow: WorkflowKey,
  type: string,
  label: string,
  description: string,
): BlockHelpEntry {
  const registry = REGISTRIES[workflow] || {};
  const entry = registry[type];
  if (entry && entry.exemplos && entry.exemplos.length >= 2) {
    return entry;
  }
  return buildGenericHelp(label, description);
}
