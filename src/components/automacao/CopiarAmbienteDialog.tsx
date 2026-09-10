import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Ambiente, FORMATOS_TELA, TELA_PADRAO, TipoTela, copiarAmbienteParaTela } from "@/lib/automacao/api";

interface Props {
  aberto: boolean;
  /** Abas da tela de origem (a tela do cartão clicado). */
  origem: Ambiente[];
  /** Todas as abas cadastradas, para escolher a tela de destino. */
  todos: Ambiente[];
  onFechar: () => void;
  onCopiado: () => void;
}

const NOME_APARELHO: Record<TipoTela, string> = {
  tv: "TV",
  computador: "Computador",
  tablet: "Tablet",
  celular: "Celular",
};

function formatoDe(a: Ambiente) {
  const l = a.tela_largura ?? TELA_PADRAO.largura;
  const alt = a.tela_altura ?? TELA_PADRAO.altura;
  const tipo = (a.dispositivo as TipoTela) ?? "tv";
  const conhecido = FORMATOS_TELA[tipo].find((f) => f.largura === l && f.altura === alt);
  return conhecido ? conhecido.label : `${l} × ${alt}`;
}

function chave(a: Ambiente) {
  return `${(a.dispositivo as TipoTela) ?? "tv"}::${a.tela_nome?.trim() || a.nome}`;
}

/** Copia uma aba desta tela para outra tela, mesmo com formato diferente. */
export default function CopiarAmbienteDialog({ aberto, origem, todos, onFechar, onCopiado }: Props) {
  const [abaId, setAbaId] = useState("");
  const [destinoChave, setDestinoChave] = useState("");
  const [nome, setNome] = useState("");
  const [salvando, setSalvando] = useState(false);

  const chaveOrigem = origem[0] ? chave(origem[0]) : "";

  const destinos = useMemo(() => {
    const mapa = new Map<string, Ambiente[]>();
    for (const a of todos) {
      const k = chave(a);
      if (k === chaveOrigem) continue;
      mapa.set(k, [...(mapa.get(k) ?? []), a]);
    }
    return Array.from(mapa.entries());
  }, [todos, chaveOrigem]);

  useEffect(() => {
    if (!aberto) return;
    const primeira = origem[0];
    setAbaId(primeira?.id ?? "");
    setNome(primeira?.nome ?? "");
    setDestinoChave(destinos[0]?.[0] ?? "");
  }, [aberto]); // eslint-disable-line react-hooks/exhaustive-deps

  const abaSelecionada = origem.find((a) => a.id === abaId) ?? null;
  const destinoAbas = destinos.find(([k]) => k === destinoChave)?.[1] ?? [];
  const destino = destinoAbas[0] ?? null;

  const copiar = async () => {
    if (!abaSelecionada || !destino) { toast.error("Escolha a aba e a tela de destino."); return; }
    setSalvando(true);
    const criado = await copiarAmbienteParaTela(abaSelecionada, destino, nome);
    setSalvando(false);
    if (!criado) { toast.error("Não foi possível copiar a aba."); return; }
    toast.success("Aba copiada para a outra tela.");
    onCopiado();
    onFechar();
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Copiar aba para outra tela</DialogTitle></DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Aba que será copiada</Label>
            <Select value={abaId} onValueChange={(v) => {
              setAbaId(v);
              setNome(origem.find((a) => a.id === v)?.nome ?? "");
            }}>
              <SelectTrigger><SelectValue placeholder="Escolha a aba" /></SelectTrigger>
              <SelectContent>
                {origem.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tela de destino</Label>
            <Select value={destinoChave} onValueChange={setDestinoChave}>
              <SelectTrigger><SelectValue placeholder="Escolha a tela" /></SelectTrigger>
              <SelectContent>
                {destinos.map(([k, abas]) => (
                  <SelectItem key={k} value={k}>
                    {NOME_APARELHO[(abas[0].dispositivo as TipoTela) ?? "tv"]} · {abas[0].tela_nome?.trim() || abas[0].nome} ({formatoDe(abas[0])})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {destinos.length === 0 && (
              <p className="mt-1 text-xs text-muted-foreground">Não há outra tela cadastrada para receber a cópia.</p>
            )}
          </div>

          <div>
            <Label>Nome da nova aba</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          {abaSelecionada && destino && (
            <p className="text-xs text-muted-foreground">
              Os elementos são ajustados de {formatoDe(abaSelecionada)} para {formatoDe(destino)} automaticamente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar}>Cancelar</Button>
          <Button onClick={copiar} disabled={salvando || !destino}>
            {salvando ? "Copiando..." : "Copiar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
