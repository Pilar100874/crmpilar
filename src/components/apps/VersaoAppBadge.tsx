import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { buscarVersaoApp, formatarDataVersao, type AppVersaoInfo } from "@/lib/appVersions";

/** Mostra a última versão publicada de um aplicativo, lendo o manifesto informado. */
export default function VersaoAppBadge({
  manifesto,
  versaoPadrao,
  className = "",
}: {
  manifesto: string;
  versaoPadrao?: string;
  className?: string;
}) {
  const [info, setInfo] = useState<AppVersaoInfo | null>(null);

  useEffect(() => {
    let ativo = true;
    buscarVersaoApp(manifesto).then((d) => ativo && setInfo(d));
    return () => {
      ativo = false;
    };
  }, [manifesto]);

  const versao = info?.versao || versaoPadrao;
  if (!versao) return null;

  const data = formatarDataVersao(info?.atualizadoEm);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary ${className}`}
      title={data ? `Publicada em ${data}` : undefined}
    >
      <CheckCircle2 className="h-3.5 w-3.5" />
      Última versão {versao}
      {data && <span className="font-normal opacity-70">· {data}</span>}
    </span>
  );
}
