import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Play, Check, Package, Users, Search, Video, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// ─── Video Images ────────────────────────────────────────────────────
import imgCinematicStudio from '@/assets/presets/preset-product-cinematic-studio.jpg';
import imgLuxuryReveal from '@/assets/presets/preset-product-luxury-reveal.jpg';
import imgInfluencerVlog from '@/assets/presets/preset-product-influencer-vlog.jpg';
import imgScifi from '@/assets/presets/preset-product-scifi.jpg';
import imgAthletic from '@/assets/presets/preset-product-athletic.jpg';
import imgMinimalist from '@/assets/presets/preset-product-minimalist.jpg';
import imgFashion from '@/assets/presets/preset-product-fashion.jpg';
import imgHero from '@/assets/presets/preset-product-hero.jpg';
import imgStorytelling from '@/assets/presets/preset-product-storytelling.jpg';
import imgInfluencerReview from '@/assets/presets/preset-influencer-review.jpg';
import imgInfluencerVertical from '@/assets/presets/preset-influencer-vertical.jpg';
import imgInfluencerLuxury from '@/assets/presets/preset-influencer-luxury.jpg';
import imgInfluencerFitness from '@/assets/presets/preset-influencer-fitness.jpg';
import imgInfluencerUnboxing from '@/assets/presets/preset-influencer-unboxing.jpg';
import imgInfluencerFashion from '@/assets/presets/preset-influencer-fashion.jpg';
import imgInfluencerCafe from '@/assets/presets/preset-influencer-cafe.jpg';
import imgInfluencerStorytelling from '@/assets/presets/preset-influencer-storytelling.jpg';

// ─── Image Images ────────────────────────────────────────────────────
import imgProdWhite from '@/assets/presets/preset-img-product-white.jpg';
import imgProdFlatlay from '@/assets/presets/preset-img-product-flatlay.jpg';
import imgProdDark from '@/assets/presets/preset-img-product-dark.jpg';
import imgProdSplash from '@/assets/presets/preset-img-product-splash.jpg';
import imgProdMacro from '@/assets/presets/preset-img-product-macro.jpg';
import imgProdOutdoor from '@/assets/presets/preset-img-product-outdoor.jpg';
import imgProdLuxury from '@/assets/presets/preset-img-product-luxury.jpg';
import imgProdNeon from '@/assets/presets/preset-img-product-neon.jpg';
import imgInfPortrait from '@/assets/presets/preset-img-inf-portrait.jpg';
import imgInfLifestyle from '@/assets/presets/preset-img-inf-lifestyle.jpg';
import imgInfEditorial from '@/assets/presets/preset-img-inf-editorial.jpg';
import imgInfBeauty from '@/assets/presets/preset-img-inf-beauty.jpg';
import imgInfFitness from '@/assets/presets/preset-img-inf-fitness.jpg';
import imgInfStreet from '@/assets/presets/preset-img-inf-street.jpg';
import imgInfStudio from '@/assets/presets/preset-img-inf-studio.jpg';
import imgInfCozy from '@/assets/presets/preset-img-inf-cozy.jpg';

// ─── Preset types ────────────────────────────────────────────────────

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  image: string;
  mediaType: 'video' | 'image';
  category: 'produto' | 'influencer';
  tags: string[];
}

const NEGATIVE_BLOCK = `\nDo not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`;

const PROMPT_PRESETS: PromptPreset[] = [
  // ═══════════════════════════════════════════════════════════════════
  // ═══ VIDEO — PRODUTOS ═══
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'vp-cinematic-studio', name: 'Cinematic Studio', mediaType: 'video', category: 'produto',
    tags: ['studio', 'tech', 'luxury'], image: imgCinematicStudio,
    prompt: `Ultra cinematic commercial of a modern tech product on a minimalist black studio background. Slow rotating product on glossy reflective surface. Macro shots showing premium materials and textures. Soft volumetric lighting, rim light highlighting the edges. Camera: ARRI Alexa 35, 85mm lens, shallow depth of field. Ultra realistic reflections, luxury advertising aesthetic, smooth motion. Background fades into elegant gradient lighting. Final scene: product centered with subtle glow and dramatic lighting, text space for branding.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-luxury-reveal', name: 'Luxury Reveal', mediaType: 'video', category: 'produto',
    tags: ['luxury', 'dramatic', 'particles'], image: imgLuxuryReveal,
    prompt: `Luxury product reveal commercial. A dark cinematic environment with particles floating in the air. The product slowly emerges from shadows with dramatic lighting. High-speed slow motion, 120fps look. Camera pushes in slowly with macro lens. Hyper realistic textures, cinematic color grading, premium advertising style similar to high-end perfume ads. Moody atmosphere with soft fog and light rays.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-influencer-vlog', name: 'Influencer Vlog Style', mediaType: 'video', category: 'produto',
    tags: ['ugc', 'vlog', 'lifestyle'], image: imgInfluencerVlog,
    prompt: `Realistic influencer-style commercial video. A charismatic young influencer speaking to the camera while demonstrating a product. Modern aesthetic apartment with natural lighting from large windows. Camera handheld vlog style but cinematic stabilization. Authentic social media advertising tone. Camera: Sony FX6, 35mm lens. Warm natural light, realistic skin tones, lifestyle advertising.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-scifi', name: 'Sci-Fi Lab', mediaType: 'video', category: 'produto',
    tags: ['futuristic', 'neon', 'tech'], image: imgScifi,
    prompt: `Futuristic product commercial in a sci-fi environment. The product floating in a high-tech laboratory with holographic interface elements around it. Neon blue and purple lighting. Camera slowly orbiting around the product. Hyper realistic reflections, ultra detailed materials. Cinematic sci-fi atmosphere similar to Blade Runner advertising style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-athletic', name: 'Athletic Energy', mediaType: 'video', category: 'produto',
    tags: ['sports', 'energy', 'dynamic'], image: imgAthletic,
    prompt: `High-energy cinematic commercial. Athletic influencer using the product in motion. Dynamic tracking shots and slow motion action. Urban environment with dramatic sunset lighting. Sweat particles and dust visible in backlight. Camera: RED Komodo, 50mm lens. Epic advertising vibe similar to Nike commercials.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-minimalist', name: 'Minimalist Luxury', mediaType: 'video', category: 'produto',
    tags: ['minimal', 'clean', 'fashion'], image: imgMinimalist,
    prompt: `Minimalist luxury product commercial. Clean white studio background with soft gradient lighting. The product placed on a marble surface. Slow camera dolly movement and macro shots revealing texture. Soft shadows, premium fashion brand aesthetic. Ultra realistic studio lighting and reflections.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-fashion', name: 'High Fashion', mediaType: 'video', category: 'produto',
    tags: ['fashion', 'luxury', 'cinematic'], image: imgFashion,
    prompt: `High fashion cinematic commercial. Elegant influencer walking through a luxurious environment (marble floors, dramatic lighting). Close-ups of the product in slow motion. Soft smoke and light rays in the background. Camera slow motion, 60fps cinematic look. Fashion magazine advertising style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-hero', name: 'Epic Hero Shot', mediaType: 'video', category: 'produto',
    tags: ['hero', 'dramatic', 'premium'], image: imgHero,
    prompt: `Epic hero shot product commercial. The product placed on a reflective black surface with dramatic lighting from behind. Particles floating in the air. Camera slowly pushing in. Ultra high contrast cinematic lighting. Premium brand reveal aesthetic.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vp-storytelling', name: 'Cinematic Storytelling', mediaType: 'video', category: 'produto',
    tags: ['story', 'emotional', 'lifestyle'], image: imgStorytelling,
    prompt: `Cinematic storytelling commercial. A person using the product in an emotional everyday moment. Warm lighting inside a home during sunset. Close-up shots of hands interacting with the product. Natural acting, authentic lifestyle tone. Camera: ARRI Alexa Mini LF. Beautiful cinematic color grading and soft film grain.${NEGATIVE_BLOCK}`,
  },

  // ═══ VIDEO — INFLUENCER ═══
  {
    id: 'vi-review', name: 'Tech Review', mediaType: 'video', category: 'influencer',
    tags: ['review', 'youtube', 'tech'], image: imgInfluencerReview,
    prompt: `Ultra realistic influencer review video. A confident tech influencer holding the product and explaining its benefits directly to camera. Studio setup with soft LED lighting and blurred background. Camera: Sony A7S III, 35mm lens. Authentic YouTube review style but cinematic quality.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-vertical', name: 'Vertical Viral', mediaType: 'video', category: 'influencer',
    tags: ['vertical', 'tiktok', 'viral'], image: imgInfluencerVertical,
    prompt: `Vertical video influencer style commercial. Energetic influencer demonstrating the product quickly. Fast jump cuts, dynamic camera movements. Bright modern room, vibrant lighting. Social media viral advertising vibe.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-luxury', name: 'Luxury Penthouse', mediaType: 'video', category: 'influencer',
    tags: ['luxury', 'night', 'fashion'], image: imgInfluencerLuxury,
    prompt: `Luxury influencer showcasing the product in an elegant penthouse. Night city lights visible through large windows. Soft cinematic lighting and elegant movements. Fashion commercial atmosphere.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-fitness', name: 'Fitness Workout', mediaType: 'video', category: 'influencer',
    tags: ['fitness', 'gym', 'energy'], image: imgInfluencerFitness,
    prompt: `Fitness influencer using the product during workout. Gym environment with dramatic lighting and slow motion. Sweat and motion emphasized with backlight. High energy commercial vibe.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-unboxing', name: 'Unboxing Experience', mediaType: 'video', category: 'influencer',
    tags: ['unboxing', 'reveal', 'youtube'], image: imgInfluencerUnboxing,
    prompt: `Ultra realistic unboxing video. Influencer opening the product packaging slowly. Close-up shots of textures and details. Warm lighting and excitement reaction. YouTube style product reveal.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-fashion', name: 'Street Fashion', mediaType: 'video', category: 'influencer',
    tags: ['fashion', 'urban', 'editorial'], image: imgInfluencerFashion,
    prompt: `Fashion influencer showcasing the product as part of their outfit. Stylish urban environment. Smooth camera tracking shots. High fashion editorial style.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-cafe', name: 'Café Lifestyle', mediaType: 'video', category: 'influencer',
    tags: ['cafe', 'cozy', 'lifestyle'], image: imgInfluencerCafe,
    prompt: `Influencer sitting in a cozy café using the product naturally. Soft window light, cinematic depth of field. Relaxed lifestyle commercial tone.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'vi-storytelling', name: 'Personal Story', mediaType: 'video', category: 'influencer',
    tags: ['story', 'emotional', 'authentic'], image: imgInfluencerStorytelling,
    prompt: `Influencer telling a personal story about how the product improved their life. Natural emotional acting. Warm cinematic lighting. Authentic lifestyle advertising narrative.${NEGATIVE_BLOCK}`,
  },

  // ═══════════════════════════════════════════════════════════════════
  // ═══ IMAGE — PRODUTOS ═══
  // ═══════════════════════════════════════════════════════════════════
  {
    id: 'ip-white-studio', name: 'White Studio Clean', mediaType: 'image', category: 'produto',
    tags: ['e-commerce', 'clean', 'minimal'], image: imgProdWhite,
    prompt: `Professional product photography on a clean white seamless background. The product is centered with perfect symmetry. Soft diffused studio lighting from multiple angles eliminating harsh shadows. High-key photography style optimized for e-commerce and catalog use. Sharp focus across the entire product. Ultra high resolution, 4K detail, photorealistic rendering. Camera: Phase One IQ4, 120mm macro lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-flatlay', name: 'Flat Lay Lifestyle', mediaType: 'image', category: 'produto',
    tags: ['flatlay', 'instagram', 'lifestyle'], image: imgProdFlatlay,
    prompt: `Aesthetic flat lay product photography shot from directly above. The product arranged with complementary lifestyle accessories on a clean surface. Warm natural lighting from a window. Carefully curated composition with balanced negative space. Instagram-optimized aesthetic with cohesive color palette. Camera: Canon R5, 35mm lens, top-down angle.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-dark-moody', name: 'Dark Moody', mediaType: 'image', category: 'produto',
    tags: ['dark', 'dramatic', 'premium'], image: imgProdDark,
    prompt: `Dark moody product photography on a matte black surface. Dramatic rim lighting from behind creates a subtle glow outline around the product. Soft smoke wisps in the background. High contrast chiaroscuro lighting with deep shadows. Premium luxury advertising aesthetic. Ultra detailed textures visible. Camera: Sony A1, 90mm macro lens, f/2.8.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-splash', name: 'Dynamic Splash', mediaType: 'image', category: 'produto',
    tags: ['splash', 'dynamic', 'energy'], image: imgProdSplash,
    prompt: `High-speed product photography with dynamic liquid splash effects. The product appears to float with water, paint, or liquid droplets frozen in mid-air around it. Clean gradient background. Dramatic strobe lighting capturing every droplet in sharp detail. Commercial advertising style with vibrant energy. Camera: Nikon Z9, 1/8000s shutter speed, 85mm lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-macro', name: 'Macro Texture', mediaType: 'image', category: 'produto',
    tags: ['macro', 'detail', 'texture'], image: imgProdMacro,
    prompt: `Extreme macro product photography revealing fine textures, materials, and craftsmanship details. Ultra close-up showing surface quality, stitching, grain, or material composition. Very shallow depth of field with creamy bokeh. Professional studio lighting highlighting micro-details. Camera: Canon MP-E 65mm macro lens, 5:1 magnification, focus stacked for maximum sharpness.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-outdoor', name: 'Outdoor Natural', mediaType: 'image', category: 'produto',
    tags: ['outdoor', 'natural', 'golden-hour'], image: imgProdOutdoor,
    prompt: `Product photography in a beautiful natural outdoor setting during golden hour. The product placed on a natural surface (wood, stone, or earth) surrounded by botanical elements. Warm golden sunlight creating long soft shadows and a magical atmospheric quality. Organic lifestyle aesthetic with earthy tones. Camera: Sony A7R V, 50mm lens, f/1.8 for beautiful bokeh.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-luxury-still', name: 'Luxury Still Life', mediaType: 'image', category: 'produto',
    tags: ['luxury', 'marble', 'elegant'], image: imgProdLuxury,
    prompt: `Luxury still life product photography on a polished marble surface. Elegant composition with fresh flowers, gold accents, and premium decorative elements. Soft diffused lighting creating delicate shadows and subtle reflections on the marble. Premium fashion brand aesthetic with refined color palette. Camera: Hasselblad X2D, 80mm lens, medium format quality.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ip-neon-glow', name: 'Neon Glow', mediaType: 'image', category: 'produto',
    tags: ['neon', 'futuristic', 'tech'], image: imgProdNeon,
    prompt: `Futuristic product photography with vibrant neon RGB lighting. The product on a glossy reflective surface with colorful neon reflections. Purple, blue, and pink neon accents creating a cyberpunk aesthetic. High-tech environment feel with glowing light strips in the background. Ultra detailed reflections and materials. Camera: Sony A7S III, 85mm lens, wide open aperture.${NEGATIVE_BLOCK}`,
  },

  // ═══ IMAGE — INFLUENCER ═══
  {
    id: 'ii-portrait', name: 'Studio Portrait', mediaType: 'image', category: 'influencer',
    tags: ['portrait', 'studio', 'professional'], image: imgInfPortrait,
    prompt: `Professional influencer portrait photography holding the product. Soft LED studio lighting with beautiful catchlights in the eyes. Slightly blurred background with subtle bokeh. Confident and natural pose. The product held at chest level for clear visibility. Warm skin tones, professional retouching aesthetic. Camera: Canon R5, 85mm f/1.4 lens.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-lifestyle', name: 'Lifestyle Candid', mediaType: 'image', category: 'influencer',
    tags: ['candid', 'natural', 'home'], image: imgInfLifestyle,
    prompt: `Candid lifestyle photography of an influencer naturally using the product at home. Warm natural window light illuminating the scene. Cozy interior setting with tasteful decor. Authentic, unposed moment captured in a relaxed environment. Soft warm color palette with gentle shadows. Camera: Sony A7 IV, 35mm lens, f/2.0 for environmental context with subject isolation.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-editorial', name: 'Fashion Editorial', mediaType: 'image', category: 'influencer',
    tags: ['editorial', 'fashion', 'dramatic'], image: imgInfEditorial,
    prompt: `High fashion editorial photography featuring an influencer with the product. Dramatic directional lighting creating bold shadows and highlights. Avant-garde composition with strong visual impact. Magazine-quality finish with rich color grading. The product integrated naturally into the styling. Camera: Hasselblad X2D, 100mm lens, controlled studio environment with colored gels.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-beauty', name: 'Beauty Close-Up', mediaType: 'image', category: 'influencer',
    tags: ['beauty', 'skincare', 'close-up'], image: imgInfBeauty,
    prompt: `Professional beauty photography. Close-up of hands elegantly holding a skincare or beauty product. Soft beauty lighting with diffused fill creating flawless illumination. Clean minimal background. Focus on product details and natural skin texture. Cosmetics advertising aesthetic with premium feel. Camera: Canon R5, 100mm macro lens, f/4.0.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-fitness', name: 'Fitness Action', mediaType: 'image', category: 'influencer',
    tags: ['fitness', 'gym', 'action'], image: imgInfFitness,
    prompt: `Dynamic fitness photography of an athletic person with the product in a gym environment. Dramatic backlight creating rim light effect on the body. Action pose frozen in mid-movement. Visible energy and determination. High contrast lighting emphasizing muscle definition and product visibility. Camera: Nikon Z9, 70-200mm f/2.8, 1/2000s shutter speed.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-street', name: 'Street Style', mediaType: 'image', category: 'influencer',
    tags: ['street', 'urban', 'fashion'], image: imgInfStreet,
    prompt: `Street style photography of a fashionable influencer with the product in an urban setting. Modern architecture and city environment as backdrop. Candid walking shot with natural movement. The product integrated seamlessly into the outfit or held naturally. Editorial fashion photography style with cinematic color grading. Camera: Sony A7R V, 50mm f/1.4, natural light.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-studio-brand', name: 'Brand Ambassador', mediaType: 'image', category: 'influencer',
    tags: ['studio', 'brand', 'commercial'], image: imgInfStudio,
    prompt: `Professional studio portrait of a brand ambassador with the product. Clean seamless backdrop with multi-point lighting setup. Confident expression and natural smile. The product prominently displayed. Commercial advertising quality with perfect color balance. Professional retouching with natural skin tones preserved. Camera: Phase One IQ4, 120mm lens, controlled lighting.${NEGATIVE_BLOCK}`,
  },
  {
    id: 'ii-cozy', name: 'Cozy Indoor', mediaType: 'image', category: 'influencer',
    tags: ['cozy', 'warm', 'indoor'], image: imgInfCozy,
    prompt: `Cozy indoor photography of a person naturally using the product in a warm living room. Soft ambient lighting from candles and warm light sources. Comfortable setting with blankets, cushions, and warm decor. Hygge aesthetic with golden warm tones. Authentic relaxed moment. Camera: Sony A7 IV, 35mm f/1.8, low-light optimized with warm white balance.${NEGATIVE_BLOCK}`,
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────

interface PromptPresetsProps {
  onSelect: (preset: PromptPreset) => void;
}

const PromptPresets: React.FC<PromptPresetsProps> = ({ onSelect }) => {
  const [activeMediaType, setActiveMediaType] = useState<'video' | 'image'>('video');
  const [activeCategory, setActiveCategory] = useState<'produto' | 'influencer'>('produto');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return PROMPT_PRESETS.filter(p => {
      if (p.mediaType !== activeMediaType) return false;
      if (p.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [activeMediaType, activeCategory, search]);

  const selectedPreset = selectedId ? PROMPT_PRESETS.find(p => p.id === selectedId) : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência.' });
  };

  const countByMediaAndCat = (media: 'video' | 'image', cat: 'produto' | 'influencer') =>
    PROMPT_PRESETS.filter(p => p.mediaType === media && p.category === cat).length;

  return (
    <div className="flex flex-col h-full">
      {/* Media Type Tabs */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/30">
        <Button
          variant={activeMediaType === 'video' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveMediaType('video'); setSelectedId(null); }}
        >
          <Video className="h-3.5 w-3.5" /> Vídeo
        </Button>
        <Button
          variant={activeMediaType === 'image' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveMediaType('image'); setSelectedId(null); }}
        >
          <Image className="h-3.5 w-3.5" /> Imagem
        </Button>
      </div>

      {/* Category + Search */}
      <div className="flex items-center gap-2 px-4 py-2 border-b">
        <Button
          variant={activeCategory === 'produto' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('produto'); setSelectedId(null); }}
        >
          <Package className="h-3.5 w-3.5" /> Produto ({countByMediaAndCat(activeMediaType, 'produto')})
        </Button>
        <Button
          variant={activeCategory === 'influencer' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('influencer'); setSelectedId(null); }}
        >
          <Users className="h-3.5 w-3.5" /> Influencer ({countByMediaAndCat(activeMediaType, 'influencer')})
        </Button>
        <div className="flex-1" />
        <div className="relative w-40">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left — Grid */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4">
            {filtered.map((preset, i) => (
              <motion.button
                key={preset.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelectedId(preset.id)}
                className={`group relative rounded-xl overflow-hidden border-2 transition-all text-left ${
                  selectedId === preset.id
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-border/50 hover:border-primary/30'
                }`}
              >
                <div className="aspect-square relative overflow-hidden">
                  <img
                    src={preset.image}
                    alt={preset.name}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  {/* Media type badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0.5 bg-black/50 text-white border-0">
                      {preset.mediaType === 'video' ? '🎥 Vídeo' : '📷 Imagem'}
                    </Badge>
                  </div>
                  {selectedId === preset.id && (
                    <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-2.5">
                  <p className="text-xs font-semibold text-white truncate">{preset.name}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {preset.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] bg-white/20 text-white/80 px-1.5 py-0.5 rounded-full">{tag}</span>
                    ))}
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </ScrollArea>

        {/* Right — Preview */}
        {selectedPreset && (
          <div className="w-[350px] border-l flex flex-col bg-muted/30">
            <div className="p-4 border-b">
              <img src={selectedPreset.image} alt={selectedPreset.name} className="w-full aspect-video object-cover rounded-lg mb-3" />
              <h3 className="font-bold text-sm">{selectedPreset.name}</h3>
              <div className="flex gap-1 mt-1.5 flex-wrap">
                <Badge variant="outline" className="text-[9px]">
                  {selectedPreset.mediaType === 'video' ? '🎥 Vídeo' : '📷 Imagem'}
                </Badge>
                {selectedPreset.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-[9px]">{tag}</Badge>
                ))}
              </div>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre className="text-[10px] leading-relaxed font-mono whitespace-pre-wrap text-foreground/80">
                {selectedPreset.prompt}
              </pre>
            </ScrollArea>
            <div className="p-3 border-t flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => handleCopy(selectedPreset.prompt)}
              >
                <Copy className="h-3.5 w-3.5" /> Copiar
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5 text-xs"
                onClick={() => onSelect(selectedPreset)}
              >
                <Play className="h-3.5 w-3.5" /> Aplicar no Canvas
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptPresets;
export { PROMPT_PRESETS };
