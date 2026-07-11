import React, { useState } from 'react';
import { Plus, Trash2, Send, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { configurarRastreador, TrackerModelLite } from '@/lib/trackerConfig';
import { OPERADORAS_APN } from '@/lib/operadorasSms';

const TIPOS = ['Celular', 'Carro', 'Van', 'Caminhão Leve', 'Caminhão Médio', 'Caminhão Pesado', 'Moto', 'Bicicleta', 'Outro'];

interface Row {
  id: string;
  placa: string;
  tipo_veiculo: string;
  descricao: string;
  telefone_sms: string;
  tipo_chip: 'm2m' | 'normal';
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
  tipo_chip: 'm2m',
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

  const update = (id: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => setRows(rs => rs.filter(r => r.id !== id));
  const add = () => setRows(rs => [...rs, newRow()]);

  const modelComOperadora = (model: TrackerModelLite, opId: string): TrackerModelLite => {
    const op = OPERADORAS_APN.find(o => o.id === opId);
    if (!op) return model;
    return { ...model, apn: op.apn, apn_user: op.apn_user, apn_password: op.apn_password };
  };

  const handleEnviarTodos = async () => {
    const validRows = rows.filter(r => r.placa.trim() && r.telefone_sms.trim() && r.status !== 'enviado');
    if (validRows.length === 0) {
      toast.error('Preencha ao menos uma linha com placa e telefone');
      return;
    }
    setProcessing(true);

    for (const r of validRows) {
      update(r.id, { status: 'enviando', erro: undefined });
      try {
        // Insert veículo (ativo=true)
        const { data: ins, error: insErr } = await supabase
          .from('veiculos')
          .insert({
            estabelecimento_id: estabelecimentoId,
            placa: r.placa.toUpperCase().trim(),
            descricao: r.descricao || null,
            tipo_veiculo: r.tipo_veiculo || null,
            ativo: true,
            telefone_sms: r.telefone_sms,
            tipo_chip: r.tipo_chip,
            tracker_model_id: r.tracker_model_id || null,
          } as any)
          .select('id')
          .single();
        if (insErr) throw insErr;
        const veiculoId = ins?.id as string | undefined;

        // Se tem modelo de rastreador, envia comandos SMS
        if (r.tracker_model_id) {
          const model = trackerModels.find(m => m.id === r.tracker_model_id);
          if (model) {
            const res = await configurarRastreador({
              estabelecimentoId,
              veiculoId,
              telefone: r.telefone_sms,
              model: modelComOperadora(model, r.operadora_id),
              chipType: r.tipo_chip,
            });
            if (res.status === 'falhou') throw new Error(res.error || 'Falha ao enviar SMS');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastro em massa de veículos</DialogTitle>
          <DialogDescription>
            Adicione as linhas com placa, tipo, descrição, telefone (M2M) e modelo do rastreador.
            Ao enviar, cada veículo é cadastrado (ativo) e os SMS de configuração são disparados.
          </DialogDescription>
        </DialogHeader>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[110px]">Placa</TableHead>
                <TableHead className="w-[140px]">Tipo</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-[150px]">Telefone (M2M)</TableHead>
                <TableHead className="w-[110px]">Tipo Chip</TableHead>
                <TableHead className="w-[170px]">Rastreador</TableHead>
                <TableHead className="w-[140px]">Operadora</TableHead>
                <TableHead className="w-[110px]">Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(r => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Input value={r.placa} onChange={e => update(r.id, { placa: e.target.value.toUpperCase() })} placeholder="ABC1D23" className="font-mono" />
                  </TableCell>
                  <TableCell>
                    <Select value={r.tipo_veiculo} onValueChange={v => update(r.id, { tipo_veiculo: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{TIPOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input value={r.descricao} onChange={e => update(r.id, { descricao: e.target.value })} placeholder="Descrição" />
                  </TableCell>
                  <TableCell>
                    <Input value={r.telefone_sms} onChange={e => update(r.id, { telefone_sms: e.target.value })} placeholder="+5511..." />
                  </TableCell>
                  <TableCell>
                    <Select value={r.tipo_chip} onValueChange={(v: 'm2m' | 'normal') => update(r.id, { tipo_chip: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="m2m">M2M</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={r.tracker_model_id} onValueChange={v => update(r.id, { tracker_model_id: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {trackerModels.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select value={r.operadora_id} onValueChange={v => update(r.id, { operadora_id: v })}>
                      <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {OPERADORAS_APN.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
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

        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={add} disabled={processing}>
            <Plus className="h-4 w-4 mr-2" />Adicionar linha
          </Button>
          <div className="text-sm text-muted-foreground">
            {rows.filter(r => r.status === 'enviado').length} enviados / {rows.length} total
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>Fechar</Button>
          <Button onClick={handleEnviarTodos} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
