import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, RotateCcw, Video, Image, Check, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── LAYER DEFINITIONS ───────────────────────────────────────────────

interface LayerOption {
  id: string;
  label: string;
  emoji?: string;
}

interface Layer {
  id: string;
  title: string;
  emoji: string;
  description: string;
  options: LayerOption[];
  multiple?: boolean; // allow multi-select
  required?: boolean;
  visibleWhen?: (selections: Record<string, string[]>) => boolean;
}

const LAYERS: Layer[] = [
  // CAMADA 1 — TIPO DE CONTEÚDO
  {
    id: 'contentType',
    title: 'Tipo de Conteúdo',
    emoji: '🎬',
    description: 'Escolha entre vídeo ou imagem',
    required: true,
    options: [
      { id: 'video', label: 'Video Generation', emoji: '🎥' },
      { id: 'image', label: 'Image Generation', emoji: '🖼️' },
    ],
  },
  // CAMADA 2 — MODELO DE IA (vídeo)
  {
    id: 'videoModel',
    title: 'Modelo de IA',
    emoji: '🤖',
    description: 'Selecione o modelo de vídeo',
    required: true,
    visibleWhen: (s) => s.contentType?.includes('video'),
    options: [
      { id: 'veo3', label: 'Veo 3', emoji: '🔵' },
      { id: 'sora', label: 'Sora', emoji: '🟢' },
      { id: 'kling', label: 'Kling', emoji: '🟣' },
      { id: 'gen4', label: 'Gen-4', emoji: '🔴' },
      { id: 'hailuo', label: 'Hailuo', emoji: '🟡' },
      { id: 'pika', label: 'Pika', emoji: '🟠' },
      { id: 'dream-machine', label: 'Dream Machine', emoji: '💭' },
      { id: 'seed-video', label: 'Seed Video', emoji: '🌱' },
      { id: 'svd', label: 'Stable Video Diffusion', emoji: '⚡' },
    ],
  },
  // CAMADA 2 — MODELO DE IA (imagem)
  {
    id: 'imageModel',
    title: 'Modelo de IA',
    emoji: '🤖',
    description: 'Selecione o modelo de imagem',
    required: true,
    visibleWhen: (s) => s.contentType?.includes('image'),
    options: [
      { id: 'midjourney', label: 'Midjourney', emoji: '🎨' },
      { id: 'stable-diffusion', label: 'Stable Diffusion', emoji: '⚡' },
      { id: 'flux', label: 'Flux', emoji: '🌊' },
      { id: 'dall-e', label: 'DALL-E', emoji: '🟢' },
      { id: 'leonardo', label: 'Leonardo AI', emoji: '🦁' },
    ],
  },
  // CAMADA 3 — ESTILO VISUAL
  {
    id: 'visualStyle',
    title: 'Estilo Visual',
    emoji: '🎨',
    description: 'Defina a estética do conteúdo',
    options: [
      { id: 'cinematic', label: 'Cinematic', emoji: '🎬' },
      { id: 'realistic', label: 'Realistic', emoji: '📸' },
      { id: 'ugc', label: 'UGC', emoji: '📱' },
      { id: 'luxury', label: 'Luxury', emoji: '💎' },
      { id: 'minimalist', label: 'Minimalist', emoji: '◻️' },
      { id: 'futuristic', label: 'Futuristic', emoji: '🚀' },
      { id: 'commercial', label: 'Commercial Advertising', emoji: '📺' },
      { id: 'viral', label: 'Viral Social Media', emoji: '🔥' },
      { id: 'documentary', label: 'Documentary Style', emoji: '🎥' },
      { id: 'high-fashion', label: 'High Fashion', emoji: '👗' },
      { id: 'studio-photo', label: 'Studio Photography', emoji: '📷' },
      { id: 'lifestyle', label: 'Lifestyle', emoji: '🌿' },
    ],
  },
  // CAMADA 4 — PLATAFORMA
  {
    id: 'platform',
    title: 'Plataforma de Publicação',
    emoji: '📲',
    description: 'Onde o conteúdo será publicado',
    options: [
      { id: 'tiktok', label: 'TikTok', emoji: '🎵' },
      { id: 'instagram', label: 'Instagram', emoji: '📸' },
      { id: 'instagram-reels', label: 'Instagram Reels', emoji: '🎞️' },
      { id: 'youtube', label: 'YouTube', emoji: '▶️' },
      { id: 'youtube-shorts', label: 'YouTube Shorts', emoji: '⚡' },
      { id: 'facebook-ads', label: 'Facebook Ads', emoji: '📘' },
      { id: 'landing-page', label: 'Landing Page Video', emoji: '🌐' },
      { id: 'hero-section', label: 'Website Hero Section', emoji: '🖥️' },
    ],
  },
  // CAMADA 5 — PERSONAGEM
  {
    id: 'character',
    title: 'Tipo de Personagem',
    emoji: '🧑',
    description: 'Quem aparece no conteúdo',
    options: [
      { id: 'product-only', label: 'Product Only', emoji: '📦' },
      { id: 'influencer', label: 'Influencer', emoji: '⭐' },
      { id: 'ugc-creator', label: 'UGC Creator', emoji: '📱' },
      { id: 'narrator', label: 'Narrator / Voice Over', emoji: '🎙️' },
      { id: 'lifestyle-model', label: 'Lifestyle Model', emoji: '🧑‍🤝‍🧑' },
      { id: 'crowd', label: 'Crowd / Multiple People', emoji: '👥' },
    ],
  },
  // CAMADA 6 — TIPO DE CAMPANHA
  {
    id: 'campaignType',
    title: 'Tipo de Campanha',
    emoji: '🎯',
    description: 'Formato da narrativa publicitária',
    options: [
      { id: 'showcase', label: 'Product Showcase', emoji: '✨' },
      { id: 'demonstration', label: 'Product Demonstration', emoji: '🔍' },
      { id: 'problem-solution', label: 'Problem → Solution', emoji: '💡' },
      { id: 'before-after', label: 'Before and After', emoji: '🔄' },
      { id: 'storytelling', label: 'Storytelling', emoji: '📖' },
      { id: 'influencer-review', label: 'Influencer Review', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'lifestyle-usage', label: 'Lifestyle Usage', emoji: '🌿' },
      { id: 'testimonial', label: 'Testimonial', emoji: '💬' },
      { id: 'comparison', label: 'Comparison', emoji: '⚖️' },
    ],
  },
  // CAMADA 7 — CATEGORIA DO PRODUTO
  {
    id: 'productCategory',
    title: 'Categoria de Produto',
    emoji: '🏷️',
    description: 'Tipo de produto em destaque',
    options: [
      { id: 'technology', label: 'Technology', emoji: '💻' },
      { id: 'smartphones', label: 'Smartphones', emoji: '📱' },
      { id: 'gadgets', label: 'Gadgets', emoji: '🔌' },
      { id: 'beauty', label: 'Beauty', emoji: '💄' },
      { id: 'skincare', label: 'Skincare', emoji: '🧴' },
      { id: 'cosmetics', label: 'Cosmetics', emoji: '💅' },
      { id: 'perfumes', label: 'Perfumes', emoji: '🌸' },
      { id: 'fitness', label: 'Fitness', emoji: '💪' },
      { id: 'supplements', label: 'Supplements', emoji: '💊' },
      { id: 'sportswear', label: 'Sportswear', emoji: '👟' },
      { id: 'fashion', label: 'Fashion', emoji: '👔' },
      { id: 'accessories', label: 'Accessories', emoji: '⌚' },
      { id: 'food', label: 'Food', emoji: '🍔' },
      { id: 'beverages', label: 'Beverages', emoji: '🥤' },
      { id: 'automotive', label: 'Automotive', emoji: '🚗' },
      { id: 'home-gadgets', label: 'Home Gadgets', emoji: '🏠' },
      { id: 'pets', label: 'Pets', emoji: '🐾' },
    ],
  },
  // EXTRA 1 — CÂMERA
  {
    id: 'cameraStyle',
    title: 'Estilo de Câmera',
    emoji: '📹',
    description: 'Movimento e enquadramento',
    visibleWhen: (s) => s.contentType?.includes('video'),
    options: [
      { id: 'handheld', label: 'Handheld', emoji: '🤳' },
      { id: 'cinematic-camera', label: 'Cinematic Camera', emoji: '🎬' },
      { id: 'drone', label: 'Drone Shot', emoji: '🚁' },
      { id: 'macro', label: 'Macro Shot', emoji: '🔬' },
      { id: 'slowmo', label: 'Slow Motion', emoji: '🐌' },
      { id: 'tracking', label: 'Tracking Shot', emoji: '🏃' },
      { id: 'pov', label: 'POV Camera', emoji: '👁️' },
      { id: 'rotation', label: 'Product Rotation', emoji: '🔄' },
    ],
  },
  // EXTRA 2 — ILUMINAÇÃO
  {
    id: 'lighting',
    title: 'Estilo de Iluminação',
    emoji: '💡',
    description: 'Tom e atmosfera da luz',
    options: [
      { id: 'natural', label: 'Natural Light', emoji: '☀️' },
      { id: 'studio', label: 'Studio Lighting', emoji: '💡' },
      { id: 'dramatic', label: 'Dramatic Lighting', emoji: '🌑' },
      { id: 'neon', label: 'Neon Lighting', emoji: '🟣' },
      { id: 'soft-luxury', label: 'Soft Luxury Lighting', emoji: '✨' },
      { id: 'high-contrast', label: 'High Contrast Lighting', emoji: '⬛' },
      { id: 'golden-hour', label: 'Golden Hour Lighting', emoji: '🌅' },
    ],
  },
  // EXTRA 3 — ENERGIA
  {
    id: 'energy',
    title: 'Energia do Conteúdo',
    emoji: '⚡',
    description: 'Ritmo e sensação geral',
    options: [
      { id: 'high-energy', label: 'High Energy', emoji: '🔥' },
      { id: 'calm', label: 'Calm / Aesthetic', emoji: '🌿' },
      { id: 'luxury-mood', label: 'Luxury Mood', emoji: '💎' },
      { id: 'dramatic-mood', label: 'Dramatic', emoji: '🎭' },
      { id: 'emotional', label: 'Emotional', emoji: '💖' },
      { id: 'inspirational', label: 'Inspirational', emoji: '🌟' },
    ],
  },
  // EXTRA 4 — ORIENTAÇÃO
  {
    id: 'orientation',
    title: 'Orientação do Conteúdo',
    emoji: '📐',
    description: 'Proporção e formato',
    options: [
      { id: 'vertical', label: 'Vertical (9:16)', emoji: '📱' },
      { id: 'horizontal', label: 'Horizontal (16:9)', emoji: '🖥️' },
      { id: 'square', label: 'Square (1:1)', emoji: '⬜' },
    ],
  },
];

// ─── PROMPT GENERATOR ────────────────────────────────────────────────

function generatePrompt(selections: Record<string, string[]>): string {
  const parts: string[] = [];
  const isVideo = selections.contentType?.includes('video');

  // Content type
  if (isVideo) {
    parts.push('Create a professional video');
  } else {
    parts.push('Create a professional image');
  }

  // Campaign type
  const campaignMap: Record<string, string> = {
    'showcase': 'showcasing the product with elegant presentation',
    'demonstration': 'demonstrating the product features and functionality',
    'problem-solution': 'showing a problem and how the product solves it',
    'before-after': 'revealing a dramatic before and after transformation',
    'storytelling': 'telling a compelling brand story',
    'influencer-review': 'featuring an influencer reviewing and recommending the product',
    'unboxing': 'capturing an exciting unboxing experience',
    'lifestyle-usage': 'showing the product being used naturally in everyday life',
    'testimonial': 'featuring authentic customer testimonial and endorsement',
    'comparison': 'comparing the product advantages against alternatives',
  };
  if (selections.campaignType?.length) {
    parts.push(campaignMap[selections.campaignType[0]] || '');
  }

  // Product category
  const productMap: Record<string, string> = {
    'technology': 'for a technology product',
    'smartphones': 'for a smartphone',
    'gadgets': 'for a tech gadget',
    'beauty': 'for a beauty product',
    'skincare': 'for a skincare product',
    'cosmetics': 'for cosmetics',
    'perfumes': 'for a perfume/fragrance',
    'fitness': 'for fitness equipment',
    'supplements': 'for supplements',
    'sportswear': 'for sportswear/athleisure',
    'fashion': 'for a fashion item',
    'accessories': 'for a fashion accessory',
    'food': 'for a food product',
    'beverages': 'for a beverage',
    'automotive': 'for an automotive product',
    'home-gadgets': 'for a home gadget',
    'pets': 'for a pet product',
  };
  if (selections.productCategory?.length) {
    parts.push(productMap[selections.productCategory[0]] || '');
  }

  // Visual style
  const styleMap: Record<string, string> = {
    'cinematic': 'cinematic film look with dramatic composition and color grading',
    'realistic': 'hyper-realistic photographic quality with natural details',
    'ugc': 'authentic user-generated content feel, raw and relatable',
    'luxury': 'luxury premium aesthetic with rich textures and elegant tones',
    'minimalist': 'clean minimalist design with white space and simplicity',
    'futuristic': 'futuristic sci-fi aesthetic with sleek technology vibes',
    'commercial': 'polished commercial advertising quality, broadcast-ready',
    'viral': 'eye-catching viral social media style, bold and attention-grabbing',
    'documentary': 'documentary style with authentic and journalistic approach',
    'high-fashion': 'high fashion editorial look with bold styling and poses',
    'studio-photo': 'professional studio photography with controlled lighting',
    'lifestyle': 'warm lifestyle aesthetic with natural and aspirational feel',
  };
  if (selections.visualStyle?.length) {
    parts.push(`Style: ${styleMap[selections.visualStyle[0]] || selections.visualStyle[0]}`);
  }

  // Character
  const charMap: Record<string, string> = {
    'product-only': 'featuring only the product, no people',
    'influencer': 'featuring a charismatic influencer presenting the product',
    'ugc-creator': 'featuring a relatable UGC creator filming casual content',
    'narrator': 'with voice-over narration guiding the viewer',
    'lifestyle-model': 'featuring a lifestyle model naturally using the product',
    'crowd': 'featuring multiple people interacting with the product',
  };
  if (selections.character?.length) {
    parts.push(charMap[selections.character[0]] || '');
  }

  // Platform
  const platformMap: Record<string, string> = {
    'tiktok': 'optimized for TikTok, fast-paced and engaging',
    'instagram': 'optimized for Instagram feed, visually striking',
    'instagram-reels': 'optimized for Instagram Reels, vertical and dynamic',
    'youtube': 'optimized for YouTube, cinematic widescreen',
    'youtube-shorts': 'optimized for YouTube Shorts, vertical quick-hit content',
    'facebook-ads': 'optimized for Facebook Ads, conversion-focused',
    'landing-page': 'for a landing page hero video, premium and persuasive',
    'hero-section': 'for website hero section, looping ambient visual',
  };
  if (selections.platform?.length) {
    parts.push(platformMap[selections.platform[0]] || '');
  }

  // Camera style (video only)
  if (isVideo && selections.cameraStyle?.length) {
    const cameraMap: Record<string, string> = {
      'handheld': 'handheld camera with natural organic movement',
      'cinematic-camera': 'smooth cinematic camera movement on dolly/gimbal',
      'drone': 'aerial drone shot with sweeping perspective',
      'macro': 'extreme macro close-up revealing fine details',
      'slowmo': 'dramatic slow motion capturing every detail',
      'tracking': 'dynamic tracking shot following the subject',
      'pov': 'immersive POV first-person perspective',
      'rotation': '360-degree product rotation revealing all angles',
    };
    parts.push(`Camera: ${cameraMap[selections.cameraStyle[0]] || ''}`);
  }

  // Lighting
  const lightMap: Record<string, string> = {
    'natural': 'natural daylight illumination',
    'studio': 'professional studio lighting setup',
    'dramatic': 'dramatic chiaroscuro lighting with deep shadows',
    'neon': 'vibrant neon lighting with colorful reflections',
    'soft-luxury': 'soft diffused luxury lighting',
    'high-contrast': 'high contrast lighting with bold shadows',
    'golden-hour': 'warm golden hour sunlight',
  };
  if (selections.lighting?.length) {
    parts.push(`Lighting: ${lightMap[selections.lighting[0]] || ''}`);
  }

  // Energy
  const energyMap: Record<string, string> = {
    'high-energy': 'high energy, fast cuts, dynamic and exciting pace',
    'calm': 'calm, aesthetic, slow and contemplative rhythm',
    'luxury-mood': 'luxury mood, sophisticated and premium atmosphere',
    'dramatic-mood': 'dramatic tension, building anticipation',
    'emotional': 'emotional and touching, connecting with the viewer',
    'inspirational': 'inspirational and uplifting, motivating the viewer',
  };
  if (selections.energy?.length) {
    parts.push(`Mood: ${energyMap[selections.energy[0]] || ''}`);
  }

  // Orientation
  const orientMap: Record<string, string> = {
    'vertical': 'Vertical format 9:16 aspect ratio',
    'horizontal': 'Horizontal format 16:9 aspect ratio',
    'square': 'Square format 1:1 aspect ratio',
  };
  if (selections.orientation?.length) {
    parts.push(orientMap[selections.orientation[0]] || '');
  }

  // AI model mention
  const modelKey = isVideo ? 'videoModel' : 'imageModel';
  if (selections[modelKey]?.length) {
    const modelLabel = LAYERS.find(l => l.id === modelKey)?.options.find(o => o.id === selections[modelKey][0])?.label;
    if (modelLabel) parts.push(`Optimized for ${modelLabel}`);
  }

  parts.push('Professional quality, 4K resolution, highly detailed');

  return parts.filter(Boolean).join('. ') + '.';
}

// ─── COMPONENT ───────────────────────────────────────────────────────

interface Preset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  image: string;
  category: string;
  toolType?: string;
  isVideo?: boolean;
  videoModel?: string;
  duration?: number;
  videoSubcategory?: string;
}

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
}

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose }) => {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [expandedLayer, setExpandedLayer] = useState<string>('contentType');

  const visibleLayers = useMemo(() => {
    return LAYERS.filter(layer => {
      if (!layer.visibleWhen) return true;
      return layer.visibleWhen(selections);
    });
  }, [selections]);

  const toggleOption = (layerId: string, optionId: string) => {
    setSelections(prev => {
      const current = prev[layerId] || [];
      const layer = LAYERS.find(l => l.id === layerId);

      // For content type, clear model selections when switching
      if (layerId === 'contentType') {
        const next: Record<string, string[]> = { ...prev, [layerId]: [optionId] };
        delete next.videoModel;
        delete next.imageModel;
        return next;
      }

      if (layer?.multiple) {
        if (current.includes(optionId)) {
          return { ...prev, [layerId]: current.filter(id => id !== optionId) };
        }
        return { ...prev, [layerId]: [...current, optionId] };
      }

      // Single select — toggle off if same
      if (current.includes(optionId)) {
        return { ...prev, [layerId]: [] };
      }
      return { ...prev, [layerId]: [optionId] };
    });
  };

  const selectionCount = Object.values(selections).filter(v => v.length > 0).length;

  const generatedPrompt = useMemo(() => {
    if (selectionCount < 2) return '';
    return generatePrompt(selections);
  }, [selections, selectionCount]);

  const handleGenerate = () => {
    const isVideo = selections.contentType?.includes('video');
    const modelKey = isVideo ? 'videoModel' : 'imageModel';
    const modelId = selections[modelKey]?.[0];

    // Map model IDs to actual API model strings
    const videoModelMap: Record<string, string> = {
      'veo3': 'google/veo-3.1',
      'sora': 'openai/sora-2',
      'kling': 'kling/v2.1',
      'gen4': 'runway/gen4',
      'hailuo': 'hailuo/minimax-video-01',
      'pika': 'pika/v2',
      'dream-machine': 'luma/dream-machine',
      'seed-video': 'seed/video-01',
      'svd': 'stability/svd',
    };

    // Build summary name
    const style = selections.visualStyle?.[0] || '';
    const campaign = selections.campaignType?.[0] || '';
    const platform = selections.platform?.[0] || '';
    const nameParts = [
      style && LAYERS.find(l => l.id === 'visualStyle')?.options.find(o => o.id === style)?.label,
      campaign && LAYERS.find(l => l.id === 'campaignType')?.options.find(o => o.id === campaign)?.label,
      platform && LAYERS.find(l => l.id === 'platform')?.options.find(o => o.id === platform)?.label,
    ].filter(Boolean);

    const preset: Preset = {
      id: `custom-${Date.now()}`,
      name: nameParts.length ? nameParts.join(' • ') : (isVideo ? 'Vídeo Personalizado' : 'Imagem Personalizada'),
      description: 'Prompt gerado automaticamente a partir das categorias selecionadas.',
      prompt: generatedPrompt,
      image: '',
      category: isVideo ? 'video' : 'image',
      toolType: isVideo ? 'videoGen' : 'imageGen',
      isVideo: isVideo,
      videoModel: isVideo && modelId ? videoModelMap[modelId] : undefined,
      duration: isVideo ? 6 : undefined,
    };

    onSelectPreset(preset);
  };

  const handleReset = () => {
    setSelections({});
    setExpandedLayer('contentType');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Gerador de Prompts
          </h2>
          <p className="text-sm text-muted-foreground">Selecione categorias para gerar prompts profissionais</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — Layers */}
        <ScrollArea className="flex-1 lg:max-w-[65%]">
          <div className="p-4 space-y-2">
            {visibleLayers.map((layer, idx) => {
              const isExpanded = expandedLayer === layer.id;
              const selected = selections[layer.id] || [];
              const hasSelection = selected.length > 0;

              return (
                <motion.div
                  key={layer.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`rounded-xl border transition-all ${
                    isExpanded
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : hasSelection
                        ? 'border-primary/20 bg-primary/[0.02]'
                        : 'border-border/60 hover:border-border'
                  }`}
                >
                  {/* Layer header */}
                  <button
                    onClick={() => setExpandedLayer(isExpanded ? '' : layer.id)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{layer.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{layer.title}</span>
                          {layer.required && !hasSelection && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-destructive/40 text-destructive">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {!isExpanded && hasSelection && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {selected.map(s => {
                              const opt = layer.options.find(o => o.id === s);
                              return (
                                <Badge key={s} className="text-[10px] px-1.5 py-0 bg-primary/15 text-primary border-primary/20">
                                  {opt?.emoji} {opt?.label}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasSelection && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                      <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </div>
                  </button>

                  {/* Layer options */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <p className="text-xs text-muted-foreground mb-3">{layer.description}</p>
                          <div className="flex flex-wrap gap-2">
                            {layer.options.map((option) => {
                              const isSelected = selected.includes(option.id);
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => {
                                    toggleOption(layer.id, option.id);
                                  }}
                                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary shadow-sm scale-[1.02]'
                                      : 'bg-background text-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5'
                                  }`}
                                >
                                  <span className="text-base">{option.emoji}</span>
                                  {option.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Right — Preview */}
        <div className="lg:w-[35%] border-t lg:border-t-0 lg:border-l bg-muted/20 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Prompt Gerado
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectionCount} {selectionCount === 1 ? 'camada selecionada' : 'camadas selecionadas'}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
              {/* Selection summary */}
              {selectionCount > 0 && (
                <div className="space-y-2">
                  {visibleLayers.filter(l => (selections[l.id] || []).length > 0).map(layer => (
                    <div key={layer.id} className="flex items-start gap-2">
                      <span className="text-sm mt-0.5">{layer.emoji}</span>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{layer.title}</span>
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {(selections[layer.id] || []).map(s => {
                            const opt = layer.options.find(o => o.id === s);
                            return (
                              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                                {opt?.label}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Generated prompt */}
              {generatedPrompt && (
                <div className="bg-background rounded-lg border p-3 mt-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">Prompt:</p>
                  <p className="text-xs text-foreground leading-relaxed font-mono">{generatedPrompt}</p>
                </div>
              )}

              {selectionCount < 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Wand2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Selecione pelo menos 2 camadas para gerar o prompt</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Generate button */}
          <div className="p-4 border-t">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={selectionCount < 2 || !selections.contentType?.length}
              onClick={handleGenerate}
            >
              {selections.contentType?.includes('video') ? (
                <Video className="h-4 w-4" />
              ) : (
                <Image className="h-4 w-4" />
              )}
              Gerar com este Prompt
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PresetsGallery;
export type { Preset };
