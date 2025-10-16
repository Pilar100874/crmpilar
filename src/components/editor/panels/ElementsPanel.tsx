import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricImage, Text } from "fabric";
import { toast } from "sonner";
import * as LucideIcons from "lucide-react";
import AIImageDialog from "./AIImageDialog";

const ElementsPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [showAIDialog, setShowAIDialog] = useState(false);

  const iconElements = [
    // Bebidas & Café Premium
    { name: 'Café Quente', icon: 'Coffee', color: '#92400e' },
    { name: 'Xícara', icon: 'CupSoda', color: '#78350f' },
    { name: 'Champagne', icon: 'Champagne', color: '#f59e0b' },
    { name: 'Vinho', icon: 'Wine', color: '#7c2d12' },
    { name: 'Cerveja', icon: 'Beer', color: '#f59e0b' },
    { name: 'Coquetel', icon: 'Martini', color: '#ec4899' },
    
    // Comidas Gourmet
    { name: 'Bolo', icon: 'Cake', color: '#ec4899' },
    { name: 'Pizza', icon: 'Pizza', color: '#ea580c' },
    { name: 'Sorvete', icon: 'IceCream', color: '#06b6d4' },
    { name: 'Hambúrguer', icon: 'Sandwich', color: '#f59e0b' },
    { name: 'Utensílios', icon: 'Utensils', color: '#64748b' },
    { name: 'Chef', icon: 'ChefHat', color: '#ffffff' },
    
    // Festas & Celebração
    { name: 'Presente', icon: 'Gift', color: '#ec4899' },
    { name: 'Festa', icon: 'PartyPopper', color: '#8b5cf6' },
    { name: 'Balão', icon: 'BadgePercent', color: '#f43f5e' },
    { name: 'Coração', icon: 'Heart', color: '#ef4444' },
    { name: 'Estrela', icon: 'Star', color: '#fbbf24' },
    { name: 'Brilho', icon: 'Sparkles', color: '#a855f7' },
    { name: 'Fogos', icon: 'Rocket', color: '#f97316' },
    { name: 'Diamante', icon: 'Gem', color: '#06b6d4' },
    
    // Natureza & Eco
    { name: 'Folha', icon: 'Leaf', color: '#22c55e' },
    { name: 'Árvore', icon: 'TreePine', color: '#15803d' },
    { name: 'Flor', icon: 'Flower', color: '#ec4899' },
    { name: 'Reciclar', icon: 'Recycle', color: '#22c55e' },
    { name: 'Sol', icon: 'Sun', color: '#f59e0b' },
    { name: 'Nuvem', icon: 'Cloud', color: '#94a3b8' },
    { name: 'Montanha', icon: 'Mountain', color: '#64748b' },
    
    // Emoções & Social
    { name: 'Sorriso', icon: 'Smile', color: '#22c55e' },
    { name: 'Curtir', icon: 'ThumbsUp', color: '#3b82f6' },
    { name: 'Coroa', icon: 'Crown', color: '#f59e0b' },
    { name: 'Prêmio', icon: 'Award', color: '#f59e0b' },
    { name: 'Troféu', icon: 'Trophy', color: '#eab308' },
    { name: 'Medalha', icon: 'Medal', color: '#f59e0b' },
    { name: 'Raio', icon: 'Zap', color: '#eab308' },
    
    // Arte & Criatividade
    { name: 'Música', icon: 'Music', color: '#8b5cf6' },
    { name: 'Microfone', icon: 'Mic', color: '#ec4899' },
    { name: 'Paleta', icon: 'Palette', color: '#ec4899' },
    { name: 'Câmera', icon: 'Camera', color: '#6366f1' },
    { name: 'Pincel', icon: 'Paintbrush', color: '#f59e0b' },
    { name: 'Teatro', icon: 'Drama', color: '#8b5cf6' },
    
    // Comunicação
    { name: 'Telefone', icon: 'Phone', color: '#22c55e' },
    { name: 'Email', icon: 'Mail', color: '#3b82f6' },
    { name: 'Mensagem', icon: 'MessageCircle', color: '#10b981' },
    { name: 'Localização', icon: 'MapPin', color: '#ef4444' },
    { name: 'Instagram', icon: 'Instagram', color: '#ec4899' },
    { name: 'WhatsApp', icon: 'MessageSquare', color: '#22c55e' },
    
    // Negócios
    { name: 'Loja', icon: 'Store', color: '#8b5cf6' },
    { name: 'Carrinho', icon: 'ShoppingCart', color: '#3b82f6' },
    { name: 'Tag', icon: 'Tag', color: '#f59e0b' },
    { name: 'Desconto', icon: 'Percent', color: '#ef4444' },
    { name: 'Dinheiro', icon: 'DollarSign', color: '#22c55e' },
  ];

  const emojis = [
    // Bebidas & Comidas Deluxe
    '☕', '🍵', '🧃', '🥤', '🧋', '🍹', '🍺', '🍻', '🥂', '🍷', '🥃', '🍾',
    '🍰', '🧁', '🎂', '🍪', '🍩', '🍫', '🍬', '🍭', '🍮', '🍯', '🧇', '🥞',
    '🍕', '🍔', '🌭', '🍿', '🥗', '🍦', '🍧', '🍨', '🥧', '🍓', '🍒', '🍑',
    '🍋', '🍊', '🍉', '🍇', '🍌', '🍍', '🥥', '🥝', '🥑', '🍅', '🌶️', '🌽',
    
    // Festas & Celebrações
    '🎉', '🎊', '🎈', '🎁', '🎀', '🎂', '🎆', '🎇', '✨', '🎄', '🎃', '🎅',
    '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎵', '🎶', '🎸', '🎹', '🎺', '🎻',
    '🥁', '🎲', '🎯', '🎰', '🎳', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑',
    
    // Natureza & Flores
    '🌸', '🌺', '🌻', '🌼', '🌷', '🌹', '🥀', '🏵️', '🌿', '☘️', '🍀', '🌱',
    '🌲', '🌳', '🌴', '🌵', '🌾', '🍁', '🍂', '🍃', '🌾', '💐', '🌾', '🌿',
    '🌍', '🌎', '🌏', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙',
    '⭐', '🌟', '✨', '⚡', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️',
    '🌨️', '❄️', '☃️', '⛄', '🌬️', '💨', '🌪️', '🌫️', '🌈', '🔥', '💧', '🌊',
    
    // Corações & Emoções
    '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹',
    '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '💌', '💋', '💏',
    
    // Expressões & Gestos
    '😊', '😍', '🥰', '😘', '😻', '😎', '🤩', '🥳', '😇', '🤗', '🙂', '😉',
    '😁', '😄', '😃', '😀', '🤣', '😂', '😆', '😅', '🥹', '😌', '😏', '😋',
    '💯', '🔥', '✨', '⭐', '🌟', '💫', '⚡', '💥', '💢', '💨', '💦', '💤',
    
    // Gestos & Mãos
    '👍', '👏', '🙌', '💪', '✌️', '🤞', '🤟', '🤘', '👌', '🤌', '👈', '👉',
    '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤙', '💅', '🤝', '🙏',
    
    // Objetos Modernos
    '💎', '👑', '💍', '💄', '👗', '👠', '👜', '🎀', '🌂', '⌚', '📱', '💻',
    '🎮', '🕹️', '🎯', '🎪', '🎭', '🎨', '🖼️', '🎬', '📸', '📷', '📹', '🎥',
  ];

  const addIconElement = (iconName: string, color: string, name: string) => {
    if (!fabricCanvas) return;

    const IconComponent = (LucideIcons as any)[iconName];
    if (!IconComponent) {
      toast.error("Ícone não encontrado");
      return;
    }

    // Criar um container temporário
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.width = '200px';
    container.style.height = '200px';
    document.body.appendChild(container);

    // Renderizar o ícone
    import('react-dom/client').then(({ createRoot }) => {
      const root = createRoot(container);
      root.render(
        <IconComponent 
          size={200} 
          color={color} 
          strokeWidth={2}
          fill="none"
        />
      );
      
      setTimeout(() => {
        const svgElement = container.querySelector('svg');
        if (svgElement) {
          // Garantir que o SVG tenha os atributos corretos
          svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
          svgElement.setAttribute('width', '200');
          svgElement.setAttribute('height', '200');
          
          // Serializar o SVG completo
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const blob = new Blob([svgData], { type: 'image/svg+xml' });
          const url = URL.createObjectURL(blob);

          FabricImage.fromURL(url).then((img) => {
            img.scale(0.5);
            img.set({
              left: 100,
              top: 100,
            });
            fabricCanvas.add(img);
            fabricCanvas.setActiveObject(img);
            fabricCanvas.renderAll();
            toast.success(`${name} adicionado!`);
            URL.revokeObjectURL(url);
          }).catch((err) => {
            console.error('Erro ao carregar imagem:', err);
            toast.error("Erro ao adicionar ícone");
          }).finally(() => {
            root.unmount();
            document.body.removeChild(container);
          });
        } else {
          toast.error("Erro ao renderizar ícone");
          root.unmount();
          document.body.removeChild(container);
        }
      }, 100);
    });
  };

  const addEmoji = (emoji: string) => {
    if (!fabricCanvas) return;

    const text = new Text(emoji, {
      left: 100,
      top: 100,
      fontSize: 80,
      fontFamily: 'Arial',
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    toast.success('Emoji adicionado!');
  };



  return (
    <>
      <AIImageDialog open={showAIDialog} onOpenChange={setShowAIDialog} />
      
      <div className="w-full bg-background flex flex-col">
        <div className="px-4 py-3">
          <h3 className="font-semibold text-sm">Elementos</h3>
          <p className="text-xs text-muted-foreground">Ícones e símbolos</p>
        </div>

        <ScrollArea className="flex-1">

          <Tabs defaultValue="icons" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-8">
            <TabsTrigger value="icons" className="text-xs">Ícones</TabsTrigger>
            <TabsTrigger value="emojis" className="text-xs">Emojis</TabsTrigger>
          </TabsList>

          <TabsContent value="icons" className="px-4 py-3">
            <div className="grid grid-cols-5 gap-1.5">
              {iconElements.map((item) => {
                const IconComponent = (LucideIcons as any)[item.icon];
                return (
                  <Button
                    key={item.name}
                    variant="outline"
                    className="h-14 flex flex-col gap-0.5 p-1.5"
                    onClick={() => addIconElement(item.icon, item.color, item.name)}
                  >
                    {IconComponent && <IconComponent className="h-5 w-5" style={{ color: item.color }} />}
                    <span className="text-[9px] truncate w-full text-center leading-tight">{item.name}</span>
                  </Button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="emojis" className="px-4 py-3">
            <div className="grid grid-cols-7 gap-1">
              {emojis.map((emoji, index) => (
                <button
                  key={index}
                  className="h-10 flex items-center justify-center text-xl hover:bg-accent rounded transition-colors"
                  onClick={() => addEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </TabsContent>
          </Tabs>
        </ScrollArea>
      </div>
    </>
  );
};

export default ElementsPanel;
