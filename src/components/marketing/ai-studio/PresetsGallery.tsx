import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

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

interface Preset {
  id: string;
  name: string;
  description: string;
  prompt: string;
  image: string;
  category: string;
}

const PRESET_CATEGORIES = [
  { id: 'camera', label: 'Câmera' },
  { id: 'movement', label: 'Movimento' },
  { id: 'effects', label: 'Efeitos' },
  { id: 'style', label: 'Estilo' },
];

const PRESETS: Preset[] = [
  // Camera
  { id: 'ascend', name: 'Ascender', description: 'Câmera sobe verticalmente revelando a cena de cima, estilo drone elevando-se sobre a paisagem.', prompt: 'Camera ascending vertically revealing the scene from above, drone style elevation', image: camAscend, category: 'camera' },
  { id: 'follow', name: 'Seguir', description: 'Câmera segue o objeto/sujeito mantendo enquadramento constante durante o movimento.', prompt: 'Camera following subject maintaining constant framing during movement', image: camFollow, category: 'camera' },
  { id: 'flythrough', name: 'Fly-through', description: 'Câmera voa através da cena, atravessando ambientes como se estivesse dentro deles.', prompt: 'Camera flying through the scene, passing through environments immersively', image: camFlythrough, category: 'camera' },
  { id: 'orbit', name: 'Órbita', description: 'Câmera gira ao redor do sujeito em movimento circular, mantendo foco central.', prompt: 'Camera orbiting around subject in circular motion maintaining central focus', image: camOrbit, category: 'camera' },
  { id: 'crane', name: 'Grua', description: 'Movimento vertical suave como uma grua cinematográfica, revelando a amplitude da cena.', prompt: 'Smooth vertical crane movement revealing the full scope of the scene', image: camCrane, category: 'camera' },
  { id: 'steadicam', name: 'Steadicam', description: 'Movimento suave e estabilizado acompanhando o sujeito, estilo tracking shot profissional.', prompt: 'Smooth stabilized steadicam movement tracking the subject professionally', image: camSteadicam, category: 'camera' },

  // Movement
  { id: 'mounted', name: 'Montada', description: 'Câmera fixada em objeto/veículo em movimento, capturando velocidade e perspectiva dinâmica.', prompt: 'Camera mounted on moving vehicle capturing speed and dynamic perspective', image: camMounted, category: 'movement' },
  { id: 'rotation', name: 'Rotação', description: 'Rotação 360° ao redor do objeto, mostrando todos os ângulos com movimento contínuo.', prompt: '360 degree rotation around object showing all angles with continuous motion', image: camRotation, category: 'movement' },
  { id: 'rise', name: 'Elevar', description: 'Objeto/sujeito se eleva dramaticamente na cena com câmera acompanhando o movimento ascendente.', prompt: 'Subject rising dramatically in scene with camera following upward movement', image: camRise, category: 'movement' },
  { id: 'pan', name: 'Pan', description: 'Câmera gira horizontalmente sobre seu eixo, varrendo a paisagem de um lado ao outro.', prompt: 'Camera panning horizontally sweeping across the landscape', image: camPan, category: 'movement' },
  { id: 'tilt', name: 'Tilt', description: 'Câmera inclina verticalmente, revelando gradualmente do chão ao céu ou vice-versa.', prompt: 'Camera tilting vertically gradually revealing from ground to sky', image: camTilt, category: 'movement' },
  { id: 'zoomin', name: 'Zoom In', description: 'Aproximação gradual em um detalhe específico, criando foco e intimidade com o sujeito.', prompt: 'Gradual zoom into specific detail creating focus and intimacy', image: camZoomin, category: 'movement' },

  // Effects
  { id: 'slowmo', name: 'Câmera Lenta', description: 'Desacelera o tempo dramaticamente, revelando detalhes invisíveis em velocidade normal.', prompt: 'Dramatic slow motion revealing invisible details at normal speed', image: fxSlowmo, category: 'effects' },
  { id: 'timelapse', name: 'Time-lapse', description: 'Acelera o tempo para mostrar transformações que demoram horas/dias em poucos segundos.', prompt: 'Time-lapse accelerating time to show hour/day transformations in seconds', image: fxTimelapse, category: 'effects' },
  { id: 'dollyzoom', name: 'Dolly Zoom', description: 'Efeito "Vertigo": zoom e dolly simultâneos em direções opostas, distorcendo a perspectiva.', prompt: 'Dolly zoom Vertigo effect: simultaneous zoom and dolly in opposite directions', image: fxDollyzoom, category: 'effects' },
  { id: 'speedramp', name: 'Speed Ramp', description: 'Transição fluida entre velocidades diferentes, acelerando e desacelerando dramaticamente.', prompt: 'Speed ramping with fluid transitions between different speeds', image: fxSpeedramp, category: 'effects' },
  { id: 'handheld', name: 'Handheld', description: 'Câmera na mão com tremor natural, criando sensação documental e imersiva.', prompt: 'Handheld camera with natural shake creating documentary immersive feeling', image: camHandheld, category: 'effects' },

  // Style
  { id: 'charswap', name: 'Troca de Personagem', description: 'Transformação/morphing suave entre dois sujeitos diferentes na mesma cena.', prompt: 'Character swap smooth morphing transformation between two subjects', image: fxCharswap, category: 'style' },
];

interface PresetsGalleryProps {
  onSelectPreset: (preset: Preset) => void;
  onClose: () => void;
}

const PresetsGallery: React.FC<PresetsGalleryProps> = ({ onSelectPreset, onClose }) => {
  const [activeCategory, setActiveCategory] = useState('camera');
  const [hoveredPreset, setHoveredPreset] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<Preset | null>(null);

  const filteredPresets = PRESETS.filter((p) => p.category === activeCategory);

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
          <h2 className="text-xl font-bold">Presets de Câmera & Efeitos</h2>
          <p className="text-sm text-muted-foreground">Explore modelos prontos para usar nos seus vídeos com IA</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 px-6 py-3 border-b">
        {PRESET_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              activeCategory === cat.id
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
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
                  <div className="aspect-square relative">
                    <img
                      src={preset.image}
                      alt={preset.name}
                      className="w-full h-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                    {/* Hover play icon */}
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

                    {/* Name label */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h3 className="text-white font-semibold text-sm">{preset.name}</h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Detail modal */}
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
              <div className="relative aspect-video">
                <img
                  src={selectedDetail.image}
                  alt={selectedDetail.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4">
                  <Badge variant="secondary" className="mb-2 text-xs">
                    {PRESET_CATEGORIES.find(c => c.id === selectedDetail.category)?.label}
                  </Badge>
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
