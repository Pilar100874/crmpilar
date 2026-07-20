import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Brain, AlertTriangle, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SentimentAnalysisCRUDProps {
  estabelecimentoId: string;
}

export default function SentimentAnalysisCRUD({ estabelecimentoId: propEstabelecimentoId }: SentimentAnalysisCRUDProps) {
  const [loading, setLoading] = useState(false);
  const [estabelecimentoId, setEstabelecimentoId] = useState<string | null>(null);
  const [config, setConfig] = useState({
    ativo: true,
    threshold_negativo: 0.30,
    threshold_positivo: 0.70,
    canais_monitorados: ['whatsapp', 'webchat', 'telegram'],
    mensagens_consecutivas_alerta: 2,
    escalar_automaticamente: false,
    fila_escalacao_id: null as string | null,
    alerta_sentimento_negativo: true,
  });
  const [filas, setFilas] = useState<any[]>([]);

  useEffect(() => {
    const initEstabelecimento = async () => {
      const id = await getEstabelecimentoId(propEstabelecimentoId);
      setEstabelecimentoId(id);
    };
    initEstabelecimento();
  }, [propEstabelecimentoId]);

  useEffect(() => {
    if (estabelecimentoId) {
      loadConfig();
      loadFilas();
    }
  }, [estabelecimentoId]);

  const loadConfig = async () => {
    if (!estabelecimentoId) return;
    const { data, error } = await supabase
      .from('sentiment_config')
      .select('*')
      .eq('estabelecimento_id', estabelecimentoId)
      .single();

    if (data) {
      setConfig({
        ativo: data.ativo ?? true,
        threshold_negativo: data.threshold_negativo ?? 0.30,
        threshold_positivo: data.threshold_positivo ?? 0.70,
        canais_monitorados: data.canais_ativos ?? ['whatsapp', 'webchat', 'telegram'],
        mensagens_consecutivas_alerta: data.alerta_threshold ?? 2,
        escalar_automaticamente: data.escalar_automaticamente ?? false,
        fila_escalacao_id: data.fila_escalacao_id,
        alerta_sentimento_negativo: data.alerta_sentimento_negativo ?? true,
      });
    }
  };

  const loadFilas = async () => {
    if (!estabelecimentoId) return;
    const { data } = await supabase
      .from('filas_atendimento')
      .select('id, nome')
      .eq('estabelecimento_id', estabelecimentoId)
      .eq('ativa', true);

    if (data) setFilas(data);
  };

  const handleSave = async () => {
    if (!estabelecimentoId) {
      toast.error("Selecione um estabelecimento");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase
        .from('sentiment_config')
        .upsert({
          estabelecimento_id: estabelecimentoId,
          ...config,
        } as any);

      if (error) throw error;

      toast.success("Configurações atualizadas com sucesso");
    } catch (error: any) {
      console.error('Erro ao salvar configurações:', error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const toggleCanal = (canal: string) => {
    const newCanais = config.canais_monitorados.includes(canal)
      ? config.canais_monitorados.filter(c => c !== canal)
      : [...config.canais_monitorados, canal];
    setConfig({ ...config, canais_monitorados: newCanais });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Análise de Sentimento
        </h2>
        <p className="text-muted-foreground text-sm">
          Configure a análise automática de sentimento usando IA
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Configurações Gerais</CardTitle>
          <CardDescription>Ative e configure a análise de sentimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Ativar Análise de Sentimento</Label>
              <p className="text-sm text-muted-foreground">Analisa mensagens automaticamente usando IA</p>
            </div>
            <Switch
              checked={config.ativo}
              onCheckedChange={(checked) => setConfig({ ...config, ativo: checked })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="threshold_negativo">
                Limite Negativo
                <Badge variant="destructive" className="ml-2">0.0 - 1.0</Badge>
              </Label>
              <Input
                id="threshold_negativo"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={config.threshold_negativo}
                onChange={(e) => setConfig({ ...config, threshold_negativo: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Pontuação abaixo deste valor = negativo</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold_positivo">
                Limite Positivo
                <Badge variant="default" className="ml-2">0.0 - 1.0</Badge>
              </Label>
              <Input
                id="threshold_positivo"
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={config.threshold_positivo}
                onChange={(e) => setConfig({ ...config, threshold_positivo: parseFloat(e.target.value) })}
              />
              <p className="text-xs text-muted-foreground">Pontuação acima deste valor = positivo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            Configurações de Alertas
          </CardTitle>
          <CardDescription>Configure quando e como gerar alertas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Alertar Sentimento Negativo</Label>
                <p className="text-sm text-muted-foreground">Gera alerta quando detecta mensagens negativas consecutivas</p>
              </div>
              <Switch
                checked={config.alerta_sentimento_negativo}
                onCheckedChange={(checked) => setConfig({ ...config, alerta_sentimento_negativo: checked })}
              />
            </div>

            {config.alerta_sentimento_negativo && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="mensagens_consecutivas">Mensagens Consecutivas</Label>
                <Input
                  id="mensagens_consecutivas"
                  type="number"
                  min="1"
                  max="10"
                  value={config.mensagens_consecutivas_alerta}
                  onChange={(e) => setConfig({ ...config, mensagens_consecutivas_alerta: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Número de mensagens negativas seguidas para gerar alerta</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Escalação Automática
          </CardTitle>
          <CardDescription>Configure ações automáticas ao detectar problemas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Escalar Automaticamente</Label>
              <p className="text-sm text-muted-foreground">Transfere chat automaticamente para fila de escalação</p>
            </div>
            <Switch
              checked={config.escalar_automaticamente}
              onCheckedChange={(checked) => setConfig({ ...config, escalar_automaticamente: checked })}
            />
          </div>

          {config.escalar_automaticamente && (
            <div className="space-y-2">
              <Label htmlFor="fila_escalacao">Fila de Escalação</Label>
              <Select
                value={config.fila_escalacao_id || ''}
                onValueChange={(value) => setConfig({ ...config, fila_escalacao_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma fila" />
                </SelectTrigger>
                <SelectContent>
                  {filas.map((fila) => (
                    <SelectItem key={fila.id} value={fila.id}>
                      {fila.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Fila para onde os chats serão transferidos</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Canais Monitorados</CardTitle>
          <CardDescription>Selecione quais canais devem ter análise de sentimento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['whatsapp', 'webchat', 'telegram', 'email', 'facebook', 'instagram'].map((canal) => (
              <div key={canal} className="flex items-center space-x-2">
                <Switch
                  id={canal}
                  checked={config.canais_monitorados.includes(canal)}
                  onCheckedChange={() => toggleCanal(canal)}
                />
                <Label htmlFor={canal} className="capitalize cursor-pointer">
                  {canal}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Configurações'}
        </Button>
      </div>
    </div>
  );
}
