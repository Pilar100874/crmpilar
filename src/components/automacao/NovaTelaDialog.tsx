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
import { toast } from "sonner";
import {
  Ambiente, FORMATOS_TELA, TELA_PADRAO, TIPOS_TELA, TipoTela,
  salvarAmbiente,
} from "@/lib/automacao/api";

interface Props {
  aberto: boolean;
  tipoInicial: TipoTela;
  onFechar: () => void;
  /** Devolve o ambiente criado para quem chamou navegar, se quiser. */
  onSalvo: (id?: string) => void;
}

/** Cria uma tela nova perguntando o nome e o formato. Sem configuração de fundo. */
export default function NovaTelaDialog({ aberto, tipoInicial, onFechar, onSalvo }: Props) {
  const [nomeTela, setNomeTela] = useState("");
  const [tipoTela, setTipoTela] = useState<TipoTela>(tipoInicial);
  const [formatoValor, setFormatoValor] = useState<string>("");
  const [largura, setLargura] = useState(TELA_PADRAO.largura);
  const [altura, setAltura] = useState(TELA_PADRAO.altura);
  const [rolagem, setRolagem] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!aberto) return;
    setNomeTela("");
    const t = tipoInicial;
    setTipoTela(t);
    const primeiro = FORMATOS_TELA[t][0];
    setFormatoValor(primeiro.valor);
    setLargura(primeiro.largura);
    setAltura(primeiro.altura);
    setRolagem(t === "celular");
  }, [aberto, tipoInicial]);

  const trocarTipo = (t: TipoTela) => {
    setTipoTela(t);
    const primeiro = FORMATOS_TELA[t][0];
    setFormatoValor(primeiro.valor);
    setLargura(primeiro.largura);
    setAltura(primeiro.altura);
    if (t === "celular") setRolagem(true);
    else if (t === "tv" || t === "computador") setRolagem(false);
  };

  const trocarFormato = (v: string) => {
    setFormatoValor(v);
    if (v === "personalizado") return;
    const f = FORMATOS_TELA[tipoTela].find((x) => x.valor === v);
    if (f) { setLargura(f.largura); setAltura(f.altura); }
  };

  const salvar = async () => {
    const nome = nomeTela.trim();
    if (!nome) { toast.error("Informe o nome da tela."); return; }
    if (salvando) return;
    setSalvando(true);
    try {
      const criado = await salvarAmbiente({
        nome,
        tela_nome: nome,
        ordem: 0,
        tela_largura: largura,
        tela_altura: altura,
        dispositivo: tipoTela,
        rolagem,
        mostrar_abas: true,
        ativo: true,
      });
      if (!criado) { toast.error("Não foi possível criar a tela."); return; }
      toast.success("Tela criada.");
      onSalvo(criado.id);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Nova tela</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 overflow-y-auto pr-1">
          <div>
            <Label>Nome da tela</Label>
            <Input
              value={nomeTela}
              placeholder="Painel da Portaria, Casa, Filial..."
              onChange={(e) => setNomeTela(e.target.value)}
              autoFocus
            />
            <p className="mt-1 text-xs text-muted-foreground">
              A primeira aba recebe o mesmo nome da tela. Você pode adicionar mais abas depois.
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
              <Select value={formatoValor} onValueChange={(v) => trocarFormato(v)}>
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

          {formatoValor === "personalizado" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Largura</Label>
                <Input
                  type="number"
                  min={320}
                  value={largura}
                  onChange={(e) => setLargura(Math.max(320, Number(e.target.value) || 0))}
                />
              </div>
              <div>
                <Label className="text-xs">Altura</Label>
                <Input
                  type="number"
                  min={240}
                  value={altura}
                  onChange={(e) => setAltura(Math.max(240, Number(e.target.value) || 0))}
                />
              </div>
            </div>
          )}

          {(tipoTela === "tablet" || tipoTela === "celular") && (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={rolagem}
                onChange={(e) => setRolagem(e.target.checked)}
              />
              Permitir rolagem para baixo
            </label>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3 bg-background">
          <Button variant="outline" disabled={salvando} onClick={onFechar}>Cancelar</Button>
          <Button disabled={salvando || !nomeTela.trim()} onClick={salvar}>
            {salvando ? "Criando..." : "Criar tela"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
