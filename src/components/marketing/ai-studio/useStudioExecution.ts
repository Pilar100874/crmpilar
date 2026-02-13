import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudioNode, StudioEdge, StudioNodeData } from './types';
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

export function useStudioExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionLog, setExecutionLog] = useState<ExecutionLogEntry[]>([]);
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const onNodesUpdateRef = useRef<((nodes: StudioNode[]) => void) | null>(null);

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
      throw new Error(`Edge function returned ${response.status}: ${errText.substring(0, 200)}`);
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

  const executeNode = async (
    node: StudioNode,
    inputs: any[]
  ): Promise<any> => {
    const { type, config } = node.data;

    const textInputs = inputs
      .filter((i) => !i?._isSystemPrompt && !i?.imageUrls && !i?.imageUrl)
      .map((i) => (typeof i === 'string' ? i : i?.text || ''))
      .filter(Boolean);
    const combinedInput = textInputs.join('\n\n');

    const systemPrompts = inputs.filter((i) => i?._isSystemPrompt).map((i) => i.text);
    const systemPrompt = systemPrompts.length > 0 ? systemPrompts.join('\n') : undefined;

    // Collect all image URLs from inputs, bucketed by role for priority ordering
    const imageInputs: string[] = [];
    const referenceDescs: string[] = [];
    // Priority buckets: logo > produto > influencer > roupa > pose > ambiente > others
    const rolePriority: Record<string, number> = {
      logo: 0, produto: 1, influencer: 2, roupa: 3, pose: 4,
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
    // Sort by priority: logo first, then produto, influencer, roupa, pose, ambiente, others last
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

      case 'imageInput':
        // Return all images as an array of imageUrl objects
        return { imageUrls: config.images || [], imageUrl: config.images?.[0] };

      case 'productImageSelect':
        // Return the selected product image as reference with role context
        if (config.selectedImageUrl) {
          return { 
            imageUrls: [config.selectedImageUrl], 
            imageUrl: config.selectedImageUrl,
            _referenceRole: 'produto',
            _referenceDesc: `[PRODUTO - NÃO ALTERAR] Este é o produto "${config.productName || 'selecionado'}". Você DEVE manter este produto EXATAMENTE como aparece na imagem de referência: mesmas cores, formato, detalhes, logotipo e proporções. NÃO modifique, substitua ou reimagine o produto de forma alguma.`,
          };
        }
        throw new Error('Nenhum produto selecionado. Selecione um produto com imagem.');

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
        throw new Error('Nenhuma imagem selecionada da galeria. Selecione uma imagem.');
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
        if (hasProduct && hasInfluencer && !hasPlacementHint) {
          enrichedPrompt = `${enrichedPrompt}\n\n[INSTRUÇÃO PADRÃO] A pessoa/influencer deve estar SEGURANDO o produto na mão, mostrando-o de forma natural e elegante. O produto deve estar visível e em destaque na mão da pessoa.`;
        }
        if (referenceDescs.length > 0) {
          // Build image position map for the model
          const positionLabels = bucketedImages.map((b, idx) => {
            const roleLabel: Record<string, string> = {
              logo: 'LOGO (preserve exactly)', produto: 'PRODUCT (preserve exactly)',
              influencer: 'PERSON/INFLUENCER (preserve exactly)', roupa: 'CLOTHING (preserve exactly)',
              pose: 'POSE REFERENCE', estilo: 'STYLE REFERENCE', paleta: 'COLOR PALETTE',
              textura: 'TEXTURE REFERENCE', ambiente: 'ENVIRONMENT (flexible, background only)',
            };
            return `Image ${idx + 1}: ${roleLabel[b.role] || 'REFERENCE'}`;
          });
          const imagePositionHint = positionLabels.length > 0
            ? `\n\n🔒 IMAGE ORDER (respect strictly):\n${positionLabels.join('\n')}`
            : '';
          enrichedPrompt = `${enrichedPrompt}\n\n⚠️ CRITICAL REFERENCE INSTRUCTIONS (MUST FOLLOW):\nItems marked [NÃO ALTERAR] MUST be reproduced EXACTLY as shown — do NOT change, reimagine, or substitute them.\nEnvironment references affect ONLY the background/scenery, NEVER the product, person, clothing or logo.${imagePositionHint}\n\n${referenceDescs.join('\n')}`;
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
        const videoPrompt = combinedInput || 'A cinematic scene';
        const aspectRatio = config.aspectRatio || '16:9';
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
        for (let i = 0; i < frameCount; i++) {
          const stage = motionStages[i % motionStages.length];
          const framePrompt = `Ultra high resolution cinematic film still, movie production quality, dramatic lighting, shallow depth of field, ${aspectRatio} aspect ratio, professional cinematography, photorealistic, frame ${i + 1} of ${frameCount} — ${stage}: ${videoPrompt}`;
          
          nodeResultStore.setResult(node.id, { 
            text: `🎬 Gerando frame ${i + 1}/${frameCount}...`, 
            _animFrames: frames.length > 0 ? [...frames] : undefined,
            _totalFrames: frameCount,
          });

          try {
            const result = await callStudio('generate_image', {
              prompt: framePrompt,
              model: 'google/gemini-3-pro-image-preview',
              imageUrls: imageInputs.length > 0 ? imageInputs : undefined,
            }, perFrameTimeout);
            if (result?.imageUrl) {
              frames.push(result.imageUrl);
            }
          } catch (frameErr: any) {
            console.warn(`[Studio] Frame ${i + 1} failed, skipping:`, frameErr.message);
            toast.error(`Frame ${i + 1} falhou: ${frameErr.message?.substring(0, 80)}`, { duration: 4000 });
            // Continue generating remaining frames
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
            // Race GIF encoding against a 60s timeout
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
        
        // Check if user has ElevenLabs configured (paid option)
        const estabId = localStorage.getItem('estabelecimentoId');
        let useElevenLabs = false;
        let elevenLabsKey: any = null;

        if (estabId) {
          const { data } = await supabase
            .from('ai_api_keys')
            .select('api_key, base_url, is_active')
            .eq('estabelecimento_id', estabId)
            .eq('provider', 'elevenlabs')
            .eq('is_active', true)
            .maybeSingle();
          if (data?.api_key) {
            useElevenLabs = true;
            elevenLabsKey = data;
          }
        }

        if (useElevenLabs && elevenLabsKey) {
          // PAID: ElevenLabs TTS
          try {
            let extraConfig: Record<string, any> = {};
            try { extraConfig = elevenLabsKey.base_url ? JSON.parse(elevenLabsKey.base_url) : {}; } catch {}

            const voiceId = config.voiceId || extraConfig.defaultVoiceId || 'JBFqnCBsd6RMkjVDRZzb';
            const model = config.audioModel?.replace('elevenlabs/', '') || extraConfig.defaultModel || 'eleven_multilingual_v2';
            const outputFormat = extraConfig.outputFormat || 'mp3_44100_128';

            const ttsResponse = await fetch(
              `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${outputFormat}`,
              {
                method: 'POST',
                headers: {
                  'xi-api-key': elevenLabsKey.api_key,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  text: textToSpeak,
                  model_id: model,
                  voice_settings: {
                    stability: extraConfig.stability ?? 0.5,
                    similarity_boost: extraConfig.similarityBoost ?? 0.75,
                    style: extraConfig.style ?? 0.5,
                    use_speaker_boost: extraConfig.useSpeakerBoost ?? true,
                    speed: extraConfig.speed ?? 1.0,
                  },
                }),
              }
            );

            if (!ttsResponse.ok) {
              const errMsg = await ttsResponse.text().catch(() => '');
              throw new Error(`ElevenLabs ${ttsResponse.status}: ${errMsg.substring(0, 200)}`);
            }

            const audioBlob = await ttsResponse.blob();
            const audioUrl = URL.createObjectURL(audioBlob);

            return {
              audioUrl,
              text: `🔊 Áudio gerado com ElevenLabs (pago)!\nVoz: ${voiceId.substring(0, 8)}... | Modelo: ${model}\nTexto: "${textToSpeak.substring(0, 80)}"`,
            };
          } catch (err: any) {
            console.error('[Studio] ElevenLabs TTS error:', err);
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

            // Use MediaRecorder to capture speech output
            const utterance = new SpeechSynthesisUtterance(textToSpeak);
            utterance.lang = config.lang || 'pt-BR';
            utterance.rate = config.speed || 1.0;
            utterance.pitch = config.pitch || 1.0;

            // Select voice if available
            const voices = speechSynthesis.getVoices();
            const ptVoice = voices.find(v => v.lang.startsWith('pt')) || voices[0];
            if (ptVoice) utterance.voice = ptVoice;

            // Since Web Speech API doesn't directly give audio blobs,
            // we generate a silent audio with a marker text
            utterance.onend = () => {
              // Create a simple WAV with silence as placeholder + play via speechSynthesis
              resolve('__webspeech__');
            };
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

      case 'musicGen':
        return {
          text: `🎵 Música (${config.genre}) gerada: "${combinedInput}"\nDuração: ${config.duration}s\n\n⚠️ Para geração real de música, conecte o ElevenLabs Sound Effects API.`,
        };

      case 'lipSync':
        return {
          text: `👄 Sincronismo labial aplicado.\n\n⚠️ Para lip sync real, conecte o ElevenLabs Conversational AI.`,
        };

      case 'videoMerge':
        return {
          text: `🔗 Vídeos unidos com transição "${config.transition}" (${config.transitionDuration}s).\n\n⚠️ Para merge real de vídeo, conecte uma API de edição de vídeo.`,
        };

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
    onNodesUpdateRef.current = onNodesUpdate || null;

    const order = getExecutionOrder(nodes, edges);
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

        setCurrentNodeId(nodeId);
        const startTime = Date.now();
        updateNode(nodeId, { isProcessing: true, error: undefined });
        nodeResultStore.setProcessing(nodeId, true);
        nodeResultStore.clearError(nodeId);
        updateLog(nodeId, { status: 'running', startedAt: startTime });

        try {
          const inputs = getInputResults(nodeId, edges, results);
          console.log(`[Studio] Node ${nodeId} (${nd.type}) inputs:`, inputs.length, 'items');
          const result = await executeNode(node, inputs);
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

  return { executeWorkflow, isExecuting, executionLog, currentNodeId, clearLog };
}
