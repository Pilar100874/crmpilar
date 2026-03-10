import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Copy, Play, Check, Package, Users, ChevronRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

// ─── Images ──────────────────────────────────────────────────────────
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

// ─── Preset types ────────────────────────────────────────────────────

export interface PromptPreset {
  id: string;
  name: string;
  prompt: string;
  image: string;
  category: 'produto' | 'influencer';
  tags: string[];
}

const PROMPT_PRESETS: PromptPreset[] = [
  // ═══ PRODUTOS ═══
  {
    id: 'pp-cinematic-studio',
    name: 'Cinematic Studio',
    category: 'produto',
    tags: ['studio', 'tech', 'luxury'],
    image: imgCinematicStudio,
    prompt: `Ultra cinematic commercial of a modern tech product on a minimalist black studio background. Slow rotating product on glossy reflective surface. Macro shots showing premium materials and textures. Soft volumetric lighting, rim light highlighting the edges. Camera: ARRI Alexa 35, 85mm lens, shallow depth of field. Ultra realistic reflections, luxury advertising aesthetic, smooth motion. Background fades into elegant gradient lighting. Final scene: product centered with subtle glow and dramatic lighting, text space for branding.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-luxury-reveal',
    name: 'Luxury Reveal',
    category: 'produto',
    tags: ['luxury', 'dramatic', 'particles'],
    image: imgLuxuryReveal,
    prompt: `Luxury product reveal commercial. A dark cinematic environment with particles floating in the air. The product slowly emerges from shadows with dramatic lighting. High-speed slow motion, 120fps look. Camera pushes in slowly with macro lens. Hyper realistic textures, cinematic color grading, premium advertising style similar to high-end perfume ads. Moody atmosphere with soft fog and light rays.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-influencer-vlog',
    name: 'Influencer Vlog Style',
    category: 'produto',
    tags: ['ugc', 'vlog', 'lifestyle'],
    image: imgInfluencerVlog,
    prompt: `Realistic influencer-style commercial video. A charismatic young influencer speaking to the camera while demonstrating a product. Modern aesthetic apartment with natural lighting from large windows. Camera handheld vlog style but cinematic stabilization. Authentic social media advertising tone. Camera: Sony FX6, 35mm lens. Warm natural light, realistic skin tones, lifestyle advertising.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-scifi',
    name: 'Sci-Fi Lab',
    category: 'produto',
    tags: ['futuristic', 'neon', 'tech'],
    image: imgScifi,
    prompt: `Futuristic product commercial in a sci-fi environment. The product floating in a high-tech laboratory with holographic interface elements around it. Neon blue and purple lighting. Camera slowly orbiting around the product. Hyper realistic reflections, ultra detailed materials. Cinematic sci-fi atmosphere similar to Blade Runner advertising style.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-athletic',
    name: 'Athletic Energy',
    category: 'produto',
    tags: ['sports', 'energy', 'dynamic'],
    image: imgAthletic,
    prompt: `High-energy cinematic commercial. Athletic influencer using the product in motion. Dynamic tracking shots and slow motion action. Urban environment with dramatic sunset lighting. Sweat particles and dust visible in backlight. Camera: RED Komodo, 50mm lens. Epic advertising vibe similar to Nike commercials.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-minimalist',
    name: 'Minimalist Luxury',
    category: 'produto',
    tags: ['minimal', 'clean', 'fashion'],
    image: imgMinimalist,
    prompt: `Minimalist luxury product commercial. Clean white studio background with soft gradient lighting. The product placed on a marble surface. Slow camera dolly movement and macro shots revealing texture. Soft shadows, premium fashion brand aesthetic. Ultra realistic studio lighting and reflections.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-fashion',
    name: 'High Fashion',
    category: 'produto',
    tags: ['fashion', 'luxury', 'cinematic'],
    image: imgFashion,
    prompt: `High fashion cinematic commercial. Elegant influencer walking through a luxurious environment (marble floors, dramatic lighting). Close-ups of the product in slow motion. Soft smoke and light rays in the background. Camera slow motion, 60fps cinematic look. Fashion magazine advertising style.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-hero',
    name: 'Epic Hero Shot',
    category: 'produto',
    tags: ['hero', 'dramatic', 'premium'],
    image: imgHero,
    prompt: `Epic hero shot product commercial. The product placed on a reflective black surface with dramatic lighting from behind. Particles floating in the air. Camera slowly pushing in. Ultra high contrast cinematic lighting. Premium brand reveal aesthetic.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-storytelling',
    name: 'Cinematic Storytelling',
    category: 'produto',
    tags: ['story', 'emotional', 'lifestyle'],
    image: imgStorytelling,
    prompt: `Cinematic storytelling commercial. A person using the product in an emotional everyday moment. Warm lighting inside a home during sunset. Close-up shots of hands interacting with the product. Natural acting, authentic lifestyle tone. Camera: ARRI Alexa Mini LF. Beautiful cinematic color grading and soft film grain.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },

  // ═══ INFLUENCER ═══
  {
    id: 'pp-inf-review',
    name: 'Tech Review',
    category: 'influencer',
    tags: ['review', 'youtube', 'tech'],
    image: imgInfluencerReview,
    prompt: `Ultra realistic influencer review video. A confident tech influencer holding the product and explaining its benefits directly to camera. Studio setup with soft LED lighting and blurred background. Camera: Sony A7S III, 35mm lens. Authentic YouTube review style but cinematic quality.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-vertical',
    name: 'Vertical Viral',
    category: 'influencer',
    tags: ['vertical', 'tiktok', 'viral'],
    image: imgInfluencerVertical,
    prompt: `Vertical video influencer style commercial. Energetic influencer demonstrating the product quickly. Fast jump cuts, dynamic camera movements. Bright modern room, vibrant lighting. Social media viral advertising vibe.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-luxury',
    name: 'Luxury Penthouse',
    category: 'influencer',
    tags: ['luxury', 'night', 'fashion'],
    image: imgInfluencerLuxury,
    prompt: `Luxury influencer showcasing the product in an elegant penthouse. Night city lights visible through large windows. Soft cinematic lighting and elegant movements. Fashion commercial atmosphere.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-fitness',
    name: 'Fitness Workout',
    category: 'influencer',
    tags: ['fitness', 'gym', 'energy'],
    image: imgInfluencerFitness,
    prompt: `Fitness influencer using the product during workout. Gym environment with dramatic lighting and slow motion. Sweat and motion emphasized with backlight. High energy commercial vibe.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-unboxing',
    name: 'Unboxing Experience',
    category: 'influencer',
    tags: ['unboxing', 'reveal', 'youtube'],
    image: imgInfluencerUnboxing,
    prompt: `Ultra realistic unboxing video. Influencer opening the product packaging slowly. Close-up shots of textures and details. Warm lighting and excitement reaction. YouTube style product reveal.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-fashion',
    name: 'Street Fashion',
    category: 'influencer',
    tags: ['fashion', 'urban', 'editorial'],
    image: imgInfluencerFashion,
    prompt: `Fashion influencer showcasing the product as part of their outfit. Stylish urban environment. Smooth camera tracking shots. High fashion editorial style.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-cafe',
    name: 'Café Lifestyle',
    category: 'influencer',
    tags: ['cafe', 'cozy', 'lifestyle'],
    image: imgInfluencerCafe,
    prompt: `Influencer sitting in a cozy café using the product naturally. Soft window light, cinematic depth of field. Relaxed lifestyle commercial tone.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
  {
    id: 'pp-inf-storytelling',
    name: 'Personal Story',
    category: 'influencer',
    tags: ['story', 'emotional', 'authentic'],
    image: imgInfluencerStorytelling,
    prompt: `Influencer telling a personal story about how the product improved their life. Natural emotional acting. Warm cinematic lighting. Authentic lifestyle advertising narrative.

Do not generate any text, captions, subtitles, logos, watermarks, letters, numbers or typography unless explicitly provided by system blocks. Use only the elements provided through the system input blocks. Do not add extra objects, products, people, environments, UI elements, overlays or graphics that are not provided. The generated content must not contain erotic, sexual, explicit or suggestive content.`,
  },
];

// ─── COMPONENT ───────────────────────────────────────────────────────

interface PromptPresetsProps {
  onSelect: (preset: PromptPreset) => void;
}

const PromptPresets: React.FC<PromptPresetsProps> = ({ onSelect }) => {
  const [activeCategory, setActiveCategory] = useState<'produto' | 'influencer'>('produto');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { toast } = useToast();

  const filtered = useMemo(() => {
    return PROMPT_PRESETS.filter(p => {
      if (p.category !== activeCategory) return false;
      if (search) {
        const q = search.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.tags.some(t => t.includes(q));
      }
      return true;
    });
  }, [activeCategory, search]);

  const selectedPreset = selectedId ? PROMPT_PRESETS.find(p => p.id === selectedId) : null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Prompt copiado para a área de transferência.' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Category Tabs */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <Button
          variant={activeCategory === 'produto' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('produto'); setSelectedId(null); }}
        >
          <Package className="h-3.5 w-3.5" /> Produto ({PROMPT_PRESETS.filter(p => p.category === 'produto').length})
        </Button>
        <Button
          variant={activeCategory === 'influencer' ? 'default' : 'outline'}
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => { setActiveCategory('influencer'); setSelectedId(null); }}
        >
          <Users className="h-3.5 w-3.5" /> Influencer ({PROMPT_PRESETS.filter(p => p.category === 'influencer').length})
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
                <Copy className="h-3.5 w-3.5" /> Copiar Prompt
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
