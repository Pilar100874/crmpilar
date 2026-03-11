import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight, RotateCcw, Video, Image, Check, Wand2, Film, LayoutList, Copy, Shuffle, Library, FileText, Clapperboard, Layers, RefreshCw, BookOpen, Pencil, Save, Trash2 } from 'lucide-react';
import PromptPresets, { type PromptPreset } from './PromptPresets';
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
      { id: 'video', label: 'Geração de Vídeo', emoji: '🎥' },
      { id: 'image', label: 'Geração de Imagem', emoji: '🖼️' },
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
      { id: 'cinematic', label: 'Cinematográfico', emoji: '🎬' },
      { id: 'realistic', label: 'Realista', emoji: '📸' },
      { id: 'ugc', label: 'UGC', emoji: '📱' },
      { id: 'luxury', label: 'Luxo', emoji: '💎' },
      { id: 'minimalist', label: 'Minimalista', emoji: '◻️' },
      { id: 'futuristic', label: 'Futurista', emoji: '🚀' },
      { id: 'commercial', label: 'Publicidade Comercial', emoji: '📺' },
      { id: 'viral', label: 'Viral Redes Sociais', emoji: '🔥' },
      { id: 'documentary', label: 'Estilo Documentário', emoji: '🎥' },
      { id: 'high-fashion', label: 'Alta Moda', emoji: '👗' },
      { id: 'studio-photo', label: 'Fotografia de Estúdio', emoji: '📷' },
      { id: 'lifestyle', label: 'Estilo de Vida', emoji: '🌿' },
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
      { id: 'landing-page', label: 'Vídeo para Landing Page', emoji: '🌐' },
      { id: 'hero-section', label: 'Seção Hero do Site', emoji: '🖥️' },
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
      { id: 'showcase', label: 'Vitrine de Produto', emoji: '✨' },
      { id: 'demonstration', label: 'Demonstração de Produto', emoji: '🔍' },
      { id: 'problem-solution', label: 'Problema → Solução', emoji: '💡' },
      { id: 'before-after', label: 'Antes e Depois', emoji: '🔄' },
      { id: 'storytelling', label: 'Narrativa', emoji: '📖' },
      { id: 'influencer-review', label: 'Avaliação de Influencer', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'lifestyle-usage', label: 'Uso no Dia a Dia', emoji: '🌿' },
      { id: 'testimonial', label: 'Depoimento', emoji: '💬' },
      { id: 'comparison', label: 'Comparação', emoji: '⚖️' },
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
      { id: 'handheld', label: 'Câmera na Mão', emoji: '🤳' },
      { id: 'cinematic-camera', label: 'Câmera Cinematográfica', emoji: '🎬' },
      { id: 'drone', label: 'Tomada de Drone', emoji: '🚁' },
      { id: 'macro', label: 'Tomada Macro', emoji: '🔬' },
      { id: 'slowmo', label: 'Câmera Lenta', emoji: '🐌' },
      { id: 'tracking', label: 'Câmera de Acompanhamento', emoji: '🏃' },
      { id: 'pov', label: 'Câmera POV', emoji: '👁️' },
      { id: 'rotation', label: 'Rotação de Produto', emoji: '🔄' },
    ],
  },
  {
    id: 'lighting',
    title: 'Estilo de Iluminação',
    emoji: '💡',
    description: 'Tom e atmosfera da luz',
    options: [
      { id: 'natural', label: 'Luz Natural', emoji: '☀️' },
      { id: 'studio', label: 'Iluminação de Estúdio', emoji: '💡' },
      { id: 'dramatic', label: 'Iluminação Dramática', emoji: '🌑' },
      { id: 'neon', label: 'Iluminação Neon', emoji: '🟣' },
      { id: 'soft-luxury', label: 'Iluminação Suave de Luxo', emoji: '✨' },
      { id: 'high-contrast', label: 'Alto Contraste', emoji: '⬛' },
      { id: 'golden-hour', label: 'Hora Dourada', emoji: '🌅' },
    ],
  },
  {
    id: 'energy',
    title: 'Energia do Conteúdo',
    emoji: '⚡',
    description: 'Ritmo e sensação geral',
    options: [
      { id: 'high-energy', label: 'Alta Energia', emoji: '🔥' },
      { id: 'calm', label: 'Calmo / Estético', emoji: '🌿' },
      { id: 'luxury-mood', label: 'Atmosfera de Luxo', emoji: '💎' },
      { id: 'dramatic-mood', label: 'Dramático', emoji: '🎭' },
      { id: 'emotional', label: 'Emocional', emoji: '💖' },
      { id: 'inspirational', label: 'Inspiracional', emoji: '🌟' },
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
      { id: 'square', label: 'Quadrado (1:1)', emoji: '⬜' },
      { id: 'ig-feed', label: 'Instagram Feed (4:5)', emoji: '📸' },
      { id: 'ig-reels', label: 'Instagram Reels (9:16)', emoji: '🎞️' },
      { id: 'ig-stories', label: 'Instagram Stories (9:16)', emoji: '📖' },
      { id: 'ig-carousel', label: 'Instagram Carrossel (1:1)', emoji: '🔄' },
      { id: 'whatsapp-status', label: 'WhatsApp Status (9:16)', emoji: '💬' },
      { id: 'whatsapp-catalog', label: 'WhatsApp Catálogo (1:1)', emoji: '🛍️' },
      { id: 'tiktok', label: 'TikTok (9:16)', emoji: '🎵' },
      { id: 'facebook-feed', label: 'Facebook Feed (1.91:1)', emoji: '📘' },
      { id: 'facebook-stories', label: 'Facebook Stories (9:16)', emoji: '📗' },
      { id: 'facebook-cover', label: 'Facebook Capa (820x312)', emoji: '🖼️' },
      { id: 'youtube-thumb', label: 'YouTube Thumbnail (16:9)', emoji: '▶️' },
      { id: 'youtube-shorts', label: 'YouTube Shorts (9:16)', emoji: '⚡' },
      { id: 'linkedin-feed', label: 'LinkedIn Feed (1.91:1)', emoji: '💼' },
      { id: 'linkedin-stories', label: 'LinkedIn Stories (9:16)', emoji: '📊' },
      { id: 'pinterest', label: 'Pinterest (2:3)', emoji: '📌' },
      { id: 'twitter-post', label: 'X / Twitter Post (16:9)', emoji: '🐦' },
      { id: 'banner-web', label: 'Banner Web (728x90)', emoji: '🌐' },
    ],
  },
  {
    id: 'marketingGoal',
    title: 'Objetivo de Marketing',
    emoji: '🎯',
    description: 'Defina o objetivo do anúncio',
    options: [
      { id: 'product-awareness', label: 'Conhecimento do Produto', emoji: '👁️' },
      { id: 'direct-sales', label: 'Vendas Diretas', emoji: '💰' },
      { id: 'lead-generation', label: 'Geração de Leads', emoji: '📋' },
      { id: 'brand-awareness', label: 'Conhecimento de Marca', emoji: '🏢' },
      { id: 'app-install', label: 'Instalação de App', emoji: '📲' },
      { id: 'product-launch', label: 'Lançamento de Produto', emoji: '🚀' },
      { id: 'retargeting', label: 'Retargeting', emoji: '🔁' },
      { id: 'social-proof', label: 'Prova Social', emoji: '⭐' },
      { id: 'educational', label: 'Conteúdo Educativo', emoji: '📚' },
      { id: 'viral-engagement', label: 'Engajamento Viral', emoji: '🔥' },
    ],
  },
  {
    id: 'hookStyle',
    title: 'Estilo de Gancho',
    emoji: '🪝',
    description: 'Tipo de abertura para capturar atenção',
    options: [
      { id: 'pattern-interrupt', label: 'Quebra de Padrão', emoji: '⚡' },
      { id: 'question', label: 'Gancho de Pergunta', emoji: '❓' },
      { id: 'problem', label: 'Gancho de Problema', emoji: '😰' },
      { id: 'shock', label: 'Choque / Surpresa', emoji: '😱' },
      { id: 'visual-hook', label: 'Gancho Visual', emoji: '👀' },
      { id: 'fast-demo', label: 'Demo Rápida', emoji: '⏩' },
      { id: 'bold-statement', label: 'Declaração Impactante', emoji: '💪' },
      { id: 'curiosity', label: 'Gancho de Curiosidade', emoji: '🤔' },
    ],
  },
  {
    id: 'creativeFormat',
    title: 'Formato Criativo',
    emoji: '🎞️',
    description: 'Estrutura criativa do conteúdo',
    options: [
      { id: 'ugc-ad', label: 'Anúncio UGC', emoji: '📱' },
      { id: 'product-hero', label: 'Destaque do Produto', emoji: '✨' },
      { id: 'influencer-review', label: 'Avaliação de Influencer', emoji: '⭐' },
      { id: 'unboxing', label: 'Unboxing', emoji: '📦' },
      { id: 'before-after', label: 'Antes e Depois', emoji: '🔄' },
      { id: 'lifestyle-ad', label: 'Anúncio Estilo de Vida', emoji: '🌿' },
      { id: 'cinematic-brand', label: 'Filme de Marca Cinematográfico', emoji: '🎬' },
      { id: 'viral-clip', label: 'Clipe Viral para Redes', emoji: '🔥' },
      { id: 'testimonial', label: 'Depoimento', emoji: '💬' },
      { id: 'product-comparison', label: 'Comparação de Produtos', emoji: '⚖️' },
    ],
  },
];

// ─── VIRAL HOOK LIBRARY ──────────────────────────────────────────────

interface ViralHook {
  category: string;
  emoji: string;
  hooks: string[];
}

// Map hookStyle option IDs to their VIRAL_HOOKS category
const HOOK_STYLE_CATEGORY_MAP: Record<string, string> = {
  'pattern-interrupt': 'Quebra de Padrão',
  'question': 'Gancho de Pergunta',
  'problem': 'Gancho de Problema',
  'shock': 'Gancho de Choque',
  'curiosity': 'Gancho de Curiosidade',
  'bold-statement': 'Declaração Impactante',
  'visual-hook': 'Gancho Visual',
  'fast-demo': 'Demo Rápida',
};

const DEFAULT_VIRAL_HOOKS: ViralHook[] = [
  {
    category: 'Quebra de Padrão',
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
    category: 'Gancho de Pergunta',
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
    category: 'Gancho de Problema',
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
    category: 'Gancho de Choque',
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
    category: 'Gancho de Curiosidade',
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
    category: 'Declaração Impactante',
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
    category: 'Gancho Visual',
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
    category: 'Demo Rápida',
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
  'bobinas-papel': 'The product is a premium industrial paper roll (bobina de papel), designed for high-volume commercial and industrial printing applications, showcasing superior paper quality, consistent texture, and reliable material strength.',
  'papeis-graficos': 'The product is a professional-grade graphic paper engineered for precision printing, featuring an ultra-smooth finish optimized for vivid color reproduction and sharp detail in professional publishing and design work.',
  'descartaveis': 'The product is a single-use disposable item designed for convenience, hygiene, and practical everyday use, emphasizing its clean packaging, functional design, and effortless disposal after use.',
  'technology': 'The product is a cutting-edge technology device with sleek industrial design, premium build materials, and innovative features that represent the latest in consumer electronics.',
  'smartphones': 'The product is a premium smartphone featuring a stunning edge-to-edge display, precision-machined aluminum or glass body, and advanced camera system with professional-grade capabilities.',
  'gadgets': 'The product is an innovative consumer tech gadget engineered to solve everyday problems through smart technology, compact design, and intuitive user interaction.',
  'beauty': 'The product is a premium beauty item with luxurious textures, rich color formulations, and sophisticated packaging that communicates elegance and self-care.',
  'skincare': 'The product is a professional skincare solution formulated with clinically proven ingredients, designed to deliver visible results such as hydration, radiance, and skin renewal.',
  'cosmetics': 'The product is a high-performance cosmetic with rich pigment payoff, elegant finishes, and professional-grade quality suitable for both everyday and editorial use.',
  'perfumes': 'The product is a luxury fragrance housed in an artistically designed bottle, evoking sensory sophistication through its visual presentation and aromatic character.',
  'fitness': 'The product is professional-grade fitness equipment engineered for peak athletic performance, durability, and ergonomic comfort during intense training sessions.',
  'supplements': 'The product is a health and wellness supplement with scientifically backed formulation, clean ingredient sourcing, and transparent labeling for informed consumers.',
  'sportswear': 'The product is high-performance athletic sportswear combining moisture-wicking technology, ergonomic fit, and contemporary style for active lifestyles.',
  'fashion': 'The product is a fashion garment or ensemble with designer-level tailoring, premium fabrics, and trend-forward aesthetics that define contemporary style.',
  'accessories': 'The product is a premium fashion accessory crafted with fine materials and refined details, designed to elevate any outfit with sophistication.',
  'food': 'The product is a gourmet food item with appetizing visual presentation, vibrant natural colors, and premium culinary quality that invites tasting.',
  'beverages': 'The product is a premium beverage with refreshing visual appeal, realistic condensation on the container, and enticing liquid motion that communicates freshness.',
  'automotive': 'The product is an automotive item or vehicle featuring precision engineering, aerodynamic design lines, and a powerful visual presence that conveys performance.',
  'home-gadgets': 'The product is a smart home device designed for modern connected living, showcasing seamless integration, intuitive controls, and minimalist aesthetic.',
  'pets': 'The product is designed specifically for pet care and comfort, shown with authentic animal interaction that highlights pet-friendly materials and thoughtful design.',
  'jewelry': 'The product is a fine jewelry piece featuring sparkling gemstones, lustrous metallic surfaces, and intricate craftsmanship visible in every detail.',
  'furniture': 'The product is a designer furniture piece showcasing master craftsmanship, premium materials, and harmonious integration within contemporary interior spaces.',
  'cleaning': 'The product is a cleaning solution or tool engineered for maximum effectiveness, designed to deliver visible cleanliness with ease and efficiency.',
  'health': 'The product is a health and medical-grade item focused on wellness, safety compliance, and clinical-quality standards for consumer confidence.',
  'baby': 'The product is a baby or children\'s item designed with the highest safety standards, soft materials, and gentle aesthetics that communicate care and protection.',
  'education': 'The product is an educational program, course, or learning material that showcases knowledge transformation, personal growth, and measurable skill development.',
  'software': 'The product is a software or SaaS platform presented through polished UI mockups, demonstrating intuitive workflows, productivity gains, and modern digital design.',
  'real-estate': 'The product is a real estate property showcasing architectural excellence, premium interior finishes, and an aspirational lifestyle setting.',
  'travel': 'The product is a travel or tourism experience highlighting breathtaking destinations, immersive adventure, and unforgettable cultural moments.',
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
  'cinematic': 'Cinematic film aesthetic with wide dynamic range, subtle film grain, anamorphic lens characteristics, and professional color grading with teal-orange tones.',
  'realistic': 'Hyper-realistic photographic quality with natural skin tones, authentic textures, and true-to-life color accuracy. Shot on a professional DSLR or mirrorless camera.',
  'ugc': 'Authentic user-generated content aesthetic filmed on a smartphone. Raw, unpolished, natural feel as if a real person created this content spontaneously. No professional production value — the authenticity IS the appeal.',
  'luxury': 'Ultra-premium luxury visual language with rich metallic textures, deep blacks, golds, and refined composition that communicates exclusivity.',
  'minimalist': 'Clean minimalist design with abundant white space, simple geometric composition, and restrained color palette.',
  'futuristic': 'Futuristic sci-fi aesthetic with holographic elements, sleek reflective surfaces, and cool cyber-blue tones.',
  'commercial': 'Broadcast-quality commercial advertising with perfect color balance, crisp resolution, and polished production value.',
  'viral': 'Bold, attention-grabbing viral social media style with oversaturated colors, fast energy, and thumb-stopping visual impact. Smartphone-shot feel.',
  'documentary': 'Documentary style with authentic, journalistic visual approach. Natural framing, observational camera work, and truthful representation.',
  'high-fashion': 'High fashion editorial aesthetic with bold artistic styling, dramatic poses, avant-garde composition, and magazine-quality finish.',
  'studio-photo': 'Professional studio photography with controlled multi-point lighting, seamless backgrounds, and precise focus for maximum product clarity.',
  'lifestyle': 'Warm lifestyle aesthetic with natural golden tones, aspirational everyday settings, and an inviting, relatable atmosphere.',
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
  'vertical': 'Vertical format 9:16 aspect ratio (1080x1920).',
  'horizontal': 'Horizontal format 16:9 aspect ratio (1920x1080).',
  'square': 'Square format 1:1 aspect ratio (1080x1080).',
  'ig-feed': 'Instagram Feed format 4:5 aspect ratio (1080x1350). Optimized for maximum feed visibility.',
  'ig-reels': 'Instagram Reels format 9:16 vertical (1080x1920). Full-screen immersive vertical video.',
  'ig-stories': 'Instagram Stories format 9:16 vertical (1080x1920). Ephemeral full-screen content.',
  'ig-carousel': 'Instagram Carousel format 1:1 square (1080x1080). Multi-slide swipeable content.',
  'whatsapp-status': 'WhatsApp Status format 9:16 vertical (1080x1920). Full-screen status update.',
  'whatsapp-catalog': 'WhatsApp Catalog format 1:1 square (1080x1080). Product catalog thumbnail.',
  'tiktok': 'TikTok format 9:16 vertical (1080x1920). Fast-paced, attention-grabbing vertical content.',
  'facebook-feed': 'Facebook Feed format 1.91:1 landscape (1200x628). Optimized for news feed engagement.',
  'facebook-stories': 'Facebook Stories format 9:16 vertical (1080x1920). Full-screen story content.',
  'facebook-cover': 'Facebook Cover Photo format (820x312). Banner-style header image.',
  'youtube-thumb': 'YouTube Thumbnail format 16:9 (1280x720). High-impact clickable thumbnail.',
  'youtube-shorts': 'YouTube Shorts format 9:16 vertical (1080x1920). Short-form vertical video.',
  'linkedin-feed': 'LinkedIn Feed format 1.91:1 landscape (1200x628). Professional content optimized for engagement.',
  'linkedin-stories': 'LinkedIn Stories format 9:16 vertical (1080x1920). Professional story content.',
  'pinterest': 'Pinterest Pin format 2:3 vertical (1000x1500). Tall format optimized for Pinterest feed.',
  'twitter-post': 'X/Twitter Post format 16:9 (1200x675). Optimized for timeline visibility.',
  'banner-web': 'Web Banner format (728x90). Standard leaderboard display ad.',
};

// ─── STYLE-ADAPTIVE OVERRIDES ────────────────────────────────────────

interface StyleOverrides {
  camera: string;
  lighting: string;
  styleTone: string;
}

function getStyleOverrides(visualStyle: string | undefined, userCamera: string | undefined, userLighting: string | undefined): StyleOverrides {
  // UGC style overrides — camera and lighting must match the authentic feel
  if (visualStyle === 'ugc' || visualStyle === 'viral') {
    return {
      camera: 'Handheld smartphone camera with natural handheld motion and slightly imperfect framing typical of real user-generated content. No gimbal, no dolly, no cinematic movements.',
      lighting: 'Natural ambient lighting similar to indoor daylight or casual everyday environments. No studio setups, no dramatic shadows.',
      styleTone: 'Authentic, casual, relatable, unpolished smartphone aesthetic. The content should feel like a real person filmed it spontaneously.',
    };
  }

  // Documentary style — authentic but more intentional than UGC
  if (visualStyle === 'documentary') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Steady handheld camera with intentional, observational framing. Natural movements that follow the subject without drawing attention to the camera work.',
      lighting: userLighting ? lightMap[userLighting] : 'Available natural light with minimal intervention. Authentic environmental lighting that preserves the reality of the scene.',
      styleTone: 'Journalistic, authentic, observational. The content should feel truthful and unscripted.',
    };
  }

  // Lifestyle — warm and natural but polished
  if (visualStyle === 'lifestyle') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Smooth handheld or light gimbal camera with gentle, organic movement. Intimate mid-range framing that feels natural and inviting.',
      lighting: userLighting ? lightMap[userLighting] : 'Warm natural light with soft golden tones. Window light or outdoor golden hour feel that creates an aspirational, cozy atmosphere.',
      styleTone: 'Warm, aspirational, natural. The content should feel like a beautiful moment from everyday life.',
    };
  }

  // Cinematic / Luxury / High-Fashion — full production value
  if (visualStyle === 'cinematic' || visualStyle === 'luxury' || visualStyle === 'high-fashion') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Professional cinema camera on gimbal or dolly with smooth, precise cinematic movements. Professional composition with shallow depth of field and carefully planned framing.',
      lighting: userLighting ? lightMap[userLighting] : 'Dramatic cinematic lighting with controlled studio setup. Multi-point lighting with intentional shadows, rim lights, and atmospheric depth.',
      styleTone: visualStyle === 'luxury'
        ? 'Ultra-premium, sophisticated, aspirational. Every frame should communicate exclusivity and refined taste.'
        : visualStyle === 'high-fashion'
          ? 'Editorial high-fashion aesthetic with bold artistic choices, dramatic poses, and magazine-quality visual impact.'
          : 'Premium film-like advertising aesthetic with wide dynamic range, professional color grading, and cinematic depth.',
    };
  }

  // Commercial — broadcast quality
  if (visualStyle === 'commercial') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Professional camera with smooth controlled movements. Broadcast-quality framing with precise focus pulls and clean composition.',
      lighting: userLighting ? lightMap[userLighting] : 'Professional studio lighting with balanced exposure, clean whites, and perfectly controlled shadows for broadcast-ready content.',
      styleTone: 'Polished, professional, broadcast-ready commercial quality with perfect color balance and crisp resolution.',
    };
  }

  // Studio Photography — controlled environment
  if (visualStyle === 'studio-photo') {
    return {
      camera: userCamera ? cameraMap[userCamera] : 'Fixed or controlled camera on tripod with precise framing. Sharp focus with controlled depth of field on seamless studio background.',
      lighting: userLighting ? lightMap[userLighting] : 'Professional multi-point studio lighting with key light, fill light, and rim light for polished, controlled illumination.',
      styleTone: 'Clean, controlled, professional studio environment with seamless backgrounds and perfect product isolation.',
    };
  }

  // Default: use user selections or sensible defaults
  return {
    camera: userCamera ? cameraMap[userCamera] : 'Professional camera with smooth, controlled movement and intentional framing.',
    lighting: userLighting ? lightMap[userLighting] : 'Professional lighting setup optimized for the scene and subject.',
    styleTone: '',
  };
}

// ─── PROMPT GENERATOR ────────────────────────────────────────────────

function generatePrompt(selections: Record<string, string[]>, negativePrompt: string): string {
  const isVideo = selections.contentType?.includes('video');
  const visualStyle = selections.visualStyle?.[0];
  const userCamera = selections.cameraStyle?.[0];
  const userLighting = selections.lighting?.[0];
  const overrides = getStyleOverrides(visualStyle, userCamera, userLighting);

  const blocks: { label: string; text: string }[] = [];

  // 1. HOOK (first block — attention in first seconds)
  if (selections.hookStyle?.length) {
    blocks.push({ label: '🪝 HOOK', text: hookMap[selections.hookStyle[0]] || 'Strong attention-grabbing moment in the first seconds of the video.' });
  } else if (isVideo) {
    // Auto-inject a default hook for video content
    blocks.push({ label: '🪝 HOOK', text: 'Strong attention-grabbing moment in the first seconds of the video that immediately captures the viewer\'s interest and stops scrolling.' });
  }

  // 2. SCENE DESCRIPTION
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
  blocks.push({ label: '🎬 SCENE DESCRIPTION', text: sceneParts.filter(Boolean).join(' ') });

  // 3. CAMERA (adaptive based on visual style)
  if (isVideo) {
    blocks.push({ label: '📹 CAMERA', text: overrides.camera });
  }

  // 4. LIGHTING (adaptive based on visual style)
  blocks.push({ label: '💡 LIGHTING', text: overrides.lighting });

  // 5. ACTION
  if (selections.energy?.length) {
    blocks.push({ label: '🎬 ACTION', text: energyMap[selections.energy[0]] || '' });
  }

  // 6. VISUAL STYLE (with adaptive tone)
  if (visualStyle) {
    const baseStyle = styleMap[visualStyle] || '';
    const tone = overrides.styleTone;
    const combined = tone ? `${baseStyle} ${tone}` : baseStyle;
    blocks.push({ label: '🎨 VISUAL STYLE', text: combined });
  }

  // 7. ORIENTATION
  if (selections.orientation?.length) {
    blocks.push({ label: '📐 ORIENTATION', text: orientMap[selections.orientation[0]] || '' });
  }

  // 8. MODEL OPTIMIZATION
  const modelKey = isVideo ? 'videoModel' : 'imageModel';
  if (selections[modelKey]?.length) {
    const modelLabel = LAYERS.find(l => l.id === modelKey)?.options.find(o => o.id === selections[modelKey][0])?.label;
    if (modelLabel) {
      blocks.push({ label: '🤖 MODEL OPTIMIZATION', text: `Optimized for ${modelLabel}. Professional quality, 4K resolution, highly detailed, photorealistic rendering.` });
    }
  }

  // 9. PLATFORM OPTIMIZATION
  if (selections.platform?.length) {
    blocks.push({ label: '📲 PLATFORM OPTIMIZATION', text: platformMap[selections.platform[0]] || '' });
  }

  // 10. NEGATIVE PROMPT (from settings + mandatory rules)
  const mandatoryNegative = [
    'Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks.',
    'Use only the elements provided through the system input blocks.',
    'Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided.',
    'If something is not provided through the system blocks, it must not appear in the generated content.',
    'The generated content must not contain erotic, sexual, explicit or suggestive content.',
  ].join('\n');

  const finalNegative = negativePrompt
    ? `${negativePrompt}\n\n${mandatoryNegative}`
    : mandatoryNegative;
  blocks.push({ label: '🚫 NEGATIVE PROMPT', text: finalNegative });

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
  const visualStyle = selections.visualStyle?.[0];
  const userCamera = selections.cameraStyle?.[0];
  const userLighting = selections.lighting?.[0];
  const overrides = getStyleOverrides(visualStyle, userCamera, userLighting);

  const isUgc = visualStyle === 'ugc' || visualStyle === 'viral';

  return [
    {
      title: 'Cena 1 — Gancho Inicial',
      description: isUgc
        ? `Abertura casual e autêntica que captura a atenção. Uma pessoa real olha para a câmera do smartphone e começa a falar sobre ${product} como se estivesse compartilhando com um amigo.`
        : `Abertura impactante que captura a atenção do espectador nos primeiros 3 segundos. Um visual inesperado ou ação disruptiva relacionada a ${product}.`,
      camera: isUgc ? 'Câmera frontal de smartphone, enquadramento selfie ligeiramente imperfeito.' : overrides.camera,
      lighting: overrides.lighting,
      action: isUgc
        ? 'Pessoa olha para a câmera com expressão de surpresa ou entusiasmo, começa a falar naturalmente.'
        : 'Movimento rápido de abertura, zoom dramático ou revelação visual que prende a atenção imediatamente.',
    },
    {
      title: 'Cena 2 — Apresentação do Problema',
      description: `Mostrar a frustração ou dificuldade do dia a dia sem ${product}. O espectador se identifica com a situação.`,
      camera: isUgc ? 'Câmera de smartphone mostrando a situação de perto, com movimentos naturais de mão.' : 'Close-up nos detalhes da frustração, expressões faciais ou produto problemático.',
      lighting: isUgc ? 'Iluminação ambiente natural do local onde está.' : 'Iluminação levemente sombria para transmitir desconforto.',
      action: 'Pessoa tentando realizar a tarefa sem sucesso, expressando frustração visível.',
    },
    {
      title: 'Cena 3 — Introdução do Produto',
      description: isUgc
        ? `A pessoa mostra ${product} casualmente, tirando da bolsa, mesa ou prateleira. Apresentação natural e não ensaiada.`
        : `Reveal dramático de ${product}. O produto entra em cena como a solução definitiva.`,
      camera: isUgc ? 'Câmera de smartphone mostrando o produto na mão, enquadramento casual.' : 'Câmera em slow motion focando no produto, com profundidade de campo rasa.',
      lighting: isUgc ? overrides.lighting : 'Iluminação premium com destaque suave no produto.',
      action: isUgc
        ? 'Pessoa segura o produto e mostra para a câmera, explicando o que é.'
        : 'Produto sendo revelado com impacto visual — pode ser unboxing, colocação na mesa ou transição criativa.',
    },
    {
      title: 'Cena 4 — Demonstração do Produto',
      description: `${product} sendo utilizado em um cenário real, mostrando funcionalidades e facilidade de uso.`,
      camera: isUgc ? 'Câmera alternando entre selfie e câmera traseira do smartphone para mostrar detalhes.' : 'Ângulos múltiplos: close-up nos detalhes, plano médio mostrando uso, plano geral do contexto.',
      lighting: overrides.lighting,
      action: 'Demonstração passo a passo do uso do produto, destacando texturas, qualidade e resultados.',
    },
    {
      title: 'Cena 5 — Resultado / Benefícios',
      description: `O resultado final após o uso de ${product}. A transformação é visível e impactante.`,
      camera: isUgc ? 'Câmera de smartphone mostrando o resultado final, reação genuína.' : 'Plano aberto mostrando o resultado, seguido de close-up nos detalhes.',
      lighting: isUgc ? overrides.lighting : 'Iluminação brilhante e otimista, transmitindo satisfação.',
      action: 'Reação positiva do usuário, expressão de satisfação, resultado visual claro.',
    },
    {
      title: 'Cena 6 — Fechamento com CTA',
      description: isUgc
        ? `Pessoa olha para a câmera e faz a recomendação final de ${product}, incentivando o espectador a experimentar.`
        : `Encerramento com chamada para ação. Packshot do produto ou composição final com identidade de marca.`,
      camera: isUgc ? 'Câmera frontal de smartphone, enquadramento selfie natural.' : 'Câmera estável em plano fixo, enquadramento central do produto ou logo.',
      lighting: isUgc ? overrides.lighting : 'Iluminação limpa e profissional, fundo neutro ou com identidade visual.',
      action: isUgc
        ? 'Pessoa fala diretamente para a câmera com entusiasmo genuíno, faz CTA natural.'
        : 'Produto centralizado, texto de CTA aparece, logo da marca em destaque.',
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
  variationPrompts?: string[];
}

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
  estabelecimentoId?: string;
  initialSelections?: Record<string, string[]>;
}

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose, estabelecimentoId = '', initialSelections }) => {
  const [mode, setMode] = useState<'wizard' | 'prompts'>(initialSelections ? 'wizard' : 'wizard');
  const [selections, setSelections] = useState<Record<string, string[]>>(initialSelections || {});
  const [expandedLayer, setExpandedLayer] = useState<string>('contentType');
  const [activeTab, setActiveTab] = useState<string>('prompt');
  const [selectedHookText, setSelectedHookText] = useState<string>('');
  const [variations, setVariations] = useState<string[]>([]);
  const [viralHooks, setViralHooks] = useState<ViralHook[]>(DEFAULT_VIRAL_HOOKS);
  const [editingHook, setEditingHook] = useState<{ catIdx: number; hookIdx: number } | null>(null);
  const [editingHookText, setEditingHookText] = useState('');
  const { toast } = useToast();

  

  // If hookStyle is deselected while on hooks tab, redirect
  const hasHookStyleSelected = (selections.hookStyle || []).length > 0;
  useEffect(() => {
    if (activeTab === 'hooks' && !hasHookStyleSelected) {
      setActiveTab('prompt');
    }
  }, [hasHookStyleSelected, activeTab]);

  // Filter hooks based on selected hookStyle
  const filteredHooks = useMemo(() => {
    const selectedStyles = selections.hookStyle || [];
    if (selectedStyles.length === 0) return [];
    const allowedCategories = selectedStyles.map(s => HOOK_STYLE_CATEGORY_MAP[s]).filter(Boolean);
    return viralHooks.filter(h => allowedCategories.includes(h.category));
  }, [selections.hookStyle, viralHooks]);

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
        if (optionId !== 'video' && (activeTab === 'script' || activeTab === 'scenes')) {
          setActiveTab('prompt');
        }
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

  // Auto-update variations when selections change and variations tab is active
  useEffect(() => {
    if (activeTab === 'variations' && variations.length > 0 && selectionCount >= 2) {
      const v = generateVariations(selections, negativePromptText);
      setVariations(v);
    }
  }, [selections, negativePromptText]);

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

    // If on variations tab and we have variations, include them
    const isVariationsTab = activeTab === 'variations' && variations.length > 0;

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
      variationPrompts: isVariationsTab ? variations : undefined,
    };

    // Apply directly to canvas (no review step)
    onSelectPreset(preset);
  };

  const handlePromptPresetSelect = useCallback((promptPreset: PromptPreset) => {
    const isVideo = promptPreset.mediaType === 'video';
    const referenceBlocks = promptPreset.referenceBlocks || (
      promptPreset.category === 'influencer'
        ? ['productImageSelect', 'galleryInfluencer']
        : ['productImageSelect']
    );

    const preset: Preset = {
      id: `prompt-${promptPreset.id}-${Date.now()}`,
      name: promptPreset.name,
      description: `Prompt pronto: ${promptPreset.name}`,
      prompt: promptPreset.prompt,
      image: promptPreset.image,
      category: isVideo ? 'video' : 'image',
      toolType: isVideo ? 'videoGen' : 'imageGen',
      isVideo,
      referenceBlocks,
      layerSelections: {},
    };
    onSelectPreset(preset);
  }, [onSelectPreset]);

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
    const all = filteredHooks.flatMap(h => h.hooks);
    if (all.length === 0) return;
    const random = all[Math.floor(Math.random() * all.length)];
    setSelectedHookText(random);
    toast({ title: 'Gancho Selecionado', description: random });
  }, [filteredHooks, toast]);

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
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              AI Creative Studio
1061:             </h2>
1062:             <p className="text-xs text-muted-foreground">Motor avançado de criação de criativos publicitários</p>
          </div>
          {/* Mode Toggle */}
          <div className="flex items-center bg-muted rounded-lg p-0.5">
            <button
              onClick={() => setMode('wizard')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                mode === 'wizard' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Wand2 className="h-3.5 w-3.5" /> Assistente
            </button>
            <button
              onClick={() => setMode('prompts')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                mode === 'prompts' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" /> Prompts Prontos
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'wizard' && selectionCount > 0 && (
            <Badge variant="secondary" className="text-xs">{selectionCount} camadas</Badge>
          )}
          {mode === 'wizard' && selectionCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1.5 text-muted-foreground">
              <RotateCcw className="h-3.5 w-3.5" /> Limpar
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {mode === 'prompts' ? (
        <PromptPresets onSelect={handlePromptPresetSelect} estabelecimentoId={estabelecimentoId} />
      ) : (
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
          <Tabs value={activeTab} onValueChange={(val) => {
              setActiveTab(val);
              if (val === 'variations' && variations.length === 0 && selectionCount >= 2) {
                const v = generateVariations(selections, negativePromptText);
                setVariations(v);
                toast({ title: 'Variações Geradas', description: `${v.length} variações de prompt criadas com sucesso.` });
              }
            }} className="flex flex-col flex-1 overflow-hidden">
            <div className="border-b px-3 pt-2">
              <TabsList className={`h-8 w-full grid bg-muted/50 ${
                (() => {
                  const isVideo = selections.contentType?.includes('video');
                  const hasHook = hasHookStyleSelected;
                  if (isVideo && hasHook) return 'grid-cols-5';
                  if (isVideo || hasHook) return 'grid-cols-4';
                  return 'grid-cols-2';
                })()
              }`}>
                <TabsTrigger value="prompt" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                  <Sparkles className="h-3 w-3" /> Prompt
                </TabsTrigger>
                {hasHookStyleSelected && (
                  <TabsTrigger value="hooks" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                    <Library className="h-3 w-3" /> Ganchos
                  </TabsTrigger>
                )}
                {selections.contentType?.includes('video') && (
                  <TabsTrigger value="script" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                    <FileText className="h-3 w-3" /> Roteiro
                  </TabsTrigger>
                )}
                {selections.contentType?.includes('video') && (
                  <TabsTrigger value="scenes" className="text-[10px] gap-1 px-1 data-[state=active]:text-primary">
                    <Clapperboard className="h-3 w-3" /> Cenas
                  </TabsTrigger>
                )}
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
                  {filteredHooks.map((category) => {
                    const catIdx = viralHooks.findIndex(h => h.category === category.category);
                    return (
                      <div key={category.category}>
                        <h4 className="text-xs font-semibold flex items-center gap-1.5 mb-2">
                          <span>{category.emoji}</span> {category.category}
                        </h4>
                        <div className="space-y-1">
                          {category.hooks.map((hook, i) => {
                            const isEditing = editingHook?.catIdx === catIdx && editingHook?.hookIdx === i;
                            return (
                              <div key={i} className="flex items-center gap-1">
                                {isEditing ? (
                                  <div className="flex-1 flex items-center gap-1">
                                    <input
                                      className="flex-1 px-3 py-2 rounded-md text-xs border border-primary bg-background focus:outline-none"
                                      value={editingHookText}
                                      onChange={(e) => setEditingHookText(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          setViralHooks(prev => {
                                            const updated = [...prev];
                                            updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks] };
                                            updated[catIdx].hooks[i] = editingHookText;
                                            return updated;
                                          });
                                          setEditingHook(null);
                                          toast({ title: 'Gancho atualizado!' });
                                        }
                                        if (e.key === 'Escape') setEditingHook(null);
                                      }}
                                      autoFocus
                                    />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0"
                                      onClick={() => {
                                        setViralHooks(prev => {
                                          const updated = [...prev];
                                          updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks] };
                                          updated[catIdx].hooks[i] = editingHookText;
                                          return updated;
                                        });
                                        setEditingHook(null);
                                        toast({ title: 'Gancho atualizado!' });
                                      }}
                                    >
                                      <Save className="h-3 w-3 text-primary" />
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => setSelectedHookText(hook)}
                                      className={`flex-1 text-left px-3 py-2 rounded-md text-xs border transition-all ${
                                        selectedHookText === hook
                                          ? 'border-primary bg-primary/10 text-primary font-medium'
                                          : 'border-border/40 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground'
                                      }`}
                                    >
                                      "{hook}"
                                    </button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-40 hover:opacity-100"
                                      onClick={() => {
                                        setEditingHook({ catIdx, hookIdx: i });
                                        setEditingHookText(hook);
                                      }}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 opacity-40 hover:opacity-100 text-destructive"
                                      onClick={() => {
                                        if (selectedHookText === hook) setSelectedHookText('');
                                        setViralHooks(prev => {
                                          const updated = [...prev];
                                          updated[catIdx] = { ...updated[catIdx], hooks: updated[catIdx].hooks.filter((_, idx) => idx !== i) };
                                          return updated;
                                        });
                                        toast({ title: 'Gancho removido!' });
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                          {/* Add new hook button */}
                          <button
                            onClick={() => {
                              setViralHooks(prev => {
                                const updated = [...prev];
                                updated[catIdx] = { ...updated[catIdx], hooks: [...updated[catIdx].hooks, ''] };
                                return updated;
                              });
                              const newIdx = category.hooks.length;
                              setEditingHook({ catIdx, hookIdx: newIdx });
                              setEditingHookText('');
                            }}
                            className="w-full text-left px-3 py-2 rounded-md text-xs border border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground transition-all flex items-center gap-1.5"
                          >
                            <span className="text-sm">＋</span> Adicionar nova frase de gancho
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredHooks.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Library className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Selecione um Estilo de Gancho para ver as frases</p>
                    </div>
                  )}
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

          <div className="p-3 border-t space-y-1.5">
            {hasHookStyleSelected && !selectedHookText && (
              <p className="text-[10px] text-destructive font-medium text-center">⚠️ Selecione uma frase de gancho na aba "Ganchos" antes de aplicar.</p>
            )}
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={selectionCount < 2 || !selections.contentType?.length || (hasHookStyleSelected && !selectedHookText)}
              onClick={handleGenerate}
            >
              {selections.contentType?.includes('video') ? <Video className="h-4 w-4" /> : <Image className="h-4 w-4" />}
              {activeTab === 'variations' && variations.length > 0 ? `Aplicar 5 Variações no Canvas` : 'Aplicar no Canvas'}
            </Button>
          </div>
        </div>
      </div>
      )}

    </motion.div>
  );
};

export default PresetsGallery;
export type { Preset };
