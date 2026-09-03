import { Clock, PhoneIncoming, PhoneOutgoing, Trash2 } from "lucide-react";
import {
  formatarQuando,
  useHistoricoChamadas,
  type GrupoHistorico,
} from "@/lib/portaria/historicoChamadas";

interface Props {
  grupo: GrupoHistorico;
  titulo?: string;
  onLigar?: (numero: string) => void;
}

/** Lista o histórico recente de chamadas de um grupo (Ramais, Cadastros, WhatsApp). */
export default function PilarFoneHistorico({ grupo, titulo = "Recentes", onLigar }: Props) {
  const { itens, limpar } = useHistoricoChamadas(grupo);

  return (
    <section className="mt-2 border-t border-white/5 pt-2">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-[#8696A0]">
          <Clock className="h-3.5 w-3.5" /> {titulo}
          {itens.length > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-[#AEBAC1]">{itens.length}</span>
          )}
        </span>
        {itens.length > 0 && (
          <button
            type="button"
            aria-label="Limpar histórico"
            onClick={limpar}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[#8696A0] transition hover:bg-white/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {itens.length === 0 ? (
        <p className="px-4 pb-4 text-[13px] text-[#8696A0]">Nenhum registro recente neste grupo.</p>
      ) : (
        <ul className="pb-2">
          {itens.slice(0, 20).map((r) => (
            <li key={r.id}>
              <button
                type="button"
                disabled={!onLigar}
                onClick={() => onLigar?.(r.numero)}
                className="flex w-full items-center gap-3 px-4 py-2 text-left transition active:bg-white/5 disabled:cursor-default"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5">
                  {r.direcao === "entrada" ? (
                    <PhoneIncoming className="h-4 w-4 text-[#53BDEB]" />
                  ) : (
                    <PhoneOutgoing className="h-4 w-4 text-[#00A884]" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-[#E9EDEF]">{r.nome}</span>
                  <span className="block truncate text-[12px] text-[#8696A0]">
                    {r.numero} · {formatarQuando(r.em)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
