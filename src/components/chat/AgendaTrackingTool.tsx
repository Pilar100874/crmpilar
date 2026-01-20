import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button 
                className={buttonClassName || (open ? `${toolbarBtnClass} bg-primary/15 border-primary/40 text-primary` : toolbarBtnClass)} 
                disabled={disabled}
                data-macro-id="agenda-tracking-trigger"
              >
                <Target size={18} />
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <PopoverContent 
            className="w-80 p-4 rounded-xl shadow-xl border-border/50" 
            align="start" 
            sideOffset={8}
            style={{ zIndex: 9999 }}
            onPointerDownOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
          >
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-orange-500" />
                Rastreio com Agendamento
              </Label>
              <p className="text-xs text-muted-foreground">
                Rastreia quando o cliente clica e cria uma tarefa automática no calendário.
              </p>
              
              {/* Tipo de rastreamento */}
              <div className="space-y-2">
                <Label className="text-xs">Tipo de Rastreamento</Label>
                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoRastreio === 'link' ? 'default' : 'outline'}
                    className={cn("w-full h-7 text-xs justify-start", tipoRastreio === 'link' && "bg-orange-500 hover:bg-orange-600")}
                    onClick={() => setTipoRastreio('link')}
                  >
                    <Link2 className="h-3 w-3 mr-1.5 shrink-0" />
                    Link Rastreável
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={tipoRastreio === 'anexo' ? 'default' : 'outline'}
                    className={cn("w-full h-7 text-xs justify-start", tipoRastreio === 'anexo' && "bg-orange-500 hover:bg-orange-600")}
                    onClick={() => setTipoRastreio('anexo')}
                  >
                    <Paperclip className="h-3 w-3 mr-1.5 shrink-0" />
                    Anexo Rastreável
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Título da Tarefa</Label>
                <Input
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Retorno cliente"
                  className="h-8 text-sm"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Descrição da Tarefa</Label>
                <Textarea
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Cliente clicou no link"
                  className="text-sm min-h-[60px]"
                />
              </div>
              
              {tipoRastreio === 'link' ? (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs">Texto do Link</Label>
                    <Input
                      value={textoLink}
                      onChange={(e) => setTextoLink(e.target.value)}
                      placeholder="Ex: Clique aqui"
                      className="h-8 text-sm"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs">URL de Redirecionamento</Label>
                    <Input
                      value={redirectUrl}
                      onChange={(e) => setRedirectUrl(e.target.value)}
                      placeholder="https://..."
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Para onde o cliente será direcionado após clicar
                    </p>
                  </div>
                  
                  <Button 
                    size="sm" 
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
                    <Label className="text-xs">Selecionar Arquivo</Label>
                    <input
                      ref={anexoInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleAnexoChange}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1 h-8 text-xs"
                        onClick={() => anexoInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        {anexoFile ? anexoFile.name : 'Escolher arquivo'}
                      </Button>
                      {anexoFile && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
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
                    size="sm" 
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
          </PopoverContent>
        </Popover>
        <TooltipContent><p>Rastreio com Agendamento</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
