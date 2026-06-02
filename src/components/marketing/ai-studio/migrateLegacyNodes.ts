import { StudioNode } from './types';

/**
 * Converte blocos legados de projetos antigos para os novos blocos unificados.
 * Roda automaticamente ao abrir um workflow salvo.
 *
 * Fusões aplicadas:
 *  - imageInput          → multiImageRef  (mesmo shape `images: []`)
 *  - videoInput          → multiVideoRef  (mesmo shape `videos: []`)
 *  - productImageSelect  → multiProductSelect (transforma single → array)
 *  - galleryXxx (8 tipos) → gallerySalvas com `config.categoria = 'xxx'`
 */
const GALLERY_TYPE_TO_CATEGORIA: Record<string, string> = {
  galleryInfluencer: 'influencer',
  galleryAmbiente: 'ambiente',
  galleryEstilo: 'estilo',
  galleryPaleta: 'paleta',
  galleryTextura: 'textura',
  galleryLogo: 'logo',
  galleryPose: 'pose',
  galleryRoupa: 'roupa',
  gallerySalvas: 'salvas',
};

export function migrateLegacyNodes(nodes: StudioNode[]): StudioNode[] {
  return (nodes || []).map((node) => {
    const t = node?.data?.type as string;
    const cfg = node?.data?.config || {};

    // 1) Galerias → gallerySalvas unificado com categoria
    if (t && t.startsWith('gallery')) {
      const categoria = GALLERY_TYPE_TO_CATEGORIA[t] || 'salvas';
      if (t === 'gallerySalvas' && cfg.categoria) return node; // já migrado
      return {
        ...node,
        data: {
          ...node.data,
          type: 'gallerySalvas',
          label: 'Galeria de Referência',
          config: { ...cfg, categoria },
        },
      };
    }

    // 2) imageInput → multiImageRef (config compatível)
    if (t === 'imageInput') {
      return {
        ...node,
        data: {
          ...node.data,
          type: 'multiImageRef',
          label: 'Imagens de Referência',
          config: { images: cfg.images || [], referenceRole: cfg.referenceRole || '', ...cfg },
        },
      };
    }

    // 3) videoInput → multiVideoRef
    if (t === 'videoInput') {
      return {
        ...node,
        data: {
          ...node.data,
          type: 'multiVideoRef',
          label: 'Vídeos de Referência',
          config: { videos: cfg.videos || [], ...cfg },
        },
      };
    }

    // 4) productImageSelect (single) → multiProductSelect (array)
    if (t === 'productImageSelect') {
      const products = cfg.selectedImageUrl
        ? [{ id: cfg.productId || '', nome: cfg.productName || '', foto_url: cfg.selectedImageUrl }]
        : [];
      return {
        ...node,
        data: {
          ...node.data,
          type: 'multiProductSelect',
          label: 'Produtos',
          config: { products },
        },
      };
    }

    return node;
  });
}

/**
 * Resolve um ID semântico de "bloco de referência" (usado em presets, agentes,
 * bots e em qualquer fluxo que descreva referências exigidas por um prompt)
 * para a especificação do bloco UNIFICADO correspondente no canvas.
 *
 * Mantém compatibilidade com presets/agentes antigos que ainda usam os IDs
 * legados (productImageSelect, galleryInfluencer, imageInput, etc.) e garante
 * que somente os blocos unificados sejam criados de fato.
 */
export function resolveReferenceBlockSpec(blockId: string): {
  type: string;
  label: string;
  config: Record<string, any>;
} | null {
  if (blockId === 'productImageSelect' || blockId === 'multiProductSelect') {
    return { type: 'multiProductSelect', label: '📦 Produtos', config: { products: [] } };
  }
  if (blockId === 'imageInput' || blockId === 'multiImageRef') {
    return {
      type: 'multiImageRef',
      label: '🖼️ Imagens de Referência',
      config: { images: [], referenceRole: '' },
    };
  }
  if (blockId === 'videoInput' || blockId === 'multiVideoRef') {
    return { type: 'multiVideoRef', label: '🎞️ Vídeos de Referência', config: { videos: [] } };
  }
  if (blockId && blockId.startsWith('gallery')) {
    const categoria = GALLERY_TYPE_TO_CATEGORIA[blockId] || 'salvas';
    const labels: Record<string, string> = {
      influencer: '👤 Influencer',
      logo: '🏷️ Logo',
      roupa: '👗 Roupa',
      pose: '🤸 Pose',
      ambiente: '🏔️ Ambiente',
      estilo: '🎨 Estilo',
      textura: '🧱 Textura',
      paleta: '🎨 Paleta',
      salvas: '🖼️ Galeria',
    };
    return {
      type: 'gallerySalvas',
      label: labels[categoria] || '🖼️ Galeria',
      config: { categoria, selectedImageUrl: '', selectedImageName: '', galleryImageId: '' },
    };
  }
  return null;
}

