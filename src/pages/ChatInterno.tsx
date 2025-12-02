import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Search,
  User,
  Check,
  Phone,
  Video,
  MoreVertical,
  Smile,
  Paperclip,
  Mic,
  ArrowLeft
} from 'lucide-react';
import { useChatInterno } from '@/hooks/useChatInterno';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export default function ChatInterno() {
  const {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    usuarioAtualId,
    onlineUsers,
    carregarMensagens,
    enviarMensagem,
    criarConversa,
    carregarConversas,
  } = useChatInterno();

  const [mensagemInput, setMensagemInput] = useState('');
  const [busca, setBusca] = useState('');
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [tituloNovaConversa, setTituloNovaConversa] = useState('');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const [participantesConversa, setParticipantesConversa] = useState<{[key: string]: Usuario[]}>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversaAtual) {
      carregarMensagens(conversaAtual.id);
      carregarParticipantes(conversaAtual.id);
    }
  }, [conversaAtual, carregarMensagens]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  useEffect(() => {
    // Load participants for all conversations
    conversas.forEach(c => {
      if (!participantesConversa[c.id]) {
        carregarParticipantes(c.id);
      }
    });
  }, [conversas]);

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
      setUsuarios(data.filter(u => u.id !== usuarioAtualId));
    }
    setLoadingUsuarios(false);
  };

  const handleEnviar = async () => {
    if (!mensagemInput.trim() || !conversaAtual) return;
    
    await enviarMensagem(conversaAtual.id, mensagemInput.trim());
    setMensagemInput('');
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
      await carregarConversas();
    }
  };

  const toggleUsuario = (userId: string) => {
    if (usuariosSelecionados.includes(userId)) {
      setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== userId));
    } else {
      setUsuariosSelecionados([...usuariosSelecionados, userId]);
    }
  };

  const isUserOnline = (userId: string) => {
    return onlineUsers.some(u => u.id === userId);
  };

  const getConversaNome = (conversa: typeof conversas[0]) => {
    if (conversa.titulo) return conversa.titulo;
    const participants = participantesConversa[conversa.id] || [];
    const otherUsers = participants.filter(p => p.id !== usuarioAtualId);
    if (otherUsers.length === 0) return 'Conversa';
    if (otherUsers.length === 1) return otherUsers[0].nome;
    return otherUsers.map(u => u.nome).join(', ');
  };

  const getConversaOnlineStatus = (conversa: typeof conversas[0]) => {
    const participants = participantesConversa[conversa.id] || [];
    const otherUsers = participants.filter(p => p.id !== usuarioAtualId);
    return otherUsers.some(u => isUserOnline(u.id));
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Ontem';
    return format(date, 'dd/MM/yyyy');
  };

  const conversasFiltradas = conversas.filter(c => {
    if (!busca) return true;
    const nome = getConversaNome(c);
    return nome.toLowerCase().includes(busca.toLowerCase());
  });

  return (
    <div className="h-screen flex bg-background">
      {/* Sidebar - Lista de conversas */}
      <div className={cn(
        "w-full md:w-96 border-r flex flex-col bg-card",
        conversaAtual && "hidden md:flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b bg-primary/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <User className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <span className="font-semibold">Chat Interno</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => {
                setShowNovaConversa(true);
                fetchUsuarios();
              }}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar ou começar nova conversa"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        {/* Lista de conversas */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : conversasFiltradas.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">Nenhuma conversa</p>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setShowNovaConversa(true);
                  fetchUsuarios();
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conversa
              </Button>
            </div>
          ) : (
            <div>
              {conversasFiltradas.map((conversa) => {
                const isOnline = getConversaOnlineStatus(conversa);
                const isSelected = conversaAtual?.id === conversa.id;
                
                return (
                  <button
                    key={conversa.id}
                    onClick={() => setConversaAtual(conversa)}
                    className={cn(
                      "w-full p-3 flex items-center gap-3 text-left hover:bg-muted/50 transition-colors border-b",
                      isSelected && "bg-muted"
                    )}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10">
                          {conversa.tipo === 'grupo' ? (
                            <Users className="h-5 w-5 text-primary" />
                          ) : (
                            <User className="h-5 w-5 text-primary" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-card" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{getConversaNome(conversa)}</p>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageDate(conversa.updated_at)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {conversa.tipo === 'grupo' ? 'Grupo' : 'Conversa direta'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de chat */}
      <div className={cn(
        "flex-1 flex flex-col",
        !conversaAtual && "hidden md:flex"
      )}>
        {conversaAtual ? (
          <>
            {/* Header do chat */}
            <div className="p-3 border-b bg-card flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setConversaAtual(null)}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              
              <div className="relative">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/10">
                    {conversaAtual.tipo === 'grupo' ? (
                      <Users className="h-5 w-5 text-primary" />
                    ) : (
                      <User className="h-5 w-5 text-primary" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {getConversaOnlineStatus(conversaAtual) && (
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
                )}
              </div>
              
              <div className="flex-1">
                <p className="font-medium">{getConversaNome(conversaAtual)}</p>
                <p className="text-xs text-muted-foreground">
                  {getConversaOnlineStatus(conversaAtual) ? 'Online' : 'Offline'}
                </p>
              </div>
              
              <div className="flex gap-1">
                <Button variant="ghost" size="icon">
                  <Phone className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Mensagens */}
            <ScrollArea 
              className="flex-1 p-4" 
              ref={scrollRef}
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              }}
            >
              <div className="space-y-2 max-w-3xl mx-auto">
                {mensagens.map((msg, index) => {
                  const isOwn = msg.remetente_id === usuarioAtualId;
                  const showDate = index === 0 || 
                    format(new Date(mensagens[index - 1].created_at), 'yyyy-MM-dd') !== 
                    format(new Date(msg.created_at), 'yyyy-MM-dd');
                  
                  return (
                    <div key={msg.id}>
                      {showDate && (
                        <div className="flex justify-center my-4">
                          <Badge variant="secondary" className="text-xs">
                            {formatMessageDate(msg.created_at)}
                          </Badge>
                        </div>
                      )}
                      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-none'
                              : 'bg-card rounded-bl-none'
                          )}
                        >
                          {!isOwn && msg.remetente && conversaAtual.tipo === 'grupo' && (
                            <p className="text-xs font-medium mb-1 text-primary">
                              {msg.remetente.nome}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                          <div className={cn(
                            'flex items-center justify-end gap-1 mt-1',
                            isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          )}>
                            <span className="text-[10px]">
                              {format(new Date(msg.created_at), 'HH:mm')}
                            </span>
                            {isOwn && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            {/* Input de mensagem */}
            <div className="p-3 border-t bg-card">
              <div className="flex items-center gap-2 max-w-3xl mx-auto">
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </Button>
                <Input
                  placeholder="Digite uma mensagem"
                  value={mensagemInput}
                  onChange={(e) => setMensagemInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleEnviar()}
                  className="flex-1"
                />
                {mensagemInput.trim() ? (
                  <Button size="icon" onClick={handleEnviar}>
                    <Send className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button variant="ghost" size="icon">
                    <Mic className="h-5 w-5 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-muted/20">
            <div className="text-center">
              <div className="w-64 h-64 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center">
                <MessageCircle className="h-32 w-32 text-primary/20" />
              </div>
              <h2 className="text-2xl font-light text-muted-foreground mb-2">
                Chat Interno
              </h2>
              <p className="text-muted-foreground">
                Envie e receba mensagens para sua equipe
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Dialog Nova Conversa */}
      <Dialog open={showNovaConversa} onOpenChange={setShowNovaConversa}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Conversa</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {usuariosSelecionados.length > 1 && (
              <Input
                placeholder="Nome do grupo (opcional)"
                value={tituloNovaConversa}
                onChange={(e) => setTituloNovaConversa(e.target.value)}
              />
            )}
            
            <p className="text-sm text-muted-foreground">
              Selecione os participantes:
            </p>
            
            <ScrollArea className="h-64 border rounded-md">
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
                        onClick={() => toggleUsuario(usuario.id)}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
