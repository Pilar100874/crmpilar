import { StudioNodeType, NODE_CATEGORIES, getNodeMeta } from './types';

/**
 * Mapa de compatibilidade de conexões entre blocos do AI Creative Studio.
 * Para cada tipo de bloco define a quais blocos de DESTINO ele pode ser ligado.
 */
export const NODE_CONNECTIONS: Record<StudioNodeType, StudioNodeType[]> = {
  // ===== Entradas de texto =====
  textInput: ['llmProcess', 'imageEdit', 'productComposite', 'videoGen', 'audioGen', 'musicGen', 'loopOutput'],
  systemPrompt: ['llmProcess', 'imageAnalyze', 'productComposite', 'videoGen'],

  // ===== Imagens de referência =====
  imageInput: ['imageEdit', 'productComposite', 'videoGen', 'imageAnalyze', 'lipSync', 'mediaCorrection', 'loopOutput'],
  multiImageRef: ['productComposite', 'imageEdit', 'videoGen', 'imageAnalyze', 'loopOutput'],

  // ===== Vídeos de referência =====
  videoInput: ['videoGen', 'videoMerge', 'lipSync', 'mediaCorrection'],
  multiVideoRef: ['videoGen', 'videoMerge'],

  // ===== Produtos =====
  productImageSelect: ['productComposite', 'imageEdit', 'videoGen', 'loopOutput'],
  multiProductSelect: ['productComposite', 'imageEdit', 'videoGen', 'loopOutput'],

  // ===== Galerias de referência =====
  galleryInfluencer: ['productComposite', 'imageEdit', 'videoGen'],
  galleryAmbiente: ['productComposite', 'imageEdit', 'videoGen'],
  galleryEstilo: ['productComposite', 'imageEdit', 'videoGen'],
  galleryPaleta: ['productComposite', 'imageEdit', 'videoGen'],
  galleryTextura: ['productComposite', 'imageEdit', 'videoGen'],
  galleryLogo: ['productComposite', 'imageEdit', 'videoGen'],
  galleryPose: ['productComposite', 'imageEdit', 'videoGen'],
  galleryRoupa: ['productComposite', 'imageEdit', 'videoGen'],
  gallerySalvas: ['productComposite', 'imageEdit', 'videoGen', 'imageAnalyze'],
  mediaGallery: ['productComposite', 'imageEdit', 'videoGen', 'imageAnalyze'],

  // ===== Texto / Conteúdo =====
  textStyle: ['productComposite', 'imageEdit'],
  textContent: ['productComposite', 'imageEdit'],
  imageCaption: ['productComposite', 'imageEdit', 'videoGen'],
  platformFormat: ['productComposite', 'imageEdit', 'videoGen', 'loopOutput'],

  // ===== Roteiros (somente vídeo) =====
  videoScript: ['videoGen'],
  reelScript: ['videoGen'],

  // ===== IA Texto =====
  llmProcess: ['productComposite', 'imageEdit', 'videoGen', 'audioGen', 'output'],
  imageAnalyze: ['llmProcess', 'productComposite', 'imageEdit', 'output'],

  // ===== IA Imagem =====
  imageGen: ['imageEdit', 'productComposite', 'videoGen', 'mediaCorrection', 'output', 'loopOutput'],
  imageEdit: ['productComposite', 'videoGen', 'mediaCorrection', 'output', 'loopOutput'],
  productComposite: ['imageEdit', 'videoGen', 'mediaCorrection', 'output', 'loopOutput'],

  // ===== IA Vídeo =====
  videoGen: ['videoMerge', 'lipSync', 'mediaCorrection', 'output'],
  videoMerge: ['lipSync', 'output'],

  // ===== IA Áudio =====
  audioGen: ['lipSync', 'videoMerge', 'output'],
  musicGen: ['videoMerge', 'output'],
  lipSync: ['videoMerge', 'output'],

  // ===== Refinamento =====
  mediaCorrection: ['productComposite', 'imageEdit', 'videoGen'],

  // ===== Looping =====
  loopOutput: ['output'],
  randomPick: ['productComposite', 'imageEdit', 'videoGen', 'loopOutput'],

  // ===== Saída =====
  output: [],
};

/** Retorna a lista de tipos que podem RECEBER conexão deste bloco. */
export const getDownstreamTargets = (type: StudioNodeType): StudioNodeType[] => {
  return NODE_CONNECTIONS[type] || [];
};

/** Retorna os tipos de blocos que podem se conectar AO bloco informado. */
export const getUpstreamSources = (type: StudioNodeType): StudioNodeType[] => {
  const sources: StudioNodeType[] = [];
  (Object.keys(NODE_CONNECTIONS) as StudioNodeType[]).forEach((src) => {
    if (NODE_CONNECTIONS[src].includes(type)) sources.push(src);
  });
  return sources;
};

export interface NodeConnectionHelp {
  downstream: { type: StudioNodeType; label: string; icon: string }[];
  upstream: { type: StudioNodeType; label: string; icon: string }[];
}

export const getConnectionHelp = (type: StudioNodeType): NodeConnectionHelp => {
  const map = (arr: StudioNodeType[]) =>
    arr
      .map((t) => {
        const meta = getNodeMeta(t);
        return meta ? { type: t, label: meta.label, icon: meta.icon } : null;
      })
      .filter(Boolean) as { type: StudioNodeType; label: string; icon: string }[];

  return {
    downstream: map(getDownstreamTargets(type)),
    upstream: map(getUpstreamSources(type)),
  };
};

// silence unused import warning if tree-shaken
void NODE_CATEGORIES;
