/** A versão anunciada deve corresponder ao instalador, não a outra plataforma. */
export function versaoPacoteColetor(url: string): string | undefined {
  return url.match(/\/releases\/download\/coletor-v(\d+\.\d+\.\d+)\//)?.[1];
}