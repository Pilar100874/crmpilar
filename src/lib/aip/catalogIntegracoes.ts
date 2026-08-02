/** Catálogos prontos (1 clique) para Tools e MCPs — linguagem simples para leigos. */

export interface ToolPreset {
  slug: string;
  nome: string;
  icone: string;
  categoria: string;
  descricao: string;
  /** Explicação em linguagem simples do que dá para fazer */
  paraQue: string;
  tipo: string;
  endpoint: string;
  metodo: string;
  credencial_ref?: string;
  input_schema?: Record<string, any>;
}

export interface McpPreset {
  slug: string;
  nome: string;
  icone: string;
  descricao: string;
  paraQue: string;
  endpoint: string;
  tipo: string;
  precisaCredencial?: boolean;
}

export const GRUPOS_TOOLS: Array<{ slug: string; nome: string; icone: string; itens: ToolPreset[] }> = [
  {
    slug: "comunicacao",
    nome: "Comunicação",
    icone: "💬",
    itens: [
      {
        slug: "whatsapp-evolution",
        nome: "WhatsApp (Evolution)",
        icone: "🟢",
        categoria: "api",
        descricao: "Envia mensagem de WhatsApp pela sessão configurada no Pilar",
        paraQue: "Avisar cliente, mandar relatório ou alerta no WhatsApp automaticamente.",
        tipo: "http",
        endpoint: "https://sua-evolution/message/sendText/SESSAO",
        metodo: "POST",
        credencial_ref: "EVOLUTION_API_KEY",
        input_schema: { number: "5511999999999", text: "Sua mensagem" },
      },
      {
        slug: "email-smtp",
        nome: "E-mail",
        icone: "✉️",
        categoria: "api",
        descricao: "Dispara e-mail transacional",
        paraQue: "Enviar resumo diário, proposta ou aviso por e-mail.",
        tipo: "http",
        endpoint: "https://api.resend.com/emails",
        metodo: "POST",
        credencial_ref: "RESEND_API_KEY",
        input_schema: { to: "cliente@email.com", subject: "Assunto", html: "<p>Olá</p>" },
      },
      {
        slug: "slack-webhook",
        nome: "Slack",
        icone: "💼",
        categoria: "api",
        descricao: "Posta mensagem em um canal do Slack",
        paraQue: "Avisar o time quando uma rotina terminar ou falhar.",
        tipo: "http",
        endpoint: "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        metodo: "POST",
        input_schema: { text: "Mensagem" },
      },
      {
        slug: "telegram-bot",
        nome: "Telegram",
        icone: "✈️",
        categoria: "api",
        descricao: "Envia mensagem por bot do Telegram",
        paraQue: "Receber alertas no celular sem custo.",
        tipo: "http",
        endpoint: "https://api.telegram.org/bot<TOKEN>/sendMessage",
        metodo: "POST",
        input_schema: { chat_id: "123456", text: "Mensagem" },
      },
    ],
  },
  {
    slug: "pilar",
    nome: "Dados do Pilar",
    icone: "🏛️",
    itens: [
      {
        slug: "pilar-empresas",
        nome: "Empresas do CRM",
        icone: "🏢",
        categoria: "interna",
        descricao: "Consulta empresas cadastradas no Pilar",
        paraQue: "Deixar o agente responder sobre clientes e gerar listas.",
        tipo: "http",
        endpoint: "https://crm.pilar.com.br/functions/v1/execute-dynamic-query",
        metodo: "POST",
        input_schema: { tabela: "empresas", limite: 50 },
      },
      {
        slug: "pilar-produtos",
        nome: "Produtos e estoque",
        icone: "📦",
        categoria: "interna",
        descricao: "Consulta produtos, preços e saldo",
        paraQue: "Montar orçamento, catálogo ou alerta de ruptura.",
        tipo: "http",
        endpoint: "https://crm.pilar.com.br/functions/v1/execute-dynamic-query",
        metodo: "POST",
        input_schema: { tabela: "produtos", limite: 50 },
      },
      {
        slug: "pilar-prospeccao",
        nome: "Prospecção de empresas",
        icone: "🔎",
        categoria: "interna",
        descricao: "Grava empresas pesquisadas na web dentro do Pilar",
        paraQue: "Pesquisar leads e trazer direto para a tela de prospecção.",
        tipo: "http",
        endpoint: "https://crm.pilar.com.br/functions/v1/mcp",
        metodo: "POST",
      },
    ],
  },
  {
    slug: "midia",
    nome: "Imagem e vídeo",
    icone: "🎨",
    itens: [
      {
        slug: "gerar-imagem",
        nome: "Gerar imagem",
        icone: "🖼️",
        categoria: "midia",
        descricao: "Cria imagens a partir de um texto",
        paraQue: "Criar artes de post, banners e fotos de produto.",
        tipo: "http",
        endpoint: "https://crm.pilar.com.br/functions/v1/ai-image",
        metodo: "POST",
        input_schema: { prompt: "descreva a imagem", tamanho: "1024x1024" },
      },
      {
        slug: "gerar-video",
        nome: "Gerar vídeo",
        icone: "🎬",
        categoria: "midia",
        descricao: "Cria vídeos curtos a partir de texto ou imagem",
        paraQue: "Produzir reels e vídeos de campanha.",
        tipo: "http",
        endpoint: "https://crm.pilar.com.br/functions/v1/ai-video",
        metodo: "POST",
        input_schema: { prompt: "descreva o vídeo", duracao: 8 },
      },
      {
        slug: "narracao",
        nome: "Narração (voz)",
        icone: "🎙️",
        categoria: "midia",
        descricao: "Transforma texto em áudio",
        paraQue: "Colocar voz em vídeos e avisos.",
        tipo: "http",
        endpoint: "https://api.elevenlabs.io/v1/text-to-speech/VOICE_ID",
        metodo: "POST",
        credencial_ref: "ELEVENLABS_API_KEY",
        input_schema: { text: "texto para narrar" },
      },
    ],
  },
  {
    slug: "web",
    nome: "Web e dados",
    icone: "🌐",
    itens: [
      {
        slug: "http-generico",
        nome: "Chamar uma API",
        icone: "🔌",
        categoria: "api",
        descricao: "Requisição HTTP para qualquer serviço",
        paraQue: "Conectar qualquer sistema que tenha API.",
        tipo: "http",
        endpoint: "https://api.exemplo.com/recurso",
        metodo: "GET",
      },
      {
        slug: "scraping",
        nome: "Ler site (scraping)",
        icone: "🎭",
        categoria: "automacao",
        descricao: "Abre uma página e extrai o conteúdo com Playwright",
        paraQue: "Monitorar preços, notícias ou concorrentes.",
        tipo: "http",
        endpoint: "https://sdk.pilar.com.br/playwright/scrape",
        metodo: "POST",
        input_schema: { url: "https://site.com", formato: "markdown" },
      },
      {
        slug: "screenshot",
        nome: "Print de página",
        icone: "📸",
        categoria: "automacao",
        descricao: "Captura imagem ou PDF de uma página",
        paraQue: "Guardar comprovantes e gerar relatórios visuais.",
        tipo: "http",
        endpoint: "https://sdk.pilar.com.br/playwright/screenshot",
        metodo: "POST",
        input_schema: { url: "https://site.com" },
      },
      {
        slug: "cnpj-receita",
        nome: "Consulta CNPJ",
        icone: "🏛️",
        categoria: "api",
        descricao: "Busca dados públicos da Receita Federal",
        paraQue: "Preencher cadastro automaticamente pelo CNPJ.",
        tipo: "http",
        endpoint: "https://brasilapi.com.br/api/cnpj/v1/{cnpj}",
        metodo: "GET",
      },
      {
        slug: "cep",
        nome: "Consulta CEP",
        icone: "📍",
        categoria: "api",
        descricao: "Busca endereço pelo CEP",
        paraQue: "Completar endereços em cadastros e entregas.",
        tipo: "http",
        endpoint: "https://brasilapi.com.br/api/cep/v2/{cep}",
        metodo: "GET",
      },
    ],
  },
];

export const CATALOGO_MCPS: McpPreset[] = [
  {
    slug: "pilar",
    nome: "Pilar CRM",
    icone: "🏛️",
    descricao: "Servidor MCP do próprio Pilar (empresas, produtos, prospecção)",
    paraQue: "Deixar o Claude/ChatGPT consultar e gravar dados do seu CRM.",
    endpoint: "https://crm.pilar.com.br/functions/v1/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "sdk-runner",
    nome: "Servidor de execução (Railway)",
    icone: "⚙️",
    descricao: "MCP do Agent SDK com Playwright, Remotion e scripts",
    paraQue: "Rodar tarefas pesadas: vídeo, scraping, scripts de skills.",
    endpoint: "https://sdk.pilar.com.br/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "notion",
    nome: "Notion",
    icone: "📝",
    descricao: "Páginas e bancos de dados do Notion",
    paraQue: "Ler e criar documentos e bases do time.",
    endpoint: "https://mcp.notion.com/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "linear",
    nome: "Linear",
    icone: "📌",
    descricao: "Issues e projetos do Linear",
    paraQue: "Criar e acompanhar tarefas automaticamente.",
    endpoint: "https://mcp.linear.app/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "sentry",
    nome: "Sentry",
    icone: "🐞",
    descricao: "Erros e alertas de aplicação",
    paraQue: "Investigar falhas e gerar resumo de incidentes.",
    endpoint: "https://mcp.sentry.dev/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "github",
    nome: "GitHub",
    icone: "🐙",
    descricao: "Repositórios, issues e pull requests",
    paraQue: "Consultar código e abrir issues pelo agente.",
    endpoint: "https://api.githubcopilot.com/mcp/",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "posthog",
    nome: "PostHog",
    icone: "📊",
    descricao: "Analytics, feature flags e experimentos",
    paraQue: "Pedir relatórios de uso do produto em linguagem natural.",
    endpoint: "https://mcp.posthog.com/mcp",
    tipo: "http",
    precisaCredencial: true,
  },
  {
    slug: "personalizado",
    nome: "Outro servidor",
    icone: "➕",
    descricao: "Cadastrar um MCP próprio informando a URL",
    paraQue: "Conectar qualquer servidor MCP interno ou de parceiro.",
    endpoint: "",
    tipo: "http",
  },
];
