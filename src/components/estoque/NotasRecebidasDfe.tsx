import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, RefreshCw, Download, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { brl, dataBr } from "@/lib/estoque/contexto";

const MANIF: Record<string, string> = { ciencia: "Ciência", confirmacao: "Confirmada", desconhecimento: "Desconhecida", nao_realizada: "Não realizada" };

/** Monitor de NF-e emitidas contra as unidades (DF-e via Focus NFe). Importar = Ciência + XML → tela de entrada. */
export function NotasRecebidasDfe({ chavesImportadas, onImportarXml }: { chavesImportadas: string[]; onImportarXml: (xml: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [unidades, setUnidades] = useState<any[]>([]);
  const [cnpj, setCnpj] = useState("");
  const [notas, setNotas] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [recusa, setRecusa] = useState<{ chave: string; tipo: string; just: string } | null>(null);

  useEffect(() => {
    if (!aberto) return;
    supabase.from("unidades").select("id, nome, cnpj").then(({ data }) => {
      const u = (data ?? []).filter((x: any) => (x.cnpj ?? "").replace(/\D/g, "").length === 14);
      setUnidades(u); if (!cnpj && u[0]) setCnpj(u[0].cnpj.replace(/\D/g, ""));
    });
  }, [aberto]);

  const chamar = async (body: any) => {
    const { data, error } = await supabase.functions.invoke("nfe-recebidas", { body });
    if (error || data?.error) { let m = data?.error; try { m = m || (await (error as any)?.context?.json())?.error; } catch { /* */ } throw new Error(typeof m === "string" ? m : "Falha na consulta"); }
    return data;
  };
  const listar = async () => {
    if (!cnpj) return toast.error("Cadastre o CNPJ na aba Fiscal da unidade");
    setCarregando(true);
    try { const r = await chamar({ acao: "listar", cnpj }); setNotas(Array.isArray(r.notas) ? r.notas : []); }
    catch (e: any) { toast.error(e.message); } finally { setCarregando(false); }
  };
  useEffect(() => { if (aberto && cnpj) listar(); }, [aberto, cnpj]);

  const importar = async (n: any) => {
    setOcupado(n.chave_nfe);
    try {
      if (!n.manifestacao_destinatario) await chamar({ acao: "manifestar", chave: n.chave_nfe, tipo: "ciencia" });
      const r = await chamar({ acao: "xml", chave: n.chave_nfe });
      onImportarXml(r.xml); setAberto(false);
    } catch (e: any) { toast.error(e.message); listar(); } finally { setOcupado(null); }
  };
  const recusar = async () => {
    if (!recusa) return;
    setOcupado(recusa.chave);
    try { await chamar({ acao: "manifestar", chave: recusa.chave, tipo: recusa.tipo, justificativa: recusa.just || undefined }); toast.success("Manifestação enviada"); setRecusa(null); listar(); }
    catch (e: any) { toast.error(e.message); } finally { setOcupado(null); }
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setAberto(true)}><Inbox className="mr-1 h-4 w-4" />Notas recebidas</Button>
      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Notas emitidas contra suas unidades</DialogTitle></DialogHeader>
          <div className="flex flex-wrap gap-2">
            <Select value={cnpj} onValueChange={setCnpj}>
              <SelectTrigger className="min-w-0 flex-1"><SelectValue placeholder="Unidade" /></SelectTrigger>
              <SelectContent>{unidades.map((u) => <SelectItem key={u.id} value={u.cnpj.replace(/\D/g, "")}>{u.nome} — {u.cnpj}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={listar} disabled={carregando}><RefreshCw className={`mr-1 h-4 w-4 ${carregando ? "animate-spin" : ""}`} />Atualizar</Button>
          </div>
          <p className="text-xs text-muted-foreground">Importar faz a Ciência da emissão na SEFAZ, baixa o XML completo e abre a conferência de entrada. Requer token da Focus NFe e certificado A1 da unidade cadastrado lá.</p>
          <div className="max-h-[60vh] space-y-1.5 overflow-y-auto">
            {!carregando && !notas.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma nota recebida.</p>}
            {notas.map((n) => {
              const imp = chavesImportadas.includes(n.chave_nfe);
              const canc = n.situacao === "cancelada";
              return (
                <Card key={n.chave_nfe}><CardContent className="flex flex-wrap items-center gap-2 p-3 text-sm">
                  <span className="min-w-0 flex-1 break-words"><b>{n.nome_emitente}</b> <span className="text-xs text-muted-foreground">{n.documento_emitente} • {dataBr(n.data_emissao)}</span></span>
                  <span>{brl(n.valor_total)}</span>
                  {canc && <Badge variant="destructive">Cancelada</Badge>}
                  {n.manifestacao_destinatario && <Badge variant="secondary">{MANIF[n.manifestacao_destinatario] ?? n.manifestacao_destinatario}</Badge>}
                  {imp ? <Badge>Importada</Badge> : !canc && (
                    <>
                      <Button size="sm" disabled={ocupado === n.chave_nfe} onClick={() => importar(n)}><Download className="mr-1 h-4 w-4" />Importar</Button>
                      <Button size="icon" variant="ghost" title="Desconhecer / não realizada" onClick={() => setRecusa({ chave: n.chave_nfe, tipo: "desconhecimento", just: "" })}><ThumbsDown className="h-4 w-4" /></Button>
                    </>
                  )}
                </CardContent></Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!recusa} onOpenChange={(o) => !o && setRecusa(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recusar nota</DialogTitle></DialogHeader>
          {recusa && <div className="space-y-2">
            <Select value={recusa.tipo} onValueChange={(v) => setRecusa({ ...recusa, tipo: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="desconhecimento">Desconheço a operação</SelectItem><SelectItem value="nao_realizada">Operação não realizada</SelectItem></SelectContent>
            </Select>
            {recusa.tipo === "nao_realizada" && <Input placeholder="Justificativa (mín. 15 caracteres)" value={recusa.just} onChange={(e) => setRecusa({ ...recusa, just: e.target.value })} />}
          </div>}
          <DialogFooter><Button variant="outline" onClick={() => setRecusa(null)}>Voltar</Button><Button onClick={recusar} disabled={!!ocupado}>Enviar à SEFAZ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
