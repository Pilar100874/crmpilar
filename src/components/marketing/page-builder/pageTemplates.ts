import type { PageSection } from './PageBuilder';

export interface PageTemplateTheme {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  preview_gradient: string; // CSS gradient for visual preview
  tags: string[];
  config: {
    primaryColor?: string;
    accentColor?: string;
    backgroundColor?: string;
    textColor?: string;
    fontDisplay?: string;
    secondaryColor?: string;
  };
}

export interface PageTemplateCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  themes: PageTemplateTheme[];
}

const year = new Date().getFullYear();

export const TEMPLATE_CATEGORIES: PageTemplateCategory[] = [
  {
    id: 'startup',
    name: 'Startup & SaaS',
    icon: '🚀',
    description: 'Páginas modernas para empresas de tecnologia',
    themes: [
      {
        id: 'startup-neon',
        name: 'Neon Pulse',
        description: 'Visual vibrante com gradientes neon e fundo escuro',
        thumbnail: '⚡',
        preview_gradient: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        tags: ['dark', 'neon', 'tech'],
        config: { primaryColor: '#8b5cf6', accentColor: '#06d6a0', backgroundColor: '#0f0c29', textColor: '#e2e8f0', fontDisplay: 'Inter', secondaryColor: '#302b63' },
      },
      {
        id: 'startup-clean',
        name: 'Clean Pro',
        description: 'Minimalista e profissional com azul corporativo',
        thumbnail: '💎',
        preview_gradient: 'linear-gradient(135deg, #ffffff, #f0f9ff, #e0f2fe)',
        tags: ['light', 'minimal', 'corporate'],
        config: { primaryColor: '#2563eb', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'Inter' },
      },
      {
        id: 'startup-gradient',
        name: 'Aurora',
        description: 'Gradientes suaves com tons pastel futuristas',
        thumbnail: '🌈',
        preview_gradient: 'linear-gradient(135deg, #667eea, #764ba2, #f093fb)',
        tags: ['gradient', 'modern', 'creative'],
        config: { primaryColor: '#7c3aed', accentColor: '#ec4899', backgroundColor: '#faf5ff', textColor: '#1e1b4b', fontDisplay: 'Inter' },
      },
      {
        id: 'startup-midnight',
        name: 'Midnight Blue',
        description: 'Elegante com azul profundo e detalhes dourados',
        thumbnail: '🌙',
        preview_gradient: 'linear-gradient(135deg, #0c1445, #1a237e, #283593)',
        tags: ['dark', 'elegant', 'premium'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#0c1445', textColor: '#e8eaf6', fontDisplay: 'Inter' },
      },
      {
        id: 'startup-emerald',
        name: 'Emerald Tech',
        description: 'Verde tecnológico com visual futurista',
        thumbnail: '💚',
        preview_gradient: 'linear-gradient(135deg, #064e3b, #065f46, #047857)',
        tags: ['dark', 'green', 'tech'],
        config: { primaryColor: '#10b981', accentColor: '#34d399', backgroundColor: '#022c22', textColor: '#d1fae5', fontDisplay: 'Inter' },
      },
    ],
  },
  {
    id: 'ecommerce',
    name: 'E-commerce & Produto',
    icon: '🛍️',
    description: 'Páginas de vendas e lançamento de produtos',
    themes: [
      {
        id: 'ecom-luxury',
        name: 'Luxe Black',
        description: 'Sofisticado com preto e dourado para produtos premium',
        thumbnail: '👑',
        preview_gradient: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        tags: ['dark', 'luxury', 'premium'],
        config: { primaryColor: '#d4af37', accentColor: '#f1c40f', backgroundColor: '#1a1a2e', textColor: '#f5f5f5', fontDisplay: 'Playfair Display' },
      },
      {
        id: 'ecom-vibrant',
        name: 'Pop Vibrant',
        description: 'Cores vivas e energéticas para produtos jovens',
        thumbnail: '🎉',
        preview_gradient: 'linear-gradient(135deg, #ff6b6b, #feca57, #48dbfb)',
        tags: ['colorful', 'young', 'bold'],
        config: { primaryColor: '#ff6b6b', accentColor: '#feca57', backgroundColor: '#ffffff', textColor: '#2d3436', fontDisplay: 'Inter' },
      },
      {
        id: 'ecom-minimal',
        name: 'Mono Store',
        description: 'Minimalista em tons de cinza e tipografia marcante',
        thumbnail: '🖤',
        preview_gradient: 'linear-gradient(135deg, #2c3e50, #3d566e, #5d7b9a)',
        tags: ['minimal', 'mono', 'elegant'],
        config: { primaryColor: '#1a1a1a', accentColor: '#e74c3c', backgroundColor: '#fafafa', textColor: '#1a1a1a', fontDisplay: 'Inter' },
      },
      {
        id: 'ecom-nature',
        name: 'Eco Natural',
        description: 'Verde orgânico para produtos naturais e sustentáveis',
        thumbnail: '🌿',
        preview_gradient: 'linear-gradient(135deg, #d4edda, #c3e6cb, #a3d9a5)',
        tags: ['green', 'natural', 'organic'],
        config: { primaryColor: '#2d6a4f', accentColor: '#52b788', backgroundColor: '#f0fdf4', textColor: '#1b4332', fontDisplay: 'Georgia' },
      },
      {
        id: 'ecom-fire',
        name: 'Fire Sale',
        description: 'Vermelho urgente para promoções e ofertas relâmpago',
        thumbnail: '🔥',
        preview_gradient: 'linear-gradient(135deg, #b91c1c, #dc2626, #ef4444)',
        tags: ['red', 'urgent', 'sale'],
        config: { primaryColor: '#dc2626', accentColor: '#f59e0b', backgroundColor: '#fef2f2', textColor: '#7f1d1d', fontDisplay: 'Inter' },
      },
    ],
  },
  {
    id: 'services',
    name: 'Serviços & Consultoria',
    icon: '💼',
    description: 'Para profissionais, agências e consultores',
    themes: [
      {
        id: 'serv-corporate',
        name: 'Corporate Blue',
        description: 'Profissional e confiável com azul corporativo',
        thumbnail: '🏢',
        preview_gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb, #3b82f6)',
        tags: ['blue', 'corporate', 'trust'],
        config: { primaryColor: '#1e40af', accentColor: '#3b82f6', backgroundColor: '#ffffff', textColor: '#1e293b', fontDisplay: 'Inter' },
      },
      {
        id: 'serv-warm',
        name: 'Warm Consulting',
        description: 'Tons quentes e acolhedores para serviços humanizados',
        thumbnail: '🤝',
        preview_gradient: 'linear-gradient(135deg, #fef3c7, #fde68a, #fbbf24)',
        tags: ['warm', 'friendly', 'human'],
        config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia' },
      },
      {
        id: 'serv-modern',
        name: 'Agency Pro',
        description: 'Visual de agência digital moderna e ousada',
        thumbnail: '🎯',
        preview_gradient: 'linear-gradient(135deg, #18181b, #27272a, #3f3f46)',
        tags: ['dark', 'agency', 'bold'],
        config: { primaryColor: '#f97316', accentColor: '#fb923c', backgroundColor: '#18181b', textColor: '#fafafa', fontDisplay: 'Inter' },
      },
      {
        id: 'serv-health',
        name: 'Health & Wellness',
        description: 'Tons calmos para saúde, bem-estar e terapias',
        thumbnail: '🧘',
        preview_gradient: 'linear-gradient(135deg, #ecfdf5, #d1fae5, #a7f3d0)',
        tags: ['calm', 'health', 'green'],
        config: { primaryColor: '#059669', accentColor: '#34d399', backgroundColor: '#f0fdf4', textColor: '#064e3b', fontDisplay: 'Georgia' },
      },
      {
        id: 'serv-legal',
        name: 'Legal & Finance',
        description: 'Sóbrio e confiável para escritórios e finanças',
        thumbnail: '⚖️',
        preview_gradient: 'linear-gradient(135deg, #1e293b, #334155, #475569)',
        tags: ['dark', 'serious', 'trust'],
        config: { primaryColor: '#1e293b', accentColor: '#64748b', backgroundColor: '#f8fafc', textColor: '#0f172a', fontDisplay: 'Georgia' },
      },
    ],
  },
  {
    id: 'creative',
    name: 'Criativo & Portfólio',
    icon: '🎨',
    description: 'Para artistas, designers e criativos',
    themes: [
      {
        id: 'creative-dark',
        name: 'Dark Canvas',
        description: 'Fundo escuro sofisticado com acentos roxo neon',
        thumbnail: '🎭',
        preview_gradient: 'linear-gradient(135deg, #0f172a, #1e1b4b, #312e81)',
        tags: ['dark', 'creative', 'purple'],
        config: { primaryColor: '#8b5cf6', accentColor: '#a78bfa', backgroundColor: '#0f172a', textColor: '#e2e8f0', fontDisplay: 'Inter' },
      },
      {
        id: 'creative-pastel',
        name: 'Pastel Dream',
        description: 'Cores pastel suaves e delicadas para portfólios criativos',
        thumbnail: '🦋',
        preview_gradient: 'linear-gradient(135deg, #fce7f3, #ddd6fe, #cffafe)',
        tags: ['pastel', 'soft', 'feminine'],
        config: { primaryColor: '#db2777', accentColor: '#8b5cf6', backgroundColor: '#fdf2f8', textColor: '#831843', fontDisplay: 'Inter' },
      },
      {
        id: 'creative-brutalist',
        name: 'Brutalist',
        description: 'Design brutalista com alto contraste e tipografia forte',
        thumbnail: '🏗️',
        preview_gradient: 'linear-gradient(135deg, #fafafa, #e5e5e5, #d4d4d4)',
        tags: ['brutalist', 'bold', 'contrast'],
        config: { primaryColor: '#000000', accentColor: '#ef4444', backgroundColor: '#fafafa', textColor: '#000000', fontDisplay: 'Inter' },
      },
      {
        id: 'creative-retro',
        name: 'Retro Wave',
        description: 'Estética retro-futurista com gradientes synthwave',
        thumbnail: '🌆',
        preview_gradient: 'linear-gradient(135deg, #1a0533, #3d0f72, #ff0080)',
        tags: ['retro', 'synthwave', 'neon'],
        config: { primaryColor: '#ff0080', accentColor: '#00e5ff', backgroundColor: '#1a0533', textColor: '#f0e6ff', fontDisplay: 'Inter' },
      },
      {
        id: 'creative-earth',
        name: 'Earth Tones',
        description: 'Tons terrosos e orgânicos com visual artesanal',
        thumbnail: '🏺',
        preview_gradient: 'linear-gradient(135deg, #fef7ed, #fed7aa, #fdba74)',
        tags: ['warm', 'artisan', 'organic'],
        config: { primaryColor: '#9a3412', accentColor: '#c2410c', backgroundColor: '#fffbf1', textColor: '#431407', fontDisplay: 'Georgia' },
      },
    ],
  },
  {
    id: 'food',
    name: 'Gastronomia & Food',
    icon: '🍽️',
    description: 'Restaurantes, delivery e gastronomia',
    themes: [
      {
        id: 'food-elegant',
        name: 'Fine Dining',
        description: 'Elegante e sofisticado para restaurantes premium',
        thumbnail: '🥂',
        preview_gradient: 'linear-gradient(135deg, #1c1917, #292524, #44403c)',
        tags: ['dark', 'elegant', 'premium'],
        config: { primaryColor: '#d4af37', accentColor: '#b8860b', backgroundColor: '#1c1917', textColor: '#f5f5f4', fontDisplay: 'Playfair Display' },
      },
      {
        id: 'food-fresh',
        name: 'Fresh & Healthy',
        description: 'Visual fresco e saudável para comida natural',
        thumbnail: '🥗',
        preview_gradient: 'linear-gradient(135deg, #f0fdf4, #dcfce7, #bbf7d0)',
        tags: ['green', 'fresh', 'healthy'],
        config: { primaryColor: '#16a34a', accentColor: '#22c55e', backgroundColor: '#f0fdf4', textColor: '#14532d', fontDisplay: 'Inter' },
      },
      {
        id: 'food-warmth',
        name: 'Cantina Rústica',
        description: 'Aconchegante e rústico para comida caseira',
        thumbnail: '🍲',
        preview_gradient: 'linear-gradient(135deg, #fffbeb, #fef3c7, #fde68a)',
        tags: ['warm', 'rustic', 'cozy'],
        config: { primaryColor: '#92400e', accentColor: '#d97706', backgroundColor: '#fffbeb', textColor: '#451a03', fontDisplay: 'Georgia' },
      },
      {
        id: 'food-modern',
        name: 'Urban Kitchen',
        description: 'Moderno e urbano para hamburguerias e street food',
        thumbnail: '🍔',
        preview_gradient: 'linear-gradient(135deg, #1f2937, #374151, #4b5563)',
        tags: ['dark', 'urban', 'modern'],
        config: { primaryColor: '#ef4444', accentColor: '#f97316', backgroundColor: '#111827', textColor: '#f9fafb', fontDisplay: 'Inter' },
      },
      {
        id: 'food-japanese',
        name: 'Zen Oriental',
        description: 'Minimalista japonês para sushi e culinária oriental',
        thumbnail: '🍣',
        preview_gradient: 'linear-gradient(135deg, #faf5ff, #f3e8ff, #e9d5ff)',
        tags: ['minimal', 'oriental', 'zen'],
        config: { primaryColor: '#7c2d12', accentColor: '#dc2626', backgroundColor: '#fefce8', textColor: '#1c1917', fontDisplay: 'Georgia' },
      },
    ],
  },
  {
    id: 'education',
    name: 'Educação & Cursos',
    icon: '📚',
    description: 'Cursos online, infoprodutos e educação',
    themes: [
      {
        id: 'edu-modern',
        name: 'Learn Pro',
        description: 'Visual profissional para plataformas de ensino',
        thumbnail: '🎓',
        preview_gradient: 'linear-gradient(135deg, #1e3a5f, #3b82f6, #60a5fa)',
        tags: ['blue', 'professional', 'education'],
        config: { primaryColor: '#1d4ed8', accentColor: '#3b82f6', backgroundColor: '#eff6ff', textColor: '#1e3a8a', fontDisplay: 'Inter' },
      },
      {
        id: 'edu-playful',
        name: 'Creative Learn',
        description: 'Colorido e divertido para cursos criativos',
        thumbnail: '🎯',
        preview_gradient: 'linear-gradient(135deg, #fef3c7, #fde68a, #a3e635)',
        tags: ['colorful', 'fun', 'creative'],
        config: { primaryColor: '#7c3aed', accentColor: '#f59e0b', backgroundColor: '#fefce8', textColor: '#1c1917', fontDisplay: 'Inter' },
      },
      {
        id: 'edu-expert',
        name: 'Expert Authority',
        description: 'Escuro e autoritário para mentores e especialistas',
        thumbnail: '🧠',
        preview_gradient: 'linear-gradient(135deg, #1e1b4b, #312e81, #4338ca)',
        tags: ['dark', 'authority', 'expert'],
        config: { primaryColor: '#6366f1', accentColor: '#818cf8', backgroundColor: '#0f0a2e', textColor: '#e0e7ff', fontDisplay: 'Inter' },
      },
      {
        id: 'edu-warm',
        name: 'Coach Warmth',
        description: 'Acolhedor e inspirador para coaching e mentoria',
        thumbnail: '💡',
        preview_gradient: 'linear-gradient(135deg, #fff7ed, #fed7aa, #fb923c)',
        tags: ['warm', 'coaching', 'inspiring'],
        config: { primaryColor: '#ea580c', accentColor: '#f97316', backgroundColor: '#fff7ed', textColor: '#7c2d12', fontDisplay: 'Inter' },
      },
    ],
  },
  {
    id: 'events',
    name: 'Eventos & Lançamentos',
    icon: '🎪',
    description: 'Eventos, webinars e lançamentos especiais',
    themes: [
      {
        id: 'event-gala',
        name: 'Gala Night',
        description: 'Sofisticado para eventos exclusivos e premiações',
        thumbnail: '✨',
        preview_gradient: 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #2d1b69)',
        tags: ['dark', 'luxury', 'gala'],
        config: { primaryColor: '#fbbf24', accentColor: '#f59e0b', backgroundColor: '#0a0a0a', textColor: '#fefce8', fontDisplay: 'Playfair Display' },
      },
      {
        id: 'event-festival',
        name: 'Festival',
        description: 'Vibrante e festivo para shows e festivais',
        thumbnail: '🎵',
        preview_gradient: 'linear-gradient(135deg, #7c3aed, #ec4899, #f97316)',
        tags: ['colorful', 'vibrant', 'festival'],
        config: { primaryColor: '#ec4899', accentColor: '#f97316', backgroundColor: '#faf5ff', textColor: '#1e1b4b', fontDisplay: 'Inter' },
      },
      {
        id: 'event-conference',
        name: 'Conference',
        description: 'Profissional para conferências e summit',
        thumbnail: '🎤',
        preview_gradient: 'linear-gradient(135deg, #0f172a, #1e293b, #334155)',
        tags: ['dark', 'professional', 'conference'],
        config: { primaryColor: '#06b6d4', accentColor: '#22d3ee', backgroundColor: '#0f172a', textColor: '#f0f9ff', fontDisplay: 'Inter' },
      },
      {
        id: 'event-launch',
        name: 'Mega Launch',
        description: 'Impactante para lançamentos e count-downs',
        thumbnail: '🚀',
        preview_gradient: 'linear-gradient(135deg, #dc2626, #b91c1c, #991b1b)',
        tags: ['red', 'impact', 'launch'],
        config: { primaryColor: '#dc2626', accentColor: '#fbbf24', backgroundColor: '#fef2f2', textColor: '#7f1d1d', fontDisplay: 'Inter' },
      },
    ],
  },
];

// Flatten all themes for easy lookup
export const ALL_THEMES: PageTemplateTheme[] = TEMPLATE_CATEGORIES.flatMap(c => c.themes);

export function getThemeById(id: string): PageTemplateTheme | undefined {
  return ALL_THEMES.find(t => t.id === id);
}
