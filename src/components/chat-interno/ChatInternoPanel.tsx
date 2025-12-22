import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Search,
  ArrowLeft,
  User,
  Check,
  Video,
  Paperclip,
  FileText,
  Image as ImageIcon,
  X
} from 'lucide-react';
import { useChatInternoContext } from '@/contexts/ChatInternoContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { VideoChamadaDialog } from './VideoChamadaDialog';

interface ChatInternoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export function ChatInternoPanel({ isOpen, onClose }: ChatInternoPanelProps) {
  const {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    usuarioAtualId,
    onlineUsers,
    naoLidasPorConversa,
    carregarMensagens,
    enviarMensagem,
    criarConversa,
    carregarConversas,
    marcarComoLida,
    videoChamadaPendente,
    limparVideoChamadaPendente,
  } = useChatInternoContext();

  const [mensagemInput, setMensagemInput] = useState('');
  const [busca, setBusca] = useState('');
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [tituloNovaConversa, setTituloNovaConversa] = useState('');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [participantesConversa, setParticipantesConversa] = useState<{[key: string]: Usuario[]}>({});
  const [showVideoChamada, setShowVideoChamada] = useState(false);
  const [isIncomingCall, setIsIncomingCall] = useState(false);
  const [wasOpen, setWasOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [anexoPreview, setAnexoPreview] = useState<{url: string; name: string; type: string} | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quando receber uma videochamada pendente, abrir automaticamente o diálogo
  useEffect(() => {
    if (videoChamadaPendente) {
      // Encontrar a conversa correspondente
      const conversa = conversas.find(c => c.id === videoChamadaPendente.conversaId);
      if (conversa) {
        setConversaAtual(conversa);
        setIsIncomingCall(true);
        setShowVideoChamada(true);
      }
    }
  }, [videoChamadaPendente, conversas, setConversaAtual]);

  // Sempre abrir na lista de conversas/usuários ao abrir o painel (apenas quando muda de fechado para aberto)
  // Também marca como lida ao fechar se estava numa conversa
  useEffect(() => {
    if (isOpen && !wasOpen) {
      setConversaAtual(null);
      setShowNovaConversa(false);
    }
    // Ao fechar o painel, se estava numa conversa, marca como lida
    if (!isOpen && wasOpen && conversaAtual) {
      marcarComoLida(conversaAtual.id);
    }
    setWasOpen(isOpen);
  }, [isOpen, conversaAtual, marcarComoLida]);

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(u => u.id === userId);
  };

  const carregarParticipantes = async (conversaId: string) => {
    const { data } = await supabase
      .from('chat_interno_participantes')
      .select(`
        usuario_id,
        usuarios:usuarios!chat_interno_participantes_usuario_id_fkey (
          id,
          nome,
          email
        )
      `)
      .eq('conversa_id', conversaId);

    if (data) {
      const users = data.map((p: any) => p.usuarios).filter(Boolean);
      setParticipantesConversa(prev => ({
        ...prev,
        [conversaId]: users
      }));
    }
  };

  const getConversaNome = (conversa: typeof conversas[0]) => {
    if (conversa.titulo) return conversa.titulo;
    const participants = participantesConversa[conversa.id] || [];
    const otherUsers = participants.filter(p => p.id !== usuarioAtualId);
    if (otherUsers.length === 0) return 'Conversa';
    if (otherUsers.length === 1) return otherUsers[0].nome;
    return otherUsers.map(u => u.nome).join(', ');
  };

  useEffect(() => {
    if (conversaAtual) {
      carregarMensagens(conversaAtual.id);
      carregarParticipantes(conversaAtual.id);
    }
  }, [conversaAtual, carregarMensagens]);

  // Scroll para o final quando mensagens mudam ou quando abre uma conversa
  useEffect(() => {
    if (mensagens.length > 0 && conversaAtual) {
      // Usar setTimeout para garantir que o DOM foi atualizado
      setTimeout(() => {
        const scrollContainer = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
        if (scrollContainer) {
          scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
      }, 150);
    }
  }, [mensagens, conversaAtual]);

  useEffect(() => {
    if (showNovaConversa) {
      fetchUsuarios();
    }
  }, [showNovaConversa]);

  useEffect(() => {
    // Load participants for all conversations
    conversas.forEach(c => {
      if (!participantesConversa[c.id]) {
        carregarParticipantes(c.id);
      }
    });
  }, [conversas]);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId) {
      setLoadingUsuarios(false);
      return;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('nome');

    if (!error && data) {
      // Filtrar o usuário atual
      setUsuarios(data.filter(u => u.id !== usuarioAtualId));
    }
    setLoadingUsuarios(false);
  };

  const handleEnviar = async () => {
    if ((!mensagemInput.trim() && !anexoPreview) || !conversaAtual) return;
    
    // Se tiver anexo, enviar como arquivo
    if (anexoPreview) {
      await enviarMensagem(conversaAtual.id, anexoPreview.url, 'arquivo');
      setAnexoPreview(null);
    }
    
    // Se tiver texto, enviar também
    if (mensagemInput.trim()) {
      await enviarMensagem(conversaAtual.id, mensagemInput.trim());
      setMensagemInput('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversaAtual) return;

    // Limite de 10MB
    if (file.size > 10 * 1024 * 1024) {
      alert('Arquivo muito grande. Limite de 10MB.');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `chat-interno/${conversaAtual.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(filePath);

      setAnexoPreview({
        url: urlData.publicUrl,
        name: file.name,
        type: file.type
      });
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload do arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const cancelarAnexo = () => {
    setAnexoPreview(null);
  };

  const handleCriarConversa = async () => {
    if (usuariosSelecionados.length === 0) return;

    const novaConversa = await criarConversa(
      usuariosSelecionados, 
      usuariosSelecionados.length > 1 ? tituloNovaConversa : undefined
    );

    if (novaConversa) {
      setShowNovaConversa(false);
      setUsuariosSelecionados([]);
      setTituloNovaConversa('');
      setConversaAtual({
        ...novaConversa,
        tipo: novaConversa.tipo as 'direto' | 'grupo'
      });
    }
  };

  // Para conversa direta 1:1, ao clicar no usuário já abre/cria a conversa
  const handleSelecionarUsuario = async (userId: string) => {
    const novaConversa = await criarConversa([userId]);
    if (novaConversa) {
      setShowNovaConversa(false);
      setUsuariosSelecionados([]);
      setConversaAtual({
        ...novaConversa,
        tipo: novaConversa.tipo as 'direto' | 'grupo'
      });
      // Recarregar conversas para atualizar lista se for nova
      carregarConversas();
    }
  };

  // Toggle para grupos (múltipla seleção)
  const toggleUsuario = (userId: string) => {
    if (usuariosSelecionados.includes(userId)) {
      setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== userId));
    } else {
      setUsuariosSelecionados([...usuariosSelecionados, userId]);
    }
  };

  const conversasFiltradas = conversas.filter(c => {
    if (!busca) return true;
    const nome = getConversaNome(c);
    return nome.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <div className={`chat-slide-menu ${isOpen ? 'open' : ''}`}>
      <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-primary/5">
        <div className="flex items-center justify-between">
          {conversaAtual ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConversaAtual(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold flex-1 text-center">
                {getConversaNome(conversaAtual)}
              </span>
              {/* Botão de videochamada - apenas para conversas diretas */}
              {conversaAtual.tipo === 'direto' && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setIsIncomingCall(false);
                    setShowVideoChamada(true);
                  }}
                  title="Iniciar videochamada"
                  className={cn(
                    videoChamadaPendente?.conversaId === conversaAtual.id && "animate-pulse"
                  )}
                >
                  <Video className={cn(
                    "h-4 w-4",
                    videoChamadaPendente?.conversaId === conversaAtual.id && "text-green-500"
                  )} />
                </Button>
              )}
            </>
          ) : showNovaConversa ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNovaConversa(false);
                  setUsuariosSelecionados([]);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold flex-1 text-center">
                Nova Conversa
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold">Chat Interno</span>
              </div>
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setShowNovaConversa(true)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={onClose}
                  className="md:hidden"
                  title="Fechar"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {conversaAtual ? (
        // Área de mensagens
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {mensagens.map((msg) => {
                const isOwn = msg.remetente_id === usuarioAtualId;
                const isFile = msg.tipo === 'arquivo';
                const isImage = isFile && (msg.conteudo.includes('.jpg') || msg.conteudo.includes('.jpeg') || msg.conteudo.includes('.png') || msg.conteudo.includes('.gif') || msg.conteudo.includes('.webp'));
                
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {!isOwn && msg.remetente && (
                        <p className="text-xs font-medium mb-1">
                          {msg.remetente.nome}
                        </p>
                      )}
                      
                      {isFile ? (
                        isImage ? (
                          <a href={msg.conteudo} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.conteudo} 
                              alt="Imagem" 
                              className="max-w-full max-h-48 rounded cursor-pointer hover:opacity-80"
                            />
                          </a>
                        ) : (
                          <a 
                            href={msg.conteudo} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-2 p-2 rounded border",
                              isOwn ? "border-primary-foreground/30 hover:bg-primary-foreground/10" : "border-border hover:bg-muted-foreground/10"
                            )}
                          >
                            <FileText className="h-5 w-5" />
                            <span className="text-sm truncate">Arquivo anexado</span>
                          </a>
                        )
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                      )}
                      
                      <p className={cn(
                        'text-xs mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Preview de anexo */}
          {anexoPreview && (
            <div className="px-4 py-2 border-t bg-muted/50">
              <div className="flex items-center gap-2">
                {anexoPreview.type.startsWith('image/') ? (
                  <img src={anexoPreview.url} alt="Preview" className="h-12 w-12 object-cover rounded" />
                ) : (
                  <div className="h-12 w-12 bg-muted rounded flex items-center justify-center">
                    <FileText className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{anexoPreview.name}</p>
                  <p className="text-xs text-muted-foreground">Pronto para enviar</p>
                </div>
                <Button variant="ghost" size="icon" onClick={cancelarAnexo}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Input de mensagem */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
              />
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Anexar arquivo"
              >
                <Paperclip className={cn("h-4 w-4", uploading && "animate-pulse")} />
              </Button>
              <Input
                placeholder="Digite sua mensagem..."
                value={mensagemInput}
                onChange={(e) => setMensagemInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
                className="flex-1"
              />
              <Button size="icon" onClick={handleEnviar} disabled={uploading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : showNovaConversa ? (
        // Seleção de usuários para nova conversa
        <>
          <div className="p-3 border-b space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecione os participantes:
            </p>
            {usuariosSelecionados.length > 1 && (
              <Input
                placeholder="Título do grupo (opcional)"
                value={tituloNovaConversa}
                onChange={(e) => setTituloNovaConversa(e.target.value)}
              />
            )}
          </div>

          <ScrollArea className="flex-1">
            {loadingUsuarios ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="divide-y">
                {usuarios.map((usuario) => {
                  const isSelected = usuariosSelecionados.includes(usuario.id);
                  const online = isUserOnline(usuario.id);
                  return (
                    <button
                      key={usuario.id}
                      onClick={() => handleSelecionarUsuario(usuario.id)}
                      className={cn(
                        "w-full p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 text-left",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        {online && (
                          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{usuario.nome}</p>
                          {online && (
                            <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                              Online
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {usuario.email}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Botão de criar conversa */}
          <div className="p-4 border-t">
            <Button 
              className="w-full" 
              onClick={handleCriarConversa}
              disabled={usuariosSelecionados.length === 0}
            >
              {usuariosSelecionados.length === 0 
                ? 'Selecione participantes' 
                : usuariosSelecionados.length === 1
                  ? 'Iniciar Conversa'
                  : `Criar Grupo (${usuariosSelecionados.length})`
              }
            </Button>
          </div>
        </>
      ) : (
        // Lista de conversas
        <>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma conversa encontrada
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowNovaConversa(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversasFiltradas.map((conversa) => {
                  const naoLidas = naoLidasPorConversa[conversa.id] || 0;
                  const temChamadaPendente = videoChamadaPendente?.conversaId === conversa.id;
                  return (
                    <button
                      key={conversa.id}
                      onClick={() => setConversaAtual(conversa)}
                      className={cn(
                        "w-full p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 text-left",
                        naoLidas > 0 && "animate-pulse bg-primary/5",
                        temChamadaPendente && "bg-green-500/10"
                      )}
                    >
                      <div className="relative">
                        <Avatar>
                          <AvatarFallback>
                            {conversa.tipo === 'grupo' ? (
                              <Users className="h-4 w-4" />
                            ) : (
                              getConversaNome(conversa)?.[0]?.toUpperCase() || 'C'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        {naoLidas > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs font-bold rounded-full flex items-center justify-center">
                            {naoLidas > 9 ? '9+' : naoLidas}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "truncate",
                          naoLidas > 0 ? "font-bold" : "font-medium"
                        )}>
                          {getConversaNome(conversa)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(conversa.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </p>
                      </div>
                      {/* Indicador de videochamada pendente */}
                      {temChamadaPendente && (
                        <div className="animate-pulse">
                          <Video className="h-5 w-5 text-green-500" />
                        </div>
                      )}
                      {conversa.tipo === 'grupo' && (
                        <Badge variant="secondary" className="text-xs">
                          Grupo
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </>
      )}
      </div>

      {/* Dialog de Videochamada */}
      {conversaAtual && conversaAtual.tipo === 'direto' && usuarioAtualId && (
        <VideoChamadaDialog
          isOpen={showVideoChamada}
          onClose={() => {
            setShowVideoChamada(false);
            setIsIncomingCall(false);
            limparVideoChamadaPendente();
          }}
          usuarioRemotoId={
            (participantesConversa[conversaAtual.id] || [])
              .find(p => p.id !== usuarioAtualId)?.id || ''
          }
          usuarioRemotoNome={
            (participantesConversa[conversaAtual.id] || [])
              .find(p => p.id !== usuarioAtualId)?.nome || 'Usuário'
          }
          usuarioAtualId={usuarioAtualId}
          conversaId={conversaAtual.id}
          isIncoming={isIncomingCall}
        />
      )}
    </div>
  );
}
