export interface StrategyProject {
  id: string;
  estabelecimento_id: string;
  user_id: string;
  nome: string;
  descricao_negocio: string;
  status: string;
  strategic_memory: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentExecution {
  id: string;
  project_id: string;
  agent_type: string;
  agent_name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  input_data: any;
  output_data: any;
  validation_score: number | null;
  validation_details: any;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface StrategyArtifact {
  id: string;
  project_id: string;
  execution_id: string | null;
  tipo: string;
  titulo: string;
  conteudo: any;
  version: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  project_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agent_type: string | null;
  metadata: any;
  created_at: string;
}

export const AGENT_INFO: Record<string, { name: string; icon: string; color: string; description: string }> = {
  vox: { name: 'Voz do Cliente', icon: '🎙️', color: '#8B5CF6', description: 'Coleta dores, desejos e objeções reais do público para guiar toda a estratégia.' },
  cipher: { name: 'Inteligência Competitiva', icon: '🔍', color: '#3B82F6', description: 'Mapeia concorrentes, ofertas e brechas de mercado para identificar oportunidades.' },
  positioning: { name: 'Posicionamento', icon: '🎯', color: '#10B981', description: 'Define proposta de valor, diferenciais e mensagem central da marca.' },
  funnel: { name: 'Arquiteto de Funil', icon: '📊', color: '#F59E0B', description: 'Desenha o funil de vendas completo, do topo à conversão final.' },
  vsl: { name: 'Roteirista de Vídeo', icon: '🎬', color: '#EF4444', description: 'Cria roteiro de VSL persuasivo com gancho, história, oferta e CTA.' },
  landing_page: { name: 'Landing Page', icon: '🏗️', color: '#6366F1', description: 'Estrutura seções, copy e CTAs de uma landing page de alta conversão.' },
  creative: { name: 'Criativos', icon: '🎨', color: '#EC4899', description: 'Gera conceitos de anúncios com headlines, ângulos e variações criativas.' },
  email: { name: 'Email Marketing', icon: '📧', color: '#14B8A6', description: 'Cria sequências de e-mail de nutrição, vendas e reengajamento.' },
  reel: { name: 'Roteirista de Reels', icon: '📱', color: '#F97316', description: 'Escreve roteiros de vídeos curtos para Reels, TikTok e Shorts.' },
  seo: { name: 'SEO & Conteúdo', icon: '🔎', color: '#059669', description: 'Define palavras-chave, pautas e estratégia de conteúdo orgânico.' },
  paid_media: { name: 'Mídia Paga', icon: '💰', color: '#DC2626', description: 'Planeja campanhas, públicos e estrutura de tráfego pago.' },
  social_media: { name: 'Social Media', icon: '📲', color: '#7C3AED', description: 'Monta calendário editorial e linha de conteúdo das redes sociais.' },
  site_builder: { name: 'Site Builder', icon: '🌐', color: '#0EA5E9', description: 'Constrói site one-page completo com todas as seções estratégicas.' },
  video_producer: { name: 'Produtor de Vídeo', icon: '🎥', color: '#A855F7', description: 'Cria direção criativa, storyboards e referências visuais para vídeos.' },
  influencer_content: { name: 'Influencer & Imagens', icon: '🤳', color: '#E11D48', description: 'Define briefings de influenciadores e conteúdo visual da marca.' },
};

export const AGENT_ORDER = ['vox', 'cipher', 'positioning', 'funnel', 'vsl', 'landing_page', 'creative', 'email', 'reel', 'seo', 'paid_media', 'social_media', 'site_builder', 'video_producer', 'influencer_content'];

// Dependency map: each agent lists agents that MUST be completed before it can run
export const AGENT_DEPENDENCIES: Record<string, string[]> = {
  vox: [],
  cipher: [],
  positioning: ['vox', 'cipher'],
  funnel: ['positioning'],
  vsl: ['funnel'],
  landing_page: ['funnel'],
  creative: ['funnel'],
  email: ['funnel'],
  reel: ['funnel'],
  seo: ['positioning'],
  paid_media: ['creative', 'funnel'],
  social_media: ['positioning', 'reel'],
  site_builder: ['landing_page', 'creative'],
  video_producer: ['vsl', 'creative'],
  influencer_content: ['positioning', 'creative'],
};

/**
 * Returns unmet dependencies for a given agent based on completed executions.
 */
export function getUnmetDependencies(
  agentKey: string,
  completedAgents: Set<string>,
  customDeps?: Record<string, string[]>
): string[] {
  const deps = customDeps?.[agentKey] ?? AGENT_DEPENDENCIES[agentKey] ?? [];
  return deps.filter(dep => !completedAgents.has(dep));
}

// Helper to merge hardcoded agents with custom agents
export function getMergedAgentInfo(customAgents: Array<{ agent_key: string; name: string; icon: string; color: string; description: string }>): Record<string, { name: string; icon: string; color: string; description: string }> {
  const merged = { ...AGENT_INFO };
  for (const agent of customAgents) {
    merged[agent.agent_key] = {
      name: agent.name,
      icon: agent.icon,
      color: agent.color,
      description: agent.description,
    };
  }
  return merged;
}

export function getMergedAgentOrder(customAgents: Array<{ agent_key: string; ordem: number }>): string[] {
  const customKeys = customAgents
    .sort((a, b) => a.ordem - b.ordem)
    .map(a => a.agent_key);
  return [...AGENT_ORDER, ...customKeys];
}

/**
 * Build a merged dependency map combining native + custom agent deps.
 */
export function getMergedDependencies(customAgents: Array<{ agent_key: string; dependencies: string[] }>): Record<string, string[]> {
  const merged: Record<string, string[]> = { ...AGENT_DEPENDENCIES };
  for (const agent of customAgents) {
    merged[agent.agent_key] = agent.dependencies || [];
  }
  return merged;
}
