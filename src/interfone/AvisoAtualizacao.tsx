import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

/** Versão deste APK do Pilar Fone — manter igual a portaria-app/VERSION. */
export const VERSAO_PILAR_FONE = "1.8.4";
const MANIFESTO = "https://crm.pilar.com.br/coletor/interfone-version.json";

const menor = (a: string, b: string) => {
  const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
  const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0);
  }
  return false;
};

/** Faixa no topo do Pilar Fone avisando que há versão nova, com botão para baixar. */
export default function AvisoAtualizacao() {
  const [nova, setNova] = useState<{ version: string; downloadUrl: string } | null>(null);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    const checar = () =>
      fetch(`${MANIFESTO}?t=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.version && j?.downloadUrl && menor(VERSAO_PILAR_FONE, j.version)) setNova(j);
        })
        .catch(() => {});
    checar();
    const t = setInterval(checar, 30 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  if (!nova || fechado) return null;
  return (
    <div className="fixed inset-x-0 top-0 z-[100] flex items-center gap-2 bg-primary px-3 py-2 text-sm text-primary-foreground shadow">
      <span className="min-w-0 flex-1 truncate">
        Nova versão do Pilar Fone: {nova.version} (instalada {VERSAO_PILAR_FONE})
      </span>
      <a
        href={nova.downloadUrl}
        className="flex shrink-0 items-center gap-1 rounded-md bg-primary-foreground/15 px-2 py-1 font-medium"
      >
        <Download className="h-4 w-4" /> Atualizar
      </a>
      <button aria-label="Fechar aviso" onClick={() => setFechado(true)} className="shrink-0 p-1">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
