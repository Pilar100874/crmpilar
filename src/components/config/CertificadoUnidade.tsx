import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { ShieldCheck, Upload, Trash2, KeyRound } from "lucide-react";
import { lerCertificadoA1 } from "@/lib/fiscal/certificadoA1";
import { situacaoCertificado } from "@/lib/fiscal/regimeTributario";

interface Props {
  unidade: { id: string; estabelecimento_id?: string | null; cnpj?: string | null; certificado_path?: string | null; certificado_nome_arquivo?: string | null; certificado_titular?: string | null; certificado_valido_ate?: string | null };
  onAlterado: () => void;
}

const SITUACAO = {
  sem: { texto: "Sem certificado", variant: "outline" as const },
  vencido: { texto: "Vencido", variant: "destructive" as const },
  vencendo: { texto: "Vence em até 30 dias", variant: "secondary" as const },
  valido: { texto: "Válido", variant: "default" as const },
};

export function CertificadoUnidade({ unidade, onAlterado }: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const situacao = situacaoCertificado(unidade.certificado_valido_ate);

  const importar = async () => {
    if (!arquivo || !senha) {
      toast({ title: "Escolha o arquivo e informe a senha", variant: "destructive" });
      return;
    }
    if (!unidade.estabelecimento_id) return;
    setEnviando(true);
    try {
      const dados = await lerCertificadoA1(arquivo, senha);
      const cnpjUnidade = (unidade.cnpj || "").replace(/\D/g, "");
      if (cnpjUnidade && dados.cnpj && dados.cnpj !== cnpjUnidade) {
        throw new Error(`O certificado pertence ao CNPJ ${dados.cnpj}, diferente do CNPJ da unidade.`);
      }
      if (dados.validoAte.getTime() < Date.now()) throw new Error("Este certificado já está vencido.");
      const caminho = `${unidade.estabelecimento_id}/${unidade.id}/certificado.pfx`;
      const { error: erroArquivo } = await supabase.storage.from("certificados-digitais").upload(caminho, arquivo, { upsert: true, contentType: "application/x-pkcs12" });
      if (erroArquivo) throw new Error(erroArquivo.message);
      const { error: erroSenha } = await supabase.from("unidade_certificado_senhas").upsert({ unidade_id: unidade.id, estabelecimento_id: unidade.estabelecimento_id, senha, updated_at: new Date().toISOString() });
      if (erroSenha) throw new Error(erroSenha.message);
      const { error } = await supabase.from("unidades").update({
        certificado_path: caminho,
        certificado_nome_arquivo: arquivo.name,
        certificado_titular: dados.titular,
        certificado_valido_ate: dados.validoAte.toISOString(),
        certificado_enviado_em: new Date().toISOString(),
        ...(cnpjUnidade || !dados.cnpj ? {} : { cnpj: dados.cnpj }),
      }).eq("id", unidade.id);
      if (error) throw new Error(error.message);
      toast({ title: "Certificado importado", description: `${dados.titular} — válido até ${dados.validoAte.toLocaleDateString("pt-BR")}` });
      setArquivo(null); setSenha("");
      if (inputRef.current) inputRef.current.value = "";
      onAlterado();
    } catch (e: any) {
      toast({ title: "Não foi possível importar", description: e.message, variant: "destructive" });
    } finally {
      setEnviando(false);
    }
  };

  const remover = async () => {
    if (unidade.certificado_path) await supabase.storage.from("certificados-digitais").remove([unidade.certificado_path]);
    await supabase.from("unidade_certificado_senhas").delete().eq("unidade_id", unidade.id);
    await supabase.from("unidades").update({ certificado_path: null, certificado_nome_arquivo: null, certificado_titular: null, certificado_valido_ate: null, certificado_enviado_em: null }).eq("id", unidade.id);
    setConfirmarRemocao(false);
    toast({ title: "Certificado removido" });
    onAlterado();
  };

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">Certificado digital A1</span>
        <Badge variant={SITUACAO[situacao].variant}>{SITUACAO[situacao].texto}</Badge>
      </div>
      {unidade.certificado_path && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="min-w-0 break-words">
            <p className="font-medium">{unidade.certificado_titular}</p>
            <p className="text-xs text-muted-foreground">
              {unidade.certificado_nome_arquivo} · válido até {unidade.certificado_valido_ate ? new Date(unidade.certificado_valido_ate).toLocaleDateString("pt-BR") : "-"}
            </p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmarRemocao(true)}>
            <Trash2 className="mr-1 h-4 w-4" /> Remover
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">{unidade.certificado_path ? "Substituir arquivo (.pfx/.p12)" : "Arquivo (.pfx/.p12)"}</Label>
          <Input ref={inputRef} type="file" accept=".pfx,.p12" onChange={(e) => setArquivo(e.target.files?.[0] || null)} />
        </div>
        <div className="min-w-0 space-y-1">
          <Label className="text-xs">Senha do certificado</Label>
          <div className="relative">
            <KeyRound className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input type="password" className="pl-8" value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="new-password" />
          </div>
        </div>
        <Button type="button" onClick={importar} disabled={enviando}>
          <Upload className="mr-1 h-4 w-4" /> {enviando ? "Validando..." : "Importar"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">A senha é conferida antes de salvar e fica guardada de forma protegida; ela não pode ser visualizada depois.</p>
      <DeleteConfirmDialog open={confirmarRemocao} onOpenChange={setConfirmarRemocao} onConfirm={remover} title="Remover certificado" description="O certificado e a senha desta unidade serão apagados." />
    </div>
  );
}
