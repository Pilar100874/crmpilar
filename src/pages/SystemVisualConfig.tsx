import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Save, Paintbrush, Video, Play, Pause, Palette, RotateCcw, LayoutGrid, Check, PanelLeft } from "lucide-react";
import { hexToHslString, hslStringToHex, applyPrimaryColor, applyVisualPreset, getCurrentVisualPreset, VISUAL_PRESETS, type VisualPreset, applyMainMenuStyle, getCurrentMainMenuStyle, MAIN_MENU_STYLES, type MainMenuStyle } from "@/components/SystemThemeLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";


export default function SystemVisualConfig() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [splashVideoUrl, setSplashVideoUrl] = useState("");
  const [splashVideoLoop, setSplashVideoLoop] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [primaryHex, setPrimaryHex] = useState("#f97316");
  const [savingColor, setSavingColor] = useState(false);
  const [visualPreset, setVisualPreset] = useState<VisualPreset>(getCurrentVisualPreset());
  const [menuStyle, setMenuStyle] = useState<MainMenuStyle>(getCurrentMainMenuStyle());
  const DEFAULT_HSL = "25 95% 53%";
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);


  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) { setLoading(false); return; }

      const { data } = await supabase
        .from("system_visual_config")
        .select("*")
        .eq("estabelecimento_id", estId)
        .maybeSingle();

      if (data) {
        setSplashVideoUrl(data.splash_video_url || "");
        setSplashVideoLoop(data.splash_video_loop ?? true);
        const hsl = (data as any).primary_color_hsl;
        if (hsl) setPrimaryHex(hslStringToHex(hsl));
      }
    } catch (err) {
      console.error("Erro ao carregar config visual:", err);
    }
    setLoading(false);
  };

  const handleUploadVideo = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Vídeo muito grande (máx 50MB)");
      return;
    }

    setUploading(true);
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) { toast.error("Estabelecimento não encontrado"); setUploading(false); return; }

      const ext = file.name.split(".").pop();
      const path = `${estId}/splash_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ecommerce-assets").upload(path, file, { upsert: true });
      if (error) { toast.error("Erro no upload: " + error.message); setUploading(false); return; }

      const { data: urlData } = supabase.storage.from("ecommerce-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      setSplashVideoUrl(publicUrl);

      // Save to DB
      const { error: dbError } = await supabase
        .from("system_visual_config")
        .upsert({ estabelecimento_id: estId, splash_video_url: publicUrl, splash_video_loop: splashVideoLoop }, { onConflict: "estabelecimento_id" });

      if (dbError) {
        toast.error("Erro ao salvar: " + dbError.message);
      } else {
        toast.success("Vídeo de splash salvo com sucesso!");
      }
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erro inesperado no upload");
    }
    setUploading(false);
  };

  const handleRemoveVideo = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;

    setSplashVideoUrl("");
    await supabase
      .from("system_visual_config")
      .upsert({ estabelecimento_id: estId, splash_video_url: null }, { onConflict: "estabelecimento_id" });
    toast.success("Vídeo removido");
  };

  const handleToggleLoop = async (checked: boolean) => {
    setSplashVideoLoop(checked);
    if (videoPreviewRef.current) {
      videoPreviewRef.current.loop = checked;
    }
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) return;
      await supabase
        .from("system_visual_config")
        .upsert({ estabelecimento_id: estId, splash_video_loop: checked }, { onConflict: "estabelecimento_id" });
      toast.success(checked ? "Loop ativado" : "Loop desativado");
    } catch (err) {
      console.error(err);
    }
  };

  const togglePlayPause = () => {
    if (videoPreviewRef.current) {
      if (videoPreviewRef.current.paused) {
        videoPreviewRef.current.play();
        setIsPlaying(true);
      } else {
        videoPreviewRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handlePreviewColor = (hex: string) => {
    setPrimaryHex(hex);
    const hsl = hexToHslString(hex);
    if (hsl) applyPrimaryColor(hsl);
  };

  const handleSavePrimaryColor = async () => {
    const hsl = hexToHslString(primaryHex);
    if (!hsl) { toast.error("Cor inválida"); return; }
    setSavingColor(true);
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) { toast.error("Estabelecimento não encontrado"); return; }
      const { error } = await supabase
        .from("system_visual_config")
        .upsert({ estabelecimento_id: estId, primary_color_hsl: hsl } as any, { onConflict: "estabelecimento_id" });
      if (error) { toast.error("Erro ao salvar: " + error.message); return; }
      applyPrimaryColor(hsl);
      localStorage.setItem("system_primary_hsl", hsl);
      toast.success("Cor primária aplicada em todo o sistema!");
    } finally {
      setSavingColor(false);
    }
  };

  const handleResetColor = async () => {
    setPrimaryHex(hslStringToHex(DEFAULT_HSL));
    applyPrimaryColor(DEFAULT_HSL);
    const estId = await getEstabelecimentoId();
    if (estId) {
      await supabase
        .from("system_visual_config")
        .upsert({ estabelecimento_id: estId, primary_color_hsl: DEFAULT_HSL } as any, { onConflict: "estabelecimento_id" });
    }
    localStorage.setItem("system_primary_hsl", DEFAULT_HSL);
    toast.success("Cor restaurada para o laranja padrão");
  };

  const PRESET_COLORS = [
    "#f97316", "#ef4444", "#ec4899", "#a855f7",
    "#6366f1", "#3b82f6", "#0ea5e9", "#06b6d4",
    "#10b981", "#22c55e", "#84cc16", "#eab308",
  ];

  const VISUAL_PRESET_OPTIONS: { id: VisualPreset; title: string; description: string }[] = [
    { id: "menu", title: "Menu (Bot Style)", description: "Cards com gradiente sutil, bordas brancas e cantos arredondados. Menu lateral flutuante." },
    { id: "minimal", title: "Minimalista", description: "Visual limpo e plano, sem sombras nem gradientes. Foco em conteúdo." },
    { id: "classic", title: "Clássico", description: "Cards com borda definida e leve sombra. Menu lateral tradicional com destaque na cor primária." },
  ];

  const handleSelectPreset = async (preset: VisualPreset) => {
    setVisualPreset(preset);
    applyVisualPreset(preset);
    localStorage.setItem("system_visual_preset", preset);
    toast.success(`Estilo "${VISUAL_PRESET_OPTIONS.find(p => p.id === preset)?.title}" aplicado!`);
  };

  const MAIN_MENU_STYLE_OPTIONS: { id: MainMenuStyle; title: string; description: string }[] = [
    { id: "dark", title: "Escuro (Padrão)", description: "Menu lateral escuro com destaques na cor primária." },
    { id: "light", title: "Claro", description: "Fundo branco com texto escuro. Visual leve e limpo." },
    { id: "brand", title: "Cor da Marca", description: "Usa a cor primária como fundo do menu. Alta identidade visual." },
    { id: "glass", title: "Vidro (Glass)", description: "Fundo translúcido com efeito blur. Aparência moderna." },
    { id: "buttons", title: "Botões (Touch)", description: "Tiles grandes tipo botão, ideais para tablet e celular." },
    { id: "outline", title: "Contorno", description: "Itens com borda fina, sem preenchimento. Visual minimalista." },
  ];

  const handleSelectMenuStyle = (style: MainMenuStyle) => {
    setMenuStyle(style);
    applyMainMenuStyle(style);
    localStorage.setItem("system_main_menu_style", style);
    toast.success(`Menu "${MAIN_MENU_STYLE_OPTIONS.find(o => o.id === style)?.title}" aplicado!`);
  };


  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Paintbrush className="h-6 w-6" />
            Visual do Sistema
          </h1>
          <p className="text-sm text-muted-foreground">Configure a aparência visual do sistema</p>
        </div>
      </div>

      {/* Estilo Visual: Menus e Cards */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LayoutGrid className="h-4 w-4" />
            Estilo dos Menus e Cards
          </CardTitle>
          <CardDescription>
            Escolha o estilo visual aplicado em todos os menus laterais (Marketing, Vendas, Logística, Atendimento, etc.) e cards do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {VISUAL_PRESET_OPTIONS.map((opt) => {
              const isSelected = visualPreset === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectPreset(opt.id)}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-4 transition-all hover:shadow-md",
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  {/* Mini preview */}
                  <div className="mb-3 h-24 rounded-lg overflow-hidden flex" data-visual-preset={opt.id}>
                    <div className="hub-menu w-12 flex flex-col gap-1 p-1.5">
                      <div className="hub-menu-item is-active h-3" />
                      <div className="hub-menu-item h-3 bg-muted/40" />
                      <div className="hub-menu-item h-3 bg-muted/40" />
                    </div>
                    <div className="flex-1 p-2 grid grid-cols-2 gap-1.5">
                      <div className="preset-card" />
                      <div className="preset-card" />
                    </div>
                  </div>
                  <div className="font-semibold text-sm mb-1">{opt.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{opt.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>


      {/* Estilo do Menu Principal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <PanelLeft className="h-4 w-4" />
            Estilo do Menu Principal
          </CardTitle>
          <CardDescription>
            Escolha a aparência do menu lateral principal do sistema. A mudança é aplicada imediatamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {MAIN_MENU_STYLE_OPTIONS.map((opt) => {
              const isSelected = menuStyle === opt.id;
              const previewBg =
                opt.id === "dark" ? "hsl(220 18% 20%)"
                : opt.id === "light" ? "hsl(0 0% 100%)"
                : opt.id === "brand" ? "hsl(var(--primary))"
                : opt.id === "glass" ? "hsl(220 25% 12% / 0.7)"
                : opt.id === "buttons" ? "hsl(220 20% 14%)"
                : "hsl(0 0% 100%)"; // outline
              const previewItem =
                opt.id === "light" ? "hsl(210 20% 94%)"
                : opt.id === "brand" ? "hsl(0 0% 100% / 0.25)"
                : opt.id === "buttons" ? "hsl(220 18% 26%)"
                : opt.id === "outline" ? "transparent"
                : "hsl(0 0% 100% / 0.12)";
              const previewActive =
                opt.id === "light" ? "hsl(var(--primary))"
                : opt.id === "brand" ? "hsl(0 0% 100%)"
                : "hsl(var(--primary))";
              const isButtons = opt.id === "buttons";
              const isOutline = opt.id === "outline";
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectMenuStyle(opt.id)}
                  className={cn(
                    "relative text-left rounded-xl border-2 p-3 transition-all hover:shadow-md",
                    isSelected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center z-10">
                      <Check className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <div className="mb-3 h-24 rounded-lg overflow-hidden border border-border/50 flex">
                    <div
                      className={cn(
                        "flex flex-col gap-1.5 p-1.5",
                        isButtons ? "w-14" : "w-10"
                      )}
                      style={{
                        background: previewBg,
                        backdropFilter: opt.id === "glass" ? "blur(6px)" : undefined,
                      }}
                    >
                      <div
                        className={isButtons ? "h-5 rounded-md" : isOutline ? "h-4 rounded-md border" : "h-2 rounded-sm"}
                        style={{
                          background: isOutline ? "hsl(var(--primary) / 0.15)" : previewActive,
                          borderColor: isOutline ? "hsl(var(--primary))" : undefined,
                        }}
                      />
                      <div
                        className={isButtons ? "h-5 rounded-md" : isOutline ? "h-4 rounded-md border" : "h-2 rounded-sm"}
                        style={{
                          background: previewItem,
                          borderColor: isOutline ? "hsl(220 13% 85%)" : undefined,
                        }}
                      />
                      <div
                        className={isButtons ? "h-5 rounded-md" : isOutline ? "h-4 rounded-md border" : "h-2 rounded-sm"}
                        style={{
                          background: previewItem,
                          borderColor: isOutline ? "hsl(220 13% 85%)" : undefined,
                        }}
                      />
                      {!isButtons && (
                        <div
                          className={isOutline ? "h-4 rounded-md border" : "h-2 rounded-sm"}
                          style={{
                            background: previewItem,
                            borderColor: isOutline ? "hsl(220 13% 85%)" : undefined,
                          }}
                        />
                      )}
                    </div>
                    <div className="flex-1 bg-muted/40" />
                  </div>
                  <div className="font-semibold text-sm mb-1">{opt.title}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{opt.description}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>


      {/* Splash Screen Video */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4" />
            Vídeo de Splash Screen (Login)
          </CardTitle>
          <CardDescription>
            Envie um vídeo que ficará em loop como fundo da tela de login do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {splashVideoUrl ? (
            <div className="relative rounded-xl overflow-hidden border max-w-lg mx-auto bg-black">
              <video
                ref={videoPreviewRef}
                src={splashVideoUrl}
                className="w-full max-h-[300px] object-cover"
                autoPlay
                loop={splashVideoLoop}
                muted
                playsInline
              />
              {/* Loop toggle over video */}
              <div className="absolute top-2 left-2">
                <div className="flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-1.5">
                  <Switch
                    id="loop-toggle"
                    checked={splashVideoLoop}
                    onCheckedChange={handleToggleLoop}
                  />
                  <Label htmlFor="loop-toggle" className="text-xs text-white cursor-pointer">
                    Loop
                  </Label>
                </div>
              </div>
              <div className="absolute bottom-2 right-2 flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="opacity-80 hover:opacity-100"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="opacity-80 hover:opacity-100"
                  onClick={handleRemoveVideo}
                >
                  <Trash2 className="h-3 w-3 mr-1" />Remover
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground max-w-lg mx-auto">
              <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm mb-1">Envie um vídeo para a splash screen</p>
              <p className="text-xs opacity-60">MP4 ou WebM, máx 50MB. O vídeo ficará em loop na tela de login.</p>
            </div>
          )}
          <div className="flex justify-center">
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleUploadVideo(e.target.files[0])}
            />
            <Button variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploading}>
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Enviando..." : splashVideoUrl ? "Trocar Vídeo" : "Enviar Vídeo"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cor Primária do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Cor Primária do Sistema
          </CardTitle>
          <CardDescription>
            Substitui o laranja em botões, hover, links, ícones e destaques em todo o sistema.
            As mudanças são aplicadas em tempo real.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4 flex-wrap">
            <div
              className="w-16 h-16 rounded-xl border-2 border-border shadow-sm"
              style={{ backgroundColor: primaryHex }}
            />
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryHex}
                onChange={(e) => handlePreviewColor(e.target.value)}
                className="h-10 w-14 rounded cursor-pointer border border-border bg-transparent"
              />
              <input
                type="text"
                value={primaryHex}
                onChange={(e) => {
                  const v = e.target.value;
                  setPrimaryHex(v);
                  if (/^#[0-9a-f]{6}$/i.test(v)) {
                    const hsl = hexToHslString(v);
                    if (hsl) applyPrimaryColor(hsl);
                  }
                }}
                className="h-10 w-28 px-3 rounded-md border border-input bg-background text-sm font-mono uppercase"
                maxLength={7}
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={handleResetColor}>
                <RotateCcw className="h-4 w-4 mr-2" /> Restaurar
              </Button>
              <Button onClick={handleSavePrimaryColor} disabled={savingColor}>
                <Save className="h-4 w-4 mr-2" />
                {savingColor ? "Salvando..." : "Salvar e Aplicar"}
              </Button>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Cores sugeridas</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handlePreviewColor(c)}
                  className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 ${
                    primaryHex.toLowerCase() === c.toLowerCase()
                      ? "border-foreground ring-2 ring-ring ring-offset-2"
                      : "border-border"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Selecionar ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4 bg-muted/30 space-y-3">
            <Label className="text-xs text-muted-foreground">Pré-visualização</Label>
            <div className="flex flex-wrap items-center gap-3">
              <Button>Botão Primário</Button>
              <Button
                variant="outline"
                style={{
                  borderColor: primaryHex,
                  color: primaryHex,
                  backgroundColor: `${primaryHex}15`,
                }}
              >
                Outline
              </Button>
              <Button
                variant="ghost"
                style={{
                  color: primaryHex,
                  backgroundColor: `${primaryHex}1A`,
                }}
              >
                Ghost
              </Button>
              <span className="text-primary font-semibold">Texto Primário</span>
              <div className="px-3 py-1.5 rounded-md bg-primary/10 text-primary text-sm">Badge</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

