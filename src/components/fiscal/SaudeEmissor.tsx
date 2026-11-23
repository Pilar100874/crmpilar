import {useCallback, useEffect, useState} from 'react';
import {Activity, RefreshCw} from 'lucide-react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {FiscalEmissionEngine} from '@/lib/fiscal/servicoFiscal';
import {emissorOnline} from '@/lib/fiscal/saudeEmissor';

type Coletor = {id: string; nome: string; fiscal_ultima_comunicacao: string | null; fiscal_versao: string | null};
type Saude = {habilitado: boolean; homologado: boolean; ambiente: string; coletores: Coletor[]};
export function SaudeEmissor({estabelecimentoId}: {estabelecimentoId?: string | null}) {
  const [saude, setSaude] = useState<Saude | null>(null);
  const [fila, setFila] = useState<number[]>([]);
  const [erro, setErro] = useState('');
  const [busy, setBusy] = useState(false);
  const carregar = useCallback(async () => {
    if (!estabelecimentoId) return;
    setBusy(true);
    try {
      const [s, ...contagens] = await Promise.all([
        FiscalEmissionEngine.executar({acao: 'testar'}),
        ...['pendente','processando','erro_comunicacao'].map(situacao => supabase.from('fiscal_operacoes').select('id', {count: 'exact', head: true}).eq('estabelecimento_id', estabelecimentoId).eq('situacao', situacao)),
      ]);
      for (const c of contagens) if (c.error) throw c.error;
      setSaude(s); setFila(contagens.map(c => c.count ?? 0)); setErro('');
    } catch(e) { setErro(e instanceof Error ? e.message : 'Não foi possível verificar o emissor'); }
    finally { setBusy(false); }
  }, [estabelecimentoId]);
  useEffect(() => { carregar(); const t = setInterval(carregar, 30000); return () => clearInterval(t); }, [carregar]);
  return <section className="space-y-3 border-b pb-4 min-w-0">
    <div className="flex flex-wrap items-center gap-2"><Activity className="h-5 w-5 text-primary"/><h2 className="font-medium">Saúde do emissor</h2><Button className="ml-auto" size="icon" variant="ghost" disabled={busy} aria-label="Atualizar saúde do emissor" title="Atualizar saúde do emissor" onClick={carregar}><RefreshCw className="h-4 w-4"/></Button></div>
    {erro ? <p className="text-sm text-destructive break-words">Verificação indisponível: {erro}</p> : !saude ? <p className="text-sm text-muted-foreground">Verificando emissor…</p> : <>
      <div className="flex flex-wrap gap-2"><Badge variant={saude.habilitado ? 'default' : 'outline'}>{saude.habilitado ? 'Emissão ativada' : 'Emissão desativada'}</Badge><Badge variant="outline">{saude.ambiente === 'producao' ? 'Produção' : 'Homologação'}</Badge><Badge variant="outline">{saude.homologado ? 'Homologação comprovada' : 'Homologação pendente'}</Badge></div>
      <dl className="grid grid-cols-3 gap-2">{['Na fila','Processando','Falhas'].map((nome,i) => <div key={nome} className="border-l-2 border-border pl-3"><dt className="text-xs text-muted-foreground">{nome}</dt><dd className={i === 2 && fila[i] > 0 ? 'text-xl font-semibold text-destructive' : 'text-xl font-semibold'}>{fila[i] ?? 0}</dd></div>)}</dl>
      {!saude.coletores.length && <p className="text-sm text-muted-foreground">Nenhum Coletor cadastrado e liberado.</p>}
      {saude.coletores.map(c => <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"><div className="min-w-0"><p className="text-sm font-medium break-words">{c.nome || 'Coletor'}{c.fiscal_versao ? ` · ${c.fiscal_versao}` : ''}</p><p className="text-xs text-muted-foreground">{c.fiscal_ultima_comunicacao ? `Última comunicação fiscal: ${new Date(c.fiscal_ultima_comunicacao).toLocaleString('pt-BR')}` : 'Sem comunicação do módulo fiscal'}</p></div><Badge variant={emissorOnline(c.fiscal_ultima_comunicacao) ? 'default' : 'destructive'}>{emissorOnline(c.fiscal_ultima_comunicacao) ? 'Fiscal conectado' : 'Fiscal sem conexão'}</Badge></div>)}
    </>}
  </section>;
}