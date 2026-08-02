export interface CatalogItem {
  slug: string;
  nome: string;
  icone: string;
  descricao: string;
}

export interface CatalogCategory {
  slug: string;
  nome: string;
  icone: string;
  itens: CatalogItem[];
}

const i = (slug: string, nome: string, icone: string, descricao: string): CatalogItem => ({
  slug,
  nome,
  icone,
  descricao,
});

export const CATALOGO_RECURSOS: CatalogCategory[] = [
  {
    slug: "comunicacao",
    nome: "Comunicação",
    icone: "💬",
    itens: [
      i("whatsapp", "WhatsApp", "🟢", "Envio de mensagens via WhatsApp"),
      i("email", "Email", "✉️", "Envio de e-mails transacionais"),
      i("sms", "SMS", "📱", "Envio de mensagens SMS"),
      i("slack", "Slack", "💼", "Mensagens em canais do Slack"),
      i("telegram", "Telegram", "✈️", "Bot do Telegram"),
      i("discord", "Discord", "🎮", "Mensagens em servidores Discord"),
      i("push", "Push", "🔔", "Notificações push"),
      i("webhook", "Webhook", "🔗", "Disparo de webhooks HTTP"),
    ],
  },
  {
    slug: "documentos",
    nome: "Documentos",
    icone: "📄",
    itens: [
      i("pdf", "PDF", "📕", "Geração e leitura de PDF"),
      i("word", "Word", "📘", "Documentos .docx"),
      i("excel", "Excel", "📗", "Planilhas .xlsx"),
      i("powerpoint", "PowerPoint", "📙", "Apresentações .pptx"),
      i("zip", "ZIP", "🗜️", "Compactação de arquivos"),
    ],
  },
  {
    slug: "imagem",
    nome: "Imagem",
    icone: "🖼️",
    itens: [
      i("flux", "Flux", "🌀", "Geração de imagens com Flux"),
      i("gpt-image", "GPT Image", "🎨", "Geração de imagens OpenAI"),
      i("ideogram", "Ideogram", "🔤", "Imagens com tipografia"),
      i("higgsfield-image", "Higgsfield Image", "✨", "Imagens cinematográficas com Higgsfield"),
      i("upscaler", "Upscaler", "🔍", "Aumento de resolução"),
      i("remove-background", "Remove Background", "✂️", "Remoção de fundo"),
    ],
  },
  {
    slug: "video",
    nome: "Vídeo",
    icone: "🎬",
    itens: [
      i("kling", "Kling", "🎞️", "Geração de vídeo Kling"),
      i("runway", "Runway", "🚀", "Geração de vídeo Runway"),
      i("veo", "Veo", "📹", "Geração de vídeo Veo"),
      i("higgsfield", "Higgsfield", "🌌", "Vídeos com movimentos de câmera Higgsfield"),
      i("remotion", "Remotion", "⚛️", "Vídeo programático em React (Remotion)"),
      i("ffmpeg", "FFmpeg", "🛠️", "Edição e conversão de vídeo"),
    ],
  },
  {
    slug: "automacao",
    nome: "Automação / Navegador",
    icone: "🤖",
    itens: [
      i("playwright", "Playwright", "🎭", "Automação de navegador, scraping e testes E2E"),
      i("playwright-screenshot", "Playwright Screenshot", "📸", "Captura de telas e PDFs de páginas"),
      i("http-request", "HTTP Request", "🌐", "Requisição HTTP genérica"),
      i("claude-code", "Claude Code", "🧠", "Rotina executada pelo Claude Agent SDK"),
    ],
  },

  {
    slug: "audio",
    nome: "Áudio",
    icone: "🔊",
    itens: [
      i("elevenlabs", "ElevenLabs", "🗣️", "Vozes sintéticas"),
      i("whisper", "Whisper", "👂", "Transcrição de áudio"),
      i("speech-to-text", "Speech to Text", "📝", "Áudio para texto"),
      i("text-to-speech", "Text to Speech", "🎙️", "Texto para áudio"),
    ],
  },
  {
    slug: "banco",
    nome: "Banco de dados",
    icone: "🗄️",
    itens: [
      i("supabase", "Supabase", "⚡", "Banco Supabase/Postgres"),
      i("postgresql", "PostgreSQL", "🐘", "Conexão PostgreSQL"),
      i("mysql", "MySQL", "🐬", "Conexão MySQL"),
      i("mongodb", "MongoDB", "🍃", "Conexão MongoDB"),
    ],
  },
  {
    slug: "storage",
    nome: "Storage",
    icone: "☁️",
    itens: [
      i("s3", "S3", "🪣", "Amazon S3"),
      i("google-drive", "Google Drive", "📁", "Google Drive"),
      i("dropbox", "Dropbox", "📦", "Dropbox"),
      i("cloudinary", "Cloudinary", "🌤️", "Cloudinary"),
    ],
  },
  {
    slug: "redes-sociais",
    nome: "Redes sociais",
    icone: "🌐",
    itens: [
      i("instagram", "Instagram", "📸", "Publicação no Instagram"),
      i("facebook", "Facebook", "👍", "Publicação no Facebook"),
      i("tiktok", "TikTok", "🎵", "Publicação no TikTok"),
      i("linkedin", "LinkedIn", "💼", "Publicação no LinkedIn"),
      i("youtube", "YouTube", "▶️", "Upload no YouTube"),
      i("x", "X", "✖️", "Publicação no X"),
    ],
  },
  {
    slug: "helpers",
    nome: "Helpers",
    icone: "🧩",
    itens: [
      i("delay", "Delay", "⏱️", "Aguardar um tempo"),
      i("loop", "Loop", "🔁", "Repetir etapas"),
      i("if", "If", "❓", "Condição"),
      i("else", "Else", "↔️", "Caminho alternativo"),
      i("retry", "Retry", "♻️", "Tentar novamente"),
      i("cache", "Cache", "💾", "Armazenar em cache"),
      i("human-approval", "Human Approval", "🙋", "Aprovação humana"),
      i("merge", "Merge", "🔀", "Unir dados"),
      i("split", "Split", "✂️", "Dividir dados"),
      i("template-prompt", "Template Prompt", "🧾", "Template de prompt"),
      i("regex", "Regex", "🔎", "Expressão regular"),
      i("json-parser", "JSON Parser", "{}", "Interpretar JSON"),
    ],
  },
];

export function findCatalogItem(categoria: string, slug: string) {
  return CATALOGO_RECURSOS.find((c) => c.slug === categoria)?.itens.find((x) => x.slug === slug);
}
