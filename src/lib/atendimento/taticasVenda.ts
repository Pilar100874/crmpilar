import type { AnaliseHabitos } from "./auxiliarVendas";

/** Táticas de negociação para o atendente humano, montadas com os dados do cliente. Função pura. */
export interface TaticaVenda { id: string; nome: string; quando: string; frase: string }

const moeda = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function taticasParaCliente(nome: string, a: AnaliseHabitos): TaticaVenda[] {
  const primeiro = nome.split(/\s+/)[0] || nome;
  const produto = a.produtosFrequentes[0]?.nome ?? "o material";
  const perda = (a.motivosPerda[0] ?? "").toLowerCase();
  const lista: TaticaVenda[] = [
    { id: "permissao", nome: "Pedir permissão rápida", quando: "No início da ligação, para o cliente não se sentir pressionado.",
      frase: `${primeiro}, tudo bem? Te tomo só 30 segundos sobre ${produto}. Pode falar agora?` },
  ];
  const assunto = /pre[çc]o|caro|valor/.test(perda) ? "o preço" : /prazo|entrega|demor/.test(perda) ? "o prazo de entrega" : /frete/.test(perda) ? "o frete" : null;
  lista.push({ id: "rotulagem", nome: "Acolher a objeção", quando: assunto ? `Ele já deixou de fechar por ${assunto}. Use quando ele hesitar.` : "Quando o cliente hesitar ou reclamar.",
    frase: assunto ? `Sei que da última vez ${assunto} pesou. Por isso já pensei numa condição melhor pra você.` : "Entendo, faz sentido essa preocupação. Me conta o que mais pesa pra você?" });
  if (a.produtosFrequentes[0]?.ultimoPreco) {
    const p = a.produtosFrequentes[0].ultimoPreco;
    lista.push({ id: "ancoragem", nome: "Ancorar o preço", quando: "Antes de dar desconto: mostre primeiro a referência.",
      frase: `O ${produto} está saindo na tabela acima de ${moeda(p)}, mas pra você consigo segurar uma condição especial.` });
  }
  const pagamento = a.condicaoPreferida ? `no ${a.condicaoPreferida}, como de costume, ou à vista com desconto` : "no boleto ou no Pix com desconto";
  lista.push({ id: "dupla_alternativa", nome: "Fechar com duas opções", quando: "Na hora do fechamento: nunca pergunte \"quer fechar?\".",
    frase: `Prefere que eu deixe ${pagamento}?` });
  if (a.compraAtrasada) lista.push({ id: "perda", nome: "Lembrar da reposição", quando: "Ele já passou do intervalo normal de compra.",
    frase: `Pelo seu ritmo, seu estoque de ${produto} já deve estar acabando. Quer garantir antes de faltar?` });
  lista.push({ id: "batna", nome: "Plano B se recusar", quando: "Quando ele disser não: não insista, ofereça algo menor.",
    frase: "Sem problema! Posso te mandar a proposta pelo WhatsApp, ou separar um lote menor só pra repor?" });
  return lista;
}
