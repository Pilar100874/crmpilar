import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Fuel, ShieldOff, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BloqueioCombustivelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  veiculo:
    | ({ id: string; placa: string; motorista?: string | null } & Record<string, any>)
    | null;
  estabelecimentoId: string;
}

interface Comando {
  id: string;
  comando: string;
  status: string;
  resposta: string | null;
  created_at: string;
  executado_em: string | null;
}

const labelComando = (c: string) =>
  c === 'bloquear_combustivel' ? 'Bloquear combustível' :
  c === 'desbloquear_combustivel' ? 'Liberar combustível' : c;

const statusVariant = (s: string): 'default' | 'secondary' | 'destructive' | 'outline' =>
  s === 'executado' ? 'default' : s === 'erro' ? 'destructive' : s === 'enviado' ? 'secondary' : 'outline';

export const BloqueioCombustivelDialog: React.FC<BloqueioCombustivelDialogProps> = ({
  open, onOpenChange, veiculo, estabelecimentoId
}) => {
  const [loading, setLoading] = useState(false);
  const [historico, setHistorico] = useState<Comando[]>([]);
  const [ultimoStatus, setUltimoStatus] = useState<'bloqueado' | 'liberado' | 'desconhecido'>('desconhecido');

  useEffect(() => {
    if (open && veiculo) fetchHistorico();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, veiculo?.id]);

  const fetchHistorico = async () => {
    if (!veiculo) return;
    const { data, error } = await supabase
      .from('veiculo_comandos')
      .select('id, comando, status, resposta, created_at, executado_em')
      .eq('veiculo_id', veiculo.id)
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) {
      console.error(error);
      return;
    }
    setHistorico(data || []);
    const ultimoExec = (data || []).find(c => c.status === 'executado');
    if (ultimoExec) {
      setUltimoStatus(ultimoExec.comando === 'bloquear_combustivel' ? 'bloqueado' : 'liberado');
    } else {
      setUltimoStatus('desconhecido');
    }
  };

  const enviarComando = async (comando: 'bloquear_combustivel' | 'desbloquear_combustivel') => {
    if (!veiculo) return;
    const confirmMsg = comando === 'bloquear_combustivel'
      ? `Confirma o BLOQUEIO de combustível do veículo ${veiculo.placa}?\n\nO motor não poderá dar partida.`
      : `Confirma a LIBERAÇÃO de combustível do veículo ${veiculo.placa}?`;
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from('veiculo_comandos').insert({
        veiculo_id: veiculo.id,
        estabelecimento_id: estabelecimentoId,
        comando,
        status: 'pendente',
        criado_por: userData.user?.id ?? null,
      });
      if (error) throw error;

      // Bloqueio de combustível SEMPRE é enviado como comando real ao rastreador
      // (modo M2M), independente do tipo do chip — precisa que o rastreador execute
      // o RELAY,1#/RELAY,0# de fato.
      const telefone = (veiculo as any).telefone_sms as string | null;
      const modelId = (veiculo as any).tracker_model_id as string | null;
      if (telefone && modelId) {
        const { data: model } = await supabase
          .from('tracker_device_models')
          .select('sms_commands, senha_padrao, host, porta, apn, apn_user, apn_password, nome, protocolo')
          .eq('id', modelId)
          .maybeSingle();
        const cmds = Array.isArray((model as any)?.sms_commands) ? (model as any).sms_commands : [];
        const isBloq = comando === 'bloquear_combustivel';
        const cmd = cmds.find((c: any) => {
          const t = String(c?.template || '');
          return isBloq ? /RELAY,\s*1\s*#/i.test(t) : /RELAY,\s*0\s*#/i.test(t);
        });
        if (cmd) {
          const ctx: Record<string, string> = {
            host: (model as any)?.host || '',
            port: String((model as any)?.porta || ''),
            password: (model as any)?.senha_padrao || '',
            apn: (model as any)?.apn || '',
            apn_user: (model as any)?.apn_user || '',
            apn_password: (model as any)?.apn_password || '',
          };
          const rendered = String(cmd.template).replace(/\{(\w+)\}/g, (_m, k) => ctx[k] ?? '');
          await supabase.functions.invoke('send-sms', {
            body: { estabelecimento_id: estabelecimentoId, destino: telefone, mensagem: rendered },
          });
        } else {
          toast.warning('Modelo do rastreador não tem comando de bloqueio configurado');
        }
      }

      toast.success(comando === 'bloquear_combustivel'
        ? 'Comando de bloqueio enviado. Aguarde execução.'
        : 'Comando de liberação enviado. Aguarde execução.');
      fetchHistorico();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao enviar comando');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            Corte de Combustível
          </DialogTitle>
          <DialogDescription>
            {veiculo ? <>Veículo <strong>{veiculo.placa}</strong>{veiculo.motorista ? ` — ${veiculo.motorista}` : ''}</> : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado atual</span>
            <Badge variant={ultimoStatus === 'bloqueado' ? 'destructive' : ultimoStatus === 'liberado' ? 'default' : 'outline'}>
              {ultimoStatus === 'bloqueado' ? 'Bloqueado' : ultimoStatus === 'liberado' ? 'Liberado' : 'Desconhecido'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              variant="destructive"
              className="flex-1"
              disabled={loading}
              onClick={() => enviarComando('bloquear_combustivel')}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldOff className="h-4 w-4 mr-2" />}
              Bloquear
            </Button>
            <Button
              variant="default"
              className="flex-1"
              disabled={loading}
              onClick={() => enviarComando('desbloquear_combustivel')}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              Liberar
            </Button>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <span>
              Só acione com o veículo parado ou em baixa velocidade. O corte impede apenas a partida do motor.
              É necessário que o rastreador (ex.: GT06/J16) tenha o fio de corte instalado.
            </span>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Últimos comandos</div>
            {historico.length === 0 ? (
              <div className="text-xs text-muted-foreground">Nenhum comando enviado ainda.</div>
            ) : (
              <div className="space-y-1 max-h-52 overflow-auto">
                {historico.map(h => (
                  <div key={h.id} className="flex items-center justify-between text-xs border rounded px-2 py-1">
                    <div>
                      <div className="font-medium">{labelComando(h.comando)}</div>
                      <div className="text-muted-foreground">
                        {format(new Date(h.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                        {h.executado_em && ` · exec. ${format(new Date(h.executado_em), "HH:mm", { locale: ptBR })}`}
                      </div>
                    </div>
                    <Badge variant={statusVariant(h.status)}>{h.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BloqueioCombustivelDialog;
