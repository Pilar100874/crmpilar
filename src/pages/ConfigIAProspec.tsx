import React, { useEffect, useState } from 'react';
import { Sparkles, CheckCircle2, XCircle, RefreshCw, ExternalLink, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Providers = { lovable: boolean; openai: boolean; anthropic: boolean };

export default function ConfigIAProspec() {
  const [status, setStatus] = useState<Providers | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openai, setOpenai] = useState('');
  const [anthropic, setAnthropic] = useState('');
  const [openaiSaved, setOpenaiSaved] = useState(false);
  const [anthropicSaved, setAnthropicSaved] = useState(false);
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);

  const carregar = async () => {
    setLoading(true);
    try {
      const [{ data: statusData, error: statusErr }, userRes] = await Promise.all([
        supabase.functions.invoke('wizard-prospeccao', { body: { modo: 'status' } }),
        supabase.auth.getUser(),
      ]);
      if (statusErr) throw statusErr;
      setStatus((statusData as any).providers);

      const uid = userRes.data.user?.id;
      if (uid) {
        const { data } = await supabase
          .from('ia_prospec_keys' as any)
          .select('openai_api_key, anthropic_api_key')
          .eq('user_id', uid)
          .maybeSingle();
        const d = data as any;
        setOpenaiSaved(!!d?.openai_api_key);
        setAnthropicSaved(!!d?.anthropic_api_key);
      }
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (provider: 'openai' | 'anthropic', value: string) => {
    setSaving(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) throw new Error('Sessão inválida');
      const col = provider === 'openai' ? 'openai_api_key' : 'anthropic_api_key';
      const { error } = await supabase
        .from('ia_prospec_keys' as any)
        .upsert({ user_id: uid, [col]: value.trim() || null } as any, { onConflict: 'user_id' });
      if (error) throw error;
      toast.success('Chave salva');
      if (provider === 'openai') { setOpenai(''); }
      else { setAnthropic(''); }
      await carregar();
    } catch (e: any) {
      toast.error(e?.message ?? 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const remover = async (provider: 'openai' | 'anthropic') => {
    await salvar(provider, '');
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Configurar IAs de Prospecção</h1>
            <p className="text-sm text-muted-foreground">Insira as chaves dos provedores que quiser usar no Wizard.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Alert>
        <AlertDescription>
          As chaves ficam salvas com criptografia por usuário (RLS) e só são usadas server-side dentro da função <code>wizard-prospeccao</code>. Nunca ficam expostas no navegador.
        </AlertDescription>
      </Alert>

      {/* Lovable AI card — sempre ativo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                Lovable AI (Gemini)
                <Badge variant="secondary">Sem chave extra</Badge>
              </CardTitle>
              <CardDescription className="mt-1">
                Provisionado automaticamente. Consome créditos do workspace. Sem busca web nativa — a IA gera candidatos com base no próprio conhecimento.
              </CardDescription>
            </div>
            <Badge className={status?.lovable ? 'bg-green-600 hover:bg-green-600' : ''} variant={status?.lovable ? 'default' : 'outline'}>
              {status?.lovable ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</> : <><XCircle className="h-3 w-3 mr-1" /> Indisponível</>}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* OpenAI */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">OpenAI (GPT-4o + Web Search)</CardTitle>
              <CardDescription className="mt-1">
                Busca real na web. Cobrado por uso na sua conta OpenAI. Obtenha em{' '}
                <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  platform.openai.com/api-keys <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </div>
            <Badge className={status?.openai ? 'bg-green-600 hover:bg-green-600' : ''} variant={status?.openai ? 'default' : 'outline'}>
              {status?.openai ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</> : <><XCircle className="h-3 w-3 mr-1" /> Não configurado</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Chave OpenAI (sk-...)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showOpenai ? 'text' : 'password'}
                placeholder={openaiSaved ? '•••••••• (chave já salva — cole aqui para substituir)' : 'sk-...'}
                value={openai}
                onChange={(e) => setOpenai(e.target.value)}
              />
              <button type="button" onClick={() => setShowOpenai((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showOpenai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={() => salvar('openai', openai)} disabled={saving || !openai.trim()}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
            {openaiSaved && (
              <Button variant="outline" onClick={() => remover('openai')} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anthropic */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-lg">Anthropic (Claude 3.5 Sonnet + Web Search)</CardTitle>
              <CardDescription className="mt-1">
                Busca web nativa do Claude. Cobrado por uso. Obtenha em{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                  console.anthropic.com/settings/keys <ExternalLink className="h-3 w-3" />
                </a>
              </CardDescription>
            </div>
            <Badge className={status?.anthropic ? 'bg-green-600 hover:bg-green-600' : ''} variant={status?.anthropic ? 'default' : 'outline'}>
              {status?.anthropic ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Ativo</> : <><XCircle className="h-3 w-3 mr-1" /> Não configurado</>}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Chave Anthropic (sk-ant-...)</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showAnthropic ? 'text' : 'password'}
                placeholder={anthropicSaved ? '•••••••• (chave já salva — cole aqui para substituir)' : 'sk-ant-...'}
                value={anthropic}
                onChange={(e) => setAnthropic(e.target.value)}
              />
              <button type="button" onClick={() => setShowAnthropic((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showAnthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Button onClick={() => salvar('anthropic', anthropic)} disabled={saving || !anthropic.trim()}>
              <Save className="h-4 w-4 mr-2" /> Salvar
            </Button>
            {anthropicSaved && (
              <Button variant="outline" onClick={() => remover('anthropic')} disabled={saving}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
