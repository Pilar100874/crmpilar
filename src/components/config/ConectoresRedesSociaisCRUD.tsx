import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Instagram, Facebook, Music2, Linkedin, Twitter, Youtube, Link2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from '@/lib/toast-config';

interface PlatformConfig {
  id: string;
  label: string;
  icon: any;
  iconColor: string;
  description: string;
  fields: { key: string; label: string; placeholder: string; type?: string }[];
  docsUrl: string;
}

const PLATFORMS: PlatformConfig[] = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    iconColor: 'text-pink-500',
    description: 'Publique posts, reels e stories através da Graph API.',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'EAAG...', type: 'password' },
      { key: 'page_id', label: 'ID da Conta Instagram', placeholder: '17841...' },
    ],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api',
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    iconColor: 'text-blue-600',
    description: 'Publique em páginas do Facebook via Graph API.',
    fields: [
      { key: 'access_token', label: 'Page Access Token', placeholder: 'EAAG...', type: 'password' },
      { key: 'page_id', label: 'ID da Página', placeholder: '1234567890' },
    ],
    docsUrl: 'https://developers.facebook.com/docs/pages-api',
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    iconColor: 'text-foreground',
    description: 'Publique vídeos via TikTok Content Posting API.',
    fields: [
      { key: 'client_key', label: 'Client Key', placeholder: 'aw...' },
      { key: 'access_token', label: 'Access Token', placeholder: 'act....', type: 'password' },
    ],
    docsUrl: 'https://developers.tiktok.com/doc/content-posting-api-get-started',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: Linkedin,
    iconColor: 'text-blue-700',
    description: 'Publique em perfis e páginas de empresa do LinkedIn.',
    fields: [
      { key: 'access_token', label: 'Access Token', placeholder: 'AQX...', type: 'password' },
      { key: 'organization_id', label: 'ID da Organização', placeholder: 'urn:li:organization:1234' },
    ],
    docsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/',
  },
  {
    id: 'twitter',
    label: 'X (Twitter)',
    icon: Twitter,
    iconColor: 'text-foreground',
    description: 'Publique tweets via X API v2.',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'xxx' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'xxx', type: 'password' },
      { key: 'access_token', label: 'Access Token', placeholder: 'xxx-xxx', type: 'password' },
      { key: 'access_secret', label: 'Access Token Secret', placeholder: 'xxx', type: 'password' },
    ],
    docsUrl: 'https://developer.x.com/en/docs',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: Youtube,
    iconColor: 'text-red-600',
    description: 'Faça upload de vídeos via YouTube Data API v3.',
    fields: [
      { key: 'client_id', label: 'OAuth Client ID', placeholder: 'xxx.apps.googleusercontent.com' },
      { key: 'client_secret', label: 'OAuth Client Secret', placeholder: 'GOCSPX-...', type: 'password' },
      { key: 'refresh_token', label: 'Refresh Token', placeholder: '1//0...', type: 'password' },
    ],
    docsUrl: 'https://developers.google.com/youtube/v3',
  },
];

const STORAGE_KEY = 'social_connectors_config_v1';

export const ConectoresRedesSociaisCRUD = () => {
  const [configs, setConfigs] = useState<Record<string, Record<string, string>>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const updateField = (platform: string, key: string, value: string) => {
    setConfigs((prev) => ({
      ...prev,
      [platform]: { ...(prev[platform] || {}), [key]: value },
    }));
  };

  const isConnected = (platform: PlatformConfig) => {
    const c = configs[platform.id];
    if (!c) return false;
    return platform.fields.every((f) => c[f.key] && c[f.key].trim() !== '');
  };

  const handleSave = (platform: PlatformConfig) => {
    if (!isConnected(platform)) {
      toast.error(`Preencha todos os campos do ${platform.label}`);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    toast.success(`${platform.label} conectado com sucesso`);
  };

  const handleDisconnect = (platform: PlatformConfig) => {
    setConfigs((prev) => {
      const next = { ...prev };
      delete next[platform.id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    toast.success(`${platform.label} desconectado`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/30 p-3 flex items-start gap-2">
        <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <div className="text-xs text-muted-foreground">
          Configure as credenciais de cada rede social para que o bloco{' '}
          <strong className="text-foreground">"Publicar nas Redes Sociais"</strong> consiga publicar
          posts automaticamente. As credenciais ficam armazenadas com segurança neste
          estabelecimento.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {PLATFORMS.map((platform) => {
          const Icon = platform.icon;
          const connected = isConnected(platform);
          const c = configs[platform.id] || {};

          return (
            <Card key={platform.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className={`h-5 w-5 ${platform.iconColor}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        {platform.label}
                        {connected && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            Conectado
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {platform.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {platform.fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Input
                      type={field.type || 'text'}
                      value={c[field.key] || ''}
                      onChange={(e) => updateField(platform.id, field.key, e.target.value)}
                      placeholder={field.placeholder}
                      className="h-9 text-xs"
                    />
                  </div>
                ))}

                <Separator className="my-2" />

                <div className="flex items-center justify-between gap-2">
                  <a
                    href={platform.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <Link2 className="h-3 w-3" />
                    Documentação
                  </a>
                  <div className="flex gap-2">
                    {connected && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisconnect(platform)}
                      >
                        Desconectar
                      </Button>
                    )}
                    <Button size="sm" onClick={() => handleSave(platform)}>
                      Salvar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default ConectoresRedesSociaisCRUD;
