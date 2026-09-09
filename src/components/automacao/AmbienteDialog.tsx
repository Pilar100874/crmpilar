import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Monitor } from "lucide-react";
import { toast } from "sonner";
import { Ambiente, PROPORCOES, TELA_PADRAO, salvarAmbiente } from "@/lib/automacao/api";

interface Props {
  ambiente: Partial<Ambiente> | null;
  onChange: (a: Partial<Ambiente> | null) => void;
  onSalvo: () => void;
}

/** Reduz a proporção para o formato "16:9". */
function proporcaoDe(l: number, a: number) {
  const mdc = (x: number, y: number): number => (y ? mdc(y, x % y) : x);
  const d = mdc(Math.round(l), Math.round(a)) || 1;
  return `${Math.round(l / d)}:${Math.round(a / d)}`;
}

export default function AmbienteDialog({ ambiente, onChange, onSalvo }: Props) {
  const largura = ambiente?.tela_largura ?? TELA_PADRAO.largura;
  const altura = ambiente?.tela_altura ?? TELA_PADRAO.altura;
  const proporcao = proporcaoDe(largura, altura);

  const aplicar = (l: number, a: number) =>
    onChange({ ...ambiente, tela_largura: Math.max(320, Math.round(l)), tela_altura: Math.max(240, Math.round(a)) });

  const gravar = async () => {
    if (!ambiente?.nome?.trim()) { toast.error("Informe o nome do ambiente."); return; }
    await salvarAmbiente({ ...ambiente, tela_largura: largura, tela_altura: altura });
    onChange(null);
    toast.success("Ambiente salvo.");
    onSalvo();
  };

  return (
    <Dialog open={!!ambiente} onOpenChange={(o) => !o && onChange(null)}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{ambiente?.id ? "Editar ambiente" : "Novo ambiente"}</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={ambiente?.nome ?? ""}
              placeholder="Sala, Garagem, Portaria..."
              onChange={(e) => onChange({ ...ambiente, nome: e.target.value })}
            />
          </div>

          <div className="rounded-xl border p-3 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Monitor className="h-4 w-4 text-primary" /> Tela de parede
            </div>
            <p className="text-xs text-muted-foreground">
              Escolha o formato da tela onde este painel será exibido. Os elementos se ajustam sozinhos
              ao tamanho definido, sem sobrar espaço nem cortar nada.
            </p>

            <div className="flex flex-wrap gap-2">
              {PROPORCOES.map((p) => (
                <Button
                  key={p.valor}
                  type="button"
                  size="sm"
                  variant={proporcao === p.valor ? "default" : "outline"}
                  onClick={() => aplicar(p.largura, p.altura)}
                >
                  {p.label}
                </Button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Largura</Label>
                <Input
                  type="number"
                  min={320}
                  value={largura}
                  onChange={(e) => aplicar(Number(e.target.value) || TELA_PADRAO.largura, altura)}
                />
              </div>
              <div>
                <Label className="text-xs">Altura</Label>
                <Input
                  type="number"
                  min={240}
                  value={altura}
                  onChange={(e) => aplicar(largura, Number(e.target.value) || TELA_PADRAO.altura)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Proporção atual: {proporcao}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onChange(null)}>Cancelar</Button>
          <Button onClick={gravar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
