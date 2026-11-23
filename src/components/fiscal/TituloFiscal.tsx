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
