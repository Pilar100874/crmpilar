export type NodeType =
  | "start"
  | "ai_agent"
  | "send_message"
  | "media"
  | "goodbye"
  | "reply_buttons"
  | "list_buttons"
  | "keyword_options"
  | "message_template"
  | "opt_in_out"
  | "opt_in_check"
  | "audience"
  | "ask_name"
  | "ask_question"
  | "ask_email"
  | "ask_number"
  | "ask_phone"
  | "ask_date"
  | "ask_file"
  | "ask_address"
  | "ask_url"
  | "ask_cnpj"
  | "ask_cep"
  | "condition"
  | "set_field"
  | "keyword_jump"
  | "global_keywords"
  | "formulas"
  | "jump_to"
  | "lead_scoring"
  | "goal"
  | "webhook"
  | "trigger_automation"
  | "dynamic_data"
  | "crm_cadastro_empresa"
  | "crm_agenda_rapida"
  | "crm_gerar_relatorio"
  | "transferir_omnichannel"
  | "enviar_fila"
  | "atribuir_atendente"
  | "definir_prioridade"
  | "enviar_aviso_sistema"
  | "enviar_mensagem_interna"
  | "publish_social_post"
  | "generate_ai_media"
  | "send_whatsapp_to_number"
  | "api_loop"
  | "product_search_select"
  | "text_content"
  | "content_type"
  | "ask_influencer"
  | "ask_product_image"
  | "trigger_workflow"
  | "return_response"
  | "button_url"
  | "button_copy"
  | "button_call"
  | "button_pix"
  | "buttons_mixed"
  | "buttons_media"
  | "carousel"
  | "attach_catalog"
  | "global_redirect"
  | "disparar_push";


export interface BlockDefinition {
  type: NodeType;
  label: string;
  description: string;
  icon: string;
  color: string;
  defaultData?: Record<string, any>;
}

export interface FlowNodeData extends Record<string, any> {
  label: string;
  type: NodeType;
  config?: Record<string, any>;
  inputs?: Record<string, any>;  // Valores de entrada do bloco anterior
  outputs?: Record<string, any>; // Valores de saída para o próximo bloco
}

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    type: "start",
    label: "Iniciar",
    description: "Início do fluxo",
    icon: "Play",
    color: "text-success",
    defaultData: {},
  },
  // AI
  {
    type: "ai_agent",
    label: "Agente IA",
    description: "Agente de IA conversacional",
    icon: "Sparkles",
    color: "text-primary",
    defaultData: { model: "gpt-4", systemPrompt: "", temperature: 0.7 },
  },
  // Messages
  {
    type: "send_message",
    label: "Enviar mensagem",
    description: "Enviar mensagem de texto",
    icon: "MessageSquare",
    color: "text-primary",
    defaultData: { text: "" },
  },
  {
    type: "media",
    label: "Mídia",
    description: "Enviar imagem, vídeo ou áudio",
    icon: "Image",
    color: "text-primary",
    defaultData: { mediaType: "image", url: "", caption: "" },
  },
  {
    type: "goodbye",
    label: "Mensagem de despedida",
    description: "Finalizar conversa",
    icon: "Hand",
    color: "text-warning",
    defaultData: { text: "Obrigado pelo contato!" },
  },
  // WhatsApp Essential
  {
    type: "reply_buttons",
    label: "Botões de resposta",
    description: "Botões de resposta rápida",
    icon: "SquareStack",
    color: "text-success",
    defaultData: { text: "", buttons: [], variable: "resposta_botao" },
  },
  {
    type: "list_buttons",
    label: "Botões de lista",
    description: "Menu de lista",
    icon: "List",
    color: "text-success",
    defaultData: { text: "", buttonText: "Ver opções", sections: [], variable: "opcao_lista" },
  },
  {
    type: "keyword_options",
    label: "Opções por palavra-chave",
    description: "Opções por palavra-chave",
    icon: "Hash",
    color: "text-accent",
    defaultData: { keywords: [], variable: "opcao_escolhida" },
  },
  {
    type: "message_template",
    label: "Template de mensagem",
    description: "Template aprovado do WhatsApp",
    icon: "FileText",
    color: "text-primary",
    defaultData: { templateName: "", language: "pt_BR", parameters: [] },
  },
  {
    type: "opt_in_out",
    label: "Opt-in/out",
    description: "Gerenciar consentimento",
    icon: "ToggleLeft",
    color: "text-success",
    defaultData: { action: "opt-in", category: "marketing" },
  },
  {
    type: "opt_in_check",
    label: "Verificar opt-in",
    description: "Verificar consentimento",
    icon: "CheckCircle2",
    color: "text-success",
    defaultData: { category: "marketing" },
  },
  {
    type: "audience",
    label: "Audiência",
    description: "Segmentar audiência",
    icon: "Users",
    color: "text-primary",
    defaultData: { segments: [], action: "add" },
  },
  // Questions
  {
    type: "ask_name",
    label: "Perguntar nome",
    description: "Capturar nome do usuário",
    icon: "User",
    color: "text-warning",
    defaultData: { question: "Qual é o seu nome?", variable: "nome_usuario" },
  },
  {
    type: "ask_question",
    label: "Fazer pergunta",
    description: "Pergunta aberta",
    icon: "HelpCircle",
    color: "text-accent",
    defaultData: { question: "", variable: "resposta", required: true },
  },
  {
    type: "ask_email",
    label: "Perguntar email",
    description: "Capturar email",
    icon: "Mail",
    color: "text-primary",
    defaultData: { question: "Qual é o seu email?", variable: "usuario_email" },
  },
  {
    type: "ask_number",
    label: "Perguntar número",
    description: "Capturar número",
    icon: "Hash",
    color: "text-primary",
    defaultData: { question: "Digite um número:", variable: "numero_usuario" },
  },
  {
    type: "ask_phone",
    label: "Perguntar telefone",
    description: "Capturar telefone",
    icon: "Phone",
    color: "text-success",
    defaultData: { question: "Qual é o seu telefone?", variable: "telefone_usuario" },
  },
  {
    type: "ask_date",
    label: "Perguntar data",
    description: "Capturar data",
    icon: "Calendar",
    color: "text-destructive",
    defaultData: { question: "Selecione uma data:", variable: "data_usuario" },
  },
  {
    type: "ask_file",
    label: "Solicitar arquivo",
    description: "Solicitar upload de arquivo",
    icon: "Folder",
    color: "text-primary",
    defaultData: { question: "Envie o arquivo:", variable: "arquivo_usuario", allowedTypes: [] },
  },
  {
    type: "ask_address",
    label: "Perguntar endereço",
    description: "Capturar endereço",
    icon: "MapPin",
    color: "text-destructive",
    defaultData: { question: "Qual é o seu endereço?", variable: "endereco_usuario" },
  },
  {
    type: "ask_url",
    label: "Perguntar URL",
    description: "Capturar URL",
    icon: "Globe",
    color: "text-primary",
    defaultData: { question: "Cole o link:", variable: "url_usuario" },
  },
  {
    type: "ask_cnpj",
    label: "Perguntar CNPJ",
    description: "Capturar e consultar CNPJ",
    icon: "Building2",
    color: "text-primary",
    defaultData: { question: "Digite o CNPJ da empresa:", variable: "cnpj" },
  },
  {
    type: "ask_cep",
    label: "Perguntar CEP",
    description: "Capturar e consultar CEP",
    icon: "MapPin",
    color: "text-primary",
    defaultData: { question: "Digite o CEP:", variable: "cep" },
  },
  // Logic
  {
    type: "condition",
    label: "Condições",
    description: "Ramificação condicional",
    icon: "GitBranch",
    color: "text-primary",
    defaultData: { conditions: [] },
  },
  {
    type: "set_field",
    label: "Definir campo",
    description: "Definir/atualizar variável",
    icon: "Variable",
    color: "text-accent",
    defaultData: { operations: [], field: "campo", value: "valor" },
  },
  {
    type: "keyword_jump",
    label: "Pular por palavra-chave",
    description: "Pular para bloco por palavra-chave",
    icon: "CornerDownRight",
    color: "text-warning",
    defaultData: { keywords: [] },
  },
  {
    type: "global_redirect",
    label: "Redirecionamento Global",
    description: "Em qualquer momento, se o cliente digitar a palavra-chave, redireciona para workflow, atendente, número de WhatsApp ou outro bot",
    icon: "Shuffle",
    color: "text-primary",
    defaultData: {
      triggerText: "",
      caseSensitive: false,
      matchMode: "exact", // exact | contains | startsWith
      destinationType: "omnichannel", // omnichannel | atendente | whatsapp_number | bot
      omnichannelFlowId: "",
      atendenteId: "",
      whatsappNumber: "",
      botFlowId: "",
      handoffMessage: "Encaminhando seu atendimento, aguarde um instante...",
    },
  },
  {
    type: "global_keywords",
    label: "Palavras-chave globais",
    description: "Palavras-chave globais",
    icon: "Globe",
    color: "text-primary",
    defaultData: { keywords: [] },
  },
  {
    type: "formulas",
    label: "Fórmulas",
    description: "Cálculos e transformações",
    icon: "Calculator",
    color: "text-warning",
    defaultData: { formula: "", outputVariable: "resultado" },
  },
  {
    type: "jump_to",
    label: "Pular para",
    description: "Ir para outro bloco",
    icon: "ArrowRight",
    color: "text-accent",
    defaultData: { targetNodeId: "" },
  },
  {
    type: "lead_scoring",
    label: "Pontuação de leads",
    description: "Pontuação de leads",
    icon: "TrendingUp",
    color: "text-success",
    defaultData: { scoreField: "pontuacao_lead", points: 0, action: "add" },
  },
  {
    type: "goal",
    label: "Meta",
    description: "Meta de conversão",
    icon: "Flag",
    color: "text-destructive",
    defaultData: { goalName: "conversao", value: 0 },
  },
  // Low code
  {
    type: "webhook",
    label: "Webhook",
    description: "Chamar API externa",
    icon: "Webhook",
    color: "text-primary",
    defaultData: { method: "POST", url: "", headers: {}, body: "" },
  },
  {
    type: "trigger_automation",
    label: "Disparar automação",
    description: "Disparar automação externa",
    icon: "Zap",
    color: "text-warning",
    defaultData: { automationId: "", parameters: {} },
  },
  {
    type: "dynamic_data",
    label: "Dados dinâmicos",
    description: "Dados dinâmicos",
    icon: "Database",
    color: "text-accent",
    defaultData: { source: "api", query: "", outputVariable: "dados_dinamicos" },
  },
  // Integração CRM
  {
    type: "crm_cadastro_empresa",
    label: "Cadastro de empresa",
    description: "Validar e cadastrar empresa no CRM",
    icon: "Building2",
    color: "text-success",
    defaultData: { 
      validationMode: "create_or_update", 
      cnpjVariable: "cnpj",
      updateExisting: true,
      outputVariable: "cliente_novo",
      fieldMappings: {}
    },
  },
  {
    type: "crm_agenda_rapida",
    label: "Agenda rápida",
    description: "Cria tarefa na agenda identificando cliente pelo telefone",
    icon: "Calendar",
    color: "text-success",
    defaultData: { 
      valorAgenda: "",
      tituloTarefa: "Retorno Bot",
      outputVariable: "tarefa_criada"
    },
  },
  {
    type: "crm_gerar_relatorio",
    label: "Gerar relatório",
    description: "Gerar PDF de relatório e anexar no chat",
    icon: "FileText",
    color: "text-success",
    defaultData: { 
      relatorioId: "",
      apiVariables: {},
      outputVariable: "relatorio_gerado"
    },
  },
  {
    type: "attach_catalog",
    label: "Anexar Catálogo (PDF)",
    description: "Gera e envia o PDF de um ou mais catálogos. Pode usar o mais recente ou catálogos específicos.",
    icon: "BookOpen",
    color: "text-indigo-600",
    defaultData: {
      mode: "latest", // "latest" | "specific"
      catalogIds: [] as string[],
      caption: "",
      outputVariable: "catalogo_enviado",
    },
  },
  // Roteamento Omnichannel
  {
    type: "transferir_omnichannel",
    label: "Transferir para Omnichannel",
    description: "Aciona workflow omnichannel específico",
    icon: "ArrowRightLeft",
    color: "text-cyan-600",
    defaultData: { 
      workflowId: "",
      workflowNome: "",
      contextoChat: true
    },
  },
  {
    type: "enviar_fila",
    label: "Enviar para Fila",
    description: "Envia chat para fila de atendimento",
    icon: "Users",
    color: "text-cyan-600",
    defaultData: { 
      filaId: "",
      filaNome: "",
      prioridade: 0
    },
  },
  {
    type: "atribuir_atendente",
    label: "Atribuir Atendente",
    description: "Atribui chat a atendente específico",
    icon: "UserCheck",
    color: "text-cyan-600",
    defaultData: { 
      atendenteId: "",
      atendenteNome: "",
      forcarAtribuicao: false
    },
  },
  {
    type: "definir_prioridade",
    label: "Definir Prioridade",
    description: "Define prioridade do atendimento",
    icon: "Flag",
    color: "text-cyan-600",
    defaultData: { 
      prioridade: "normal",
      motivo: ""
    },
  },
  {
    type: "enviar_aviso_sistema",
    label: "Enviar Aviso do Sistema",
    description: "Cria um aviso para usuários do sistema",
    icon: "Bell",
    color: "text-orange-600",
    defaultData: { 
      titulo: "",
      mensagem: "",
      tipo: "info",
      destinatarios_tipo: "todos",
      destinatarios_roles: [],
      expira_horas: null
    },
  },
  {
    type: "enviar_mensagem_interna",
    label: "Enviar Mensagem Interna",
    description: "Envia mensagem no chat interno",
    icon: "MessageCircle",
    color: "text-blue-600",
    defaultData: { 
      tipo_destinatario: "usuario",
      usuario_id: "",
      grupo_id: "",
      roles: [],
      mensagem: "",
      titulo_conversa: ""
    },
  },
  // Redes Sociais
  {
    type: "publish_social_post",
    label: "Publicar nas Redes Sociais",
    description: "Publica post no Instagram, Facebook, TikTok, LinkedIn etc.",
    icon: "Share2",
    color: "text-pink-600",
    defaultData: {
      platforms: ["instagram"],
      postType: "image",
      mediaUrl: "",
      caption: "",
      hashtags: "",
      scheduledAt: "",
      outputVariable: "post_publicado",
    },
  },
  {
    type: "generate_ai_media",
    label: "Gerar Mídia IA",
    description: "Gera imagens ou vídeos via IA para o usuário escolher",
    icon: "Sparkles",
    color: "text-purple-600",
    defaultData: {
      mediaType: "image",
      styleSource: "visual_identity",
      preset: "",
      acceptText: true,
      acceptImageRef: false,
      textPrompt: "Descreva o que você quer gerar:",
      imagePrompt: "Envie uma imagem de referência:",
      basePrompt: "",
      variations: 4,
      outputVariable: "midia_selecionada",
    },
  },
  // Disparo direto WhatsApp
  {
    type: "send_whatsapp_to_number",
    label: "Enviar WhatsApp para número",
    description: "Dispara mensagem WhatsApp para um número específico",
    icon: "Send",
    color: "text-emerald-600",
    defaultData: {
      phoneNumber: "",
      message: "",
      mediaUrl: "",
      waitForReply: false,
      outputVariable: "envio_whatsapp_status",
    },
  },
  // Loop API
  {
    type: "api_loop",
    label: "Loop por API",
    description: "Consulta API, armazena colunas e itera linha a linha",
    icon: "RotateCw",
    color: "text-indigo-600",
    defaultData: {
      method: "GET",
      url: "",
      headers: [],
      body: "",
      arrayPath: "",
      columns: [],
      itemVariable: "item",
      delaySeconds: 2,
      maxRows: 0,
      onError: "continue",
      outputVariable: "loop_resultado",
    },
  },
  // Buscar produto no catálogo
  {
    type: "product_search_select",
    label: "Buscar Produto (Catálogo)",
    description: "Pergunta nome do produto, mostra os N primeiros do catálogo e usuário escolhe um (imagem vira referência para Gerar Mídia IA).",
    icon: "Package",
    color: "text-amber-600",
    defaultData: {
      askText: "Qual produto você está procurando?",
      limit: 5,
      sourceVariable: "",
      outputVariable: "produto_selecionado",
      imageUrlVariable: "produto_imagem_url",
      notFoundMessage: "Nenhum produto encontrado com esse nome.",
      selectionPrompt: "Responda com o número do produto desejado:",
    },
  },
  // Conteúdo de Texto (para Gerar Mídia IA - texto fixo na imagem)
  {
    type: "text_content",
    label: "Conteúdo de Texto",
    description: "Define título, subtítulo e corpo de texto que devem ser renderizados EXATAMENTE na imagem gerada pelo bloco Gerar Mídia IA seguinte.",
    icon: "Type",
    color: "text-violet-600",
    defaultData: {
      blockMode: "advanced", // "advanced" (atual: Sim/Não → digitar/IA) | "fixed" (usa texto direto) | "options" (usuário escolhe uma das opções pré-definidas)
      title: "",
      subtitle: "",
      body: "",
      optionsPrompt: "Escolha um dos textos abaixo:",
      options: [], // Array<{ id: string; label: string; title: string; subtitle: string; body: string }>
    },
  },
  // Tipo de Conteúdo (define objetivo/estilo para Gerar Mídia IA)
  {
    type: "content_type",
    label: "Tipo de Conteúdo",
    description: "Define o objetivo do criativo (Divulgação, Promoção, Institucional...) para guiar o bloco Gerar Mídia IA.",
    icon: "Megaphone",
    color: "text-pink-600",
    defaultData: {
      contentType: "divulgacao",
      mode: "fixed", // "fixed" | "ask"
      askPrompt: "Qual o objetivo da peça? (divulgacao, promocao, institucional, evento, lancamento, educacional)",
      customGuidance: "",
    },
  },
  // Influencer (foto/referência) — entra como referência INFLUENCER no Gerar Mídia IA
  {
    type: "ask_influencer",
    label: "Influencer?",
    description: "Pergunta se a peça terá influencer; se sim, usa o influencer fixo configurado no bloco.",
    icon: "UserSquare2",
    color: "text-purple-600",
    defaultData: {
      askQuestion: "A peça terá um influencer?",
      outputVariable: "influencer_image_url",
      fixedInfluencerId: "",
      fixedInfluencerUrl: "",
    },
  },
  // Imagem do produto — 3 opções com confirmação
  {
    type: "ask_product_image",
    label: "Imagem do Produto?",
    description: "Pergunta se a peça terá imagem do produto; se sim, oferece código do catálogo, upload ou descrição em texto, com confirmação.",
    icon: "Package",
    color: "text-amber-600",
    defaultData: {
      askQuestion: "A peça terá imagem do produto?",
      codePrompt: "Digite o código (ou nome) do produto no sistema:",
      photoPrompt: "Envie a foto do produto (URL ou arquivo).",
      textPrompt: "Descreva o produto em texto:",
      outputImageVariable: "produto_imagem_url",
      outputDescVariable: "produto_descricao",
    },
  },
  // Disparar outro workflow (qualquer módulo)
  {
    type: "trigger_workflow",
    label: "Disparar Workflow",
    description: "Dispara outro workflow (Bot, Omnichannel, Regras E-com, Vendas, Logística, Ads, AI Studio).",
    icon: "Workflow",
    color: "text-indigo-600",
    defaultData: {
      module: "bot",
      workflowId: "",
      workflowName: "",
      executionMode: "async",
      passVariables: true,
      payloadJson: "",
      outputVariable: "workflow_disparado",
    },
  },
  // Retornar Resposta (modo síncrono)
  {
    type: "return_response",
    label: "Retornar Resposta",
    description: "Devolve um payload ao workflow chamador (quando disparado em modo síncrono) e encerra este fluxo.",
    icon: "Reply",
    color: "text-teal-600",
    defaultData: {
      status: "success",
      statusCode: 200,
      message: "Operação concluída",
      payloadJson: "",
      includeAllVariables: false,
      stopFlow: true,
    },
  },
  // ============ Evolution-only (não suportado pela Cloud API) ============
  {
    type: "button_url",
    label: "Botão URL",
    description: "Botão que abre uma URL externa (Evolution)",
    icon: "ExternalLink",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", displayText: "Abrir", url: "" },
  },
  {
    type: "button_copy",
    label: "Botão Copy (Cupom)",
    description: "Botão que copia um código (Evolution)",
    icon: "Copy",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", displayText: "Copiar Cupom", copyCode: "" },
  },
  {
    type: "button_call",
    label: "Botão Ligar",
    description: "Botão que inicia uma ligação (Evolution)",
    icon: "Phone",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", displayText: "Ligar Agora", phoneNumber: "" },
  },
  {
    type: "button_pix",
    label: "Botão Pix",
    description: "Pagamento Pix via WhatsApp (Evolution)",
    icon: "QrCode",
    color: "text-emerald-600",
    defaultData: { title: "Pagamento Pix", description: "", footer: "", currency: "BRL", keyType: "email", name: "", pixKey: "" },
  },
  {
    type: "buttons_mixed",
    label: "Botões Mistos",
    description: "Combina reply/URL/copy/call em uma mensagem (Evolution)",
    icon: "LayoutGrid",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", buttons: [], variable: "resposta_botao" },
  },
  {
    type: "buttons_media",
    label: "Botões com Mídia",
    description: "Botões reply com imagem ou vídeo no topo (Evolution)",
    icon: "Image",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", thumbnailUrl: "", mediaType: "image", buttons: [], variable: "resposta_botao" },
  },
  {
    type: "carousel",
    label: "Carrossel",
    description: "Cards horizontais com imagem + botão (Evolution)",
    icon: "GalleryHorizontal",
    color: "text-blue-600",
    defaultData: { title: "", description: "", footer: "", mode: "manual", cards: [], dynamicLimit: 10, dynamicButtonText: "Selecionar", variable: "card_escolhido" },
  },
];

