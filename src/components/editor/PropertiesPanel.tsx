import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCanvas } from "@/contexts/CanvasContext";
import { toast } from "@/lib/toast-config";
import { Settings, Type, Bold, Italic, Underline, Palette, Search, Star, AlignLeft, AlignCenter, AlignRight, AlignJustify, Minus } from "lucide-react";
import { FabricText, IText, Shadow } from "fabric";
import { useEffect, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PropertiesPanel = () => {
  const { fabricCanvas } = useCanvas();
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [opacity, setOpacity] = useState(100);
  
  // Text properties
  const [fontSize, setFontSize] = useState(16);
  const [fontFamily, setFontFamily] = useState("Arial");
  const [textColor, setTextColor] = useState("#000000");
  const [textStyles, setTextStyles] = useState<string[]>([]);
  const [strokeColor, setStrokeColor] = useState("#000000");
  const [strokeWidth, setStrokeWidth] = useState(0);
  const [fontSearch, setFontSearch] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  
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

  // Load favorites
  useEffect(() => {
    const saved = localStorage.getItem('favorite-fonts');
    if (saved) {
      setFavorites(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleSelection = () => {
      const active = fabricCanvas.getActiveObject();
      setSelectedObject(active);
      if (active) {
        setOpacity(Math.round((active.opacity || 1) * 100));
        
        // Update text properties if text is selected
        if (active instanceof IText || active instanceof FabricText) {
          setFontSize((active.fontSize as number) || 16);
          setFontFamily((active.fontFamily as string) || "Arial");
          setTextColor((active.fill as string) || "#000000");
          setStrokeColor((active.stroke as string) || "#000000");
          setStrokeWidth((active.strokeWidth as number) || 0);
          setLetterSpacing((active.charSpacing as number) || 0);
          setLineHeight((active.lineHeight as number) || 1.16);
          setTextAlign((active.textAlign as string) || "left");
          setTextOpacity((active.opacity as number) || 1);
          setBackgroundColor((active.backgroundColor as string) || "");
          setStrikethrough((active.linethrough as boolean) || false);
          
          // Shadow
          const shadow = active.shadow as Shadow | null;
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
          if (active.fontWeight === 'bold') styles.push('bold');
          if (active.fontStyle === 'italic') styles.push('italic');
          if (active.underline) styles.push('underline');
          setTextStyles(styles);
        }
      }
    };

    fabricCanvas.on('selection:created', handleSelection);
    fabricCanvas.on('selection:updated', handleSelection);
    fabricCanvas.on('selection:cleared', () => setSelectedObject(null));

    return () => {
      fabricCanvas.off('selection:created', handleSelection);
      fabricCanvas.off('selection:updated', handleSelection);
      fabricCanvas.off('selection:cleared');
    };
  }, [fabricCanvas]);

  const handleOpacityChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    const newOpacity = value[0] / 100;
    selectedObject.set('opacity', newOpacity);
    setOpacity(value[0]);
    fabricCanvas.renderAll();
  };

  const handleFontSizeChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('fontSize', value[0]);
    setFontSize(value[0]);
    fabricCanvas.renderAll();
  };

  const handleFontFamilyChange = (value: string) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('fontFamily', value);
    setFontFamily(value);
    fabricCanvas.renderAll();
  };

  const handleTextColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const color = e.target.value;
    selectedObject.set('fill', color);
    setTextColor(color);
    fabricCanvas.renderAll();
  };

  const handleTextStylesChange = (values: string[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('fontWeight', values.includes('bold') ? 'bold' : 'normal');
    selectedObject.set('fontStyle', values.includes('italic') ? 'italic' : 'normal');
    selectedObject.set('underline', values.includes('underline'));
    setTextStyles(values);
    fabricCanvas.renderAll();
  };

  const handleStrokeColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const color = e.target.value;
    selectedObject.set('stroke', color);
    setStrokeColor(color);
    fabricCanvas.renderAll();
  };

  const handleStrokeWidthChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('strokeWidth', value[0]);
    setStrokeWidth(value[0]);
    fabricCanvas.renderAll();
  };

  // Spacing handlers
  const handleLetterSpacingChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('charSpacing', value[0]);
    setLetterSpacing(value[0]);
    fabricCanvas.renderAll();
  };

  const handleLineHeightChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('lineHeight', value[0]);
    setLineHeight(value[0]);
    fabricCanvas.renderAll();
  };

  const handleTextAlignChange = (value: string) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('textAlign', value);
    setTextAlign(value);
    fabricCanvas.renderAll();
  };

  // Effects handlers
  const handleShadowBlurChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const blur = value[0];
    setShadowBlur(blur);
    updateShadow(blur, shadowOffsetX, shadowOffsetY, shadowColor);
  };

  const handleShadowOffsetXChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const offsetX = value[0];
    setShadowOffsetX(offsetX);
    updateShadow(shadowBlur, offsetX, shadowOffsetY, shadowColor);
  };

  const handleShadowOffsetYChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const offsetY = value[0];
    setShadowOffsetY(offsetY);
    updateShadow(shadowBlur, shadowOffsetX, offsetY, shadowColor);
  };

  const handleShadowColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const color = e.target.value;
    setShadowColor(color);
    updateShadow(shadowBlur, shadowOffsetX, shadowOffsetY, color);
  };

  const updateShadow = (blur: number, offsetX: number, offsetY: number, color: string) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    if (blur === 0 && offsetX === 0 && offsetY === 0) {
      selectedObject.set('shadow', null);
    } else {
      selectedObject.set('shadow', new Shadow({
        color,
        blur,
        offsetX,
        offsetY,
      }));
    }
    fabricCanvas.renderAll();
  };

  const handleTextOpacityChange = (value: number[]) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('opacity', value[0]);
    setTextOpacity(value[0]);
    fabricCanvas.renderAll();
  };

  const handleBackgroundColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const color = e.target.value;
    selectedObject.set('backgroundColor', color);
    setBackgroundColor(color);
    fabricCanvas.renderAll();
  };

  const handleClearBackground = () => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('backgroundColor', '');
    setBackgroundColor('');
    fabricCanvas.renderAll();
  };

  // Transform handlers
  const handleTextTransformChange = (value: string) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    const currentText = selectedObject.text || '';
    let transformedText = currentText;
    
    switch(value) {
      case 'uppercase':
        transformedText = currentText.toUpperCase();
        break;
      case 'lowercase':
        transformedText = currentText.toLowerCase();
        break;
      case 'capitalize':
        transformedText = currentText.split(' ').map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        break;
      default:
        transformedText = currentText;
    }
    
    selectedObject.set('text', transformedText);
    setTextTransform(value);
    fabricCanvas.renderAll();
  };

  const handleStrikethroughChange = (checked: boolean) => {
    if (!selectedObject || !fabricCanvas) return;
    if (!(selectedObject instanceof IText || selectedObject instanceof FabricText)) return;
    
    selectedObject.set('linethrough', checked);
    setStrikethrough(checked);
    fabricCanvas.renderAll();
  };

  const loadFont = (fontFamily: string) => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/ /g, '+')}:wght@300;400;500;600;700;800;900&display=swap`;
    document.head.appendChild(link);
  };

  const toggleFavorite = (fontFamily: string) => {
    const newFavorites = favorites.includes(fontFamily)
      ? favorites.filter(f => f !== fontFamily)
      : [...favorites, fontFamily];
    
    setFavorites(newFavorites);
    localStorage.setItem('favorite-fonts', JSON.stringify(newFavorites));
  };

  // Popular fonts list
  const popularFonts = [
    { name: 'Arial', family: 'Arial', category: 'Sans Serif' },
    { name: 'Roboto', family: 'Roboto', category: 'Sans Serif' },
    { name: 'Open Sans', family: 'Open Sans', category: 'Sans Serif' },
    { name: 'Lato', family: 'Lato', category: 'Sans Serif' },
    { name: 'Montserrat', family: 'Montserrat', category: 'Sans Serif' },
    { name: 'Poppins', family: 'Poppins', category: 'Sans Serif' },
    { name: 'Times New Roman', family: 'Times New Roman', category: 'Serif' },
    { name: 'Georgia', family: 'Georgia', category: 'Serif' },
    { name: 'Playfair Display', family: 'Playfair Display', category: 'Serif' },
    { name: 'Merriweather', family: 'Merriweather', category: 'Serif' },
    { name: 'Dancing Script', family: 'Dancing Script', category: 'Handwriting' },
    { name: 'Pacifico', family: 'Pacifico', category: 'Handwriting' },
    { name: 'Permanent Marker', family: 'Permanent Marker', category: 'Handwriting' },
    { name: 'Oswald', family: 'Oswald', category: 'Display' },
    { name: 'Bebas Neue', family: 'Bebas Neue', category: 'Display' },
    { name: 'Lobster', family: 'Lobster', category: 'Display' },
  ];

  const filteredFonts = popularFonts.filter((font) =>
    font.name.toLowerCase().includes(fontSearch.toLowerCase())
  );

  const favoriteFontsList = popularFonts.filter(font => favorites.includes(font.family));

  const quickColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080'
  ];

  const isTextObject = selectedObject instanceof IText || selectedObject instanceof FabricText;

  return (
    <Card className="workflow-props fixed top-[91px] right-[20px] h-auto max-h-[calc(100vh-111px)] flex flex-col z-50 shadow-xl overflow-x-hidden" style={{ width: '320px' }}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Propriedades
        </CardTitle>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="p-4 space-y-4">
        {selectedObject ? (
          <>
            <div className="space-y-2">
              <Label>Opacidade: {opacity}%</Label>
              <Slider
                value={[opacity]}
                onValueChange={handleOpacityChange}
                min={0}
                max={100}
                step={1}
                className="w-full"
              />
            </div>

            {isTextObject && (
              <div className="space-y-4 pt-2 border-t">
                <Label className="flex items-center gap-2 font-semibold">
                  <Type className="h-4 w-4" />
                  Propriedades de Texto
                </Label>

                {/* Font Selection with Tabs */}
                <div className="space-y-2">
                  <Label className="text-xs">Fonte</Label>
                  <Tabs defaultValue="popular" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-8">
                      <TabsTrigger value="popular" className="text-xs">
                        <Star className="h-3 w-3 mr-1" />
                        Popular
                      </TabsTrigger>
                      <TabsTrigger value="favorites" className="text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="popular" className="mt-2">
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Buscar fonte..."
                          value={fontSearch}
                          onChange={(e) => setFontSearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                      <ScrollArea className="h-40">
                        <div className="space-y-1 pr-3">
                          {filteredFonts.map((font) => (
                            <div key={font.family} className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  handleFontFamilyChange(font.family);
                                  loadFont(font.family);
                                }}
                                className={`flex-1 text-left px-2 py-1.5 rounded text-xs transition-all ${
                                  fontFamily === font.family
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                                style={{ fontFamily: font.family }}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{font.name}</span>
                                  <span className="text-[10px] opacity-60">{font.category}</span>
                                </div>
                              </button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 flex-shrink-0"
                                onClick={() => toggleFavorite(font.family)}
                              >
                                <Star className={`h-3 w-3 ${favorites.includes(font.family) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </TabsContent>

                    <TabsContent value="favorites" className="mt-2">
                      <ScrollArea className="h-40">
                        {favoriteFontsList.length > 0 ? (
                          <div className="space-y-1 pr-3">
                            {favoriteFontsList.map((font) => (
                              <button
                                key={font.family}
                                onClick={() => {
                                  handleFontFamilyChange(font.family);
                                  loadFont(font.family);
                                }}
                                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                                  fontFamily === font.family
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted hover:bg-muted/80'
                                }`}
                                style={{ fontFamily: font.family }}
                              >
                                {font.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-xs text-muted-foreground">Nenhuma fonte favorita</p>
                          </div>
                        )}
                      </ScrollArea>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Font Size */}
                <div className="space-y-2">
                  <Label className="text-xs">Tamanho: {fontSize}px</Label>
                  <Slider
                    value={[fontSize]}
                    onValueChange={handleFontSizeChange}
                    min={8}
                    max={200}
                    step={1}
                  />
                </div>

                {/* Text Styles */}
                <div className="space-y-2">
                  <Label className="text-xs">Estilo</Label>
                  <ToggleGroup type="multiple" value={textStyles} onValueChange={handleTextStylesChange} className="justify-start">
                    <ToggleGroupItem value="bold" aria-label="Negrito" size="sm">
                      <Bold className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="italic" aria-label="Itálico" size="sm">
                      <Italic className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="underline" aria-label="Sublinhado" size="sm">
                      <Underline className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                {/* Advanced Text Effects - Accordion */}
                <Accordion type="multiple" className="w-full">
                  {/* Spacing Section */}
                  <AccordionItem value="spacing">
                    <AccordionTrigger className="text-xs font-medium py-2">
                      Espaçamento e Alinhamento
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      {/* Letter Spacing */}
                      <div className="space-y-2">
                        <Label className="text-xs">Espaçamento entre letras: {letterSpacing}</Label>
                        <Slider
                          value={[letterSpacing]}
                          onValueChange={handleLetterSpacingChange}
                          min={-200}
                          max={800}
                          step={10}
                        />
                      </div>

                      {/* Line Height */}
                      <div className="space-y-2">
                        <Label className="text-xs">Altura da linha: {lineHeight.toFixed(2)}</Label>
                        <Slider
                          value={[lineHeight]}
                          onValueChange={handleLineHeightChange}
                          min={0.5}
                          max={3}
                          step={0.01}
                        />
                      </div>

                      {/* Text Alignment */}
                      <div className="space-y-2">
                        <Label className="text-xs">Alinhamento</Label>
                        <div className="flex gap-1">
                          <Button
                            variant={textAlign === 'left' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTextAlignChange('left')}
                          >
                            <AlignLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={textAlign === 'center' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTextAlignChange('center')}
                          >
                            <AlignCenter className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={textAlign === 'right' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTextAlignChange('right')}
                          >
                            <AlignRight className="h-4 w-4" />
                          </Button>
                          <Button
                            variant={textAlign === 'justify' ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1"
                            onClick={() => handleTextAlignChange('justify')}
                          >
                            <AlignJustify className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Shadow Effects */}
                  <AccordionItem value="shadow">
                    <AccordionTrigger className="text-xs font-medium py-2">
                      Sombra do Texto
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      <div className="space-y-2">
                        <Label className="text-xs">Desfoque: {shadowBlur}px</Label>
                        <Slider
                          value={[shadowBlur]}
                          onValueChange={handleShadowBlurChange}
                          min={0}
                          max={50}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Deslocamento X: {shadowOffsetX}px</Label>
                        <Slider
                          value={[shadowOffsetX]}
                          onValueChange={handleShadowOffsetXChange}
                          min={-50}
                          max={50}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Deslocamento Y: {shadowOffsetY}px</Label>
                        <Slider
                          value={[shadowOffsetY]}
                          onValueChange={handleShadowOffsetYChange}
                          min={-50}
                          max={50}
                          step={1}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Cor da Sombra</Label>
                        <div className="flex gap-2">
                          <Input
                            type="color"
                            value={shadowColor}
                            onChange={handleShadowColorChange}
                            className="w-12 h-9 p-1 cursor-pointer"
                          />
                          <Input
                            type="text"
                            value={shadowColor}
                            onChange={handleShadowColorChange}
                            className="flex-1 h-9 text-xs"
                          />
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Transform Section */}
                  <AccordionItem value="transform">
                    <AccordionTrigger className="text-xs font-medium py-2">
                      Transformações
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3 pt-2">
                      {/* Text Transform */}
                      <div className="space-y-2">
                        <Label className="text-xs">Maiúsculas/Minúsculas</Label>
                        <Select value={textTransform} onValueChange={handleTextTransformChange}>
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Normal</SelectItem>
                            <SelectItem value="uppercase">MAIÚSCULAS</SelectItem>
                            <SelectItem value="lowercase">minúsculas</SelectItem>
                            <SelectItem value="capitalize">Primeira Letra Maiúscula</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Strikethrough */}
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Tachado</Label>
                        <Button
                          variant={strikethrough ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleStrikethroughChange(!strikethrough)}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Opacity */}
                      <div className="space-y-2">
                        <Label className="text-xs">Opacidade: {Math.round(textOpacity * 100)}%</Label>
                        <Slider
                          value={[textOpacity]}
                          onValueChange={handleTextOpacityChange}
                          min={0}
                          max={1}
                          step={0.01}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Colors Section */}
                <div className="space-y-3 pt-2 border-t">
                  <Label className="flex items-center gap-2 text-xs">
                    <Palette className="h-3 w-3" />
                    Cores
                  </Label>

                  {/* Fill Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">Preenchimento</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={textColor}
                        onChange={handleTextColorChange}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={textColor}
                        onChange={handleTextColorChange}
                        className="flex-1 h-9 text-xs"
                        placeholder="#000000"
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {quickColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => {
                            const e = { target: { value: color } } as React.ChangeEvent<HTMLInputElement>;
                            handleTextColorChange(e);
                          }}
                          className="w-6 h-6 rounded border-2 border-border hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Background Color */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Fundo do Texto</Label>
                      {backgroundColor && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleClearBackground}
                          className="h-6 text-xs"
                        >
                          Limpar
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={backgroundColor || "#ffffff"}
                        onChange={handleBackgroundColorChange}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={backgroundColor}
                        onChange={handleBackgroundColorChange}
                        className="flex-1 h-9 text-xs"
                        placeholder="Sem fundo"
                      />
                    </div>
                  </div>

                  {/* Stroke Color */}
                  <div className="space-y-2">
                    <Label className="text-xs">Contorno</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={strokeColor}
                        onChange={handleStrokeColorChange}
                        className="w-12 h-9 p-1 cursor-pointer"
                      />
                      <Input
                        type="text"
                        value={strokeColor}
                        onChange={handleStrokeColorChange}
                        className="flex-1 h-9 text-xs"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* Stroke Width */}
                  <div className="space-y-2">
                    <Label className="text-xs">Espessura do Contorno: {strokeWidth}px</Label>
                    <Slider
                      value={[strokeWidth]}
                      onValueChange={handleStrokeWidthChange}
                      min={0}
                      max={20}
                      step={0.5}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Nenhum objeto selecionado</h3>
            <p className="text-sm text-muted-foreground">
              Selecione um objeto no canvas para ver suas propriedades
            </p>
          </div>
        )}
        </CardContent>
      </ScrollArea>
    </Card>
  );
};

export default PropertiesPanel;