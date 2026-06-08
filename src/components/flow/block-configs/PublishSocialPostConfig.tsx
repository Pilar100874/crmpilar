import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Instagram, Facebook, Music2, Linkedin, Twitter, Youtube, AlertCircle, Settings, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

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

// Tipos/formatos possíveis por plataforma
const PLATFORM_POST_TYPES: Record<string, { value: string; label: string }[]> = {
  instagram: [
    { value: "feed_image", label: "Feed — Imagem" },
    { value: "feed_carousel", label: "Feed — Carrossel" },
    { value: "feed_video", label: "Feed — Vídeo" },
    { value: "reels", label: "Reels (vídeo vertical)" },
    { value: "story_image", label: "Story — Imagem" },
    { value: "story_video", label: "Story — Vídeo" },
  ],
  facebook: [
    { value: "feed_text", label: "Feed — Texto" },
    { value: "feed_image", label: "Feed — Imagem" },
    { value: "feed_carousel", label: "Feed — Carrossel" },
    { value: "feed_video", label: "Feed — Vídeo" },
    { value: "reels", label: "Reels" },
    { value: "story", label: "Story" },
  ],
  tiktok: [
    { value: "video", label: "Vídeo principal" },
    { value: "photo_carousel", label: "Carrossel de fotos" },
  ],
  linkedin: [
    { value: "post_text", label: "Post — Texto" },
    { value: "post_image", label: "Post — Imagem" },
    { value: "post_carousel", label: "Post — Carrossel/Documento" },
    { value: "post_video", label: "Post — Vídeo" },
    { value: "article", label: "Artigo" },
  ],
  twitter: [
    { value: "tweet", label: "Tweet de texto" },
    { value: "tweet_image", label: "Tweet com imagem" },
    { value: "tweet_video", label: "Tweet com vídeo" },
    { value: "thread", label: "Thread (vários tweets)" },
  ],
  youtube: [
    { value: "video_long", label: "Vídeo (longo)" },
    { value: "short", label: "Short (vertical < 60s)" },
    { value: "live", label: "Transmissão ao vivo" },
  ],
};

const PRIVACY_OPTIONS = [
  { value: "public", label: "🌐 Público" },
  { value: "friends", label: "👥 Amigos / seguidores" },
  { value: "private", label: "🔒 Privado / não listado" },
];

export const PublishSocialPostConfig = ({ config, handleConfigChange }: ConfigProps) => {
  const platforms: string[] = config.platforms || [];
  const platformConfig: Record<string, any> = config.platformConfig || {};

  const togglePlatform = (id: string) => {
    const next = platforms.includes(id)
      ? platforms.filter((p) => p !== id)
      : [...platforms, id];
    handleConfigChange("platforms", next);
  };

  const updatePlatformField = (platform: string, field: string, value: any) => {
    const next = {
      ...platformConfig,
      [platform]: { ...(platformConfig[platform] || {}), [field]: value },
    };
    handleConfigChange("platformConfig", next);
  };

  const getPF = (platform: string, field: string, fallback: any = "") =>
    platformConfig[platform]?.[field] ?? fallback;

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

      {/* Conteúdo base compartilhado */}
      <div className="space-y-2">
        <Label>URL da Mídia (compartilhada)</Label>
        <Input
          value={config.mediaUrl || ""}
          onChange={(e) => handleConfigChange("mediaUrl", e.target.value)}
          placeholder="https://... ou {{variavel_midia}}"
        />
        <p className="text-xs text-muted-foreground">
          Para carrossel, separe URLs por vírgula. Pode ser sobrescrita por plataforma abaixo.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Legenda padrão</Label>
        <Textarea
          value={config.caption || ""}
          onChange={(e) => handleConfigChange("caption", e.target.value)}
          placeholder="Texto do post... use {{variaveis}} para dinâmicos"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>Hashtags padrão</Label>
        <Input
          value={config.hashtags || ""}
          onChange={(e) => handleConfigChange("hashtags", e.target.value)}
          placeholder="#promo #novidade #black"
        />
      </div>

      {/* Configuração específica por plataforma */}
      {platforms.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <Label className="text-xs font-semibold">Configuração por plataforma</Label>
          </div>

          {platforms.map((pid) => {
            const meta = PLATFORMS.find((x) => x.id === pid);
            if (!meta) return null;
            const Icon = meta.icon;
            const types = PLATFORM_POST_TYPES[pid] || [];
            const currentType = getPF(pid, "postType", types[0]?.value || "");

            return (
              <div key={pid} className="p-3 rounded-lg border-2 border-border bg-muted/30 space-y-2">
                <div className="flex items-center gap-2 pb-1 border-b border-border">
                  <Icon className={`h-4 w-4 ${meta.color}`} />
                  <span className="text-xs font-semibold">{meta.label}</span>
                </div>

                {/* Tipo/formato */}
                <div className="space-y-1">
                  <Label className="text-[11px]">Tipo / Formato</Label>
                  <select
                    value={currentType}
                    onChange={(e) => updatePlatformField(pid, "postType", e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs"
                  >
                    {types.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Legenda específica (opcional) */}
                <div className="space-y-1">
                  <Label className="text-[11px]">Legenda específica (opcional)</Label>
                  <Textarea
                    value={getPF(pid, "caption", "")}
                    onChange={(e) => updatePlatformField(pid, "caption", e.target.value)}
                    placeholder="Sobrescreve a legenda padrão"
                    rows={2}
                    className="text-xs"
                  />
                </div>

                {/* Instagram */}
                {pid === "instagram" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Localização (opcional)</Label>
                      <Input
                        value={getPF(pid, "location")}
                        onChange={(e) => updatePlatformField(pid, "location", e.target.value)}
                        placeholder="ID/nome do local"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Marcar usuários (separe por vírgula)</Label>
                      <Input
                        value={getPF(pid, "userTags")}
                        onChange={(e) => updatePlatformField(pid, "userTags", e.target.value)}
                        placeholder="@usuario1, @usuario2"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Capa (cover URL — para Reels)</Label>
                      <Input
                        value={getPF(pid, "coverUrl")}
                        onChange={(e) => updatePlatformField(pid, "coverUrl", e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <Label className="text-[11px]">Compartilhar Reel no Feed</Label>
                      <Switch
                        checked={!!getPF(pid, "shareToFeed", true)}
                        onCheckedChange={(v) => updatePlatformField(pid, "shareToFeed", v)}
                      />
                    </div>
                  </>
                )}

                {/* Facebook */}
                {pid === "facebook" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Link associado (opcional)</Label>
                      <Input
                        value={getPF(pid, "link")}
                        onChange={(e) => updatePlatformField(pid, "link", e.target.value)}
                        placeholder="https://seusite.com/promo"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Público</Label>
                      <select
                        value={getPF(pid, "privacy", "public")}
                        onChange={(e) => updatePlatformField(pid, "privacy", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {PRIVACY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                {/* TikTok */}
                {pid === "tiktok" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Público</Label>
                      <select
                        value={getPF(pid, "privacy", "public")}
                        onChange={(e) => updatePlatformField(pid, "privacy", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        {PRIVACY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">Permitir comentários</Label>
                      <Switch
                        checked={!!getPF(pid, "allowComments", true)}
                        onCheckedChange={(v) => updatePlatformField(pid, "allowComments", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">Permitir duet</Label>
                      <Switch
                        checked={!!getPF(pid, "allowDuet", true)}
                        onCheckedChange={(v) => updatePlatformField(pid, "allowDuet", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">Permitir stitch</Label>
                      <Switch
                        checked={!!getPF(pid, "allowStitch", true)}
                        onCheckedChange={(v) => updatePlatformField(pid, "allowStitch", v)}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">Conteúdo de marca / promocional</Label>
                      <Switch
                        checked={!!getPF(pid, "brandedContent", false)}
                        onCheckedChange={(v) => updatePlatformField(pid, "brandedContent", v)}
                      />
                    </div>
                  </>
                )}

                {/* LinkedIn */}
                {pid === "linkedin" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Publicar como</Label>
                      <select
                        value={getPF(pid, "author", "person")}
                        onChange={(e) => updatePlatformField(pid, "author", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="person">👤 Perfil pessoal</option>
                        <option value="organization">🏢 Página da empresa</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Visibilidade</Label>
                      <select
                        value={getPF(pid, "visibility", "public")}
                        onChange={(e) => updatePlatformField(pid, "visibility", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="public">🌐 Público</option>
                        <option value="connections">🔗 Apenas conexões</option>
                      </select>
                    </div>
                    {currentType === "article" && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Título do artigo</Label>
                        <Input
                          value={getPF(pid, "articleTitle")}
                          onChange={(e) => updatePlatformField(pid, "articleTitle", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* X / Twitter */}
                {pid === "twitter" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Quem pode responder</Label>
                      <select
                        value={getPF(pid, "replyControl", "everyone")}
                        onChange={(e) => updatePlatformField(pid, "replyControl", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="everyone">Todos</option>
                        <option value="following">Quem eu sigo</option>
                        <option value="mentioned">Apenas mencionados</option>
                      </select>
                    </div>
                    {currentType === "thread" && (
                      <div className="space-y-1">
                        <Label className="text-[11px]">Tweets da thread (1 por linha)</Label>
                        <Textarea
                          value={getPF(pid, "threadTweets")}
                          onChange={(e) => updatePlatformField(pid, "threadTweets", e.target.value)}
                          placeholder={"Tweet 1\nTweet 2\nTweet 3"}
                          rows={4}
                          className="text-xs"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* YouTube */}
                {pid === "youtube" && (
                  <>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Título</Label>
                      <Input
                        value={getPF(pid, "title")}
                        onChange={(e) => updatePlatformField(pid, "title", e.target.value)}
                        placeholder="Título do vídeo (máx 100)"
                        className="h-8 text-xs"
                        maxLength={100}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Descrição</Label>
                      <Textarea
                        value={getPF(pid, "description")}
                        onChange={(e) => updatePlatformField(pid, "description", e.target.value)}
                        rows={3}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Categoria</Label>
                      <select
                        value={getPF(pid, "category", "22")}
                        onChange={(e) => updatePlatformField(pid, "category", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="22">People & Blogs</option>
                        <option value="24">Entertainment</option>
                        <option value="27">Education</option>
                        <option value="28">Science & Technology</option>
                        <option value="26">Howto & Style</option>
                        <option value="10">Music</option>
                        <option value="20">Gaming</option>
                        <option value="17">Sports</option>
                        <option value="25">News & Politics</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Visibilidade</Label>
                      <select
                        value={getPF(pid, "privacy", "public")}
                        onChange={(e) => updatePlatformField(pid, "privacy", e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="public">🌐 Público</option>
                        <option value="unlisted">🔗 Não listado</option>
                        <option value="private">🔒 Privado</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Tags (separe por vírgula)</Label>
                      <Input
                        value={getPF(pid, "tags")}
                        onChange={(e) => updatePlatformField(pid, "tags", e.target.value)}
                        placeholder="marketing, tutorial, ia"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[11px]">Thumbnail (URL)</Label>
                      <Input
                        value={getPF(pid, "thumbnailUrl")}
                        onChange={(e) => updatePlatformField(pid, "thumbnailUrl", e.target.value)}
                        placeholder="https://..."
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px]">Feito para crianças</Label>
                      <Switch
                        checked={!!getPF(pid, "madeForKids", false)}
                        onCheckedChange={(v) => updatePlatformField(pid, "madeForKids", v)}
                      />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

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
