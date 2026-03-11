import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudioNode, StudioEdge, StudioNodeData, StudioNodeType } from './types';
import { nodeResultStore } from './useNodeResults';
import { toast } from 'sonner';

export interface ExecutionLogEntry {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
  startedAt?: number;
  completedAt?: number;
  elapsedMs?: number;
  errorMessage?: string;
}

export interface BatchReviewItem {
  imageUrl: string;
  productName: string;
  productId?: string;
}

export function useStudioExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [batchReviewResults, setBatchReviewResults] = useState<BatchReviewItem[]>([]);
  const onNodesUpdateRef = useRef<((nodes: StudioNode[]) => void) | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const callStudio = async (action: string, params: Record<string, any>, timeoutMs: number = 120000) => {
    console.log(`[Studio] Calling edge function: action=${action}`, params);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-creative-studio`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ action, params }),
          signal: controller.signal,
        }
      );
    } catch (fetchErr: any) {
      clearTimeout(timer);
      if (fetchErr.name === 'AbortError') {
        throw new Error(`Timeout: a geração demorou mais de ${Math.round(timeoutMs / 1000)}s`);
      }
      throw fetchErr;
    }
    clearTimeout(timer);
    if (!response.ok) {
      const errText = await response.text().catch(() => 'Unknown error');
      console.error(`[Studio] Edge function error ${response.status}:`, errText);
      
      // Parse friendly error message from JSON response
      let friendlyMsg = errText.substring(0, 200);
      try {
        const errJson = JSON.parse(errText);
        const rawError = errJson?.error || '';
        
        // Extract specific API error patterns
        if (rawError.includes('401') || rawError.includes('Incorrect API key') || rawError.includes('Unauthorized')) {
          friendlyMsg = '🔑 Chave de API inválida ou expirada. Verifique sua chave em Configurações → APIs Pagas.';
        } else if (rawError.includes('402') || rawError.includes('Payment') || rawError.includes('insufficient')) {
          friendlyMsg = '💳 Créditos insuficientes no provedor. Adicione saldo na sua conta do provedor.';
        } else if (rawError.includes('429') || rawError.includes('Rate limit')) {
          friendlyMsg = '⏳ Limite de requisições excedido. Aguarde alguns segundos e tente novamente.';
        } else if (rawError.includes('403') || rawError.includes('Forbidden') || rawError.includes('access')) {
          friendlyMsg = '🚫 Sem permissão para este recurso. Verifique se sua conta tem acesso a este modelo/serviço.';
        } else if (rawError.includes('not configured')) {
          friendlyMsg = '⚙️ ' + rawError;
        } else if (rawError) {
          friendlyMsg = rawError.substring(0, 200);
        }
      } catch {}
      
      throw new Error(friendlyMsg);
    }
    // Read as text first to handle large payloads safely
    const rawText = await response.text();
    console.log(`[Studio] Raw response length: ${rawText.length} chars`);
    let data: any;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error(`[Studio] Failed to parse JSON response (${rawText.length} chars):`, parseErr);
      throw new Error(`Failed to parse response (${rawText.length} chars)`);
    }
    const result = data?.result;
    console.log(`[Studio] Edge function result:`, {
      hasResult: !!result,
      type: typeof result,
      keys: result ? Object.keys(result) : 'none',
      hasImageUrl: !!result?.imageUrl,
      imageUrlLength: result?.imageUrl?.length || 0,
      hasText: !!result?.text,
    });
    if (data?.error) throw new Error(data.error);
    return result;
  };

  const getExecutionOrder = (nodes: StudioNode[], edges: StudioEdge[]): string[] => {
    const inDegree = new Map<string, number>();
    const adj = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegree.set(n.id, 0);
      adj.set(n.id, []);
    });

    edges.forEach((e) => {
      adj.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });

    const queue = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
    const order: string[] = [];

    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of adj.get(id) || []) {
        const d = (inDegree.get(next) || 0) - 1;
        inDegree.set(next, d);
        if (d === 0) queue.push(next);
      }
    }

    return order;
  };

  const getInputResults = (nodeId: string, edges: StudioEdge[], results: Map<string, any>): any[] => {
    return edges
      .filter((e) => e.target === nodeId)
      .map((e) => results.get(e.source))
      .filter(Boolean);
  };

  const hasDownstreamRandomPick = (nodeId: string, edges: StudioEdge[], nodes: StudioNode[]): boolean => {
    return edges
      .filter(e => e.source === nodeId)
      .some(e => {
        const target = nodes.find(n => n.id === e.target);
        return target && (target.data as StudioNodeData).type === 'randomPick';
      });
  };

  const executeNode = async (
    node: StudioNode,
    inputs: any[],
    allEdges?: StudioEdge[],
    allNodes?: StudioNode[]
  ): Promise<any> => {
    const { type, config } = node.data;

    const textInputs = inputs
      .filter((i) => !i?._isSystemPrompt && !i?.imageUrls && !i?.imageUrl && !i?._isPlatformFormat)
      .map((i) => (typeof i === 'string' ? i : i?.text || ''))
      .filter(Boolean);
    const combinedInput = textInputs.join('\n\n');

    // Detect platform format from inputs
    const formatInput = inputs.find((i) => i?._isPlatformFormat);
    const formatWidth = formatInput?._formatWidth;
    const formatHeight = formatInput?._formatHeight;
    const formatAspectRatio = formatInput?._formatAspectRatio;
    const formatPlatform = formatInput?._formatPlatform;
    const formatContentType = formatInput?._formatContentType;

    const systemPrompts = inputs.filter((i) => i?._isSystemPrompt).map((i) => i.text);
    const systemPrompt = systemPrompts.length > 0 ? systemPrompts.join('\n') : undefined;

    // Collect all image URLs from inputs, bucketed by role for priority ordering
    const imageInputs: string[] = [];
    const referenceDescs: string[] = [];
    // Priority buckets: produto > influencer > logo > roupa > pose > ambiente > others
    const rolePriority: Record<string, number> = {
      produto: 0, influencer: 1, logo: 2, roupa: 3, pose: 4,
      estilo: 5, paleta: 6, textura: 7, ambiente: 8, salvas: 9,
    };
    const bucketedImages: { role: string; urls: string[] }[] = [];
    const productImageUrls: string[] = [];
    inputs.forEach((i) => {
      const urls: string[] = [];
      if (i?.imageUrls && Array.isArray(i.imageUrls)) {
        urls.push(...i.imageUrls);
      } else if (i?.imageUrl) {
        urls.push(i.imageUrl);
      }
      const role = i?._referenceRole || '__none__';
      if (role === 'produto') productImageUrls.push(...urls);
      if (urls.length > 0) {
        bucketedImages.push({ role, urls });
      }
      imageInputs.push(...urls);
      if (i?._referenceDesc) {
        referenceDescs.push(i._referenceDesc);
      }
    });
    // Sort by priority: produto first, then influencer, logo, roupa, pose, ambiente, others last
    bucketedImages.sort((a, b) => {
      const pa = rolePriority[a.role] ?? 99;
      const pb = rolePriority[b.role] ?? 99;
      return pa - pb;
    });
    const orderedImageInputs = bucketedImages.flatMap((b) => b.urls);
    // Build role labels for each image in order (passed to edge function)
    const roleLabelsMap: Record<string, string> = {
      logo: 'LOGO - DO NOT MODIFY', produto: 'PRODUCT - DO NOT MODIFY',
      influencer: 'PERSON/INFLUENCER - DO NOT MODIFY', roupa: 'CLOTHING - DO NOT MODIFY',
      pose: 'POSE REFERENCE (flexible)', estilo: 'STYLE REFERENCE (flexible)',
      paleta: 'COLOR PALETTE (flexible)', textura: 'TEXTURE (flexible)',
      ambiente: 'ENVIRONMENT/BACKGROUND (flexible, use for scenery only)',
      salvas: 'SAVED IMAGE REFERENCE (flexible)',
      __none__: 'GENERAL REFERENCE',
    };
    const orderedImageRoles = bucketedImages.flatMap((b) => b.urls.map(() => roleLabelsMap[b.role] || 'REFERENCE'));

    switch (type) {
      case 'textInput':
        return config.text || '';

      case 'systemPrompt':
        return { _isSystemPrompt: true, text: config.systemPrompt || '' };

      case 'imageInput': {
        // Return all images as an array of imageUrl objects, with optional reference role
        const role = config.referenceRole;
        const roleDescMap: Record<string, string> = {
          influencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Você DEVE reproduzir esta pessoa EXATAMENTE como aparece: mesmo rosto, tom de pele, cabelo, traços faciais e aparência geral.',
          logo: '[LOGO - NÃO ALTERAR] Reproduza este logo/marca EXATAMENTE como aparece, sem modificar cores, tipografia ou elementos gráficos.',
          produto: '[PRODUTO - PROIBIDO MODIFICAR] Mantenha este produto EXATAMENTE como aparece na imagem de referência. NÃO altere cores, formato, rótulo, logotipo, tipografia, embalagem ou proporções. NÃO invente elementos novos, NÃO redesenhe, NÃO substitua. O produto na referência é REAL e deve ser reproduzido como uma fotografia fiel.',
          ambiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use como inspiração para o cenário/fundo.',
          estilo: 'Use como referência de estilo visual.',
          paleta: 'Use como referência de paleta de cores.',
          textura: 'Use como referência de textura/material.',
          pose: 'Use como referência de pose corporal.',
          roupa: '[ROUPA - NÃO ALTERAR] Mantenha a roupa EXATAMENTE como aparece na referência.',
        };
        const images = config.images || [];
        if (images.length === 0 && !role) {
          return { imageUrls: [], imageUrl: undefined };
        }
        if (images.length === 0 && role) {
          // Optional reference block with no image — skip silently
          return null;
        }
        return {
          imageUrls: images,
          imageUrl: images[0],
          ...(role ? { _referenceRole: role, _referenceDesc: roleDescMap[role] || 'Use esta imagem como referência visual.' } : {}),
        };
      }

      case 'productImageSelect':
        // Return the selected product image as reference with role context
        if (config.selectedImageUrl) {
          return { 
            imageUrls: [config.selectedImageUrl], 
            imageUrl: config.selectedImageUrl,
            _referenceRole: 'produto',
            _referenceDesc: `[PRODUTO - PROIBIDO MODIFICAR] Este é o produto "${config.productName || 'selecionado'}". Você DEVE manter este produto EXATAMENTE como aparece na imagem de referência: mesmas cores, formato, detalhes, logotipo, tipografia e proporções. NÃO modifique, substitua, redesenhe ou reimagine o produto de forma alguma. NÃO invente elementos novos que não existem na foto original. Trate a imagem do produto como uma FOTOGRAFIA REAL que deve ser inserida na cena sem alterações.`,
          };
        }
        // If downstream has randomPick, skip validation - randomPick will load its own images
        if (allEdges && allNodes && hasDownstreamRandomPick(node.id, allEdges, allNodes)) {
          return { _referenceRole: 'produto', _referenceDesc: '[PRODUTO] Imagem aleatória da galeria de produtos.', _skipNoImage: true };
        }
        // Optional block — return null to skip silently
        return null;

      case 'galleryInfluencer':
      case 'galleryAmbiente':
      case 'galleryEstilo':
      case 'galleryPaleta':
      case 'galleryTextura':
      case 'galleryLogo':
      case 'galleryPose':
      case 'galleryRoupa':
      case 'gallerySalvas': {
        if (config.selectedImageUrl) {
          const roleMap: Record<string, string> = {
            galleryInfluencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Você DEVE reproduzir esta pessoa EXATAMENTE como aparece: mesmo rosto, tom de pele, cabelo, traços faciais e aparência geral. NÃO mude a identidade, etnia, cor de cabelo ou características faciais desta pessoa de forma alguma.',
            galleryAmbiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use este cenário/ambiente como inspiração para o fundo e ambientação. Você pode ser criativo e adaptar o ambiente livremente, mantendo apenas a essência geral (interno/externo, clima, iluminação).',
            galleryEstilo: 'Use este estilo visual como referência artística para a imagem gerada (cores, mood, estética).',
            galleryPaleta: 'Use esta paleta de cores como referência para as cores dominantes na imagem.',
            galleryTextura: 'Use esta textura/material como referência para os materiais e superfícies na imagem.',
            galleryLogo: '[LOGO - NÃO ALTERAR] Reproduza este logo/marca EXATAMENTE como aparece, sem modificar cores, tipografia ou elementos gráficos.',
            galleryPose: 'Use esta pose/composição corporal como referência para a posição da pessoa na imagem.',
            galleryRoupa: '[ROUPA - NÃO ALTERAR] Você DEVE manter esta roupa/vestuário EXATAMENTE como aparece na referência: mesma cor, padrão, estampa, corte e estilo. NÃO substitua, modifique ou reimagine a peça de roupa.',
            gallerySalvas: 'Use esta imagem salva como referência visual para a geração.',
          };
          return { 
            imageUrls: [config.selectedImageUrl], 
            imageUrl: config.selectedImageUrl,
            _referenceRole: type.replace('gallery', '').toLowerCase(),
            _referenceDesc: roleMap[type] || 'Use esta imagem como referência visual.',
          };
        }
        // If downstream has randomPick, skip validation - randomPick will load its own images
        if (allEdges && allNodes && hasDownstreamRandomPick(node.id, allEdges, allNodes)) {
          const skipRoleMap: Record<string, string> = {
            galleryInfluencer: '[PESSOA/INFLUENCER - NÃO ALTERAR] Reproduza a pessoa EXATAMENTE como aparece.',
            galleryAmbiente: '[AMBIENTE - REFERÊNCIA FLEXÍVEL] Use como inspiração para o cenário.',
            galleryEstilo: 'Use como referência de estilo visual.',
            galleryPaleta: 'Use como referência de paleta de cores.',
            galleryTextura: 'Use como referência de textura.',
            galleryLogo: '[LOGO - NÃO ALTERAR] Reproduza o logo EXATAMENTE.',
            galleryPose: 'Use como referência de pose.',
            galleryRoupa: '[ROUPA - NÃO ALTERAR] Mantenha a roupa EXATAMENTE como aparece.',
            gallerySalvas: 'Use como referência visual.',
          };
          const role = type.replace('gallery', '').toLowerCase();
          return { _referenceRole: role, _referenceDesc: skipRoleMap[type] || 'Referência visual.', _skipNoImage: true };
        }
        // Optional block — return null to skip silently
        return null;
      }

      case 'textStyle':
        return {
          text: config.text || '',
          textStyle: {
            fontFamily: config.fontFamily || 'Arial',
            fontSize: config.fontSize || 48,
            fontWeight: config.fontWeight || 'bold',
            color: config.color || '#ffffff',
            bgColor: config.bgColor || '',
            align: config.align || 'center',
            shadow: config.shadow ?? true,
            outline: config.outline ?? true,
          },
        };

      case 'textContent':
        return {
          text: [config.title, config.subtitle, config.body].filter(Boolean).join('\n'),
          _referenceDesc: `[TEXTO - NÃO ALTERAR] O conteúdo de texto deve ser mantido EXATAMENTE como fornecido: título="${config.title || ''}", subtítulo="${config.subtitle || ''}", corpo="${config.body || ''}". NÃO modifique, traduza ou reformule o texto.`,
          textContent: {
            title: config.title || '',
            subtitle: config.subtitle || '',
            body: config.body || '',
            templateId: config.templateId || 'heading-bold',
            titleFont: config.titleFont || 'Montserrat',
            titleSize: config.titleSize || 72,
            titleWeight: config.titleWeight || 'bold',
            titleColor: config.titleColor || '#000000',
            subtitleFont: config.subtitleFont || 'Montserrat',
            subtitleSize: config.subtitleSize || 42,
            subtitleWeight: config.subtitleWeight || '600',
            subtitleColor: config.subtitleColor || '#4A4A4A',
            bodyFont: config.bodyFont || 'Inter',
            bodySize: config.bodySize || 24,
            bodyWeight: config.bodyWeight || 'normal',
            bodyColor: config.bodyColor || '#666666',
            textAlign: config.textAlign || 'center',
          },
        };

      case 'platformFormat': {
        const platformNames: Record<string, string> = {
          instagram: 'Instagram', facebook: 'Facebook', whatsapp: 'WhatsApp', telegram: 'Telegram', custom: 'Personalizado',
        };
        const w = config.width || 1080;
        const h = config.height || 1080;
        const platformLabel = platformNames[config.platform] || config.platform;
        const contentType = config.contentType || 'post';
        const aspectRatio = w > h ? `${Math.round(w/h * 100)/100}:1` : w < h ? `1:${Math.round(h/w * 100)/100}` : '1:1';
        return {
          _isPlatformFormat: true,
          _formatWidth: w,
          _formatHeight: h,
          _formatPlatform: config.platform,
          _formatContentType: contentType,
          _formatAspectRatio: aspectRatio,
          text: `📐 ${platformLabel} - ${contentType} (${w}×${h}px, ${aspectRatio})`,
        };
      }

      case 'llmProcess': {
        const result = await callStudio('generate_text', {
          prompt: combinedInput,
          systemPrompt,
          model: config.model,
        });
        return { text: result };
      }

      case 'imageGen': {
        // Auto-detect product + influencer without explicit placement prompt → default to holding
        const hasProduct = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencer = inputs.some((i) => i?._referenceRole === 'influencer');
        const promptLower = (combinedInput || '').toLowerCase();
        const hasPlacementHint = /mesa|chão|prateleira|vitrine|cenário|cena|fundo|background|scene|table|shelf|display|flat\s*lay/i.test(promptLower);
        
        let enrichedPrompt = combinedInput || 'A beautiful scene';
        // Inject platform format dimensions into prompt
        if (formatWidth && formatHeight) {
          enrichedPrompt = `${enrichedPrompt}\n\n[FORMAT] Generate this image optimized for ${formatPlatform || 'social media'} ${formatContentType || 'post'}, aspect ratio ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px). Compose the image to fit this exact aspect ratio perfectly.`;
        }
        if (hasProduct && hasInfluencer && !hasPlacementHint) {
          enrichedPrompt = `${enrichedPrompt}\n\n[INSTRUÇÃO PADRÃO] A pessoa/influencer deve estar SEGURANDO o produto na mão, mostrando-o de forma natural e elegante. O produto deve estar visível e em destaque na mão da pessoa.`;
        }
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO — COPIAR EXATAMENTE desta imagem', produto: 'PRODUTO/EMBALAGEM — COPIAR EXATAMENTE desta imagem',
              influencer: 'PESSOA/INFLUENCER — COPIAR ROSTO E CORPO EXATAMENTE desta imagem', roupa: 'ROUPA — COPIAR EXATAMENTE desta imagem',
              pose: 'REFERÊNCIA DE POSE (flexível)', estilo: 'REFERÊNCIA DE ESTILO (flexível)', paleta: 'PALETA DE CORES (flexível)',
              textura: 'REFERÊNCIA DE TEXTURA (flexível)', ambiente: 'AMBIENTE/CENÁRIO (flexível, apenas fundo)',
            };
            return `Imagem ${idx + 1}: ${roleLabel[b.role] || 'REFERÊNCIA'}`;
          });
          const imagePositionHint = positionLabels.length > 0
            ? `\n\n🔒 ORDEM DAS IMAGENS:\n${positionLabels.join('\n')}`
            : '';
          enrichedPrompt = `${enrichedPrompt}\n\n` + [
            `⚠️ INSTRUÇÕES ABSOLUTAS DE FIDELIDADE (VIOLAÇÃO = ERRO):`,
            ``,
            `1. PESSOA/INFLUENCER: A pessoa na imagem de referência É a pessoa real que DEVE aparecer na imagem.`,
            `   - Use EXATAMENTE o mesmo rosto, tom de pele, formato do rosto, cabelo, sobrancelhas, olhos, nariz, boca.`,
            `   - NÃO gere uma pessoa parecida. NÃO altere nenhuma característica facial. É a MESMA pessoa.`,
            ``,
            `2. PRODUTO/EMBALAGEM: O produto na imagem de referência É o produto real com sua embalagem real.`,
            `   - Use EXATAMENTE a mesma embalagem: cores, rótulo, formato, tipografia, logo, proporções.`,
            `   - NÃO crie uma embalagem similar. NÃO redesenhe o produto. NÃO invente elementos novos. É o MESMO produto.`,
            `   - NÃO adicione, remova ou modifique textos, rótulos, selos ou marcas que não existam na foto original.`,
            `   - Se a IA gerar qualquer diferença visual no produto em relação à referência, o resultado está ERRADO.`,
            ``,
            `3. LOGO: Reproduza pixel a pixel. Mesmas cores, mesma tipografia, mesmo layout.`,
            `4. AMBIENTE/CENÁRIO: ÚNICO elemento que pode ser adaptado livremente.`,
            ``,
            `TÉCNICA: Trate as imagens de referência como FOTOGRAFIAS REAIS. Componha a cena INSERINDO esses sujeitos reais.`,
            imagePositionHint,
            ``,
            referenceDescs.join('\n'),
          ].join('\n');
        }
        const result = await callStudio('generate_image', {
          prompt: enrichedPrompt,
          model: config.model,
          imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : undefined,
          imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
        });
        return result;
      }

      case 'imageEdit': {
        const result = await callStudio('edit_image', {
          prompt: config.editPrompt || combinedInput || 'Enhance this image',
          imageUrls: imageInputs,
          model: config.model,
        });
        return result;
      }

      case 'productComposite': {
        const modeDescriptions: Record<string, string> = {
          clothing: 'Vista esta roupa na pessoa da foto.',
          holding: 'Coloque este produto na mão da pessoa da foto.',
          wearing: 'Coloque este acessório na pessoa da foto.',
          scene: 'Insira este produto na cena com a pessoa.',
        };
        const modePrompt = modeDescriptions[config.compositeMode] || modeDescriptions.clothing;
        const userPrompt = config.prompt || combinedInput || '';
        let fullPrompt = `${modePrompt} ${userPrompt}`.trim();
        if (formatWidth && formatHeight) {
          fullPrompt = `${fullPrompt}\n\n[FORMAT] Optimized for ${formatPlatform || 'social media'} ${formatContentType || 'post'}, aspect ratio ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px).`;
        }
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO (preserve exactly)', produto: 'PRODUCT (preserve exactly)',
              influencer: 'PERSON (preserve exactly)', roupa: 'CLOTHING (preserve exactly)',
              pose: 'POSE REFERENCE', ambiente: 'ENVIRONMENT (flexible)',
            };
            return `Image ${idx + 1}: ${roleLabel[b.role] || 'REFERENCE'}`;
          });
          const imagePositionHint = positionLabels.length > 0 ? `\n\n🔒 IMAGE ORDER:\n${positionLabels.join('\n')}` : '';
          fullPrompt = `${fullPrompt}\n\n⚠️ CRITICAL REFERENCE INSTRUCTIONS:\nEnvironment references affect ONLY the background, NEVER the product, person or clothing.${imagePositionHint}\n\n${referenceDescs.join('\n')}`;
        }
        const result = await callStudio('generate_image', {
          prompt: fullPrompt,
          model: config.model || 'google/gemini-2.5-flash-image',
          imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : undefined,
          imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
        });
        return result;
      }

      case 'imageAnalyze': {
        const imageUrl = imageInputs[0];
        const result = await callStudio('analyze_image', {
          prompt: config.prompt || combinedInput || 'Describe this image',
          imageUrl,
          model: config.model,
        });
        return result;
      }

      case 'videoGen': {
        let videoPrompt = combinedInput || 'Uma cena cinematográfica';
        const aspectRatio = config.aspectRatio || '16:9';
        const videoModel = config.videoModel || 'free/gif-animated';

        // Auto-detect product + influencer without explicit placement prompt → default to holding (same as imageGen)
        const hasProductVideo = inputs.some((i) => i?._referenceRole === 'produto');
        const hasInfluencerVideo = inputs.some((i) => i?._referenceRole === 'influencer');
        const promptLowerVideo = (combinedInput || '').toLowerCase();
        const hasPlacementHintVideo = /mesa|chão|prateleira|vitrine|cenário|cena|fundo|background|scene|table|shelf|display|flat\s*lay/i.test(promptLowerVideo);

        if (hasProductVideo && hasInfluencerVideo && !hasPlacementHintVideo) {
          videoPrompt = `${videoPrompt}\n\n[INSTRUÇÃO PADRÃO] A pessoa/influencer deve estar SEGURANDO o produto na mão, mostrando-o de forma natural e elegante. O produto deve estar visível e em destaque na mão da pessoa.`;
        }

        // Inject platform format dimensions
        if (formatWidth && formatHeight) {
          videoPrompt = `${videoPrompt}\n\n[FORMAT] Gere este vídeo otimizado para ${formatPlatform || 'redes sociais'} ${formatContentType || 'post'}, proporção ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px).`;
        }
        // Inject reference descriptions with STRICT fidelity instructions
        if (referenceDescs.length > 0) {
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO — COPIAR EXATAMENTE desta imagem', produto: 'PRODUTO/EMBALAGEM — COPIAR EXATAMENTE desta imagem',
              influencer: 'PESSOA/INFLUENCER — COPIAR ROSTO E CORPO EXATAMENTE desta imagem', roupa: 'ROUPA — COPIAR EXATAMENTE desta imagem',
              pose: 'REFERÊNCIA DE POSE (flexível)', estilo: 'REFERÊNCIA DE ESTILO (flexível)', paleta: 'PALETA DE CORES (flexível)',
              textura: 'REFERÊNCIA DE TEXTURA (flexível)', ambiente: 'AMBIENTE/CENÁRIO (flexível, apenas fundo)',
            };
            return `Imagem ${idx + 1}: ${roleLabel[b.role] || 'REFERÊNCIA'}`;
          });
          const imagePositionHint = positionLabels.length > 0
            ? `\n\n🔒 ORDEM DAS IMAGENS:\n${positionLabels.join('\n')}`
            : '';
          videoPrompt = `${videoPrompt}\n\n` + [
            `⚠️ INSTRUÇÕES ABSOLUTAS DE FIDELIDADE (VIOLAÇÃO = ERRO):`,
            ``,
            `1. PESSOA/INFLUENCER: A pessoa na imagem de referência É a pessoa real que DEVE aparecer no vídeo.`,
            `   - Use EXATAMENTE o mesmo rosto, tom de pele, formato do rosto, cabelo, sobrancelhas, olhos, nariz, boca.`,
            `   - NÃO gere uma pessoa parecida. NÃO altere nenhuma característica facial. É a MESMA pessoa.`,
            `   - Se a IA gerar um rosto diferente, o resultado está ERRADO.`,
            ``,
            `2. PRODUTO/EMBALAGEM: O produto na imagem de referência É o produto real com sua embalagem real.`,
            `   - Use EXATAMENTE a mesma embalagem: cores, rótulo, formato, tipografia, logo, proporções.`,
            `   - NÃO crie uma embalagem similar. NÃO redesenhe o produto. NÃO invente elementos novos. É o MESMO produto.`,
            `   - NÃO adicione, remova ou modifique textos, rótulos, selos ou marcas que não existam na foto original.`,
            `   - Se a IA gerar qualquer diferença visual no produto em relação à referência, o resultado está ERRADO.`,
            ``,
            `3. LOGO: Reproduza pixel a pixel. Mesmas cores, mesma tipografia, mesmo layout.`,
            ``,
            `4. AMBIENTE/CENÁRIO: Este é o ÚNICO elemento que pode ser adaptado livremente.`,
            ``,
            `TÉCNICA: Trate as imagens de referência como FOTOGRAFIAS REAIS de sujeitos reais.`,
            `Componha a cena INSERINDO esses sujeitos reais no cenário, como uma montagem fotográfica profissional.`,
            imagePositionHint,
            ``,
            referenceDescs.join('\n'),
          ].join('\n');
        }
        
        // === PAID VIDEO MODEL PATH ===
        if (videoModel !== 'free/gif-animated') {
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Gerando vídeo com ${videoModel.split('/').pop()}...${orderedImageInputs.length > 0 ? ` (${orderedImageInputs.length} imagem(ns) de referência)` : ''}`, 
          });
          
          try {
            const estabId = localStorage.getItem('estabelecimentoId');
            const result = await callStudio('generate_video', {
              prompt: videoPrompt,
              model: videoModel,
              aspectRatio,
              resolution: config.resolution || '1080p',
              duration: config.duration || 5,
              style: config.videoStyle || 'realistic',
              cameraMovement: config.cameraMovement || 'none',
              cameraSpeed: config.cameraSpeed ?? 1,
              fps: config.fps || '24',
              loop: config.loop ?? false,
              withAudio: config.withAudio ?? false,
              negativePrompt: config.videoNegativePrompt || '',
              seed: config.videoSeed,
              cfgScale: config.cfgScale ?? 7,
              imageUrls: orderedImageInputs.length > 0 ? orderedImageInputs : (imageInputs.length > 0 ? imageInputs : undefined),
              imageRoles: orderedImageRoles.length > 0 ? orderedImageRoles : undefined,
              estabelecimentoId: estabId,
            }, 300000); // 5 min timeout for video generation
            
            if (result?.videoUrl) {
              return {
                videoUrl: result.videoUrl,
                ...(result.thumbnailUrl ? { imageUrl: result.thumbnailUrl } : {}),
                text: `🎬 Vídeo gerado com ${videoModel.split('/').pop()} para: "${videoPrompt.substring(0, 60)}"`,
                _isVideo: true,
              };
            } else {
              throw new Error(result?.error || 'Nenhum vídeo retornado');
            }
          } catch (videoErr: any) {
            console.error('[Studio] Video generation failed:', videoErr);
            const msg = videoErr.message || '';
            if (msg.includes('moderation') || msg.includes('blocked') || msg.includes('content policy') || msg.includes('safety')) {
              throw new Error('⚠️ O conteúdo do prompt não pôde ser processado pelo provedor de IA. Tente reformular a descrição usando termos mais genéricos e neutros. Evite referências a marcas, pessoas reais ou conteúdo sensível.');
            }
            if (msg.includes('rate limit') || msg.includes('429') || msg.includes('too many')) {
              throw new Error('⏳ Muitas solicitações em pouco tempo. Aguarde alguns segundos e tente novamente.');
            }
            if (msg.includes('402') || msg.includes('payment') || msg.includes('quota') || msg.includes('billing')) {
              throw new Error('💳 Limite de uso atingido no provedor de IA. Verifique seu plano ou créditos disponíveis.');
            }
            if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('network') || msg.includes('ECONNREFUSED')) {
              throw new Error('🌐 Erro de conexão com o servidor de geração de vídeo. Isso pode ocorrer por instabilidade na rede ou timeout. Aguarde alguns segundos e tente novamente.');
            }
            throw new Error(`Não foi possível gerar o vídeo. Tente novamente com uma descrição diferente. (${msg.substring(0, 100)})`);
          }
        }
        
        // === FREE GIF ANIMATED PATH ===
        const frameCount = config.frameCount || 4;
        const motionStages = [
          'opening shot, beginning of movement',
          'early progression, slight camera movement forward',
          'building momentum, increasing intensity',
          'mid-action, peak of the motion, dynamic angle',
          'continuation, evolving perspective',
          'transition, shifting focus',
          'climax approaching, tension building',
          'final frame, concluding the movement, dramatic resolution',
          'aftermath, calm settling shot',
          'wide establishing shot, full reveal',
        ];

        const frames: string[] = [];
        const perFrameTimeout = 90000; // 90s per frame
        const hasReferenceImages = orderedImageInputs.length > 0 || imageInputs.length > 0;
        
        for (let i = 0; i < frameCount; i++) {
          const stage = motionStages[i % motionStages.length];
          const isFollowUpFrame = i > 0 && frames.length > 0;
          
          // SIMPLIFIED PROMPT: Only describe the SCENE.
          // The edge function EDIT MODE already handles subject preservation via system message + image labels.
          // Redundant fidelity instructions in the prompt CONFUSE the model.
          let framePrompt: string;
          
          // Extract just the user's scene description (before fidelity instructions were appended)
          const sceneDescription = combinedInput || 'Uma cena cinematográfica';
          
          if (hasReferenceImages) {
            const parts: string[] = [];
            if (isFollowUpFrame) {
              parts.push(`EDIT the first image (frame reference): keep the EXACT same person and product, only change the pose/angle slightly for animation.`);
              parts.push(`Scene: ${sceneDescription}`);
            } else {
              parts.push(`Create a PHOTOMONTAGE: cut the person and product from the provided photos and paste them into this scene: ${sceneDescription}`);
              parts.push(`The person's face must be IDENTICAL to the photo. The product packaging must be IDENTICAL to the photo.`);
            }
            parts.push(`Style: Cinematic photography, professional lighting, aspect ratio ${aspectRatio}`);
            parts.push(`Animation sequence: Frame ${i + 1} of ${frameCount} — ${stage}`);
            if (formatWidth && formatHeight) {
              parts.push(`Format: ${formatPlatform || 'social media'} ${formatContentType || 'post'}, ${formatAspectRatio || '1:1'} (${formatWidth}x${formatHeight}px)`);
            }
            framePrompt = parts.join('\n');
          } else {
            framePrompt = `Cinematic photography, professional lighting, aspect ratio ${aspectRatio}, photorealistic, frame ${i + 1} of ${frameCount} — ${stage}: ${sceneDescription}`;
          }
          
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Gerando frame ${i + 1}/${frameCount}...`, 
            _animFrames: frames.length > 0 ? [...frames] : undefined,
            _totalFrames: frameCount,
          });

          // Build image references: for follow-up frames, prepend the first frame as consistency anchor
          let frameImageUrls: string[];
          let frameImageRoles: string[];
          if (isFollowUpFrame && orderedImageInputs.length > 0) {
            frameImageUrls = [frames[0], ...orderedImageInputs];
            frameImageRoles = ['PERSON/INFLUENCER - DO NOT MODIFY', ...orderedImageRoles];
          } else if (orderedImageInputs.length > 0) {
            frameImageUrls = orderedImageInputs;
            frameImageRoles = orderedImageRoles;
          } else if (isFollowUpFrame) {
            frameImageUrls = [frames[0], ...imageInputs];
            frameImageRoles = ['PERSON/INFLUENCER - DO NOT MODIFY', ...imageInputs.map(() => 'REFERENCE')];
          } else {
            frameImageUrls = imageInputs.length > 0 ? imageInputs : [];
            frameImageRoles = [];
          }

          try {
            const result = await callStudio('generate_image', {
              prompt: framePrompt,
              model: 'google/gemini-3-pro-image-preview',
              imageUrls: frameImageUrls.length > 0 ? frameImageUrls : undefined,
              imageRoles: frameImageRoles.length > 0 ? frameImageRoles : undefined,
            }, perFrameTimeout);
            if (result?.imageUrl) {
              frames.push(result.imageUrl);
            }
          } catch (frameErr: any) {
            console.warn(`[Studio] Frame ${i + 1} failed, skipping:`, frameErr.message);
            toast.error(`Frame ${i + 1} falhou: ${frameErr.message?.substring(0, 80)}`, { duration: 4000 });
          }
        }

        // Generate real animated GIF from frames
        const fps = config.fps || 2;
        let gifUrl: string | undefined;
        if (frames.length > 1) {
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Montando GIF animado (0/${frames.length} frames)...`, 
            _animFrames: [...frames],
            _totalFrames: frameCount,
          });
          try {
            const { createAnimatedGif } = await import('./gifEncoder');
            const gifPromise = createAnimatedGif(frames, fps, 192, (current, total) => {
              nodeResultStore.setResult(node.id, { 
                text: `🎬 Montando GIF animado (${current}/${total} frames)...`, 
                _animFrames: [...frames],
                _totalFrames: frameCount,
              });
            });
            const timeoutPromise = new Promise<string>((_, reject) => 
              setTimeout(() => reject(new Error('GIF encoding timeout')), 60000)
            );
            gifUrl = await Promise.race([gifPromise, timeoutPromise]);
          } catch (gifErr: any) {
            console.error('Error creating GIF:', gifErr);
            toast.error('GIF demorou demais, usando primeira imagem como resultado.', { duration: 4000 });
          }
        }

        return { 
          _animFrames: frames,
          _totalFrames: frameCount,
          _fps: fps,
          imageUrl: gifUrl || frames[0],
          _gifUrl: gifUrl,
          text: gifUrl 
            ? `🎬 GIF animado gerado com ${frames.length} frames (${fps} fps) para: "${videoPrompt.substring(0, 60)}"`
            : `🎬 Animação gerada com ${frames.length} frames para: "${videoPrompt.substring(0, 60)}"`,
        };
      }

      case 'audioGen': {
        const textToSpeak = combinedInput || config.text || 'Olá, este é um teste.';
        
        // Check if user has a paid TTS provider configured
        const estabId = localStorage.getItem('estabelecimentoId');
        let paidProvider: string | null = null;

        if (estabId) {
          // Check for ElevenLabs, Google, or OpenAI TTS keys
          for (const provider of ['elevenlabs', 'google', 'openai']) {
            const { data } = await supabase
              .from('ai_api_keys')
              .select('api_key, is_active')
              .eq('estabelecimento_id', estabId)
              .eq('provider', provider)
              .eq('is_active', true)
              .maybeSingle();
            if (data?.api_key) {
              paidProvider = provider;
              break;
            }
          }
        }

        if (paidProvider && estabId) {
          // PAID: Route through edge function (secure - no API key exposed)
          try {
            const result = await callStudio('generate_audio', {
              text: textToSpeak,
              provider: paidProvider,
              voiceId: config.voiceId,
              audioModel: config.audioModel,
              lang: config.lang || 'pt-BR',
              voice: config.voice,
              estabelecimentoId: estabId,
            }, 120000);

            return {
              audioUrl: result.audioUrl,
              text: `🔊 Áudio gerado com ${paidProvider.charAt(0).toUpperCase() + paidProvider.slice(1)} (pago)!\nTexto: "${textToSpeak.substring(0, 80)}"`,
            };
          } catch (err: any) {
            console.error('[Studio] Paid TTS error:', err);
            // Fall through to free Web Speech API
          }
        }

        // FREE: Web Speech API (browser built-in TTS)
        try {
          const audioUrl = await new Promise<string>((resolve, reject) => {
            if (!('speechSynthesis' in window)) {
              reject(new Error('Web Speech API não suportada neste navegador'));
              return;
            }

            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = config.lang || 'pt-BR';
            utterance.rate = config.speed || 1.0;
            utterance.pitch = config.pitch || 1.0;

            const voices = speechSynthesis.getVoices();
            const ptVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0];
            if (ptVoice) utterance.voice = ptVoice;

            utterance.onend = () => resolve('__webspeech__');
            utterance.onerror = (e) => reject(new Error(`Speech error: ${e.error}`));

            speechSynthesis.cancel();
            speechSynthesis.speak(utterance);
          });

          return {
            text: `🔊 Áudio gerado gratuitamente (Web Speech API)\nIdioma: ${config.lang || 'pt-BR'} | Velocidade: ${config.speed || 1.0}x\nTexto: "${textToSpeak.substring(0, 80)}"`,
            _webSpeechText: textToSpeak,
            _webSpeechLang: config.lang || 'pt-BR',
            _webSpeechRate: config.speed || 1.0,
            _webSpeechPitch: config.pitch || 1.0,
          };
        } catch (err: any) {
          return {
            text: `🔊 Texto para fala: "${textToSpeak.substring(0, 100)}"\n\n⚠️ Web Speech API indisponível. Configure ElevenLabs para áudio de alta qualidade.`,
          };
        }
      }

      case 'musicGen': {
        const musicPrompt = combinedInput || config.prompt || 'Música ambiente corporativa';
        const estabId = localStorage.getItem('estabelecimentoId');
        let musicProvider: string | null = null;

        if (estabId) {
          for (const provider of ['elevenlabs', 'suno']) {
            const { data } = await supabase
              .from('ai_api_keys')
              .select('api_key, is_active')
              .eq('estabelecimento_id', estabId)
              .eq('provider', provider)
              .eq('is_active', true)
              .maybeSingle();
            if (data?.api_key) {
              musicProvider = provider;
              break;
            }
          }
        }

        if (musicProvider && estabId) {
          try {
            const result = await callStudio('generate_music', {
              prompt: musicPrompt,
              duration: config.duration || 30,
              provider: musicProvider,
              genre: config.genre,
              instrumental: config.instrumental,
              estabelecimentoId: estabId,
            }, 180000);

            return {
              audioUrl: result.audioUrl,
              text: `🎵 Música gerada com ${musicProvider.charAt(0).toUpperCase() + musicProvider.slice(1)}!\nPrompt: "${musicPrompt.substring(0, 80)}"\nDuração: ${result.duration || config.duration}s`,
            };
          } catch (err: any) {
            console.error('[Studio] Music generation error:', err);
            return {
              text: `🎵 Erro ao gerar música: ${err.message}\n\n⚠️ Verifique sua chave de API em Configurações → APIs Pagas.`,
            };
          }
        }

        return {
          text: `🎵 Música (${config.genre || 'ambient'}) - "${musicPrompt.substring(0, 80)}"\nDuração: ${config.duration || 30}s\n\n⚠️ Configure ElevenLabs ou Suno em Configurações → APIs Pagas para gerar música real.`,
        };
      }

      case 'lipSync':
        return {
          text: `👄 Sincronismo labial aplicado.\n\n⚠️ Para lip sync real, conecte o ElevenLabs Conversational AI.`,
        };

      case 'videoMerge':
        return {
          text: `🔗 Vídeos unidos com transição "${config.transition}" (${config.transitionDuration}s).\n\n⚠️ Para merge real de vídeo, conecte uma API de edição de vídeo.`,
        };

      case 'multiProductSelect': {
        const products = config.products || [];
        if (products.length === 0) throw new Error('Nenhum produto selecionado no bloco de múltiplos produtos.');
        return {
          _isMultiProduct: true,
          products: products.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            foto_url: p.foto_url,
            imageUrl: p.foto_url,
            imageUrls: [p.foto_url],
            _referenceRole: 'produto',
            _referenceDesc: `[PRODUTO - NÃO ALTERAR] Este é o produto "${p.nome}". Você DEVE manter este produto EXATAMENTE como aparece na imagem de referência: mesmas cores, formato, detalhes, logotipo e proporções. NÃO modifique, substitua ou reimagine o produto de forma alguma.`,
          })),
        };
      }

      case 'randomPick': {
        // randomPick inherits gallery from connected input block OR uses its own config
        const estabId = localStorage.getItem('estabelecimentoId');
        let galleryImages: string[] = [];
        let inheritedRole = '';
        let inheritedDesc = '';

        // Check if there's a connected input with a gallery role (e.g. galleryInfluencer or _skipNoImage)
        const inputWithRole = inputs.find((i) => i?._referenceRole);
        if (inputWithRole?._referenceRole) {
          // Load ALL images from the same gallery category as the connected block
          inheritedRole = inputWithRole._referenceRole;
          const category = inheritedRole;

          if (category === 'salvas') {
            const { data } = await supabase
              .from('media_gallery')
              .select('public_url')
              .eq('estabelecimento_id', estabId || '')
              .in('tipo', ['image', 'gif'])
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.public_url).filter(Boolean);
          } else {
            const { data } = await supabase
              .from('studio_gallery_images')
              .select('image_url')
              .eq('estabelecimento_id', estabId || '')
              .eq('categoria', category)
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.image_url).filter(Boolean);
          }

          // Build desc from the connected block's desc pattern
          inheritedDesc = inputWithRole._referenceDesc || `Imagem aleatória da galeria "${category}" — use como referência visual.`;
        } else {
          // Fallback: use own galleryCategory config
          const category = config.galleryCategory || 'salvas';
          inheritedRole = category;

          if (category === 'salvas') {
            const { data } = await supabase
              .from('media_gallery')
              .select('public_url')
              .eq('estabelecimento_id', estabId || '')
              .in('tipo', ['image', 'gif'])
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.public_url).filter(Boolean);
          } else {
            const { data } = await supabase
              .from('studio_gallery_images')
              .select('image_url')
              .eq('estabelecimento_id', estabId || '')
              .eq('categoria', category)
              .order('created_at', { ascending: false })
              .limit(100);
            galleryImages = (data || []).map((d: any) => d.image_url).filter(Boolean);
          }
          inheritedDesc = `Imagem aleatória da galeria "${category}" — use como referência visual.`;
        }

        if (galleryImages.length === 0) throw new Error(`Nenhuma imagem encontrada na galeria "${inheritedRole}".`);

        // Pick a random one for single execution; loop runner will override per iteration
        const randomUrl = galleryImages[Math.floor(Math.random() * galleryImages.length)];
        return {
          _isRandomPick: true,
          _galleryImages: galleryImages,
          _inheritedRole: inheritedRole,
          _inheritedDesc: inheritedDesc,
          imageUrl: randomUrl,
          imageUrls: [randomUrl],
          _referenceRole: inheritedRole,
          _referenceDesc: inheritedDesc,
        };
      }

      case 'loopOutput':
        // loopOutput is handled specially in executeWorkflow; here just return inputs
        return inputs[inputs.length - 1] || { text: 'Aguardando execução em lote...' };

      case 'output':
        return inputs[inputs.length - 1] || { text: 'Nenhuma entrada recebida' };

      default:
        return { text: `Tipo desconhecido: ${type}` };
    }
  };

  const executeWorkflow = useCallback(async (
    nodes: StudioNode[],
    edges: StudioEdge[],
    startFromNodeId?: string,
    onNodesUpdate?: (nodes: StudioNode[]) => void
  ): Promise<StudioNode[]> => {
    setIsExecuting(true);
    abortRef.current = new AbortController();
    onNodesUpdateRef.current = onNodesUpdate || null;

    const order = getExecutionOrder(nodes, edges);
    console.log('[Studio] Execution order:', order.map(id => {
      const n = nodes.find(nn => nn.id === id);
      return `${id} (${(n?.data as any)?.type || '?'})`;
    }));
    console.log('[Studio] Total nodes:', nodes.length, 'Total edges:', edges.length);
    const results = new Map<string, any>();
    let updatedNodes = [...nodes];

    let startIndex = 0;
    if (startFromNodeId) {
      startIndex = order.indexOf(startFromNodeId);
      if (startIndex < 0) startIndex = 0;
      for (let i = 0; i < startIndex; i++) {
        const node = nodes.find((n) => n.id === order[i]);
        if (node?.data.result) {
          results.set(order[i], node.data.result);
        }
      }
    }

    // Build initial log
    const initialLog: ExecutionLogEntry[] = order.map((nodeId, idx) => {
      const node = nodes.find((n) => n.id === nodeId);
      const nd = node?.data as StudioNodeData;
      const isPaused = !!nd?.config?._paused;
      return {
        nodeId,
        nodeLabel: nd?.label || nodeId,
        nodeType: nd?.type || 'unknown',
        status: idx < startIndex ? 'skipped' : isPaused ? 'skipped' : 'pending',
      };
    });
    setExecutionLog(initialLog);

    const updateLog = (nodeId: string, partial: Partial<ExecutionLogEntry>) => {
      setExecutionLog((prev) =>
        prev.map((e) => (e.nodeId === nodeId ? { ...e, ...partial } : e))
      );
    };

    const updateNode = (id: string, partial: Partial<StudioNodeData>) => {
      updatedNodes = updatedNodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...partial } } : n
      );
      // Emit real-time update
      if (onNodesUpdateRef.current) {
        onNodesUpdateRef.current([...updatedNodes]);
      }
    };

    // Helper: find all ancestor node IDs for a given node
    const getAncestors = (nodeId: string): Set<string> => {
      const ancestors = new Set<string>();
      const visit = (id: string) => {
        edges.filter(e => e.target === id).forEach(e => {
          if (!ancestors.has(e.source)) {
            ancestors.add(e.source);
            visit(e.source);
          }
        });
      };
      visit(nodeId);
      return ancestors;
    };

    try {
      for (let i = startIndex; i < order.length; i++) {
        const nodeId = order[i];
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const nd = node.data as StudioNodeData;

        // Skip paused nodes
        if (nd.config?._paused) {
          updateLog(nodeId, { status: 'skipped' });
          updateNode(nodeId, { isProcessing: false });
          continue;
        }

        // ====== LOOP OUTPUT SPECIAL HANDLING ======
        if (nd.type === 'loopOutput') {
          setCurrentNodeId(nodeId);
          const startTime = Date.now();
          updateNode(nodeId, { isProcessing: true, error: undefined });
          nodeResultStore.setProcessing(nodeId, true);
          nodeResultStore.clearError(nodeId);
          updateLog(nodeId, { status: 'running', startedAt: startTime });

          try {
            // 1. Find the multiProductSelect ancestor
            const ancestors = getAncestors(nodeId);
            const multiProductNodeId = order.find(id => {
              const n = nodes.find(nn => nn.id === id);
              return n && (n.data as StudioNodeData).type === 'multiProductSelect' && ancestors.has(id);
            });

            if (!multiProductNodeId) throw new Error('Bloco "Múltiplos Produtos" não encontrado conectado a este bloco de Saída em Lote.');

            const multiResult = results.get(multiProductNodeId);
            if (!multiResult?._isMultiProduct || !multiResult.products?.length) {
              throw new Error('O bloco de Múltiplos Produtos não tem produtos. Selecione pelo menos um produto.');
            }

            const products = multiResult.products;

            // 2. Find intermediate nodes between multiProduct and loopOutput
            const directInputEdges = edges.filter(e => e.target === nodeId);
            const intermediateNodes = order.filter(id => {
              if (id === multiProductNodeId || id === nodeId) return false;
              const n = nodes.find(nn => nn.id === id);
              if (!n) return false;
              const nType = (n.data as StudioNodeData).type;
              // Only re-execute processing nodes in the path, not pure inputs or galleries
              const inputTypes = ['textInput', 'systemPrompt', 'imageInput', 'productImageSelect', 'multiProductSelect',
                'galleryInfluencer', 'galleryAmbiente', 'galleryEstilo', 'galleryPaleta', 'galleryTextura',
                'galleryLogo', 'galleryPose', 'galleryRoupa', 'gallerySalvas'];
              return ancestors.has(id) && !inputTypes.includes(nType);
            });

            // 3. Find randomPick nodes in the chain
            const randomPickNodes = intermediateNodes.filter(id => {
              const n = nodes.find(nn => nn.id === id);
              return n && (n.data as StudioNodeData).type === 'randomPick';
            });

            // Pre-load randomPick galleries
            for (const rpId of randomPickNodes) {
              if (!results.has(rpId)) {
                const rpNode = nodes.find(n => n.id === rpId)!;
                const rpInputs = getInputResults(rpId, edges, results);
                const rpResult = await executeNode(rpNode, rpInputs, edges, nodes);
                results.set(rpId, rpResult);
              }
            }

      const loopResults: any[] = [];

            // 4. Loop through each product
            for (let pi = 0; pi < products.length; pi++) {
              const product = products[pi];
              const productName = product.nome || `Produto ${pi + 1}`;

              nodeResultStore.setResult(nodeId, {
                text: `🔄 Processando ${pi + 1}/${products.length}: ${productName}...`,
                loopResults,
              });

              // Override multiProductSelect result with single product for this iteration
              const singleProductResult = {
                imageUrl: product.foto_url,
                imageUrls: [product.foto_url],
                _referenceRole: 'produto',
                _referenceDesc: product._referenceDesc,
              };
              results.set(multiProductNodeId, singleProductResult);

              // Override randomPick with new random each iteration
              for (const rpId of randomPickNodes) {
                const rpResult = results.get(rpId);
                if (rpResult?._galleryImages?.length > 0) {
                  const randomUrl = rpResult._galleryImages[Math.floor(Math.random() * rpResult._galleryImages.length)];
                  results.set(rpId, {
                    ...rpResult,
                    imageUrl: randomUrl,
                    imageUrls: [randomUrl],
                  });
                }
              }

              // Re-execute intermediate nodes
              let lastResult: any = null;
              for (const intId of intermediateNodes) {
                const intNode = nodes.find(n => n.id === intId)!;
                const intNd = intNode.data as StudioNodeData;

                // Skip randomPick (already set above) and paused
                if (intNd.type === 'randomPick' || intNd.config?._paused) continue;

                try {
                  const intInputs = getInputResults(intId, edges, results);
                  const intResult = await executeNode(intNode, intInputs, edges, nodes);
                  results.set(intId, intResult);
                  nodeResultStore.setResult(intId, intResult);
                  lastResult = intResult;
                } catch (intErr: any) {
                  console.error(`[Studio Loop] Node ${intId} failed for product ${pi}:`, intErr.message);
                  toast.error(`Loop ${pi + 1}: ${intErr.message?.substring(0, 80)}`, { duration: 4000 });
                }
              }

              // Get the direct input to loopOutput
              const loopInputs = getInputResults(nodeId, edges, results);
              const finalResult = loopInputs[loopInputs.length - 1] || lastResult;

              if (finalResult?.imageUrl) {
                loopResults.push({ imageUrl: finalResult.imageUrl, productName, productId: product.id });
                toast.success(`✅ ${pi + 1}/${products.length}: ${productName} concluído!`, { duration: 3000 });
              }
            }

            // Restore multiProduct result
            results.set(multiProductNodeId, multiResult);

            const finalLoopResult = {
              text: `🔄 Lote concluído! ${loopResults.length}/${products.length} imagens geradas. Revise e selecione quais salvar.`,
              loopResults,
              _needsReview: true,
            };
            const elapsed = Date.now() - startTime;
            results.set(nodeId, finalLoopResult);
            updateNode(nodeId, { isProcessing: false, result: finalLoopResult });
            nodeResultStore.setResult(nodeId, finalLoopResult);
            nodeResultStore.setProcessing(nodeId, false);
            updateLog(nodeId, { status: 'success', completedAt: Date.now(), elapsedMs: elapsed });
            
            // Open review dialog instead of auto-saving
            if (loopResults.length > 0) {
              setBatchReviewResults(loopResults);
            }
            toast.success(`🎉 Lote finalizado! ${loopResults.length} imagens geradas. Revise e salve.`, { duration: 6000 });

          } catch (err: any) {
            const elapsed = Date.now() - startTime;
            const errMsg = err.message || 'Erro desconhecido';
            updateNode(nodeId, { isProcessing: false, error: errMsg });
            nodeResultStore.setProcessing(nodeId, false);
            nodeResultStore.setError(nodeId, errMsg);
            updateLog(nodeId, { status: 'error', completedAt: Date.now(), elapsedMs: elapsed, errorMessage: errMsg });
            toast.error(`Erro no lote: ${errMsg.substring(0, 100)}`, { duration: 6000 });
          }
          continue;
        }

        // ====== NORMAL NODE EXECUTION ======
        setCurrentNodeId(nodeId);
        const startTime = Date.now();
        updateNode(nodeId, { isProcessing: true, error: undefined });
        nodeResultStore.setProcessing(nodeId, true);
        nodeResultStore.clearError(nodeId);
        updateLog(nodeId, { status: 'running', startedAt: startTime });

        try {
          const inputs = getInputResults(nodeId, edges, results);
          console.log(`[Studio] Node ${nodeId} (${nd.type}) inputs:`, inputs.length, 'items');
          const result = await executeNode(node, inputs, edges, nodes);
          console.log(`[Studio] Node ${nodeId} (${nd.type}) result:`, typeof result, result?.imageUrl ? 'has imageUrl' : 'no imageUrl', result?.videoUrl ? 'has videoUrl' : '');
          const elapsed = Date.now() - startTime;
          results.set(nodeId, result);
          updateNode(nodeId, { isProcessing: false, result });
          nodeResultStore.setResult(nodeId, result);
          nodeResultStore.setProcessing(nodeId, false);
          updateLog(nodeId, { status: 'success', completedAt: Date.now(), elapsedMs: elapsed });
          // Notify user of image generation success
          if (result?.imageUrl) {
            toast.success('🎨 Imagem gerada com sucesso!', { duration: 4000 });
          }
        } catch (err: any) {
          const elapsed = Date.now() - startTime;
          const errMsg = err.message || 'Erro desconhecido';
          console.error(`[Studio] Node ${nodeId} (${nd.type}) failed:`, errMsg);
          updateNode(nodeId, { isProcessing: false, error: errMsg });
          nodeResultStore.setProcessing(nodeId, false);
          nodeResultStore.setError(nodeId, errMsg);
          updateLog(nodeId, { status: 'error', completedAt: Date.now(), elapsedMs: elapsed, errorMessage: errMsg });
          toast.error(`Erro no bloco "${nd.label}": ${errMsg.substring(0, 100)}`, { duration: 6000 });
          // Continue to next node instead of aborting the whole workflow
        }
      }
    } finally {
      setIsExecuting(false);
      setCurrentNodeId(null);
    }

    return updatedNodes;
  }, []);

  const clearLog = useCallback(() => {
    setExecutionLog([]);
  }, []);

  return { executeWorkflow, isExecuting, executionLog, currentNodeId, clearLog, batchReviewResults, setBatchReviewResults };
}
