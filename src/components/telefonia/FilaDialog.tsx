import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { DadosFila, FilaPainel, RamalTelefonista } from "@/hooks/usePainelTelefonista";

const ESTRATEGIAS = [
  { valor: "ringall", rotulo: "Todos tocam juntos" },
  { valor: "linear", rotulo: "Por prioridade (ordem da lista)" },
  { valor: "rrmemory", rotulo: "Alternando entre agentes" },
  { valor: "leastrecent", rotulo: "Livre há mais tempo" },
  { valor: "fewestcalls", rotulo: "Menos ligações atendidas" },
  { valor: "random", rotulo: "Aleatório" },
];

export const rotuloEstrategia = (valor?: string) =>
  ESTRATEGIAS.find((e) => e.valor === valor)?.rotulo ?? valor ?? "";

interface Props {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  /** null = criando; preenchido = editando. */
  fila: FilaPainel | null;
  ramais: RamalTelefonista[];
  onSalvar: (dados: DadosFila, criar: boolean) => Promise<void>;
}

export function FilaDialog({ open, onOpenChange, fila, ramais, onSalvar }: Props) {
  const { toast } = useToast();
  const editando = Boolean(fila);

  const [numero, setNumero] = useState("");
  const [nome, setNome] = useState("");
  const [estrategia, setEstrategia] = useState("ringall");
  const [membros, setMembros] = useState<string[]>([]);
  const [esperaMax, setEsperaMax] = useState("300");
  const [toqueAgente, setToqueAgente] = useState("15");
  const [maxAguardando, setMaxAguardando] = useState("10");
  const [intervalo, setIntervalo] = useState("5");
  const [descanso, setDescanso] = useState("10");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNumero(fila?.numero ?? "");
    setNome(fila?.nome ?? "");
    setEstrategia(fila?.estrategia && rotuloEstrategia(fila.estrategia) ? fila.estrategia : "ringall");
    setMembros(fila?.agentes.map((a) => a.ramal) ?? []);
    setEsperaMax(String(fila?.espera_max_config_seg ?? 300));
    setToqueAgente(String(fila?.toque_agente_seg ?? 15));
    setMaxAguardando(String(fila?.max_aguardando ?? 10));
    setIntervalo(String(fila?.intervalo_tentativa_seg ?? 5));
    setDescanso(String(fila?.descanso_seg ?? 10));
  }, [open, fila]);

  const ramaisDisponiveis = useMemo(
    () => ramais.filter((r) => !membros.includes(r.ramal)),
    [ramais, membros],
  );

  const mover = (indice: number, delta: number) => {
    setMembros((atual) => {
      const alvo = indice + delta;
      if (alvo < 0 || alvo >= atual.length) return atual;
      const copia = [...atual];
      [copia[indice], copia[alvo]] = [copia[alvo], copia[indice]];
      return copia;
    });
  };

  const nomeDoRamal = (ramal: string) =>
    ramais.find((r) => r.ramal === ramal)?.nome ?? "";

  const salvar = async () => {
    const numeroLimpo = numero.trim();
    if (!editando && !/^\d{3,6}$/.test(numeroLimpo)) {
      toast({
        title: "Número inválido",
        description: "Use um número de fila com 3 a 6 dígitos (ex.: 900).",
        variant: "destructive",
      });
      return;
    }
    if (nome.trim().length < 2) {
      toast({ title: "Informe um nome para a fila.", variant: "destructive" });
      return;
    }
    if (membros.length === 0) {
      toast({
        title: "Escolha os ramais da fila",
        description: "A fila precisa de pelo menos um ramal atendendo.",
        variant: "destructive",
      });
      return;
    }
    const dados: DadosFila = {
      numero: editando ? fila!.numero : numeroLimpo,
      nome: nome.trim(),
      estrategia,
      membros,
      espera_max_seg: Math.max(0, Number(esperaMax) || 0),
      toque_agente_seg: Math.max(5, Number(toqueAgente) || 15),
      max_aguardando: Math.max(1, Number(maxAguardando) || 10),
      intervalo_tentativa_seg: Math.max(1, Number(intervalo) || 5),
      descanso_seg: Math.max(0, Number(descanso) || 0),
    };
    setSalvando(true);
    try {
      await onSalvar(dados, !editando);
      toast({
        title: editando ? "Fila atualizada" : "Fila criada",
        description: `${dados.nome} (${dados.numero}) já está valendo no PABX.`,
      });
      onOpenChange(false);
    } catch (erro) {
      toast({
        title: "Não foi possível salvar a fila",
        description: erro instanceof Error ? erro.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editando ? `Editar fila ${fila!.numero}` : "Nova fila de atendimento"}</DialogTitle>
          <DialogDescription>
            A fila distribui as ligações entre os ramais escolhidos, conforme a prioridade e o
            tempo de espera definidos aqui.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-numero">Número da fila</Label>
              <Input
                id="fila-numero"
                inputMode="numeric"
                placeholder="Ex.: 900"
                value={numero}
                disabled={editando}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-nome">Nome</Label>
              <Input
                id="fila-nome"
                placeholder="Ex.: Suporte"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Prioridade de distribuição</Label>
            <Select value={estrategia} onValueChange={setEstrategia}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESTRATEGIAS.map((e) => (
                  <SelectItem key={e.valor} value={e.valor}>
                    {e.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estrategia === "linear" && (
              <p className="text-xs text-muted-foreground">
                Na prioridade, o PABX chama os ramais na ordem da lista abaixo. Use as setas para
                ajustar quem atende primeiro.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Ramais que atendem a fila</Label>
            <div className="flex flex-col gap-1 rounded-md border p-2">
              {membros.length === 0 ? (
                <p className="py-1 text-center text-xs text-muted-foreground">
                  Nenhum ramal adicionado.
                </p>
              ) : (
                membros.map((ramal, i) => (
                  <div key={ramal} className="flex items-center gap-1">
                    <span className="flex-1 truncate text-sm text-foreground">
                      {i + 1}. {ramal}
                      {nomeDoRamal(ramal) ? ` — ${nomeDoRamal(ramal)}` : ""}
                    </span>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Subir prioridade" onClick={() => mover(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Descer prioridade" onClick={() => mover(i, 1)} disabled={i === membros.length - 1}>
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Remover da fila" onClick={() => setMembros((m) => m.filter((x) => x !== ramal))}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
              <div className="flex items-center gap-2 pt-1">
                <Select
                  value=""
                  onValueChange={(ramal) => ramal && setMembros((m) => [...m, ramal])}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Adicionar ramal..." />
                  </SelectTrigger>
                  <SelectContent>
                    {ramaisDisponiveis.map((r) => (
                      <SelectItem key={r.ramal} value={r.ramal}>
                        {r.ramal}
                        {r.nome ? ` — ${r.nome}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Plus className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-espera">Espera máxima (segundos)</Label>
              <Input id="fila-espera" inputMode="numeric" value={esperaMax} onChange={(e) => setEsperaMax(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-toque">Toque em cada ramal (segundos)</Label>
              <Input id="fila-toque" inputMode="numeric" value={toqueAgente} onChange={(e) => setToqueAgente(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-max">Máx. pessoas aguardando</Label>
              <Input id="fila-max" inputMode="numeric" value={maxAguardando} onChange={(e) => setMaxAguardando(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-intervalo">Intervalo entre tentativas (segundos)</Label>
              <Input id="fila-intervalo" inputMode="numeric" value={intervalo} onChange={(e) => setIntervalo(e.target.value.replace(/\D/g, ""))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fila-descanso">Descanso após ligação (segundos)</Label>
              <Input id="fila-descanso" inputMode="numeric" value={descanso} onChange={(e) => setDescanso(e.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Voltar
          </Button>
          <Button onClick={() => void salvar()} disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar fila" : "Criar fila"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
