import { useRef, useState } from "react";
import { format } from "date-fns";
import { Search, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { correspondeBuscaAgenda } from "@/lib/calendario/buscaAgenda";

interface ResultadoAgenda {
  id: string;
  title: string;
  date: Date;
  contactId?: string;
  contactName?: string;
  description?: string;
  assignedTo?: string;
  userName?: string;
  time?: string;
}

export function BuscaAgenda({ valor, onChange, tarefas, onSelect }: {
  valor: string;
  onChange: (valor: string) => void;
  tarefas: ResultadoAgenda[];
  onSelect: (tarefa: ResultadoAgenda) => void;
}) {
  const [aberta, setAberta] = useState(false);
  const [indice, setIndice] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const resultados = valor.trim() ? tarefas.filter(t => correspondeBuscaAgenda(t, valor)).slice(0, 20) : [];
  const escolher = (tarefa: ResultadoAgenda) => { setAberta(false); onSelect(tarefa); };
  return (
    <div ref={raiz} className="relative min-w-0 flex-1 sm:w-72 sm:flex-none" onBlur={e => {
      if (!raiz.current?.contains(e.relatedTarget)) setAberta(false);
    }}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input value={valor} placeholder="Buscar contatos ou tarefas..." aria-label="Buscar contatos ou tarefas" aria-expanded={aberta && !!valor.trim()}
        onFocus={() => setAberta(true)}
        onChange={e => { onChange(e.target.value); setAberta(true); setIndice(0); }}
        onKeyDown={e => {
          if (e.key === "Escape") setAberta(false);
          if (e.key === "ArrowDown") { e.preventDefault(); setAberta(true); setIndice(i => Math.min(i + 1, resultados.length - 1)); }
          if (e.key === "ArrowUp") { e.preventDefault(); setIndice(i => Math.max(0, i - 1)); }
          if (e.key === "Enter" && aberta) { const alvo = resultados[indice]; if (alvo) { e.preventDefault(); escolher(alvo); } }
        }}
        className="h-9 border-border/60 bg-muted/30 pl-9 text-xs sm:h-10 sm:text-sm" />
      {aberta && valor.trim() && (
        <div data-resultados-busca-agenda className="absolute right-0 top-full z-10 mt-1 max-h-72 w-full overflow-y-auto overflow-x-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg">
          {resultados.length === 0 ? <p className="px-3 py-4 text-xs text-muted-foreground">Nenhum item encontrado.</p> : resultados.map((tarefa, i) => (
            <Button key={tarefa.id} variant="ghost" onMouseDown={e => e.preventDefault()} onClick={() => escolher(tarefa)}
              className={`h-auto w-full min-w-0 justify-start gap-2 whitespace-normal px-2 py-2 text-left ${i === indice ? "bg-accent" : ""}`}>
              <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block break-words text-xs font-semibold">{tarefa.contactName || tarefa.assignedTo || tarefa.title}</span>
                <span className="block break-words text-xs text-muted-foreground">{tarefa.title}</span>
                <span className="block text-[10px] text-muted-foreground">{format(tarefa.date, "dd/MM/yyyy")}{tarefa.time ? ` · ${tarefa.time}` : ""}</span>
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}