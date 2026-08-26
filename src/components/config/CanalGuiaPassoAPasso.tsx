import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink } from "lucide-react";

export interface CanalGuiaCampo {
  /** Nome exato do campo mostrado no formulário */
  campo: string;
  /** Onde encontrar o valor na plataforma do canal */
  onde: string;
  /** Exemplo do formato esperado */
  exemplo?: string;
}

export interface CanalGuiaPasso {
  titulo: string;
  descricao: string;
  /** Link direto do portal usado neste passo */
  link?: { label: string; url: string };
}

interface CanalGuiaPassoAPassoProps {
  titulo: string;
  descricao?: string;
  passos: CanalGuiaPasso[];
  campos?: CanalGuiaCampo[];
  docUrl?: string;
  docLabel?: string;
  /** Abre o guia já expandido */
  defaultOpen?: boolean;
}

/**
 * Guia "passo a passo" padrão dos canais de atendimento.
 * Explica onde obter cada dado exigido nos campos da configuração.
 */
export function CanalGuiaPassoAPasso({
  titulo,
  descricao,
  passos,
  campos,
  docUrl,
  docLabel = "Abrir documentação oficial",
  defaultOpen = false,
}: CanalGuiaPassoAPassoProps) {
  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <BookOpen className="h-4 w-4 text-primary" />
          {titulo}
        </CardTitle>
        {descricao && <CardDescription className="text-xs sm:text-sm">{descricao}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible defaultValue={defaultOpen ? "guia" : undefined}>
          <AccordionItem value="guia" className="border-none">
            <AccordionTrigger className="py-2 text-sm">Ver passo a passo</AccordionTrigger>
            <AccordionContent>
              <ol className="space-y-3">
                {passos.map((passo, index) => (
                  <li key={passo.titulo} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-tight">{passo.titulo}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{passo.descricao}</p>
                      {passo.link && (
                        <a
                          href={passo.link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {passo.link.label}
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ol>

              {campos && campos.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    De onde vem cada campo
                  </p>
                  <div className="space-y-2">
                    {campos.map((campo) => (
                      <div key={campo.campo} className="rounded-md border bg-background p-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary" className="text-[11px]">{campo.campo}</Badge>
                          {campo.exemplo && (
                            <code className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                              {campo.exemplo}
                            </code>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{campo.onde}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {docUrl && (
                <Button variant="outline" size="sm" className="mt-4 w-full" asChild>
                  <a href={docUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {docLabel}
                  </a>
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
