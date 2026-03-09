import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Info, Video, Image, Music, Mic, Type, Clapperboard, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

// Camera & Movement presets
import camAscend from '@/assets/presets/cam-ascend.jpg';
import camFollow from '@/assets/presets/cam-follow.jpg';
import camFlythrough from '@/assets/presets/cam-flythrough.jpg';
import camMounted from '@/assets/presets/cam-mounted.jpg';
import camRotation from '@/assets/presets/cam-rotation.jpg';
import camRise from '@/assets/presets/cam-rise.jpg';
import camZoomin from '@/assets/presets/cam-zoomin.jpg';
import camPan from '@/assets/presets/cam-pan.jpg';
import camTilt from '@/assets/presets/cam-tilt.jpg';
import camOrbit from '@/assets/presets/cam-orbit.jpg';
import camHandheld from '@/assets/presets/cam-handheld.jpg';
import camCrane from '@/assets/presets/cam-crane.jpg';
import camSteadicam from '@/assets/presets/cam-steadicam.jpg';
import fxSlowmo from '@/assets/presets/fx-slowmo.jpg';
import fxTimelapse from '@/assets/presets/fx-timelapse.jpg';
import fxDollyzoom from '@/assets/presets/fx-dollyzoom.jpg';
import fxSpeedramp from '@/assets/presets/fx-speedramp.jpg';
import fxCharswap from '@/assets/presets/fx-charswap.jpg';

// New category presets
import presetImageArt from '@/assets/presets/preset-image-art.jpg';
import presetImageProduct from '@/assets/presets/preset-image-product.jpg';
import presetImageLandscape from '@/assets/presets/preset-image-landscape.jpg';
import presetImagePortrait from '@/assets/presets/preset-image-portrait.jpg';
import presetImageSocial from '@/assets/presets/preset-image-social.jpg';
import presetMusicAmbient from '@/assets/presets/preset-music-ambient.jpg';
import presetMusicCinematic from '@/assets/presets/preset-music-cinematic.jpg';
import presetMusicLofi from '@/assets/presets/preset-music-lofi.jpg';
import presetMusicElectronic from '@/assets/presets/preset-music-electronic.jpg';
import presetAudioNarration from '@/assets/presets/preset-audio-narration.jpg';
import presetAudioSfx from '@/assets/presets/preset-audio-sfx.jpg';
import presetAudioAmbient from '@/assets/presets/preset-audio-ambient.jpg';
import presetTextLlm from '@/assets/presets/preset-text-llm.jpg';
import presetTextTranslate from '@/assets/presets/preset-text-translate.jpg';

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
  videoSubcategory?: string; // sub-tab within video: 'geral' | 'google-veo' | 'sora' | 'runway' | 'kling'
}

const PRESET_CATEGORIES = [
  { id: 'ecommerce', label: 'E-commerce', icon: ShoppingBag },
  { id: 'video', label: 'Vídeo', icon: Video },
  { id: 'image', label: 'Imagem', icon: Image },
  { id: 'music', label: 'Música', icon: Music },
  { id: 'audio', label: 'Áudio', icon: Mic },
  { id: 'text', label: 'Texto/LLM', icon: Type },
  { id: 'camera', label: 'Câmera', icon: Clapperboard },
];

const VIDEO_SUBCATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'geral', label: 'Geral' },
  { id: 'google-veo', label: 'Google Veo' },
  { id: 'sora', label: 'OpenAI Sora' },
  { id: 'runway', label: 'Runway' },
  { id: 'kling', label: 'Kling' },
];

const PRESETS: Preset[] = [
  // ===== GOOGLE VEO =====
  {
    id: 'veo-cinematic-landscape', name: 'Paisagem Cinematográfica',
    description: 'Câmera sobrevoando paisagem ao pôr do sol com iluminação dourada. Otimizado para Google Veo.',
    prompt: 'Sobrevoo cinematográfico suave sobre uma paisagem campestre ao pôr do sol, câmera descendente suave, iluminação dourada natural, filmagem 4K cinematográfica',
    image: camFlythrough, category: 'video', videoSubcategory: 'google-veo', toolType: 'videoGen', isVideo: true, videoModel: 'google/veo-3.1', duration: 6,
  },
  {
    id: 'veo-nature-timelapse', name: 'Timelapse Natureza',
    description: 'Nuvens se movendo sobre montanhas verdes. Otimizado para Google Veo.',
    prompt: 'Timelapse de nuvens brancas se movendo pacificamente sobre montanhas verdes do nascer ao pôr do sol, gradientes coloridos no céu, estilo documentário de natureza calmo',
    image: fxTimelapse, category: 'video', videoSubcategory: 'google-veo', toolType: 'videoGen', isVideo: true, videoModel: 'google/veo-3.1', duration: 8,
  },
  {
    id: 'veo-water-slowmo', name: 'Gotas em Câmera Lenta',
    description: 'Gotas de água caindo em câmera lenta com iluminação suave. Otimizado para Google Veo.',
    prompt: 'Câmera lenta de gotas de água cristalina caindo em uma piscina calma, criando ondulações suaves, iluminação natural suave, pacífico e sereno, estilo filmagem de câmera de alta velocidade',
    image: fxSlowmo, category: 'video', videoSubcategory: 'google-veo', toolType: 'videoGen', isVideo: true, videoModel: 'google/veo-3.1', duration: 5,
  },
  {
    id: 'veo-drone-ascend', name: 'Drone Ascendente',
    description: 'Câmera subindo do nível do solo revelando paisagem verde. Otimizado para Google Veo.',
    prompt: 'Câmera subindo verticalmente de um campo verde, revelando progressivamente uma vasta paisagem pacífica com colinas onduladas e um rio, luz do dia brilhante, estilo filmagem aérea',
    image: camAscend, category: 'video', videoSubcategory: 'google-veo', toolType: 'videoGen', isVideo: true, videoModel: 'google/veo-3.1', duration: 7,
  },
  {
    id: 'veo-product-table', name: 'Produto sobre Mesa',
    description: 'Objeto elegante sobre mesa de madeira com luz natural da janela. Otimizado para Google Veo.',
    prompt: 'Cena de natureza-morta de um produto elegante sobre uma mesa de madeira perto de uma janela, luz do dia natural suave entrando, profundidade de campo suave, estilo fotografia comercial',
    image: presetImageProduct, category: 'video', videoSubcategory: 'google-veo', toolType: 'videoGen', isVideo: true, videoModel: 'google/veo-3.1', duration: 6,
  },

  // ===== OPENAI SORA =====
  {
    id: 'sora-paint-splash', name: 'Splash de Tinta',
    description: 'Tinta colorida explodindo em câmera lenta contra fundo branco. Otimizado para Sora.',
    prompt: 'Respingo de tinta colorida no ar em câmera lenta, tintas vibrantes vermelha azul e amarela se misturando contra um fundo branco limpo, estilo comercial artístico',
    image: fxSpeedramp, category: 'video', videoSubcategory: 'sora', toolType: 'videoGen', isVideo: true, videoModel: 'openai/sora-2', duration: 4,
  },
  {
    id: 'sora-paper-boat', name: 'Barco de Papel',
    description: 'Barco de papel navegando em um riacho tranquilo. Otimizado para Sora.',
    prompt: 'Pequeno barco de papel branco flutuando suavemente em um riacho calmo e cristalino, cercado por musgo verde e luz solar suave, filmagem cinematográfica pacífica',
    image: camFollow, category: 'video', videoSubcategory: 'sora', toolType: 'videoGen', isVideo: true, videoModel: 'openai/sora-2', duration: 8,
  },
  {
    id: 'sora-abstract-particles', name: 'Partículas Abstratas',
    description: 'Partículas luminosas dançando no espaço escuro. Otimizado para Sora.',
    prompt: 'Partículas luminosas abstratas dançando graciosamente no espaço escuro, trilhas de luz azul e dourada suaves, sistema de partículas hipnotizante, motion graphics elegante',
    image: presetImageArt, category: 'video', videoSubcategory: 'sora', toolType: 'videoGen', isVideo: true, videoModel: 'openai/sora-2', duration: 4,
  },
  {
    id: 'sora-product-rotation', name: 'Rotação de Produto',
    description: 'Objeto girando suavemente em fundo limpo de estúdio. Otimizado para Sora.',
    prompt: 'Objeto elegante e simples girando lentamente em fundo branco limpo de estúdio, iluminação profissional suave, rotação contínua suave, vídeo comercial de produto',
    image: camOrbit, category: 'video', videoSubcategory: 'sora', toolType: 'videoGen', isVideo: true, videoModel: 'openai/sora-2', duration: 8,
  },
  {
    id: 'sora-hallway-zoom', name: 'Corredor Infinito',
    description: 'Efeito dolly zoom em corredor vazio com iluminação natural. Otimizado para Sora.',
    prompt: 'Efeito dolly zoom suave em um corredor longo e vazio com iluminação natural, o fundo se estica enquanto a câmera avança, criando uma ilusão visual hipnotizante',
    image: fxDollyzoom, category: 'video', videoSubcategory: 'sora', toolType: 'videoGen', isVideo: true, videoModel: 'openai/sora-2', duration: 4,
  },

  // ===== RUNWAY =====
  {
    id: 'runway-flower-bloom', name: 'Flor Desabrochando',
    description: 'Flor abrindo suas pétalas em timelapse artístico. Otimizado para Runway.',
    prompt: 'Flor desabrochando lentamente e abrindo suas pétalas, perspectiva macro suave, iluminação natural quente, estilo timelapse botânico, delicado e elegante',
    image: fxTimelapse, category: 'video', videoSubcategory: 'runway', toolType: 'videoGen', isVideo: true, videoModel: 'runway/gen4', duration: 5,
  },
  {
    id: 'runway-coffee-steam', name: 'Vapor do Café',
    description: 'Xícara de café com vapor subindo suavemente. Otimizado para Runway.',
    prompt: 'Xícara de café quente sobre mesa de madeira com vapor subindo suavemente, luz da manhã suave, atmosfera aconchegante, profundidade de campo rasa, estilo comercial lifestyle',
    image: presetImageProduct, category: 'video', videoSubcategory: 'runway', toolType: 'videoGen', isVideo: true, videoModel: 'runway/gen4', duration: 5,
  },
  {
    id: 'runway-ocean-waves', name: 'Ondas do Mar',
    description: 'Ondas suaves chegando à praia com luz do pôr do sol. Otimizado para Runway.',
    prompt: 'Ondas suaves do oceano chegando à praia de areia ao pôr do sol, reflexos de luz dourada na água, pacífico e sereno, filmagem cinematográfica de natureza',
    image: presetImageLandscape, category: 'video', videoSubcategory: 'runway', toolType: 'videoGen', isVideo: true, videoModel: 'runway/gen4', duration: 10,
  },
  {
    id: 'runway-ink-water', name: 'Tinta na Água',
    description: 'Gota de tinta se espalhando em água cristalina. Otimizado para Runway.',
    prompt: 'Gota de tinta colorida se difundindo lentamente em água cristalina, padrões orgânicos se formando, estilo macrofotografia, dinâmica de fluidos hipnotizante',
    image: presetImageArt, category: 'video', videoSubcategory: 'runway', toolType: 'videoGen', isVideo: true, videoModel: 'runway/gen4', duration: 5,
  },

  // ===== KLING =====
  {
    id: 'kling-candle-flicker', name: 'Vela Cintilante',
    description: 'Chama de vela oscilando suavemente em ambiente aconchegante. Otimizado para Kling.',
    prompt: 'Chama de vela quente oscilando suavemente em um quarto escuro e aconchegante, luzes bokeh suaves ao fundo, atmosfera íntima e pacífica, close cinematográfico',
    image: presetMusicAmbient, category: 'video', videoSubcategory: 'kling', toolType: 'videoGen', isVideo: true, videoModel: 'kling/v2.1', duration: 5,
  },
  {
    id: 'kling-leaves-falling', name: 'Folhas Caindo',
    description: 'Folhas de outono caindo suavemente com luz dourada. Otimizado para Kling.',
    prompt: 'Folhas de outono caindo suavemente através da luz solar dourada em uma floresta pacífica, fundo com foco suave, cores quentes, estilo filmagem de natureza',
    image: fxSlowmo, category: 'video', videoSubcategory: 'kling', toolType: 'videoGen', isVideo: true, videoModel: 'kling/v2.1', duration: 5,
  },
  {
    id: 'kling-sparkles', name: 'Brilhos e Faíscas',
    description: 'Faíscas douradas brilhantes contra fundo escuro. Otimizado para Kling.',
    prompt: 'Brilhos e partículas de luz douradas flutuando graciosamente contra um fundo escuro, mágico e elegante, atmosfera de celebração, qualidade comercial',
    image: presetImageArt, category: 'video', videoSubcategory: 'kling', toolType: 'videoGen', isVideo: true, videoModel: 'kling/v2.1', duration: 10,
  },
  {
    id: 'kling-rain-window', name: 'Chuva na Janela',
    description: 'Gotas de chuva escorrendo em vidro com luzes desfocadas ao fundo. Otimizado para Kling.',
    prompt: 'Gotas de chuva escorrendo lentamente em uma janela de vidro, luzes coloridas da cidade desfocadas ao fundo, clima aconchegante e reflexivo, filmagem cinematográfica em close',
    image: presetMusicLofi, category: 'video', videoSubcategory: 'kling', toolType: 'videoGen', isVideo: true, videoModel: 'kling/v2.1', duration: 5,
  },

  // ===== VÍDEO GERAL =====
  {
    id: 'video-cinematic-intro', name: 'Introdução Cinematográfica',
    description: 'Cena de abertura com câmera sobrevoando uma paisagem ao pôr do sol. Compatível com qualquer modelo.',
    prompt: 'Sobrevoo cinematográfico suave sobre uma paisagem campestre pacífica ao pôr do sol, câmera descendente suave, iluminação dourada natural, estilo filmagem comercial 4K',
    image: camFlythrough, category: 'video', videoSubcategory: 'geral', toolType: 'videoGen', isVideo: true,
  },
  {
    id: 'video-product-showcase', name: 'Vitrine de Produto',
    description: 'Objeto girando em fundo de estúdio com iluminação suave. Compatível com qualquer modelo.',
    prompt: 'Objeto elegante e simples girando lentamente 360 graus em fundo branco limpo de estúdio, iluminação profissional suave, rotação lenta e suave, estilo fotografia comercial de produto',
    image: camOrbit, category: 'video', videoSubcategory: 'geral', toolType: 'videoGen', isVideo: true,
  },
  {
    id: 'video-nature-timelapse', name: 'Timelapse Natureza',
    description: 'Nuvens se movendo sobre montanhas verdes. Compatível com qualquer modelo.',
    prompt: 'A beautiful time-lapse of white clouds moving peacefully over green mountains from sunrise to sunset, colorful sky gradients, calm nature documentary style',
    image: fxTimelapse, category: 'video', videoSubcategory: 'geral', toolType: 'videoGen', isVideo: true,
  },
  {
    id: 'video-slowmo-water', name: 'Câmera Lenta',
    description: 'Gotas de água caindo em câmera lenta. Compatível com qualquer modelo.',
    prompt: 'Beautiful slow motion of water droplets falling into a calm pool, creating gentle ripples, soft natural lighting, peaceful and serene, high-speed camera footage style',
    image: fxSlowmo, category: 'video', videoSubcategory: 'geral', toolType: 'videoGen', isVideo: true,
  },

  // ===== IMAGEM =====
  {
    id: 'image-art-abstract',
    name: 'Arte Abstrata',
    description: 'Pintura abstrata vibrante com explosão de cores, estilo arte digital moderna.',
    prompt: 'Abstract vibrant painting with explosive colors, modern digital art style, artistic brush strokes, high contrast',
    image: presetImageArt,
    category: 'image',
    toolType: 'imageGen',
  },
  {
    id: 'image-product-photo',
    name: 'Foto de Produto',
    description: 'Fotografia profissional de produto em fundo limpo com iluminação de estúdio.',
    prompt: 'Professional product photography on clean background, studio lighting, commercial quality, high detail',
    image: presetImageProduct,
    category: 'image',
    toolType: 'imageGen',
  },
  {
    id: 'image-landscape',
    name: 'Paisagem Épica',
    description: 'Paisagem panorâmica de montanhas com pôr do sol, atmosfera cinematográfica.',
    prompt: 'Epic mountain landscape panorama at sunset, atmospheric fog, cinematic lighting, nature photography, ultra high resolution',
    image: presetImageLandscape,
    category: 'image',
    toolType: 'imageGen',
  },
  {
    id: 'image-portrait',
    name: 'Retrato Artístico',
    description: 'Retrato profissional com iluminação dramática, estilo editorial de alta qualidade.',
    prompt: 'Artistic portrait with dramatic lighting, editorial photography style, shallow depth of field, professional quality',
    image: presetImagePortrait,
    category: 'image',
    toolType: 'imageGen',
  },
  {
    id: 'image-social-media',
    name: 'Post para Redes Sociais',
    description: 'Design visual colorido e atrativo para postagens em redes sociais e marketing.',
    prompt: 'Vibrant eye-catching social media post design, colorful brand elements, modern layout, marketing visual',
    image: presetImageSocial,
    category: 'image',
    toolType: 'imageGen',
  },
  {
    id: 'image-logo-concept',
    name: 'Conceito de Logo',
    description: 'Geração de conceitos visuais para logotipos e identidade de marca.',
    prompt: 'Modern minimalist logo concept design, clean lines, professional branding, vector-style, versatile design',
    image: presetImageArt,
    category: 'image',
    toolType: 'imageGen',
  },

  // ===== MÚSICA =====
  {
    id: 'music-ambient',
    name: 'Ambiente Relaxante',
    description: 'Música ambiente suave para meditação, spa ou vídeos calmos. Sons etéreos e harmônicos.',
    prompt: 'Soft ambient music for meditation, ethereal pads, gentle harmonic progression, calming atmosphere, 120 seconds',
    image: presetMusicAmbient,
    category: 'music',
    toolType: 'musicGen',
  },
  {
    id: 'music-cinematic',
    name: 'Trilha Cinematográfica',
    description: 'Trilha sonora orquestral épica para filmes, trailers e vídeos emocionantes.',
    prompt: 'Epic cinematic orchestral score, building tension, dramatic strings and brass, film trailer music, powerful crescendo',
    image: presetMusicCinematic,
    category: 'music',
    toolType: 'musicGen',
  },
  {
    id: 'music-lofi',
    name: 'Lo-Fi Chill',
    description: 'Batida lo-fi relaxante estilo "beats para estudar", com piano suave e sons de chuva.',
    prompt: 'Lo-fi hip hop chill beat, soft piano, vinyl crackle, rain sounds, relaxing study music, mellow vibes',
    image: presetMusicLofi,
    category: 'music',
    toolType: 'musicGen',
  },
  {
    id: 'music-electronic',
    name: 'Eletrônico/EDM',
    description: 'Batida eletrônica energética para vídeos dinâmicos, festas ou conteúdo fitness.',
    prompt: 'Energetic electronic dance music, driving beat, synthesizer lead, festival EDM, high energy drops',
    image: presetMusicElectronic,
    category: 'music',
    toolType: 'musicGen',
  },
  {
    id: 'music-corporate',
    name: 'Corporativo Motivacional',
    description: 'Música motivacional corporativa para apresentações, vídeos institucionais e comerciais.',
    prompt: 'Uplifting corporate motivational music, acoustic guitar, light percussion, positive and inspiring, business presentation',
    image: presetMusicCinematic,
    category: 'music',
    toolType: 'musicGen',
  },
  {
    id: 'music-jazz',
    name: 'Jazz Suave',
    description: 'Jazz suave com piano, contrabaixo e bateria leve. Perfeito para restaurantes e lounges.',
    prompt: 'Smooth jazz, soft piano trio, upright bass, brushed drums, sophisticated lounge atmosphere, warm tones',
    image: presetMusicAmbient,
    category: 'music',
    toolType: 'musicGen',
  },

  // ===== ÁUDIO =====
  {
    id: 'audio-narration',
    name: 'Narração Profissional',
    description: 'Voz profissional para narração de vídeos, podcasts e apresentações.',
    prompt: 'Professional male narrator voice, clear enunciation, warm tone, documentary style narration',
    image: presetAudioNarration,
    category: 'audio',
    toolType: 'audioGen',
  },
  {
    id: 'audio-sfx-explosion',
    name: 'Efeito Sonoro: Explosão',
    description: 'Efeito sonoro de explosão cinematográfica com reverberação e sub-graves.',
    prompt: 'Cinematic explosion sound effect, deep bass rumble, debris, reverb tail, movie quality',
    image: presetAudioSfx,
    category: 'audio',
    toolType: 'audioGen',
  },
  {
    id: 'audio-sfx-whoosh',
    name: 'Efeito Sonoro: Transição',
    description: 'Som de transição "whoosh" suave para cortes de vídeo e animações.',
    prompt: 'Smooth whoosh transition sound effect, clean swipe, cinematic transition audio',
    image: presetAudioSfx,
    category: 'audio',
    toolType: 'audioGen',
  },
  {
    id: 'audio-ambient-nature',
    name: 'Ambiente: Natureza',
    description: 'Sons ambientes de floresta com pássaros, vento suave e riacho para relaxamento.',
    prompt: 'Forest ambient sounds, birdsong, gentle wind through leaves, stream water, peaceful nature atmosphere',
    image: presetAudioAmbient,
    category: 'audio',
    toolType: 'audioGen',
  },
  {
    id: 'audio-voiceover-commercial',
    name: 'Voice Over Comercial',
    description: 'Voz confiante e dinâmica para comerciais de TV e anúncios online.',
    prompt: 'Confident commercial voice over, dynamic and engaging tone, advertising style, clear pronunciation',
    image: presetAudioNarration,
    category: 'audio',
    toolType: 'audioGen',
  },
  {
    id: 'audio-sfx-ui',
    name: 'Sons de Interface',
    description: 'Sons sutis para interfaces: cliques, notificações e feedback de interação.',
    prompt: 'UI interface sounds, subtle click, soft notification chime, interaction feedback, minimal and clean',
    image: presetAudioSfx,
    category: 'audio',
    toolType: 'audioGen',
  },

  // ===== TEXTO / LLM =====
  {
    id: 'text-creative-writing',
    name: 'Escrita Criativa',
    description: 'Gere textos criativos, histórias, roteiros e narrativas envolventes com IA.',
    prompt: 'Escreva uma história criativa e envolvente sobre o tema fornecido. Use linguagem rica, metáforas e um arco narrativo interessante.',
    image: presetTextLlm,
    category: 'text',
    toolType: 'llmProcess',
  },
  {
    id: 'text-translate',
    name: 'Tradução Inteligente',
    description: 'Traduza textos mantendo contexto, tom e nuances culturais entre idiomas.',
    prompt: 'Traduza o texto a seguir mantendo o tom, contexto cultural e nuances idiomáticas. Adapte expressões que não têm tradução direta.',
    image: presetTextTranslate,
    category: 'text',
    toolType: 'llmProcess',
  },
  {
    id: 'text-summarize',
    name: 'Resumir Texto',
    description: 'Resuma textos longos em pontos-chave claros e objetivos.',
    prompt: 'Resuma o texto fornecido em pontos-chave claros e objetivos. Mantenha as informações mais importantes e elimine redundâncias.',
    image: presetTextLlm,
    category: 'text',
    toolType: 'llmProcess',
  },
  {
    id: 'text-copywriting',
    name: 'Copywriting Marketing',
    description: 'Crie textos persuasivos para anúncios, landing pages e campanhas de marketing.',
    prompt: 'Crie um texto de copywriting persuasivo e envolvente para marketing digital. Use gatilhos mentais, CTA claro e linguagem que converte.',
    image: presetTextTranslate,
    category: 'text',
    toolType: 'llmProcess',
  },
  {
    id: 'text-seo',
    name: 'Conteúdo SEO',
    description: 'Gere artigos otimizados para SEO com palavras-chave e estrutura adequada.',
    prompt: 'Escreva um artigo otimizado para SEO com título H1, subtítulos H2/H3, meta description e uso natural de palavras-chave.',
    image: presetTextLlm,
    category: 'text',
    toolType: 'llmProcess',
  },
  {
    id: 'text-script',
    name: 'Roteiro para Vídeo',
    description: 'Crie roteiros estruturados para vídeos do YouTube, Reels e TikTok.',
    prompt: 'Crie um roteiro estruturado para vídeo com gancho de abertura, desenvolvimento e call-to-action final. Inclua indicações de cortes e B-roll.',
    image: presetTextTranslate,
    category: 'text',
    toolType: 'llmProcess',
  },

  // ===== E-COMMERCE (Produto em Pessoa) =====
  {
    id: 'ecom-clothing-tryon',
    name: 'Provador Virtual de Roupas',
    description: 'Vista uma peça de roupa em uma modelo automaticamente. Envie a foto da pessoa e do produto.',
    prompt: 'Dress the person in this clothing item naturally. Maintain realistic body proportions, fabric draping, and lighting consistency.',
    image: presetImagePortrait,
    category: 'ecommerce',
    toolType: 'productComposite',
  },
  {
    id: 'ecom-accessory-tryon',
    name: 'Experimentar Acessório',
    description: 'Coloque óculos, relógios, chapéus ou joias em uma pessoa. Resultado realista e natural.',
    prompt: 'Place this accessory on the person naturally. Match perspective, scale, lighting and shadows for photorealistic result.',
    image: presetImagePortrait,
    category: 'ecommerce',
    toolType: 'productComposite',
  },
  {
    id: 'ecom-product-in-hand',
    name: 'Produto na Mão',
    description: 'Coloque um produto (celular, garrafa, bolsa) na mão de uma pessoa para fotos de lifestyle.',
    prompt: 'Place this product naturally in the person\'s hand. Ensure correct grip, perspective and consistent lighting for lifestyle photo.',
    image: presetImageProduct,
    category: 'ecommerce',
    toolType: 'productComposite',
  },
  {
    id: 'ecom-scene-placement',
    name: 'Produto na Cena',
    description: 'Insira um produto em uma cena com pessoa, como se fosse uma foto real de campanha publicitária.',
    prompt: 'Insert this product into the scene with the person naturally. Create a professional advertising campaign look with correct shadows and reflections.',
    image: presetImageSocial,
    category: 'ecommerce',
    toolType: 'productComposite',
  },
  {
    id: 'ecom-before-after',
    name: 'Antes e Depois',
    description: 'Gere uma imagem mostrando "antes sem produto" e "depois com produto" para comparação visual.',
    prompt: 'Show a before and after comparison. Place the product on the person to create a compelling transformation visual for marketing.',
    image: presetImageProduct,
    category: 'ecommerce',
    toolType: 'productComposite',
  },
  {
    id: 'ecom-multi-color',
    name: 'Variações de Cor',
    description: 'Mostre a mesma roupa/acessório em diferentes cores na mesma pessoa. Ideal para catálogo.',
    prompt: 'Show this clothing item on the person. Generate a clean catalog-style photo that can showcase the product in different color variations.',
    image: presetImageProduct,
    category: 'ecommerce',
    toolType: 'productComposite',
  },

  // ===== CÂMERA (presets existentes) =====
  { id: 'ascend', name: 'Ascender', description: 'Câmera sobe verticalmente revelando a cena de cima, estilo drone.', prompt: 'Camera ascending vertically revealing the scene from above, drone style elevation', image: camAscend, category: 'camera', toolType: 'videoGen' },
  { id: 'follow', name: 'Seguir', description: 'Câmera segue o sujeito mantendo enquadramento constante.', prompt: 'Camera following subject maintaining constant framing during movement', image: camFollow, category: 'camera', toolType: 'videoGen' },
  { id: 'flythrough', name: 'Fly-through', description: 'Câmera voa através da cena, atravessando ambientes.', prompt: 'Camera flying through the scene, passing through environments immersively', image: camFlythrough, category: 'camera', toolType: 'videoGen' },
  { id: 'orbit', name: 'Órbita', description: 'Câmera gira ao redor do sujeito em movimento circular.', prompt: 'Camera orbiting around subject in circular motion maintaining central focus', image: camOrbit, category: 'camera', toolType: 'videoGen' },
  { id: 'crane', name: 'Grua', description: 'Movimento vertical suave como uma grua cinematográfica.', prompt: 'Smooth vertical crane movement revealing the full scope of the scene', image: camCrane, category: 'camera', toolType: 'videoGen' },
  { id: 'steadicam', name: 'Steadicam', description: 'Movimento estabilizado acompanhando o sujeito profissionalmente.', prompt: 'Smooth stabilized steadicam movement tracking the subject professionally', image: camSteadicam, category: 'camera', toolType: 'videoGen' },
  { id: 'mounted', name: 'Câmera Montada', description: 'Fixada em veículo em movimento, perspectiva dinâmica.', prompt: 'Camera mounted on moving vehicle capturing speed and dynamic perspective', image: camMounted, category: 'camera', toolType: 'videoGen' },
  { id: 'rotation', name: 'Rotação 360°', description: 'Rotação completa ao redor do objeto mostrando todos os ângulos.', prompt: '360 degree rotation around object showing all angles with continuous motion', image: camRotation, category: 'camera', toolType: 'videoGen' },
  { id: 'rise', name: 'Elevar', description: 'Sujeito se eleva dramaticamente com câmera acompanhando.', prompt: 'Subject rising dramatically in scene with camera following upward movement', image: camRise, category: 'camera', toolType: 'videoGen' },
  { id: 'pan', name: 'Pan Horizontal', description: 'Câmera gira horizontalmente varrendo a paisagem.', prompt: 'Camera panning horizontally sweeping across the landscape', image: camPan, category: 'camera', toolType: 'videoGen' },
  { id: 'tilt', name: 'Tilt Vertical', description: 'Câmera inclina verticalmente revelando do chão ao céu.', prompt: 'Camera tilting vertically gradually revealing from ground to sky', image: camTilt, category: 'camera', toolType: 'videoGen' },
  { id: 'zoomin', name: 'Zoom In', description: 'Aproximação gradual criando foco e intimidade.', prompt: 'Gradual zoom into specific detail creating focus and intimacy', image: camZoomin, category: 'camera', toolType: 'videoGen' },
  { id: 'handheld', name: 'Câmera na Mão', description: 'Tremor natural criando sensação documental e imersiva.', prompt: 'Handheld camera with natural shake creating documentary immersive feeling', image: camHandheld, category: 'camera', toolType: 'videoGen' },
  { id: 'charswap', name: 'Troca de Personagem', description: 'Morphing suave entre dois sujeitos diferentes na mesma cena.', prompt: 'Character swap smooth morphing transformation between two subjects', image: fxCharswap, category: 'camera', toolType: 'videoGen' },
];

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
}

// Animated video preview component
const VideoPreviewAnimation: React.FC<{ preset: Preset; isHovered: boolean }> = ({ preset, isHovered }) => {
  if (!preset.isVideo) return null;

  const getAnimation = (): { animate: any; transition: any } => {
    const easeIO = [0.42, 0, 0.58, 1] as const;
    const linear = [0, 0, 1, 1] as const;

    if (preset.id.includes('cinematic')) {
      return {
        animate: isHovered ? { scale: 1.15, y: -10 } : { scale: 1, y: 0 },
        transition: { duration: 2, ease: easeIO },
      };
    }
    if (preset.id.includes('product') || preset.id.includes('orbit')) {
      return {
        animate: isHovered ? { rotateY: 360 } : { rotateY: 0 },
        transition: { duration: 3, ease: linear, repeat: isHovered ? Infinity : 0 },
      };
    }
    if (preset.id.includes('timelapse')) {
      return {
        animate: isHovered ? { filter: 'hue-rotate(360deg)' } : { filter: 'hue-rotate(0deg)' },
        transition: { duration: 4, ease: linear, repeat: isHovered ? Infinity : 0 },
      };
    }
    if (preset.id.includes('slowmo')) {
      return {
        animate: isHovered ? { scale: [1, 1.05, 1.02, 1.06, 1] } : { scale: 1 },
        transition: { duration: 3, ease: easeIO, repeat: isHovered ? Infinity : 0 },
      };
    }
    if (preset.id.includes('ascend') || preset.id.includes('drone')) {
      return {
        animate: isHovered ? { y: -20, scale: 0.9 } : { y: 0, scale: 1 },
        transition: { duration: 2.5, ease: easeIO },
      };
    }
    if (preset.id.includes('dolly') || preset.id.includes('vertigo')) {
      return {
        animate: isHovered ? { scale: [1, 1.3, 0.85, 1.2, 1] } : { scale: 1 },
        transition: { duration: 2.5, ease: easeIO, repeat: isHovered ? Infinity : 0 },
      };
    }
    if (preset.id.includes('speed-ramp')) {
      return {
        animate: isHovered ? { x: [0, 5, -3, 8, 0] } : { x: 0 },
        transition: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] as const, repeat: isHovered ? Infinity : 0 },
      };
    }
    if (preset.id.includes('follow') || preset.id.includes('tracking')) {
      return {
        animate: isHovered ? { x: [0, 10, 0, -10, 0] } : { x: 0 },
        transition: { duration: 3, ease: easeIO, repeat: isHovered ? Infinity : 0 },
      };
    }
    return {
      animate: isHovered ? { scale: 1.05 } : { scale: 1 },
      transition: { duration: 1 },
    };
  };

  const anim = getAnimation();

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      {...anim}
    >
      <img src={preset.image} alt="" className="w-full h-full object-cover" />
    </motion.div>
  );
};

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('video');
  const [activeVideoSub, setActiveVideoSub] = useState('todos');
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Preset | null>(null);

  const filteredPresets = PRESETS.filter((p) => {
    if (p.category !== activeCategory) return false;
    if (activeCategory === 'video' && activeVideoSub !== 'todos') {
      return p.videoSubcategory === activeVideoSub;
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <div>
          <h2 className="text-xl font-bold">Galeria de Presets</h2>
          <p className="text-sm text-muted-foreground">Modelos prontos para todas as ferramentas de IA</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Abas de categorias */}
      <div className="flex items-center gap-2 px-6 py-3 border-b overflow-x-auto">
        {PRESET_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                if (cat.id === 'video') setActiveVideoSub('todos');
              }}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border whitespace-nowrap ${
                activeCategory === cat.id
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Sub-abas de vídeo */}
      {activeCategory === 'video' && (
        <div className="flex items-center gap-1.5 px-6 py-2 border-b overflow-x-auto bg-muted/30">
          {VIDEO_SUBCATEGORIES.map((sub) => (
            <button
              key={sub.id}
              onClick={() => setActiveVideoSub(sub.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${
                activeVideoSub === sub.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}

      {/* Grade */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
            >
              {filteredPresets.map((preset) => (
                <motion.div
                  key={preset.id}
                  className="group relative rounded-xl overflow-hidden cursor-pointer border border-border/50 hover:border-primary/60 transition-all shadow-sm hover:shadow-lg"
                  onMouseEnter={() => setHoveredPreset(preset.id)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedDetail(preset)}
                >
                  <div className="aspect-square relative overflow-hidden">
                    {/* Static image (shown when not hovered or not video) */}
                    {(!preset.isVideo || hoveredPreset !== preset.id) && (
                      <img
                        src={preset.image}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    )}

                    {/* Animated preview for video presets */}
                    {preset.isVideo && hoveredPreset === preset.id && (
                      <VideoPreviewAnimation preset={preset} isHovered={true} />
                    )}

                    {/* Gradiente */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Ícone de play ao passar o mouse */}
                    <AnimatePresence>
                      {hoveredPreset === preset.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="absolute inset-0 flex items-center justify-center"
                        >
                          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                            <Play className="h-5 w-5 text-white ml-0.5" />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      {preset.isVideo && (
                        <Badge className="bg-purple-500/80 text-white border-0 text-[9px] px-1.5 py-0">
                          <Video className="h-2.5 w-2.5 mr-0.5" />
                          Animado
                        </Badge>
                      )}
                      {preset.videoModel && (
                        <Badge variant="secondary" className="text-[8px] px-1.5 py-0 opacity-80">
                          {preset.videoModel.split('/').pop()}
                        </Badge>
                      )}
                    </div>

                    {/* Nome */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-sm">{preset.name}</h3>
                      <p className="text-white/50 text-[10px] line-clamp-1">{preset.description}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Modal de detalhes */}
      <AnimatePresence>
        {selectedDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setSelectedDetail(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative aspect-video overflow-hidden">
                {selectedDetail.isVideo ? (
                  <VideoPreviewAnimation preset={selectedDetail} isHovered={true} />
                ) : (
                  <img
                    src={selectedDetail.image}
                    alt={selectedDetail.name}
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {PRESET_CATEGORIES.find(c => c.id === selectedDetail.category)?.label}
                    </Badge>
                    {selectedDetail.isVideo && (
                      <Badge className="bg-purple-500/80 text-white border-0 text-xs">
                        <Video className="h-3 w-3 mr-1" />
                        Animado
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-white text-xl font-bold">{selectedDetail.name}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 text-white hover:bg-white/20"
                  onClick={() => setSelectedDetail(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {selectedDetail.description}
                </p>

                <div className="bg-muted/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">Prompt sugerido</span>
                  </div>
                  <p className="text-xs text-foreground/80 font-mono">{selectedDetail.prompt}</p>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      onSelectPreset(selectedDetail);
                      setSelectedDetail(null);
                    }}
                  >
                    <Play className="h-4 w-4" />
                    Usar este preset
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedDetail(null)}>
                    Fechar
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PresetsGallery;
export type { Preset };
