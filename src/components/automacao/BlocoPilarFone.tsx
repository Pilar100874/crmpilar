import { Phone, MessageCircle, Users } from "lucide-react";
import { Bloco } from "@/lib/automacao/api";
import { abrirPilarSip, type AbaPilarFone } from "@/components/portaria/PilarFoneWeb";
import { Button } from "@/components/ui/button";

/** Atalho do Pilar Fone no painel: abre o telefone, já discando um número se configurado. */
export default function BlocoPilarFone({ bloco }: { bloco: Bloco }) {
  const cfg = (bloco.config ?? {}) as { numero?: string; aba?: AbaPilarFone; contato?: string };
  const numero = (cfg.numero ?? "").trim();
  const aba: AbaPilarFone = cfg.aba ?? "ramais";

  return (
    <div className="flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          <Phone className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{bloco.nome || "Pilar Fone"}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {numero ? `Ligar para ${cfg.contato || numero}` : "Abrir o telefone do sistema"}
          </p>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" className="flex-1" onClick={() => abrirPilarSip(numero || undefined, { aba, nome: cfg.contato })}>
          <Phone className="mr-1 h-3.5 w-3.5" />
          {numero ? "Ligar" : "Abrir"}
        </Button>
        {numero ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => abrirPilarSip(numero, { aba: "whatsapp", nome: cfg.contato })}
          >
            <MessageCircle className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={() => abrirPilarSip(undefined, { aba: "ramais" })}>
            <Users className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
