/**
 * Store singleton (módulo) para acompanhar jobs do AI Creative Studio
 * rodando em background, mesmo se o usuário navegar para outra tela.
 *
 * Como o JS continua executando enquanto a SPA está aberta, qualquer
 * promise iniciada (executeWorkflow / generateAsyncStudioVideo) segue
 * rodando — só precisamos guardar o estado fora do componente para
 * o indicador flutuante ler.
 */

export type StudioJobStatus = 'running' | 'success' | 'error' | 'cancelled';

export interface StudioJob {
  id: string;
  workflowName: string;
  status: StudioJobStatus;
  /** Mensagem curta do progresso atual ("🎬 Cena 2/4: Google Veo renderizando…") */
  message: string;
  /** 0-100 (estimativa). undefined = indeterminado */
  progress?: number;
  /** Nº de nós já executados vs total */
  nodesDone: number;
  nodesTotal: number;
  /** Cenas (vídeo multi-cena) já prontas vs total, opcional */
  sceneDone?: number;
  sceneTotal?: number;
  /** ISO timestamp */
  startedAt: number;
  finishedAt?: number;
  /** Tempo estimado (segundos) calculado pelo preflight */
  etaSeconds?: number;
  /** Última URL gerada, para mostrar no indicador */
  lastResultUrl?: string;
  /** Rota para voltar e ver o resultado */
  returnTo: string;
  /** Erro, se houver */
  error?: string;
}

type Listener = (jobs: StudioJob[]) => void;

const jobs = new Map<string, StudioJob>();
const listeners = new Set<Listener>();

function emit() {
  const snapshot = Array.from(jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
  listeners.forEach((l) => {
    try { l(snapshot); } catch {}
  });
}

export const studioBackgroundJobs = {
  start(job: Omit<StudioJob, 'startedAt' | 'status' | 'nodesDone'> & { nodesDone?: number }): string {
    const full: StudioJob = {
      ...job,
      nodesDone: job.nodesDone ?? 0,
      status: 'running',
      startedAt: Date.now(),
    };
    jobs.set(full.id, full);
    emit();
    return full.id;
  },
  update(id: string, patch: Partial<StudioJob>) {
    const cur = jobs.get(id);
    if (!cur) return;
    jobs.set(id, { ...cur, ...patch });
    emit();
  },
  finish(id: string, status: StudioJobStatus = 'success', patch: Partial<StudioJob> = {}) {
    const cur = jobs.get(id);
    if (!cur) return;
    jobs.set(id, { ...cur, ...patch, status, finishedAt: Date.now() });
    emit();
  },
  remove(id: string) {
    jobs.delete(id);
    emit();
  },
  clearFinished() {
    for (const [id, j] of jobs.entries()) {
      if (j.status !== 'running') jobs.delete(id);
    }
    emit();
  },
  list(): StudioJob[] {
    return Array.from(jobs.values()).sort((a, b) => b.startedAt - a.startedAt);
  },
  subscribe(l: Listener): () => void {
    listeners.add(l);
    l(this.list());
    return () => { listeners.delete(l); };
  },
};

/**
 * Estima tempo total (segundos) de um workflow analisando os nós ativos.
 * Heurísticas conservadoras baseadas no comportamento dos provedores.
 */
export interface EtaInput {
  type: string;
  model?: string;
  scenes?: number;
  paused?: boolean;
}

export function estimateWorkflowSeconds(nodes: EtaInput[]): { total: number; breakdown: Array<{ label: string; seconds: number }> } {
  const breakdown: Array<{ label: string; seconds: number }> = [];
  let total = 0;
  for (const n of nodes) {
    if (n.paused) continue;
    if (n.type === 'textGen') { breakdown.push({ label: 'Texto IA', seconds: 8 }); total += 8; continue; }
    if (n.type === 'imageGen' || n.type === 'productComposite' || n.type === 'imageComposite' || n.type === 'imageEdit') {
      const m = (n.model || '').toLowerCase();
      let s = 25;
      if (m.includes('midjourney') || m.includes('flux-pro') || m.includes('seedream') || m.includes('dall-e-4') || m.includes('gpt-image')) s = 60;
      if (m.includes('flux-schnell') || m.includes('sd3.5-turbo') || m.includes('nano-banana')) s = 15;
      breakdown.push({ label: `Imagem (${m || 'auto'})`, seconds: s });
      total += s;
      continue;
    }
    if (n.type === 'videoGen') {
      const m = (n.model || '').toLowerCase();
      const scenes = Math.max(1, n.scenes || 1);
      let perScene = 90; // default texto→vídeo rápido
      if (m.includes('veo')) perScene = 180;
      if (m.includes('runway') || m.includes('gen-4') || m.includes('gen4')) perScene = 240;
      if (m.includes('kling')) perScene = 200;
      if (m.includes('seedance') || m.includes('seedvideo')) perScene = 600; // 5-15 min, conservador
      if (m.includes('minimax')) perScene = 180;
      if (m.includes('ltx')) perScene = 60;
      if (m.includes('gif')) perScene = 20;
      const sec = perScene * scenes + (scenes > 1 ? 30 : 0); // +30s para concatenação ffmpeg
      breakdown.push({ label: `Vídeo (${m || 'auto'}) ${scenes > 1 ? `× ${scenes} cenas` : ''}`, seconds: sec });
      total += sec;
      continue;
    }
    if (n.type === 'audioGen' || n.type === 'musicGen') {
      breakdown.push({ label: n.type, seconds: 20 });
      total += 20;
    }
  }
  return { total, breakdown };
}

/**
 * Sugestões de troca de modelo para reduzir tempo / aumentar qualidade.
 */
export function modelSuggestions(nodes: EtaInput[]): string[] {
  const tips: string[] = [];
  for (const n of nodes) {
    if (n.paused) continue;
    const m = (n.model || '').toLowerCase();
    if (n.type === 'videoGen') {
      if (m.includes('seedance') || m.includes('seedvideo')) {
        tips.push('Vídeo: "Seedance" demora 5–15 min/cena. Para protótipos use Google Veo 3.1 Fast (≈3 min) ou GIF Animado (≈20 s).');
      }
      if (m.includes('runway') || m.includes('gen-4')) {
        tips.push('Vídeo: "Runway Gen-4" prioriza qualidade. Para rascunhos use Kling 1.6 ou Veo Flash.');
      }
      if (!m || m === 'auto') {
        tips.push('Vídeo: nenhum modelo escolhido — selecione um (ex: Veo 3.1 Flash) para evitar fallback genérico.');
      }
    }
    if ((n.type === 'imageGen' || n.type === 'productComposite') && (m.includes('midjourney') || m.includes('flux-pro') || m.includes('dall-e-4'))) {
      tips.push('Imagem: modelos premium (Midjourney/Flux Pro/DALL·E 4) levam ~1 min. Para iterações rápidas use Gemini Flash Image ou Flux Schnell (~15 s).');
    }
  }
  // dedup
  return Array.from(new Set(tips));
}

export function formatSeconds(total: number): string {
  if (total < 60) return `${total}s`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s ? `${m}min ${s}s` : `${m}min`;
}
