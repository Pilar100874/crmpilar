import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Monitor } from "lucide-react";
import { toast } from "sonner";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  aplicarFormatoGrupo,
} from "@/lib/automacao/api";
import { supabase } from "@/integrations/supabase/client";

/** Reduz a proporção para o formato "16:9". */
function proporcaoDe(l: number, a: number) {
  const mdc = (x: number, y: number): number => (y ? mdc(y, x % y) : x);
  const d = mdc(Math.round(l), Math.round(a)) || 1;
  return `${Math.round(l / d)}:${Math.round(a / d)}`;
}

interface Props {
  abas: Ambiente[];
  aberto: boolean;
  onFechar: () => void;
  onSalvo: () => void;
}

/** Configurações de formato/aparelho que valem para todas as abas da tela. */
export default function TelaConfigDialog({ abas, aberto, onFechar, onSalvo }: Props {
  const db = supabase as unknown as { from: (t: string) => any };

  const primeira = abas[0];
  const tipoInicial: TipoTela = (primeira?.dispositivo as TipoTela) ?? "tv";
  const [tipoTela, setTipoTela] = useState<TipoTela>(tipoInicial);
  const [largura, setLargura] = useState(primeira?.tela_largura ?? TELA_PADRAO.largura);
  const [altura, setAltura] = useState(primeira?.tela_altura ?? TELA_PADRAO.altura);
  const [rolagem, setRolagem] = useState(primeira?.rolagem === true);
  const [mostrarAbas, setMostrarAbas] = useState(primeira?.mostrar_abas !== false);
  const [telaNome, setTelaNome] = useState(primeira?.tela_nome?.trim() || primeira?.nome || "");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    const t = tipoInicial;
    setTipoTela(t);
    setLargura(primeira?.tela_largura ?? TELA_PADRAO.largura);
    setAltura(primeira?.tela_altura ?? TELA_PADRAO.altura);
    setRolagem(primeira?.rolagem === true);
    setMostrarAbas(primeira?.mostrar_abas !== false);
    setTelaNome(primeira?.tela_nome?.trim() || primeira?.nome || "");
  }, [aberto, primeira?.id]);

  const aplicar = (l: number, a: number) => {
    setLargura(Math.max(320, Math.round(l)));
    setAltura(Math.max(240, Math.round(a)));
  };

  const trocarTipo = (t: TipoTela) => {
    const primeiro = FORMATOS_TELA[t][0];
    setTipoTela(t);
    setLargura(primeiro.largura);
    setAltura(primeiro.altura);
    if (t === "celular") setRolagem(true);
    else if (t === "tv" || t === "computador") setRolagem(false);
  };

  const salvar = async () => {
    if (!abas.length || salvando) return;
    setSalvando(true);
    try {
      const nomeLimpo = telaNome.trim();
      if (!nomeLimpo) { toast.error("Informe o nome da tela."); return; }

      const payload = {
        dispositivo: tipoTela,
        tela_largura: largura,
        tela_altura: altura,
        rolagem,
        mostrar_abas: mostrarAbas,
        tela_nome: nomeLimpo,
      };

      // Atualiza todas as abas do grupo.
      await db.from("automacao_ambientes").update(payload).in(
        "id",
        abas.map((a) => a.id),
      );

      // Se mudou o aparelho, aplica também o formato para o novo grupo.
      if (tipoInicial !== tipoTela) {
        await aplicarFormatoGrupo(tipoInicial, {
          dispositivo: tipoTela,
          tela_largura: largura,
          tela_altura: altura,
          rolagem,
        }, nomeLimpo);
      }

      toast.success("Configurações da tela salvas.");
      onSalvo();
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  const proporcao = proporcaoDe(largura, altura);

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5 text-primary" /> Onde aparece
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <p className="text-xs text-muted-foreground">
            Essas configurações valem para todas as abas desta tela ao mesmo tempo.
          </p>

          <div>
            <Label>Nome da tela</Label>
            <Input
              value={telaNome}
              placeholder="Painel da Portaria, Casa, Filial..."
              onChange={(e) => setTelaNome(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Telas com o mesmo nome (no mesmo aparelho) viram abas dentro do mesmo cartão.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs">Aparelho</Label>
              <Select value={tipoTela} onValueChange={(v) => trocarTipo(v as TipoTela)}>
                <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {TIPOS_TELA.map((t) => (
                    <SelectItem key={t.valor} value={t.valor}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Formato da tela</Label>
              <Select
                value={FORMATOS_TELA[tipoTela].find((p) => p.largura === largura && p.altura === altura)?.valor ?? "personalizado"}
                onValueChange={(v) => {
                  const p = FORMATOS_TELA[tipoTela].find((f) => f.valor === v);
                  if (p) aplicar(p.largura, p.altura);
                }}
              >
                <SelectTrigger className="text-left"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-popover">
                  {FORMATOS_TELA[tipoTela].map((p) => (
                    <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="personalizado">Tamanho personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={mostrarAbas}
              onChange={(e) => setMostrarAbas(e.target.checked)}
            />
            Mostrar as abas das telas deste mesmo aparelho
          </label>

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

          {(tipoTela === "tablet" || tipoTela === "celular") && (
            <div className="rounded-lg bg-muted/50 p-2 space-y-2">
              <Button
                type="button"
                size="sm"
                variant={rolagem ? "default" : "outline"}
                onClick={() => setRolagem((v) => !v)}
              >
                {rolagem ? "Rolagem para baixo ligada" : "Rolagem para baixo desligada"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Com a rolagem ligada, o painel ocupa toda a largura do aparelho e a pessoa desliza para
                baixo para ver o resto. Deixe a altura maior que a da tela para ganhar mais espaço.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3 bg-background">
          <Button variant="outline" disabled={salvando} onClick={onFechar}>Cancelar</Button>
          <Button disabled={salvando || !telaNome.trim()} onClick={salvar}>
            {salvando ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
