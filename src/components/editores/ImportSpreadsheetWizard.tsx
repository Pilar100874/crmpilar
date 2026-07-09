import { useCallback, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, FileSpreadsheet, X, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { toast } from "@/lib/toast-config";
import { newDatasetId, type ImportedDataset } from "@/lib/editores/importedDatasetStore";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onImport: (ds: ImportedDataset) => void;
}

const normKey = (s: string) =>
  (s || "campo")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "campo";

export function ImportSpreadsheetWizard({ open, onOpenChange, onImport }: Props) {
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [datasetName, setDatasetName] = useState("");
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [colConfig, setColConfig] = useState<{ original: string; key: string; include: boolean }[]>([]);

  const reset = () => {
    setStep(0); setFileName(""); setDatasetName("");
    setRawHeaders([]); setRawRows([]); setColConfig([]);
  };

  const parseFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: "binary" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const arr = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
        if (!arr.length) { toast.error("Arquivo vazio"); return; }
        const headers = (arr[0] as any[]).map((h, i) => String(h ?? `coluna_${i + 1}`).trim() || `coluna_${i + 1}`);
        const rows = arr.slice(1).filter((r) => Array.isArray(r) && r.some((c) => c !== "" && c != null));
        setRawHeaders(headers);
        setRawRows(rows as any[][]);
        setColConfig(headers.map((h) => ({ original: h, key: normKey(h), include: true })));
        setDatasetName(file.name.replace(/\.(xlsx|xls|csv)$/i, ""));
        setStep(1);
        toast.success(`${rows.length} linha(s) carregada(s)`);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao ler arquivo");
      }
    };
    reader.readAsBinaryString(file);
  }, []);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    parseFile(f);
  };

  const previewRows = useMemo(() => rawRows.slice(0, 5), [rawRows]);

  const keysUnique = useMemo(() => {
    const included = colConfig.filter((c) => c.include);
    const keys = included.map((c) => c.key);
    return keys.length === new Set(keys).size && keys.every((k) => /^[a-z_][a-z0-9_]*$/.test(k));
  }, [colConfig]);

  const finish = () => {
    const included = colConfig.filter((c) => c.include);
    if (!included.length) { toast.error("Selecione ao menos uma coluna"); return; }
    if (!keysUnique) { toast.error("Nomes de campos duplicados ou inválidos"); return; }
    const rows = rawRows.map((r) => {
      const o: Record<string, any> = {};
      colConfig.forEach((c, i) => {
        if (c.include) o[c.key] = r[i] ?? "";
      });
      return o;
    });
    const ds: ImportedDataset = {
      id: newDatasetId(datasetName),
      name: datasetName || fileName || "Planilha",
      columns: included.map((c) => c.key),
      rows,
    };
    onImport(ds);
    toast.success(`Planilha "${ds.name}" importada`);
    onOpenChange(false);
    setTimeout(reset, 200);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) setTimeout(reset, 200); }}>
      <DialogContent className="max-w-3xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Importar Excel / CSV</DialogTitle>
          <DialogDescription>
            {step === 0 && "1 de 3 — Envie um arquivo .xlsx, .xls ou .csv"}
            {step === 1 && "2 de 3 — Ajuste nomes e selecione colunas"}
            {step === 2 && "3 de 3 — Confira e confirme"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto py-2">
          {step === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed rounded">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">A primeira linha deve conter os nomes das colunas.</p>
              <label>
                <Button asChild><span><Upload className="h-4 w-4 mr-2" />Selecionar arquivo</span></Button>
                <input type="file" accept=".xlsx,.xls,.csv" onChange={onFile} className="hidden" />
              </label>
              {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-32 shrink-0">Nome do vínculo:</Label>
                <Input value={datasetName} onChange={(e) => setDatasetName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="border rounded">
                <div className="grid grid-cols-[24px_1fr_1fr_1.5fr] gap-2 px-2 py-1.5 border-b bg-muted/40 text-[11px] font-medium">
                  <div></div>
                  <div>Coluna original</div>
                  <div>Nome do campo</div>
                  <div>Amostras</div>
                </div>
                <ScrollArea className="max-h-[340px]">
                  {colConfig.map((c, i) => (
                    <div key={i} className="grid grid-cols-[24px_1fr_1fr_1.5fr] gap-2 px-2 py-1.5 border-b items-center">
                      <Checkbox checked={c.include} onCheckedChange={(v) => {
                        const n = [...colConfig]; n[i] = { ...c, include: !!v }; setColConfig(n);
                      }} />
                      <span className="text-xs truncate" title={c.original}>{c.original}</span>
                      <Input
                        value={c.key}
                        onChange={(e) => { const n = [...colConfig]; n[i] = { ...c, key: normKey(e.target.value) }; setColConfig(n); }}
                        className="h-7 text-xs font-mono"
                        disabled={!c.include}
                      />
                      <div className="text-[11px] text-muted-foreground truncate">
                        {previewRows.map((r) => String(r[i] ?? "")).filter(Boolean).slice(0, 3).join(" · ")}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </div>
              {!keysUnique && <p className="text-xs text-destructive">Nomes de campo devem ser únicos e conter apenas letras, números e _.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="border rounded p-3 bg-muted/20 text-xs space-y-1">
                <div>Nome: <b>{datasetName || fileName}</b></div>
                <div>Arquivo: {fileName}</div>
                <div>Linhas: <Badge variant="secondary">{rawRows.length}</Badge></div>
                <div>Campos: {colConfig.filter((c) => c.include).map((c) => <code key={c.key} className="mx-0.5">{c.key}</code>)}</div>
              </div>
              <div className="border rounded overflow-auto max-h-[320px]">
                <table className="text-[11px] w-full">
                  <thead className="bg-muted sticky top-0"><tr>{colConfig.filter((c) => c.include).map((c) => <th key={c.key} className="px-2 py-1 text-left border-b">{c.key}</th>)}</tr></thead>
                  <tbody>
                    {rawRows.slice(0, 10).map((r, ri) => (
                      <tr key={ri} className="border-b">
                        {colConfig.map((c, i) => c.include ? <td key={c.key} className="px-2 py-1">{String(r[i] ?? "").slice(0, 40)}</td> : null)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          {step < 2 && (
            <Button onClick={() => setStep(step + 1)} disabled={step === 0 ? rawHeaders.length === 0 : !keysUnique}>
              Próximo <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={finish}><Check className="h-4 w-4 mr-1" /> Importar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
