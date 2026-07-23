// Mapeia tipo de bloco -> tipo de interação WhatsApp (rótulo visual)
export type InteractionKind = {
  label: string;
  symbol: string; // símbolo/emoji compacto
  className: string;
  title: string;
};

const BUTTONS: InteractionKind = {
  label: "Botões",
  symbol: "⏺",
  className: "bg-purple-100 text-purple-700 border-purple-300",
  title: "Botões de resposta (reply buttons) — até 3 opções",
};

const LIST: InteractionKind = {
  label: "Lista",
  symbol: "☰",
  className: "bg-blue-100 text-blue-700 border-blue-300",
  title: "Lista suspensa (list message)",
};

const TEXT: InteractionKind = {
  label: "Texto",
  symbol: "💬",
  className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  title: "Mensagem de texto",
};

const INPUT: InteractionKind = {
  label: "Entrada",
  symbol: "⌨",
  className: "bg-amber-100 text-amber-700 border-amber-300",
  title: "Aguarda resposta livre do usuário",
};

const MEDIA: InteractionKind = {
  label: "Mídia",
  symbol: "🖼",
  className: "bg-pink-100 text-pink-700 border-pink-300",
  title: "Envia mídia (imagem/vídeo/áudio/arquivo)",
};

const TEMPLATE: InteractionKind = {
  label: "Template",
  symbol: "📋",
  className: "bg-teal-100 text-teal-700 border-teal-300",
  title: "Template HSM aprovado do WhatsApp",
};

const LOGIC: InteractionKind = {
  label: "Lógica",
  symbol: "⚙",
  className: "bg-orange-100 text-orange-700 border-orange-300",
  title: "Bloco de lógica (não envia mensagem)",
};

const SYSTEM: InteractionKind = {
  label: "Sistema",
  symbol: "🔧",
  className: "bg-slate-100 text-slate-700 border-slate-300",
  title: "Ação interna do sistema",
};

const AI: InteractionKind = {
  label: "IA",
  symbol: "✨",
  className: "bg-violet-100 text-violet-700 border-violet-300",
  title: "Processamento de IA",
};

const PAYMENT: InteractionKind = {
  label: "Pix",
  symbol: "💸",
  className: "bg-emerald-100 text-emerald-700 border-emerald-300",
  title: "Pagamento Pix (Evolution)",
};

const CAROUSEL: InteractionKind = {
  label: "Carrossel",
  symbol: "🎠",
  className: "bg-sky-100 text-sky-700 border-sky-300",
  title: "Carrossel de cards (Evolution)",
};

const MAP: Record<string, InteractionKind> = {
  // Botões
  reply_buttons: BUTTONS,
  ask_influencer: BUTTONS,
  ask_product_image: BUTTONS,
  opt_in_check: BUTTONS,

  // Evolution-only buttons
  button_url: BUTTONS,
  button_copy: BUTTONS,
  button_call: BUTTONS,
  button_pix: PAYMENT,
  buttons_mixed: BUTTONS,
  buttons_media: BUTTONS,
  carousel: CAROUSEL,

  // Listas
  list_buttons: LIST,
  content_type: LIST,
  keyword_options: LIST,

  // Híbrido — texto pode virar botões/lista conforme config
  text_content: BUTTONS,

  // Texto puro
  send_message: TEXT,
  goodbye: TEXT,

  // Mídia
  media: MEDIA,
  generate_ai_media: MEDIA,

  // Templates
  message_template: TEMPLATE,

  // Inputs (perguntas livres)
  ask_name: INPUT,
  ask_question: INPUT,
  ask_email: INPUT,
  ask_number: INPUT,
  ask_phone: INPUT,
  ask_date: INPUT,
  ask_file: INPUT,
  ask_address: INPUT,
  ask_url: INPUT,
  ask_cnpj: INPUT,
  ask_cep: INPUT,

  // Lógica
  condition: LOGIC,
  set_field: LOGIC,
  keyword_jump: LOGIC,
  global_keywords: LOGIC,
  formulas: LOGIC,
  jump_to: LOGIC,
  lead_scoring: LOGIC,
  goal: LOGIC,
  global_redirect: SYSTEM,

  // IA
  ai_agent: AI,

  // Sistema / integrações
  webhook: SYSTEM,
  trigger_automation: SYSTEM,
  trigger_workflow: SYSTEM,
  return_response: SYSTEM,
  dynamic_data: SYSTEM,
  audience: SYSTEM,
  opt_in_out: SYSTEM,
  transferir_omnichannel: SYSTEM,
  enviar_fila: SYSTEM,
  atribuir_atendente: SYSTEM,
  definir_prioridade: SYSTEM,
  publish_social_post: SYSTEM,
  send_whatsapp_to_number: SYSTEM,
  send_sms: SYSTEM,
  api_loop: SYSTEM,
  product_search_select: LIST,
  crm_cadastro_empresa: SYSTEM,
  crm_agenda_rapida: SYSTEM,
  crm_gerar_relatorio: SYSTEM,
  broadcast_vendedores: SYSTEM,
  send_contact_card: SYSTEM,
};

export function getInteractionKind(blockType: string, config?: any): InteractionKind | null {
  // Caso especial: text_content tem modo Sim/Não (botões) ou Opções (lista)
  if (blockType === "text_content") {
    const mode = config?.mode || config?.advancedMode;
    if (mode === "options" || mode === "list") return LIST;
    return BUTTONS;
  }
  // ask_question com múltipla escolha → botões
  if (blockType === "ask_question" && (config?.questionType === "multiple")) {
    return BUTTONS;
  }
  return MAP[blockType] || null;
}
