import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { extractFillableTokens } from "@/lib/editores/mergeEngine";
import { fetchDynamicOptions, isDynamicOpcoes, parseDynamic } from "@/lib/editores/dynamicOptions";
import { maskCnpjValue } from "@/lib/editores/cnpjPrompt";

const maskCepValue = (v: string) => {
  const d = (v || "").replace(/\D/g, "").slice(0, 8);
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  html: string;
  values: Record<string, string>;
  onApply: (values: Record<string, string>) => void;
}

// Extrai metadados por token (grupo/sub-campo) direto do HTML dos chips.
function extractFillableMeta(html: string): Map<string, { group: string; subfield: string; cepGroup: string; cepSubfield: string }> {
  const map = new Map<string, { group: string; subfield: string; cepGroup: string; cepSubfield: string }>();
  const re = /<span\b[^>]*\bdata-fillable-field\s*=\s*"([^"]*)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0];
    const token = m[1]
      .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
      .replace(/^\[\[/, "").replace(/\]\]$/, "").trim();
    const g = /data-cnpj-group\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || "";
    const s = /data-cnpj-subfield\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || "";
    const cg = /data-cep-group\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || "";
    const cs = /data-cep-subfield\s*=\s*"([^"]*)"/i.exec(tag)?.[1] || "";
    if (!map.has(token)) map.set(token, { group: g, subfield: s, cepGroup: cg, cepSubfield: cs });
  }
  return map;
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export function QuickFillDialog({ open, onOpenChange, html, values, onApply }: Props) {
  const tokens = useMemo(() => extractFillableTokens(html), [html]);
  const meta = useMemo(() => extractFillableMeta(html), [html]);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [dynOpts, setDynOpts] = useState<Record<string, string[]>>({});
  const [loadingCnpj, setLoadingCnpj] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const d: Record<string, string> = {};
    tokens.forEach(t => {
      let v = values[t.raw] ?? values[t.label] ?? "";
      if (t.tipo === "cnpj" && v) v = maskCnpjValue(v);
      if (t.tipo === "cep" && v) v = maskCepValue(v);
      d[t.raw] = v;
    });
    setDraft(d);
    tokens.forEach(t => {
      const dyn = parseDynamic(t.opcoes || []);
      if (dyn) {
        fetchDynamicOptions(dyn.tabela, dyn.coluna).then(opts => {
          setDynOpts(prev => ({ ...prev, [t.raw]: opts }));
        });
      }
    });
  }, [open, tokens, values]);

  const optionsFor = (tok: (typeof tokens)[number]): string[] =>
    isDynamicOpcoes(tok.opcoes) ? (dynOpts[tok.raw] ?? []) : (tok.opcoes || []);

  const setV = (k: string, v: string) => setDraft(d => ({ ...d, [k]: v }));

  // Ao digitar/sair de um campo CNPJ, busca BrasilAPI e preenche demais tokens do grupo.
  const autofillFromCnpj = async (cnpjRaw: string, sourceToken: string) => {
    const clean = cnpjRaw.replace(/\D/g, "");
    if (clean.length !== 14) return;
    setLoadingCnpj(sourceToken);
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${clean}`);
      if (!resp.ok) return;
      const d: any = await resp.json();
      const byKey: Record<string, string> = {
        cnpj: maskCnpjValue(clean),
        razao_social: d.razao_social || d.nome || "",
        nome_fantasia: d.nome_fantasia || d.fantasia || "",
        logradouro: d.logradouro || "",
        numero: d.numero || "",
        complemento: d.complemento || "",
        bairro: d.bairro || "",
        cep: d.cep || "",
        municipio: d.municipio || "",
        uf: d.uf || "",
        ddd_telefone_1: d.ddd_telefone_1 || "",
        email: d.email || "",
        inscricao_estadual: d.inscricoes_estaduais?.[0]?.inscricao_estadual || "",
        descricao_situacao_cadastral: d.descricao_situacao_cadastral || "",
        data_inicio_atividade: d.data_inicio_atividade || "",
        cnae_fiscal_descricao: d.cnae_fiscal_descricao || "",
      };
      const aliases: Record<string, string> = {};
      const put = (a: string[], v: string) => a.forEach(x => { aliases[norm(x)] = v; });
      put(["cnpj"], byKey.cnpj);
      put(["razao social", "nome", "razaosocial"], byKey.razao_social);
      put(["nome fantasia", "fantasia"], byKey.nome_fantasia);
      put(["logradouro", "endereco", "rua"], byKey.logradouro);
      put(["numero"], byKey.numero);
      put(["complemento"], byKey.complemento);
      put(["bairro"], byKey.bairro);
      put(["municipio", "cidade"], byKey.municipio);
      put(["uf", "estado"], byKey.uf);
      put(["cep"], byKey.cep);
      put(["telefone", "fone"], byKey.ddd_telefone_1);
      put(["email"], byKey.email);
      put(["inscricao estadual", "ie"], byKey.inscricao_estadual);
      put(["situacao"], byKey.descricao_situacao_cadastral);
      put(["abertura", "data abertura"], byKey.data_inicio_atividade);
      put(["cnae principal", "cnae"], byKey.cnae_fiscal_descricao);

      const srcMeta = meta.get(sourceToken);
      const group = srcMeta?.group || "";
      setDraft(prev => {
        const next = { ...prev };
        tokens.forEach(t => {
          const m = meta.get(t.raw);
          if (group && m?.group && m.group !== group) return; // limita ao mesmo grupo
          if (prev[t.raw] && t.raw !== sourceToken) return;   // não sobrescreve preenchidos
          let val = "";
          if (m?.subfield && byKey[m.subfield] != null) val = byKey[m.subfield];
          else {
            const key = norm(t.label);
            if (key && aliases[key]) val = aliases[key];
          }
          if (val) next[t.raw] = val;
        });
        return next;
      });
    } finally {
      setLoadingCnpj("");
    }
  };

  // Autofill via ViaCEP para grupos de CEP.
  const autofillFromCep = async (cepRaw: string, sourceToken: string) => {
    const clean = cepRaw.replace(/\D/g, "");
    if (clean.length !== 8) return;
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      if (!resp.ok) return;
      const d: any = await resp.json();
      if (d?.erro) return;
      const byKey: Record<string, string> = {
        cep: maskCepValue(clean),
        logradouro: d.logradouro || "",
        complemento: d.complemento || "",
        bairro: d.bairro || "",
        localidade: d.localidade || "",
        uf: d.uf || "",
      };
      const aliases: Record<string, string> = {};
      const put = (a: string[], v: string) => a.forEach(x => { aliases[norm(x)] = v; });
      put(["cep"], byKey.cep);
      put(["logradouro", "endereco", "rua"], byKey.logradouro);
      put(["complemento"], byKey.complemento);
      put(["bairro"], byKey.bairro);
      put(["municipio", "cidade", "localidade"], byKey.localidade);
      put(["uf", "estado"], byKey.uf);

      const srcMeta = meta.get(sourceToken);
      const group = srcMeta?.cepGroup || "";
      setDraft(prev => {
        const next = { ...prev };
        tokens.forEach(t => {
          const m = meta.get(t.raw);
          if (group && m?.cepGroup && m.cepGroup !== group) return;
          if (prev[t.raw] && t.raw !== sourceToken) return;
          let val = "";
          if (m?.cepSubfield && byKey[m.cepSubfield] != null) val = byKey[m.cepSubfield];
          else {
            const key = norm(t.label);
            if (key && aliases[key]) val = aliases[key];
          }
          if (val) next[t.raw] = val;
        });
        return next;
      });
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preencher campos do formulário</DialogTitle>
          <DialogDescription>
            {tokens.length > 0
              ? `Preencha os ${tokens.length} campo(s) inseridos no documento.`
              : "Nenhum campo de formulário no documento."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {tokens.filter(tok => {
            const m = meta.get(tok.raw);
            // Em grupos CNPJ, exibe apenas o sub-campo CNPJ; os demais são preenchidos automaticamente.
            if (m?.group && m.subfield && m.subfield !== "cnpj") return false;
            // Em grupos CEP, exibe apenas o sub-campo CEP; os demais são preenchidos automaticamente.
            if (m?.cepGroup && m.cepSubfield && m.cepSubfield !== "cep") return false;
            return true;
          }).map(tok => {
            const v = draft[tok.raw] ?? "";
            return (
              <div key={tok.raw} className="space-y-1">
                <label className="text-xs font-medium">{tok.label}</label>
                {tok.tipo === "textarea" ? (
                  <Textarea value={v} onChange={e => setV(tok.raw, e.target.value)} rows={3} />
                ) : tok.tipo === "data" ? (
                  <Input type="date" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                ) : tok.tipo === "numero" ? (
                  <Input type="number" value={v} onChange={e => setV(tok.raw, e.target.value)} />
                ) : tok.tipo === "cnpj" ? (
                  <Input
                    value={v}
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    onChange={e => setV(tok.raw, maskCnpjValue(e.target.value))}
                    onBlur={e => autofillFromCnpj(e.target.value, tok.raw)}
                    disabled={loadingCnpj === tok.raw}
                  />
                ) : tok.tipo === "cep" ? (
                  <Input
                    value={v}
                    placeholder="00000-000"
                    inputMode="numeric"
                    onChange={e => setV(tok.raw, maskCepValue(e.target.value))}
                    onBlur={e => autofillFromCep(e.target.value, tok.raw)}
                  />
                ) : tok.tipo === "check" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={v === "true"} onCheckedChange={ck => setV(tok.raw, ck ? "true" : "")} />
                    <span className="text-xs text-muted-foreground">{v === "true" ? "Marcado" : "Desmarcado"}</span>
                  </div>
                ) : tok.tipo === "lista" ? (
                  <Select value={v} onValueChange={(nv) => setV(tok.raw, nv)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {optionsFor(tok).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : tok.tipo === "radio" ? (
                  <div className="flex flex-wrap gap-3">
                    {optionsFor(tok).map(o => (
                      <label key={o} className="flex items-center gap-1 text-sm">
                        <input type="radio" name={tok.raw} checked={v === o} onChange={() => setV(tok.raw, o)} />
                        {o}
                      </label>
                    ))}
                  </div>
                ) : tok.tipo === "imagem" ? (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const reader = new FileReader();
                        reader.onload = () => setV(tok.raw, String(reader.result || ""));
                        reader.readAsDataURL(f);
                      }}
                    />
                    {v && /^(data:image|https?:\/\/)/i.test(v) && (
                      <img src={v} alt={tok.label} className="max-h-32 rounded border" />
                    )}
                  </div>
                ) : (
                  <Input value={v} onChange={e => setV(tok.raw, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={tokens.length === 0}
            onClick={() => { onApply(draft); onOpenChange(false); }}
          >
            Aplicar no documento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
