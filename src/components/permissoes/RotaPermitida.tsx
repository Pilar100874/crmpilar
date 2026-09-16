// Bloqueia telas que não estão liberadas no grupo de acesso do usuário logado.
// O menu já é filtrado; isto impede o acesso digitando o endereço direto.
import { useMemo, type ReactNode } from "react";
import { useLocation, Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermissoesUsuario } from "@/hooks/usePermissoesUsuario";
import { getCatalogoPermissoes, type NoPermissao } from "@/lib/permissoes/catalogo";
import { EscopoPermissao } from "@/components/permissoes/ContextoPermissao";

/** Rotas sempre liberadas (entrada do sistema e telas neutras). */
const SEMPRE_LIBERADAS = ["/", "/menu", "/menu-visual", "/dashboard", "/perfil", "/avisos"];

interface Entrada {
  path: string;
  secao?: string;
  id: string;
}

let indiceCache: Entrada[] | null = null;

const construirIndice = (): Entrada[] => {
  if (indiceCache) return indiceCache;
  const entradas: Entrada[] = [];
  const percorrer = (nos: NoPermissao[]) => {
    for (const no of nos) {
      if (no.url && no.url.startsWith("/")) {
        const [path, query] = no.url.split("?");
        const secao = query ? new URLSearchParams(query).get("secao") || undefined : undefined;
        entradas.push({ path: path.replace(/\/$/, "") || "/", secao, id: no.id });
      }
      percorrer(no.filhos);
    }
  };
  percorrer(getCatalogoPermissoes());
  // Rotas mais específicas primeiro (com seção e caminhos mais longos)
  entradas.sort((a, b) => Number(Boolean(b.secao)) - Number(Boolean(a.secao)) || b.path.length - a.path.length);
  indiceCache = entradas;
  return entradas;
};

/** Id de permissão da rota atual, ou null quando a rota não está no catálogo. */
export const idDaRota = (pathname: string, search: string): string | null => {
  const caminho = pathname.replace(/\/$/, "") || "/";
  const secao = new URLSearchParams(search).get("secao");
  for (const entrada of construirIndice()) {
    if (entrada.secao) {
      if (entrada.path === caminho && entrada.secao === secao) return entrada.id;
      continue;
    }
    if (entrada.path === caminho) return entrada.id;
  }
  // Sub-rotas (ex: /ia-platform/agentes herda de /ia-platform)
  for (const entrada of construirIndice()) {
    if (!entrada.secao && entrada.path !== "/" && caminho.startsWith(`${entrada.path}/`)) return entrada.id;
  }
  return null;
};

export function RotaPermitida({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation();
  const { podeVer, carregando, acessoTotal } = usePermissoesUsuario();

  const liberada = useMemo(() => {
    if (acessoTotal) return true;
    const caminho = pathname.replace(/\/$/, "") || "/";
    if (SEMPRE_LIBERADAS.includes(caminho)) return true;
    const id = idDaRota(pathname, search);
    if (!id) return true;
    return podeVer(id);
  }, [pathname, search, podeVer, acessoTotal]);

  if (carregando) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!liberada) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <div>
          <h1 className="text-lg font-semibold">Acesso não liberado</h1>
          <p className="text-sm text-muted-foreground">
            Esta tela não está disponível no seu grupo de acesso. Fale com o administrador.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">Voltar ao início</Link>
        </Button>
      </div>
    );
  }

  const idTela = idDaRota(pathname, search);
  return <EscopoPermissao idTela={idTela} idModulo={null}>{children}</EscopoPermissao>;
}
