import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Calculator, Sigma, Sparkles, Info } from "lucide-react";
import { evalCalculados, type CampoCalculado } from "@/lib/editores/mergeEngine";

interface CampoDisponivel {
  chave: string;   // ex: reg.total ou itens.preco
  alias: string;
  campo: string;
  tabela?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  value: CampoCalculado;
  campos: CampoDisponivel[];
  sampleRow?: any;
  onSave: (novo: CampoCalculado) => void;
}

interface FnDef {
  id: string;
  label: string;
  desc: string;
  template: string; // ex: SUM(itens.valor) vira "{{sum itens.valor}}"
  needsList?: boolean;
}

const FUNCS: FnDef[] = [
  { id: "sum",   label: "SOMA",       desc: "Soma todos os valores de uma lista.",         template: "{{sum ▮}}", needsList: true },
  { id: "avg",   label: "MÉDIA",      desc: "Calcula a média dos valores.",                template: "{{avg ▮}}", needsList: true },
  { id: "count", label: "CONTAR",     desc: "Conta quantos itens existem na lista.",       template: "{{count ▮}}", needsList: true },
  { id: "min",   label: "MÍN",        desc: "Menor valor da lista.",                       template: "{{min ▮}}", needsList: true },
  { id: "max",   label: "MÁX",        desc: "Maior valor da lista.",                       template: "{{max ▮}}", needsList: true },
  { id: "mult",  label: "×",          desc: "Multiplicar dois campos ou valores.",         template: "{{= ▮ * ▮ }}" },
  { id: "div",   label: "÷",          desc: "Dividir dois campos ou valores.",             template: "{{= ▮ / ▮ }}" },
  { id: "pct",   label: "% de",       desc: "Aplicar um percentual sobre um valor.",       template: "{{= ▮ * (▮/100) }}" },
  { id: "round", label: "ARRED",      desc: "Arredonda um valor.",                         template: "{{= Math.round(▮) }}" },
  { id: "if",    label: "SE",         desc: "Condicional simples (retorna A ou B).",       template: "{{= (▮ > 0) ? ▮ : 0 }}" },
];

const OPS = ["+", "-", "*", "/", "(", ")", ",", "."];

export function FormulaBuilderDialog({ open, onOpenChange, value, campos, sampleRow, onSave }: Props) {
  const [nome, setNome] = useState(value.nome || "");
  const [expr, setExpr] = useState(value.expressao || "");
  const [busca, setBusca] = useState("");
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (open) {
      setNome(value.nome || "");
      setExpr(value.expressao || "");
      setBusca("");
    }
  }, [open, value]);

  const insertAtCursor = (text: string) => {
    const ta = taRef.current;
    if (!ta) { setExpr((e) => e + text); return; }
    const start = ta.selectionStart ?? expr.length;
    const end = ta.selectionEnd ?? expr.length;
    const novo = expr.slice(0, start) + text + expr.slice(end);
    setExpr(novo);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + text.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const insertFunc = (fn: FnDef) => {
    // Substitui o primeiro ▮ pelo cursor (fica visível para o usuário completar)
    insertAtCursor(fn.template.replace(/▮/g, "___"));
  };

  const insertCampo = (c: CampoDisponivel) => {
    // Se estamos dentro de um helper de agregação, o path deve ser sem chaves
    // Detecção simples: se cursor está logo após "sum ", "avg " etc., insere só o path.
    const ta = taRef.current;
    const pos = ta?.selectionStart ?? expr.length;
    const before = expr.slice(0, pos);
    const dentroHelper = /\{\{\s*(sum|avg|count|min|max)\s+[^}]*$/.test(before);
    const dentroFormula = /\{\{=\s*[^}]*$/.test(before);
    if (dentroHelper) {
      insertAtCursor(c.chave);
    } else if (dentroFormula) {
      insertAtCursor(c.chave);
    } else {
      insertAtCursor(`{{${c.chave}}}`);
    }
  };

  const preview = useMemo(() => {
    if (!expr.trim() || !sampleRow) return null;
    try {
      const nomeOk = (nome || "__preview__").replace(/[^a-z0-9_]/gi, "_");
      const r = evalCalculados(sampleRow, [{ nome: nomeOk, expressao: expr }]);
      const v = r[nomeOk];
      if (v == null || v === "") return "—";
      if (typeof v === "number") return v.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
      return String(v);
    } catch {
      return "erro";
    }
  }, [expr, nome, sampleRow]);

  const camposFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return campos;
    return campos.filter((c) => c.chave.toLowerCase().includes(q));
  }, [campos, busca]);

  const salvar = () => {
    const chave = nome.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!chave) return;
    onSave({ nome: chave, expressao: expr.trim() });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" /> Criar / editar fórmula
          </DialogTitle>
          <DialogDescription>
            Monte a fórmula visualmente — parecido com o Excel. Clique nas funções e nos campos para inserir.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[220px_1fr] gap-3">
          {/* PAINEL ESQUERDO — funções + campos */}
          <div className="border rounded-md flex flex-col overflow-hidden">
            <div className="p-2 border-b bg-muted/40">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> FUNÇÕES
              </div>
            </div>
            <ScrollArea className="max-h-[180px]">
              <div className="p-2 grid grid-cols-2 gap-1">
                {FUNCS.map((f) => (
                  <Button
                    key={f.id}
                    size="sm"
                    variant="outline"
                    className="h-8 text-[11px] font-mono justify-start"
                    title={f.desc}
                    onClick={() => insertFunc(f)}
                  >
                    {f.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            <div className="p-2 border-t border-b bg-muted/40">
              <div className="text-[11px] font-semibold text-muted-foreground">OPERADORES</div>
            </div>
            <div className="p-2 grid grid-cols-4 gap-1">
              {OPS.map((op) => (
                <Button
                  key={op}
                  size="sm"
                  variant="outline"
                  className="h-8 font-mono text-sm"
                  onClick={() => insertAtCursor(` ${op} `)}
                >
                  {op}
                </Button>
              ))}
            </div>

            <div className="p-2 border-t border-b bg-muted/40">
              <div className="text-[11px] font-semibold text-muted-foreground">CAMPOS</div>
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="buscar campo…"
                className="h-7 text-xs mt-1"
              />
            </div>
            <ScrollArea className="flex-1 max-h-[260px]">
              <div className="p-2 space-y-1">
                {camposFiltrados.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic px-1">
                    Nenhum campo. Selecione campos nas tabelas primeiro.
                  </p>
                )}
                {camposFiltrados.map((c) => (
                  <button
                    key={c.chave}
                    type="button"
                    onClick={() => insertCampo(c)}
                    className="w-full text-left text-[11px] font-mono px-2 py-1 rounded hover:bg-primary/10 border border-transparent hover:border-primary/30 truncate"
                    title={c.chave}
                  >
                    <span className="text-muted-foreground">{c.alias}.</span>{c.campo}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* PAINEL DIREITO — editor da fórmula */}
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Nome do campo calculado</label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value.replace(/[^a-z0-9_]/gi, "").toLowerCase())}
                placeholder="ex: total_com_impostos"
                className="font-mono"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground flex items-center justify-between">
                <span>Fórmula</span>
                <span className="text-[10px]">use <code>___</code> como espaço reservado</span>
              </label>
              <Textarea
                ref={taRef}
                value={expr}
                onChange={(e) => setExpr(e.target.value)}
                placeholder="Ex: {{= itens.preco * itens.quantidade }}  ou  {{sum itens.valor}}"
                className="font-mono text-sm min-h-[120px]"
              />
            </div>

            <div className="border rounded-md p-3 bg-muted/30 space-y-2">
              <div className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                <Sigma className="h-3 w-3" /> RESULTADO (usando 1ª linha da consulta)
              </div>
              <div className="font-mono text-lg">
                {preview ?? <span className="text-muted-foreground text-sm italic">execute a consulta para ver o resultado</span>}
              </div>
            </div>

            <div className="text-[11px] text-muted-foreground flex gap-1 items-start">
              <Info className="h-3 w-3 mt-0.5 shrink-0" />
              <div>
                Sintaxe suportada:
                <div className="flex flex-wrap gap-1 mt-1">
                  <Badge variant="outline" className="font-mono text-[10px]">{"{{campo}}"}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">{"{{sum lista.campo}}"}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">{"{{= a * b }}"}</Badge>
                  <Badge variant="outline" className="font-mono text-[10px]">Math.round / min / max</Badge>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={salvar} disabled={!nome.trim() || !expr.trim()}>Salvar fórmula</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
