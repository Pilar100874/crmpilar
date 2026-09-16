/**
 * Gera src/lib/permissoes/modulosInternos.gerado.ts
 *
 * Varre as rotas de src/App.tsx, localiza o arquivo de cada tela do menu
 * (src/lib/menuStructure.ts) e extrai as abas internas (<TabsTrigger value=...>)
 * para servirem como "módulos internos" nas permissões dos grupos de acesso.
 *
 * Uso: bun run scripts/gerarModulosInternos.ts
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dir ?? process.cwd(), "..");
const lerArquivo = (p: string) => readFileSync(resolve(raiz, p), "utf8");

// 1) componente -> caminho do arquivo
const app = lerArquivo("src/App.tsx");
const componentes = new Map<string, string>();
const reLazy = /const\s+(\w+)\s*=\s*React\.lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g;
const reImport = /import\s+(\w+)\s+from\s+["'](\.\/[^"']+|@\/[^"']+)["']/g;
for (const m of app.matchAll(reLazy)) componentes.set(m[1], m[2]);
for (const m of app.matchAll(reImport)) if (!componentes.has(m[1])) componentes.set(m[1], m[2]);

const resolverArquivo = (especificador: string): string | null => {
  let base = especificador.startsWith("@/")
    ? "src/" + especificador.slice(2)
    : especificador.replace(/^\.\//, "src/");
  for (const ext of [".tsx", ".ts", "/index.tsx", "/index.ts"]) {
    if (existsSync(resolve(raiz, base + ext))) return base + ext;
  }
  return existsSync(resolve(raiz, base)) ? base : null;
};

// 2) rota -> componente
const rotas = new Map<string, string>();
for (const m of app.matchAll(/<Route\s+path="([^"]+)"[\s\S]{0,200}?element=\{\s*(?:<\w+[^>]*>\s*)*?<(\w+)/g)) {
  if (!rotas.has(m[1])) rotas.set(m[1], m[2]);
}

// 3) itens do menu (id + url) — Layout.tsx é a fonte principal do menu lateral
const menu = lerArquivo("src/components/Layout.tsx") + lerArquivo("src/lib/menuStructure.ts");
const itens: { id: string; url: string }[] = [];
for (const m of menu.matchAll(/id:\s*"([^"]+)",\s*title:\s*"[^"]*",\s*url:\s*"([^"]+)"/g)) {
  itens.push({ id: m[1], url: m[2] });
}

// 4) extrair abas de cada tela
const limparRotulo = (bruto: string) =>
  bruto
    .replace(/<[^>]*>/g, " ")
    .replace(/\{[^{}]*\}/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const extrairAbas = (caminho: string) => {
  const fonte = lerArquivo(caminho);
  const abas: { id: string; label: string }[] = [];
  // Listas de seções declaradas como constantes ({ id, label/title, icon })
  for (const bloco of fonte.matchAll(/=\s*\[([\s\S]*?)\]\s*(?:as const)?\s*;/g)) {
    const itensBloco = [...bloco[1].matchAll(/\{[^{}]*?\bid:\s*["'`]([^"'`]+)["'`][^{}]*?\b(?:label|title|nome):\s*["'`]([^"'`]+)["'`][^{}]*?\bicon:[^{}]*?\}/g)];
    if (itensBloco.length < 2) continue;
    for (const it of itensBloco) {
      if (abas.some((a) => a.id === it[1])) continue;
      abas.push({ id: it[1], label: it[2] });
    }
  }
  const re = /<TabsTrigger\b([^>]*)>([\s\S]*?)<\/TabsTrigger>/g;
  for (const m of fonte.matchAll(re)) {
    const valor = /value=["']([^"']+)["']/.exec(m[1])?.[1];
    if (!valor) continue;
    const rotulo = limparRotulo(m[2]) || valor;
    if (abas.some((a) => a.id === valor)) continue;
    abas.push({ id: valor, label: rotulo });
  }
  return abas;
};

const saida: Record<string, { id: string; label: string }[]> = {};
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

const cabecalho = `// ARQUIVO GERADO AUTOMATICAMENTE — não edite à mão.
// Gere novamente com: bun run scripts/gerarModulosInternos.ts
// Mapeia o id de um item de menu para os módulos internos (abas) da tela.

export interface ModuloInternoGerado {
  id: string;
  label: string;
}

export const MODULOS_INTERNOS_GERADOS: Record<string, ModuloInternoGerado[]> = `;

writeFileSync(
  resolve(raiz, "src/lib/permissoes/modulosInternos.gerado.ts"),
  `${cabecalho}${JSON.stringify(saida, null, 2)};\n`,
  "utf8"
);

console.log(`Telas com módulos internos: ${Object.keys(saida).length}`);
