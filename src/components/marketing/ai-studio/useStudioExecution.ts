import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { StudioNode, StudioEdge, StudioNodeData } from './types';

export function useStudioExecution() {
  const [isExecuting, setIsExecuting] = useState(false);

  const callStudio = async (action: string, params: Record<string, any>) => {
    const { data, error } = await supabase.functions.invoke('ai-creative-studio', {
      body: { action, params },
    });
    if (error) throw new Error(error.message || 'Erro na execução');
    if (data?.error) throw new Error(data.error);
    return data?.result;
  };

  // Build execution order via topological sort
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

    // Collect text inputs
    const textInputs = inputs
      .map((i) => (typeof i === 'string' ? i : i?.text || i?.imageUrl || ''))
      .filter(Boolean);
    const combinedInput = textInputs.join('\n\n');

    // Find system prompts from inputs
    const systemPrompts = inputs.filter((i) => i?._isSystemPrompt).map((i) => i.text);
    const systemPrompt = systemPrompts.length > 0 ? systemPrompts.join('\n') : undefined;

    // Find image inputs
    const imageInputs = inputs.filter((i) => i?.imageUrl).map((i) => i.imageUrl);

    switch (type) {
      case 'textInput':
        return config.text || '';

      case 'systemPrompt':
        return { _isSystemPrompt: true, text: config.systemPrompt || '' };

      case 'llmProcess': {
        const result = await callStudio('enhance_prompt', {
          prompt: combinedInput,
          systemPrompt,
          model: config.model,
        });
        return result;
      }

      case 'imageGen': {
        const result = await callStudio('generate_image', {
          prompt: combinedInput || 'A beautiful scene',
          model: config.model,
        });
        return result;
      }

      case 'imageEdit': {
        const imageUrl = imageInputs[0];
        const result = await callStudio('edit_image', {
          prompt: config.editPrompt || combinedInput || 'Enhance this image',
          imageUrl,
          model: config.model,
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

      case 'videoGen':
        // Video generation placeholder - returns descriptive text
        return {
          text: `🎬 Vídeo gerado: "${combinedInput}"\nDuração: ${config.duration}s | Resolução: ${config.resolution} | Aspecto: ${config.aspectRatio}\n\n⚠️ Para geração real de vídeo, conecte uma API externa como RunwayML ou ElevenLabs.`,
        };

      case 'audioGen':
        return {
          text: `🔊 Áudio (${config.type}) gerado: "${combinedInput}"\nDuração: ${config.duration}s\n\n⚠️ Para geração real de áudio, conecte o ElevenLabs.`,
        };

      case 'musicGen':
        return {
          text: `🎵 Música (${config.genre}) gerada: "${combinedInput}"\nDuração: ${config.duration}s\n\n⚠️ Para geração real de música, conecte o ElevenLabs.`,
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
        // Pass through last input
        return inputs[inputs.length - 1] || { text: 'Nenhuma entrada recebida' };

      default:
        return { text: `Tipo desconhecido: ${type}` };
    }
  };

  const executeWorkflow = useCallback(async (
    nodes: StudioNode[],
    edges: StudioEdge[]
  ): Promise<StudioNode[]> => {
    setIsExecuting(true);

    const order = getExecutionOrder(nodes, edges);
    const results = new Map<string, any>();
    let updatedNodes = [...nodes];

    const updateNode = (id: string, partial: Partial<StudioNodeData>) => {
      updatedNodes = updatedNodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...partial } } : n
      );
    };

    try {
      for (const nodeId of order) {
        const node = nodes.find((n) => n.id === nodeId);
        if (!node) continue;

        updateNode(nodeId, { isProcessing: true, error: undefined });

        try {
          const inputs = getInputResults(nodeId, edges, results);
          const result = await executeNode(node, inputs);
          results.set(nodeId, result);
          updateNode(nodeId, { isProcessing: false, result });
        } catch (err: any) {
          updateNode(nodeId, { isProcessing: false, error: err.message });
          throw err;
        }
      }
    } finally {
      setIsExecuting(false);
    }

    return updatedNodes;
  }, []);

  return { executeWorkflow, isExecuting };
}
