import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Select,SelectContent,SelectItem,SelectTrigger,SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {Server,PlugZap} from 'lucide-react';
import {toast} from 'sonner';
import {useContextoInterno} from '@/lib/estoque/contexto';
import {FiscalEmissionEngine} from '@/lib/fiscal/servicoFiscal';
import {SaudeEmissor} from '@/components/fiscal/SaudeEmissor';
import {TituloFiscal} from '@/components/fiscal/TituloFiscal';
const sb=supabase as any;
export default function ConfigMotorFiscal(){
 const ctx=useContextoInterno();const [status,setStatus]=useState<any>(null),[ambiente,setAmbiente]=useState('homologacao'),[teste,setTeste]=useState<any>(null),[busy,setBusy]=useState(false);
 const carregar=async()=>{const {data,error}=await sb.rpc('fiscal_engine_status');if(error)return toast.error(error.message);const c=data?.[0];setStatus(c);if(c)setAmbiente(c.ambiente);};
 useEffect(()=>{if(ctx.estabelecimentoId)carregar();},[ctx.estabelecimentoId]);
 const salvar=async(ativo:boolean,amb=ambiente)=>{if(amb==='producao'&&!status?.homologado)return toast.error('Produção só depois de uma NF-e autorizada em homologação');setBusy(true);const {error}=await sb.rpc('fiscal_coletor_ativar',{p_ambiente:amb,p_ativo:ativo});setBusy(false);if(error)return toast.error(error.message);await carregar();toast.success(ativo?'Emissão pelo Coletor ativada':'Emissão desativada');};
 return <div className="space-y-4 p-3 sm:p-6 min-w-0 max-w-3xl">
  <header className="flex items-center gap-2"><TituloFiscal icone={Server} titulo="Emissor NF-e próprio" descricao="Ligue a emissão pelo Coletor e acompanhe a homologação"/></header>
  <SaudeEmissor estabelecimentoId={ctx.estabelecimentoId}/>
  <div className="flex flex-wrap gap-2"><Badge variant={status?.habilitado?'default':'outline'}>{status?.habilitado?'Ativado':'Desativado'}</Badge><Badge variant="outline">{status?.homologado?'Homologação comprovada':'Homologação pendente'}</Badge>{teste&&<Badge variant={teste.coletor_online?'default':'destructive'}>{teste.coletor_online?'Coletor conectado':'Coletor desligado'}</Badge>}</div>
  <div className="flex items-center gap-3"><Switch id="ativo" checked={!!status?.habilitado} disabled={busy} onCheckedChange={v=>salvar(v)}/><Label htmlFor="ativo">Emitir pelo Coletor</Label></div>
  <div className="max-w-xs"><Label>Ambiente padrão</Label><Select value={ambiente} onValueChange={v=>{setAmbiente(v);if(status)salvar(!!status.habilitado,v);}}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="homologacao">Homologação</SelectItem><SelectItem value="producao" disabled={!status?.homologado}>Produção</SelectItem></SelectContent></Select></div>
  <Button variant="outline" disabled={busy} onClick={async()=>{setBusy(true);try{setTeste(await FiscalEmissionEngine.executar({acao:'testar'}));}catch(e:any){toast.error(e.message);}finally{setBusy(false);}}}><PlugZap className="mr-2 h-4 w-4"/>Verificar Coletor</Button>
  {status?.mensagem&&<p className="text-sm text-muted-foreground">{status.mensagem}</p>}
  <section className="border-t pt-4 space-y-2"><h2 className="font-medium">Como funciona</h2><ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
   <li>Instale a versão nova do Coletor num computador da empresa e ligue o módulo <b>Emissor NF-e</b>.</li>
   <li>Cadastre o certificado A1 e a senha em cada unidade emissora.</li>
   <li>Faça uma NF-e em homologação. A primeira autorização real libera a produção.</li>
   <li>Use Fiscal → Monitor para testar a comunicação com a SEFAZ da unidade.</li>
   </ol><p className="text-xs text-muted-foreground">Cobertura NF-e: todos os 26 estados e Distrito Federal, por autorizador próprio, SVRS ou SVAN. Distribuição e manifestação usam o Ambiente Nacional. A aceitação real depende da homologação de cada unidade.</p></section>
 </div>;
}
