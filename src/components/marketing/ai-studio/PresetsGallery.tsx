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
  multiple?: boolean;
  required?: boolean;
  visibleWhen?: (selections: Record<string, string[]>) => boolean;
}

const LAYERS: Layer[] = [
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
  // CAMADA 13 — OBJETIVO DE MARKETING
  {
    id: 'marketingGoal',
    title: 'Objetivo de Marketing',
    emoji: '🎯',
    description: 'Defina o objetivo do anúncio',
    options: [
      { id: 'product-awareness', label: 'Product Awareness', emoji: '👁️' },
      { id: 'direct-sales', label: 'Direct Sales', emoji: '💰' },
      { id: 'lead-generation', label: 'Lead Generation', emoji: '📋' },
      { id: 'brand-awareness', label: 'Brand Awareness', emoji: '🏢' },
      { id: 'app-install', label: 'App Install', emoji: '📲' },
      { id: 'product-launch', label: 'Product Launch', emoji: '🚀' },
      { id: 'retargeting', label: 'Retargeting', emoji: '🔁' },
      { id: 'social-proof', label: 'Social Proof', emoji: '⭐' },
      { id: 'educational', label: 'Educational Content', emoji: '📚' },
      { id: 'viral-engagement', label: 'Viral Engagement', emoji: '🔥' },
    ],
  },
  // CAMADA 14 — ESTILO DE GANCHO
  {
    id: 'hookStyle',
    title: 'Estilo de Gancho',
    emoji: '🪝',
    description: 'Tipo de abertura para capturar atenção',
    options: [
      { id: 'pattern-interrupt', label: 'Pattern Interrupt', emoji: '⚡' },
      { id: 'question', label: 'Question Hook', emoji: '❓' },
      { id: 'problem', label: 'Problem Hook', emoji: '😰' },
      { id: 'shock', label: 'Shock / Surprise', emoji: '😱' },
      { id: 'visual-hook', label: 'Visual Hook', emoji: '👀' },
      { id: 'fast-demo', label: 'Fast Demo', emoji: '⏩' },
      { id: 'bold-statement', label: 'Bold Statement', emoji: '💪' },
      { id: 'curiosity', label: 'Curiosity Hook', emoji: '🤔' },
    ],
  },
  // CAMADA 15 — FORMATO CRIATIVO
  {
    id: 'creativeFormat',
    title: 'Formato Criativo',
    emoji: '🎞️',
    description: 'Estrutura criativa do conteúdo',
    options: [
      { id: 'ugc-ad', label: 'UGC Ad', emoji: '📱' },
      { id: 'product-hero', label: 'Product Hero Shot', emoji: '✨' },
      { id: 'influencer-review', label: 'Influencer Review', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'before-after', label: 'Before and After', emoji: '🔄' },
      { id: 'lifestyle-ad', label: 'Lifestyle Ad', emoji: '🌿' },
      { id: 'cinematic-brand', label: 'Cinematic Brand Film', emoji: '🎬' },
      { id: 'viral-clip', label: 'Viral Social Clip', emoji: '🔥' },
      { id: 'testimonial', label: 'Testimonial', emoji: '💬' },
      { id: 'product-comparison', label: 'Product Comparison', emoji: '⚖️' },
    ],
  },
];

// ─── STRUCTURED PROMPT GENERATOR ─────────────────────────────────────

function generatePrompt(selections: Record<string, string[]>): string {
  const isVideo = selections.contentType?.includes('video');
  const blocks: { label: string; text: string }[] = [];

  // ── SCENE DESCRIPTION ──
  const sceneParts: string[] = [];
  const contentWord = isVideo ? 'video' : 'image';

  // Creative format sets the scene structure
  const creativeFormatMap: Record<string, string> = {
    'ugc-ad': `A raw, authentic UGC-style ${contentWord} ad filmed with a smartphone feel. The creator speaks directly to camera, showing the product naturally as if sharing with friends.`,
    'product-hero': `A stunning product hero shot ${contentWord} with the product as the absolute centerpiece, elevated on a pedestal or floating, with dramatic lighting emphasizing every detail and texture.`,
    'influencer-review': `An influencer review ${contentWord} where a charismatic creator naturally demonstrates and reviews the product, sharing genuine reactions and highlighting key features.`,
    'unboxing': `An exciting unboxing experience ${contentWord} capturing the anticipation and reveal of the product, showing premium packaging details and the first-touch reaction.`,
    'before-after': `A dramatic before and after transformation ${contentWord} showing the clear difference and impact of using the product, with split-screen or transition reveal.`,
    'lifestyle-ad': `A lifestyle advertisement ${contentWord} showing the product seamlessly integrated into an aspirational daily routine, emphasizing how it enhances everyday life.`,
    'cinematic-brand': `A premium cinematic brand film ${contentWord} with sweeping visuals, emotional narrative arc, and high-production value that elevates the brand identity.`,
    'viral-clip': `A highly shareable viral social media ${contentWord} designed for maximum engagement, with unexpected elements, quick transitions, and thumb-stopping moments.`,
    'testimonial': `An authentic testimonial ${contentWord} featuring a real customer sharing their genuine experience, with natural settings and honest emotional reactions.`,
    'product-comparison': `A side-by-side product comparison ${contentWord} clearly demonstrating the advantages over competitors, with data-driven visuals and clear differentiators.`,
  };

  if (selections.creativeFormat?.length) {
    sceneParts.push(creativeFormatMap[selections.creativeFormat[0]] || `Create a professional ${contentWord}`);
  } else {
    sceneParts.push(`Create a professional marketing ${contentWord}`);
  }

  // Campaign type enrichment
  const campaignMap: Record<string, string> = {
    'showcase': 'The scene showcases the product with elegant, premium presentation.',
    'demonstration': 'The scene demonstrates the product features and real-world functionality step by step.',
    'problem-solution': 'The narrative follows a problem-solution structure: first showing the frustration, then the product as the solution.',
    'before-after': 'The visual narrative reveals a dramatic before-and-after transformation.',
    'storytelling': 'The content tells a compelling emotional story connected to the brand.',
    'influencer-review': 'An influencer reviews and recommends the product with genuine enthusiasm.',
    'unboxing': 'The scene captures a premium unboxing experience with tactile details.',
    'lifestyle-usage': 'The product is shown being used naturally in an aspirational everyday lifestyle setting.',
    'testimonial': 'Authentic customer testimonial with genuine emotional connection.',
    'comparison': 'Direct comparison highlighting the product advantages over alternatives.',
  };
  if (selections.campaignType?.length) {
    sceneParts.push(campaignMap[selections.campaignType[0]] || '');
  }

  // Product category context
  const productMap: Record<string, string> = {
    'technology': 'The product is a cutting-edge technology device.',
    'smartphones': 'The product is a premium smartphone.',
    'gadgets': 'The product is an innovative tech gadget.',
    'beauty': 'The product is a beauty item with luxurious textures.',
    'skincare': 'The product is a skincare solution with visible results.',
    'cosmetics': 'The product is a cosmetic with rich pigments and finishes.',
    'perfumes': 'The product is a fragrance, evoking sensory luxury.',
    'fitness': 'The product is fitness equipment for peak performance.',
    'supplements': 'The product is a health supplement with science-backed benefits.',
    'sportswear': 'The product is high-performance sportswear/athleisure.',
    'fashion': 'The product is a fashion item with designer-level styling.',
    'accessories': 'The product is a premium fashion accessory.',
    'food': 'The product is a food item with appetizing textures and colors.',
    'beverages': 'The product is a beverage with refreshing visual appeal.',
    'automotive': 'The product is an automotive item with precision engineering.',
    'home-gadgets': 'The product is a smart home gadget for modern living.',
    'pets': 'The product is designed for pets, showing adorable animal interaction.',
  };
  if (selections.productCategory?.length) {
    sceneParts.push(productMap[selections.productCategory[0]] || '');
  }

  // Character
  const charMap: Record<string, string> = {
    'product-only': 'No people in the scene — the product is the sole protagonist.',
    'influencer': 'A charismatic influencer presents the product with natural confidence.',
    'ugc-creator': 'A relatable UGC creator films casual, authentic content about the product.',
    'narrator': 'The scene is guided by voice-over narration with no on-screen talent.',
    'lifestyle-model': 'A lifestyle model naturally incorporates the product into their routine.',
    'crowd': 'Multiple people interact with the product in a social setting.',
  };
  if (selections.character?.length) {
    sceneParts.push(charMap[selections.character[0]] || '');
  }

  // Marketing goal tone
  const goalMap: Record<string, string> = {
    'product-awareness': 'The tone focuses on introducing and building awareness for the product, making it memorable and recognizable.',
    'direct-sales': 'The tone is conversion-driven, emphasizing clear product benefits, urgency, and a strong call-to-action.',
    'lead-generation': 'The content is designed to spark curiosity and drive the viewer to learn more or sign up.',
    'brand-awareness': 'The focus is on emotional brand storytelling, building identity and long-term recognition.',
    'app-install': 'The content showcases the app interface and key features, driving installs with a clear CTA.',
    'product-launch': 'The tone builds excitement and anticipation for a brand-new product reveal.',
    'retargeting': 'The content reinforces the product value proposition for viewers who have already shown interest.',
    'social-proof': 'The content emphasizes social proof through reviews, ratings, user counts, or testimonials.',
    'educational': 'The content educates the viewer about the product with informative, value-driven messaging.',
    'viral-engagement': 'The content is engineered for maximum shares and engagement with trending, shareable elements.',
  };
  if (selections.marketingGoal?.length) {
    sceneParts.push(goalMap[selections.marketingGoal[0]] || '');
  }

  blocks.push({ label: '🎬 SCENE DESCRIPTION', text: sceneParts.filter(Boolean).join(' ') });

  // ── HOOK ──
  const hookMap: Record<string, string> = {
    'pattern-interrupt': 'Strong pattern interrupt in the first 3 seconds — an unexpected visual or action that immediately breaks the viewer\'s scroll and demands attention.',
    'question': 'Open with a provocative question displayed on screen or spoken directly to camera that makes the viewer pause and think.',
    'problem': 'Start by dramatizing a relatable problem or pain point that the viewer immediately identifies with, creating urgency.',
    'shock': 'Begin with a shocking or surprising visual reveal that creates an immediate emotional reaction and curiosity.',
    'visual-hook': 'Open with a stunning, visually arresting shot — dramatic close-up, unexpected angle, or mesmerizing motion that captivates instantly.',
    'fast-demo': 'Jump straight into a rapid product demonstration in the first 2 seconds, showing the product in action before the viewer can scroll.',
    'bold-statement': 'Open with a bold, controversial, or provocative text statement on screen that challenges the viewer\'s assumptions.',
    'curiosity': 'Create a curiosity gap in the opening — show a teaser of the result or an intriguing setup that makes the viewer need to keep watching.',
  };
  if (selections.hookStyle?.length) {
    blocks.push({ label: '🪝 HOOK', text: hookMap[selections.hookStyle[0]] || '' });
  }

  // ── CAMERA SETUP ──
  if (isVideo && selections.cameraStyle?.length) {
    const cameraMap: Record<string, string> = {
      'handheld': 'Handheld camera with natural organic movement, slight shake for authentic feel. Close to mid-range framing.',
      'cinematic-camera': 'Smooth cinematic camera on gimbal or dolly. Precise, controlled movements with professional film-grade framing and depth of field.',
      'drone': 'Aerial drone shot with sweeping, elevated perspective revealing the full scene and environment.',
      'macro': 'Extreme macro close-up shot revealing fine textures, materials, and microscopic product details.',
      'slowmo': 'Dramatic slow motion capture at 120-240fps, emphasizing every detail of movement and texture.',
      'tracking': 'Dynamic tracking shot following the subject with smooth lateral or forward movement, keeping the subject perfectly framed.',
      'pov': 'Immersive first-person POV perspective, placing the viewer directly in the scene as if experiencing it themselves.',
      'rotation': '360-degree product rotation on turntable, revealing every angle with consistent, smooth motion.',
    };
    blocks.push({ label: '📹 CAMERA SETUP', text: cameraMap[selections.cameraStyle[0]] || '' });
  }

  // ── LIGHTING ──
  if (selections.lighting?.length) {
    const lightMap: Record<string, string> = {
      'natural': 'Natural daylight illumination with soft window light or outdoor sunlight, creating authentic warmth and gentle shadows.',
      'studio': 'Professional multi-point studio lighting setup with key light, fill light, and rim light for polished, controlled illumination.',
      'dramatic': 'Dramatic chiaroscuro lighting with deep shadows and strong directional light creating bold contrast and mood.',
      'neon': 'Vibrant neon lighting with colorful reflections, glows, and RGB accents creating a modern, edgy atmosphere.',
      'soft-luxury': 'Soft, diffused luxury lighting with warm tones, delicate highlights, and gentle gradients for an elegant premium feel.',
      'high-contrast': 'High contrast lighting with bold shadows and bright highlights, creating strong graphic visual impact.',
      'golden-hour': 'Warm golden hour sunlight with long shadows, amber tones, and a magical, dreamy atmospheric quality.',
    };
    blocks.push({ label: '💡 LIGHTING', text: lightMap[selections.lighting[0]] || '' });
  }

  // ── ACTION ──
  const actionParts: string[] = [];
  const energyMap: Record<string, string> = {
    'high-energy': 'Fast-paced dynamic action with quick cuts, rapid movements, and intense rhythm. The energy is explosive and exciting.',
    'calm': 'Slow, contemplative, and aesthetic rhythm. Gentle movements, long takes, and a serene, meditative atmosphere.',
    'luxury-mood': 'Sophisticated, slow, and premium-paced. Every movement is deliberate, elegant, and dripping with luxury.',
    'dramatic-mood': 'Building dramatic tension with suspenseful pacing, anticipation beats, and a powerful climactic reveal.',
    'emotional': 'Emotionally charged pacing that connects deeply with the viewer, building warmth and genuine human connection.',
    'inspirational': 'Uplifting and motivational rhythm with crescendo pacing, building from calm to powerful and empowering.',
  };
  if (selections.energy?.length) {
    actionParts.push(energyMap[selections.energy[0]] || '');
  }
  if (actionParts.length) {
    blocks.push({ label: '🎬 ACTION', text: actionParts.filter(Boolean).join(' ') });
  }

  // ── VISUAL STYLE ──
  if (selections.visualStyle?.length) {
    const styleMap: Record<string, string> = {
      'cinematic': 'Cinematic film aesthetic with wide dynamic range, film grain, anamorphic lens characteristics, and professional color grading with teal-orange tones.',
      'realistic': 'Hyper-realistic photographic quality with natural skin tones, authentic textures, and true-to-life color accuracy.',
      'ugc': 'Authentic user-generated content aesthetic — raw, unpolished, smartphone-shot feel that is relatable and trustworthy.',
      'luxury': 'Ultra-premium luxury visual language with rich metallic textures, deep blacks, golds, and refined elegant composition.',
      'minimalist': 'Clean minimalist design with abundant white space, simple geometric composition, and typographic precision.',
      'futuristic': 'Futuristic sci-fi aesthetic with holographic elements, sleek surfaces, cyber-blue tones, and technology-forward design.',
      'commercial': 'Broadcast-quality commercial advertising polish with perfect color balance, professional retouching, and crisp resolution.',
      'viral': 'Bold, attention-grabbing viral social media style with oversaturated colors, bold text overlays, and thumb-stopping visual impact.',
      'documentary': 'Documentary style with authentic, journalistic visual approach. Natural framing, observational camera work.',
      'high-fashion': 'High fashion editorial aesthetic with bold styling, dramatic poses, avant-garde composition, and magazine-quality finish.',
      'studio-photo': 'Professional studio photography with controlled lighting, seamless backgrounds, and commercial-grade product presentation.',
      'lifestyle': 'Warm lifestyle aesthetic with natural tones, aspirational settings, and a genuine, lived-in visual warmth.',
    };
    blocks.push({ label: '🎨 VISUAL STYLE', text: styleMap[selections.visualStyle[0]] || '' });
  }

  // ── PLATFORM OPTIMIZATION ──
  if (selections.platform?.length) {
    const platformMap: Record<string, string> = {
      'tiktok': 'Optimized for TikTok: vertical 9:16, fast-paced editing, trending audio-friendly, first 1-2 seconds must hook. Native, organic feel preferred over overly produced content.',
      'instagram': 'Optimized for Instagram Feed: visually striking composition, cohesive color palette, high-impact single frame or carousel-ready.',
      'instagram-reels': 'Optimized for Instagram Reels: vertical 9:16, dynamic transitions, text overlays, engaging within first 3 seconds. Trending format and music-synced cuts.',
      'youtube': 'Optimized for YouTube: widescreen 16:9, cinematic quality, professional audio, structured narrative with clear beginning-middle-end.',
      'youtube-shorts': 'Optimized for YouTube Shorts: vertical 9:16, quick-hit content under 60 seconds, immediate value delivery.',
      'facebook-ads': 'Optimized for Facebook Ads: conversion-focused, clear product benefits, strong CTA placement, works with and without sound.',
      'landing-page': 'Optimized for landing page hero: premium, persuasive, looping capability, ambient motion that enhances conversion without distraction.',
      'hero-section': 'Optimized for website hero section: seamless looping ambient visual, subtle motion, premium quality that enhances page experience.',
    };
    blocks.push({ label: '📲 PLATFORM OPTIMIZATION', text: platformMap[selections.platform[0]] || '' });
  }

  // ── ORIENTATION ──
  if (selections.orientation?.length) {
    const orientMap: Record<string, string> = {
      'vertical': 'Vertical format 9:16 aspect ratio.',
      'horizontal': 'Horizontal format 16:9 aspect ratio.',
      'square': 'Square format 1:1 aspect ratio.',
    };
    blocks.push({ label: '📐 ORIENTATION', text: orientMap[selections.orientation[0]] || '' });
  }

  // AI model reference
  const modelKey = isVideo ? 'videoModel' : 'imageModel';
  if (selections[modelKey]?.length) {
    const modelLabel = LAYERS.find(l => l.id === modelKey)?.options.find(o => o.id === selections[modelKey][0])?.label;
    if (modelLabel) {
      blocks.push({ label: '🤖 MODEL', text: `Optimized for ${modelLabel}. Professional quality, 4K resolution, highly detailed.` });
    }
  }

  // Build final structured prompt
  return blocks.map(b => `[${b.label}]\n${b.text}`).join('\n\n');
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
      description: 'Prompt gerado automaticamente pelo AI Creative Prompt Engine.',
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
            AI Creative Prompt Engine
          </h2>
          <p className="text-sm text-muted-foreground">Combine camadas para gerar prompts profissionais de marketing</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectionCount} camadas
            </Badge>
          )}
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
                                  onClick={() => toggleOption(layer.id, option.id)}
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
              Prompt Estruturado
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {selectionCount} {selectionCount === 1 ? 'camada selecionada' : 'camadas selecionadas'}
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-4">
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

              {generatedPrompt && (
                <div className="bg-background rounded-lg border p-3 mt-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1.5">Prompt Estruturado:</p>
                  <pre className="text-xs text-foreground leading-relaxed font-mono whitespace-pre-wrap">{generatedPrompt}</pre>
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
