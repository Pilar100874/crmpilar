import JSZip from "jszip";

/**
 * Importação de skills no formato "pasta Claude Code":
 *
 *   minha-skill/
 *   ├── SKILL.md            ← frontmatter (name, description) + instruções
 *   ├── references/*.md     ← conhecimento lido sob demanda
 *   └── scripts/*.sh|py|js  ← executados no motor remoto (Railway)
 *
 * O zip é lido no navegador; o SKILL.md vira o conteúdo da skill e os demais
 * arquivos ficam anexados em `aip_skill_files` mantendo o caminho relativo.
 */

export interface SkillZipImportado {
  nome: string;
  slug: string;
  descricao: string;
  conteudoMd: string;
  /** Arquivos anexos, com o caminho relativo preservado no `name`. */
  anexos: File[];
  totalReferencias: number;
  totalScripts: number;
}

const EXTENSOES_TEXTO = /\.(md|markdown|txt|sh|bash|py|js|mjs|cjs|ts|json|ya?ml|toml|csv)$/i;

const IGNORAR = /(^|\/)(__MACOSX|\.git|\.DS_Store|node_modules)(\/|$)/i;

const slugify = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Extrai `name` e `description` do frontmatter YAML simples do SKILL.md. */
export function lerFrontmatter(md: string): { name?: string; description?: string } {
  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const bloco = m[1];
  const pegar = (chave: string) => {
    const linha = bloco.match(new RegExp(`^${chave}\\s*:\\s*(.+)$`, "mi"));
    if (!linha) return undefined;
    return linha[1].trim().replace(/^["']|["']$/g, "");
  };
  return { name: pegar("name"), description: pegar("description") };
}

/** Lê um .zip de skill e devolve conteúdo base + anexos prontos para upload. */
export async function importarSkillZip(arquivo: File): Promise<SkillZipImportado> {
  const zip = await JSZip.loadAsync(arquivo);

  const entradas = Object.values(zip.files).filter((f) => !f.dir && !IGNORAR.test(f.name));
  if (!entradas.length) throw new Error("O zip está vazio.");

  const skillEntry = entradas.find((f) => /(^|\/)SKILL\.md$/i.test(f.name));
  if (!skillEntry) {
    throw new Error("Não encontrei um arquivo SKILL.md dentro do zip.");
  }

  // Raiz = pasta que contém o SKILL.md (aceita zip com ou sem pasta externa).
  const raiz = skillEntry.name.replace(/SKILL\.md$/i, "");
  const relativo = (nome: string) => (nome.startsWith(raiz) ? nome.slice(raiz.length) : nome);

  const conteudoMd = await skillEntry.async("string");
  const fm = lerFrontmatter(conteudoMd);

  const nomeBase =
    fm.name?.trim() ||
    raiz.replace(/\/$/, "").split("/").pop() ||
    arquivo.name.replace(/\.zip$/i, "");

  const anexos: File[] = [];
  let totalReferencias = 0;
  let totalScripts = 0;

  for (const entry of entradas) {
    if (entry === skillEntry) continue;
    const caminho = relativo(entry.name);
    if (!caminho || !EXTENSOES_TEXTO.test(caminho)) continue;

    const blob = await entry.async("blob");
    const tipo = /\.(md|markdown|txt)$/i.test(caminho) ? "text/markdown" : "text/plain";
    anexos.push(new File([blob], caminho, { type: tipo }));

    if (/^references\//i.test(caminho)) totalReferencias++;
    if (/^scripts\//i.test(caminho)) totalScripts++;
  }

  return {
    nome: nomeBase,
    slug: slugify(nomeBase),
    descricao: fm.description?.trim() ?? "",
    conteudoMd,
    anexos,
    totalReferencias,
    totalScripts,
  };
}
