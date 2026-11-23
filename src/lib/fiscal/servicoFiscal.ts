import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";
export async function chamarFiscal(fn: string,body: unknown) {
  const {data,error}=await supabase.functions.invoke(fn,{body});
  if(error){
    let mensagem=error.message;
    if(error instanceof FunctionsHttpError){ try{const r=await error.context.json(); mensagem=typeof r.error==="string"?r.error:JSON.stringify(r.error);}catch{/* retorno sem JSON */} }
    throw new Error(mensagem);
  }
  if(data?.error) throw new Error(data.error);
  return data;
}
/** Contrato com motor fiscal próprio; não produz autorizações simuladas. */
export const FiscalEmissionEngine={ executar:(body:unknown)=>chamarFiscal("fiscal-engine",body) };
export const SystaxTaxService={ calcular:(body:unknown)=>chamarFiscal("systax-calcular",body) };
export async function baixarArquivoFiscal(nota_id:string,tipo:"xml"|"danfe") {
  const { data,error }=await supabase.functions.invoke("fiscal-engine",{body:{acao:"arquivo",nota_id}});
  if(error) throw new Error("XML autorizado indisponível. Consulte a situação da nota.");
  const xml=typeof data==="string"?data:data instanceof Blob?await data.text():"";
  if(!xml.includes("<nfeProc")) throw new Error("A nota ainda não tem XML autorizado.");
  if(tipo==="danfe"){ const {gerarDanfe}=await import("./danfe"); gerarDanfe(xml).save(`DANFE-${nota_id}.pdf`); return; }
  const url=URL.createObjectURL(new Blob([xml],{type:"application/xml"})); const a=document.createElement("a"); a.href=url; a.download=`NFe-${nota_id}.xml`; a.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
}
