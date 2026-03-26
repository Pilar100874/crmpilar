import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, Trash2, Database, MessageSquare, Bot, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ChatRetencaoCRUDProps {
  estabelecimentoId: string;
}

interface StorageStats {
  conversas: number;
  mensagens: number;
  sessoes_agente: number;
  mensagens_agente: number;
}

const PRESET_DIAS = [
  { value: "30", label: "30 dias (1 mês)" },
  { value: "90", label: "90 dias (3 meses)" },
  { value: "180", label: "180 dias (6 meses)" },
  { value: "365", label: "365 dias (1 ano)" },
  { value: "custom", label: "Personalizado" },
];

export default function ChatRetencaoCRUD({ estabelecimentoId }: ChatRetencaoCRUDProps) {
  const [retencaoDias, setRetencaoDias] = useState(180);
  const [presetValue, setPresetValue] = useState("180");
  const [dataLimpezaManual, setDataLimpezaManual] = useState<Date | undefined>();
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (estabelecimentoId) {
      loadConfig();
      loadStats();
    }
  }, [estabelecimentoId]);

  const loadConfig = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("chat_retencao_config")
      .select("*")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    if (data) {
      setRetencaoDias(data.retencao_dias);
      const matched = PRESET_DIAS.find(p => p.value === String(data.retencao_dias));
      setPresetValue(matched ? String(data.retencao_dias) : "custom");
      if (data.data_limpeza_manual) {
        setDataLimpezaManual(new Date(data.data_limpeza_manual));
      }
    }
    setLoading(false);
  };

  const loadStats = async () => {
    const { data, error } = await supabase.rpc("get_chat_storage_stats", {
      p_estabelecimento_id: estabelecimentoId,
    });
    if (!error && data) {
      setStats(data as unknown as StorageStats);
    }
  };

  const handlePresetChange = (value: string) => {
    setPresetValue(value);
    if (value !== "custom") {
      setRetencaoDias(parseInt(value));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = {
      estabelecimento_id: estabelecimentoId,
      retencao_dias: retencaoDias,
      data_limpeza_manual: dataLimpezaManual ? format(dataLimpezaManual, "yyyy-MM-dd") : null,
      updated_at: new Date().toISOString(),
    };

    const { data: existing } = await supabase
      .from("chat_retencao_config")
      .select("id")
      .eq("estabelecimento_id", estabelecimentoId)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("chat_retencao_config")
        .update(payload)
        .eq("estabelecimento_id", estabelecimentoId));
    } else {
      ({ error } = await supabase
        .from("chat_retencao_config")
        .insert([payload]));
    }

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Configuração de retenção salva com sucesso!" });
    }
    setSaving(false);
  };

  const handleCleanNow = async () => {
    if (!confirm("Tem certeza que deseja limpar os dados antigos agora? Esta ação é irreversível.")) return;
    
    setCleaning(true);
    try {
      // Clean conversations older than retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retencaoDias);
      const cutoffStr = cutoffDate.toISOString();

      // Delete old messages first (via conversations)
      const { data: oldConvs } = await supabase
        .from("conversations")
        .select("id")
        .eq("estabelecimento_id", estabelecimentoId)
        .lt("updated_at", cutoffStr);

      if (oldConvs && oldConvs.length > 0) {
        const ids = oldConvs.map(c => c.id);
        await supabase.from("messages").delete().in("conversation_id", ids);
        await supabase.from("conversations").delete().in("id", ids);
      }

      // Clean old agent sessions
      const { error: agentError } = await supabase
        .from("agent_chat_sessions")
        .delete()
        .eq("estabelecimento_id", estabelecimentoId)
        .lt("updated_at", cutoffStr);

      if (agentError) throw agentError;

      toast({ title: "Limpeza realizada com sucesso!" });
      loadStats();
    } catch (err: any) {
      toast({ title: "Erro na limpeza", description: err.message, variant: "destructive" });
    }
    setCleaning(false);
  };

  const formatNumber = (n: number) => n.toLocaleString("pt-BR");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Storage Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.conversas)}</p>
                <p className="text-xs text-muted-foreground">Conversas</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.mensagens)}</p>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Bot className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.sessoes_agente)}</p>
                <p className="text-xs text-muted-foreground">Sessões IA</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Database className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatNumber(stats.mensagens_agente)}</p>
                <p className="text-xs text-muted-foreground">Msgs IA</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Retention period */}
      <div className="space-y-4">
        <div>
          <Label>Período de retenção</Label>
          <Select value={presetValue} onValueChange={handlePresetChange}>
            <SelectTrigger className="mt-2">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_DIAS.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {presetValue === "custom" && (
          <div>
            <Label>Dias personalizados</Label>
            <Input
              type="number"
              min={1}
              max={3650}
              value={retencaoDias}
              onChange={(e) => setRetencaoDias(parseInt(e.target.value) || 180)}
              className="mt-2 w-40"
            />
          </div>
        )}

        <div>
          <Label>Data para limpeza manual (opcional)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Defina uma data específica. Todas as conversas anteriores a esta data serão removidas ao executar a limpeza.
          </p>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-[240px] justify-start text-left font-normal",
                  !dataLimpezaManual && "text-muted-foreground"
                )}
              >
                <Calendar className="mr-2 h-4 w-4" />
                {dataLimpezaManual
                  ? format(dataLimpezaManual, "dd/MM/yyyy", { locale: ptBR })
                  : "Selecione uma data"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={dataLimpezaManual}
                onSelect={setDataLimpezaManual}
                disabled={(date) => date > new Date()}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {dataLimpezaManual && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 text-xs"
              onClick={() => setDataLimpezaManual(undefined)}
            >
              Limpar data
            </Button>
          )}
        </div>
      </div>

      <Alert>
        <Database className="h-4 w-4" />
        <AlertDescription>
          Conversas com mais de <strong>{retencaoDias} dias</strong> serão removidas automaticamente.
          A limpeza automática dos agentes IA ocorre diariamente às 03:00.
        </AlertDescription>
      </Alert>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Configuração
        </Button>
        <Button variant="destructive" onClick={handleCleanNow} disabled={cleaning}>
          {cleaning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
          Limpar Agora
        </Button>
      </div>
    </div>
  );
}
