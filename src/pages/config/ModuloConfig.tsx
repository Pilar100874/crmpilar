import { Suspense, lazy, useState, type ComponentType } from 'react';
import { useParams, useSearchParams, Navigate } from 'react-router-dom';
import { PanelLeft, PanelLeftClose, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useModulosPermitidos } from '@/components/permissoes/ContextoPermissao';
import { getEstabelecimentoId } from '@/lib/estabelecimentoUtils';
import { CONFIGS_OPERACIONAIS } from '@/lib/menusOperacionais';

const comEstab = (imp: () => Promise<Record<string, unknown>>, nome: string) =>
  lazy(async () => ({ default: (await imp())[nome] as ComponentType<{ estabelecimentoId?: string }> }));

const CONTEUDOS: Record<string, ComponentType<{ estabelecimentoId?: string }>> = {
  condicoes: comEstab(() => import('@/components/config/CondicoesPagamentoCRUD'), 'CondicoesPagamentoCRUD'),
  produtos: comEstab(() => import('@/components/config/ProdutosCRUD'), 'ProdutosCRUD'),
  unidades: comEstab(() => import('@/components/config/UnidadesCRUD'), 'UnidadesCRUD'),
  series: lazy(() => import('@/pages/fiscal/SeriesNumeracao')),
  'tipos-operacao': lazy(() => import('@/pages/fiscal/TiposOperacao')),
  systax: lazy(() => import('@/pages/fiscal/ConfigSystax')),
  'motor-proprio': lazy(() => import('@/pages/fiscal/ConfigMotorFiscal')),
};
const PRECISA_ESTAB = new Set(['condicoes', 'produtos']);

/** Module configuration hub with the same layout as Configurações de Vendas. */
export default function ModuloConfig() {
  const { modulo = '' } = useParams();
  const cfg = CONFIGS_OPERACIONAIS[modulo];
  const [searchParams, setSearchParams] = useSearchParams();
  const [recolhido, setRecolhido] = useState(false);
  const abas = cfg?.abas ?? [];
  const atual = searchParams.get('tab') || abas[0]?.id || '';
  const trocar = (id: string) => setSearchParams({ tab: id });
  const { itensPermitidos } = useModulosPermitidos(cfg?.programId ?? '', abas, atual, trocar);
  const { data: estabelecimentoId } = useQuery({ queryKey: ['user-estabelecimento-vendas'], queryFn: () => getEstabelecimentoId() });
  if (!cfg) return <Navigate to="/" replace />;
  const aba = itensPermitidos.find(t => t.id === atual) || itensPermitidos[0] || abas[0];
  const Icone = aba.icon;
  const Conteudo = CONTEUDOS[aba.id];
  const pronto = !PRECISA_ESTAB.has(aba.id) || !!estabelecimentoId;

  return (
    <div className="h-full flex flex-col">
      <div className="border-b bg-card px-3 sm:px-6 py-3 sm:py-4">
        <h1 className="text-lg sm:text-2xl font-bold">{cfg.titulo}</h1>
        <p className="text-muted-foreground text-xs sm:text-sm mt-1">{cfg.descricao}</p>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
        <div className="lg:hidden border-b bg-muted/30 p-3">
          <Select value={aba.id} onValueChange={trocar}>
            <SelectTrigger className="w-full bg-background">
              <SelectValue><div className="flex items-center gap-2"><Icone className="h-4 w-4" /><span>{aba.label}</span></div></SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-popover">
              {itensPermitidos.map(t => { const I = t.icon; return (
                <SelectItem key={t.id} value={t.id}><div className="flex items-center gap-2"><I className="h-4 w-4" /><span>{t.label}</span></div></SelectItem>
              ); })}
            </SelectContent>
          </Select>
        </div>
        <div className={`hub-menu hidden lg:flex lg:flex-col lg:p-3 lg:gap-1 lg:overflow-y-auto lg:shrink-0 transition-all duration-300 ${recolhido ? 'lg:w-16' : 'lg:w-64'}`}>
          <Button variant="ghost" size="sm" onClick={() => setRecolhido(!recolhido)} className="mb-2 self-end">
            {recolhido ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
          <TooltipProvider delayDuration={0}>
            {itensPermitidos.map(t => {
              const I = t.icon; const ativo = t.id === aba.id;
              const botao = (
                <button key={t.id} onClick={() => trocar(t.id)} className={`hub-menu-item flex items-center gap-3 px-3 py-2.5 text-left w-full text-muted-foreground ${ativo ? 'is-active' : ''} ${recolhido ? 'justify-center' : ''}`}>
                  <I className={`h-4 w-4 shrink-0 ${ativo ? '' : 'opacity-70'}`} />
                  {!recolhido && <span className="truncate">{t.label}</span>}
                </button>
              );
              return recolhido ? (
                <Tooltip key={t.id}><TooltipTrigger asChild>{botao}</TooltipTrigger><TooltipContent side="right">{t.label}</TooltipContent></Tooltip>
              ) : botao;
            })}
          </TooltipProvider>
        </div>
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-3 sm:p-6">
          <Suspense fallback={<div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
            {Conteudo && pronto && <Conteudo key={aba.id} {...(PRECISA_ESTAB.has(aba.id) ? { estabelecimentoId: estabelecimentoId! } : {})} />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
