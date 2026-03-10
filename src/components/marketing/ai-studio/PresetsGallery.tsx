import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, RotateCcw, Video, Image, Check, Wand2, BookOpen, Film, LayoutList, Copy, Shuffle, Library, FileText, Clapperboard, Layers, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { getStudioDefaults } from './AISettingsPanel';

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
    id: 'referenceBlocks',
    title: 'Blocos de Referência',
    emoji: '🧩',
    description: 'Selecione os blocos que deseja inserir no workflow (múltipla seleção)',
    multiple: true,
    options: [
      { id: 'productImageSelect', label: 'Produto', emoji: '📦' },
      { id: 'galleryInfluencer', label: 'Influencer', emoji: '👤' },
      { id: 'galleryLogo', label: 'Logo / Marca', emoji: '🏷️' },
      { id: 'galleryRoupa', label: 'Roupa / Vestuário', emoji: '👗' },
      { id: 'galleryPose', label: 'Ref. Pose', emoji: '🤸' },
      { id: 'galleryAmbiente', label: 'Ref. Ambiente', emoji: '🏔️' },
      { id: 'galleryEstilo', label: 'Ref. Estilo', emoji: '🎨' },
      { id: 'galleryTextura', label: 'Textura / Material', emoji: '🧱' },
      { id: 'galleryPaleta', label: 'Paleta de Cores', emoji: '🎨' },
      { id: 'imageInput', label: 'Imagem de Referência', emoji: '🖼️' },
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
      { id: 'bobinas-papel', label: 'Bobinas de Papel', emoji: '🧻' },
      { id: 'papeis-graficos', label: 'Papéis Gráficos', emoji: '📄' },
      { id: 'descartaveis', label: 'Produtos Descartáveis', emoji: '🥡' },
      { id: 'technology', label: 'Tecnologia', emoji: '💻' },
      { id: 'smartphones', label: 'Smartphones', emoji: '📱' },
      { id: 'gadgets', label: 'Gadgets', emoji: '🔌' },
      { id: 'beauty', label: 'Beleza', emoji: '💄' },
      { id: 'skincare', label: 'Skincare', emoji: '🧴' },
      { id: 'cosmetics', label: 'Cosméticos', emoji: '💅' },
      { id: 'perfumes', label: 'Perfumes', emoji: '🌸' },
      { id: 'fitness', label: 'Fitness', emoji: '💪' },
      { id: 'supplements', label: 'Suplementos', emoji: '💊' },
      { id: 'sportswear', label: 'Roupas Esportivas', emoji: '👟' },
      { id: 'fashion', label: 'Moda', emoji: '👔' },
      { id: 'accessories', label: 'Acessórios', emoji: '⌚' },
      { id: 'food', label: 'Alimentos', emoji: '🍔' },
      { id: 'beverages', label: 'Bebidas', emoji: '🥤' },
      { id: 'automotive', label: 'Automotivo', emoji: '🚗' },
      { id: 'home-gadgets', label: 'Casa Inteligente', emoji: '🏠' },
      { id: 'pets', label: 'Pets', emoji: '🐾' },
      { id: 'jewelry', label: 'Joias', emoji: '💍' },
      { id: 'furniture', label: 'Móveis', emoji: '🛋️' },
      { id: 'cleaning', label: 'Limpeza', emoji: '🧹' },
      { id: 'health', label: 'Saúde', emoji: '🏥' },
      { id: 'baby', label: 'Bebê / Infantil', emoji: '👶' },
      { id: 'education', label: 'Educação / Cursos', emoji: '📚' },
      { id: 'software', label: 'Software / SaaS', emoji: '🖥️' },
      { id: 'real-estate', label: 'Imóveis', emoji: '🏡' },
      { id: 'travel', label: 'Viagens / Turismo', emoji: '✈️' },
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

// ─── VIRAL HOOK LIBRARY ──────────────────────────────────────────────

interface ViralHook {
  category: string;
  emoji: string;
  hooks: string[];
}

const VIRAL_HOOKS: ViralHook[] = [
  {
    category: 'Pattern Interrupt',
    emoji: '⚡',
    hooks: [
      'Espera... ninguém te conta isso sobre esse produto.',
      'Pare tudo o que você está fazendo e veja isso.',
      'Isso não deveria funcionar assim... mas funciona.',
      'Eu apostei que não ia funcionar. Estava errado.',
      'Isso muda tudo que você sabe sobre esse assunto.',
    ],
  },
  {
    category: 'Question Hook',
    emoji: '❓',
    hooks: [
      'Você sabia que está usando isso do jeito errado?',
      'Por que ninguém fala sobre isso?',
      'Qual desses dois produtos é realmente melhor?',
      'Você pagaria R$10 por isso? E se eu te disser o preço real...',
      'O que acontece quando você combina esses dois produtos?',
    ],
  },
  {
    category: 'Problem Hook',
    emoji: '😰',
    hooks: [
      'Cansado de desperdiçar dinheiro com produtos que não funcionam?',
      'Se você tem esse problema, precisa ver isso.',
      'O maior erro que as pessoas cometem com isso.',
      'Eu sofri com isso por anos até descobrir a solução.',
      'Isso pode estar custando muito mais do que você imagina.',
    ],
  },
  {
    category: 'Shock Hook',
    emoji: '😱',
    hooks: [
      'Eu não acreditei quando vi o resultado.',
      'Isso vai te chocar — mas é 100% real.',
      'Veja o que aconteceu quando testei isso.',
      'O resultado superou todas as expectativas.',
      'Você nunca mais vai olhar para isso da mesma forma.',
    ],
  },
  {
    category: 'Curiosity Hook',
    emoji: '🤔',
    hooks: [
      'Assista até o final para ver o resultado.',
      'O segredo que as grandes marcas não querem que você saiba.',
      'Tem uma coisa sobre esse produto que muda tudo...',
      'Vou te mostrar algo que pouca gente conhece.',
      'Existe um truque simples que ninguém usa — até agora.',
    ],
  },
  {
    category: 'Bold Statement',
    emoji: '💪',
    hooks: [
      'Esse é o melhor produto que eu já testei. Ponto final.',
      'Isso mudou minha rotina completamente.',
      'Se você não está usando isso, está perdendo tempo.',
      'Sem dúvida, a melhor compra que fiz esse ano.',
      'Depois de testar 50 marcas, essa é a vencedora.',
    ],
  },
  {
    category: 'Visual Hook',
    emoji: '👀',
    hooks: [
      'Olha essa textura... incrível.',
      'Assista de perto — cada detalhe importa.',
      'Zoom no detalhe que faz toda a diferença.',
      'Presta atenção nessa transformação.',
      'Visual satisfatório que você vai querer assistir de novo.',
    ],
  },
  {
    category: 'Fast Demo',
    emoji: '⏩',
    hooks: [
      'Em 10 segundos você vai entender porque isso é tão bom.',
      'Demonstração rápida — resultado impressionante.',
      'Veja como funciona em tempo real.',
      'Teste prático: antes e depois em segundos.',
      'Rápido, simples e eficiente. Veja como.',
    ],
  },
];

// ─── MAPS ────────────────────────────────────────────────────────────

const creativeFormatMap: Record<string, string> = {
  'ugc-ad': 'A raw, authentic UGC-style ad filmed with a smartphone feel. The creator speaks directly to camera, showing the product naturally as if sharing with friends.',
  'product-hero': 'A stunning product hero shot with the product as the absolute centerpiece, elevated on a pedestal or floating, with dramatic lighting emphasizing every detail and texture.',
  'influencer-review': 'An influencer review where a charismatic creator naturally demonstrates and reviews the product, sharing genuine reactions and highlighting key features.',
  'unboxing': 'An exciting unboxing experience capturing the anticipation and reveal of the product, showing premium packaging details and the first-touch reaction.',
  'before-after': 'A dramatic before and after transformation showing the clear difference and impact of using the product, with split-screen or transition reveal.',
  'lifestyle-ad': 'A lifestyle advertisement showing the product seamlessly integrated into an aspirational daily routine, emphasizing how it enhances everyday life.',
  'cinematic-brand': 'A premium cinematic brand film with sweeping visuals, emotional narrative arc, and high-production value that elevates the brand identity.',
  'viral-clip': 'A highly shareable viral social media clip designed for maximum engagement, with unexpected elements, quick transitions, and thumb-stopping moments.',
  'testimonial': 'An authentic testimonial featuring a real customer sharing their genuine experience, with natural settings and honest emotional reactions.',
  'product-comparison': 'A side-by-side product comparison clearly demonstrating the advantages over competitors, with data-driven visuals and clear differentiators.',
};

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

const productMap: Record<string, string> = {
  'bobinas-papel': 'The product is a premium paper roll (bobina de papel), showcasing its quality, texture, and industrial-grade material.',
  'papeis-graficos': 'The product is a high-quality graphic paper, highlighting its smooth finish, printing precision, and professional results.',
  'descartaveis': 'The product is a disposable item (produto descartável), emphasizing convenience, hygiene, and practical everyday use.',
  'technology': 'The product is a cutting-edge technology device with sleek design and innovative features.',
  'smartphones': 'The product is a premium smartphone with stunning screen, modern design, and advanced capabilities.',
  'gadgets': 'The product is an innovative tech gadget that solves everyday problems with smart technology.',
  'beauty': 'The product is a beauty item with luxurious textures, rich colors, and premium packaging.',
  'skincare': 'The product is a skincare solution with visible results, emphasizing natural ingredients and glowing skin.',
  'cosmetics': 'The product is a cosmetic with rich pigments, elegant finishes, and professional-grade quality.',
  'perfumes': 'The product is a fragrance, evoking sensory luxury with elegant bottle design and aromatic appeal.',
  'fitness': 'The product is fitness equipment designed for peak performance and active lifestyles.',
  'supplements': 'The product is a health supplement with science-backed benefits and clean formulation.',
  'sportswear': 'The product is high-performance sportswear combining style, comfort, and athletic functionality.',
  'fashion': 'The product is a fashion item with designer-level styling and trend-forward aesthetics.',
  'accessories': 'The product is a premium fashion accessory that elevates any outfit with refined details.',
  'food': 'The product is a food item with appetizing textures, vibrant colors, and gourmet presentation.',
  'beverages': 'The product is a beverage with refreshing visual appeal, condensation details, and enticing pour shots.',
  'automotive': 'The product is an automotive item with precision engineering, sleek lines, and powerful presence.',
  'home-gadgets': 'The product is a smart home gadget for modern living, showcasing convenience and connectivity.',
  'pets': 'The product is designed for pets, showing adorable animal interaction and pet-friendly features.',
  'jewelry': 'The product is a fine jewelry piece with sparkling gemstones, metallic reflections, and luxurious detail.',
  'furniture': 'The product is a furniture piece showcasing craftsmanship, materials, and interior design integration.',
  'cleaning': 'The product is a cleaning solution emphasizing effectiveness, freshness, and ease of use.',
  'health': 'The product is a health-related item focusing on wellness, safety, and medical-grade quality.',
  'baby': 'The product is a baby/children\'s item emphasizing safety, tenderness, and family warmth.',
  'education': 'The product is an educational course or material showcasing knowledge, growth, and transformation.',
  'software': 'The product is a software/SaaS platform shown through sleek UI mockups and productivity benefits.',
  'real-estate': 'The product is a real estate property showcasing architecture, interiors, and aspirational living.',
  'travel': 'The product is a travel/tourism experience highlighting destinations, adventure, and memorable moments.',
};

const refBlockPromptMap: Record<string, string> = {
  'productImageSelect': 'The product reference image is provided as visual input for accurate representation.',
  'galleryInfluencer': 'A charismatic influencer presents the product with natural confidence. Reference photo provided.',
  'galleryLogo': 'The brand logo is included for visual identity integration.',
  'galleryRoupa': 'Clothing/outfit reference is provided for accurate wardrobe representation.',
  'galleryPose': 'A pose reference is provided for body positioning and composition.',
  'galleryAmbiente': 'An environment reference is provided for scene setting and ambiance.',
  'galleryEstilo': 'A style reference is provided for visual aesthetic direction.',
  'galleryTextura': 'A texture/material reference is provided for surface detail accuracy.',
  'galleryPaleta': 'A color palette reference is provided for cohesive color direction.',
  'imageInput': 'A custom reference image is provided as visual guidance.',
};

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

const lightMap: Record<string, string> = {
  'natural': 'Natural daylight illumination with soft window light or outdoor sunlight, creating authentic warmth and gentle shadows.',
  'studio': 'Professional multi-point studio lighting setup with key light, fill light, and rim light for polished, controlled illumination.',
  'dramatic': 'Dramatic chiaroscuro lighting with deep shadows and strong directional light creating bold contrast and mood.',
  'neon': 'Vibrant neon lighting with colorful reflections, glows, and RGB accents creating a modern, edgy atmosphere.',
  'soft-luxury': 'Soft, diffused luxury lighting with warm tones, delicate highlights, and gentle gradients for an elegant premium feel.',
  'high-contrast': 'High contrast lighting with bold shadows and bright highlights, creating strong graphic visual impact.',
  'golden-hour': 'Warm golden hour sunlight with long shadows, amber tones, and a magical, dreamy atmospheric quality.',
};

const energyMap: Record<string, string> = {
  'high-energy': 'Fast-paced dynamic action with quick cuts, rapid movements, and intense rhythm.',
  'calm': 'Slow, contemplative, and aesthetic rhythm. Gentle movements, long takes, and a serene atmosphere.',
  'luxury-mood': 'Sophisticated, slow, and premium-paced. Every movement is deliberate and elegant.',
  'dramatic-mood': 'Building dramatic tension with suspenseful pacing and a powerful climactic reveal.',
  'emotional': 'Emotionally charged pacing that connects deeply with the viewer.',
  'inspirational': 'Uplifting and motivational rhythm building from calm to powerful and empowering.',
};

const styleMap: Record<string, string> = {
  'cinematic': 'Cinematic film aesthetic with wide dynamic range, film grain, anamorphic lens, and professional color grading with teal-orange tones.',
  'realistic': 'Hyper-realistic photographic quality with natural skin tones, authentic textures, and true-to-life color accuracy.',
  'ugc': 'Authentic user-generated content aesthetic — raw, unpolished, smartphone-shot feel.',
  'luxury': 'Ultra-premium luxury visual language with rich metallic textures, deep blacks, golds, and refined composition.',
  'minimalist': 'Clean minimalist design with abundant white space, simple geometric composition.',
  'futuristic': 'Futuristic sci-fi aesthetic with holographic elements, sleek surfaces, and cyber-blue tones.',
  'commercial': 'Broadcast-quality commercial advertising polish with perfect color balance and crisp resolution.',
  'viral': 'Bold, attention-grabbing viral social media style with oversaturated colors and thumb-stopping visual impact.',
  'documentary': 'Documentary style with authentic, journalistic visual approach. Natural framing.',
  'high-fashion': 'High fashion editorial aesthetic with bold styling, dramatic poses, and magazine-quality finish.',
  'studio-photo': 'Professional studio photography with controlled lighting and seamless backgrounds.',
  'lifestyle': 'Warm lifestyle aesthetic with natural tones, aspirational settings.',
};

const platformMap: Record<string, string> = {
  'tiktok': 'Optimized for TikTok: vertical 9:16, fast-paced editing, first 1-2 seconds must hook.',
  'instagram': 'Optimized for Instagram Feed: visually striking composition, cohesive color palette.',
  'instagram-reels': 'Optimized for Instagram Reels: vertical 9:16, dynamic transitions, engaging within first 3 seconds.',
  'youtube': 'Optimized for YouTube: widescreen 16:9, cinematic quality, structured narrative.',
  'youtube-shorts': 'Optimized for YouTube Shorts: vertical 9:16, quick-hit content under 60 seconds.',
  'facebook-ads': 'Optimized for Facebook Ads: conversion-focused, clear product benefits, strong CTA.',
  'landing-page': 'Optimized for landing page hero: premium, persuasive, looping capability.',
  'hero-section': 'Optimized for website hero section: seamless looping ambient visual, subtle motion.',
};

const orientMap: Record<string, string> = {
  'vertical': 'Vertical format 9:16 aspect ratio.',
  'horizontal': 'Horizontal format 16:9 aspect ratio.',
  'square': 'Square format 1:1 aspect ratio.',
};

// ─── PROMPT GENERATOR ────────────────────────────────────────────────

function generatePrompt(selections: Record<string, string[]>, negativePrompt: string): string {
  const isVideo = selections.contentType?.includes('video');
  const blocks: { label: string; text: string }[] = [];

  // SCENE DESCRIPTION
  const sceneParts: string[] = [];
  const contentWord = isVideo ? 'video' : 'image';
  if (selections.creativeFormat?.length) {
    sceneParts.push(creativeFormatMap[selections.creativeFormat[0]] || `Create a professional ${contentWord}`);
  } else {
    sceneParts.push(`Create a professional marketing ${contentWord}`);
  }
  if (selections.campaignType?.length) sceneParts.push(campaignMap[selections.campaignType[0]] || '');
  if (selections.productCategory?.length) sceneParts.push(productMap[selections.productCategory[0]] || '');
  if (selections.referenceBlocks?.length) {
    selections.referenceBlocks.forEach(blockId => {
      if (refBlockPromptMap[blockId]) sceneParts.push(refBlockPromptMap[blockId]);
    });
  }
  if (selections.marketingGoal?.length) sceneParts.push(goalMap[selections.marketingGoal[0]] || '');
  blocks.push({ label: '🎬 DESCRIÇÃO DA CENA', text: sceneParts.filter(Boolean).join(' ') });

  // HOOK
  if (selections.hookStyle?.length) {
    blocks.push({ label: '🪝 GANCHO', text: hookMap[selections.hookStyle[0]] || '' });
  }

  // CAMERA SETUP
  if (isVideo && selections.cameraStyle?.length) {
    blocks.push({ label: '📹 CÂMERA', text: cameraMap[selections.cameraStyle[0]] || '' });
  }

  // LIGHTING
  if (selections.lighting?.length) {
    blocks.push({ label: '💡 ILUMINAÇÃO', text: lightMap[selections.lighting[0]] || '' });
  }

  // ACTION
  if (selections.energy?.length) {
    blocks.push({ label: '🎬 AÇÃO', text: energyMap[selections.energy[0]] || '' });
  }

  // VISUAL STYLE
  if (selections.visualStyle?.length) {
    blocks.push({ label: '🎨 ESTILO VISUAL', text: styleMap[selections.visualStyle[0]] || '' });
  }

  // PLATFORM OPTIMIZATION
  if (selections.platform?.length) {
    blocks.push({ label: '📲 OTIMIZAÇÃO DE PLATAFORMA', text: platformMap[selections.platform[0]] || '' });
  }

  // ORIENTATION
  if (selections.orientation?.length) {
    blocks.push({ label: '📐 ORIENTAÇÃO', text: orientMap[selections.orientation[0]] || '' });
  }

  // MODEL
  const modelKey = isVideo ? 'videoModel' : 'imageModel';
  if (selections[modelKey]?.length) {
    const modelLabel = LAYERS.find(l => l.id === modelKey)?.options.find(o => o.id === selections[modelKey][0])?.label;
    if (modelLabel) {
      blocks.push({ label: '🤖 MODELO', text: `Otimizado para ${modelLabel}. Qualidade profissional, 4K, altamente detalhado.` });
    }
  }

  // NEGATIVE PROMPT (from settings)
  if (negativePrompt) {
    blocks.push({ label: '🚫 PROMPT NEGATIVO', text: negativePrompt });
  }

  return blocks.map(b => `[${b.label}]\n${b.text}`).join('\n\n');
}

// ─── SCRIPT GENERATOR ────────────────────────────────────────────────

function generateScript(selections: Record<string, string[]>, selectedHookText?: string): string {
  const product = selections.productCategory?.[0];
  const productLabel = LAYERS.find(l => l.id === 'productCategory')?.options.find(o => o.id === product)?.label || 'o produto';
  const goal = selections.marketingGoal?.[0] || '';
  const platform = selections.platform?.[0] || '';

  const isShort = ['tiktok', 'instagram-reels', 'youtube-shorts'].includes(platform);

  const hookText = selectedHookText || 'Espera... você precisa ver isso antes de tomar qualquer decisão.';

  const ctaMap: Record<string, string> = {
    'direct-sales': 'Compre agora e aproveite a oferta por tempo limitado. Link na bio.',
    'lead-generation': 'Clique no link e descubra mais. Cadastre-se gratuitamente.',
    'product-awareness': 'Conheça mais sobre nosso produto. Link na descrição.',
    'brand-awareness': 'Siga-nos para mais conteúdo exclusivo.',
    'app-install': 'Baixe o app agora — link na bio.',
    'product-launch': 'Lançamento oficial! Garanta o seu agora.',
    'retargeting': 'Ainda pensando? Aproveite antes que acabe.',
    'social-proof': 'Milhares de clientes já aprovaram. Veja os depoimentos.',
    'educational': 'Quer aprender mais? Siga para mais dicas.',
    'viral-engagement': 'Marque alguém que precisa ver isso! Compartilhe.',
  };

  const sections = [
    { label: '🪝 GANCHO (Primeiros 3 segundos)', text: `"${hookText}"` },
    { label: '😰 PROBLEMA', text: `"Muitas pessoas enfrentam dificuldades e não encontram a solução certa para ${productLabel}. Gastam dinheiro, tempo e energia sem resultado."` },
    { label: '📦 INTRODUÇÃO DO PRODUTO', text: `"Apresentamos ${productLabel} — a solução que resolve isso de forma simples e eficiente."` },
    { label: '🔍 DEMONSTRAÇÃO', text: `"Mostrar ${productLabel} sendo utilizado em um cenário real. Destacar a facilidade de uso, a qualidade do material e os resultados visíveis."` },
    { label: '✨ BENEFÍCIOS', text: `"Destaque os principais benefícios: qualidade superior, praticidade, custo-benefício e resultados comprovados."` },
    { label: '📣 CHAMADA PARA AÇÃO', text: `"${ctaMap[goal] || 'Saiba mais — link na descrição.'}"` },
  ];

  if (isShort) {
    return sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n') +
      '\n\n⏱️ Formato: Roteiro curto (15-60 segundos) — ritmo rápido e direto.';
  }

  return sections.map(s => `[${s.label}]\n${s.text}`).join('\n\n') +
    '\n\n⏱️ Formato: Roteiro completo — com narrativa estruturada.';
}

// ─── SCENE GENERATOR ─────────────────────────────────────────────────

interface Scene {
  title: string;
  description: string;
  camera: string;
  lighting: string;
  action: string;
}

function generateScenes(selections: Record<string, string[]>): Scene[] {
  const product = LAYERS.find(l => l.id === 'productCategory')?.options.find(o => o.id === selections.productCategory?.[0])?.label || 'o produto';
  const cam = selections.cameraStyle?.[0] || 'cinematic-camera';
  const light = selections.lighting?.[0] || 'natural';

  return [
    {
      title: 'Cena 1 — Gancho Inicial',
      description: `Abertura impactante que captura a atenção do espectador nos primeiros 3 segundos. Um visual inesperado ou ação disruptiva relacionada a ${product}.`,
      camera: cameraMap[cam] || 'Câmera cinematográfica com movimentos suaves.',
      lighting: lightMap[light] || 'Iluminação natural.',
      action: 'Movimento rápido de abertura, zoom dramático ou revelação visual que prende a atenção imediatamente.',
    },
    {
      title: 'Cena 2 — Apresentação do Problema',
      description: `Mostrar a frustração ou dificuldade do dia a dia sem ${product}. O espectador se identifica com a situação.`,
      camera: 'Close-up nos detalhes da frustração, expressões faciais ou produto problemático.',
      lighting: 'Iluminação levemente sombria para transmitir desconforto.',
      action: 'Pessoa tentando realizar a tarefa sem sucesso, expressando frustração visível.',
    },
    {
      title: 'Cena 3 — Introdução do Produto',
      description: `Reveal dramático de ${product}. O produto entra em cena como a solução definitiva.`,
      camera: 'Câmera em slow motion focando no produto, com profundidade de campo rasa.',
      lighting: 'Iluminação premium com destaque suave no produto.',
      action: 'Produto sendo revelado com impacto visual — pode ser unboxing, colocação na mesa ou transição criativa.',
    },
    {
      title: 'Cena 4 — Demonstração do Produto',
      description: `${product} sendo utilizado em um cenário real, mostrando funcionalidades e facilidade de uso.`,
      camera: 'Ângulos múltiplos: close-up nos detalhes, plano médio mostrando uso, plano geral do contexto.',
      lighting: lightMap[light] || 'Iluminação natural e acolhedora.',
      action: 'Demonstração passo a passo do uso do produto, destacando texturas, qualidade e resultados.',
    },
    {
      title: 'Cena 5 — Resultado / Benefícios',
      description: `O resultado final após o uso de ${product}. A transformação é visível e impactante.`,
      camera: 'Plano aberto mostrando o resultado, seguido de close-up nos detalhes.',
      lighting: 'Iluminação brilhante e otimista, transmitindo satisfação.',
      action: 'Reação positiva do usuário, expressão de satisfação, resultado visual claro.',
    },
    {
      title: 'Cena 6 — Fechamento com CTA',
      description: `Encerramento com chamada para ação. Packshot do produto ou composição final com identidade de marca.`,
      camera: 'Câmera estável em plano fixo, enquadramento central do produto ou logo.',
      lighting: 'Iluminação limpa e profissional, fundo neutro ou com identidade visual.',
      action: 'Produto centralizado, texto de CTA aparece, logo da marca em destaque.',
    },
  ];
}

// ─── VARIATION GENERATOR ─────────────────────────────────────────────

function generateVariations(selections: Record<string, string[]>, negativePrompt: string): string[] {
  const base = generatePrompt(selections, negativePrompt);
  const variationModifiers = [
    { scene: 'ambiente urbano moderno com arquitetura contemporânea', camera: 'câmera com leve movimento de tracking lateral suave', mood: 'atmosfera clean e profissional' },
    { scene: 'cenário natural ao ar livre com vegetação exuberante', camera: 'câmera handheld orgânica com movimentos naturais', mood: 'atmosfera acolhedora e autêntica' },
    { scene: 'estúdio minimalista com fundo infinito branco', camera: 'câmera fixa com zoom lento e cinematográfico', mood: 'atmosfera premium e sofisticada' },
    { scene: 'ambiente industrial com texturas metálicas e concreto', camera: 'drone shot revelando o cenário de cima', mood: 'atmosfera ousada e impactante' },
    { scene: 'espaço criativo colorido com elementos visuais dinâmicos', camera: 'câmera POV imersiva seguindo a ação', mood: 'atmosfera energética e viral' },
  ];

  return variationModifiers.map((mod, i) => {
    return `═══════════════════════════════════════\n🎬 VARIAÇÃO ${i + 1}\n═══════════════════════════════════════\n\n` +
      base +
      `\n\n[🔀 MODIFICADORES DA VARIAÇÃO ${i + 1}]\nCenário: ${mod.scene}\nCâmera: ${mod.camera}\nAtmosfera: ${mod.mood}`;
  });
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
  imageModel?: string;
  duration?: number;
  videoSubcategory?: string;
  referenceBlocks?: string[];
  layerSelections?: Record<string, string[]>;
}

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
  estabelecimentoId?: string;
}

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose, estabelecimentoId = '' }) => {
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [expandedLayer, setExpandedLayer] = useState<string>('contentType');
  const [activeTab, setActiveTab] = useState<string>('prompt');
  const [selectedHookText, setSelectedHookText] = useState<string>('');
  const [variations, setVariations] = useState<string[]>([]);
  const [reviewPreset, setReviewPreset] = useState<Preset | null>(null);
  const [editablePrompt, setEditablePrompt] = useState<string>('');
  const { toast } = useToast();

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
        if (current.includes(optionId)) return { ...prev, [layerId]: current.filter(id => id !== optionId) };
        return { ...prev, [layerId]: [...current, optionId] };
      }
      if (current.includes(optionId)) return { ...prev, [layerId]: [] };
      return { ...prev, [layerId]: [optionId] };
    });
  };

  const selectionCount = Object.values(selections).filter(v => v.length > 0).length;

  const savedDefaults = useMemo(() => getStudioDefaults(estabelecimentoId), [estabelecimentoId]);
  const negativePromptText = useMemo(() => {
    const isVideo = selections.contentType?.includes('video');
    return isVideo ? savedDefaults.videoNegativePrompt : savedDefaults.imageNegativePrompt;
  }, [selections.contentType, savedDefaults]);

  const generatedPrompt = useMemo(() => {
    if (selectionCount < 2) return '';
    return generatePrompt(selections, negativePromptText);
  }, [selections, selectionCount, negativePromptText]);

  const generatedScript = useMemo(() => {
    if (selectionCount < 2) return '';
    return generateScript(selections, selectedHookText || undefined);
  }, [selections, selectionCount, selectedHookText]);

  const generatedScenes = useMemo(() => {
    if (selectionCount < 2) return [];
    return generateScenes(selections);
  }, [selections, selectionCount]);

  const handleGenerate = () => {
    const isVideo = selections.contentType?.includes('video');
    const modelKey = isVideo ? 'videoModel' : 'imageModel';
    const modelId = selections[modelKey]?.[0];

    const videoModelMap: Record<string, string> = {
      'veo3': 'google/veo-3.1', 'sora': 'openai/sora-2', 'kling': 'kling/v2.1',
      'gen4': 'runway/gen4', 'hailuo': 'hailuo/minimax-video-01', 'pika': 'pika/v2',
      'dream-machine': 'luma/dream-machine', 'seed-video': 'seed/video-01', 'svd': 'stability/svd',
    };

    const imageModelMap: Record<string, string> = {
      'midjourney': 'midjourney/v6', 'stable-diffusion': 'stability/sdxl', 'flux': 'flux/1.1-pro',
      'dall-e': 'openai/dall-e-3', 'leonardo': 'leonardo/phoenix',
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
      description: 'Prompt gerado pelo AI Creative Prompt Engine.',
      prompt: generatedPrompt,
      image: '',
      category: isVideo ? 'video' : 'image',
      toolType: isVideo ? 'videoGen' : 'imageGen',
      isVideo,
      videoModel: isVideo && modelId ? videoModelMap[modelId] : undefined,
      imageModel: !isVideo && modelId ? imageModelMap[modelId] : undefined,
      duration: isVideo ? 6 : undefined,
      referenceBlocks: selections.referenceBlocks || [],
      layerSelections: { ...selections },
    };

    // Apply directly to canvas (no review step)
    onSelectPreset(preset);
  };

  const handleConfirmPreset = () => {
    if (!reviewPreset) return;
    const finalPreset = { ...reviewPreset, prompt: editablePrompt };
    setReviewPreset(null);
    // Small delay to allow review modal to unmount before parent unmounts gallery
    setTimeout(() => {
      onSelectPreset(finalPreset);
    }, 50);
  };

  const handleReset = () => {
    setSelections({});
    setExpandedLayer('contentType');
    setSelectedHookText('');
    setVariations([]);
  };

  const handleGenerateVariations = useCallback(() => {
    if (selectionCount < 2) return;
    const v = generateVariations(selections, negativePromptText);
    setVariations(v);
    toast({ title: 'Variações Geradas', description: `${v.length} variações de prompt criadas com sucesso.` });
  }, [selections, selectionCount, toast]);

  const handleCopyText = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  }, [toast]);

  const handleSelectRandomHook = useCallback(() => {
    const all = VIRAL_HOOKS.flatMap(h => h.hooks);
    const random = all[Math.floor(Math.random() * all.length)];
    setSelectedHookText(random);
    toast({ title: 'Gancho Selecionado', description: random });
  }, [toast]);

  // ─── RENDER ──────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Creative Studio
          </h2>
          <p className="text-xs text-muted-foreground">Motor avançado de criação de criativos publicitários</p>
        </div>
        <div className="flex items-center gap-2">
          {selectionCount > 0 && (
            <Badge variant="secondary" className="text-xs">{selectionCount} camadas</Badge>
          )}
          {selectionCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — Layers */}
        <ScrollArea className="flex-1 lg:max-w-[45%]">
          <div className="p-3 space-y-1.5">
            {visibleLayers.map((layer, idx) => {
              const isExpanded = expandedLayer === layer.id;
              const selected = selections[layer.id] || [];
              const hasSelection = selected.length > 0;

              return (
                <motion.div
                  key={layer.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className={`rounded-lg border transition-all ${
                    isExpanded
                      ? 'border-primary/40 bg-primary/5 shadow-sm'
                      : hasSelection
                        ? 'border-primary/20 bg-primary/[0.02]'
                        : 'border-border/60 hover:border-border'
                  }`}
                >
                  <button
                    onClick={() => setExpandedLayer(isExpanded ? '' : layer.id)}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{layer.emoji}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs">{layer.title}</span>
                          {layer.required && !hasSelection && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0 border-destructive/40 text-destructive">
                              Obrigatório
                            </Badge>
                          )}
                        </div>
                        {!isExpanded && hasSelection && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {selected.map(s => {
                              const opt = layer.options.find(o => o.id === s);
                              return (
                                <Badge key={s} className="text-[9px] px-1 py-0 bg-primary/15 text-primary border-primary/20">
                                  {opt?.emoji} {opt?.label}
                                </Badge>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {hasSelection && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-primary-foreground" />
                        </div>
                      )}
                      <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
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
                        <div className="px-3 pb-3">
                          <p className="text-[10px] text-muted-foreground mb-2">{layer.description}</p>
                          <div className="flex flex-wrap gap-1.5">
                            {layer.options.map((option) => {
                              const isSelected = selected.includes(option.id);
                              return (
                                <button
                                  key={option.id}
                                  onClick={() => toggleOption(layer.id, option.id)}
                                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all border ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                      : 'bg-background text-foreground border-border/60 hover:border-primary/40 hover:bg-primary/5'
                                  }`}
                                >
                                  <span className="text-sm">{option.emoji}</span>
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

        {/* Right — Modules */}
        <div className="lg:w-[55%] border-t lg:border-t-0 lg:border-l bg-muted/20 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
            <div className="border-b px-3 pt-2">
              <TabsList className="h-8 w-full grid grid-cols-5 bg-muted/50">
                <TabsTrigger value="prompt" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <Sparkles className="h-3 w-3" /> Prompt
                </TabsTrigger>
                <TabsTrigger value="hooks" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <Library className="h-3 w-3" /> Ganchos
                </TabsTrigger>
                <TabsTrigger value="script" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <FileText className="h-3 w-3" /> Roteiro
                </TabsTrigger>
                <TabsTrigger value="scenes" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <Clapperboard className="h-3 w-3" /> Cenas
                </TabsTrigger>
                <TabsTrigger value="variations" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <Layers className="h-3 w-3" /> Variações
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Prompt */}
            <TabsContent value="prompt" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {selectionCount > 0 && (
                    <div className="space-y-1.5">
                      {visibleLayers.filter(l => (selections[l.id] || []).length > 0).map(layer => (
                        <div key={layer.id} className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">{layer.emoji}</span>
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">{layer.title}</span>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {(selections[layer.id] || []).map(s => {
                                const opt = layer.options.find(o => o.id === s);
                                return <Badge key={s} variant="secondary" className="text-[9px] px-1 py-0">{opt?.label}</Badge>;
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {generatedPrompt && (
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs text-muted-foreground font-medium">Prompt Estruturado:</p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleCopyText(generatedPrompt)}>
                          <Copy className="h-3 w-3" /> Copiar
                        </Button>
                      </div>
                      <pre className="text-[11px] text-foreground leading-relaxed font-mono whitespace-pre-wrap">{generatedPrompt}</pre>
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
            </TabsContent>

            {/* TAB: Viral Hooks */}
            <TabsContent value="hooks" className="flex-1 flex flex-col overflow-hidden mt-0">
              <div className="p-3 border-b flex items-center gap-2">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSelectRandomHook}>
                  <Shuffle className="h-3 w-3" /> Gancho Aleatório
                </Button>
                {selectedHookText && (
                  <Badge className="text-[9px] px-2 bg-primary/15 text-primary border-primary/20 max-w-[300px] truncate">
                    ✅ {selectedHookText}
                  </Badge>
                )}
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-4">
                  {VIRAL_HOOKS.map(category => (
                    <div key={category.category}>
                      <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                        <span>{category.emoji}</span> {category.category}
                      </h4>
                      <div className="space-y-1">
                        {category.hooks.map((hook, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedHookText(hook)}
                            className={`w-full text-left px-3 py-2 rounded-md text-xs border transition-all ${
                              selectedHookText === hook
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-border/40 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground'
                            }`}
                          >
                            "{hook}"
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Script */}
            <TabsContent value="script" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-4">
                  {selectionCount >= 2 ? (
                    <div className="bg-background rounded-lg border p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-primary" /> Roteiro Gerado
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleCopyText(generatedScript)}>
                          <Copy className="h-3 w-3" /> Copiar
                        </Button>
                      </div>
                      <pre className="text-[11px] text-foreground leading-relaxed font-mono whitespace-pre-wrap">{generatedScript}</pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione pelo menos 2 camadas para gerar o roteiro</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Scenes / Storyboard */}
            <TabsContent value="scenes" className="flex-1 flex flex-col overflow-hidden mt-0">
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {selectionCount >= 2 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold flex items-center gap-1.5">
                          <Clapperboard className="h-3.5 w-3.5 text-primary" /> Storyboard — {generatedScenes.length} Cenas
                        </p>
                        <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => {
                          const text = generatedScenes.map(s => `${s.title}\nDescrição: ${s.description}\nCâmera: ${s.camera}\nIluminação: ${s.lighting}\nAção: ${s.action}`).join('\n\n---\n\n');
                          handleCopyText(text);
                        }}>
                          <Copy className="h-3 w-3" /> Copiar Tudo
                        </Button>
                      </div>
                      {generatedScenes.map((scene, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="bg-background rounded-lg border p-3 space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                              {i + 1}
                            </div>
                            <h4 className="text-xs font-semibold">{scene.title}</h4>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{scene.description}</p>
                          <div className="grid grid-cols-1 gap-1.5 text-[10px]">
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px]">📹 Câmera:</span>
                              <span>{scene.camera}</span>
                            </div>
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px]">💡 Iluminação:</span>
                              <span>{scene.lighting}</span>
                            </div>
                            <div className="flex items-start gap-1.5 p-1.5 rounded bg-muted/50">
                              <span className="text-muted-foreground font-medium min-w-[70px]">🎬 Ação:</span>
                              <span>{scene.action}</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clapperboard className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione pelo menos 2 camadas para gerar o storyboard</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* TAB: Variations */}
            <TabsContent value="variations" className="flex-1 flex flex-col overflow-hidden mt-0">
              <div className="p-3 border-b">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1.5"
                  onClick={handleGenerateVariations}
                  disabled={selectionCount < 2}
                >
                  <RefreshCw className="h-3 w-3" /> Gerar 5 Variações
                </Button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-3 space-y-3">
                  {variations.length > 0 ? (
                    variations.map((v, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-background rounded-lg border p-3"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <Badge variant="outline" className="text-[9px]">Variação {i + 1}</Badge>
                          <Button variant="ghost" size="sm" className="h-5 text-[9px] gap-1" onClick={() => handleCopyText(v)}>
                            <Copy className="h-2.5 w-2.5" /> Copiar
                          </Button>
                        </div>
                        <pre className="text-[10px] text-foreground leading-relaxed font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">{v}</pre>
                      </motion.div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Clique em "Gerar 5 Variações" para criar prompts alternativos</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          <div className="p-3 border-t">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={selectionCount < 2 || !selections.contentType?.length}
              onClick={handleGenerate}
            >
              {selections.contentType?.includes('video') ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
              Aplicar no Canvas
            </Button>
          </div>
        </div>
      </div>

      {/* Review/Edit Modal */}
      <AnimatePresence>
        {reviewPreset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-background/98 backdrop-blur-sm flex flex-col"
          >
            <div className="flex items-center justify-between px-6 py-3 border-b">
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => setReviewPreset(null)} className="gap-1.5 text-muted-foreground">
                  <ChevronRight className="h-3.5 w-3.5 rotate-180" /> Voltar
                </Button>
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Revisar Preset
                  </h2>
                  <p className="text-xs text-muted-foreground">{reviewPreset.name}</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="max-w-3xl mx-auto p-6 space-y-5">
                {/* Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {visibleLayers.filter(l => (selections[l.id] || []).length > 0).map(layer => (
                    <div key={layer.id} className="bg-muted/50 rounded-lg border p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{layer.emoji}</span>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{layer.title}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(selections[layer.id] || []).map(s => {
                          const opt = layer.options.find(o => o.id === s);
                          return <Badge key={s} className="text-[9px] px-1.5 py-0.5 bg-primary/15 text-primary border-primary/20">{opt?.emoji} {opt?.label}</Badge>;
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Model Info */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">🤖</span>
                    <span className="text-xs font-semibold">Modelo de IA</span>
                  </div>
                  <p className="text-sm font-medium text-primary">
                    {reviewPreset.isVideo
                      ? reviewPreset.videoModel || 'Padrão (será definido no canvas)'
                      : reviewPreset.imageModel || 'Padrão (será definido no canvas)'}
                  </p>
                </div>

                {/* Reference Blocks */}
                {(reviewPreset.referenceBlocks || []).length > 0 && (
                  <div className="bg-muted/30 border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">🧩</span>
                      <span className="text-xs font-semibold">Blocos que serão criados no canvas</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {reviewPreset.referenceBlocks!.map(block => {
                        const opt = LAYERS.find(l => l.id === 'referenceBlocks')?.options.find(o => o.id === block);
                        return (
                          <Badge key={block} variant="outline" className="text-xs px-2 py-1 gap-1">
                            {opt?.emoji} {opt?.label || block}
                          </Badge>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      ⚠️ Lembre-se de selecionar uma imagem em cada bloco de referência antes de executar o workflow.
                    </p>
                  </div>
                )}

                {/* Editable Prompt */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground">Prompt (editável)</label>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={() => handleCopyText(editablePrompt)}>
                      <Copy className="h-3 w-3" /> Copiar
                    </Button>
                  </div>
                  <textarea
                    value={editablePrompt}
                    onChange={(e) => setEditablePrompt(e.target.value)}
                    className="w-full min-h-[300px] bg-background border rounded-lg p-3 text-[11px] font-mono leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </ScrollArea>

            <div className="p-4 border-t flex gap-3">
              <Button variant="outline" onClick={() => setReviewPreset(null)} className="flex-1 gap-2">
                <ChevronRight className="h-4 w-4 rotate-180" /> Voltar e Editar
              </Button>
              <Button onClick={handleConfirmPreset} className="flex-1 gap-2 bg-primary text-primary-foreground">
                {reviewPreset.isVideo ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
                Aplicar no Canvas
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PresetsGallery;
export type { Preset };
