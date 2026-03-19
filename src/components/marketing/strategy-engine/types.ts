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
  vox: { name: 'Vox Agent', icon: '🎙️', color: '#8B5CF6', description: 'Insights da voz do cliente' },
  cipher: { name: 'Cipher Agent', icon: '🔍', color: '#3B82F6', description: 'Inteligência competitiva' },
  positioning: { name: 'Positioning Strategist', icon: '🎯', color: '#10B981', description: 'Posicionamento estratégico' },
  funnel: { name: 'Funnel Architect', icon: '📊', color: '#F59E0B', description: 'Arquitetura do funil' },
  vsl: { name: 'VSL Writer', icon: '🎬', color: '#EF4444', description: 'Roteiro de VSL' },
  landing_page: { name: 'Landing Page Builder', icon: '🏗️', color: '#6366F1', description: 'Estrutura da landing page' },
  creative: { name: 'Creative Strategist', icon: '🎨', color: '#EC4899', description: 'Criativos de anúncios' },
  email: { name: 'Email Engine', icon: '📧', color: '#14B8A6', description: 'Sequências de email' },
  reel: { name: 'Reel Writer', icon: '📱', color: '#F97316', description: 'Scripts de vídeos curtos' },
};

export const AGENT_ORDER = ['vox', 'cipher', 'positioning', 'funnel', 'vsl', 'landing_page', 'creative', 'email', 'reel'];

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
