import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/editores/editorPopup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormInput, Loader2 } from "lucide-react";
import { serializeFillable, type FillableTipo } from "@/lib/editores/mergeEngine";

interface Props {
  onInsert: (token: string) => void;
  triggerClassName?: string;
  triggerLabel?: string;
  asIcon?: boolean;
}

const TIPOS: { value: FillableTipo; label: string; hasOpcoes?: boolean }[] = [
  { value: "texto", label: "Texto curto" },
  { value: "textarea", label: "Texto longo (parágrafo)" },
  { value: "data", label: "Data" },
  { value: "numero", label: "Número" },
  { value: "cnpj", label: "CNPJ (auto-preenche pela Receita)" },
  { value: "check", label: "Caixa de seleção (checkbox)", hasOpcoes: true },
  { value: "lista", label: "Lista suspensa (select)", hasOpcoes: true },
  { value: "radio", label: "Opções (radio)", hasOpcoes: true },
];

// Tabelas disponíveis (mesma lista usada no MergeBuilderDialog).
const TABELAS = [
  { value: "customers", label: "Clientes" },
  { value: "empresas", label: "Empresas / Fornecedores" },
  { value: "ponto_funcionarios", label: "Funcionários" },
  { value: "pedidos_ecommerce", label: "Pedidos" },
  { value: "orcamentos", label: "Orçamentos" },
  { value: "produtos", label: "Produtos" },
  { value: "vis_visitors", label: "Visitantes" },
  { value: "veiculos", label: "Veículos" },
];

export function FormFieldPicker({ onInsert, triggerClassName, triggerLabel = "Inserir campo de formulário", asIcon }: Props) {
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<FillableTipo>("texto");
  const [label, setLabel] = useState("");
  const [fonte, setFonte] = useState<"manual" | "tabela">("manual");
  const [opcoes, setOpcoes] = useState("");
  const [tabela, setTabela] = useState("");
  const [coluna, setColuna] = useState("");
  const [loading, setLoading] = useState(false);
  const [colunas, setColunas] = useState<string[]>([]);
  const [loadingCols, setLoadingCols] = useState(false);

  // Ao selecionar a tabela, carrega dinamicamente as colunas disponíveis
  useEffect(() => {
    if (!tabela) { setColunas([]); setColuna(""); return; }
    let cancel = false;
    (async () => {
      setLoadingCols(true);
      try {
        const { data, error } = await supabase.from(tabela as any).select("*").limit(1);
        if (error) throw error;
        if (cancel) return;
        const cols = data && data[0] ? Object.keys(data[0]) : [];
        setColunas(cols);
        setColuna("");
      } catch (e: any) {
        if (!cancel) { setColunas([]); toast.error(e?.message || "Falha ao ler colunas"); }
      } finally {
        if (!cancel) setLoadingCols(false);
      }
    })();
    return () => { cancel = true; };
  }, [tabela]);

  const cfg = TIPOS.find(t => t.value === tipo)!;

  const inserir = () => {
    if (!label.trim()) return;
    let opcoesArr: string[] | undefined;
    if (cfg.hasOpcoes) {
      if (fonte === "tabela") {
        if (!tabela || !coluna) { toast.error("Selecione tabela e coluna"); return; }
        opcoesArr = [`__DYN__:${tabela}:${coluna}`];
      } else {
        opcoesArr = opcoes.split(",").map(s => s.trim()).filter(Boolean);
      }
    }
    const tipoFinal: FillableTipo =
      tipo === "check" && opcoesArr && opcoesArr.length > 0 ? "radio" : tipo;
    const token = serializeFillable({ tipo: tipoFinal, label: label.trim(), opcoes: opcoesArr });
    const payload = JSON.stringify({ tipo: tipoFinal, token, label: label.trim(), opcoes: (opcoesArr ?? []).join(",") });
    onInsert(`__FIELD__:${payload}`);
    setOpen(false);
    setLabel(""); setOpcoes(""); setTipo("texto"); setFonte("manual"); setTabela(""); setColuna("");
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {asIcon ? (
          <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" title={triggerLabel}>
            <FormInput className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className={triggerClassName}>
            <FormInput className="h-3.5 w-3.5 mr-1" /> {triggerLabel}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inserir campo de formulário</DialogTitle>
          <DialogDescription>
            Cria uma lacuna que o usuário preenche na geração. Se o modo "formulário travado" estiver ativo,
            apenas estes campos poderão ser editados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Tipo</label>
            <Select value={tipo} onValueChange={(v: FillableTipo) => setTipo(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Rótulo</label>
            <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Ex.: Nome do responsável" autoFocus />
          </div>

          {cfg.hasOpcoes && (
            <div className="space-y-2 border rounded p-3 bg-muted/20">
              <div>
                <label className="text-xs text-muted-foreground">Fonte das opções</label>
                <Select value={fonte} onValueChange={(v: "manual" | "tabela") => setFonte(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Digitar opções manualmente</SelectItem>
                    <SelectItem value="tabela">Buscar valores únicos de uma tabela</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {fonte === "tabela" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] text-muted-foreground">Tabela</label>
                    <Select value={tabela} onValueChange={setTabela}>
                      <SelectTrigger className="h-8"><SelectValue placeholder="Selecionar…" /></SelectTrigger>
                      <SelectContent>
                        {TABELAS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Coluna</label>
                    <Select value={coluna} onValueChange={setColuna} disabled={!tabela || loadingCols}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={loadingCols ? "Carregando…" : (tabela ? "Selecionar coluna…" : "Escolha a tabela")} />
                      </SelectTrigger>
                      <SelectContent>
                        {colunas.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 text-[11px] text-muted-foreground">
                    Os valores serão buscados em tempo real ao preencher o formulário.
                  </div>
                </div>
              )}

              {fonte === "manual" && (
                <div>
                  <label className="text-xs text-muted-foreground">Opções (separadas por vírgula)</label>
                  <Input value={opcoes} onChange={e => setOpcoes(e.target.value)} placeholder="SP, RJ, MG" />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={inserir}>Inserir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
