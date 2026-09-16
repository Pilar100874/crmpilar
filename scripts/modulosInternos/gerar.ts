/**
 * Núcleo do gerador de módulos internos das permissões.
 *
 * Varre as rotas de src/App.tsx, localiza o arquivo de cada tela do menu
 * (src/components/Layout.tsx + src/lib/menuStructure.ts) e extrai as abas/seções
 * internas para servirem como "módulos internos" nos grupos de acesso.
 *
 * Usado pelo CLI (scripts/gerarModulosInternos.ts) e pelo plugin do Vite,
 * que regenera automaticamente sempre que o menu ou as telas mudam.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export const ARQUIVO_GERADO = "src/lib/permissoes/modulosInternos.gerado.ts";

/** Arquivos que, ao mudarem, podem alterar o catálogo de módulos. */
export const ARQUIVOS_FONTE = [
  "src/App.tsx",
  "src/components/Layout.tsx",
  "src/lib/menuStructure.ts",
];

export interface ModuloInterno {
  id: string;
  label: string;
}

const limparRotulo = (bruto: string) =>
  bruto
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const mapearModulos = (raiz: string): Record<string, ModuloInterno[]> => {
  const ler = (p: string) => readFileSync(resolve(raiz, p), "utf8");

  // 1) componente -> caminho do arquivo
  const app = ler("src/App.tsx");
  const componentes = new Map<string, string>();
  const reLazy = /const\s+(\w+)\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g;
  const reImport = /import\s+(\w+)\s+from\s+["'](\.\/[^"']+|@\/[^"']+)["']/g;
  for (const m of app.matchAll(reLazy)) componentes.set(m[1], m[2]);
  for (const m of app.matchAll(reImport)) if (!componentes.has(m[1])) componentes.set(m[1], m[2]);

  const resolverArquivo = (especificador: string): string | null => {
    const base = especificador.startsWith("@/")
      ? "src/" + especificador.slice(2)
      : especificador.replace(/^\.\//, "src/");
    for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
      if (existsSync(resolve(raiz, base + ext))) return base + ext;
    }
    return existsSync(resolve(raiz, base)) ? base : null;
  };

  // 2) rota -> componente
  const rotas = new Map<string, string>();
  for (const m of app.matchAll(
    /<Route\s+path="([^"]+)"[\s\S]{0,200}?element=\{\s*(?:<\w+[^>]*>\s*)*?<(\w+)/g
  )) {
    if (!rotas.has(m[1])) rotas.set(m[1], m[2]);
  }

  // 3) itens do menu (id + url)
  const menu = ler("src/components/Layout.tsx") + ler("src/lib/menuStructure.ts");
  const itens: { id: string; url: string }[] = [];
  for (const m of menu.matchAll(/id:\s*"([^"]+)",\s*title:\s*"[^"]*",\s*url:\s*"([^"]+)"/g)) {
    itens.push({ id: m[1], url: m[2] });
  }

  // 4) extrair abas/seções de cada tela
  const extrairAbas = (caminho: string) => {
    const fonte = ler(caminho);
    const abas: ModuloInterno[] = [];
    for (const bloco of fonte.matchAll(/=\s*\[([\s\S]*?)\]\s*(?:as const)?\s*;/g)) {
      const itensBloco = [
        ...bloco[1].matchAll(
          /\{[^{}]*?\bid:\s*["'`]([^"'`]+)["'`][^{}]*?\b(?:label|title|nome):\s*["'`]([^"'`]+)["'`][^{}]*?\bicon:[^{}]*?\}/g
        ),
      ];
      if (itensBloco.length < 2) continue;
      for (const it of itensBloco) {
        if (abas.some((a) => a.id === it[1])) continue;
        abas.push({ id: it[1], label: it[2] });
      }
    }
    for (const m of fonte.matchAll(/<TabsTrigger\b([^>]*)>([\s\S]*?)<\/TabsTrigger>/g)) {
      const valor = /value=["']([^"']+)["']/.exec(m[1])?.[1];
      if (!valor) continue;
      const rotulo = limparRotulo(m[2]) || valor;
      if (abas.some((a) => a.id === valor)) continue;
      abas.push({ id: valor, label: rotulo });
    }
    return abas;
  };

  const saida: Record<string, ModuloInterno[]> = {};
  for (const item of itens) {
    const caminhoRota = item.url.split("?")[0];
    const comp = rotas.get(caminhoRota);
    if (!comp) continue;
    const espec = componentes.get(comp);
    if (!espec) continue;
    const arquivo = resolverArquivo(espec);
    if (!arquivo) continue;
    try {
      const abas = extrairAbas(arquivo);
      if (abas.length > 1) saida[item.id] = abas;
    } catch {
      /* ignora telas ilegíveis */
    }
  }
  return saida;
};

const montarConteudo = (mapa: Record<string, ModuloInterno[]>) =>
  `// ARQUIVO GERADO AUTOMATICAMENTE — não edite à mão.
// Regenerado pelo Vite (plugin modulos-permissoes) e por: npm run permissoes:gerar
// Mapeia o id de um item de menu para os módulos internos (abas) da tela.

export interface ModuloInternoGerado {
  id: string;
  label: string;
}

export const MODULOS_INTERNOS_GERADOS: Record<string, ModuloInternoGerado[]> = ${JSON.stringify(
    mapa,
    null,
    2
  )};
`;

/** Regenera o arquivo se o conteúdo mudou. Retorna se houve alteração e o total de telas. */
export const gerarSeMudou = (raiz: string): { mudou: boolean; telas: number } => {
  const mapa = mapearModulos(raiz);
  const conteudo = montarConteudo(mapa);
  const destino = resolve(raiz, ARQUIVO_GERADO);
  const atual = existsSync(destino) ? readFileSync(destino, "utf8") : "";
  if (atual === conteudo) return { mudou: false, telas: Object.keys(mapa).length };
  writeFileSync(destino, conteudo, "utf8");
  return { mudou: true, telas: Object.keys(mapa).length };
};
