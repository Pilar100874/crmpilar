import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Loader2, History } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TipoHistorico = 'tudo' | 'posicoes' | 'paradas' | 'workflow';

const TIPOS: { value: TipoHistorico; label: string; desc: string }[] = [
  { value: 'tudo', label: 'Todos os históricos', desc: 'Posições, paradas e estados de automação' },
  { value: 'posicoes', label: 'Posições dos veículos', desc: 'Trajetos e histórico do mapa' },
  { value: 'paradas', label: 'Paradas marcadas', desc: 'Marcações de tempo parado no mapa' },
  { value: 'workflow', label: 'Estados de automação', desc: 'Controle de disparos dos workflows' },
];

function isoDia(d: Date) {
  return d.toISOString().slice(0, 10);
}

export const LimpezaHistoricoConfig: React.FC = () => {
  const hoje = new Date();
  const trintaDias = new Date(hoje.getTime() - 30 * 86400000);

  const [tipo, setTipo] = useState<TipoHistorico>('posicoes');
  const [inicio, setInicio] = useState(isoDia(new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate())));
  const [fim, setFim] = useState(isoDia(trintaDias));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [limpando, setLimpando] = useState(false);

  const aplicarAtalho = (dias: number) => {
    setInicio(isoDia(new Date(2000, 0, 1)));
    setFim(isoDia(new Date(Date.now() - dias * 86400000)));
  };

  const executar = async () => {
    if (!inicio || !fim) {
      toast.error('Informe o período');
      return;
    }
    setLimpando(true);
    try {
      const { data, error } = await supabase.rpc('limpar_historico_logistica', {
        p_tipo: tipo,
        p_data_inicio: new Date(`${inicio}T00:00:00`).toISOString(),
        p_data_fim: new Date(`${fim}T23:59:59`).toISOString(),
      });
      if (error) throw error;
      const r = (data || {}) as Record<string, number>;
      toast.success(
        `Histórico limpo — posições: ${r.posicoes ?? 0}, paradas: ${r.paradas ?? 0}, automações: ${r.workflow ?? 0}`
      );
      setConfirmOpen(false);
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao limpar histórico');
    } finally {
      setLimpando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          Limpeza de histórico
        </CardTitle>
        <CardDescription>
          Remova definitivamente históricos antigos de logística por período.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>O que limpar</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v as TipoHistorico)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {TIPOS.find((t) => t.value === tipo)?.desc}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>De</Label>
            <Input type="date" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Até</Label>
            <Input type="date" value={fim} onChange={(e) => setFim(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => aplicarAtalho(30)}>
            Mais de 30 dias
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => aplicarAtalho(90)}>
            Mais de 90 dias
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => aplicarAtalho(365)}>
            Mais de 1 ano
          </Button>
        </div>

        <Button variant="destructive" className="w-full" onClick={() => setConfirmOpen(true)}>
          <Trash2 className="h-4 w-4 mr-2" />
          Limpar histórico do período
        </Button>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar limpeza</AlertDialogTitle>
            <AlertDialogDescription>
              Isto removerá <strong>{TIPOS.find((t) => t.value === tipo)?.label.toLowerCase()}</strong> entre{' '}
              <strong>{inicio}</strong> e <strong>{fim}</strong>. Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={limpando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={limpando}
              onClick={(e) => {
                e.preventDefault();
                executar();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {limpando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Limpar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default LimpezaHistoricoConfig;
