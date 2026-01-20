import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, Link2, Paperclip, Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getEstabelecimentoId } from "@/lib/estabelecimentoUtils";
import { toast } from "@/lib/toast-config";
import { cn } from "@/lib/utils";

interface AgendaTrackingToolProps {
  onInsertLink: (trackingUrl: string, displayText: string) => void;
  onClose?: () => void;
  disabled?: boolean;
  buttonClassName?: string;
  customerPhone?: string;
  customerName?: string;
  customerId?: string;
  conversationId?: string;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export default function AgendaTrackingTool({
  onInsertLink,
  onClose,
  disabled = false,
  buttonClassName,
  customerPhone,
  customerName,
  customerId,
  conversationId,
  externalOpen,
  onExternalOpenChange
}: AgendaTrackingToolProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (value: boolean) => {
    if (onExternalOpenChange) {
      onExternalOpenChange(value);
    } else {
      setInternalOpen(value);
    }
  };
  const [tipoRastreio, setTipoRastreio] = useState<'link' | 'anexo'>('link');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [textoLink, setTextoLink] = useState('Clique aqui');
  const [redirectUrl, setRedirectUrl] = useState('');
  const [anexoFile, setAnexoFile] = useState<File | null>(null);
  const [inserting, setInserting] = useState(false);
  const anexoInputRef = useRef<HTMLInputElement>(null);

  const toolbarBtnClass = "h-9 w-9 rounded-xl bg-card border border-border/30 shadow-sm flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted hover:border-border/50 hover:shadow-md transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed";

  const handleAnexoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAnexoFile(file);
    }
  };

  const handleInsertLink = async () => {
    setInserting(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario) {
        toast.error("Usuário não encontrado");
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        estab: estabId || '',
        uid: usuario.id,
        phone: customerPhone || '',
        name: customerName || '',
        cid: customerId || '',
        convid: conversationId || '',
        titulo: titulo,
        desc: descricao,
        url: redirectUrl,
        source: 'chat'
      });

      const trackingUrl = `${supabaseUrl}/functions/v1/email-agenda-tracker?${params.toString()}`;
      
      onInsertLink(trackingUrl, textoLink);
      
      toast.success("Link de rastreio gerado com sucesso!");
      
      resetForm();
      setOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Erro ao gerar link de rastreio:', error);
      toast.error("Erro ao gerar link");
    } finally {
      setInserting(false);
    }
  };

  const handleInsertAnexo = async () => {
    if (!anexoFile) {
      toast.error("Selecione um arquivo");
      return;
    }

    setInserting(true);
    try {
      const estabId = await getEstabelecimentoId();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (!usuario) {
        toast.error("Usuário não encontrado");
        return;
      }

      // Upload do arquivo
      const fileName = `${Date.now()}_${anexoFile.name}`;
      const filePath = `chat-rastreio-anexos/${estabId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('bot-media')
        .upload(filePath, anexoFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl: filePublicUrl } } = supabase.storage
        .from('bot-media')
        .getPublicUrl(filePath);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const params = new URLSearchParams({
        estab: estabId || '',
        uid: usuario.id,
        phone: customerPhone || '',
        name: customerName || '',
        cid: customerId || '',
        convid: conversationId || '',
        titulo: titulo,
        desc: descricao,
        url: filePublicUrl,
        tipo: 'anexo',
        source: 'chat'
      });

      const trackingUrl = `${supabaseUrl}/functions/v1/email-agenda-tracker?${params.toString()}`;
      
      onInsertLink(trackingUrl, `📎 ${anexoFile.name}`);
      
      toast.success("Anexo rastreável gerado!");
      
      resetForm();
      setOpen(false);
      onClose?.();
    } catch (error) {
      console.error('Erro ao anexar arquivo:', error);
      toast.error("Erro ao anexar arquivo");
    } finally {
      setInserting(false);
    }
  };

  const resetForm = () => {
    setTitulo('');
    setDescricao('');
    setTextoLink('Clique aqui');
    setRedirectUrl('');
    setAnexoFile(null);
    setTipoRastreio('link');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <button 
                className={buttonClassName || (open ? `${toolbarBtnClass} bg-primary/15 border-primary/40 text-primary` : toolbarBtnClass)} 
                disabled={disabled}
                data-macro-id="agenda-tracking-trigger"
              >
                <Target size={18} />
              </button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent><p>Rastreio com Agendamento</p></TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-orange-500" />
            Rastreio com Agendamento
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Rastreia quando o cliente clica e cria uma tarefa automática no calendário.
        </p>
        
        <div className="space-y-4">
          {/* Tipo de rastreamento */}
          <div className="space-y-2">
            <Label className="text-sm">Tipo de Rastreamento</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={tipoRastreio === 'link' ? 'default' : 'outline'}
                className={cn("flex-1", tipoRastreio === 'link' && "bg-orange-500 hover:bg-orange-600")}
                onClick={() => setTipoRastreio('link')}
              >
                <Link2 className="h-4 w-4 mr-2" />
                Link Rastreável
              </Button>
              <Button
                type="button"
                size="sm"
                variant={tipoRastreio === 'anexo' ? 'default' : 'outline'}
                className={cn("flex-1", tipoRastreio === 'anexo' && "bg-orange-500 hover:bg-orange-600")}
                onClick={() => setTipoRastreio('anexo')}
              >
                <Paperclip className="h-4 w-4 mr-2" />
                Anexo Rastreável
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Título da Tarefa</Label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Retorno cliente"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm">Descrição da Tarefa</Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Cliente clicou no link"
              className="min-h-[80px]"
            />
          </div>
          
          {tipoRastreio === 'link' ? (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Texto do Link</Label>
                <input
                  type="text"
                  value={textoLink}
                  onChange={(e) => setTextoLink(e.target.value)}
                  placeholder="Ex: Clique aqui"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm">URL de Redirecionamento</Label>
                <input
                  type="text"
                  value={redirectUrl}
                  onChange={(e) => setRedirectUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <p className="text-xs text-muted-foreground">
                  Para onde o cliente será direcionado após clicar
                </p>
              </div>
              
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleInsertLink}
                disabled={inserting || !titulo.trim() || !textoLink.trim() || !redirectUrl.trim()}
              >
                {inserting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Inserir Link
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label className="text-sm">Selecionar Arquivo</Label>
                <input
                  ref={anexoInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAnexoChange}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => anexoInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {anexoFile ? anexoFile.name : 'Escolher arquivo'}
                  </Button>
                  {anexoFile && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setAnexoFile(null)}
                    >
                      ×
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Quando o cliente abrir, será criada uma tarefa
                </p>
              </div>
              
              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600"
                onClick={handleInsertAnexo}
                disabled={inserting || !titulo.trim() || !anexoFile}
              >
                {inserting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Anexando...
                  </>
                ) : (
                  <>
                    <Paperclip className="h-4 w-4 mr-2" />
                    Inserir Anexo Rastreável
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
