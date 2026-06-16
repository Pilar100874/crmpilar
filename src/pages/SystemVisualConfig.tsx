import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Save, Paintbrush, Video, Play, Pause, Palette, RotateCcw } from "lucide-react";
import { hexToHslString, hslStringToHex, applyPrimaryColor } from "@/components/SystemThemeLoader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

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
    </div>
  );
}
