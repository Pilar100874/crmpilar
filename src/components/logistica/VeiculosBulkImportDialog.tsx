import React, { useState } from 'react';
import { Plus, Trash2, Send, CheckCircle2, AlertCircle, Loader2, FileText, Radio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { buildTrackerParametersSms, configurarRastreador, TrackerModelLite } from '@/lib/trackerConfig';
import { OPERADORAS_APN } from '@/lib/operadorasSms';

const TIPOS = ['Celular', 'Carro', 'Van', 'Caminhão Leve', 'Caminhão Médio', 'Caminhão Pesado', 'Moto', 'Bicicleta', 'Outro'];

interface Row {
  id: string;
  placa: string;
  tipo_veiculo: string;
  descricao: string;
  telefone_sms: string;
  imei: string;
  tracker_model_id: string;
  operadora_id: string;
  status: 'pendente' | 'enviando' | 'enviado' | 'falhou';
  erro?: string;
}

const newRow = (): Row => ({
  id: Math.random().toString(36).slice(2),
  placa: '',
  tipo_veiculo: 'Carro',
  descricao: '',
  telefone_sms: '',
  imei: '',
  tracker_model_id: '',
  operadora_id: '',
  status: 'pendente',
});

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  estabelecimentoId: string;
  trackerModels: TrackerModelLite[];
  onDone: () => void;
}

export const VeiculosBulkImportDialog: React.FC<Props> = ({ open, onOpenChange, estabelecimentoId, trackerModels, onDone }) => {
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [processing, setProcessing] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [globalTrackerId, setGlobalTrackerId] = useState('');
  const [globalOperadoraId, setGlobalOperadoraId] = useState('');

  const update = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rs => rs.filter(r => r.id !== id));
  const add = () => setRows(rs => [...rs, newRow()]);

  const modelComOperadora = (model: TrackerModelLite, opId: string): TrackerModelLite => {
    const op = OPERADORAS_APN.find(o => o.id === opId);
    if (!op) return model;
    return { ...model, apn: op.apn, apn_user: op.apn_user, apn_password: op.apn_password };
  };

  const cadastrarVeiculo = async (r: Row) => {
    const op = OPERADORAS_APN.find(o => o.id === globalOperadoraId);
    const { data, error } = await supabase
      .from('veiculos')
      .insert({
        estabelecimento_id: estabelecimentoId,
        placa: r.placa.toUpperCase().trim(),
        descricao: r.descricao || null,
        tipo_veiculo: r.tipo_veiculo || null,
        ativo,
        telefone_sms: r.telefone_sms,
        tracker_model_id: globalTrackerId || null,
        apn_operadora: op?.apn || null,
        tipo_chip: 'm2m',
      } as any)
      .select('id')
      .single();
    if (error) throw error;
    return data?.id as string | undefined;
  };

  const processarTodos = async (modo: 'conferencia' | 'm2m') => {
    const validRows = rows.filter(r => r.placa.trim() && r.telefone_sms.trim() && r.status !== 'enviado');
    if (validRows.length === 0) {
      toast.error('Preencha ao menos uma linha com placa e telefone');
      return;
    }
    if (!globalTrackerId) {
      toast.error('Selecione o modelo do rastreador');
      return;
    }
    if (!globalOperadoraId) {
      toast.error('Selecione a operadora (APN) antes de enviar');
      return;
    }
    setProcessing(true);

    for (const r of validRows) {
      update(r.id, { status: 'enviando', erro: undefined });
      try {
        const veiculoId = await cadastrarVeiculo(r);

        if (globalTrackerId) {
          const model = trackerModels.find(m => m.id === globalTrackerId);
          if (model) {
            const finalModel = modelComOperadora(model, globalOperadoraId);
            if (modo === 'conferencia') {
              // 1 SMS consolidado só para conferência dos parâmetros
              const mensagem = buildTrackerParametersSms(finalModel);
              const { data, error } = await supabase.functions.invoke('send-sms', {
                body: { estabelecimento_id: estabelecimentoId, destino: r.telefone_sms, mensagem },
              });
              if (error) throw error;
              if (!(data as any)?.success) throw new Error((data as any)?.erro || 'Falha no SMS');
            } else {
              // Envio real dos comandos via M2M (múltiplos SMS)
              const res = await configurarRastreador({
                estabelecimentoId,
                veiculoId,
                telefone: r.telefone_sms,
                model: finalModel,
                chipType: 'm2m',
              });
              if (res.status === 'falhou') throw new Error(res.error || 'Falha ao enviar SMS');
            }
          }
        }

        update(r.id, { status: 'enviado' });
      } catch (e: any) {
        update(r.id, { status: 'falhou', erro: e?.message || 'Erro' });
      }
    }

    setProcessing(false);
    toast.success('Processamento concluído');
    onDone();
  };

  const statusBadge = (r: Row) => {
    switch (r.status) {
      case 'enviado':
        return <Badge className="bg-green-500 gap-1"><CheckCircle2 className="h-3 w-3" />Enviado</Badge>;
      case 'enviando':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" />Enviando</Badge>;
      case 'falhou':
        return <Badge variant="destructive" className="gap-1" title={r.erro}><AlertCircle className="h-3 w-3" />Falhou</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const enviados = rows.filter(r => r.status === 'enviado').length;
  const total = rows.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-h-[95vh] h-[95vh] sm:h-auto overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="p-3 sm:p-6 sm:pb-3 border-b bg-muted/20 space-y-1">
          <DialogTitle className="text-base sm:text-xl">Cadastro em massa de veículos</DialogTitle>
          <DialogDescription className="text-[11px] sm:text-sm hidden sm:block">
            Cadastre vários veículos de uma vez e dispare os SMS de configuração do rastreador.
          </DialogDescription>
        </DialogHeader>

        {/* Corpo rolável */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-3 bg-background border rounded-lg px-3 py-2">
              <Switch id="bulk-ativo" checked={ativo} onCheckedChange={setAtivo} />
              <Label htmlFor="bulk-ativo" className="cursor-pointer text-sm">
                Cadastrar como <strong>ativos</strong>
              </Label>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {enviados} enviados
              </Badge>
              <Badge variant="outline">{total} linhas</Badge>
            </div>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-900 dark:text-amber-200">
            ⚠️ Os parâmetros só configuram o rastreador com segurança quando enviados para um <b>chip M2M</b> instalado no equipamento.
            O envio para <b>celular normal</b> pode chegar com parâmetros faltando devido a bloqueios da operadora contra SMS em lote.
          </div>

          {/* Configuração fixa aplicada a todas as linhas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Rastreador (aplicado a todos)</Label>
              <Select value={globalTrackerId} onValueChange={setGlobalTrackerId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione o modelo" /></SelectTrigger>
                <SelectContent>
                  {trackerModels.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Operadora (aplicada a todos)</Label>
              <Select value={globalOperadoraId} onValueChange={setGlobalOperadoraId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Selecione a operadora" /></SelectTrigger>
                <SelectContent>
                  {OPERADORAS_APN.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>


          {/* Desktop / tablet largo: tabela */}
          <div className="hidden lg:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow>
                  <TableHead className="w-[110px]">Placa</TableHead>
                  <TableHead className="w-[140px]">Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-[160px]">Telefone (M2M)</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(r => (
                  <TableRow key={r.id} className={r.status === 'enviado' ? 'bg-emerald-500/5' : ''}>
                    <TableCell>
                      <Input value={r.placa} onChange={e => update(r.id, { placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" className="font-mono h-9" />
                    </TableCell>
                    <TableCell>
                      <Select value={r.tipo_veiculo} onValueChange={v => update(r.id, { tipo_veiculo: v })}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input value={r.descricao} onChange={e => update(r.id, { descricao: e.target.value })} placeholder="Descrição" className="h-9" />
                    </TableCell>
                    <TableCell>
                      <Input value={r.telefone_sms} onChange={e => update(r.id, { telefone_sms: e.target.value })} placeholder="+5511..." className="h-9" />
                    </TableCell>

                    <TableCell>{statusBadge(r)}</TableCell>
                    <TableCell>
                      <Button size="icon" variant="ghost" onClick={() => remove(r.id)} disabled={processing}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile / tablet: cards */}
          <div className="lg:hidden space-y-3">
            {rows.map((r, idx) => (
              <div
                key={r.id}
                className={`border rounded-lg p-3 space-y-3 ${r.status === 'enviado' ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-background'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">#{idx + 1}</Badge>
                    {statusBadge(r)}
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => remove(r.id)} disabled={processing} className="h-8 w-8">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Placa</Label>
                    <Input value={r.placa} onChange={e => update(r.id, { placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" className="font-mono h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Tipo</Label>
                    <Select value={r.tipo_veiculo} onValueChange={v => update(r.id, { tipo_veiculo: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Descrição</Label>
                  <Input value={r.descricao} onChange={e => update(r.id, { descricao: e.target.value })} placeholder="Descrição" className="h-9" />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Telefone (M2M)</Label>
                  <Input value={r.telefone_sms} onChange={e => update(r.id, { telefone_sms: e.target.value })} placeholder="+5511..." className="h-9" inputMode="tel" />
                </div>




                {r.erro && (
                  <p className="text-xs text-destructive flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />{r.erro}
                  </p>
                )}
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={add} disabled={processing} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />Adicionar linha
          </Button>
        </div>

        <DialogFooter className="p-3 sm:p-6 sm:pt-3 border-t bg-muted/20 flex-col-reverse sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing} className="w-full sm:w-auto">
            Fechar
          </Button>
          <Button onClick={() => processarTodos('m2m')} disabled={processing} className="w-full sm:w-auto">
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
            Enviar dados M2M
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

