import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle, Ban, Clock, Square } from 'lucide-react';
import { ItemEnvio, StatusEnvio } from '../hooks/execucaoSequencial';

const rotulos: Record<StatusEnvio, string> = {
  aguardando: 'Aguardando', processando: 'Processando', registrado: 'Retorno registrado',
  encaminhado: 'Encaminhado para envio', erro: 'Falha', cancelado: 'Cancelado',
};

interface Props {
  itens: ItemEnvio[]; isSending: boolean; progress: number; cancelamentoSolicitado: boolean;
  onCancel: () => void; onClose: () => void;
}

export function MonitorEnvio({ itens, isSending, progress, cancelamentoSolicitado, onCancel, onClose }: Props) {
  const atual = useRef<HTMLLIElement>(null);
  const indiceAtual = itens.findIndex(i => i.status === 'processando');
  useEffect(() => { atual.current?.scrollIntoView({ block: 'nearest' }); }, [indiceAtual]);
  const processados = itens.filter(i => ['registrado', 'encaminhado', 'erro'].includes(i.status)).length;
  const falhas = itens.filter(i => i.status === 'erro').length;
  const cancelados = itens.filter(i => i.status === 'cancelado').length;
  return (
    <div className="flex min-w-0 flex-col gap-4 h-full">
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">{isSending ? (cancelamentoSolicitado ? 'Cancelando processo…' : 'Acompanhamento dos envios') : (cancelamentoSolicitado ? 'Processo cancelado' : 'Processo concluído')}</h3>
        <div className="flex flex-wrap gap-2 text-sm" aria-live="polite">
          <Badge variant="secondary">{processados} de {itens.length} processados</Badge>
          <Badge variant="outline">{falhas} falhas</Badge>
          <Badge variant="outline">{cancelados} cancelados</Badge>
        </div>
        <Progress value={progress} className="h-2" />
        <p className="text-xs text-muted-foreground">Cancelar impede os próximos contatos. O contato em processamento termina; envios já encaminhados não são desfeitos.</p>
      </div>
      <ol aria-label="Acompanhamento por contato" className="min-w-0 max-h-[420px] overflow-y-auto divide-y border-y">
        {itens.map((item, indice) => (
          <li key={item.id} ref={indice === indiceAtual ? atual : undefined} className="flex min-w-0 items-start gap-3 py-3 px-1">
            <span className="text-xs text-muted-foreground w-7 shrink-0 pt-1">{indice + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm break-words">{item.nome}</p>
              <p className="text-xs text-muted-foreground break-all">{item.destino}</p>
              {item.detalhe && <p className="text-xs text-muted-foreground break-words mt-1">{item.detalhe}</p>}
            </div>
            <div className={`flex max-w-[45%] items-center gap-1 text-xs ${item.status === 'erro' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {item.status === 'processando' ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : item.status === 'erro' ? <AlertCircle className="h-4 w-4 shrink-0" /> : item.status === 'cancelado' ? <Ban className="h-4 w-4 shrink-0" /> : item.status === 'aguardando' ? <Clock className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
              <span>{rotulos[item.status]}</span>
            </div>
          </li>
        ))}
      </ol>
      <div className="flex justify-end border-t pt-4">
        {isSending ? <Button variant="destructive" onClick={onCancel} disabled={cancelamentoSolicitado} className="gap-2"><Square className="h-4 w-4" />{cancelamentoSolicitado ? 'Cancelamento solicitado' : 'Cancelar processo'}</Button> : <Button onClick={onClose}>Concluir</Button>}
      </div>
    </div>
  );
}