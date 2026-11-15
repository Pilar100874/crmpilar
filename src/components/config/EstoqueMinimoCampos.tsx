import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { contaComoVenda, sugerirEstoqueMinimo, type SugestaoEstoque } from '@/lib/estoque/estoqueMinimo';

interface Props {
  produtoId?: string;
  minimo: string;
  prazo: string;
  onChange: (campo: 'estoque_minimo' | 'prazo_reposicao_dias', valor: string) => void;
}

export function EstoqueMinimoCampos({ produtoId, minimo, prazo, onChange }: Props) {
  const [vendas, setVendas] = useState<{ data: string; quantidade: number }[] | null>(null);

  useEffect(() => {
    if (!produtoId) { setVendas([]); return; }
    const desde = new Date(Date.now() - 366 * 86400000).toISOString();
    supabase.from('orcamento_itens')
      .select('quantidade, created_at, orcamentos(status, created_at)')
      .eq('produto_id', produtoId).gte('created_at', desde)
      .then(({ data }) => {
        setVendas((data || [])
          .filter((i: any) => contaComoVenda(i.orcamentos?.status))
          .map((i: any) => ({ data: i.orcamentos?.created_at || i.created_at, quantidade: Number(i.quantidade) || 0 })));
      });
  }, [produtoId]);

  const s: SugestaoEstoque | null = vendas ? sugerirEstoqueMinimo(vendas, Number(prazo) || 15) : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium">Estoque mínimo</Label>
        <Input type="number" min="0" step="any" value={minimo} onChange={e => onChange('estoque_minimo', e.target.value)} className="h-9 sm:h-10 text-sm" />
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium">Prazo de reposição (dias)</Label>
        <Input type="number" min="1" value={prazo} onChange={e => onChange('prazo_reposicao_dias', e.target.value)} className="h-9 sm:h-10 text-sm" />
      </div>
      <div className="space-y-1.5 sm:space-y-2">
        <Label className="text-xs sm:text-sm font-medium">Estoque mínimo sugerido</Label>
        <div className="flex gap-2">
          <Input readOnly value={s ? String(s.sugerido) : '...'} className="h-9 sm:h-10 text-sm bg-muted" />
          <Button type="button" variant="outline" size="sm" className="h-9 sm:h-10" disabled={!s || s.sugerido <= 0}
            onClick={() => s && onChange('estoque_minimo', String(s.sugerido))} title="Usar sugestão">
            <TrendingUp className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {!produtoId ? 'Salve o produto para calcular com base nas vendas.'
            : s && s.mediaDiaria > 0
              ? `Média de ${s.mediaDiaria.toFixed(2)}/dia (90 dias), sazonalidade ×${s.fatorSazonal.toFixed(2)}, +20% de segurança.`
              : 'Sem vendas nos últimos 12 meses.'}
        </p>
      </div>
    </div>
  );
}
