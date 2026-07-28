import { useState } from "react";
import { CnpjField } from "@/components/cadastros/CnpjField";
import { CepField } from "@/components/cadastros/CepField";
import type { CnpjResultado } from "@/lib/cadastros/cnpjService";
import type { CepResultado } from "@/lib/cadastros/cepService";

/**
 * Página exclusiva para testes E2E (Playwright). Expõe CnpjField/CepField
 * isolados, com hooks `data-testid` para facilitar asserções.
 *
 * Não expor no menu do sistema — acessada apenas por scripts de teste.
 */
export default function DevLookupE2E() {
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [cnpjResult, setCnpjResult] = useState<CnpjResultado | null>(null);
  const [cepResult, setCepResult] = useState<CepResultado | null>(null);
  const [cnpjNotFound, setCnpjNotFound] = useState(false);
  const [cepNotFound, setCepNotFound] = useState(false);

  return (
    <div className="min-h-dvh p-8 max-w-xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold">Lookup E2E Fixture</h1>

      <section className="space-y-2" data-testid="cnpj-section">
        <CnpjField
          value={cnpj}
          onChange={setCnpj}
          onLookup={(d) => { setCnpjResult(d); setCnpjNotFound(false); }}
          onNotFound={() => { setCnpjResult(null); setCnpjNotFound(true); }}
        />
        <div data-testid="cnpj-result">{cnpjResult?.razaoSocial ?? ""}</div>
        <div data-testid="cnpj-notfound">{cnpjNotFound ? "1" : "0"}</div>
      </section>

      <section className="space-y-2" data-testid="cep-section">
        <CepField
          value={cep}
          onChange={setCep}
          onLookup={(d) => { setCepResult(d); setCepNotFound(false); }}
          onNotFound={() => { setCepResult(null); setCepNotFound(true); }}
        />
        <div data-testid="cep-result">{cepResult?.logradouro ?? ""}</div>
        <div data-testid="cep-notfound">{cepNotFound ? "1" : "0"}</div>
      </section>
    </div>
  );
}
