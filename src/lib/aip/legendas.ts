/** Faixa de legenda associada a um vídeo/áudio. */
export interface LegendaFaixa {
  /** Nome do arquivo original (ex.: video.pt-BR.vtt). */
  nome: string;
  url: string;
  /** Código do idioma (ex.: pt-BR). */
  idioma: string;
  /** Rótulo amigável exibido no seletor (ex.: Português (Brasil)). */
  rotulo: string;
}

export interface CueLegenda {
  inicio: number;
  fim: number;
  texto: string;
}

const NOMES_IDIOMA: Record<string, string> = {
  pt: "Português",
  "pt-br": "Português (Brasil)",
  en: "Inglês",
  "en-us": "Inglês (EUA)",
  es: "Espanhol",
  fr: "Francês",
  de: "Alemão",
  it: "Italiano",
  ja: "Japonês",
  zh: "Chinês",
};

/** Diz se o arquivo é uma legenda suportada (.vtt ou .srt). */
export function ehArquivoLegenda(nome: string): boolean {
  return /\.(vtt|srt)$/i.test(nome);
}

/** Nome base sem extensão e sem sufixo de idioma (video.pt-BR.vtt -> video). */
export function baseSemExtensao(nome: string): string {
  const semPasta = nome.split("/").pop() ?? nome;
  return semPasta.replace(/\.(vtt|srt)$/i, "").replace(/\.[a-z]{2}(-[a-zA-Z]{2,4})?$/i, "");
}

/** Extrai o idioma pelo sufixo do nome do arquivo; usa "und" quando não houver. */
export function idiomaDoNome(nome: string): string {
  const semExt = (nome.split("/").pop() ?? nome).replace(/\.(vtt|srt)$/i, "");
  const m = semExt.match(/\.([a-z]{2}(?:-[a-zA-Z]{2,4})?)$/i);
  return m ? m[1] : "und";
}

export function rotuloIdioma(idioma: string): string {
  if (idioma === "und") return "Legenda";
  return NOMES_IDIOMA[idioma.toLowerCase()] ?? idioma;
}

/** Monta as faixas de legenda de uma mídia a partir da lista de artefatos. */
export function montarFaixasLegenda(
  nomeMidia: string,
  artefatos: Array<{ nome: string; url?: string | null }>,
): LegendaFaixa[] {
  const base = baseSemExtensao(nomeMidia).toLowerCase();
  const baseMidia = (nomeMidia.split("/").pop() ?? nomeMidia)
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
  return artefatos
    .filter((a) => !!a.url && ehArquivoLegenda(a.nome))
    .filter((a) => {
      const b = baseSemExtensao(a.nome).toLowerCase();
      return b === base || b === baseMidia;
    })
    .map((a) => {
      const idioma = idiomaDoNome(a.nome);
      return { nome: a.nome, url: a.url!, idioma, rotulo: rotuloIdioma(idioma) };
    });
}

function tempoParaSegundos(txt: string): number {
  const t = txt.trim().replace(",", ".");
  const partes = t.split(":").map(Number);
  if (partes.some((n) => !isFinite(n))) return NaN;
  if (partes.length === 3) return partes[0] * 3600 + partes[1] * 60 + partes[2];
  if (partes.length === 2) return partes[0] * 60 + partes[1];
  return partes[0] ?? NaN;
}

/** Converte texto WebVTT ou SRT em uma lista de cues. */
export function parsearLegenda(conteudo: string): CueLegenda[] {
  const linhas = conteudo.replace(/\r/g, "").split("\n");
  const cues: CueLegenda[] = [];
  let i = 0;
  while (i < linhas.length) {
    const linha = linhas[i];
    const m = linha.match(/(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}\s*-->\s*(\d{1,2}:)?\d{1,2}:\d{2}[.,]\d{1,3}/);
    if (m) {
      const [ini, fim] = linha.split("-->");
      const inicio = tempoParaSegundos(ini);
      const final = tempoParaSegundos(fim.split(" ")[0] === "" ? fim.trim().split(/\s+/)[0] : fim.trim().split(/\s+/)[0]);
      const textos: string[] = [];
      i++;
      while (i < linhas.length && linhas[i].trim() !== "") {
        textos.push(linhas[i].replace(/<[^>]+>/g, ""));
        i++;
      }
      if (isFinite(inicio) && isFinite(final)) {
        cues.push({ inicio, fim: final, texto: textos.join("\n").trim() });
      }
    }
    i++;
  }
  return cues;
}

/** Cue ativo em um dado instante (ou null). */
export function cueAtivo(cues: CueLegenda[], segundos: number): CueLegenda | null {
  return cues.find((c) => segundos >= c.inicio && segundos <= c.fim) ?? null;
}
