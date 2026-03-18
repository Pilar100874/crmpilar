import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvas } from "@/contexts/CanvasContext";
import { Textbox } from "fabric";
import { toast } from "@/lib/toast-config";
import { Heading1, Heading2, Type, Search, Star } from "lucide-react";

const TextPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());

  // Carregar favoritos do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('favorite-fonts');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const addText = (type: 'heading' | 'subheading' | 'body', fontFamily = 'Arial') => {
    if (!fabricCanvas) return;

    let fontSize = 24;
    let fontWeight = 'normal';
    let textContent = 'Edite seu texto';

    switch (type) {
      case 'heading':
        fontSize = 48;
        fontWeight = 'bold';
        textContent = 'Adicione um título';
        break;
      case 'subheading':
        fontSize = 32;
        fontWeight = '600';
        textContent = 'Adicione um subtítulo';
        break;
      case 'body':
        fontSize = 18;
        textContent = 'Adicione seu texto';
        break;
    }

    const text = new Textbox(textContent, {
      left: 100,
      top: 100,
      width: 300,
      fontSize,
      fontWeight,
      fill: '#000000',
      fontFamily,
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    fabricCanvas.renderAll();
    requestAnimationFrame(() => {
      try {
        (text as any).enterEditing?.();
        (text as any).selectAll?.();
        ((text as any).hiddenTextarea as HTMLTextAreaElement | undefined)?.focus?.();
      } catch {
        // noop
      }
    });
    toast.success("Texto adicionado!");
  };

  const textStyles = [
    { type: 'heading' as const, icon: Heading1, label: 'Título', example: 'Grande e forte' },
    { type: 'subheading' as const, icon: Heading2, label: 'Subtítulo', example: 'Médio e claro' },
    { type: 'body' as const, icon: Type, label: 'Corpo de texto', example: 'Texto padrão' },
  ];

  // Lista expandida de fontes populares do Google Fonts
  const popularFonts = [
    // Sans Serif
    { name: 'Arial', family: 'Arial', category: 'Sans Serif' },
    { name: 'Roboto', family: 'Roboto', category: 'Sans Serif' },
    { name: 'Open Sans', family: 'Open Sans', category: 'Sans Serif' },
    { name: 'Lato', family: 'Lato', category: 'Sans Serif' },
    { name: 'Montserrat', family: 'Montserrat', category: 'Sans Serif' },
    { name: 'Poppins', family: 'Poppins', category: 'Sans Serif' },
    { name: 'Raleway', family: 'Raleway', category: 'Sans Serif' },
    { name: 'Nunito', family: 'Nunito', category: 'Sans Serif' },
    { name: 'Ubuntu', family: 'Ubuntu', category: 'Sans Serif' },
    { name: 'Inter', family: 'Inter', category: 'Sans Serif' },
    { name: 'Quicksand', family: 'Quicksand', category: 'Sans Serif' },
    { name: 'Josefin Sans', family: 'Josefin Sans', category: 'Sans Serif' },
    { name: 'Cabin', family: 'Cabin', category: 'Sans Serif' },
    { name: 'Barlow', family: 'Barlow', category: 'Sans Serif' },
    { name: 'Comfortaa', family: 'Comfortaa', category: 'Sans Serif' },
    { name: 'Titillium Web', family: 'Titillium Web', category: 'Sans Serif' },
    
    // Serif
    { name: 'Times New Roman', family: 'Times New Roman', category: 'Serif' },
    { name: 'Georgia', family: 'Georgia', category: 'Serif' },
    { name: 'Playfair Display', family: 'Playfair Display', category: 'Serif' },
    { name: 'Merriweather', family: 'Merriweather', category: 'Serif' },
    { name: 'Crimson Text', family: 'Crimson Text', category: 'Serif' },
    { name: 'Libre Baskerville', family: 'Libre Baskerville', category: 'Serif' },
    { name: 'Lora', family: 'Lora', category: 'Serif' },
    { name: 'Bitter', family: 'Bitter', category: 'Serif' },
    { name: 'Arvo', family: 'Arvo', category: 'Serif' },
    
    // Handwriting
    { name: 'Dancing Script', family: 'Dancing Script', category: 'Handwriting' },
    { name: 'Pacifico', family: 'Pacifico', category: 'Handwriting' },
    { name: 'Permanent Marker', family: 'Permanent Marker', category: 'Handwriting' },
    { name: 'Indie Flower', family: 'Indie Flower', category: 'Handwriting' },
    { name: 'Shadows Into Light', family: 'Shadows Into Light', category: 'Handwriting' },
    { name: 'Architects Daughter', family: 'Architects Daughter', category: 'Handwriting' },
    { name: 'Caveat', family: 'Caveat', category: 'Handwriting' },
    { name: 'Kalam', family: 'Kalam', category: 'Handwriting' },
    { name: 'Patrick Hand', family: 'Patrick Hand', category: 'Handwriting' },
    { name: 'Amatic SC', family: 'Amatic SC', category: 'Handwriting' },
    { name: 'Sacramento', family: 'Sacramento', category: 'Handwriting' },
    { name: 'Satisfy', family: 'Satisfy', category: 'Handwriting' },
    
    // Display
    { name: 'Oswald', family: 'Oswald', category: 'Display' },
    { name: 'Bebas Neue', family: 'Bebas Neue', category: 'Display' },
    { name: 'Anton', family: 'Anton', category: 'Display' },
    { name: 'Righteous', family: 'Righteous', category: 'Display' },
    { name: 'Bangers', family: 'Bangers', category: 'Display' },
    { name: 'Fredoka One', family: 'Fredoka One', category: 'Display' },
    { name: 'Bungee', family: 'Bungee', category: 'Display' },
    { name: 'Russo One', family: 'Russo One', category: 'Display' },
    { name: 'Black Ops One', family: 'Black Ops One', category: 'Display' },
    { name: 'Lobster', family: 'Lobster', category: 'Display' },
    { name: 'Paytone One', family: 'Paytone One', category: 'Display' },
    { name: 'Press Start 2P', family: 'Press Start 2P', category: 'Display' },
    { name: 'Courgette', family: 'Courgette', category: 'Display' },
    { name: 'Alfa Slab One', family: 'Alfa Slab One', category: 'Display' },
    
    // Monospace
    { name: 'Courier New', family: 'Courier New', category: 'Monospace' },
    { name: 'Orbitron', family: 'Orbitron', category: 'Monospace' },
    { name: 'Space Mono', family: 'Space Mono', category: 'Monospace' },
    { name: 'Source Code Pro', family: 'Source Code Pro', category: 'Monospace' },
  ];

  // Lista adicional de fontes para busca (mais 250 fontes)
  const additionalFonts = [
    'Abel', 'Abril Fatface', 'Acme', 'Alegreya', 'Alegreya Sans', 'Almarai', 'Amiri', 'Arsenal', 'Asap', 'Asap Condensed',
    'Assistant', 'Audiowide', 'Barlow Condensed', 'Barlow Semi Condensed', 'Be Vietnam Pro', 'Bree Serif', 'Cairo', 'Cardo',
    'Catamaran', 'Chakra Petch', 'Chivo', 'Concert One', 'Cormorant', 'Creepster', 'DM Sans', 'DM Serif Display', 
    'Dosis', 'EB Garamond', 'Economica', 'Electrolize', 'Epilogue', 'Exo', 'Exo 2', 'Fascinate', 'Fira Sans', 'Fjalla One',
    'Frank Ruhl Libre', 'Gelasio', 'Gemunu Libre', 'Heebo', 'Hind', 'Hind Madurai', 'Hind Siliguri', 'IBM Plex Mono',
    'IBM Plex Sans', 'IBM Plex Serif', 'Inconsolata', 'Indie Flower', 'Inknut Antiqua', 'Jost', 'Kanit', 'Karla', 
    'Kaushan Script', 'Kosugi Maru', 'Kreon', 'Lexend', 'Libre Franklin', 'Lilita One', 'Literata', 'Liu Jian Mao Cao',
    'M PLUS Rounded 1c', 'Macondo', 'Manrope', 'Marck Script', 'Markazi Text', 'Maven Pro', 'Merienda', 'Miriam Libre',
    'Mukta', 'Mulish', 'News Cycle', 'Noto Sans', 'Noto Sans JP', 'Noto Sans KR', 'Noto Serif', 'Noto Serif JP',
    'Old Standard TT', 'Overpass', 'Oxygen', 'PT Sans', 'PT Sans Caption', 'PT Sans Narrow', 'PT Serif', 'Pathway Gothic One',
    'Patua One', 'Philosopher', 'Play', 'Podkova', 'Poiret One', 'Pontano Sans', 'Prompt', 'Proza Libre', 'Public Sans',
    'Quantico', 'Quattrocento', 'Quattrocento Sans', 'Questrial', 'Rajdhani', 'Red Hat Display', 'Red Hat Text', 'Righteous',
    'Roboto Condensed', 'Roboto Mono', 'Roboto Slab', 'Rokkitt', 'Rubik', 'Ruda', 'Rye', 'Saira', 'Saira Condensed',
    'Sawarabi Gothic', 'Secular One', 'Sen', 'Shadows Into Light Two', 'Sigmar One', 'Signika', 'Signika Negative',
    'Slabo 27px', 'Solway', 'Sora', 'Space Grotesk', 'Spartan', 'Spectral', 'Special Elite', 'Staatliches', 'Stint Ultra Condensed',
    'Sue Ellen Francisco', 'Syne', 'Tajawal', 'Teko', 'Tinos', 'Trocchi', 'Turret Road', 'Varela', 'Varela Round', 'Viga',
    'Voltaire', 'Vollkorn', 'Work Sans', 'Yanone Kaffeesatz', 'Yantramanav', 'Yellowtail', 'Yeseva One', 'Zeyada', 'Zilla Slab',
    'Advent Pro', 'Archivo', 'Archivo Black', 'Archivo Narrow', 'Asap', 'Athiti', 'Average', 'B612', 'B612 Mono', 'Balsamiq Sans',
    'Bangers', 'Basic', 'Bellefair', 'BenchNine', 'Big Shoulders Display', 'Big Shoulders Text', 'Biryani', 'Black Han Sans',
    'Blinker', 'Bonbon', 'Boogaloo', 'Bowlby One', 'Bubblegum Sans', 'Cabin Condensed', 'Calistoga', 'Cantarell', 'Carme',
    'Carter One', 'Caudex', 'Caveat Brush', 'Changa', 'Changa One', 'Chau Philomene One', 'Chonburi', 'Cinzel', 'Cinzel Decorative',
    'Clicker Script', 'Coda', 'Coda Caption', 'Codystar', 'Combo', 'Comfortaa', 'Commissioner', 'Cookie', 'Copse', 'Corben',
    'Cousine', 'Coustard', 'Covered By Your Grace', 'Crafty Girls', 'Creepster', 'Crimson Pro', 'Cuprum', 'Cutive', 'Cutive Mono',
    'Damion', 'Days One', 'Delius', 'Didact Gothic', 'Domine', 'Donegal One', 'Doppio One', 'Dorsa', 'Duru Sans',
    'Dynalight', 'Eater', 'Encode Sans', 'Encode Sans Condensed', 'Encode Sans Expanded', 'Encode Sans Semi Condensed',
    'Enriqueta', 'Expletus Sans', 'Faustina', 'Federo', 'Fira Sans Condensed', 'Fira Sans Extra Condensed', 'Fraunces',
    'Fredericka the Great', 'Fredoka', 'Fresca', 'Gabriela', 'Gafata', 'Galada', 'Gentium Basic', 'Gilda Display',
    'Glory', 'Goldman', 'Gotu', 'Graduate', 'Grand Hotel', 'Grandstander', 'Great Vibes', 'Grenze', 'Grenze Gotisch',
    'Gudea', 'Habibi', 'Hammersmith One', 'Hanalei', 'Hanalei Fill', 'Handlee', 'Hanuman', 'Happy Monkey', 'Harmattan',
    'Headland One', 'Henny Penny', 'Herr Von Muellerhoff', 'Hi Melody', 'Hind Guntur', 'Holtwood One SC', 'Homemade Apple',
  ];

  const allSearchableFonts = [...popularFonts.map(f => f.family), ...additionalFonts];

  const loadFont = (fontFamily: string) => {
    if (loadedFonts.has(fontFamily)) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
    
    setLoadedFonts(prev => new Set([...prev, fontFamily]));
  };

  const addTextWithFont = (fontFamily: string) => {
    if (!fabricCanvas) return;

    // Carregar fonte se não estiver carregada
    loadFont(fontFamily);

    const text = new Textbox('Edite seu texto', {
      left: 100,
      top: 100,
      width: 300,
      fontSize: 24,
      fill: '#000000',
      fontFamily,
    });

    fabricCanvas.add(text);
    // NÃO seleciona automaticamente
    fabricCanvas.discardActiveObject();
    fabricCanvas.renderAll();
    toast.success(`Texto adicionado com fonte ${fontFamily}!`);
  };

  const toggleFavorite = (fontFamily: string) => {
    const newFavorites = favorites.includes(fontFamily)
      ? favorites.filter(f => f !== fontFamily)
      : [...favorites, fontFamily];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite-fonts', JSON.stringify(newFavorites));
    toast.success(favorites.includes(fontFamily) ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
  };

  const filteredFonts = allSearchableFonts.filter(font =>
    font.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const favoriteFontsList = allSearchableFonts.filter(font => favorites.includes(font));

  return (
    <div className="w-full bg-background flex flex-col">
      <div className="px-4 py-3">
        <h3 className="font-semibold text-sm">Adicionar Texto</h3>
        <p className="text-xs text-muted-foreground">Fontes e estilos</p>
      </div>

      <ScrollArea className="flex-1">
        <Tabs defaultValue="popular" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8 mx-4" style={{ width: 'calc(100% - 2rem)' }}>
            <TabsTrigger value="popular" className="text-xs">Popular</TabsTrigger>
            <TabsTrigger value="search" className="text-xs">Buscar</TabsTrigger>
            <TabsTrigger value="favorites" className="text-xs">
              <Star className="h-3 w-3" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="popular" className="px-4 py-3">
            <div className="space-y-0.5">
              {popularFonts.map((font) => (
                <div key={font.family} className="flex items-center gap-1">
                  <button
                    className="flex-1 p-2 text-left rounded hover:bg-accent transition-colors"
                    style={{ fontFamily: font.family }}
                    onClick={() => addTextWithFont(font.family)}
                  >
                    <div className="font-medium text-sm truncate">{font.name}</div>
                    <div className="text-[10px] text-muted-foreground">{font.category}</div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => toggleFavorite(font.family)}
                  >
                    <Star className={`h-3 w-3 ${favorites.includes(font.family) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="search" className="px-4 py-3 space-y-2.5">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar fontes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {filteredFonts.length} fontes
            </div>
            <div className="space-y-0.5">
              {filteredFonts.slice(0, 50).map((font) => (
                <div key={font} className="flex items-center gap-1">
                  <button
                    className="flex-1 p-2 text-left rounded hover:bg-accent transition-colors"
                    style={{ fontFamily: font }}
                    onClick={() => addTextWithFont(font)}
                  >
                    <div className="font-medium text-sm truncate">{font}</div>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => toggleFavorite(font)}
                  >
                    <Star className={`h-3 w-3 ${favorites.includes(font) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                  </Button>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="favorites" className="px-4 py-3">
            {favoriteFontsList.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Star className="h-8 w-8 mx-auto mb-1.5 opacity-20" />
                <p className="text-xs">Nenhuma favorita</p>
                <p className="text-[10px] mt-0.5">Clique na ⭐ para adicionar</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {favoriteFontsList.map((font) => (
                  <div key={font} className="flex items-center gap-1">
                    <button
                      className="flex-1 p-2 text-left rounded hover:bg-accent transition-colors"
                      style={{ fontFamily: font }}
                      onClick={() => addTextWithFont(font)}
                    >
                      <div className="font-medium text-sm truncate">{font}</div>
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={() => toggleFavorite(font)}
                    >
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </ScrollArea>
    </div>
  );
};

export default TextPanel;
