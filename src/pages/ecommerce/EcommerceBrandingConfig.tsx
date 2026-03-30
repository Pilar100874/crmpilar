import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, Save, Palette, Image, Video, Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "sonner";

export default function EcommerceBrandingConfig() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    logo_url: "",
    background_video_url: "",
    background_type: "gradient" as string,
    nome_loja: "Minha Loja",
    slogan: "",
    cor_primaria: "#000000",
    cor_secundaria: "#ffffff",
  });
  const [uploading, setUploading] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const estId = await getEstabelecimentoId();
    if (!estId) return;
    const { data } = await supabase
      .from("ecommerce_config")
      .select("*")
      .eq("estabelecimento_id", estId)
      .maybeSingle();
    if (data) {
      setConfig({
        logo_url: data.logo_url || "",
        background_video_url: data.background_video_url || "",
        background_type: data.background_type || "gradient",
        nome_loja: data.nome_loja || "Minha Loja",
        slogan: data.slogan || "",
        cor_primaria: data.cor_primaria || "#000000",
        cor_secundaria: data.cor_secundaria || "#ffffff",
      });
    }
    setLoading(false);
  };

  const handleUpload = async (file: File, type: "logo" | "video") => {
    setUploading(type);
    try {
      const estId = await getEstabelecimentoId();
      if (!estId) {
        toast.error("Estabelecimento não encontrado");
        setUploading(null);
        return;
      }

      const ext = file.name.split(".").pop();
      const path = `${estId}/${type}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("ecommerce-assets").upload(path, file, { upsert: true });
      if (error) {
        console.error("Upload error:", error);
        toast.error("Erro no upload: " + error.message);
        setUploading(null);
        return;
      }
      const { data: urlData } = supabase.storage.from("ecommerce-assets").getPublicUrl(path);
      const publicUrl = urlData.publicUrl;
      console.log("Upload success, URL:", publicUrl);
      
      if (type === "logo") {
        setConfig((c) => ({ ...c, logo_url: publicUrl }));
      } else {
        setConfig((c) => ({ ...c, background_video_url: publicUrl, background_type: "video" }));
      }
      toast.success(`${type === "logo" ? "Logo" : "Vídeo"} carregado com sucesso!`);
    } catch (err) {
      console.error("Upload exception:", err);
      toast.error("Erro inesperado no upload");
    }
    setUploading(null);
  };

  const handleSave = async () => {
    setSaving(true);
    const estId = await getEstabelecimentoId();
    if (!estId) return;

    const { error } = await supabase
      .from("ecommerce_config")
      .upsert({ estabelecimento_id: estId, ...config }, { onConflict: "estabelecimento_id" });
    if (error) toast.error("Erro ao salvar");
    else toast.success("Configurações salvas!");
    setSaving(false);
  };

  if (loading) return <div className="p-6 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" /></div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/ecommerce-config")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Palette className="h-6 w-6" />Identidade Visual</h1>
          <p className="text-sm text-muted-foreground">Logo, fundo animado, cores e dados da loja</p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />{saving ? "Salvando..." : "Salvar"}
        </Button>
      </div>

      {/* Nome e Slogan */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados da Loja</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nome da Loja</Label>
              <Input value={config.nome_loja} onChange={(e) => setConfig((c) => ({ ...c, nome_loja: e.target.value }))} />
            </div>
            <div>
              <Label>Slogan</Label>
              <Input value={config.slogan} onChange={(e) => setConfig((c) => ({ ...c, slogan: e.target.value }))} placeholder="Sua frase de impacto" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logo */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Image className="h-4 w-4" />Logotipo</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="w-32 h-32 rounded-xl border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/30 overflow-hidden">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <Image className="h-10 w-10 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-2">
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "logo")} />
              <Button variant="outline" onClick={() => logoInputRef.current?.click()} disabled={uploading === "logo"}>
                <Upload className="h-4 w-4 mr-2" />{uploading === "logo" ? "Enviando..." : "Enviar Logo"}
              </Button>
              {config.logo_url && (
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfig((c) => ({ ...c, logo_url: "" }))}>
                  <Trash2 className="h-3 w-3 mr-1" />Remover
                </Button>
              )}
              <p className="text-xs text-muted-foreground">PNG ou SVG transparente, máx 2MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Video className="h-4 w-4" />Fundo da Tela Inicial</CardTitle>
          <CardDescription>Escolha entre gradiente ou vídeo em loop para a hero section</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={config.background_type} onValueChange={(v) => setConfig((c) => ({ ...c, background_type: v }))}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="gradient" id="bg-gradient" />
              <Label htmlFor="bg-gradient">Gradiente (cores primária/secundária)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="video" id="bg-video" />
              <Label htmlFor="bg-video">Vídeo em Loop</Label>
            </div>
          </RadioGroup>

          {config.background_type === "video" && (
            <div className="space-y-3">
              {config.background_video_url ? (
                <div className="relative rounded-xl overflow-hidden aspect-video max-w-lg border">
                  <video
                    src={config.background_video_url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => setConfig((c) => ({ ...c, background_video_url: "", background_type: "gradient" }))}
                  >
                    <Trash2 className="h-3 w-3 mr-1" />Remover
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-xl p-8 text-center text-muted-foreground">
                  <Video className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="text-sm mb-3">Envie um vídeo MP4 para o fundo animado</p>
                </div>
              )}
              <input ref={videoInputRef} type="file" accept="video/mp4,video/webm" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], "video")} />
              <Button variant="outline" onClick={() => videoInputRef.current?.click()} disabled={uploading === "video"}>
                <Upload className="h-4 w-4 mr-2" />{uploading === "video" ? "Enviando..." : "Enviar Vídeo"}
              </Button>
            </div>
          )}

          <Separator />
          <div>
            <Label className="text-sm font-medium mb-2 block">Cores do Gradiente</Label>
            <div className="flex gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Primária</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.cor_primaria} onChange={(e) => setConfig((c) => ({ ...c, cor_primaria: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={config.cor_primaria} onChange={(e) => setConfig((c) => ({ ...c, cor_primaria: e.target.value }))} className="w-28 font-mono text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Secundária</Label>
                <div className="flex items-center gap-2">
                  <input type="color" value={config.cor_secundaria} onChange={(e) => setConfig((c) => ({ ...c, cor_secundaria: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0" />
                  <Input value={config.cor_secundaria} onChange={(e) => setConfig((c) => ({ ...c, cor_secundaria: e.target.value }))} className="w-28 font-mono text-sm" />
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="mt-4">
            <Label className="text-xs text-muted-foreground mb-2 block">Pré-visualização</Label>
            <div
              className="rounded-xl h-32 flex items-center justify-center relative overflow-hidden"
              style={config.background_type === "gradient" ? {
                background: `linear-gradient(135deg, ${config.cor_primaria}, ${config.cor_secundaria})`
              } : {}}
            >
              {config.background_type === "video" && config.background_video_url && (
                <video src={config.background_video_url} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
              )}
              <div className="relative z-10 text-center">
                {config.logo_url && <img src={config.logo_url} alt="" className="h-10 mx-auto mb-1" />}
                <p className="text-white font-bold text-lg drop-shadow-lg">{config.nome_loja}</p>
                {config.slogan && <p className="text-white/80 text-sm drop-shadow">{config.slogan}</p>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
