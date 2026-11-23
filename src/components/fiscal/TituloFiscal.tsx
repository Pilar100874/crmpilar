import type { ComponentType, ReactNode } from 'react';

/** Shared Faturamento/Fiscal page title: icon tile, title and a plain-language hint. */
export function TituloFiscal({ icone: Icone, titulo, descricao, children }: { icone: ComponentType<{ className?: string }>; titulo: ReactNode; descricao?: string; children?: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"><Icone className="h-5 w-5" /></span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-lg font-semibold leading-tight sm:text-2xl">{titulo}</h1>{children}</div>
        {descricao && <p className="text-xs text-muted-foreground sm:text-sm">{descricao}</p>}
      </div>
    </div>
  );
}

/** Small legend explaining the required-field marker. */
export function LegendaObrigatorio() {
  return <p className="text-xs text-muted-foreground"><span className="font-semibold text-destructive">*</span> Campo obrigatório</p>;
}

export type TomFiscal = 'sucesso' | 'perigo' | 'alerta' | 'info' | 'neutro' | 'primario';
const TONS: Record<TomFiscal, string> = {
  sucesso: 'bg-success/10 text-success', perigo: 'bg-destructive/10 text-destructive', alerta: 'bg-warning/15 text-warning',
  info: 'bg-info/10 text-info', neutro: 'bg-muted text-muted-foreground', primario: 'bg-primary/10 text-primary',
};
export const tomSituacao = (s?: string): TomFiscal => s === 'autorizada' ? 'sucesso' : s === 'cancelada' ? 'perigo' : ['rejeitada','erro_comunicacao','denegada'].includes(s ?? '') ? 'alerta' : ['processando','enviada'].includes(s ?? '') ? 'info' : 'neutro';

/** Indicator card (reference: icon tile + label + big number). */
export function CardIndicador({ icone: Icone, rotulo, valor, detalhe, tom = 'primario', onClick }: { icone: ComponentType<{ className?: string }>; rotulo: string; valor: ReactNode; detalhe?: ReactNode; tom?: TomFiscal; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className="flex w-full min-w-0 items-center gap-3 rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${TONS[tom]}`}><Icone className="h-5 w-5" /></span>
      <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">{rotulo}</p><p className="truncate text-xl font-bold leading-tight">{valor}</p>{detalhe && <p className="truncate text-xs font-medium text-success">{detalhe}</p>}</div>
    </Tag>
  );
}

/** White panel with accent top border used for filters, lists and forms. */
export function PainelFiscal({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-t-4 border-t-primary/40 bg-card p-3 shadow-sm sm:p-5 ${className}`}>{children}</section>;
}

/** Colored status pill. */
export function SeloSituacao({ tom, children }: { tom: TomFiscal; children: ReactNode }) {
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${TONS[tom]}`}>{children}</span>;
}
