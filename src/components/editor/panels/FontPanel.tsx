import { useEffect, useState } from "react";
import { useCanvas } from "@/contexts/CanvasContext";
import { FabricObject, Shadow } from "fabric";
import { Input } from "@/components/ui/input";
import { Type, Search, Star, Heart, AlignLeft, AlignCenter, AlignRight, AlignJustify, Palette, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/lib/toast-config";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

const FontPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [currentFont, setCurrentFont] = useState("Arial");
  const [fontSize, setFontSize] = useState(16);
  const [searchTerm, setSearchTerm] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [googleFontsSearch, setGoogleFontsSearch] = useState("");
  const [showGoogleFonts, setShowGoogleFonts] = useState(false);
  
  // Text styles
  const [textStyles, setTextStyles] = useState<string[]>([]);
  const [textColor, setTextColor] = useState("#000000");
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  
  // Spacing
  const [letterSpacing, setLetterSpacing] = useState(0);
  const [lineHeight, setLineHeight] = useState(1.16);
  const [textAlign, setTextAlign] = useState("left");
  
  // Effects
  const [shadowBlur, setShadowBlur] = useState(0);
  const [shadowOffsetX, setShadowOffsetX] = useState(0);
  const [shadowOffsetY, setShadowOffsetY] = useState(0);
  const [shadowColor, setShadowColor] = useState("#000000");
  const [textOpacity, setTextOpacity] = useState(1);
  const [backgroundColor, setBackgroundColor] = useState("");
  
  // Transform
  const [textTransform, setTextTransform] = useState("none");
  const [strikethrough, setStrikethrough] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('favorite-fonts');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  const popularFonts = [
    { name: 'Arial', family: 'Arial', category: 'Sans Serif' },
    { name: 'Roboto', family: 'Roboto', category: 'Sans Serif' },
    { name: 'Open Sans', family: 'Open Sans', category: 'Sans Serif' },
    { name: 'Lato', family: 'Lato', category: 'Sans Serif' },
    { name: 'Montserrat', family: 'Montserrat', category: 'Sans Serif' },
    { name: 'Poppins', family: 'Poppins', category: 'Sans Serif' },
    { name: 'Playfair Display', family: 'Playfair Display', category: 'Serif' },
    { name: 'Merriweather', family: 'Merriweather', category: 'Serif' },
    { name: 'Dancing Script', family: 'Dancing Script', category: 'Handwriting' },
    { name: 'Pacifico', family: 'Pacifico', category: 'Handwriting' },
    { name: 'Bebas Neue', family: 'Bebas Neue', category: 'Display' },
    { name: 'Lobster', family: 'Lobster', category: 'Display' },
  ];

  const additionalFonts = [
    'Raleway', 'Ubuntu', 'Inter', 'Quicksand', 'Josefin Sans', 'Nunito',
    'Crimson Text', 'Lora', 'Indie Flower', 'Permanent Marker', 'Oswald', 'Anton'
  ];

  const googleFontsList = [
    'Abril Fatface', 'Amatic SC', 'Archivo', 'Bebas Neue', 'Bitter', 'Caveat',
    'Comfortaa', 'Dancing Script', 'DM Sans', 'EB Garamond', 'Fira Sans', 'Gloock',
    'IBM Plex Sans', 'Inconsolata', 'Inter', 'Karma', 'Lato', 'Libre Baskerville',
    'Lobster', 'Lora', 'Manrope', 'Merriweather', 'Montserrat', 'Mukta', 'Noto Sans',
    'Nunito', 'Open Sans', 'Oswald', 'Outfit', 'Oxygen', 'Pacifico', 'Playfair Display',
    'Plus Jakarta Sans', 'Poppins', 'PT Sans', 'PT Serif', 'Quicksand', 'Raleway',
    'Roboto', 'Roboto Condensed', 'Roboto Mono', 'Roboto Slab', 'Rubik', 'Source Code Pro',
    'Source Sans Pro', 'Space Grotesk', 'Space Mono', 'Spectral', 'Titan One', 'Ubuntu',
    'Work Sans', 'Zilla Slab'
  ];

  const allSearchableFonts = [...popularFonts.map(f => f.family), ...additionalFonts];
  const filteredGoogleFonts = googleFontsList.filter(font => 
    font.toLowerCase().includes(googleFontsSearch.toLowerCase())
  );

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = () => {
      const activeObject = fabricCanvas.getActiveObject();
      setSelectedObject(activeObject || null);

      if (activeObject) {
        const objType = (activeObject as any).type;
        
        if (objType === 'textbox' || objType === 'text' || objType === 'i-text') {
          setCurrentFont((activeObject.get('fontFamily') as string) || 'Arial');
          setFontSize((activeObject.get('fontSize') as number) || 16);
          setTextColor((activeObject.get('fill') as string) || "#000000");
          setStrokeColor((activeObject.get('stroke') as string) || "#000000");
          setStrokeWidth((activeObject.get('strokeWidth') as number) || 0);
          setLetterSpacing((activeObject.get('charSpacing') as number) || 0);
          setLineHeight((activeObject.get('lineHeight') as number) || 1.16);
          setTextAlign((activeObject.get('textAlign') as string) || "left");
          setTextOpacity((activeObject.get('opacity') as number) || 1);
          setBackgroundColor((activeObject.get('backgroundColor') as string) || "");
          setStrikethrough((activeObject.get('linethrough') as boolean) || false);
          
          const shadow = activeObject.shadow as Shadow | null;
          if (shadow && typeof shadow === 'object') {
            setShadowBlur(shadow.blur || 0);
            setShadowOffsetX(shadow.offsetX || 0);
            setShadowOffsetY(shadow.offsetY || 0);
            setShadowColor(shadow.color || "#000000");
          } else {
            setShadowBlur(0);
            setShadowOffsetX(0);
            setShadowOffsetY(0);
            setShadowColor("#000000");
          }
          
          const styles: string[] = [];
          if (activeObject.get('fontWeight') === 'bold') styles.push('bold');
          if (activeObject.get('fontStyle') === 'italic') styles.push('italic');
          if (activeObject.get('underline')) styles.push('underline');
          setTextStyles(styles);
        }
      }
    };

    const events = ['selection:created', 'selection:updated', 'selection:changed', 'object:modified'] as const;
    events.forEach((eventName) => fabricCanvas.on(eventName as any, handleSelection));
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    handleSelection();

    return () => {
      events.forEach((eventName) => fabricCanvas.off(eventName as any, handleSelection));
      fabricCanvas.off('selection:cleared', () => setSelectedObject(null));
    };
  }, [fabricCanvas]);

  const loadFont = (fontFamily: string) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  };

  const handleFontChange = (font: string) => {
    setCurrentFont(font);
    loadFont(font);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && (current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) {
        current.set('fontFamily', font);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    setFontSize(value[0]);
    if (fabricCanvas) {
      const current = fabricCanvas.getActiveObject() as any;
      if (current && (current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) {
        current.set('fontSize', value[0]);
        fabricCanvas.renderAll();
      }
    }
  };

  const handleTextStylesChange = (values: string[]) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('fontWeight', values.includes('bold') ? 'bold' : 'normal');
    current.set('fontStyle', values.includes('italic') ? 'italic' : 'normal');
    current.set('underline', values.includes('underline'));
    setTextStyles(values);
    fabricCanvas.renderAll();
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('fill', e.target.value);
    setTextColor(e.target.value);
    fabricCanvas.renderAll();
  };

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('stroke', e.target.value);
    setStrokeColor(e.target.value);
    fabricCanvas.renderAll();
  };

  const handleStrokeWidthChange = (value: number[]) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('strokeWidth', value[0]);
    setStrokeWidth(value[0]);
    fabricCanvas.renderAll();
  };

  const handleLetterSpacingChange = (value: number[]) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('charSpacing', value[0]);
    setLetterSpacing(value[0]);
    fabricCanvas.renderAll();
  };

  const handleLineHeightChange = (value: number[]) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('lineHeight', value[0]);
    setLineHeight(value[0]);
    fabricCanvas.renderAll();
  };

  const handleTextAlignChange = (value: string) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('textAlign', value);
    setTextAlign(value);
    fabricCanvas.renderAll();
  };

  const updateShadow = (blur: number, offsetX: number, offsetY: number, color: string) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    if (blur === 0 && offsetX === 0 && offsetY === 0) {
      current.set('shadow', null);
    } else {
      current.set('shadow', new Shadow({ color, blur, offsetX, offsetY }));
    }
    fabricCanvas.renderAll();
  };

  const handleOpacityChange = (value: number[]) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('opacity', value[0]);
    setTextOpacity(value[0]);
    fabricCanvas.renderAll();
  };

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('backgroundColor', e.target.value);
    setBackgroundColor(e.target.value);
    fabricCanvas.renderAll();
  };

  const handleTextTransformChange = (value: string) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    const currentText = current.text || '';
    let transformedText = currentText;
    
    switch(value) {
      case 'uppercase':
        transformedText = currentText.toUpperCase();
        break;
      case 'lowercase':
        transformedText = currentText.toLowerCase();
        break;
      case 'capitalize':
        transformedText = currentText.split(' ').map((word: string) => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
    }
    
    current.set('text', transformedText);
    setTextTransform(value);
    fabricCanvas.renderAll();
  };

  const handleStrikethroughChange = (checked: boolean) => {
    if (!fabricCanvas) return;
    const current = fabricCanvas.getActiveObject() as any;
    if (!current || !(current.type === 'textbox' || current.type === 'text' || current.type === 'i-text')) return;
    
    current.set('linethrough', checked);
    setStrikethrough(checked);
    fabricCanvas.renderAll();
  };

  const quickColors = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'];

  const toggleFavorite = (fontFamily: string) => {
    const newFavorites = favorites.includes(fontFamily)
      ? favorites.filter(f => f !== fontFamily)
      : [...favorites, fontFamily];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite-fonts', JSON.stringify(newFavorites));
    toast.success(favorites.includes(fontFamily) ? 'Removido dos favoritos' : 'Adicionado aos favoritos');
  };

  const filteredFonts = allSearchableFonts.filter((font) => font.toLowerCase().includes(searchTerm.toLowerCase()));
  const favoriteFontsList = allSearchableFonts.filter(font => favorites.includes(font));

  const active = fabricCanvas?.getActiveObject() as FabricObject | null;
  const objType = (active as any)?.type;
  const isTextSelected = objType === 'textbox' || objType === 'text' || objType === 'i-text';

  if (!active || !isTextSelected) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Type className="h-4 w-4" />
            Fontes
          </CardTitle>
        </CardHeader>
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <Type className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Selecione um texto para editar suas fontes</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col bg-background/30 backdrop-blur-sm">
      <CardHeader className="pb-2 px-2 sm:px-3 pt-2 sm:pt-3">
        <CardTitle className="text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2">
          <Type className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          Fontes
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <div className="px-2 sm:px-3 pb-2 sm:pb-3 space-y-1.5 sm:space-y-2">
          {/* Font Size */}
          <div className="space-y-1">
            <Label className="text-[10px]">Tamanho: {fontSize}px</Label>
            <Slider value={[fontSize]} onValueChange={handleFontSizeChange} min={8} max={200} step={1} />
          </div>

          {/* Text Styles */}
          <div className="space-y-1">
            <Label className="text-[10px]">Estilos</Label>
            <ToggleGroup type="multiple" value={textStyles} onValueChange={handleTextStylesChange} className="justify-start">
              <ToggleGroupItem value="bold" size="sm" className="h-7 w-7 text-xs"><span className="font-bold">B</span></ToggleGroupItem>
              <ToggleGroupItem value="italic" size="sm" className="h-7 w-7 text-xs"><span className="italic">I</span></ToggleGroupItem>
              <ToggleGroupItem value="underline" size="sm" className="h-7 w-7 text-xs"><span className="underline">U</span></ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Search */}
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input type="text" placeholder="Buscar fonte..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-7 h-7 text-xs" />
            </div>
            <Dialog open={showGoogleFonts} onOpenChange={setShowGoogleFonts}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-7 px-2" title="Google Fonts">
                  <Globe className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-sm">Google Fonts</DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground">
                    Pesquise, visualize e aplique fontes do Google.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                    <Input 
                      type="text" 
                      placeholder="Pesquisar fontes do Google..." 
                      value={googleFontsSearch} 
                      onChange={(e) => setGoogleFontsSearch(e.target.value)} 
                      className="pl-7 h-8 text-xs" 
                    />
                  </div>
                  <ScrollArea className="h-72">
                    <div className="space-y-1 pr-3">
                      {filteredGoogleFonts.map((font) => (
                        <button
                          key={font}
                          onClick={() => {
                            handleFontChange(font);
                            setShowGoogleFonts(false);
                            toast.success(`Fonte ${font} aplicada`);
                          }}
                          className="w-full text-left px-3 py-2 rounded text-sm bg-muted hover:bg-muted/80 transition-colors"
                          style={{ fontFamily: font }}
                        >
                          {font}
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="popular" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-7">
              <TabsTrigger value="popular" className="text-xs"><Star className="h-3 w-3 mr-1" />Popular</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">Todas</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs"><Heart className="h-3 w-3" /></TabsTrigger>
            </TabsList>

            <TabsContent value="popular" className="mt-3">
              <ScrollArea className="h-40">
                <div className="space-y-1 pr-3">
                  {popularFonts.map((font) => (
                    <div key={font.family} className="flex items-center gap-1">
                      <button
                        onClick={() => handleFontChange(font.family)}
                        className={`flex-1 text-left px-2 py-1.5 rounded text-xs ${currentFont === font.family ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                        style={{ fontFamily: font.family }}
                      >
                        {font.name}
                      </button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleFavorite(font.family)}>
                        <Star className={`h-3 w-3 ${favorites.includes(font.family) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="all" className="mt-3">
              <ScrollArea className="h-40">
                <div className="space-y-1 pr-3">
                  {filteredFonts.slice(0, 20).map((font) => (
                    <button
                      key={font}
                      onClick={() => handleFontChange(font)}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs ${currentFont === font ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                      style={{ fontFamily: font }}
                    >
                      {font}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="favorites" className="mt-3">
              <ScrollArea className="h-40">
                {favoriteFontsList.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs">Nenhuma fonte favorita</p>
                  </div>
                ) : (
                  <div className="space-y-1 pr-3">
                    {favoriteFontsList.map((font) => (
                      <button key={font} onClick={() => handleFontChange(font)} className={`w-full text-left px-2 py-1.5 rounded text-xs ${currentFont === font ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`} style={{ fontFamily: font }}>
                        {font}
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Advanced Options - Accordion */}
          <Accordion type="multiple" className="w-full border-t pt-1.5 space-y-0.5">
            {/* Colors */}
            <AccordionItem value="colors" className="border-b border-border/50">
              <AccordionTrigger className="text-[10px] py-1.5 hover:no-underline"><div className="flex items-center gap-1.5"><Palette className="h-3 w-3" />Cores</div></AccordionTrigger>
              <AccordionContent className="space-y-2 pb-2">
                <div className="space-y-1">
                  <Label className="text-[10px]">Cor do Texto</Label>
                  <div className="flex gap-1">
                    <Input type="color" value={textColor} onChange={handleTextColorChange} className="w-8 h-7 p-0.5" />
                    <Input type="text" value={textColor} onChange={handleTextColorChange} className="flex-1 h-7 text-[10px]" />
                  </div>
                  <div className="flex gap-0.5 flex-wrap">
                    {quickColors.map((color) => (
                      <button key={color} onClick={() => { const e = { target: { value: color } } as React.ChangeEvent<HTMLInputElement>; handleTextColorChange(e); }} className="w-4 h-4 rounded border hover:scale-110 transition-transform" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Fundo do Texto</Label>
                  <Input type="color" value={backgroundColor || "#ffffff"} onChange={handleBackgroundColorChange} className="w-full h-7" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[10px]">Contorno: {strokeWidth}px</Label>
                  <Input type="color" value={strokeColor} onChange={handleStrokeColorChange} className="w-full h-7" />
                  <Slider value={[strokeWidth]} onValueChange={handleStrokeWidthChange} min={0} max={20} step={0.5} />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Spacing */}
            <AccordionItem value="spacing" className="border-b border-border/50">
              <AccordionTrigger className="text-[10px] py-1.5 hover:no-underline">Espaçamento</AccordionTrigger>
              <AccordionContent className="space-y-2 pb-2">
                <div className="space-y-2">
                  <Label className="text-xs">Entre letras: {letterSpacing}</Label>
                  <Slider value={[letterSpacing]} onValueChange={handleLetterSpacingChange} min={-200} max={800} step={10} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Altura da linha: {lineHeight.toFixed(2)}</Label>
                  <Slider value={[lineHeight]} onValueChange={handleLineHeightChange} min={0.5} max={3} step={0.01} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Alinhamento</Label>
                  <div className="flex gap-1">
                    <Button variant={textAlign === 'left' ? 'default' : 'outline'} size="sm" className="flex-1 h-8" onClick={() => handleTextAlignChange('left')}><AlignLeft className="h-3 w-3" /></Button>
                    <Button variant={textAlign === 'center' ? 'default' : 'outline'} size="sm" className="flex-1 h-8" onClick={() => handleTextAlignChange('center')}><AlignCenter className="h-3 w-3" /></Button>
                    <Button variant={textAlign === 'right' ? 'default' : 'outline'} size="sm" className="flex-1 h-8" onClick={() => handleTextAlignChange('right')}><AlignRight className="h-3 w-3" /></Button>
                    <Button variant={textAlign === 'justify' ? 'default' : 'outline'} size="sm" className="flex-1 h-8" onClick={() => handleTextAlignChange('justify')}><AlignJustify className="h-3 w-3" /></Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Shadow */}
            <AccordionItem value="shadow">
              <AccordionTrigger className="text-xs py-2">Sombra</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Desfoque: {shadowBlur}px</Label>
                  <Slider value={[shadowBlur]} onValueChange={(v) => { setShadowBlur(v[0]); updateShadow(v[0], shadowOffsetX, shadowOffsetY, shadowColor); }} min={0} max={50} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Deslocamento X: {shadowOffsetX}px</Label>
                  <Slider value={[shadowOffsetX]} onValueChange={(v) => { setShadowOffsetX(v[0]); updateShadow(shadowBlur, v[0], shadowOffsetY, shadowColor); }} min={-50} max={50} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Deslocamento Y: {shadowOffsetY}px</Label>
                  <Slider value={[shadowOffsetY]} onValueChange={(v) => { setShadowOffsetY(v[0]); updateShadow(shadowBlur, shadowOffsetX, v[0], shadowColor); }} min={-50} max={50} step={1} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Cor da Sombra</Label>
                  <Input type="color" value={shadowColor} onChange={(e) => { setShadowColor(e.target.value); updateShadow(shadowBlur, shadowOffsetX, shadowOffsetY, e.target.value); }} className="w-full h-8" />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Effects */}
            <AccordionItem value="effects">
              <AccordionTrigger className="text-xs py-2">Efeitos</AccordionTrigger>
              <AccordionContent className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Opacidade: {Math.round(textOpacity * 100)}%</Label>
                  <Slider value={[textOpacity]} onValueChange={handleOpacityChange} min={0} max={1} step={0.01} />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Transformação</Label>
                  <Select value={textTransform} onValueChange={handleTextTransformChange}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Normal</SelectItem>
                      <SelectItem value="uppercase">MAIÚSCULAS</SelectItem>
                      <SelectItem value="lowercase">minúsculas</SelectItem>
                      <SelectItem value="capitalize">Capitalizar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">Tachado</Label>
                  <Switch checked={strikethrough} onCheckedChange={handleStrikethroughChange} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </Card>
  );
};

export default FontPanel;
