import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Instagram, Facebook, Music2, Linkedin, Twitter, Youtube, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ConfigProps {
  config: any;
  handleConfigChange: (key: string, value: any) => void;
}

const PLATFORMS = [
  { id: "instagram", label: "Instagram", icon: Instagram, color: "text-pink-500" },
  { id: "facebook", label: "Facebook", icon: Facebook, color: "text-blue-600" },
  { id: "tiktok", label: "TikTok", icon: Music2, color: "text-foreground" },
  { id: "linkedin", label: "LinkedIn", icon: Linkedin, color: "text-blue-700" },
  { id: "twitter", label: "X (Twitter)", icon: Twitter, color: "text-foreground" },
  { id: "youtube", label: "YouTube", icon: Youtube, color: "text-red-600" },
];

export const PublishSocialPostConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const platforms: string[] = config.platforms || [];

  const togglePlatform = (id: string) => {
    const next = platforms.includes(id)
      ? platforms.filter((p) => p !== id)
      : [...platforms, id];
    handleConfigChange("platforms", next);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          Conecte suas contas em <strong>Conectores</strong> para publicar automaticamente. Sem conexão, o post fica em fila para revisão manual.
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label>Plataformas</Label>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => {
            const Icon = p.icon;
            const checked = platforms.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlatform(p.id)}
                className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
                  checked ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                }`}
              >
                <Icon className={`h-4 w-4 ${p.color}`} />
                <span className="text-xs font-medium">{p.label}</span>
                <Checkbox checked={checked} className="ml-auto pointer-events-none" />
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Tipo de Post</Label>
        <select
          value={config.postType || "image"}
          onChange={(e) => handleConfigChange("postType", e.target.value)}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="image">Imagem</option>
          <option value="video">Vídeo / Reels</option>
          <option value="carousel">Carrossel</option>
          <option value="story">Story</option>
          <option value="text">Apenas texto</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>URL da Mídia</Label>
        <Input
          value={config.mediaUrl || ""}
          onChange={(e) => handleConfigChange("mediaUrl", e.target.value)}
          placeholder="https://... ou {{variavel_midia}}"
        />
        <p className="text-xs text-muted-foreground">
          Para carrossel, separe URLs por vírgula.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Legenda</Label>
        <Textarea
          value={config.caption || ""}
          onChange={(e) => handleConfigChange("caption", e.target.value)}
          placeholder="Texto do post... use {{variaveis}} para dinâmicos"
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label>Hashtags</Label>
        <Input
          value={config.hashtags || ""}
          onChange={(e) => handleConfigChange("hashtags", e.target.value)}
          placeholder="#promo #novidade #black"
        />
      </div>

      <div className="space-y-2">
        <Label>Agendar para (opcional)</Label>
        <Input
          type="datetime-local"
          value={config.scheduledAt || ""}
          onChange={(e) => handleConfigChange("scheduledAt", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Vazio = publica imediatamente.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Variável de Saída</Label>
        <Input
          value={config.outputVariable || "post_publicado"}
          onChange={(e) => handleConfigChange("outputVariable", e.target.value)}
          placeholder="post_publicado"
        />
        <p className="text-xs text-muted-foreground">
          Armazena IDs/URLs dos posts publicados por plataforma.
        </p>
      </div>
    </div>
  );
};
